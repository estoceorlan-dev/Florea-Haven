import os
from uuid import uuid4

import psycopg
import pytest
from dotenv import load_dotenv
from psycopg import sql

from florea import ROOT, create_app
from florea.db import connect, execute
from manage import migrate, seed

TEST_SECRET = "florea-test-only-secret-with-at-least-32-bytes"


@pytest.fixture
def app():
    load_dotenv(ROOT / ".env")
    database_url = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        pytest.fail(
            "Set TEST_DATABASE_URL or DATABASE_URL to PostgreSQL. Tests create a private schema."
        )
    schema = "florea_test_" + uuid4().hex
    with psycopg.connect(database_url, autocommit=True) as connection:
        connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    config = dict(
        TESTING=True,
        APP_ENV="test",
        DATABASE_URL=database_url,
        DATABASE_SSL=False,
        DATABASE_SCHEMA=schema,
        JWT_SECRET=TEST_SECRET,
        RATELIMIT_ENABLED=False,
        CLIENT_ORIGIN="http://localhost:5173",
    )
    try:
        with connect(config) as connection:
            migrate(connection)
            seed(connection)
        yield create_app(config)
    finally:
        # The random identifier created above is the only schema these tests remove.
        assert schema.startswith("florea_test_") and len(schema) == 44
        with psycopg.connect(database_url, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


@pytest.fixture
def client(app):
    return app.test_client()


def register(client, email="ana@example.com", name="Ana Reyes"):
    response = client.post(
        "/api/auth/register", json={"name": name, "email": email, "password": "flowers123"}
    )
    assert response.status_code == 201, response.json
    return response.json["data"]["user"]


@pytest.fixture
def customer(client):
    register(client)
    return client


@pytest.fixture
def admin(app):
    client = app.test_client()
    user = register(client, "admin@example.com", "Admin User")
    with app.app_context():
        execute("UPDATE users SET role = 'admin' WHERE id = %s", (user["id"],))
    return client


@pytest.fixture
def product(client):
    return client.get("/api/products?sort=name-asc").json["data"][0]


def add(client, product, quantity=1):
    response = client.post(
        "/api/cart/items", json={"productId": product["id"], "quantity": quantity}
    )
    assert response.status_code == 201, response.json
    return response.json["data"]["cart"]


def checkout_body(client):
    cart = client.get("/api/cart").json["data"]["cart"]
    return {
        "cartRevision": cart["revision"],
        "paymentMethod": "cash_on_delivery",
        "deliveryAddress": {
            "recipientName": "Ana Reyes",
            "phone": "+63 917 123 4567",
            "addressLine1": "12 Sampaguita Street",
            "addressLine2": "",
            "city": "Quezon City",
            "province": "Metro Manila",
            "postalCode": "1100",
            "country": "Philippines",
        },
    }


def checkout(client, data=None, key=None):
    return client.post(
        "/api/orders",
        json=data or checkout_body(client),
        headers={"Idempotency-Key": key or str(uuid4())},
    )


@pytest.fixture
def order(customer, product):
    add(customer, product, 2)
    response = checkout(customer)
    assert response.status_code == 201, response.json
    return response.json["data"]["order"]
