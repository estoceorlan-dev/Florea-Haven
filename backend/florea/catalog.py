import math
import re
import unicodedata
from uuid import uuid4

from flask import Blueprint, jsonify, request
from psycopg.errors import ForeignKeyViolation, RestrictViolation, UniqueViolation

from . import validation as v
from .auth import protected
from .db import execute, get_db, one, rows
from .errors import ApiError, invalid, missing

bp = Blueprint("catalog", __name__, url_prefix="/api")
PRODUCT_SELECT = """SELECT p.*, c.slug AS category_slug, c.name AS category_name
                    FROM products p JOIN categories c ON c.id = p.category_id"""
PRODUCT_COLUMNS = {
    "categoryId": "category_id",
    "slug": "slug",
    "sku": "sku",
    "name": "name",
    "description": "description",
    "price": "price",
    "stockQuantity": "stock_quantity",
    "imageUrl": "image_url",
    "featured": "featured",
    "isActive": "is_active",
}
PUBLIC_SORTS = {
    "featured": "p.featured DESC, p.created_at DESC, p.name ASC",
    "newest": "p.created_at DESC, p.name ASC",
    "price-asc": "p.price ASC, p.name ASC",
    "price-desc": "p.price DESC, p.name ASC",
    "name-asc": "p.name ASC",
}
ADMIN_SORTS = {
    "newest": PUBLIC_SORTS["newest"],
    "name-asc": "p.name ASC",
    "stock-asc": "p.stock_quantity ASC, p.name ASC",
    "stock-desc": "p.stock_quantity DESC, p.name ASC",
}


def page_info(page, limit, total):
    pages = max(1, math.ceil(total / limit))
    return dict(
        page=page,
        limit=limit,
        total=total,
        totalPages=pages,
        hasPreviousPage=page > 1,
        hasNextPage=page < pages,
    )


def map_product(row, admin=False):
    fields = [
        "id",
        "slug",
        "sku",
        "name",
        "description",
        "price",
        "stock_quantity",
        "image_url",
        "featured",
        "created_at",
    ]
    if admin:
        fields += ["is_active", "updated_at"]
    result = {field: row[field] for field in fields}
    result["category"] = {
        "id": row["category_id"],
        "slug": row["category_slug"],
        "name": row["category_name"],
    }
    return result


def get_product(product_id, admin=False):
    row = one(
        PRODUCT_SELECT + " WHERE p.id = %s" + ("" if admin else " AND p.is_active = TRUE"),
        (product_id,),
    )
    if not row:
        missing("product")
    return map_product(row, admin)


def list_categories(admin=False):
    fields = ", c.created_at, c.updated_at" if admin else ""
    active_count = (
        ", COUNT(p.id) FILTER (WHERE p.is_active)::int AS active_product_count" if admin else ""
    )
    return rows(f"""SELECT c.id, c.slug, c.name, c.description{fields},
                    COUNT(p.id)::int AS product_count{active_count}
                    FROM categories c LEFT JOIN products p ON p.category_id = c.id
                    {"" if admin else "AND p.is_active = TRUE"}
                    GROUP BY c.id ORDER BY c.name ASC""")


@bp.get("/categories")
def categories():
    return jsonify(data=list_categories())


@bp.get("/admin/categories")
@protected("admin")
def admin_categories():
    return jsonify(data=list_categories(True))


def list_products(admin=False):
    args = request.args
    page, limit = v.pagination(args, 20 if admin else 9, 100 if admin else 48)
    search = v.string(args.get("search", ""), "search", 0, 100)
    sorts = ADMIN_SORTS if admin else PUBLIC_SORTS
    sort = v.choice(args.get("sort", "newest" if admin else "featured"), "sort", sorts)
    conditions, values = ([] if admin else ["p.is_active = TRUE"]), []
    if search:
        field = "sku" if admin else "description"
        conditions.append(f"(p.name ILIKE %s OR p.{field} ILIKE %s)")
        values += [f"%{search}%"] * 2
    category = args.get("category")
    if category is not None:
        category = (
            v.identifier(category, "category") if admin else v.string(category, "category", 0, 60)
        )
        if category:
            conditions.append("p.category_id = %s" if admin else "c.slug = %s")
            values.append(category)
    filters = dict(
        search=search, category=category, minPrice=None, maxPrice=None, sort=sort, featured=None
    )
    if admin:
        status = v.choice(args.get("status", "all"), "status", ["all", "active", "inactive"])
        if status != "all":
            conditions.append("p.is_active = %s")
            values.append(status == "active")
    else:
        for field, operator in (("minPrice", ">="), ("maxPrice", "<=")):
            if field in args:
                filters[field] = v.number(args[field], field)
                conditions.append(f"p.price {operator} %s")
                values.append(filters[field])
        if (
            filters["minPrice"] is not None
            and filters["maxPrice"] is not None
            and filters["minPrice"] > filters["maxPrice"]
        ):
            invalid("minPrice", "Minimum price cannot be greater than maximum price.")
        if "featured" in args:
            filters["featured"] = (
                v.choice(args["featured"], "featured", ["true", "false"]) == "true"
            )
            conditions.append("p.featured = %s")
            values.append(filters["featured"])
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    total = one(
        "SELECT COUNT(*) AS total FROM products p JOIN categories c ON c.id = p.category_id"
        + where,
        values,
    )["total"]
    products = rows(
        PRODUCT_SELECT + where + f" ORDER BY {sorts[sort]} LIMIT %s OFFSET %s",
        [*values, limit, (page - 1) * limit],
    )
    result = dict(
        data=[map_product(row, admin) for row in products], pagination=page_info(page, limit, total)
    )
    if not admin:
        result["filters"] = filters
    return jsonify(result)


@bp.get("/products")
def products():
    return list_products()


@bp.get("/admin/products")
@protected("admin")
def admin_products():
    return list_products(True)


@bp.get("/products/<product_id>")
def product(product_id):
    return jsonify(data=get_product(v.identifier(product_id)))


def slug_for(data):
    if data.get("slug"):
        return data["slug"]
    normalized = unicodedata.normalize("NFKD", data["name"])
    normalized = "".join(c for c in normalized if not unicodedata.combining(c)).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")[:60].rstrip("-")
    if not slug:
        invalid("slug", "A valid slug is required.")
    return slug


def unique_error(error):
    constraint = error.diag.constraint_name or ""
    resource = "category" if constraint.startswith("categories") else "product"
    field = "name" if "name" in constraint else "sku" if "sku" in constraint else "slug"
    raise ApiError(
        409,
        f"{resource.upper()}_{field.upper()}_IN_USE",
        f"A {resource} with this {field} already exists.",
        {"field": field},
    ) from None


def ensure_category_unique(data, exclude_id=None):
    # Preserve which validation error wins when both name and generated slug collide.
    for field in ("name", "slug"):
        if field in data and one(
            f"SELECT id FROM categories WHERE LOWER({field}) = LOWER(%s) "
            "AND (%s::uuid IS NULL OR id <> %s::uuid)",
            (data[field], exclude_id, exclude_id),
        ):
            raise ApiError(
                409,
                f"CATEGORY_{field.upper()}_IN_USE",
                f"A category with this {field} already exists.",
                {"field": field},
            )


@bp.post("/categories")
@protected("admin")
def create_category():
    data = v.catalog_input()
    data["slug"] = slug_for(data)
    ensure_category_unique(data)
    try:
        row = one(
            """INSERT INTO categories (id, slug, name, description) VALUES (%s, %s, %s, %s)
                     RETURNING *""",
            (uuid4(), slug_for(data), data["name"], data["description"]),
        )
    except UniqueViolation as error:
        unique_error(error)
    return jsonify(data={**row, "product_count": 0, "active_product_count": 0}), 201


@bp.put("/categories/<category_id>")
@protected("admin")
def update_category(category_id):
    category_id = v.identifier(category_id)
    data = v.catalog_input(update=True)
    if not one("SELECT id FROM categories WHERE id = %s", (category_id,)):
        missing("category")
    ensure_category_unique(data, category_id)
    assignments = ", ".join(f"{key} = %s" for key in data)  # validated allowlist
    try:
        result = execute(
            f"UPDATE categories SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            [*data.values(), category_id],
        )
    except UniqueViolation as error:
        unique_error(error)
    if not result.rowcount:
        missing("category")
    return jsonify(data=next(row for row in list_categories(True) if str(row["id"]) == category_id))


@bp.delete("/categories/<category_id>")
@protected("admin")
def delete_category(category_id):
    category_id = v.identifier(category_id)
    try:
        result = execute("DELETE FROM categories WHERE id = %s", (category_id,))
    except (ForeignKeyViolation, RestrictViolation):
        raise ApiError(
            409,
            "CATEGORY_IN_USE",
            "This category is still referenced by products and cannot be deleted.",
        ) from None
    if not result.rowcount:
        missing("category")
    return jsonify(data={"id": category_id, "deleted": True})


@bp.post("/products")
@protected("admin")
def create_product():
    data = v.catalog_input(product=True)
    data["slug"] = slug_for(data)
    product_id = uuid4()
    columns = ", ".join(PRODUCT_COLUMNS[key] for key in data)
    placeholders = ", ".join(["%s"] * len(data))
    try:
        with get_db().transaction():
            execute(
                f"INSERT INTO products (id, {columns}) VALUES (%s, {placeholders})",
                [product_id, *data.values()],
            )
            result = get_product(product_id, True)
    except UniqueViolation as error:
        unique_error(error)
    except ForeignKeyViolation:
        missing("category")
    return jsonify(data=result), 201


@bp.put("/products/<product_id>")
@protected("admin")
def update_product(product_id):
    product_id = v.identifier(product_id)
    data = v.catalog_input(product=True, update=True)
    assignments = ", ".join(f"{PRODUCT_COLUMNS[key]} = %s" for key in data)
    try:
        with get_db().transaction():
            result = execute(
                f"UPDATE products SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                [*data.values(), product_id],
            )
            if not result.rowcount:
                missing("product")
            product = get_product(product_id, True)
    except UniqueViolation as error:
        unique_error(error)
    except ForeignKeyViolation:
        missing("category")
    return jsonify(data=product)


@bp.delete("/products/<product_id>")
@protected("admin")
def deactivate_product(product_id):
    product_id = v.identifier(product_id)
    with get_db().transaction():
        result = execute(
            "UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (product_id,),
        )
        if not result.rowcount:
            missing("product")
        return jsonify(data=get_product(product_id, True))
