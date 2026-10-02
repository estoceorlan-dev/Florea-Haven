from datetime import datetime, timedelta, timezone
from functools import wraps
from uuid import uuid4

import bcrypt
import jwt
from flask import Blueprint, current_app, g, jsonify, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from psycopg.errors import UniqueViolation

from .db import one
from .errors import ApiError
from .validation import credentials

bp = Blueprint("auth", __name__, url_prefix="/api/auth")
limiter = Limiter(key_func=get_remote_address)
COOKIE = "florea_session"
USER_COLUMNS = "id, name, email, role, created_at, profile_image_url, profile_image_public_id"
DUMMY_HASH = bcrypt.hashpw(b"not-a-real-password-987654", bcrypt.gensalt())


def hash_password(password):
    # bcryptjs truncates UTF-8 input at 72 bytes; preserve existing password behavior.
    return bcrypt.hashpw(
        password.encode("utf-8")[:72], bcrypt.gensalt(rounds=4 if current_app.testing else 12)
    ).decode("ascii")


def check_password(password, password_hash):
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("ascii"))
    except (ValueError, UnicodeError):
        return False


def protected(role=None):
    def decorate(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            authorization = request.headers.get("Authorization", "")
            token = request.cookies.get(COOKIE) or (
                authorization[7:].strip() if authorization.startswith("Bearer ") else None
            )
            failure = ApiError(
                401,
                "AUTHENTICATION_REQUIRED",
                "Authentication is required to access this resource.",
            )
            if not token:
                raise failure
            try:
                payload = jwt.decode(
                    token,
                    current_app.config["JWT_SECRET"],
                    algorithms=["HS256"],
                    options={"require": ["sub", "exp", "iat"]},
                )
                from uuid import UUID

                user_id = UUID(payload["sub"])
            except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
                raise failure from None
            g.user = one(
                f"SELECT {USER_COLUMNS}, is_active, session_version FROM users WHERE id = %s",
                (user_id,),
            )
            if not g.user or not g.user.pop("is_active"):
                raise failure
            if payload.get("version", 0) != g.user.pop("session_version"):
                raise failure
            if role and g.user["role"] != role:
                label = "Administrator" if role == "admin" else "Customer"
                raise ApiError(
                    403, f"{role.upper()}_ACCESS_REQUIRED", f"{label} access is required."
                )
            return fn(*args, **kwargs)

        return wrapped

    return decorate


def cookie_options():
    return dict(
        httponly=True,
        secure=current_app.config["APP_ENV"] == "production",
        samesite="Lax",
        path="/",
    )


def session_response(user, status=200):
    user = dict(user)
    version = user.pop("session_version", 0)
    user.pop("is_active", None)
    now = datetime.now(timezone.utc)
    days = current_app.config["SESSION_DAYS"]
    token = jwt.encode(
        {
            "role": user["role"],
            "version": version,
            "sub": str(user["id"]),
            "iat": now,
            "exp": now + timedelta(days=days),
        },
        current_app.config["JWT_SECRET"],
        algorithm="HS256",
    )
    response = jsonify(data={"user": user})
    response.status_code = status
    response.set_cookie(COOKIE, token, max_age=days * 86400, **cookie_options())
    return response


auth_limit = limiter.shared_limit("20 per 15 minutes", scope="authentication")


@bp.post("/register")
@auth_limit
def register():
    data = credentials(register=True)
    password_hash = hash_password(data["password"])
    try:
        user = one(
            f"""INSERT INTO users (id, name, email, password_hash, role)
                    VALUES (%s, %s, %s, %s, 'customer') RETURNING {USER_COLUMNS}""",
            (uuid4(), data["name"], data["email"], password_hash),
        )
    except UniqueViolation:
        raise ApiError(
            409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists."
        ) from None
    return session_response(user, 201)


@bp.post("/login")
@auth_limit
def login():
    data = credentials()
    user = one(
        f"SELECT {USER_COLUMNS}, password_hash, is_active, session_version "
        "FROM users WHERE email = %s",
        (data["email"],),
    )
    password_hash = user.pop("password_hash") if user else DUMMY_HASH.decode("ascii")
    valid = check_password(data["password"], password_hash)
    if not user or not valid or not user["is_active"]:
        raise ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.")
    return session_response(user)


@bp.post("/logout")
def logout():
    response = jsonify(data={"signedOut": True})
    response.delete_cookie(COOKIE, **cookie_options())
    return response


@bp.get("/me")
@protected()
def me():
    return jsonify(data={"user": g.user})
