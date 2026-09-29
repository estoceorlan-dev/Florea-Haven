from uuid import uuid4

import pytest
from conftest import add, checkout_body, register
from test_cart_orders import concurrent_calls

from florea import orders
from florea.db import execute, one


def purchase_body(client, product, quantity=1):
    address = checkout_body(client)
    address.pop("cartRevision")
    return {
        **address,
        "productId": product["id"],
        "quantity": quantity,
        "expectedUnitPrice": product["price"],
    }


def buy(client, data, key=None):
    return client.post(
        "/api/orders/buy-now", json=data, headers={"Idempotency-Key": key or str(uuid4())}
    )


def test_buy_now_preserves_cart_and_replays_once(app, customer, product):
    other = next(
        item for item in customer.get("/api/products").json["data"] if item["id"] != product["id"]
    )
    add(customer, other, 2)
    add(customer, product, 1)
    before = customer.get("/api/cart").json["data"]["cart"]
    data, key = purchase_body(customer, product, 2), str(uuid4())
    response = buy(customer, data, key)
    assert response.status_code == 201, response.json
    order = response.json["data"]["order"]
    assert len(order["items"]) == 1
    assert order["items"][0]["product_id"] == product["id"]
    assert order["items"][0]["quantity"] == 2
    assert order["total_amount"] == product["price"] * 2
    after = customer.get("/api/cart").json["data"]["cart"]
    assert [(item["id"], item["quantity"]) for item in after["items"]] == [
        (item["id"], item["quantity"]) for item in before["items"]
    ]
    replay = buy(customer, data, key)
    assert replay.status_code == 200
    assert replay.json["data"]["order"] == order
    assert (
        buy(customer, {**data, "quantity": 3}, key).json["error"]["code"] == "IDEMPOTENCY_CONFLICT"
    )
    with app.app_context():
        assert one("SELECT COUNT(*) AS n FROM orders")["n"] == 1
        assert (
            one("SELECT stock_quantity FROM products WHERE id = %s", (product["id"],))[
                "stock_quantity"
            ]
            == product["stock_quantity"] - 2
        )


def test_buy_now_works_without_a_cart(customer, product):
    assert buy(customer, purchase_body(customer, product)).status_code == 201
    assert customer.get("/api/cart").json["data"]["cart"]["items"] == []


@pytest.mark.parametrize(
    "changes,code",
    [
        ({"price": 1}, "PRICE_CHANGED"),
        ({"stock_quantity": 0}, "INSUFFICIENT_STOCK"),
        ({"is_active": False}, "PRODUCT_INACTIVE"),
    ],
)
def test_buy_now_rejects_changed_product(app, customer, product, changes, code):
    data = purchase_body(customer, product)
    field, value = next(iter(changes.items()))
    with app.app_context():
        execute(f"UPDATE products SET {field} = %s WHERE id = %s", (value, product["id"]))
    response = buy(customer, data)
    assert response.status_code == 409
    assert response.json["error"]["code"] == code
    with app.app_context():
        assert one("SELECT COUNT(*) AS n FROM orders")["n"] == 0


@pytest.mark.parametrize(
    "changes",
    [
        {"quantity": 0},
        {"quantity": 1.5},
        {"quantity": 1000},
        {"quantity": True},
        {"expectedUnitPrice": -1},
        {"expectedUnitPrice": 1.111},
        {"productId": "invalid"},
        {"total_amount": 1},
        {"deliveryAddress": {}},
    ],
)
def test_buy_now_validates_input(customer, product, changes):
    assert buy(customer, {**purchase_body(customer, product), **changes}).status_code == 400


def test_buy_now_requires_customer_and_key(app, customer, admin, product):
    data = purchase_body(customer, product)
    assert buy(app.test_client(), data).status_code == 401
    assert buy(admin, data).status_code == 403
    assert customer.post("/api/orders/buy-now", json=data).status_code == 400
    assert buy(customer, {**data, "productId": str(uuid4())}).status_code == 404


def test_buy_now_concurrent_last_item(app, customer, product):
    other = app.test_client()
    register(other, "other-buy@example.com")
    with app.app_context():
        execute("UPDATE products SET stock_quantity = 1 WHERE id = %s", (product["id"],))
    first, second = purchase_body(customer, product), purchase_body(other, product)
    responses = concurrent_calls([lambda: buy(customer, first), lambda: buy(other, second)])
    assert sorted(response.status_code for response in responses) == [201, 409]
    with app.app_context():
        assert one("SELECT COUNT(*) AS n FROM orders")["n"] == 1
        assert (
            one("SELECT stock_quantity FROM products WHERE id = %s", (product["id"],))[
                "stock_quantity"
            ]
            == 0
        )


def test_buy_now_concurrent_duplicate(app, customer, product):
    data, key = purchase_body(customer, product), str(uuid4())
    other = app.test_client()
    other.set_cookie("florea_session", customer.get_cookie("florea_session").value)
    responses = concurrent_calls([lambda: buy(customer, data, key), lambda: buy(other, data, key)])
    assert sorted(response.status_code for response in responses) == [200, 201]
    assert responses[0].json["data"]["order"]["id"] == responses[1].json["data"]["order"]["id"]


def test_buy_now_rolls_back_on_failure(app, customer, product, monkeypatch):
    original = orders.execute

    def fail_insert(sql, values=()):
        if "INSERT INTO order_items" in sql:
            raise RuntimeError("Simulated write failure")
        return original(sql, values)

    monkeypatch.setattr(orders, "execute", fail_insert)
    response = buy(customer, purchase_body(customer, product))
    assert response.status_code == 500
    with app.app_context():
        assert one("SELECT COUNT(*) AS n FROM orders")["n"] == 0
        assert (
            one("SELECT stock_quantity FROM products WHERE id = %s", (product["id"],))[
                "stock_quantity"
            ]
            == product["stock_quantity"]
        )
