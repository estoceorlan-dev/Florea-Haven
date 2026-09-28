# ADR 0002: Python Flask backend

- Status: Accepted and implemented
- Date: 2026-09-28
- Supersedes: ADR 0001's Express runtime, JavaScript database adapter, in-memory fallback, and deployment assumptions

## Reason

The course requires Python in the application. React already communicates with the backend through a documented JSON API, so migrating the API preserves the existing storefront, administrator interface, and UI/UX improvements.

## Decision

- Python Flask owns authentication, validation, catalog, cart, checkout, inventory, and order administration.
- React, Tailwind, React Query, and React Router remain the frontend.
- Psycopg executes parameterized SQL against PostgreSQL. No ORM or second backend is introduced.
- The original five SQL migrations and catalog seed move to `backend/`. Migration filenames and the `schema_migrations` ledger remain unchanged, allowing existing databases to continue without data conversion.
- PostgreSQL is required in development and tests. Tests create and remove their own random schema; they never truncate application tables.
- The API retains endpoint paths, success/error envelopes, numeric money values, UTC timestamps, cookie name, HS256 signing, and bcrypt password compatibility.
- `Decimal` is used for internal money calculations. Cart hashes and order fingerprints preserve the original JavaScript serialization for the supported inputs.
- A user's cart mutations and checkout acquire the same user-row lock. Checkout locks product rows in UUID order and commits order creation, stock reduction, snapshots, and cart clearing together.
- Cancellation locks the order, validates its transition, and restores stock in the same transaction. Repeated or concurrent cancellations cannot restore stock twice.
- Vite proxies `/api` to Flask on port 4000 during development. Flask can serve the built React app and its deep links in production, alongside `/api`, through Waitress.
- Production requires `APP_ENV=production`, a stable `JWT_SECRET`, the public HTTPS `CLIENT_ORIGIN`, and persistent PostgreSQL. Use a TLS-terminating host/reverse proxy. `DATABASE_SSL=true` enables certificate and hostname verification; supply the provider's trusted root when needed.
- The default rate-limit store is in-process memory, matching the previous single-process API. Deploy one Waitress process initially. Multiple instances require shared limiter storage and its corresponding Python dependency.

## Migration boundaries

This changes the backend implementation and local tooling, not the course project's feature scope. Image uploads and other unfinished roadmap features remain future work. Node/npm are still development tools for React; the running production application and all business logic use Python.

The Express source is retired after the Python replacement passes verification; it remains available in Git history. Existing frontend edits are preserved.

## Verification

The Python suite covers catalog filtering and administration, sessions and permissions, cart ownership, checkout snapshots, stale carts, idempotency, status transitions, and stock restoration. Real PostgreSQL concurrency and injected-failure tests verify last-item purchases, duplicate checkout, concurrent cancellation, and rollback of partial writes.

Compatibility fixtures in `backend/tests/fixtures/express-compatibility.json` were generated using the previous backend's bcryptjs, jose, and JSON.stringify implementations. They verify existing hashes, tokens, cart revisions, and replay of pre-migration orders.

Existing Vitest frontend tests remain in place. Manual browser verification and hosted deployment are separate from automated API and frontend checks.

## References

- [Flask application factories](https://flask.palletsprojects.com/en/stable/patterns/appfactories/)
- [Flask single-page applications](https://flask.palletsprojects.com/en/stable/patterns/singlepageapplications/)
- [Flask deployment with Waitress](https://flask.palletsprojects.com/en/stable/deploying/waitress/)
- [Psycopg transaction management](https://www.psycopg.org/psycopg3/docs/basic/transactions.html)
