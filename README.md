# Floréa Haven

Floréa Haven is a full-stack storefront for seeds, flowers, and botanical perfumes. The current implementation covers the project foundation, public catalog, authentication, persistent shopping cart, checkout, customer orders, and administrator catalog management described in Phases 1–6 of the implementation plan.

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- PostgreSQL 16+ for persistent local data (optional during initial UI development)

## Quick Start

```bash
npm install
npm run dev
```

The storefront opens at `http://localhost:5173` and the API runs at `http://localhost:4000`. When `DATABASE_URL` is not configured, the API uses an in-memory PostgreSQL-compatible development database and loads the catalog seed automatically. Data and development sessions reset when the server restarts.

## Persistent PostgreSQL Setup

On Windows, Docker Desktop uses WSL 2. If WSL is not installed, open PowerShell as Administrator, run `wsl --install`, restart Windows, then start Docker Desktop and accept its agreement once.

1. Copy `.env.example` to `.env`.
2. Run `npm run db:setup` to start PostgreSQL, wait for it to become healthy, apply migrations, and load the sample catalog.
3. Run `npm run dev`.

The Docker database is published on `localhost:5433` by default so it can coexist with a native PostgreSQL installation on the standard port `5432`. To use a different host port, update both `POSTGRES_HOST_PORT` and the port in `DATABASE_URL` in your uncommitted `.env` file.

Open `http://localhost:5173` for the storefront preview. The Vite development server proxies `/api` requests to the API at `http://localhost:4000`.

Do not commit `.env` or production credentials.

Set a long, random `JWT_SECRET` in every persistent or hosted environment. Authentication uses a signed JWT stored in an HTTP-only, same-site cookie. The API remains responsible for checking the current database user and role on protected requests.

## Initial Administrator

Run migrations first, then set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in your uncommitted `.env` file and run:

```bash
npm run admin:create
```

The command safely creates an administrator or promotes and refreshes the credentials of the account with that email. It requires a persistent `DATABASE_URL`; it will not create a temporary in-memory administrator.

## Commands

| Command                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Run the client and API together            |
| `npm run build`        | Create the production client build         |
| `npm test`             | Run client and API tests                   |
| `npm run lint`         | Lint both workspaces                       |
| `npm run db:up`        | Start and health-check Docker PostgreSQL   |
| `npm run db:down`      | Stop Docker PostgreSQL                     |
| `npm run db:setup`     | Start, migrate, and seed Docker PostgreSQL |
| `npm run db:migrate`   | Apply pending PostgreSQL migrations        |
| `npm run db:seed`      | Add or refresh sample catalog data         |
| `npm run admin:create` | Create or update the initial administrator |

## Implemented API

```text
GET /api/health
GET /api/categories
GET /api/products
GET /api/products/:id
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
GET /api/cart
POST /api/cart/items
PUT /api/cart/items/:id
DELETE /api/cart/items/:id
POST /api/orders
GET /api/orders
GET /api/orders/:id
GET /api/admin/categories
GET /api/admin/products
POST /api/categories
PUT /api/categories/:id
DELETE /api/categories/:id
POST /api/products
PUT /api/products/:id
DELETE /api/products/:id
```

Product-list query parameters include `search`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, and `limit`.

Checkout uses Cash on Delivery. `POST /api/orders` requires a UUID `Idempotency-Key` header and the current server-provided cart revision; see the [MVP API contract](./docs/api-contract.md) for the complete request and validation rules.

## Project Structure

```text
client/              React and Tailwind CSS storefront
server/              Express REST API
  migrations/        Ordered PostgreSQL schema changes
  seeds/             Repeatable development catalog data
architecture.md      System architecture
implementation-plan.md
```

## Project Decisions and Contracts

- [MVP and technical baseline](./docs/decisions/0001-mvp-technical-baseline.md)
- [MVP API contract](./docs/api-contract.md)
- [Feature definition of done](./docs/definition-of-done.md)

The baseline fixes the MVP to Cash on Delivery, signed-in persistent carts, three launch categories, PHP pricing, URL-based product images, HTTP-only cookie sessions, and a one-way order-status workflow.

## Current Scope

Administrators can manage categories, products, visibility, featured placement, prices, images, and inventory from the role-protected `/admin` workspace. Administrator order fulfillment remains deferred to Phase 7.
