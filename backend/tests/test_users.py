from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from conftest import register

from florea.db import execute, get_db, one
from manage import migrate


def test_user_management_upgrade_preserves_accounts_and_sessions(app, customer):
    before = customer.get("/api/auth/me").json["data"]["user"]
    with app.app_context():
        execute("ALTER TABLE users DROP COLUMN is_active, DROP COLUMN session_version")
        execute("DELETE FROM schema_migrations WHERE name = '007_user_management.sql'")
        migrate(get_db())
        migrate(get_db())
        account = one("SELECT is_active, session_version FROM users WHERE id = %s", (before["id"],))
        assert account == {"is_active": True, "session_version": 0}
    assert customer.get("/api/auth/me").json["data"]["user"] == before


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/api/admin/users"),
        ("post", "/api/admin/users"),
        ("put", "/api/admin/users/00000000-0000-4000-8000-000000000001"),
    ],
)
def test_user_management_requires_admin(app, customer, method, path):
    assert getattr(app.test_client(), method)(path, json={}).status_code == 401
    assert getattr(customer, method)(path, json={}).status_code == 403


def test_create_edit_and_filter_users(admin, app):
    original = admin.get("/api/auth/me").json["data"]["user"]
    data = {"name": "New Customer", "email": " NEW@example.com ", "password": "Flowers123"}
    response = admin.post("/api/admin/users", json=data)
    assert response.status_code == 201
    account = response.json["data"]
    assert account["email"] == "new@example.com" and account["role"] == "customer"
    assert account["is_active"]
    assert "password_hash" not in account and "session_version" not in account
    assert admin.get("/api/auth/me").json["data"]["user"] == original
    assert admin.post("/api/admin/users", json=data).status_code == 409
    url = "/api/admin/users/" + account["id"]
    updated = admin.put(url, json={"name": "New Admin", "role": "admin"})
    assert updated.status_code == 200
    assert updated.json["data"]["role"] == "admin"
    found = admin.get("/api/admin/users?search=NEW@&role=admin&status=active&limit=1").json
    assert found["data"][0]["name"] == "New Admin"
    assert found["pagination"]["total"] == 1
    assert "password_hash" not in found["data"][0]
    assert admin.get("/api/admin/users?search=%25").json["data"] == []
    assert admin.get("/api/admin/users?role=customer").json["data"] == []
    pages = admin.get("/api/admin/users?limit=1").json["pagination"]
    assert pages["totalPages"] == 2 and pages["hasNextPage"]
    assert admin.get("/api/admin/users?limit=1&page=2").json["pagination"]["hasPreviousPage"]
    conflict = admin.put(url, json={"name": "Should roll back", "email": original["email"]})
    assert conflict.status_code == 409
    with app.app_context():
        assert one("SELECT name FROM users WHERE id = %s", (account["id"],))["name"] == "New Admin"


def test_deactivation_revokes_sessions_permanently_and_preserves_orders(admin, customer, order):
    account = customer.get("/api/auth/me").json["data"]["user"]
    cookie = customer.get_cookie("florea_session").value
    url = "/api/admin/users/" + account["id"]
    assert admin.put(url, json={"isActive": False}).status_code == 200
    assert customer.get("/api/auth/me").status_code == 401
    assert customer.get("/api/cart").status_code == 401
    login = {"email": account["email"], "password": "flowers123"}
    assert customer.post("/api/auth/login", json=login).status_code == 401
    assert admin.get("/api/admin/orders/" + order["id"]).status_code == 200
    assert admin.get("/api/admin/users?status=inactive").json["pagination"]["total"] == 1
    assert admin.put(url, json={"isActive": True}).status_code == 200
    customer.set_cookie("florea_session", cookie)
    assert customer.get("/api/auth/me").status_code == 401
    assert customer.post("/api/auth/login", json=login).status_code == 200
    assert customer.get("/api/orders/" + order["id"]).status_code == 200


def test_role_changes_apply_to_existing_sessions(admin, customer):
    account = customer.get("/api/auth/me").json["data"]["user"]
    url = "/api/admin/users/" + account["id"]
    assert admin.put(url, json={"role": "admin"}).status_code == 200
    assert customer.get("/api/admin/users").status_code == 200
    assert admin.put(url, json={"role": "customer"}).status_code == 200
    assert customer.get("/api/admin/users").status_code == 403


@pytest.mark.parametrize("change", [{"role": "customer"}, {"isActive": False}])
def test_cannot_remove_own_admin_access(admin, change):
    account = admin.get("/api/auth/me").json["data"]["user"]
    response = admin.put("/api/admin/users/" + account["id"], json=change)
    assert response.status_code == 409
    assert response.json["error"]["code"] == "SELF_ACCESS_CHANGE"
    assert admin.get("/api/admin/users").status_code == 200


def test_concurrent_admin_demotions_preserve_an_admin(app, admin):
    other = app.test_client()
    second = register(other, "second@example.com")
    first = admin.get("/api/auth/me").json["data"]["user"]
    with app.app_context():
        execute("UPDATE users SET role = 'admin' WHERE id = %s", (second["id"],))

    def demote(client, target):
        return client.put("/api/admin/users/" + target, json={"role": "customer"}).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        a = pool.submit(demote, admin, second["id"])
        b = pool.submit(demote, other, first["id"])
        assert sorted([a.result(), b.result()]) == [200, 403]
    with app.app_context():
        assert (
            one("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND is_active")["total"]
            == 1
        )


@pytest.mark.parametrize(
    "data",
    [
        {},
        {"role": "owner"},
        {"isActive": "false"},
        {"name": " "},
        {"email": "invalid"},
        {"password": "Flowers123"},
        {"session_version": 0},
        {"password_hash": "bad"},
    ],
)
def test_update_user_validation(admin, data):
    account = admin.get("/api/auth/me").json["data"]["user"]
    assert admin.put("/api/admin/users/" + account["id"], json=data).status_code == 400


@pytest.mark.parametrize("query", ["role=owner", "status=bad", "page=0", "limit=101"])
def test_user_filter_validation(admin, query):
    assert admin.get("/api/admin/users?" + query).status_code == 400


def test_create_validation_and_missing_user(admin):
    data = {
        "name": "New Admin",
        "email": "new@example.com",
        "password": "Flowers123",
        "role": "admin",
    }
    assert admin.post("/api/admin/users", json={**data, "password": "short"}).status_code == 400
    assert admin.post("/api/admin/users", json={**data, "password": "abcdefgh"}).status_code == 400
    assert admin.post("/api/admin/users", json={**data, "role": "owner"}).status_code == 400
    assert admin.post("/api/admin/users", json={**data, "isActive": False}).status_code == 400
    assert admin.post("/api/admin/users", json=data).json["data"]["role"] == "admin"
    assert admin.put("/api/admin/users/bad", json={"name": "User"}).status_code == 400
    assert admin.put("/api/admin/users/" + str(uuid4()), json={"name": "User"}).status_code == 404
