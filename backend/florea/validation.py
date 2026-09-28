"""Validation keeps the existing camelCase inputs and error envelope."""

import re
from datetime import date
from decimal import Decimal, InvalidOperation
from uuid import UUID

from flask import request

from .errors import invalid


def body(allowed=None):
    value = request.get_json()
    if not isinstance(value, dict):
        invalid("", "A JSON object is required.")
    if allowed is not None and set(value) - set(allowed):
        invalid("", "Unknown fields are not allowed.")
    return value


def string(value, field, minimum=0, maximum=100, pattern=None, trim=True):
    if not isinstance(value, str):
        invalid(field, "A string is required.")
    value = value.strip() if trim else value
    if not minimum <= len(value) <= maximum:
        invalid(field, f"Must contain {minimum} to {maximum} characters.")
    if pattern and not re.fullmatch(pattern, value):
        invalid(field)
    return value


def identifier(value, field="id"):
    if not isinstance(value, str) or not re.fullmatch(
        r"[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}", value
    ):
        invalid(field, "Must be a valid UUID.")
    return str(UUID(value))


def number(value, field, minimum=0, maximum=None, integer=False, money=False):
    if isinstance(value, bool) or value is None or isinstance(value, (list, dict)):
        invalid(field, "A number is required.")
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError):
        invalid(field, "A number is required.")
    if not result.is_finite() or result < minimum or (maximum is not None and result > maximum):
        invalid(field, "Number is outside the allowed range.")
    if integer and result != result.to_integral_value():
        invalid(field, "A whole number is required.")
    if money and result != result.quantize(Decimal("0.01")):
        invalid(field, "Price cannot contain more than two decimal places.")
    return int(result) if integer else result


def choice(value, field, choices):
    if not isinstance(value, str) or value not in choices:
        invalid(field, f"Must be one of: {', '.join(choices)}.")
    return value


def boolean(value, field):
    if not isinstance(value, bool):
        invalid(field, "A boolean is required.")
    return value


def pagination(args, default=9, maximum=48):
    return (
        number(args.get("page", 1), "page", 1, integer=True),
        number(args.get("limit", default), "limit", 1, maximum, integer=True),
    )


def calendar_date(value, field):
    string(value, field, 10, 10, r"\d{4}-\d{2}-\d{2}")
    try:
        return date.fromisoformat(value)
    except ValueError:
        invalid(field, "Enter a valid calendar date.")


def credentials(register=False):
    data = body()
    result = {
        "email": string(data.get("email"), "email", 3, 254, r"[^\s@]+@[^\s@]+\.[^\s@]+").lower(),
        "password": string(data.get("password"), "password", 8 if register else 1, 72, trim=False),
    }
    if register:
        result["name"] = string(data.get("name"), "name", 2, 80)
        if not re.search(r"[A-Za-z]", result["password"]) or not re.search(
            r"[0-9]", result["password"]
        ):
            invalid("password", "Password must contain at least one letter and one number.")
    return result


PRODUCT_FIELDS = {
    "categoryId",
    "name",
    "slug",
    "sku",
    "description",
    "price",
    "stockQuantity",
    "featured",
}
CATEGORY_FIELDS = {"name", "slug", "description"}


def catalog_input(product=False, update=False):
    allowed = PRODUCT_FIELDS | ({"isActive"} if update else set()) if product else CATEGORY_FIELDS
    data = body(allowed)
    if not update:
        data = {"featured": False, **data} if product else {"description": "", **data}
        required = PRODUCT_FIELDS - {"slug"} if product else {"name", "description"}
        for key in required - data.keys():
            invalid(key, "This field is required.")
    result = {}
    for field, value in data.items():
        if field == "slug":
            if value == "":
                continue
            result[field] = string(value, field, 2, 60, r"[a-z0-9]+(?:-[a-z0-9]+)*")
        elif field == "name":
            result[field] = string(value, field, 2, 120 if product else 80)
        elif field == "description":
            result[field] = string(value, field, 1 if product else 0, 5000 if product else 1000)
        elif field == "categoryId":
            result[field] = identifier(value, field)
        elif field == "sku":
            result[field] = string(value, field, 2, 50, r"[A-Za-z0-9][A-Za-z0-9._-]*").upper()
        elif field == "price":
            result[field] = number(value, field, 0, Decimal("9999999.99"), money=True)
        elif field == "stockQuantity":
            result[field] = number(value, field, 0, 2147483647, integer=True)
        elif field in {"featured", "isActive"}:
            result[field] = boolean(value, field)
    if update and not result:
        invalid("", "Provide at least one field to update.")
    return result


def checkout_input():
    data = body({"cartRevision", "paymentMethod", "deliveryAddress"})
    revision = string(data.get("cartRevision"), "cartRevision", 64, 64, r"[a-f0-9]{64}")
    payment = choice(data.get("paymentMethod"), "paymentMethod", ["cash_on_delivery"])
    address = data.get("deliveryAddress")
    bounds = {
        "recipientName": (2, 80),
        "phone": (7, 30),
        "addressLine1": (5, 160),
        "addressLine2": (0, 160),
        "city": (2, 80),
        "province": (2, 80),
        "postalCode": (3, 12),
    }
    if not isinstance(address, dict) or set(address) - (bounds.keys() | {"country"}):
        invalid("deliveryAddress", "A valid delivery address is required.")
    normalized = {}
    for field, (minimum, maximum) in bounds.items():
        value = address.get(field, "" if field == "addressLine2" else None)
        normalized[field] = string(
            value,
            f"deliveryAddress.{field}",
            minimum,
            maximum,
            r"[A-Za-z0-9 -]+" if field == "postalCode" else None,
        )
    normalized["country"] = choice(
        address.get("country"), "deliveryAddress.country", ["Philippines"]
    )
    # Field order intentionally matches the old Zod schema for fingerprint compatibility.
    return {"cartRevision": revision, "paymentMethod": payment, "deliveryAddress": normalized}
