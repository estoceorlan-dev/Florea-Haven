from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from flask import Blueprint, g, jsonify, request
from psycopg.types.json import Jsonb

from . import validation as v
from .auth import protected
from .cart import fingerprint, get_cart
from .catalog import page_info
from .db import execute, get_db, lock_customer, one, rows
from .errors import ApiError, invalid, missing

bp = Blueprint("orders", __name__, url_prefix="/api")
TRANSITIONS = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["preparing", "cancelled"],
    "preparing": ["shipped"],
    "shipped": ["delivered"],
    "delivered": [],
    "cancelled": [],
}
ORDER_SELECT = """SELECT o.*, u.id AS customer_id, u.name AS customer_name, u.email AS customer_email,
                  COALESCE((SELECT SUM(quantity) FROM order_items WHERE order_id = o.id), 0) AS item_count
                  FROM orders o JOIN users u ON u.id = o.user_id"""


def map_order(row, admin=False):
    result = {
        field: row[field]
        for field in (
            "id",
            "status",
            "status_updated_at",
            "payment_method",
            "delivery_address",
            "subtotal",
            "total_amount",
            "item_count",
            "created_at",
            "updated_at",
        )
    }
    if admin:
        result["customer"] = {
            "id": row["customer_id"],
            "name": row["customer_name"],
            "email": row["customer_email"],
        }
    return result


def get_order(order_id, user_id=None, admin=False):
    where, values = " WHERE o.id = %s", [order_id]
    if user_id is not None:
        where += " AND o.user_id = %s"
        values.append(user_id)
    row = one(ORDER_SELECT + where, values)
    if not row:
        missing("order")
    result = map_order(row, admin)
    result["items"] = rows(
        """SELECT id, product_id, product_name, sku, unit_price, quantity, line_total, created_at
                             FROM order_items WHERE order_id = %s ORDER BY created_at ASC, id ASC""",
        (order_id,),
    )
    return result


def checkout_items(user_id, data):
    if "productId" in data:
        product = one("SELECT * FROM products WHERE id = %s FOR UPDATE", (data["productId"],))
        if not product:
            missing("product")
        if not product["is_active"]:
            raise ApiError(409, "PRODUCT_INACTIVE", "This product is no longer available.")
        if product["stock_quantity"] < data["quantity"]:
            raise ApiError(
                409,
                "INSUFFICIENT_STOCK",
                "The selected quantity is no longer available. Review the latest stock before trying again.",
            )
        if product["price"] != data["expectedUnitPrice"]:
            raise ApiError(
                409,
                "PRICE_CHANGED",
                "The price changed. Review the updated total before placing your order.",
            )
        return [
            {
                "product": product,
                "quantity": data["quantity"],
                "unit_price": product["price"],
                "line_total": product["price"] * data["quantity"],
                "availability": "available",
            }
        ]

    # Deterministic product lock order prevents cross-cart deadlocks.
    rows(
        """SELECT p.id FROM products p JOIN cart_items ci ON ci.product_id = p.id
            WHERE ci.user_id = %s ORDER BY p.id FOR UPDATE OF p""",
        (user_id,),
    )
    cart = get_cart(user_id)
    if not cart["items"]:
        raise ApiError(409, "EMPTY_CART", "Your cart is empty. Add an item before checking out.")
    if cart["revision"] != data["cartRevision"]:
        raise ApiError(
            409,
            "CART_CHANGED",
            "Your cart changed. Review the latest prices and availability before trying again.",
            {"cart": cart},
        )
    return cart["items"]


def place_order(user_id, key, data):
    request_fingerprint = fingerprint(data)
    with get_db().transaction():
        lock_customer(user_id)
        existing = one(
            "SELECT id, request_fingerprint FROM orders WHERE user_id = %s AND idempotency_key = %s",
            (user_id, key),
        )
        if existing:
            if existing["request_fingerprint"] != request_fingerprint:
                raise ApiError(
                    409,
                    "IDEMPOTENCY_CONFLICT",
                    "This checkout key was already used for different order details.",
                )
            return get_order(existing["id"], user_id), True
        items = checkout_items(user_id, data)
        for item in items:
            if item["availability"] == "inactive":
                raise ApiError(
                    409,
                    "PRODUCT_INACTIVE",
                    f"{item['product']['name']} is no longer available.",
                    {"productId": item["product"]["id"]},
                )
            if item["availability"] != "available":
                raise ApiError(
                    409,
                    "INSUFFICIENT_STOCK",
                    f"There is not enough stock to complete {item['product']['name']}.",
                    {"productId": item["product"]["id"]},
                )
        order_id = uuid4()
        subtotal = sum((item["unit_price"] * item["quantity"] for item in items), Decimal(0))
        execute(
            """INSERT INTO orders (id, user_id, idempotency_key, request_fingerprint,
                    subtotal, total_amount, payment_method, delivery_address)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                order_id,
                user_id,
                key,
                request_fingerprint,
                subtotal,
                subtotal,
                data["paymentMethod"],
                Jsonb(data["deliveryAddress"]),
            ),
        )
        for item in items:
            product = item["product"]
            updated = execute(
                """UPDATE products SET stock_quantity = stock_quantity - %s,
                                 updated_at = CURRENT_TIMESTAMP WHERE id = %s AND is_active = TRUE
                                 AND stock_quantity >= %s AND price = %s""",
                (item["quantity"], product["id"], item["quantity"], item["unit_price"]),
            )
            if not updated.rowcount:
                raise ApiError(
                    409,
                    "CART_CHANGED",
                    "A product changed during checkout. Review your cart and try again.",
                )
            execute(
                """INSERT INTO order_items (id, order_id, product_id, product_name, sku,
                        unit_price, quantity, line_total) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    uuid4(),
                    order_id,
                    product["id"],
                    product["name"],
                    product["sku"],
                    item["unit_price"],
                    item["quantity"],
                    item["line_total"],
                ),
            )
        if "productId" not in data:
            execute("DELETE FROM cart_items WHERE user_id = %s", (user_id,))
        return get_order(order_id, user_id), False


@bp.post("/orders")
@protected("customer")
def checkout():
    key = v.identifier(request.headers.get("Idempotency-Key"), "idempotencyKey")
    data = v.checkout_input()
    order, replayed = place_order(g.user["id"], key, data)
    return jsonify(data={"order": order, "idempotent_replay": replayed}), 200 if replayed else 201


@bp.post("/orders/buy-now")
@protected("customer")
def buy_now():
    key = v.identifier(request.headers.get("Idempotency-Key"), "idempotencyKey")
    data = v.checkout_input(direct=True)
    order, replayed = place_order(g.user["id"], key, data)
    return jsonify(data={"order": order, "idempotent_replay": replayed}), 200 if replayed else 201


def list_orders(admin=False):
    args = request.args
    page, limit = v.pagination(args, 20 if admin else 10, 100 if admin else 48)
    conditions, values = [], []
    if admin:
        search = v.string(args.get("search", ""), "search", 0, 100)
        customer = v.string(args.get("customer", ""), "customer", 0, 100)
        status = v.choice(args.get("status", "all"), "status", ["all", *TRANSITIONS])
        start = v.calendar_date(args["dateFrom"], "dateFrom") if "dateFrom" in args else None
        end = v.calendar_date(args["dateTo"], "dateTo") if "dateTo" in args else None
        if start and end and start > end:
            invalid("dateFrom", "The start date cannot be after the end date.")
        if search:
            conditions.append("CAST(o.id AS TEXT) ILIKE %s")
            values.append(f"%{search}%")
        if customer:
            conditions.append("(u.name ILIKE %s OR u.email ILIKE %s)")
            values += [f"%{customer}%"] * 2
        if status != "all":
            conditions.append("o.status = %s")
            values.append(status)
        if start:
            conditions.append("o.created_at >= %s")
            values.append(datetime.combine(start, time.min, timezone.utc))
        if end:
            conditions.append("o.created_at < %s")
            # PostgreSQL supports the day after 9999-12-31; Python datetime does not.
            if end.year == 9999 and end.month == 12 and end.day == 31:
                values.append("10000-01-01 00:00:00+00")
            else:
                values.append(datetime.combine(end + timedelta(days=1), time.min, timezone.utc))
    else:
        conditions.append("o.user_id = %s")
        values.append(g.user["id"])
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    total = one(
        "SELECT COUNT(*) AS total FROM orders o JOIN users u ON u.id = o.user_id" + where, values
    )["total"]
    records = rows(
        ORDER_SELECT + where + " ORDER BY o.created_at DESC, o.id DESC LIMIT %s OFFSET %s",
        [*values, limit, (page - 1) * limit],
    )
    return jsonify(
        data=[map_order(row, admin) for row in records], pagination=page_info(page, limit, total)
    )


@bp.get("/orders")
@protected("customer")
def customer_orders():
    return list_orders()


@bp.get("/orders/<order_id>")
@protected("customer")
def customer_order(order_id):
    return jsonify(data=get_order(v.identifier(order_id), g.user["id"]))


@bp.get("/admin/orders")
@protected("admin")
def admin_orders():
    return list_orders(True)


@bp.get("/admin/orders/<order_id>")
@protected("admin")
def admin_order(order_id):
    return jsonify(data=get_order(v.identifier(order_id), admin=True))


@bp.put("/admin/orders/<order_id>/status")
@protected("admin")
def update_status(order_id):
    order_id = v.identifier(order_id)
    status = v.choice(v.body({"status"}).get("status"), "status", TRANSITIONS)
    with get_db().transaction():
        order = one("SELECT status FROM orders WHERE id = %s FOR UPDATE", (order_id,))
        if not order:
            missing("order")
        allowed = TRANSITIONS[order["status"]]
        if status not in allowed:
            raise ApiError(
                409,
                "INVALID_STATUS_TRANSITION",
                f"An order cannot move from {order['status']} to {status}.",
                {
                    "currentStatus": order["status"],
                    "requestedStatus": status,
                    "allowedStatuses": allowed,
                },
            )
        if status == "cancelled":
            items = rows(
                "SELECT product_id, quantity FROM order_items WHERE order_id = %s ORDER BY product_id",
                (order_id,),
            )
            for item in items:
                execute(
                    "UPDATE products SET stock_quantity = stock_quantity + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (item["quantity"], item["product_id"]),
                )
        execute(
            "UPDATE orders SET status = %s, status_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (status, order_id),
        )
        return jsonify(data=get_order(order_id, admin=True))
