# ADR 0001: MVP and Technical Baseline

- Status: Accepted
- Date: 2026-08-30
- Applies to: MVP (Phases 0–9)

## Context

Floréa Haven needs a stable product scope and technical baseline before checkout, order administration, and deployment are implemented. Phases 1–4 already established working conventions; this record confirms those conventions and resolves the remaining choices that would affect later database schemas or APIs.

## Decisions

### 1. MVP scope

The MVP includes:

- A public catalog with search, category, price, sorting, and pagination controls.
- Customer registration, sign-in, sign-out, and session restoration.
- A persistent cart for signed-in customers.
- Cash on Delivery checkout, inventory reduction, order confirmation, and customer order history.
- Administrator management of categories, products, inventory, and order status.
- A responsive, accessible React interface backed by an Express API and PostgreSQL.

The MVP does not include real payment processing, guest carts, customer account administration, reviews, wish lists, promotions, image uploads, notifications, delivery-provider integrations, analytics, or multi-currency support. Administrators may see the customer information required to fulfill an order, but a separate customer-management interface is deferred.

### 2. Catalog, money, and images

- The launch catalog contains the required category slugs `seeds`, `flowers`, and `perfumes`. Adding more categories is supported by the data model but is not an MVP acceptance requirement.
- All prices are Philippine pesos (PHP) with two decimal places.
- The server is authoritative for product prices and totals. The MVP has no tax, discount, or shipping-fee calculation, so an order total equals its item subtotal.
- Product images are administrator-provided absolute HTTP(S) URLs. The client displays a safe local placeholder when a URL is empty or fails to load. File upload and media storage are deferred.

### 3. Checkout and payment

- Checkout requires an authenticated customer and a non-empty, valid server-backed cart.
- The only MVP payment method is `cash_on_delivery`; no card or bank details are collected or stored.
- A successful checkout creates an order with status `pending`.
- Checkout runs in one database transaction, locks/rechecks inventory, snapshots purchased data, decrements stock, and clears the cart. A failure rolls back every change.
- `POST /api/orders` requires an `Idempotency-Key` header so retrying the same submission returns the original result rather than creating another order.
- Cart responses include a server-derived revision covering quantities, current prices, stock, and availability. Checkout rejects a stale revision before creating an order, while conditional inventory updates remain the final concurrency guard.
- Delivery data is validated by the API and stored as an immutable JSONB address snapshot on the order.
- Each order stores a UUID idempotency key with a unique constraint on `(user_id, idempotency_key)`, `payment_method = 'cash_on_delivery'`, and server-calculated `subtotal` and `total_amount` values.

### 4. Order history and status workflow

Each order item stores `product_name`, `sku`, `unit_price`, and `quantity` snapshots. It also retains a product reference protected from hard deletion. Current product edits therefore cannot change historical orders.

Orders follow this one-way workflow:

| Current status | Allowed next status      |
| -------------- | ------------------------ |
| `pending`      | `confirmed`, `cancelled` |
| `confirmed`    | `preparing`, `cancelled` |
| `preparing`    | `shipped`                |
| `shipped`      | `delivered`              |
| `delivered`    | None; terminal           |
| `cancelled`    | None; terminal           |

Only administrators change order status in the MVP. Statuses cannot be skipped or moved backward. Customer self-cancellation is deferred. When an administrator moves an order to `cancelled`, the status update and restoration of its item quantities happen in one transaction and can occur only once.

The order records `created_at`, `updated_at`, and `status_updated_at`. A separate status-history table and the administrator actor audit trail are deferred.

### 5. Cart ownership

Guest carts are not part of the MVP. Visitors may browse the catalog, but they are directed to sign in before adding an item. Every cart API operation derives ownership from the authenticated user; a client-supplied user ID is never accepted.

### 6. PostgreSQL and migrations

- The backend uses `pg` with raw, parameterized SQL. No ORM is used.
- Schema changes are forward-only, ordered `.sql` files in `server/migrations/` and are applied by the repository migration script.
- PostgreSQL is the persistent production data store. `pg-mem` is permitted only as the reproducible local/test fallback.
- Database constraints enforce durable invariants such as valid roles, non-negative inventory, positive quantities, and valid order statuses. Business rules are also checked by the API for useful errors.

### 7. Authentication and CSRF protection

- The browser session is a signed HS256 JWT in the `florea_session` cookie.
- The cookie is HTTP-only, `SameSite=Lax`, scoped to `/`, and `Secure` in production. Its lifetime is configured by `SESSION_DAYS` from 1 to 30 days.
- The browser never stores the JWT in JavaScript-accessible storage. Bearer-token support remains available for non-browser API and test clients.
- Production uses one public site and same-origin `/api` routing. CORS allows only `CLIENT_ORIGIN` with credentials.
- State-changing cookie-authenticated requests must use origin verification. SameSite cookies provide the first CSRF boundary, and requests carrying a different `Origin` are rejected with `403 ORIGIN_NOT_ALLOWED`.
- Authorization is enforced by the API on every protected resource; client route guards are only a user-interface aid.

### 8. API conventions

- Successful JSON responses use a `data` envelope. Collection metadata such as `pagination` and normalized `filters` may be adjacent top-level fields.
- Errors use `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
- Validation failures use `400 VALIDATION_ERROR` with field-level details. Authentication, authorization, missing-resource, conflict, rate-limit, and unexpected errors use the status conventions in the API contract.
- Resource fields in responses use `snake_case`, matching the current API. Client-authored JSON fields use `camelCase`.
- UUIDs identify persisted resources, timestamps are ISO 8601 strings, and the API never accepts client-calculated prices, totals, roles, ownership IDs, or order statuses where they are server-controlled.

### 9. Runtime and deployment baseline

- Supported local runtime: Node.js 22 or newer and npm 10 or newer. The repository pins Node 22 through `.nvmrc` and declares npm metadata in the root package.
- The production target is one Vercel-hosted site containing the Vite client and Express API under `/api`, connected to managed PostgreSQL over TLS.
- Production secrets and environment-specific URLs live only in hosting configuration. They are never committed.

## Consequences

- Phase 5 can define its schema and transaction behavior without waiting for payment, status, history, currency, or address decisions.
- Same-origin deployment avoids cross-site session-cookie complexity.
- COD, URL-based images, signed-in carts, and forward-only statuses keep the first release small.
- Real payments, guest-cart merging, customer self-service cancellation, post-preparation cancellation, and administrator audit trails require later decision records because they expand business and security requirements.
