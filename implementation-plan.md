# Floréa Haven — Gradual Implementation Plan

## 1. Purpose

This plan turns the system described in [`architecture.md`](./architecture.md) into small, testable increments. Each phase should leave the application in a working state and should be completed before features that depend on it begin.

The first release focuses on a dependable e-commerce flow:

> Browse products → create an account → add items to a cart → place an order → view the order → manage it as an administrator.

## 2. Delivery Principles

- Build in vertical slices: database, API, and interface for one workflow at a time.
- Keep the first release within the scope defined in `architecture.md`.
- Validate all business rules on the server, even if the frontend also validates them.
- Add automated tests alongside each feature instead of postponing all testing.
- Use database migrations and seed data so every environment can be reproduced.
- Do not begin the next phase until the current phase's exit criteria pass.
- Commit small, reviewable changes and keep the default branch deployable.

## 3. MVP Completion Criteria

The MVP is complete when:

- A visitor can browse, search, filter, and inspect products.
- A customer can register, sign in, sign out, and restore their session.
- A signed-in customer can manage a persistent cart.
- Checkout creates a complete order and safely reduces stock.
- A customer can view only their own orders.
- An administrator can manage categories, products, stock, and order status.
- A signed-in customer can upload, replace, and remove their profile picture.
- An administrator can upload, replace, and remove a product image.
- Protected API endpoints reject unauthenticated or unauthorized requests.
- Core workflows pass automated and manual tests.
- The frontend, API, and managed PostgreSQL database work in production.
- Secrets are stored only in environment configuration.

## 4. Roadmap at a Glance

| Phase | Increment | Depends on | Demonstrable result |
|---|---|---|---|
| 0 | Scope and technical decisions | — | Agreed MVP rules and API conventions |
| 1 | Project foundation | Phase 0 | Frontend, API, and database run locally |
| 2 | Public product catalog | Phase 1 | Visitors can browse real product data |
| 3 | Authentication and roles | Phase 2 | Customers and admins can sign in safely |
| 4 | Persistent shopping cart | Phase 3 | Customers can manage a server-backed cart |
| 5 | Checkout and customer orders | Phase 4 | A cart can become an order transactionally |
| 6 | Admin catalog and inventory | Phase 3 | Admins can manage products and stock |
| 7 | Admin order management | Phase 5 | Admins can review and update orders |
| 8 | Profile and product image uploads | Phases 3 and 6 | Customers and admins can upload the images they manage |
| 9 | Quality and security hardening | Phases 2–8 | MVP is reliable, accessible, and secure |
| 10 | Deployment and release | Phase 9 | Production MVP is live and verified |

Phases 6 and 7 may overlap after their dependencies are complete, but a small team should still prefer finishing one phase at a time.

---

## 5. Phase 0 — Confirm Scope and Technical Decisions

### Goal

Remove decisions that could cause rework before writing application code.

### Tasks

- [x] Confirm the MVP features and explicitly defer out-of-scope ideas.
- [x] Define the supported product categories: seeds, flowers, and perfumes.
- [x] Use Cash on Delivery as the only MVP payment method; do not collect or store card details.
- [x] Define the order flow as `pending → confirmed → preparing → shipped → delivered`, with cancellation allowed only from `pending` or `confirmed`.
- [x] Require sign-in before adding persistent cart items; defer guest carts and merging.
- [x] Use `pg`, parameterized SQL, and ordered SQL migration files consistently throughout the backend.
- [x] Transport browser JWTs in a secure, HTTP-only, same-site cookie and verify request origins for state-changing operations.
- [x] Define standard API response and error formats.
- [x] Use administrator-provided HTTP(S) image URLs with a safe client placeholder as the initial baseline; Phase 8 supersedes manual URLs with managed uploads.
- [x] Support Node.js 22+ and npm 10+.

### Deliverables

- [MVP and technical baseline](./docs/decisions/0001-mvp-technical-baseline.md)
- [Initial endpoint contract and validation rules](./docs/api-contract.md)
- [Feature definition of done](./docs/definition-of-done.md)

### Exit Criteria

- No unresolved decision blocks database schema, authentication, checkout, or deployment.
- The team can explain the complete MVP customer and administrator journeys.

Phase 0 was completed on 2026-08-30. The accepted decisions preserve the conventions already implemented in Phases 1–4 and define the checkout, order-history, status, and deployment rules needed by later phases.

---

## 6. Phase 1 — Project Foundation

### Goal

Create a reproducible local development environment and prove communication across all three architecture layers.

### Repository and Tooling

- [x] Initialize the root project and `client/` and `server/` applications.
- [x] Configure React and Tailwind CSS in `client/`.
- [x] Configure Node.js and Express in `server/`.
- [x] Add linting, formatting, and test commands.
- [x] Add `.gitignore`, `.env.example`, and setup documentation.
- [x] Add root scripts for starting and testing both applications.
- [x] Configure CORS and environment-aware API URLs.

### Database and API

- [x] Connect the server to PostgreSQL through `DATABASE_URL`, with an in-memory development/test fallback.
- [x] Configure ordered SQL migration and seed scripts.
- [x] Add `GET /api/health` with application and database health information.
- [x] Add centralized 404 and error-handling middleware.
- [x] Add request logging for development without logging passwords or tokens.

### Frontend Shell

- [x] Create customer and administrator layouts.
- [x] Add navigation, footer, route definitions, loading UI, not-found UI, and a general error state.
- [x] Create a shared API client with base URL and consistent error parsing.
- [x] Establish reusable colors, spacing, typography, buttons, fields, and cards.

### Tests

- [x] Add one backend health-route integration test.
- [x] Add frontend component and catalog-page render tests.
- [x] Confirm lint, test, and build commands run successfully.

### Exit Criteria

- `client/` and `server/` run locally using documented commands.
- The frontend successfully calls the health endpoint.
- The API successfully queries PostgreSQL.
- No real secret is committed to Git.

---

## 7. Phase 2 — Public Product Catalog

### Goal

Deliver the first complete vertical slice using real database data.

### Database

- [x] Create `categories` and `products` tables through migrations.
- [x] Add constraints for non-negative price and stock.
- [x] Add timestamps and use an `is_active` flag for catalog deactivation.
- [x] Add indexes for category, name/search, active status, and common sort fields.
- [x] Add repeatable seed data covering all three product categories.

### Backend

- [x] Implement `GET /api/categories`.
- [x] Implement `GET /api/products` with pagination.
- [x] Add validated query parameters for search, category, price range, sort, and page size.
- [x] Implement `GET /api/products/:id`.
- [x] Return `404` for missing or inactive products.
- [x] Keep filtering and pagination logic in the backend so it scales beyond seed data.

### Frontend

- [x] Build the home page and featured-products section.
- [x] Build the products page, product grid, cards, search, filters, sorting, and pagination.
- [x] Build the product-details page.
- [x] Add loading skeletons, empty results, API error messages, image fallbacks, and retry actions.
- [x] Make catalog pages responsive and keyboard accessible.
- [x] Keep search and filter state in the URL so results can be refreshed and shared.

### Tests

- [x] Test product filtering, pagination, invalid query parameters, and missing IDs.
- [x] Test the product-list and product-details UI states.
- [ ] Manually check mobile, tablet, and desktop layouts.

### Exit Criteria

- A visitor can browse and inspect seeded products without signing in.
- Search, filter, sort, pagination, empty, loading, and failure states work.
- Catalog API responses never expose internal or sensitive fields.

---

## 8. Phase 3 — Authentication and Role Authorization

### Goal

Establish user identity before building protected customer and administrator workflows.

### Database

- [x] Create the `users` table with unique, normalized email addresses.
- [x] Restrict roles to supported values such as `customer` and `admin`.
- [x] Add a safe method for creating the first administrator account.

### Backend

- [x] Implement `POST /api/auth/register`.
- [x] Implement `POST /api/auth/login`.
- [x] Implement `POST /api/auth/logout` using HTTP-only cookie authentication.
- [x] Implement `GET /api/auth/me`.
- [x] Hash passwords with a maintained password-hashing library.
- [x] Add authentication and admin-authorization middleware.
- [x] Validate email and password inputs and return generic login failures.
- [x] Add rate limiting to authentication endpoints.

### Frontend

- [x] Build registration and login forms with accessible validation messages.
- [x] Create authentication state and session restoration.
- [x] Add protected customer routes and admin-only routes.
- [x] Add sign-out behavior and handle expired sessions cleanly.
- [x] Redirect users back to their intended page after successful login.

### Tests

- [x] Test successful registration, duplicate email, login, invalid credentials, and session restoration.
- [x] Test missing, expired, and malformed authentication credentials.
- [x] Verify a customer cannot use an admin endpoint or open an admin page.
- [x] Verify password hashes and tokens never appear in API response bodies or logs.

### Exit Criteria

- New customers can register and maintain a session.
- Customers and administrators receive the correct permissions.
- Protected routes fail safely when authentication is missing or invalid.

---

## 9. Phase 4 — Persistent Shopping Cart

### Goal

Allow a signed-in customer to build a cart that remains available across sessions.

### Database

- [x] Create `cart_items` with foreign keys to users and products.
- [x] Enforce one row per user/product pair.
- [x] Require positive quantities and define deletion behavior for referenced products.

### Backend

- [x] Implement `GET /api/cart`.
- [x] Implement `POST /api/cart/items`.
- [x] Implement `PUT /api/cart/items/:id`.
- [x] Implement `DELETE /api/cart/items/:id`.
- [x] Verify cart ownership on every operation.
- [x] Reject inactive products, invalid quantities, and quantities above current stock.
- [x] Calculate display totals from current server-side prices rather than trusting client values.

### Frontend

- [x] Create cart state backed by the cart API.
- [x] Add “Add to cart” behavior to product cards and product details.
- [x] Build the cart page with quantity controls, removal, subtotal, and stock warnings.
- [x] Disable or explain invalid cart actions.
- [x] Add empty, loading, and failure states.

### Tests

- [x] Test add, merge/increment, update, remove, and empty-cart behavior.
- [x] Test ownership boundaries between two users.
- [x] Test products that become inactive or have insufficient stock after being added.

### Exit Criteria

- A customer's cart persists after refresh and sign-in.
- A customer cannot view or modify another customer's cart.
- The server remains the authority for product price and available stock.

---

## 10. Phase 5 — Checkout and Customer Orders

### Goal

Convert a valid cart into an immutable order without overselling inventory.

### Database

- [x] Create `orders` and `order_items` through migrations.
- [x] Store the product price at purchase time in each order item.
- [x] Store the delivery address snapshot on the order.
- [x] Add order status constraints, timestamps, and useful indexes.
- [x] Store product name and SKU snapshots so later catalog edits cannot change order history.

### Backend

- [x] Implement `POST /api/orders` using a database transaction.
- [x] Within the transaction: load the cart, re-check active products and stock, calculate totals, create the order and items, reduce stock safely, and clear the cart.
- [x] Ensure concurrent checkouts cannot reduce stock below zero.
- [x] Make repeated checkout submissions safe through an idempotency key and request fingerprint.
- [x] Implement `GET /api/orders` for the current customer.
- [x] Implement `GET /api/orders/:id` with strict ownership checks.
- [x] Return useful validation conflicts when price or availability changes.

### Frontend

- [x] Build the checkout page with order summary and delivery-address form.
- [x] Show server validation errors without losing entered form data.
- [x] Prevent accidental double submission while checkout is processing.
- [x] Build order confirmation, order history, and order-detail pages.
- [x] Clearly display status, item price snapshots, totals, address, and timestamps.

### Tests

- [x] Test successful order creation and exact total calculations.
- [x] Test empty carts, insufficient stock, inactive products, invalid addresses, and duplicate submissions.
- [x] Test transaction rollback so a failed order does not partially change stock, cart items, or order records.
- [x] Test simultaneous attempts to purchase the last available item.
- [x] Test that one customer cannot access another customer's order.

### Exit Criteria

- Checkout is atomic: all related changes succeed together or none are saved.
- Stock cannot become negative through normal or concurrent checkout requests.
- Customers can view accurate historical orders even after current product data changes.

---

## 11. Phase 6 — Admin Catalog and Inventory Management

### Goal

Allow administrators to maintain the catalog without direct database access.

### Backend

- [x] Implement protected category create, update, and delete endpoints.
- [x] Implement protected product create, update, and deactivate endpoints.
- [x] Validate names, descriptions, prices, stock, categories, and image URLs.
- [x] Reject category deletion with `CATEGORY_IN_USE` when any product references it.
- [x] Preserve historical order data when a product is deactivated or deleted.

### Frontend

- [x] Build an admin dashboard shell and navigation.
- [x] Build category list and form views.
- [x] Build product list, search, filter, create, and edit views.
- [x] Add inventory adjustment controls with clear validation.
- [x] Add confirmation for destructive actions and success/error feedback.

### Tests

- [x] Test every endpoint as an administrator, customer, and unauthenticated visitor.
- [x] Test invalid prices, negative stock, missing categories, and duplicate category names.
- [x] Verify catalog changes appear correctly in the customer interface.

### Exit Criteria

- An administrator can manage all catalog data through the interface.
- Customers cannot call or display administrator operations.
- Catalog changes do not damage existing order history.

---

## 12. Phase 7 — Admin Order Management

### Goal

Give administrators the minimum operational tools needed to fulfill orders.

### Backend

- [x] Add a paginated admin order-list endpoint with status, date, and customer filters.
- [x] Add an admin order-detail endpoint.
- [x] Implement `PUT /api/admin/orders/:id/status` with allowed-transition validation and atomic stock restoration on cancellation.
- [x] Include the customer name and email required for fulfillment in the admin order-detail response.
- [x] Record each order's `status_updated_at`; defer a full actor audit trail.

### Frontend

- [x] Build the admin orders table with search, filters, and pagination.
- [x] Build the admin order-details page.
- [x] Add status-update controls that show only legal next states.
- [x] Display fulfillment-relevant customer details within the admin order view; do not add standalone customer administration.

### Tests

- [x] Test legal and illegal status transitions.
- [x] Test administrator access and customer denial.
- [x] Verify customers see updated order status in their order history.

### Exit Criteria

- Administrators can find, inspect, and progress orders through the agreed workflow.
- Invalid status transitions are rejected by the API, not only hidden by the UI.

---

## 13. Phase 8 — Profile and Product Image Uploads

### Goal

Let customers manage their own profile picture and let administrators manage each product's image without pasting external URLs.

### Storage Decision

- [ ] Use [Cloudinary](https://cloudinary.com/documentation/upload_images) as the recommended image storage and delivery service. It supports signed uploads, image transformations, and CDN delivery, which suit avatars and catalog images.
- [ ] Use short-lived, server-generated upload signatures; never expose `CLOUDINARY_API_SECRET` to the React application.
- [ ] Keep image files out of PostgreSQL. Store only the secure delivery URL and provider asset identifier needed to replace or delete an image.
- [ ] Use separate provider folders or prefixes for `profile-images/` and `product-images/`, with generated names instead of original filenames.
- [ ] If minimizing external services is more important than built-in image transformations, document [Vercel Blob](https://vercel.com/docs/vercel-blob/client-upload) as the alternative. Choose one provider before implementation and do not mix providers in the MVP.

### Database and Configuration

- [ ] Add nullable `profile_image_url` and `profile_image_public_id` fields to `users` through a migration.
- [ ] Retain `products.image_url` for delivery and add a nullable `image_public_id` field for provider-side replacement and deletion.
- [ ] Use the product name as its image alt text for the MVP and use the customer's name for their avatar; defer separately authored alt text.
- [ ] Add provider configuration to `.env.example` and deployment documentation, including `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and server-only `CLOUDINARY_API_SECRET` when Cloudinary is selected.
- [ ] Define a safe placeholder for users and products without an image.

### Backend and Upload Security

- [ ] Add `POST /api/uploads/signature` to create short-lived signed upload parameters for the requested purpose; require an admin role when the purpose is a product image.
- [ ] Add `PUT` and `DELETE /api/users/me/profile-image` so a customer can save, replace, and remove only their own profile picture.
- [ ] Add admin-only `PUT` and `DELETE /api/products/:id/image` endpoints to save, replace, and remove a product image.
- [ ] Return the profile image metadata from `GET /api/auth/me` and product image metadata from the existing catalog/admin product responses.
- [ ] Verify the provider response and confirm the expected asset type, account, folder/prefix, and ownership before saving image metadata.
- [ ] Accept only JPEG, PNG, and WebP images; reject SVG, renamed non-images, and unsupported or animated content.
- [ ] Enforce a 5 MB upload limit and a 4096×4096-pixel maximum both in the upload provider configuration and in server validation.
- [ ] Re-encode images, strip unnecessary metadata, normalize them to bounded dimensions, and generate optimized avatar, card, and product-detail variants with automatic quality and format selection where supported.
- [ ] Stop accepting arbitrary `imageUrl` values from product create/update requests after the managed upload flow is available.
- [ ] Delete a replaced or removed provider asset only after the database update succeeds, and log enough metadata to retry failed cleanup without logging secrets.
- [ ] Add a documented orphan-cleanup procedure for uploads that succeed at the provider but are never attached to a user or product.
- [ ] Apply rate limits to signature/finalization endpoints and return the standard API error format for invalid files or provider failures.
- [ ] Update `docs/api-contract.md` with the upload, finalization, removal, authorization, validation, and error contracts.

### Frontend

- [ ] Build an authenticated profile/settings view with current-avatar display, file selection, preview, upload progress, replace, remove, and error states.
- [ ] Show the customer's avatar in the account/navigation UI with a reliable fallback.
- [ ] Replace the admin product form's manual image-URL workflow with image selection, preview, upload progress, replace, remove, and validation feedback.
- [ ] Preserve the existing product image if a product edit or replacement upload fails.
- [ ] Use responsive image variants, explicit dimensions, and lazy loading outside the initial viewport to reduce layout shift and bandwidth.

### Tests

- [ ] Test authorization so customers can modify only their own profile image and only admins can modify product images.
- [ ] Test valid upload, replacement, removal, missing image, provider failure, and failed provider cleanup paths.
- [ ] Test spoofed MIME types, unsupported formats, oversized files, excessive dimensions, forged provider identifiers, and expired signatures.
- [ ] Test avatar and product-image preview, progress, fallback, validation, and retry states in the UI.
- [ ] Manually verify optimized image delivery on mobile and desktop and confirm secrets never appear in browser code, API responses, or logs.

### Exit Criteria

- A signed-in customer can upload, replace, and remove only their profile picture.
- An administrator can upload, replace, and remove product images through the product interface.
- Uploaded images are validated, optimized, delivered from the chosen cloud provider, and represented in PostgreSQL only by metadata.
- Unauthorized uploads, forged asset references, and invalid image files are rejected safely.

---

## 14. Phase 9 — Quality, Security, and User Experience Hardening

### Goal

Turn the feature-complete application into a release candidate.

### Reliability and Testing

- [ ] Add end-to-end tests for the primary customer journey.
- [ ] Add end-to-end tests for the primary administrator journey.
- [ ] Cover authorization, checkout calculations, transaction rollback, and stock concurrency with backend tests.
- [ ] Test database migrations against a fresh database and an existing development database.
- [ ] Verify all loading, empty, success, validation, unauthorized, forbidden, not-found, conflict, and server-error states.

### Security

- [ ] Validate and normalize every API input.
- [ ] Review SQL/ORM use for injection safety.
- [ ] Configure secure headers, CORS allowlists, body-size limits, and rate limits.
- [ ] Confirm cookie security or token storage behavior in production.
- [ ] Avoid exposing stack traces and internal database errors to clients.
- [ ] Run dependency and secret scans and resolve release-blocking findings.
- [ ] Confirm authorization is enforced server-side for every protected resource.

### Accessibility and Usability

- [ ] Check keyboard navigation, visible focus, semantic headings, labels, and alt text.
- [ ] Check contrast and responsive behavior at common viewport sizes.
- [ ] Ensure forms preserve useful input after validation failures.
- [ ] Add clear confirmation for order placement and admin changes.

### Performance and Operations

- [ ] Confirm database queries use indexes and avoid unnecessary repeated queries.
- [ ] Verify profile and product image variants are optimized, correctly cached, and lazy-loaded when non-critical.
- [ ] Add production-safe structured logging and error monitoring if available.
- [ ] Document backup and restore expectations for the managed database.

### Exit Criteria

- All release-blocking automated tests pass.
- No known critical security, authorization, data-integrity, or accessibility defect remains.
- A fresh tester can complete both main journeys using only the UI.

---

## 15. Phase 10 — Deployment and MVP Release

### Goal

Deploy a production-ready build and verify it in the actual hosting environment.

### Infrastructure

- [ ] Provision production PostgreSQL in a region suitable for the deployment.
- [ ] Configure production environment variables in Vercel.
- [ ] Provision the selected image provider and configure its production credentials, upload restrictions, folders/prefixes, and allowed origins.
- [ ] Configure the React frontend and Node/Express API for the selected Vercel deployment model.
- [ ] Confirm database connection handling is suitable for serverless execution, using pooling where required.
- [ ] Configure production CORS, cookie domain/security, API URLs, and allowed origins.

### Release

- [ ] Run production migrations through a documented, controlled process.
- [ ] Seed only required reference data and create the initial administrator securely.
- [ ] Build and deploy a staging/preview version first.
- [ ] Run smoke tests for health, catalog, authentication, cart, checkout, customer orders, profile images, product images, and admin operations.
- [ ] Deploy production and repeat the smoke tests.
- [ ] Verify HTTPS, error logs, and database connectivity.
- [ ] Tag the release and record rollback steps.

### Documentation

- [ ] Complete the README with setup, environment variables, scripts, tests, migrations, seeds, and deployment instructions.
- [ ] Document administrator setup and the order-status workflow.
- [ ] Document known limitations and deferred features.

### Exit Criteria

- The production application passes all smoke tests.
- No development-only credential, seed account, or debug behavior is exposed.
- The repository contains enough documentation for another developer to run and maintain the MVP.

---

## 16. Suggested Test Pyramid

| Level | Focus | Run frequency |
|---|---|---|
| Unit | Validators, totals, status transitions, utility functions | During development and on every commit |
| API integration | Routes, authentication, authorization, database constraints, transactions | On every pull request |
| Component | Forms, product cards, cart controls, loading/error states | On every pull request |
| End-to-end | Critical customer and admin journeys | Before merge for affected flows and before release |
| Manual exploratory | Responsive layout, accessibility, unusual workflows | At each phase gate and before release |

Minimum release-critical end-to-end journeys:

1. Visitor browses products, registers, adds an item, checks out, and views the order.
2. Administrator signs in, updates stock, reviews the new order, and changes its status.
3. Customer cannot access admin pages or APIs and cannot view another customer's cart or order.
4. Checkout fails safely when stock changes and leaves no partial order or inventory update.
5. A customer updates their profile picture, and an administrator uploads and replaces a product image without crossing authorization boundaries.

## 17. Cross-Cutting Definition of Done

A task is done only when:

- [ ] Acceptance criteria are met in the UI and API where applicable.
- [ ] Server-side validation and authorization are present.
- [ ] Relevant automated tests pass.
- [ ] Loading, empty, error, and permission states are handled.
- [ ] The feature is usable on mobile and desktop.
- [ ] No secret or personal data is logged or committed.
- [ ] Migrations, configuration, and documentation are updated.
- [ ] The production build succeeds.
- [ ] Another developer can verify the change from the documented steps.

## 18. Recommended Work Order Within Each Phase

Use the same short loop for each feature:

1. Define acceptance criteria and API behavior.
2. Add or update the database migration.
3. Implement server validation, business logic, and routes.
4. Add backend tests.
5. Implement frontend data access and UI states.
6. Add frontend tests.
7. Test the complete workflow manually.
8. Update documentation and deploy a preview.

This order exposes data-model and business-rule problems early while still ending each phase with a user-visible result.

## 19. Deferred Enhancements

Start these only after the MVP release is stable:

- Real payment gateway integration.
- Guest carts and cart merging after login.
- Product reviews, favorites, and recommendations.
- Multiple product images, drag-and-drop gallery ordering, cropping, and advanced media management.
- Email or SMS order notifications.
- Discount codes, promotions, and gift cards.
- Delivery-provider integration or live tracking.
- Advanced sales and inventory analytics.
- Fine-grained administrator permissions and audit logs.
- Automated low-stock alerts.

Each enhancement should be proposed as a new vertical slice with its own data changes, API contract, interface, tests, security review, and release criteria.

## 20. Progress Tracker

Update this table as work advances.

| Phase | Status | Owner | Target | Notes |
|---|---|---|---|---|
| 0. Decisions | Complete | — | 2026-08-30 | Decision record, API contract, and feature definition of done accepted |
| 1. Foundation | Implemented | — | — | Automated checks pass; persistent PostgreSQL smoke test pending |
| 2. Catalog | Implemented | — | — | Automated checks pass; manual viewport QA pending |
| 3. Authentication | Implemented | — | — | Automated checks pass; persistent PostgreSQL smoke test pending |
| 4. Cart | Implemented | — | — | Automated checks pass; persistent PostgreSQL smoke test pending |
| 5. Checkout and orders | Implemented | — | 2026-08-30 | Automated checks pass; persistent PostgreSQL smoke test and manual responsive QA pending |
| 6. Admin catalog | Implemented | — | 2026-08-31 | Automated checks pass; persistent PostgreSQL smoke test and manual responsive QA pending |
| 7. Admin orders | Implemented | — | 2026-08-31 | Automated checks pass; persistent PostgreSQL smoke test and manual responsive QA pending |
| 8. Image uploads | Not started | — | — | Cloudinary recommended; provider decision required before implementation |
| 9. Hardening | Not started | — | — | — |
| 10. Deployment | Not started | — | — | — |
