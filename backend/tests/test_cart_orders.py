from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from conftest import add, checkout, checkout_body, register

from florea.db import execute, get_db, one


def test_cart_lifecycle_and_ownership(app, customer, product):
    assert app.test_client().get("/api/cart").status_code == 401
    empty = customer.get("/api/cart").json["data"]["cart"]
    assert empty["summary"]["item_count"] == 0
    cart = add(customer, product, 2)
    assert cart["revision"] != empty["revision"]
    assert cart["summary"]["subtotal"] == product["price"] * 2
    cart = add(customer, product, 1)
    assert len(cart["items"]) == 1 and cart["items"][0]["quantity"] == 3
    url = "/api/cart/items/" + cart["items"][0]["id"]
    stranger = app.test_client()
    register(stranger, "stranger@example.com")
    assert stranger.put(url, json={"quantity": 1}).status_code == 404
    assert stranger.delete(url).status_code == 404
    assert (
        customer.put(url, json={"quantity": 1}).json["data"]["cart"]["summary"]["item_count"] == 1
    )
    assert customer.delete(url).json["data"]["cart"]["items"] == []


@pytest.mark.parametrize("quantity", [0, -1, 100, 1.5, "abc", None, True])
def test_cart_quantity_validation(customer, product, quantity):
    assert (
        customer.post(
            "/api/cart/items", json={"productId": product["id"], "quantity": quantity}
        ).status_code
        == 400
    )


@pytest.mark.parametrize(
    "stock,active,availability,code",
    [
        (0, True, "out_of_stock", "INSUFFICIENT_STOCK"),
        (1, True, "insufficient_stock", "INSUFFICIENT_STOCK"),
        (10, False, "inactive", "PRODUCT_INACTIVE"),
    ],
)
def test_unavailable_cart(app, customer, product, stock, active, availability, code):
    add(customer, product, 2)
    with app.app_context():
        execute(
            "UPDATE products SET stock_quantity = %s, is_active = %s WHERE id = %s",
            (stock, active, product["id"]),
        )
    cart = customer.get("/api/cart").json["data"]["cart"]
    assert cart["items"][0]["availability"] == availability
    assert cart["summary"]["has_unavailable_items"]
    assert checkout(customer).json["error"]["code"] == code
    assert (
        customer.post(
            "/api/cart/items", json={"productId": product["id"], "quantity": 1}
        ).status_code
        == 409
    )


def test_checkout_snapshot_and_replay(app, customer, product):
    add(customer, product, 2)
    data, key = checkout_body(customer), str(uuid4())
    response = checkout(customer, data, key)
    assert response.status_code == 201, response.json
    order = response.json["data"]["order"]
    assert order["total_amount"] == order["subtotal"] == product["price"] * 2
    assert order["items"][0]["product_name"] == product["name"]
    assert order["item_count"] == 2 and order["status"] == "pending"
    assert customer.get("/api/cart").json["data"]["cart"]["items"] == []
    assert (
        customer.get("/api/products/" + product["id"]).json["data"]["stock_quantity"]
        == product["stock_quantity"] - 2
    )
    replay = checkout(customer, data, key)
    assert replay.status_code == 200
    assert replay.json["data"]["idempotent_replay"]
    assert replay.json["data"]["order"] == order
    altered = {**data, "deliveryAddress": {**data["deliveryAddress"], "city": "Manila"}}
    assert checkout(customer, altered, key).json["error"]["code"] == "IDEMPOTENCY_CONFLICT"
    with app.app_context():
        assert one("SELECT COUNT(*) AS n FROM orders")["n"] == 1
    history = customer.get("/api/orders?limit=1").json
    assert history["data"][0]["id"] == order["id"] and history["data"][0]["item_count"] == 2
    assert history["pagination"]["total"] == 1


def test_empty_stale_and_strict_checkout(app, customer, product):
    assert checkout(customer).json["error"]["code"] == "EMPTY_CART"
    add(customer, product)
    old = checkout_body(customer)
    with app.app_context():
        execute("UPDATE products SET price = price + 1 WHERE id = %s", (product["id"],))
    response = checkout(customer, old)
    assert response.status_code == 409 and response.json["error"]["code"] == "CART_CHANGED"
    assert "cart" in response.json["error"]["details"]
    fresh = checkout_body(customer)
    assert checkout(customer, {**fresh, "total_amount": 1}).status_code == 400
    assert (
        checkout(
            customer, {**fresh, "deliveryAddress": {**fresh["deliveryAddress"], "country": "USA"}}
        ).status_code
        == 400
    )
    assert customer.post("/api/orders", json=fresh).status_code == 400
    with app.app_context():
        assert one("SELECT COUNT(*) AS n FROM orders")["n"] == 0
        assert one("SELECT COUNT(*) AS n FROM cart_items")["n"] == 1


def test_immutable_history_and_ownership(app, customer, admin, product, order):
    other = app.test_client()
    register(other, "other@example.com")
    url = "/api/orders/" + order["id"]
    assert other.get(url).status_code == 404
    assert admin.get(url).status_code == 403
    assert (
        admin.put(
            "/api/products/" + product["id"], json={"name": "Changed name", "price": 999}
        ).status_code
        == 200
    )
    assert admin.delete("/api/products/" + product["id"]).status_code == 200
    assert customer.get(url).json["data"] == order
    details = admin.get("/api/admin/orders/" + order["id"]).json["data"]
    assert details["customer"]["email"] == "ana@example.com"
    assert details["items"] == order["items"]


def test_admin_filters_and_status_workflow(admin, customer, order):
    order_id = order["id"]
    day = order["created_at"][:10]
    response = admin.get(
        "/api/admin/orders",
        query_string={
            "search": order_id[:8],
            "customer": "ANA",
            "status": "pending",
            "dateFrom": day,
            "dateTo": day,
            "limit": 1,
        },
    )
    assert response.status_code == 200 and response.json["pagination"]["total"] == 1
    assert response.json["data"][0]["item_count"] == 2
    assert admin.get("/api/admin/orders?customer=absent").json["pagination"]["total"] == 0
    url = f"/api/admin/orders/{order_id}/status"
    assert admin.put(url, json={"status": "delivered"}).status_code == 409
    for status in ["confirmed", "preparing", "shipped", "delivered"]:
        response = admin.put(url, json={"status": status})
        assert response.status_code == 200, response.json
        assert response.json["data"]["status"] == status
        assert customer.get("/api/orders/" + order_id).json["data"]["status"] == status
    for status in ["cancelled", "pending", "delivered"]:
        assert admin.put(url, json={"status": status}).status_code == 409


@pytest.mark.parametrize(
    "query",
    ["dateFrom=2026-02-30", "dateFrom=2026-03-01&dateTo=2026-02-01", "status=unknown", "limit=101"],
)
def test_admin_order_filter_validation(admin, query):
    assert admin.get("/api/admin/orders?" + query).status_code == 400


@pytest.mark.parametrize("confirmed", [False, True])
def test_cancellation_restores_stock_once(admin, customer, product, order, confirmed):
    url = "/api/admin/orders/" + order["id"] + "/status"
    if confirmed:
        assert admin.put(url, json={"status": "confirmed"}).status_code == 200
    assert admin.put(url, json={"status": "cancelled"}).status_code == 200
    assert admin.put(url, json={"status": "cancelled"}).status_code == 409
    assert (
        customer.get("/api/products/" + product["id"]).json["data"]["stock_quantity"]
        == product["stock_quantity"]
    )


def concurrent_calls(functions):
    barrier = Barrier(len(functions))

    def run(fn):
        barrier.wait(timeout=10)
        return fn()

    with ThreadPoolExecutor(max_workers=len(functions)) as pool:
        return list(pool.map(run, functions))


def test_concurrent_last_item(app, customer, product):
    other = app.test_client()
    register(other, "other@example.com")
    with app.app_context():
        execute("UPDATE products SET stock_quantity = 1 WHERE id = %s", (product["id"],))
    add(customer, product)
    add(other, product)
    first, second = checkout_body(customer), checkout_body(other)
    responses = concurrent_calls(
        [lambda: checkout(customer, first), lambda: checkout(other, second)]
    )
    assert sorted(response.status_code for response in responses) == [201, 409]
    with app.app_context():
        assert (
            one("SELECT stock_quantity FROM products WHERE id = %s", (product["id"],))[
                "stock_quantity"
            ]
            == 0
        )
        assert one("SELECT COUNT(*) AS n FROM orders")["n"] == 1


def test_concurrent_duplicate_checkout(app, customer, product):
    add(customer, product)
    data, key = checkout_body(customer), str(uuid4())
    second = app.test_client()
    second.set_cookie("florea_session", customer.get_cookie("florea_session").value)
    responses = concurrent_calls(
        [lambda: checkout(customer, data, key), lambda: checkout(second, data, key)]
    )
    assert sorted(response.status_code for response in responses) == [200, 201]
    assert responses[0].json["data"]["order"]["id"] == responses[1].json["data"]["order"]["id"]


def test_concurrent_cancel(app, admin, product, order):
    other = app.test_client()
    other.set_cookie("florea_session", admin.get_cookie("florea_session").value)
    url = "/api/admin/orders/" + order["id"] + "/status"
    responses = concurrent_calls(
        [
            lambda: admin.put(url, json={"status": "cancelled"}),
            lambda: other.put(url, json={"status": "cancelled"}),
        ]
    )
    assert sorted(response.status_code for response in responses) == [200, 409]
    with app.app_context():
        assert (
            one("SELECT stock_quantity FROM products WHERE id = %s", (product["id"],))[
                "stock_quantity"
            ]
            == product["stock_quantity"]
        )


def test_checkout_failure_rolls_back_every_write(app, customer, product):
    add(customer, product, 2)
    with app.app_context():
        execute("""CREATE FUNCTION reject_order_item() RETURNS trigger LANGUAGE plpgsql AS $$
                   BEGIN RAISE EXCEPTION 'test failure'; END; $$""")
        execute(
            "CREATE TRIGGER reject_item BEFORE INSERT ON order_items FOR EACH ROW EXECUTE FUNCTION reject_order_item()"
        )
    response = checkout(customer)
    assert response.status_code == 500
    assert "test failure" not in str(response.json)
    with app.app_context():
        assert one("SELECT COUNT(*) AS n FROM orders")["n"] == 0
        assert one("SELECT COUNT(*) AS n FROM cart_items")["n"] == 1
        assert (
            one("SELECT stock_quantity FROM products WHERE id = %s", (product["id"],))[
                "stock_quantity"
            ]
            == product["stock_quantity"]
        )


def test_cancellation_failure_rolls_back_stock_and_status(app, admin, product, order):
    with app.app_context():
        execute("""CREATE FUNCTION reject_status() RETURNS trigger LANGUAGE plpgsql AS $$
                   BEGIN RAISE EXCEPTION 'test failure'; END; $$""")
        execute(
            "CREATE TRIGGER reject_status BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION reject_status()"
        )
    response = admin.put(
        "/api/admin/orders/" + order["id"] + "/status", json={"status": "cancelled"}
    )
    assert response.status_code == 500
    with app.app_context():
        assert one("SELECT status FROM orders WHERE id = %s", (order["id"],))["status"] == "pending"
        assert (
            one("SELECT stock_quantity FROM products WHERE id = %s", (product["id"],))[
                "stock_quantity"
            ]
            == product["stock_quantity"] - 2
        )


def test_migrations_are_repeatable(app):
    from manage import BACKEND, migrate

    with app.app_context():
        before = one("SELECT COUNT(*) AS n FROM products")["n"]
        migrate(get_db())
        assert one("SELECT COUNT(*) AS n FROM products")["n"] == before
        assert one("SELECT COUNT(*) AS n FROM schema_migrations")["n"] == len(
            list((BACKEND / "migrations").glob("*.sql"))
        )
