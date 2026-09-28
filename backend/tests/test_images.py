from io import BytesIO
from unittest.mock import Mock

import pytest
from PIL import Image

from florea.db import execute, one
from florea.images import cleanup_pending


def image_file(fmt="PNG", size=(32, 24)):
    output = BytesIO()
    Image.new("RGB", size, "pink").save(output, fmt)
    output.seek(0)
    return output, "photo." + fmt.lower(), Image.MIME[fmt]


@pytest.fixture
def provider(app, monkeypatch):
    app.config.update(
        CLOUDINARY_CLOUD_NAME="test-garden",
        CLOUDINARY_API_KEY="test-key",
        CLOUDINARY_API_SECRET="test-secret",
    )

    def upload(content, **options):
        with Image.open(content) as image:
            assert image.format == "WEBP"
            assert max(image.size) <= 1600
            assert not image.getexif()
        return dict(public_id=options["public_id"], resource_type="image", version=1)

    uploader = Mock(side_effect=upload)
    destroy = Mock(return_value={"result": "ok"})
    monkeypatch.setattr("florea.images.cloudinary.uploader.upload", uploader)
    monkeypatch.setattr("florea.images.cloudinary.uploader.destroy", destroy)
    return uploader, destroy


def test_profile_upload_replace_remove(customer, app, provider):
    first = customer.put("/api/users/me/profile-image", data={"file": image_file()})
    assert first.status_code == 200
    user = first.json["data"]["user"]
    assert user["profile_image_url"].startswith("https://res.cloudinary.com/test-garden/")
    assert user["id"] in user["profile_image_public_id"]
    assert customer.get("/api/auth/me").json["data"]["user"] == user
    second = customer.put("/api/users/me/profile-image", data={"file": image_file("JPEG")})
    assert second.status_code == 200
    assert second.json["data"]["user"]["profile_image_public_id"] != user["profile_image_public_id"]
    assert provider[1].call_count == 1
    removed = customer.delete("/api/users/me/profile-image")
    assert removed.json["data"]["user"]["profile_image_url"] is None
    assert customer.delete("/api/users/me/profile-image").status_code == 200
    with app.app_context():
        assert one("SELECT COUNT(*) AS n FROM image_cleanup")["n"] == 0


def test_image_permissions(app, customer, admin, product, provider):
    assert app.test_client().put("/api/users/me/profile-image").status_code == 401
    path = f"/api/products/{product['id']}/image"
    assert customer.put(path, data={"file": image_file()}).status_code == 403
    assert customer.delete(path).status_code == 403
    assert admin.put(path, data={"file": image_file("WEBP")}).status_code == 200
    assert admin.delete(path).json["data"]["image_url"] is None
    assert provider[0].call_count == 1


@pytest.mark.parametrize(
    "file",
    [
        lambda: (BytesIO(b"<svg/>"), "photo.png", "image/png"),
        lambda: (BytesIO(b"a" * (5 * 1024 * 1024 + 1)), "photo.png", "image/png"),
        lambda: image_file("PNG", (4097, 1)),
        lambda: (image_file()[0], "photo.jpg", "image/jpeg"),
        lambda: image_file("GIF"),
    ],
)
def test_invalid_images(customer, provider, file):
    response = customer.put("/api/users/me/profile-image", data={"file": file()})
    assert response.status_code in {400, 413}
    provider[0].assert_not_called()


def test_animated_and_missing_file(customer, provider):
    output = BytesIO()
    Image.new("RGB", (8, 8), "red").save(
        output, "PNG", save_all=True, append_images=[Image.new("RGB", (8, 8), "blue")]
    )
    output.seek(0)
    assert (
        customer.put(
            "/api/users/me/profile-image", data={"file": (output, "a.png", "image/png")}
        ).status_code
        == 400
    )
    assert customer.put("/api/users/me/profile-image", data={}).status_code == 400
    assert (
        customer.put("/api/users/me/profile-image", json={"public_id": "forged"}).status_code == 400
    )


def test_provider_failure_preserves_image(customer, app, provider):
    first = customer.put("/api/users/me/profile-image", data={"file": image_file()}).json
    provider[0].side_effect = RuntimeError("secret provider message")
    response = customer.put("/api/users/me/profile-image", data={"file": image_file()})
    assert response.status_code == 502
    assert "secret" not in response.text
    assert customer.get("/api/auth/me").json == first
    with app.app_context():
        assert one("SELECT COUNT(*) AS n FROM image_cleanup")["n"] == 1


def test_cleanup_failure_is_durable(customer, app, provider):
    customer.put("/api/users/me/profile-image", data={"file": image_file()})
    provider[1].side_effect = RuntimeError("provider down")
    assert customer.delete("/api/users/me/profile-image").status_code == 200
    with app.app_context():
        assert one("SELECT attempts FROM image_cleanup")["attempts"] == 1
        execute("UPDATE image_cleanup SET not_before = CURRENT_TIMESTAMP")
        provider[1].side_effect = None
        assert cleanup_pending() == 1
        assert one("SELECT COUNT(*) AS n FROM image_cleanup")["n"] == 0


def test_upload_never_changes_another_profile(customer, admin, provider):
    customer.put("/api/users/me/profile-image", data={"file": image_file()})
    assert admin.get("/api/auth/me").json["data"]["user"]["profile_image_url"] is None


def test_manual_product_urls_rejected(admin, product):
    response = admin.put(
        f"/api/products/{product['id']}", json={"imageUrl": "https://example.com/a.jpg"}
    )
    assert response.status_code == 400
    assert (
        admin.get(f"/api/products/{product['id']}").json["data"]["image_url"]
        == product["image_url"]
    )


def test_missing_configuration(customer, app):
    app.config["CLOUDINARY_API_SECRET"] = None
    assert (
        customer.put("/api/users/me/profile-image", data={"file": image_file()}).status_code == 503
    )


def test_image_limits_run_after_authentication(app, provider):
    from conftest import register

    from florea import create_app

    limited = create_app(
        {**app.config, "RATELIMIT_ENABLED": True, "RATELIMIT_STORAGE_URI": "memory://"}
    )
    client = limited.test_client()
    register(client)
    for _ in range(20):
        assert client.delete("/api/users/me/profile-image").status_code == 200
    assert client.delete("/api/users/me/profile-image").status_code == 429


def test_concurrent_uploads_are_bounded(customer, provider):
    from florea.images import UPLOAD_SLOT

    with UPLOAD_SLOT:
        response = customer.put("/api/users/me/profile-image", data={"file": image_file()})
        assert response.status_code == 503
        assert response.json["error"]["code"] == "IMAGE_UPLOAD_BUSY"
    provider[0].assert_not_called()


def test_database_failure_retains_old_image_and_queues_orphan(customer, app, provider, monkeypatch):
    import florea.images as images

    first = customer.put("/api/users/me/profile-image", data={"file": image_file()}).json
    original_execute = images.execute

    def fail_update(sql, values=()):
        if sql.startswith("UPDATE users"):
            raise RuntimeError("database write failed")
        return original_execute(sql, values)

    monkeypatch.setattr(images, "execute", fail_update)
    assert (
        customer.put("/api/users/me/profile-image", data={"file": image_file()}).status_code == 500
    )
    assert customer.get("/api/auth/me").json == first
    provider[1].assert_not_called()
    with app.app_context():
        assert one("SELECT COUNT(*) AS n FROM image_cleanup")["n"] == 1
