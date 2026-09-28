import pytest

from florea import create_app
from florea.db import execute, get_db, one
from manage import migrate


def test_upgrade_preserves_existing_catalog_and_accounts(app, customer):
    with app.app_context():
        before = one("SELECT COUNT(*) AS n FROM products")["n"]
        # Recreate the pre-image schema inside this test's isolated namespace.
        execute(
            "ALTER TABLE users DROP COLUMN profile_image_url, DROP COLUMN profile_image_public_id"
        )
        execute("ALTER TABLE products DROP COLUMN image_public_id")
        execute("DROP TABLE image_cleanup")
        execute("DELETE FROM schema_migrations WHERE name = '006_managed_images.sql'")
        migrate(get_db())
        assert one("SELECT COUNT(*) AS n FROM products")["n"] == before
        assert one("SELECT email, profile_image_url FROM users")["email"] == "ana@example.com"


@pytest.mark.parametrize(
    "key,value",
    [
        ("JWT_SECRET", "weak"),
        ("CLIENT_ORIGIN", "http://localhost:4000"),
        ("CLIENT_ORIGIN", "https://garden.example/"),
    ],
)
def test_production_rejects_unsafe_configuration(app, tmp_path, key, value):
    (tmp_path / "index.html").write_text("<!doctype html>")
    with pytest.raises(RuntimeError):
        create_app(
            {
                **app.config,
                "APP_ENV": "production",
                "FRONTEND_DIST": tmp_path,
                "CLIENT_ORIGIN": "https://garden.example",
                key: value,
            }
        )


def test_browser_cross_site_posts_and_large_json_rejected(client):
    assert (
        client.post("/api/auth/logout", headers={"Sec-Fetch-Site": "cross-site"}).status_code == 403
    )
    assert client.post("/api/auth/login", json={"email": "x" * 110000}).status_code == 413


def test_static_cache_and_csp(app, tmp_path):
    (tmp_path / "index.html").write_text("<!doctype html>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app-hash.js").write_text("export {}")
    app.config["FRONTEND_DIST"] = tmp_path
    client = app.test_client()
    response = client.get("/account")
    assert response.headers["Cache-Control"] == "no-cache"
    assert "script-src 'self';" in response.headers["Content-Security-Policy"]
    assert response.headers["X-Request-ID"]
    assert "immutable" in client.get("/assets/app-hash.js").headers["Cache-Control"]
    assert client.get("/api/health").headers["Cache-Control"] == "no-store"
