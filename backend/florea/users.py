from uuid import uuid4

from flask import Blueprint, g, jsonify, request
from psycopg.errors import UniqueViolation

from . import validation as v
from .auth import USER_COLUMNS, hash_password, protected
from .catalog import page_info
from .db import execute, get_db, one, rows
from .errors import ApiError, invalid, missing

bp = Blueprint("users", __name__, url_prefix="/api/admin/users")
COLUMNS = USER_COLUMNS + ", is_active, updated_at"


@bp.get("")
@protected("admin")
def list_users():
    page, limit = v.pagination(request.args, 20, 100)
    search = v.string(request.args.get("search", ""), "search", 0, 254)
    role = v.choice(request.args.get("role", "all"), "role", ["all", "admin", "customer"])
    status = v.choice(request.args.get("status", "all"), "status", ["all", "active", "inactive"])
    conditions, values = [], []
    if search:
        conditions.append("(name ILIKE %s OR email ILIKE %s)")
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        values += [f"%{escaped}%"] * 2
    if role != "all":
        conditions.append("role = %s")
        values.append(role)
    if status != "all":
        conditions.append("is_active = %s")
        values.append(status == "active")
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    total = one("SELECT COUNT(*) AS total FROM users" + where, values)["total"]
    data = rows(
        f"SELECT {COLUMNS} FROM users{where} ORDER BY created_at DESC, id LIMIT %s OFFSET %s",
        [*values, limit, (page - 1) * limit],
    )
    return jsonify(data=data, pagination=page_info(page, limit, total))


def email_conflict():
    return ApiError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.")


@bp.post("")
@protected("admin")
def create_user():
    data = v.body({"name", "email", "password", "role"})
    values = v.credentials(register=True)
    role = v.choice(data.get("role", "customer"), "role", ["customer", "admin"])
    try:
        user = one(
            f"""INSERT INTO users (id, name, email, password_hash, role)
                VALUES (%s, %s, %s, %s, %s) RETURNING {COLUMNS}""",
            (uuid4(), values["name"], values["email"], hash_password(values["password"]), role),
        )
    except UniqueViolation:
        raise email_conflict() from None
    return jsonify(data=user), 201


@bp.put("/<user_id>")
@protected("admin")
def update_user(user_id):
    user_id = v.identifier(user_id)
    data = v.body({"name", "email", "role", "isActive"})
    if not data:
        invalid("", "Provide at least one field to update.")
    values = {}
    if "name" in data:
        values["name"] = v.string(data["name"], "name", 2, 80)
    if "email" in data:
        values["email"] = v.string(
            data["email"], "email", 3, 254, r"[^\s@]+@[^\s@]+\.[^\s@]+"
        ).lower()
    if "role" in data:
        values["role"] = v.choice(data["role"], "role", ["customer", "admin"])
    if "isActive" in data:
        values["is_active"] = v.boolean(data["isActive"], "isActive")
    try:
        with get_db().transaction():
            # Serialize account management and recheck the actor after waiting, so two
            # admins cannot concurrently disable/demote each other and leave no admin.
            execute("LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE")
            actor = one("SELECT role, is_active FROM users WHERE id = %s", (g.user["id"],))
            if not actor or not actor["is_active"] or actor["role"] != "admin":
                raise ApiError(403, "ADMIN_ACCESS_REQUIRED", "Administrator access is required.")
            current = one(f"SELECT {COLUMNS} FROM users WHERE id = %s", (user_id,))
            if not current:
                missing("user")
            if user_id == str(g.user["id"]) and (
                values.get("role", "admin") != "admin" or values.get("is_active") is False
            ):
                raise ApiError(
                    409, "SELF_ACCESS_CHANGE", "You cannot demote or deactivate your own account."
                )
            assignments = [f"{field} = %s" for field in values]
            if "is_active" in values and values["is_active"] != current["is_active"]:
                assignments.append("session_version = session_version + 1")
            user = one(
                f"UPDATE users SET {', '.join(assignments)}, updated_at = CURRENT_TIMESTAMP "
                f"WHERE id = %s RETURNING {COLUMNS}",
                [*values.values(), user_id],
            )
    except UniqueViolation:
        raise email_conflict() from None
    return jsonify(data=user)
