import hashlib
import json
from decimal import Decimal
from uuid import uuid4

from flask import Blueprint, g, jsonify

from . import validation as v
from .auth import protected
from .db import execute, get_db, lock_customer, one, rows
from .errors import ApiError, missing

bp = Blueprint("cart", __name__, url_prefix="/api/cart")


def fingerprint(value):
    """Match JSON.stringify for the strings/booleans/amounts in our legacy hashes."""

    def normalize(item):
        if isinstance(item, dict):
            return {key: normalize(value) for key, value in item.items()}
        if isinstance(item, list):
            return [normalize(value) for value in item]
        if isinstance(item, Decimal):
            return int(item) if item == item.to_integral_value() else float(item)
        return item

    encoded = json.dumps(normalize(value), ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def get_cart(user_id):
    records = rows(
        """SELECT ci.id, ci.quantity, ci.created_at, ci.updated_at,
                      p.id AS product_id, p.slug, p.sku, p.name, p.description, p.price,
                      p.stock_quantity, p.image_url, p.is_active,
                      c.id AS category_id, c.slug AS category_slug, c.name AS category_name
                      FROM cart_items ci JOIN products p ON p.id = ci.product_id
                      JOIN categories c ON c.id = p.category_id
                      WHERE ci.user_id = %s ORDER BY ci.created_at ASC, ci.id ASC""",
        (user_id,),
    )
    items = []
    for row in records:
        availability = (
            "inactive"
            if not row["is_active"]
            else "out_of_stock"
            if row["stock_quantity"] == 0
            else "insufficient_stock"
            if row["quantity"] > row["stock_quantity"]
            else "available"
        )
        product = {
            key: row[key]
            for key in (
                "slug",
                "sku",
                "name",
                "description",
                "price",
                "stock_quantity",
                "image_url",
                "is_active",
            )
        }
        product.update(
            id=str(row["product_id"]),
            category={
                "id": row["category_id"],
                "slug": row["category_slug"],
                "name": row["category_name"],
            },
        )
        items.append(
            {
                "id": str(row["id"]),
                "quantity": row["quantity"],
                "unit_price": row["price"],
                "line_total": row["price"] * row["quantity"],
                "availability": availability,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "product": product,
            }
        )
    revision = fingerprint(
        [
            {
                "id": item["id"],
                "product_id": item["product"]["id"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "stock_quantity": item["product"]["stock_quantity"],
                "is_active": item["product"]["is_active"],
            }
            for item in items
        ]
    )
    return {
        "items": items,
        "revision": revision,
        "summary": {
            "item_count": sum(item["quantity"] for item in items),
            "distinct_items": len(items),
            "subtotal": sum((item["line_total"] for item in items), Decimal(0)),
            "has_unavailable_items": any(item["availability"] != "available" for item in items),
        },
    }


def check_availability(product_id, quantity):
    product = one(
        "SELECT name, stock_quantity, is_active FROM products WHERE id = %s", (product_id,)
    )
    if not product:
        missing("product")
    if not product["is_active"]:
        raise ApiError(409, "PRODUCT_INACTIVE", f"{product['name']} is no longer available.")
    if quantity > product["stock_quantity"]:
        raise ApiError(
            409,
            "INSUFFICIENT_STOCK",
            f"Only {product['stock_quantity']} of this product are currently available.",
        )


@bp.get("")
@protected()
def cart():
    return jsonify(data={"cart": get_cart(g.user["id"])})


@bp.post("/items")
@protected()
def add_item():
    data = v.body()
    product_id = v.identifier(data.get("productId"), "productId")
    quantity = v.number(data.get("quantity", 1), "quantity", 1, 99, integer=True)
    user_id = g.user["id"]
    with get_db().transaction():
        lock_customer(user_id)
        item = one(
            "SELECT id, quantity FROM cart_items WHERE user_id = %s AND product_id = %s",
            (user_id, product_id),
        )
        total = quantity + (item["quantity"] if item else 0)
        v.number(total, "quantity", 1, 99, integer=True)
        check_availability(product_id, total)
        if item:
            execute(
                "UPDATE cart_items SET quantity = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (total, item["id"]),
            )
        else:
            execute(
                "INSERT INTO cart_items (id, user_id, product_id, quantity) VALUES (%s, %s, %s, %s)",
                (uuid4(), user_id, product_id, total),
            )
        result = get_cart(user_id)
    return jsonify(data={"cart": result}), 201


@bp.put("/items/<item_id>")
@protected()
def update_item(item_id):
    item_id = v.identifier(item_id)
    quantity = v.number(v.body().get("quantity"), "quantity", 1, 99, integer=True)
    user_id = g.user["id"]
    with get_db().transaction():
        lock_customer(user_id)
        item = one(
            "SELECT product_id FROM cart_items WHERE id = %s AND user_id = %s", (item_id, user_id)
        )
        if not item:
            missing("cart_item")
        check_availability(item["product_id"], quantity)
        execute(
            "UPDATE cart_items SET quantity = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND user_id = %s",
            (quantity, item_id, user_id),
        )
        result = get_cart(user_id)
    return jsonify(data={"cart": result})


@bp.delete("/items/<item_id>")
@protected()
def delete_item(item_id):
    item_id = v.identifier(item_id)
    user_id = g.user["id"]
    with get_db().transaction():
        lock_customer(user_id)
        result = execute(
            "DELETE FROM cart_items WHERE id = %s AND user_id = %s", (item_id, user_id)
        )
        if not result.rowcount:
            missing("cart_item")
        result = get_cart(user_id)
    return jsonify(data={"cart": result})
