# Floréa Haven

Floréa Haven is a full-stack storefront for seeds, flowers, and botanical perfumes. The current implementation covers the project foundation, public catalog, and authentication described in Phases 1–3 of the implementation plan.

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

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL using `docker compose up -d postgres`, or provide another PostgreSQL database.
3. Run `npm run db:migrate`.
4. Run `npm run db:seed`.
5. Run `npm run dev`.

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
```

Product-list query parameters include `search`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, and `limit`.

## Project Structure

```text
client/              React and Tailwind CSS storefront
server/              Express REST API
  migrations/        Ordered PostgreSQL schema changes
  seeds/             Repeatable development catalog data
architecture.md      System architecture
implementation-plan.md
```

## Current Scope

Carts, checkout, orders, and catalog/order administration tools are intentionally deferred to their later implementation phases. The `/admin` route is role-protected now and provides a safe placeholder for those future tools.
