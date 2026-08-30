# MVP API Contract

This document is the baseline contract for Floréa Haven. Routes marked **implemented** exist in Phases 1–5; routes marked **planned** are reserved for later MVP phases.

## General conventions

- Base path: `/api`
- Request and response content type: `application/json`, except requests without a body.
- Persisted IDs: UUID strings.
- Timestamps: ISO 8601 strings in UTC.
- Money: PHP values with two decimal places; totals are calculated by the server.
- Response resource fields: `snake_case`.
- Client-authored JSON fields: `camelCase`.
- Unknown routes return `404 NOT_FOUND`.

### Success envelopes

Single resource:

```json
{
  "data": {
    "id": "2c7bc774-f813-4b7a-a874-972d56c113e3"
  }
}
```

Collection:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 9,
    "total": 0,
    "totalPages": 1,
    "hasPreviousPage": false,
    "hasNextPage": false
  }
}
```

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid values.",
    "details": [
      {
        "field": "email",
        "message": "Enter a valid email address."
      }
    ]
  }
}
```

| HTTP status | Meaning                            | Typical codes                                                                                                                                                              |
| ----------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `400`       | Invalid input                      | `VALIDATION_ERROR`                                                                                                                                                         |
| `401`       | Missing or invalid session         | `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`                                                                                                                           |
| `403`       | Authenticated but not allowed      | `ADMIN_ACCESS_REQUIRED`, `CUSTOMER_ACCESS_REQUIRED`, `ORIGIN_NOT_ALLOWED`                                                                                                  |
| `404`       | Resource or route is unavailable   | `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `CART_ITEM_NOT_FOUND`, `ORDER_NOT_FOUND`                                                                                                 |
| `409`       | Current state prevents the request | `EMAIL_ALREADY_REGISTERED`, `EMPTY_CART`, `CART_CHANGED`, `PRODUCT_INACTIVE`, `INSUFFICIENT_STOCK`, `CATEGORY_IN_USE`, `INVALID_STATUS_TRANSITION`, `IDEMPOTENCY_CONFLICT` |
| `429`       | Rate limit reached                 | `RATE_LIMITED`                                                                                                                                                             |
| `500`       | Unexpected server failure          | `INTERNAL_SERVER_ERROR`                                                                                                                                                    |

Production `500` responses never include stack traces or database messages.

## Authentication and request security

The browser authenticates with the HTTP-only `florea_session` cookie and sends requests with credentials enabled. A Bearer JWT is accepted for non-browser API clients. Protected endpoints return `401` when the token is absent, expired, malformed, or refers to a missing user.

Every state-changing browser endpoint performs request-origin validation. In production, the client and `/api` share one public origin. Clients must not send `userId`, `role`, prices, totals, or resource ownership fields as authority.

## Endpoint summary

| Method and path                    | Access                        | Status      |
| ---------------------------------- | ----------------------------- | ----------- |
| `GET /api/health`                  | Public                        | Implemented |
| `GET /api/categories`              | Public                        | Implemented |
| `GET /api/products`                | Public                        | Implemented |
| `GET /api/products/:id`            | Public                        | Implemented |
| `POST /api/auth/register`          | Public                        | Implemented |
| `POST /api/auth/login`             | Public                        | Implemented |
| `POST /api/auth/logout`            | Public/session                | Implemented |
| `GET /api/auth/me`                 | Customer or admin             | Implemented |
| `GET /api/cart`                    | Customer or admin             | Implemented |
| `POST /api/cart/items`             | Customer or admin             | Implemented |
| `PUT /api/cart/items/:id`          | Customer or admin; owner only | Implemented |
| `DELETE /api/cart/items/:id`       | Customer or admin; owner only | Implemented |
| `POST /api/orders`                 | Customer; own cart            | Implemented |
| `GET /api/orders`                  | Customer; own orders          | Implemented |
| `GET /api/orders/:id`              | Customer; owner only          | Implemented |
| `POST /api/categories`             | Admin                         | Planned     |
| `PUT /api/categories/:id`          | Admin                         | Planned     |
| `DELETE /api/categories/:id`       | Admin                         | Planned     |
| `POST /api/products`               | Admin                         | Planned     |
| `PUT /api/products/:id`            | Admin                         | Planned     |
| `DELETE /api/products/:id`         | Admin                         | Planned     |
| `GET /api/admin/orders`            | Admin                         | Planned     |
| `GET /api/admin/orders/:id`        | Admin                         | Planned     |
| `PUT /api/admin/orders/:id/status` | Admin                         | Planned     |

`DELETE /api/products/:id` safely deactivates a product; it does not erase order history. `DELETE /api/categories/:id` succeeds only when no product references the category and otherwise returns `409 CATEGORY_IN_USE`.

## Implemented request rules

### Catalog

`GET /api/products` accepts:

| Query                  | Rule                                                           |
| ---------------------- | -------------------------------------------------------------- |
| `search`               | Trimmed string, maximum 100 characters; default empty          |
| `category`             | Category slug, maximum 60 characters                           |
| `minPrice`, `maxPrice` | Numbers at least zero; minimum cannot exceed maximum           |
| `sort`                 | `featured`, `newest`, `price-asc`, `price-desc`, or `name-asc` |
| `page`                 | Integer at least 1; default 1                                  |
| `limit`                | Integer from 1 through 48; default 9                           |
| `featured`             | `true` or `false`                                              |

`GET /api/products/:id` requires a UUID and returns only active products. Product output includes the current server price, stock, image URL, category, and catalog timestamps.

`GET /api/categories` has no input and returns each category with its active `product_count`.

### Authentication

`POST /api/auth/register`:

```json
{
  "name": "Ana Reyes",
  "email": "ana@example.com",
  "password": "flowers123"
}
```

- `name`: trimmed, 2–80 characters.
- `email`: trimmed, lowercased, valid email, maximum 254 characters, unique case-insensitively.
- `password`: 8–72 characters with at least one letter and one number.
- Success: `201` with the public user and a new session cookie.

`POST /api/auth/login` accepts a normalized email and a non-empty password up to 72 characters. Failure is always the generic `401 INVALID_CREDENTIALS`. `POST /api/auth/logout` clears the cookie. `GET /api/auth/me` returns the current public user and never returns a hash or token.

Registration and login are limited to 20 attempts per 15-minute window per rate-limit key.

### Cart

`POST /api/cart/items`:

```json
{
  "productId": "2c7bc774-f813-4b7a-a874-972d56c113e3",
  "quantity": 1
}
```

`PUT /api/cart/items/:id`:

```json
{
  "quantity": 2
}
```

- Product and item IDs must be UUIDs.
- Quantity is an integer from 1 through 99.
- Adding an existing product increments its quantity.
- The resulting quantity may not exceed current stock.
- Inactive products cannot be added or increased.
- Item routes always scope database operations to the authenticated user.
- Each successful mutation returns the refreshed server-calculated cart.
- Every cart response includes a SHA-256 `revision` derived from item identity, quantity, current price, stock, and active state. Checkout uses it to detect changes made after the customer reviewed the cart.

## Checkout and order rules

`POST /api/orders` requires an `Idempotency-Key` header containing a UUID and this body:

```json
{
  "cartRevision": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "paymentMethod": "cash_on_delivery",
  "deliveryAddress": {
    "recipientName": "Ana Reyes",
    "phone": "+63 917 123 4567",
    "addressLine1": "12 Sampaguita Street",
    "addressLine2": "Barangay Maligaya",
    "city": "Quezon City",
    "province": "Metro Manila",
    "postalCode": "1100",
    "country": "Philippines"
  }
}
```

- `cartRevision`: the 64-character lowercase hexadecimal revision from the latest cart response.
- `paymentMethod`: exactly `cash_on_delivery`.
- `recipientName`: trimmed, 2–80 characters.
- `phone`: trimmed, 7–30 characters.
- `addressLine1`: trimmed, 5–160 characters.
- `addressLine2`: optional, trimmed, maximum 160 characters.
- `city` and `province`: trimmed, 2–80 characters each.
- `postalCode`: trimmed, 3–12 letters, numbers, spaces, or hyphens.
- `country`: exactly `Philippines` for the MVP.

The API rejects an empty cart, stale cart revision, inactive product, changed/insufficient stock, or invalid address without partially creating an order. A successful response is `201`, clears the cart, and returns the order with address and item snapshots. Reusing an idempotency key with the same request returns the original order with `200` and `idempotent_replay: true`; reusing it for different input returns `409 IDEMPOTENCY_CONFLICT`.

`GET /api/orders` supports `page` and `limit` using the catalog pagination bounds. `GET /api/orders/:id` returns `404 ORDER_NOT_FOUND` both for a missing order and for an order owned by another customer, avoiding ownership disclosure.

## Planned administration rules

- Category names and slugs are trimmed and unique case-insensitively. Deleting a category referenced by any product returns `409 CATEGORY_IN_USE`.
- Product names are 2–120 characters; descriptions are 1–5,000 characters; prices are PHP values from 0 through 9,999,999.99; stock is an integer at least zero; category IDs are UUIDs; and image URLs, when supplied, must be absolute HTTP(S) URLs.
- Product and category removal preserves every historical order snapshot.
- New orders begin at `pending`. The only status transitions are:
  - `pending` to `confirmed` or `cancelled`
  - `confirmed` to `preparing` or `cancelled`
  - `preparing` to `shipped`
  - `shipped` to `delivered`
- `delivered` and `cancelled` are terminal. Skips, reversals, and cancellation after preparation return `409 INVALID_STATUS_TRANSITION`.
- A valid transition to `cancelled` restores the order's item quantities exactly once in the same database transaction as the status change.
