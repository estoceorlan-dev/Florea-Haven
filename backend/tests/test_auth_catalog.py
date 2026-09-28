from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest
from conftest import TEST_SECRET, register

from florea import create_app
from florea.db import execute


def test_health_and_catalog(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json["data"]["database"]["mode"] == "postgresql"
    assert response.json["data"]["timestamp"].endswith("Z")
    categories = client.get("/api/categories").json["data"]
    assert len(categories) == 3
    assert all(category["product_count"] > 0 for category in categories)
    response = client.get("/api/products?limit=2&page=1&category=" + categories[0]["slug"])
    assert response.status_code == 200
    assert len(response.json["data"]) == 2
    assert response.json["pagination"]["limit"] == 2
    assert all(p["category"]["id"] == categories[0]["id"] for p in response.json["data"])


def test_search_prices_and_featured(client, product):
    found = client.get("/api/products", query_string={"search": product["name"]}).json["data"]
    assert any(p["id"] == product["id"] for p in found)
    found = client.get("/api/products?sort=price-asc&minPrice=100&maxPrice=1000").json["data"]
    prices = [p["price"] for p in found]
    assert prices == sorted(prices)
    assert all(100 <= p <= 1000 for p in prices)
    assert all(p["featured"] for p in client.get("/api/products?featured=true").json["data"])
    assert client.get("/api/products/" + product["id"]).json["data"] == product
    assert client.get("/api/products/" + str(uuid4())).status_code == 404


@pytest.mark.parametrize(
    "query",
    [
        "minPrice=9&maxPrice=1",
        "page=0",
        "page=1.5",
        "limit=49",
        "sort=sql",
        "featured=yes",
        "minPrice=NaN",
        "maxPrice=Infinity",
    ],
)
def test_catalog_validation(client, query):
    response = client.get("/api/products?" + query)
    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_register_login_logout(client):
    user = register(client, "  ANA@Example.com  ")
    assert user["email"] == "ana@example.com"
    assert user["role"] == "customer"
    assert "password_hash" not in user
    assert client.get("/api/auth/me").json["data"]["user"] == user
    assert (
        client.post(
            "/api/auth/register",
            json={"name": "Ana", "email": "ANA@example.com", "password": "flowers123"},
        ).status_code
        == 409
    )
    assert client.post("/api/auth/logout").json["data"]["signedOut"]
    assert client.get("/api/auth/me").status_code == 401
    response = client.post(
        "/api/auth/login", json={"email": "ANA@example.com", "password": "flowers123"}
    )
    assert response.status_code == 200
    cookie = response.headers["Set-Cookie"]
    assert "HttpOnly" in cookie and "SameSite=Lax" in cookie and "florea_session=" in cookie


def test_generic_login_failures(customer):
    wrong = customer.post(
        "/api/auth/login", json={"email": "ana@example.com", "password": "wrong123"}
    )
    unknown = customer.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "wrong123"}
    )
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json == unknown.json


@pytest.mark.parametrize(
    "claims", [{"sub": "bad-uuid"}, {"sub": str(uuid4())}, {"sub": str(uuid4()), "exp": 1}]
)
def test_bad_missing_and_expired_tokens(client, claims):
    assert client.get("/api/auth/me").status_code == 401
    assert (
        client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401
    )
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"iat": now, "exp": now + timedelta(days=1), **claims}, TEST_SECRET, algorithm="HS256"
    )
    assert (
        client.get("/api/auth/me", headers={"Authorization": "Bearer " + token}).status_code == 401
    )


def test_database_role_and_deleted_user(app, customer):
    user = customer.get("/api/auth/me").json["data"]["user"]
    assert customer.get("/api/admin/products").status_code == 403
    with app.app_context():
        execute("UPDATE users SET role = 'admin' WHERE id = %s", (user["id"],))
    assert customer.get("/api/admin/products").status_code == 200
    assert customer.get("/api/orders").status_code == 403
    with app.app_context():
        execute("DELETE FROM users WHERE id = %s", (user["id"],))
    assert customer.get("/api/auth/me").status_code == 401


def test_origin_cors_and_error_envelopes(client):
    response = client.post("/api/auth/logout", headers={"Origin": "https://untrusted.example"})
    assert response.status_code == 403
    assert response.json["error"]["code"] == "ORIGIN_NOT_ALLOWED"
    response = client.options(
        "/api/cart/items",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
    )
    assert response.headers["Access-Control-Allow-Credentials"] == "true"
    assert "Idempotency-Key" in response.headers["Access-Control-Allow-Headers"]
    assert client.get("/api/unknown").json["error"]["code"] == "NOT_FOUND"
    assert (
        client.post("/api/auth/login", data="{", content_type="application/json").status_code == 400
    )
    assert (
        client.post(
            "/api/auth/login", data="a" * 102401, content_type="application/json"
        ).status_code
        == 413
    )


def test_rate_limit_shared_between_auth_routes(app):
    limited = create_app({**app.config, "RATELIMIT_ENABLED": True}).test_client()
    for i in range(20):
        route = "login" if i % 2 else "register"
        assert limited.post("/api/auth/" + route, json={}).status_code == 400
    response = limited.post("/api/auth/login", json={})
    assert response.status_code == 429
    assert response.json["error"]["code"] == "RATE_LIMITED"


def test_admin_category_lifecycle(admin):
    response = admin.post("/api/categories", json={"name": "Garden Tools"})
    assert response.status_code == 201
    category = response.json["data"]
    assert category["slug"] == "garden-tools"
    duplicate = admin.post("/api/categories", json={"name": "GARDEN TOOLS"})
    assert duplicate.status_code == 409
    assert duplicate.json["error"]["code"] == "CATEGORY_NAME_IN_USE"
    url = "/api/categories/" + category["id"]
    assert admin.put(url, json={"description": "Tools for the garden"}).status_code == 200
    assert admin.delete(url).json["data"]["deleted"]
    assert admin.delete(url).status_code == 404


def test_admin_product_lifecycle(admin, client, product):
    data = {
        "categoryId": product["category"]["id"],
        "name": "Test Rose",
        "sku": "test-rose",
        "description": "Rose for testing",
        "price": "125.50",
        "stockQuantity": "9",
    }
    response = admin.post("/api/products", json=data)
    assert response.status_code == 201, response.json
    created = response.json["data"]
    assert created["sku"] == "TEST-ROSE" and created["price"] == 125.5
    assert created["is_active"]
    assert (
        admin.post("/api/products", json={**data, "name": "Another", "slug": "another"}).json[
            "error"
        ]["code"]
        == "PRODUCT_SKU_IN_USE"
    )
    url = "/api/products/" + created["id"]
    assert (
        admin.put(url, json={"price": 250, "stockQuantity": 6, "featured": True}).status_code == 200
    )
    assert admin.delete(url).json["data"]["is_active"] is False
    assert client.get(url).status_code == 404
    found = admin.get("/api/admin/products?search=test-rose&status=inactive&sort=stock-asc").json[
        "data"
    ]
    assert len(found) == 1
    assert admin.put(url, json={"isActive": True}).status_code == 200
    assert client.get(url).status_code == 200
    assert (
        admin.delete("/api/categories/" + product["category"]["id"]).json["error"]["code"]
        == "CATEGORY_IN_USE"
    )


@pytest.mark.parametrize(
    "data",
    [
        {"price": -1},
        {"price": "NaN"},
        {"price": 1.001},
        {"stockQuantity": -1},
        {"stockQuantity": 1.5},
        {"imageUrl": "javascript:alert(1)"},
        {"imageUrl": "http://["},
        {"isActive": "false"},
        {"userId": "anything"},
        {},
        {"slug": ""},
    ],
)
def test_admin_product_validation(admin, product, data):
    response = admin.put("/api/products/" + product["id"], json=data)
    assert response.status_code == 400, response.json


def test_admin_missing_category(admin, product):
    assert (
        admin.put("/api/products/" + product["id"], json={"categoryId": str(uuid4())}).json[
            "error"
        ]["code"]
        == "CATEGORY_NOT_FOUND"
    )


@pytest.mark.parametrize(
    "method,path,data",
    [
        ("get", "/api/admin/categories", None),
        ("get", "/api/admin/products", None),
        ("post", "/api/categories", {}),
        ("post", "/api/products", {}),
        ("put", "/api/categories/00000000-0000-4000-8000-000000000001", {}),
        ("delete", "/api/products/00000000-0000-4000-8000-000000000001", None),
        ("get", "/api/admin/orders", None),
        ("get", "/api/admin/orders/00000000-0000-4000-8000-000000000001", None),
        (
            "put",
            "/api/admin/orders/00000000-0000-4000-8000-000000000001/status",
            {"status": "cancelled"},
        ),
    ],
)
def test_admin_authorization(app, customer, method, path, data):
    assert getattr(app.test_client(), method)(path, json=data).status_code == 401
    assert getattr(customer, method)(path, json=data).status_code == 403
