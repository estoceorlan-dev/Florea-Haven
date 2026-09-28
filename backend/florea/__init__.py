import os
import secrets
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from time import perf_counter
from uuid import UUID

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask.json.provider import DefaultJSONProvider
from werkzeug.exceptions import HTTPException

from .db import close_db, one
from .errors import ApiError

ROOT = Path(__file__).resolve().parents[2]


class ApiJSONProvider(DefaultJSONProvider):
    sort_keys = False

    @staticmethod
    def default(value):
        if isinstance(value, datetime):
            return (
                value.astimezone(timezone.utc)
                .isoformat(timespec="milliseconds")
                .replace("+00:00", "Z")
            )
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, UUID):
            return str(value)
        return DefaultJSONProvider.default(value)


def create_app(config=None):
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT / "backend" / ".env")
    app = Flask(__name__, static_folder=None)
    app.url_map.strict_slashes = False
    app.json_provider_class = ApiJSONProvider
    app.json = ApiJSONProvider(app)
    environment = os.getenv("APP_ENV", os.getenv("NODE_ENV", "development"))
    app.config.from_mapping(
        APP_ENV=environment,
        DATABASE_URL=os.getenv("DATABASE_URL"),
        DATABASE_SSL=os.getenv("DATABASE_SSL", "false").lower() == "true",
        JWT_SECRET=os.getenv("JWT_SECRET")
        or (None if environment == "production" else secrets.token_urlsafe(48)),
        SESSION_DAYS=int(os.getenv("SESSION_DAYS", "7")),
        CLIENT_ORIGIN=os.getenv("CLIENT_ORIGIN", "http://localhost:5173"),
        MAX_CONTENT_LENGTH=100 * 1024,
        RATELIMIT_STORAGE_URI=os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
        RATELIMIT_HEADERS_ENABLED=True,
        FRONTEND_DIST=ROOT / "client" / "dist",
    )
    app.config.update(config or {})
    if not app.config["JWT_SECRET"]:
        raise RuntimeError("JWT_SECRET is required in production.")
    if not app.config["DATABASE_URL"]:
        raise RuntimeError("DATABASE_URL is required. Configure PostgreSQL in .env; see README.md.")
    if not 1 <= app.config["SESSION_DAYS"] <= 30:
        raise RuntimeError("SESSION_DAYS must be an integer between 1 and 30.")
    app.teardown_appcontext(close_db)

    @app.before_request
    def check_origin():
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            origin = request.headers.get("Origin")
            if origin and origin != app.config["CLIENT_ORIGIN"]:
                raise ApiError(403, "ORIGIN_NOT_ALLOWED", "This request origin is not allowed.")

    @app.after_request
    def response_headers(response):
        if request.headers.get("Origin") == app.config["CLIENT_ORIGIN"]:
            response.headers["Access-Control-Allow-Origin"] = app.config["CLIENT_ORIGIN"]
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, Idempotency-Key"
            )
            response.vary.add("Origin")
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' "
            "https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https: http:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
        )
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        if app.config["APP_ENV"] == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    @app.errorhandler(Exception)
    def error_response(error):
        if isinstance(error, ApiError):
            payload = {"code": error.code, "message": str(error)}
            if error.details is not None:
                payload["details"] = error.details
            return jsonify(error=payload), error.status
        if isinstance(error, HTTPException):
            code = {404: "NOT_FOUND", 429: "RATE_LIMITED", 400: "VALIDATION_ERROR"}.get(
                error.code, "REQUEST_ERROR"
            )
            message = (
                "Too many authentication attempts. Please try again later."
                if error.code == 429
                else error.description
            )
            return jsonify(error={"code": code, "message": message}), error.code
        app.logger.exception("Request failed")
        return jsonify(
            error={
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Something went wrong while processing the request.",
            }
        ), 500

    from . import auth, cart, catalog, orders

    auth.limiter.init_app(app)
    for blueprint in (auth.bp, catalog.bp, cart.bp, orders.bp):
        app.register_blueprint(blueprint)

    @app.get("/api/health")
    def health():
        start = perf_counter()
        one("SELECT 1 AS healthy")
        return jsonify(
            data={
                "status": "up",
                "service": "florea-haven-api",
                "database": {
                    "status": "up",
                    "mode": "postgresql",
                    "responseTimeMs": max(1, round((perf_counter() - start) * 1000)),
                },
                "timestamp": datetime.now(timezone.utc),
            }
        )

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def frontend(path):
        if path == "api" or path.startswith("api/"):
            raise ApiError(404, "NOT_FOUND", f"No route matches {request.method} {request.path}.")
        dist = Path(app.config["FRONTEND_DIST"])
        # send_from_directory performs traversal-safe path resolution.
        if (dist / path).is_file():
            return send_from_directory(dist, path)
        if path.startswith("assets/") or not (dist / "index.html").is_file():
            raise ApiError(404, "NOT_FOUND", "Build the frontend with npm run build.")
        return send_from_directory(dist, "index.html")

    return app
