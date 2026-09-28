"""Validate bytes locally, then upload signed server-to-server to Cloudinary."""

import warnings
from functools import wraps
from io import BytesIO
from threading import BoundedSemaphore
from uuid import uuid4

import cloudinary.uploader
import cloudinary.utils
from flask import Blueprint, current_app, g, jsonify, request
from PIL import Image, ImageOps, UnidentifiedImageError

from .auth import USER_COLUMNS, limiter, protected
from .catalog import get_product
from .db import execute, get_db, one, rows
from .errors import ApiError, invalid, missing
from .validation import identifier

bp = Blueprint("images", __name__, url_prefix="/api")
MAX_BYTES = 5 * 1024 * 1024
FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
UPLOAD_SLOT = BoundedSemaphore(1)


def bounded_upload(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        if request.method != "PUT":
            return fn(*args, **kwargs)
        if not UPLOAD_SLOT.acquire(blocking=False):
            raise ApiError(
                503, "IMAGE_UPLOAD_BUSY", "Another image is processing. Try again shortly."
            )
        try:
            return fn(*args, **kwargs)
        finally:
            UPLOAD_SLOT.release()

    return wrapped


def provider_options():
    options = {
        key: current_app.config.get("CLOUDINARY_" + key.upper())
        for key in ("cloud_name", "api_key", "api_secret")
    }
    if not all(options.values()):
        raise ApiError(503, "IMAGES_UNAVAILABLE", "Image uploads are not configured yet.")
    return options


def normalized_image(file, avatar=False):
    if not file:
        invalid("file", "Choose a JPEG, PNG, or WebP image.")
    content = file.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise ApiError(413, "IMAGE_TOO_LARGE", "Images must be 5 MB or smaller.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as source:
                if source.format not in FORMATS or file.mimetype != FORMATS[source.format]:
                    invalid("file", "The file must contain a JPEG, PNG, or WebP image.")
                if getattr(source, "is_animated", False):
                    invalid("file", "Animated images are not supported.")
                if max(source.size) > 4096:
                    invalid("file", "Image dimensions must not exceed 4096 by 4096 pixels.")
                source.load()
                converted = ImageOps.exif_transpose(source).convert("RGBA")
                converted.thumbnail((512, 512) if avatar else (1600, 1600))
                # A fresh image strips EXIF, comments, and embedded metadata.
                clean = Image.new("RGBA", converted.size)
                clean.paste(converted)
                output = BytesIO()
                clean.save(output, "WEBP", quality=85)
                output.seek(0)
                return output
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        invalid("file", "This image could not be read. Choose a valid image.")


def cleanup_asset(public_id):
    try:
        result = cloudinary.uploader.destroy(
            public_id, resource_type="image", invalidate=True, timeout=30, **provider_options()
        )
        if result.get("result") not in {"ok", "not found"}:
            raise RuntimeError("Provider did not confirm deletion")
        execute("DELETE FROM image_cleanup WHERE public_id = %s", (public_id,))
        return True
    except Exception:
        # Do not log provider exceptions: they can contain signed URLs/credentials.
        current_app.logger.warning("image_cleanup_failed public_id=%s", public_id)
        execute(
            """UPDATE image_cleanup SET attempts = attempts + 1,
                   not_before = CURRENT_TIMESTAMP + INTERVAL '1 hour' WHERE public_id = %s""",
            (public_id,),
        )
        return False


def cleanup_pending():
    count = 0
    for row in rows("SELECT public_id FROM image_cleanup WHERE not_before <= CURRENT_TIMESTAMP"):
        public_id = row["public_id"]
        # Defense in depth: never delete an attached image.
        if one(
            """SELECT id FROM users WHERE profile_image_public_id = %s
                  UNION ALL SELECT id FROM products WHERE image_public_id = %s""",
            (public_id, public_id),
        ):
            continue
        count += int(cleanup_asset(public_id))
    return count


def change_image(resource_id, avatar=False):
    table = "users" if avatar else "products"
    url_column = "profile_image_url" if avatar else "image_url"
    id_column = "profile_image_public_id" if avatar else "image_public_id"
    if not one(f"SELECT id FROM {table} WHERE id = %s", (resource_id,)):
        missing("user" if avatar else "product")
    new_id, url = None, None
    if request.method == "PUT":
        options = provider_options()
        content = normalized_image(request.files.get("file"), avatar)
        prefix = "profile-images" if avatar else "product-images"
        new_id = f"florea/{prefix}/{resource_id}/{uuid4().hex}"
        # Commit before the provider call so crashes/timeouts leave a cleanup record.
        execute(
            """INSERT INTO image_cleanup (public_id, not_before)
                   VALUES (%s, CURRENT_TIMESTAMP + INTERVAL '24 hours')""",
            (new_id,),
        )
        try:
            result = cloudinary.uploader.upload(
                content,
                public_id=new_id,
                resource_type="image",
                overwrite=False,
                format="webp",
                timeout=30,
                **options,
            )
            if result.get("public_id") != new_id or result.get("resource_type") != "image":
                raise RuntimeError("Unexpected provider response")
            url = cloudinary.utils.cloudinary_url(
                new_id,
                cloud_name=options["cloud_name"],
                secure=True,
                version=int(result["version"]),
                format="webp",
                fetch_format="auto",
                quality="auto",
            )[0]
        except Exception:
            current_app.logger.warning("image_upload_failed public_id=%s", new_id)
            raise ApiError(
                502, "IMAGE_UPLOAD_FAILED", "Image upload failed. Please try again."
            ) from None
    with get_db().transaction():
        previous = one(f"SELECT {id_column} FROM {table} WHERE id = %s FOR UPDATE", (resource_id,))
        if not previous:
            missing("user" if avatar else "product")
        execute(
            f"""UPDATE {table} SET {url_column} = %s, {id_column} = %s,
                    updated_at = CURRENT_TIMESTAMP WHERE id = %s""",
            (url, new_id, resource_id),
        )
        if new_id:
            execute("DELETE FROM image_cleanup WHERE public_id = %s", (new_id,))
        old_id = previous[id_column]
        if old_id:
            execute(
                "INSERT INTO image_cleanup (public_id) VALUES (%s) ON CONFLICT DO NOTHING",
                (old_id,),
            )
    if old_id:
        cleanup_asset(old_id)
    if avatar:
        return jsonify(
            data={"user": one(f"SELECT {USER_COLUMNS} FROM users WHERE id = %s", (resource_id,))}
        )
    return jsonify(data=get_product(resource_id, True))


@bp.route("/users/me/profile-image", methods=["PUT", "DELETE"])
@protected()
@limiter.limit("20 per hour", key_func=lambda: str(g.user["id"]))
@bounded_upload
def profile_image():
    return change_image(g.user["id"], avatar=True)


@bp.route("/products/<product_id>/image", methods=["PUT", "DELETE"])
@protected("admin")
@limiter.limit("60 per hour", key_func=lambda: str(g.user["id"]))
@bounded_upload
def product_image(product_id):
    return change_image(identifier(product_id))
