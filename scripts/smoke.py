"""Read-only smoke checks: python scripts/smoke.py https://your-service.onrender.com"""

import json
import sys
from urllib.error import HTTPError
from urllib.request import urlopen

base = sys.argv[1].rstrip("/")
for path in (
    "/api/health",
    "/api/categories",
    "/api/products",
    "/",
    "/account",
    "/theme-init.js",
):
    with urlopen(base + path, timeout=20) as response:
        assert response.status == 200, path
        assert response.headers["X-Content-Type-Options"] == "nosniff", path
        if path.startswith("/api/"):
            payload = json.load(response)
            assert "data" in payload, path
        print(f"PASS {path}")
try:
    urlopen(base + "/api/admin/orders", timeout=20)
    raise AssertionError("Admin endpoint was publicly accessible")
except HTTPError as error:
    assert error.code == 401, error.code
    print("PASS administrator authorization")
