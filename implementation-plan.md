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
| 8 | Quality and security hardening | Phases 2–7 | MVP is reliable, accessible, and secure |
| 9 | Deployment and release | Phase 8 | Production MVP is live and verified |

Phases 6 and 7 may overlap after their dependencies are complete, but a small team should still prefer finishing one phase at a time.

---

## 5. Phase 0 — Confirm Scope and Technical Decisions

### Goal

Remove decisions that could cause rework before writing application code.

### Tasks

- [ ] Confirm the MVP features and explicitly defer out-of-scope ideas.
- [ ] Define the supported product categories: seeds, flowers, and perfumes.
- [ ] Decide whether checkout is a simulated order placement or includes a payment method. For the initial release, use a simulated payment/Cash on Delivery flow unless a real gateway is required.
- [ ] Define the initial order statuses and allowed transitions. Suggested flow: `pending → confirmed → preparing → shipped → delivered`, with `cancelled` allowed only from approved earlier states.
- [ ] Define whether guest carts are required. For the smallest MVP, require sign-in before adding persistent cart items.
- [ ] Choose the PostgreSQL access layer and migration tool. Use one approach consistently throughout the backend.
- [ ] Decide how JWTs will be transported. Prefer a secure, HTTP-only cookie in production; document the CSRF strategy if cookies are used.
- [ ] Define standard API response and error formats.
- [ ] Decide image handling for the MVP. The simplest option is administrator-provided image URLs with a safe placeholder when missing.
- [ ] Record supported Node.js and package-manager versions.

### Deliverables

- A short decision record in the README or `docs/decisions/`.
- Initial endpoint contract and validation rules.
- Agreed definition of done for each feature.

### Exit Criteria

- No unresolved decision blocks database schema, authentication, checkout, or deployment.
- The team can explain the complete MVP customer and administrator journeys.

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

- [ ] Create the `users` table with unique, normalized email addresses.
- [ ] Restrict roles to supported values such as `customer` and `admin`.
- [ ] Add a safe method for creating the first administrator account.

### Backend

- [ ] Implement `POST /api/auth/register`.
- [ ] Implement `POST /api/auth/login`.
- [ ] Implement `POST /api/auth/logout` if cookie-based authentication is selected.
- [ ] Implement `GET /api/auth/me`.
- [ ] Hash passwords with a maintained password-hashing library.
- [ ] Add authentication and admin-authorization middleware.
- [ ] Validate email and password inputs and return generic login failures.
- [ ] Add rate limiting to authentication endpoints.

### Frontend

- [ ] Build registration and login forms with accessible validation messages.
- [ ] Create authentication state and session restoration.
- [ ] Add protected customer routes and admin-only routes.
- [ ] Add sign-out behavior and handle expired sessions cleanly.
- [ ] Redirect users back to their intended page after successful login.

### Tests

- [ ] Test successful registration, duplicate email, login, invalid credentials, and session restoration.
- [ ] Test missing, expired, and malformed authentication credentials.
- [ ] Verify a customer cannot use an admin endpoint or open an admin page.
- [ ] Verify password hashes and tokens never appear in API responses or logs.

### Exit Criteria

- New customers can register and maintain a session.
- Customers and administrators receive the correct permissions.
- Protected routes fail safely when authentication is missing or invalid.

---

## 9. Phase 4 — Persistent Shopping Cart

### Goal

Allow a signed-in customer to build a cart that remains available across sessions.

### Database

- [ ] Create `cart_items` with foreign keys to users and products.
- [ ] Enforce one row per user/product pair.
- [ ] Require positive quantities and define deletion behavior for referenced products.

### Backend

- [ ] Implement `GET /api/cart`.
- [ ] Implement `POST /api/cart/items`.
- [ ] Implement `PUT /api/cart/items/:id`.
- [ ] Implement `DELETE /api/cart/items/:id`.
- [ ] Verify cart ownership on every operation.
- [ ] Reject inactive products, invalid quantities, and quantities above current stock.
- [ ] Calculate display totals from current server-side prices rather than trusting client values.

### Frontend

- [ ] Create cart state backed by the cart API.
- [ ] Add “Add to cart” behavior to product cards and product details.
- [ ] Build the cart page with quantity controls, removal, subtotal, and stock warnings.
- [ ] Disable or explain invalid cart actions.
- [ ] Add empty, loading, and failure states.

### Tests

- [ ] Test add, merge/increment, update, remove, and empty-cart behavior.
- [ ] Test ownership boundaries between two users.
- [ ] Test products that become inactive or have insufficient stock after being added.

### Exit Criteria

- A customer's cart persists after refresh and sign-in.
- A customer cannot view or modify another customer's cart.
- The server remains the authority for product price and available stock.

---

## 10. Phase 5 — Checkout and Customer Orders

### Goal

Convert a valid cart into an immutable order without overselling inventory.

### Database

- [ ] Create `orders` and `order_items` through migrations.
- [ ] Store the product price at purchase time in each order item.
- [ ] Store the delivery address snapshot on the order.
- [ ] Add order status constraints, timestamps, and useful indexes.
- [ ] Decide how product names are preserved for historical orders if products can later be renamed or deleted.

### Backend

- [ ] Implement `POST /api/orders` using a database transaction.
- [ ] Within the transaction: load the cart, re-check active products and stock, calculate totals, create the order and items, reduce stock safely, and clear the cart.
- [ ] Ensure concurrent checkouts cannot reduce stock below zero.
- [ ] Make repeated checkout submissions safe through an idempotency key or equivalent duplicate-submission protection.
- [ ] Implement `GET /api/orders` for the current customer.
- [ ] Implement `GET /api/orders/:id` with strict ownership checks.
- [ ] Return useful validation conflicts when price or availability changes.

### Frontend

- [ ] Build the checkout page with order summary and delivery-address form.
- [ ] Show server validation errors without losing entered form data.
- [ ] Prevent accidental double submission while checkout is processing.
- [ ] Build order confirmation, order history, and order-detail pages.
- [ ] Clearly display status, item price snapshots, totals, address, and timestamps.

### Tests

- [ ] Test successful order creation and exact total calculations.
- [ ] Test empty carts, insufficient stock, inactive products, invalid addresses, and duplicate submissions.
- [ ] Test transaction rollback so a failed order does not partially change stock, cart items, or order records.
- [ ] Test simultaneous attempts to purchase the last available item.
- [ ] Test that one customer cannot access another customer's order.

### Exit Criteria

- Checkout is atomic: all related changes succeed together or none are saved.
- Stock cannot become negative through normal or concurrent checkout requests.
- Customers can view accurate historical orders even after current product data changes.

---

## 11. Phase 6 — Admin Catalog and Inventory Management

### Goal

Allow administrators to maintain the catalog without direct database access.

### Backend

- [ ] Implement protected category create, update, and delete/deactivate endpoints.
- [ ] Implement protected product create, update, and delete/deactivate endpoints.
- [ ] Validate names, descriptions, prices, stock, categories, and image URLs.
- [ ] Prevent category deletion when it would leave invalid product references, or define a reassignment/deactivation workflow.
- [ ] Preserve historical order data when a product is deactivated or deleted.

### Frontend

- [ ] Build an admin dashboard shell and navigation.
- [ ] Build category list and form views.
- [ ] Build product list, search, filter, create, and edit views.
- [ ] Add inventory adjustment controls with clear validation.
- [ ] Add confirmation for destructive actions and success/error feedback.

### Tests

- [ ] Test every endpoint as an administrator, customer, and unauthenticated visitor.
- [ ] Test invalid prices, negative stock, missing categories, and duplicate category names.
- [ ] Verify catalog changes appear correctly in the customer interface.

### Exit Criteria

- An administrator can manage all catalog data through the interface.
- Customers cannot call or display administrator operations.
- Catalog changes do not damage existing order history.

---

## 12. Phase 7 — Admin Order and Customer Management

### Goal

Give administrators the minimum operational tools needed to fulfill orders.

### Backend

- [ ] Add a paginated admin order-list endpoint with status, date, and customer filters.
- [ ] Add an admin order-detail endpoint.
- [ ] Implement `PUT /api/orders/:id/status` with allowed-transition validation.
- [ ] Add a read-only, paginated customer list if it is required by the MVP.
- [ ] Record when order status changes; optionally record which administrator made the change.

### Frontend

- [ ] Build the admin orders table with search, filters, and pagination.
- [ ] Build the admin order-details page.
- [ ] Add status-update controls that show only legal next states.
- [ ] Build the minimal customer list/view if retained in scope.

### Tests

- [ ] Test legal and illegal status transitions.
- [ ] Test administrator access and customer denial.
- [ ] Verify customers see updated order status in their order history.

### Exit Criteria

- Administrators can find, inspect, and progress orders through the agreed workflow.
- Invalid status transitions are rejected by the API, not only hidden by the UI.

---

## 13. Phase 8 — Quality, Security, and User Experience Hardening

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
- [ ] Optimize product images and lazy-load non-critical images.
- [ ] Add production-safe structured logging and error monitoring if available.
- [ ] Document backup and restore expectations for the managed database.

### Exit Criteria

- All release-blocking automated tests pass.
- No known critical security, authorization, data-integrity, or accessibility defect remains.
- A fresh tester can complete both main journeys using only the UI.

---

## 14. Phase 9 — Deployment and MVP Release

### Goal

Deploy a production-ready build and verify it in the actual hosting environment.

### Infrastructure

- [ ] Provision production PostgreSQL in a region suitable for the deployment.
- [ ] Configure production environment variables in Vercel.
- [ ] Configure the React frontend and Node/Express API for the selected Vercel deployment model.
- [ ] Confirm database connection handling is suitable for serverless execution, using pooling where required.
- [ ] Configure production CORS, cookie domain/security, API URLs, and allowed origins.

### Release

- [ ] Run production migrations through a documented, controlled process.
- [ ] Seed only required reference data and create the initial administrator securely.
- [ ] Build and deploy a staging/preview version first.
- [ ] Run smoke tests for health, catalog, authentication, cart, checkout, customer orders, and admin operations.
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

## 15. Suggested Test Pyramid

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

## 16. Cross-Cutting Definition of Done

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

## 17. Recommended Work Order Within Each Phase

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

## 18. Deferred Enhancements

Start these only after the MVP release is stable:

- Real payment gateway integration.
- Guest carts and cart merging after login.
- Product reviews, favorites, and recommendations.
- Image upload and media management.
- Email or SMS order notifications.
- Discount codes, promotions, and gift cards.
- Delivery-provider integration or live tracking.
- Advanced sales and inventory analytics.
- Fine-grained administrator permissions and audit logs.
- Automated low-stock alerts.

Each enhancement should be proposed as a new vertical slice with its own data changes, API contract, interface, tests, security review, and release criteria.

## 19. Progress Tracker

Update this table as work advances.

| Phase | Status | Owner | Target | Notes |
|---|---|---|---|---|
| 0. Decisions | Not started | — | — | — |
| 1. Foundation | Implemented | — | — | Automated checks pass; persistent PostgreSQL smoke test pending |
| 2. Catalog | Implemented | — | — | Automated checks pass; manual viewport QA pending |
| 3. Authentication | Not started | — | — | — |
| 4. Cart | Not started | — | — | — |
| 5. Checkout and orders | Not started | — | — | — |
| 6. Admin catalog | Not started | — | — | — |
| 7. Admin orders | Not started | — | — | — |
| 8. Hardening | Not started | — | — | — |
| 9. Deployment | Not started | — | — | — |
