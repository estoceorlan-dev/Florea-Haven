"""Test-only server. Cloudinary calls are stubbed; application/database paths are real."""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from florea import create_app
from florea import images
from waitress import serve

schema = os.environ["E2E_SCHEMA"]
assert schema.startswith("florea_e2e_") and len(schema) == 43
app = create_app(
    {
        "APP_ENV": "test",
        "DATABASE_URL": os.environ["E2E_DATABASE_URL"],
        "DATABASE_SCHEMA": schema,
        "DATABASE_SSL": False,
        "JWT_SECRET": "e2e-only-secret-never-used-in-production",
        "RATELIMIT_ENABLED": False,
        "CLIENT_ORIGIN": "http://127.0.0.1:4173",
        "CLOUDINARY_CLOUD_NAME": "florea-e2e",
        "CLOUDINARY_API_KEY": "e2e",
        "CLOUDINARY_API_SECRET": "e2e",
    }
)
images.cloudinary.uploader.upload = lambda content, **options: {
    "public_id": options["public_id"],
    "resource_type": "image",
    "version": 1,
}
images.cloudinary.uploader.destroy = lambda *args, **kwargs: {"result": "ok"}
serve(app, host="127.0.0.1", port=4173)
