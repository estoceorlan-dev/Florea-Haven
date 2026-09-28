# Release readiness — 2026-09-28

Status: **Release candidate prepared for Render. Not deployed to a hosted environment.**

## Implemented

- Profile and product uploads, replacement/removal, previews, progress, retry feedback, avatars, responsive delivery, and missing-image fallbacks.
- Cloudinary uploads signed server-side after decoded-file validation, animation rejection, dimension/size limits, metadata stripping, and bounded WebP re-encoding. A per-process upload slot bounds memory use.
- Owner/admin authorization, durable orphan/replacement cleanup, and preservation of the previous image on upload/database failures.
- Shared user-scoped administrator queries with cancellation, polling, cache reuse, and mutation invalidation.
- Fixes for checkout-confirmation and login/logout redirect races, failed logout handling, navigation scroll position, 320px header overflow, and catalog/navigation/footer contrast.
- Production configuration checks, CSP without inline scripts, secure cookies, origin checks, upload/body limits, shared rate limits, static caching, request IDs, and logs that avoid raw request bodies and database errors.
- Multi-stage non-root Docker image, current-schema-valid Render Blueprint, CI release checks, isolated browser tests, disposable production smoke stack, and deployment/backup/rollback documentation.
- Migration 006 applied to the existing local PostgreSQL database without reseeding the catalog. Tests used separate disposable schemas. No production database was modified.

## Verified

| Check                                                   | Result                                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                         | Passed                                                                                                                                                              |
| Python integration/security/concurrency/migration tests | 95 passed                                                                                                                                                           |
| React component/query/theme tests                       | 65 passed                                                                                                                                                           |
| Playwright Chromium journeys                            | 5 passed; 1 intentionally skipped duplicate viewport matrix on mobile                                                                                               |
| Customer/admin browser flows                            | Registration, profile image upload/removal, purchase, confirmation, permissions, admin stock/image changes, status update, login/logout, customer status visibility |
| Responsive catalog                                      | No horizontal overflow at 320, 390, 768, 1024, 1280, and 1440px in light and dark themes                                                                            |
| Automated accessibility                                 | No serious/critical WCAG 2 A/AA axe findings on the tested catalog in either theme; mobile drawer Escape/focus return checked with reduced motion                   |
| Docker                                                  | Linux production image built; application ran with real PostgreSQL 16 and Redis 7                                                                                   |
| Production smoke                                        | Health, catalog, SPA deep links, theme script, admin denial, registration/session, Secure/HttpOnly/SameSite cookies, and HSTS passed                                |
| Dependency audits                                       | npm audit and pip-audit reported no known vulnerabilities in the checked dependency sets                                                                            |
| Source credential scan                                  | No high-confidence matches; limited pattern scan, not an exhaustive secret audit                                                                                    |
| Render Blueprint                                        | Validated against `https://render.com/schema/render.yaml.json`                                                                                                      |

The smoke stack and its disposable data were removed after verification. Browser screenshots/traces are local ignored artifacts under `test-results/`; CI uploads failure artifacts.

## Before accepting production traffic

Follow the [Render deployment runbook](render-deployment.md).

1. Create the Render resources and supply server-only Cloudinary credentials. Review the paid plans in the Blueprint before provisioning. Configure the canonical HTTPS origin if using a custom domain.
2. Create the initial administrator securely. Add real categories/products; do not run the demo seed in production. No demo administrator credentials are deployed.
3. Verify real Cloudinary uploads, replacement, removal, and responsive image delivery in staging. Automated tests stub Cloudinary's network calls, so account configuration and live delivery remain unverified.
4. Schedule daily `cleanup-images`, enable monitoring, configure backups/retention, and rehearse restore into a separate database.
5. Repeat the documented smoke/customer/admin checks on staging and production, including HTTPS and the chosen domain, then record/tag the deployed commit.
6. Complete broader assistive-technology, zoom, network-throttling, and Figma visual review if required by your design acceptance process. Automated accessibility checks cover the catalog and drawer, not every screen or assistive technology.

The established MVP remains Cash on Delivery. Online payments, password-reset email, notifications, delivery integrations, reviews, and advanced analytics are not included in this release.
