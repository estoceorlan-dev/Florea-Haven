import json
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from conftest import checkout
from psycopg.types.json import Jsonb

from florea import create_app
from florea.auth import check_password
from florea.cart import fingerprint
from florea.db import execute

FIXTURE = json.loads(
    (Path(__file__).parent / "fixtures/express-compatibility.json").read_text(encoding="utf-8")
)


def test_original_password_hashes_and_tokens(app, client):
    with app.app_context():
        execute(
            "INSERT INTO users (id, name, email, password_hash) VALUES (%s, %s, %s, %s)",
            (FIXTURE["userId"], "Legacy User", "legacy@example.com", FIXTURE["passwordHash"]),
        )
        assert check_password(FIXTURE["password"], FIXTURE["passwordHash"])
        assert check_password(FIXTURE["unicodePassword"], FIXTURE["unicodeHash"])
    client.set_cookie("florea_session", FIXTURE["token"])
    assert client.get("/api/auth/me").json["data"]["user"]["id"] == FIXTURE["userId"]
    client.delete_cookie("florea_session")
    assert (
        client.get(
            "/api/auth/me", headers={"Authorization": "Bearer " + FIXTURE["token"]}
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/auth/login", json={"email": "legacy@example.com", "password": FIXTURE["password"]}
        ).status_code
        == 200
    )


def test_original_cart_and_checkout_hashes():
    cart = FIXTURE["cart"]
    cart[0]["unit_price"] = Decimal("125.50")
    assert fingerprint(cart) == FIXTURE["input"]["cartRevision"]
    assert fingerprint(FIXTURE["input"]) == FIXTURE["requestFingerprint"]


def test_replay_of_order_created_by_express(app, client, product):
    key, order_id = str(uuid4()), str(uuid4())
    with app.app_context():
        execute(
            "INSERT INTO users (id, name, email, password_hash) VALUES (%s, %s, %s, %s)",
            (FIXTURE["userId"], "Legacy User", "legacy@example.com", FIXTURE["passwordHash"]),
        )
        execute(
            """INSERT INTO orders (id, user_id, idempotency_key, request_fingerprint, subtotal, total_amount, delivery_address)
                   VALUES (%s, %s, %s, %s, 251, 251, %s)""",
            (
                order_id,
                FIXTURE["userId"],
                key,
                FIXTURE["requestFingerprint"],
                Jsonb(FIXTURE["input"]["deliveryAddress"]),
            ),
        )
        execute(
            """INSERT INTO order_items (id, order_id, product_id, product_name, sku, unit_price, quantity, line_total)
                   VALUES (%s, %s, %s, 'Historical Product', 'LEGACY', 125.5, 2, 251)""",
            (uuid4(), order_id, product["id"]),
        )
    client.set_cookie("florea_session", FIXTURE["token"])
    response = checkout(client, FIXTURE["input"], key)
    assert response.status_code == 200, response.json
    assert response.json["data"]["idempotent_replay"]
    assert response.json["data"]["order"]["id"] == order_id


def test_production_frontend_and_cookie(app, tmp_path):
    (tmp_path / "index.html").write_text("<!doctype html><div id='root'>SPA</div>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets/app.js").write_text("console.log('app')")
    prod = create_app(
        {
            **app.config,
            "APP_ENV": "production",
            "FRONTEND_DIST": tmp_path,
            "CLIENT_ORIGIN": "https://florea.example",
        }
    ).test_client()
    assert prod.get("/orders/some-order").status_code == 200
    assert prod.get("/assets/app.js").mimetype == "text/javascript"
    assert prod.get("/assets/missing.js").status_code == 404
    assert prod.get("/api/missing").json["error"]["code"] == "NOT_FOUND"
    assert prod.get("/api/health/").status_code == 200
    response = prod.post(
        "/api/auth/register",
        json={
            "name": "Production User",
            "email": "production@example.com",
            "password": "flowers123",
        },
    )
    assert response.status_code == 201
    assert "Secure" in response.headers["Set-Cookie"]
    assert "Strict-Transport-Security" in response.headers


def test_create_admin_command(app, monkeypatch, capsys):
    import manage

    monkeypatch.setattr(manage, "create_app", lambda: app)
    monkeypatch.setenv("ADMIN_NAME", "Initial Admin")
    monkeypatch.setenv("ADMIN_EMAIL", "initial@example.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "Garden123")
    monkeypatch.setattr("sys.argv", ["manage.py", "create-admin"])
    manage.main()
    manage.main()
    client = app.test_client()
    response = client.post(
        "/api/auth/login", json={"email": "initial@example.com", "password": "Garden123"}
    )
    assert response.status_code == 200
    assert response.json["data"]["user"]["role"] == "admin"
    assert "Garden123" not in capsys.readouterr().out
