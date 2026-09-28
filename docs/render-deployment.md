# Render production deployment

The repository is prepared for a single-origin Render Docker web service, managed PostgreSQL, and shared Redis-compatible rate limiting. `render.yaml` uses paid `0.5c-512mb` web, `256mb` Key Value, and `0.1c-256mb` PostgreSQL instances in Singapore. Review those plans in your Render account before creating the Blueprint; this work does not provision or charge for services.

## Before deployment

1. Run `npm ci`, `npm run backend:setup`, `npx playwright install chromium`, and `npm run check`. Set `TEST_DATABASE_URL` to a PostgreSQL instance where the test user may create schemas. Tests never seed or truncate application tables.
2. Connect the repository to Render and create a **Blueprint** from `render.yaml`. Keep the repository root as the build context. The multi-stage Dockerfile builds React with Node 22 and runs Flask/Waitress as an unprivileged user on Python 3.12.
3. Supply `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Render's secret fields. Use a separate Cloudinary environment for staging. No unsigned upload preset is required; uploads are signed by the server SDK. Leave unsigned uploads disabled.
4. Render generates `JWT_SECRET` and wires private database and Key Value URLs. Preserve the signing key across deploys. When migrating existing users, set the existing stable signing key before deploying if their sessions must survive.
5. Without a custom domain, the app uses Render's `RENDER_EXTERNAL_URL` as its allowed origin. For a custom domain set `CLIENT_ORIGIN=https://your-domain.example` with **no trailing slash**. Keep `VITE_API_URL` empty. Use the canonical domain for all browser traffic.

See the official [Blueprint schema](https://render.com/docs/blueprint-spec), [Docker deployments](https://render.com/docs/docker), and [health checks](https://render.com/docs/health-checks). The Blueprint's `preDeployCommand` applies migrations before the new version receives traffic; this requires a paid web service. `autoDeployTrigger: checksPass` waits for repository checks, so enable the included GitHub workflow on your deployment branch.

## Environment and network

| Variable                | Production value                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `APP_ENV`               | `production`                                                                       |
| `DATABASE_URL`          | Render private connection string from Blueprint                                    |
| `JWT_SECRET`            | Stable random value, at least 32 bytes                                             |
| `CLIENT_ORIGIN`         | Optional on default Render domain; required for your canonical custom HTTPS domain |
| `SESSION_DAYS`          | 7 by default; range 1–30                                                           |
| `PORT`                  | Supplied by Render; Waitress binds `0.0.0.0`                                       |
| `RATELIMIT_STORAGE_URI` | Private Render Key Value URL                                                       |
| `TRUST_PROXY`           | `true` only on Render/behind a trusted proxy that appends the real client address  |
| `CLOUDINARY_*`          | Three server-only provider credentials                                             |

The Blueprint restricts external database and Key Value access with empty IP allowlists. It uses Render's private network for their connections. For an external PostgreSQL endpoint, configure provider-required TLS with certificate verification (`DATABASE_SSL=true` / `PGSSLROOTCERT`, or verified SSL URL parameters). Do not enable `DATABASE_SSL=true` against an internal endpoint without confirming its certificate hostname.

The service uses one Waitress process with eight request threads. Image decoding/upload is bounded to one concurrent upload per process to protect the small instance; additional uploads receive a retryable 503. Each request opens at most one PostgreSQL connection and closes it afterward. It is a persistent service, not a serverless function. Check database connection limits before adding replicas; shared rate limits are already configured. Redis unavailability fails requests subject to rate limiting rather than silently disabling protection.

## First release

1. Deploy a staging Blueprint first using separate database, Redis, and Cloudinary resources. Confirm `/api/health` reports database `up`.
2. In Render's service Shell, set temporary `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` values, then run `python backend/manage.py create-admin`. The command does not echo credentials. Remove temporary admin values afterward. It creates or updates the account with that email, including its role and password.
3. Sign in and create real categories and products using the administrator UI. Save a product before editing it to upload its image. **Do not run `seed` in production:** it refreshes demo products and stock.
4. Run `python scripts/smoke.py https://your-service.onrender.com` from your checkout. This check is read-only.
5. Manually exercise registration, login/logout, catalog, cart, COD checkout, confirmation, history, administrator stock and order status changes, and profile/product upload, replacement, removal. Verify the Cloudinary files and thumbnails actually load. The automated browser suite stubs Cloudinary's network calls; real provider verification must happen here.
6. Check Secure/HttpOnly/SameSite cookies, HTTPS, both themes, mobile navigation, logs, and the canonical domain. Repeat the same checks on production before announcing the store. Record the deployed commit and tag it in your release process.

Order statuses follow `pending → confirmed → preparing → shipped → delivered`; only pending and confirmed orders may transition to `cancelled`. The API rejects illegal transitions and restores stock exactly once on cancellation. Payment remains Cash on Delivery; online payments, notifications, and delivery-provider tracking are deferred.

## Image operations

Only JPEG, PNG, and WebP up to 5 MB and 4096×4096 are accepted. Flask validates decoded bytes and declared type, rejects animation, removes metadata, and re-encodes to WebP (512px avatars / 1600px products). Cloudinary delivers automatic format/quality and responsive variants. File bytes never enter PostgreSQL or persistent local storage.

Every upload has a generated identifier under `florea/profile-images/` or `florea/product-images/`. A durable `image_cleanup` entry is inserted **before** the provider call, with a 24-hour grace period. Attachment removes it transactionally; replacement/removal queues the previous asset after successful database mutation. A failed delete is retried after one hour and logs only the generated public ID.

Run `python backend/manage.py cleanup-images` daily from the service Shell or a scheduled job with the same private database and Cloudinary credentials. Monitor `SELECT COUNT(*), MAX(attempts) FROM image_cleanup;`. This also removes uploads abandoned by crashes or provider timeouts. The command checks that each asset is unreferenced before deletion. Keep Cloudinary credentials configured until all queued assets are cleaned up.

## Backups, recovery, and rollback

- Enable and verify managed database backups for your chosen Render plan. Set retention and recovery targets with the store operator before launch; test restoring a snapshot into a **separate** staging database.
- Keep an encrypted logical export before migrations (`pg_dump --format=custom` using a securely supplied connection string). Restore only into a newly provisioned database using `pg_restore`, verify users/catalog/orders there, then deliberately switch the service's `DATABASE_URL`. Never test restore against the live database.
- Database backups contain customer information. Restrict access and retention. Back up Cloudinary assets separately or enable provider backup; database backups contain image metadata only. An old database snapshot can reference assets deleted since the snapshot.
- Roll back code by redeploying the last known-good Render image/commit. Migration 006 is additive; leave the extra columns/table in place. Do not automatically reverse migrations or rerun demo seeds. Forward-fix any data issue after verifying a backup.
- Preserve `JWT_SECRET` through rollback. If the key is exposed, rotate it deliberately; all current sessions will expire.
- Logs include request IDs, matched route patterns, status codes, and duration, without request bodies, cookies, credentials, or raw database exception details. Correlate failures using `X-Request-ID`; set external alerts on sustained health failures and 5xx responses in your hosting monitor.

## Local production-container check

```bash
docker compose -p florea-release-check -f compose.smoke.yml up --build -d --wait
python scripts/smoke.py http://127.0.0.1:4400
docker compose -p florea-release-check -f compose.smoke.yml down
```

This stack uses a disposable tmpfs database and test-only secrets. It never uses `.env` or your existing database. The HTTP address is for read-only local smoke checks; production Secure cookies require HTTPS for real browser sessions. Do not use this Compose file as production configuration.
