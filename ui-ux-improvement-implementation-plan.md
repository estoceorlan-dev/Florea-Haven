# Floréa Haven UI/UX Improvement Implementation Plan

**Status:** In progress — Phase 1 handoff documented, Phase 2 foundation implemented, and Phase 3 code complete pending Figma and visual QA
**Scope:** Customer storefront, authentication, checkout, and administrator shell
**Primary goal:** Evolve the existing interface into a modern, responsive, polished botanical-commerce experience while preserving Floréa Haven's soft pink floral and minimalist aesthetic, without changing the server's role as the authority for identity, pricing, inventory, carts, and orders.

## Outcomes

This improvement is complete when:

- The customer and administrator interfaces use one coherent Tailwind design system that can be mirrored in Figma and is unmistakably soft pink, floral, airy, and minimalist.
- Navigation is responsive, accessible, and consistent: a customer app bar/mobile drawer and an administrator desktop sidebar/mobile drawer.
- Interactions have subtle, smooth feedback without causing layout shift or ignoring reduced-motion preferences.
- Every major loading state uses an animated skeleton shaped like the content it replaces.
- Server data is cached, deduplicated, cancelled, retried, refreshed, and invalidated through one predictable query layer.
- A customer who signs in directly is sent to Home, not Account; an intended protected destination and the administrator landing behavior are preserved.
- User-facing instances of `Storefront` are replaced with `Home` or `Floréa Haven`, depending on context.
- Current stock is visible in the catalog and is refreshed frequently during checkout.
- The signed-in user's name appears in the storefront app bar and mobile account area.
- Light, dark, and system theme preferences are supported without losing the soft pink floral identity.

## Current Baseline and Gaps

The repository already includes several useful foundations:

- React 19, React Router, Tailwind CSS v4, and Lucide icons are installed.
- `client/src/styles.css` contains brand colors, typography aliases, common controls, responsive grids, focus states, and a reduced-motion rule.
- `StorefrontLayout.jsx` already provides a sticky customer header, search, cart count, and a mobile menu.
- `AdminLayout.jsx` already displays the administrator's name and provides navigation, currently as a wrapping header with a horizontal mobile-style nav.
- Catalog and checkout API payloads already contain `stock_quantity`; the cart includes an availability state and a server-derived revision.
- Checkout already revalidates stock transactionally on the server and preserves delivery input after a stale-cart conflict.
- Several pages already contain `animate-pulse` placeholders and `ProductGridSkeleton.jsx`.

The main gaps are:

- Visual rules are partly centralized but page composition, surfaces, radii, shadows, typography, and spacing are still inconsistent.
- The customer app bar exposes the user's name only in an accessible label, not visibly.
- `AuthShell.jsx` and the administrator navigation still use the label `Storefront`.
- Direct customer login and registration currently default to `/account`.
- `useAsync.js` stores data per component and has no shared cache, request deduplication, stale-data strategy, invalidation model, or reconnect/focus refresh.
- `api.js` accepts fetch options internally but its endpoint functions do not expose query cancellation consistently; aborted requests can also be converted into a generic network error.
- Stock is present in catalog payloads but is not displayed on product cards, and checkout does not communicate when availability was last refreshed.
- Skeleton implementations are duplicated and do not consistently match final content geometry.
- The administrator experience needs a real desktop sidebar and a more compact mobile navigation pattern.
- Phase 3 theme preference, dark semantic palette, and pre-paint initialization are implemented; connected-browser visual QA and Figma application remain outstanding.

## Product and UX Decisions

### Visual direction

Use a **soft pink minimalist floral** direction. The current blush, ivory, muted rose, dusty pink, and berry tones remain the visual identity; deeper berry/plum is reserved for readable text, active states, and primary actions. Use generous whitespace, delicate botanical imagery, crisp sans-serif UI text, restrained serif display type, fine borders, and very soft shadows.

The result should feel feminine, premium, calm, light, and contemporary. It must not drift into a dark-green botanical theme, a generic monochrome dashboard, or an overly decorative vintage-floral style. Animation should clarify state and navigation, not delay task completion.

#### Visual guardrails

- Keep ivory or petal-tinted backgrounds dominant; avoid large dark surfaces except for a controlled footer, primary action, or small high-contrast area.
- Use soft pink as the recognizable brand signal across active navigation, badges, highlights, focus rings, skeletons, and subtle hover states.
- Use floral photography or restrained line-art botanicals as accents. Decorative elements must not compete with products, form fields, prices, or stock information.
- Prefer open composition, thin borders, low elevation, and a limited radius scale. Avoid heavy glassmorphism, neon color, harsh black, excessive gradients, thick shadows, and a pill shape on every component.
- Use line icons with consistent stroke weight. Keep icons secondary to clear text labels for important actions.
- Let typography and spacing create hierarchy; do not solve every hierarchy problem with another colored container.
- Apply the same identity to administrator pages with less decoration and slightly denser spacing, rather than switching Admin to a separate corporate theme.

### Navigation model

- **Customer desktop:** sticky announcement bar plus app bar with brand, primary navigation, search, visible customer name/account control, and cart.
- **Customer mobile/tablet:** compact app bar plus an animated side drawer. The drawer includes the user's name and email when signed in.
- **Administrator desktop:** persistent left sidebar with Dashboard, Orders, Products, Categories, and Floréa Haven links; a slim top bar contains the page context and user menu.
- **Administrator mobile/tablet:** compact top bar and slide-in navigation drawer.
- Use `Home` for customer navigation and `Floréa Haven` for the administrator's cross-application link.

### Authentication redirects

Apply these rules in order:

1. If login was triggered by a protected route, return to the validated local `location.state.from` path.
2. Otherwise, send an administrator to `/admin`.
3. Otherwise, send a customer to `/`.
4. Apply the same default-home rule after customer registration and when an already authenticated customer opens `/login` or `/register`.

This meets the Home-after-login requirement without breaking cart, checkout, order, or administrator deep links.

### Definition of "live stock"

For this iteration, live stock means **near-real-time polling and event-driven refetching**, not WebSockets or server-sent events:

- Catalog data refreshes while the catalog is visible and whenever the browser regains focus or connectivity.
- Checkout refreshes the cart/stock more aggressively and immediately before order submission.
- Cart, checkout, or administrator mutations invalidate affected product and cart queries.
- The server remains the final authority; the existing transactional checkout stock check is retained.

Completed order pages remain immutable purchase records. Do not relabel current inventory as part of a past order. The current-stock requirement is fulfilled in the catalog, cart, and checkout; an optional `Shop again` area may show current availability separately in a later enhancement.

## Design System and Figma Handoff

### Figma file structure

Create or update these Figma pages before page-level implementation:

1. `Foundations` — the approved soft-pink floral mood board, light/dark semantic color variables, typography, spacing, grid, radii, elevation, icon sizing, and motion notes.
2. `Components` — light and dark variants for buttons, fields, badges, app bar, drawer, sidebar, product cards, stock indicator, skeletons, alerts, empty states, pagination, and order summaries.
3. `Customer Flows` — Home, catalog, product details, cart, checkout, login, and order confirmation.
4. `Admin Flows` — dashboard, products, categories, order list, and order detail.
5. `Responsive QA` — representative frames at 390 px, 768 px, 1024 px, and 1440 px.

Figma variables and component variant names should map directly to Tailwind tokens and React props. Avoid one-off values that cannot be represented in the code design system.

### Tailwind foundations

Refine `client/src/styles.css` so it is the source of truth for:

- Semantic colors: `canvas`, `surface`, `surface-muted`, `text`, `text-muted`, `brand`, `brand-soft`, `brand-strong`, `floral-accent`, `success`, `warning`, `danger`, and border strengths. Brand tokens should resolve primarily to ivory, blush, dusty pink, muted rose, and berry/plum values.
- Type roles: display, page title, section title, body, small body, label, caption, and numeric/tabular text.
- Spacing and layout: page gutters, section spacing, readable content width, storefront maximum width, and admin content width.
- Shape: a small, deliberate radius scale instead of unrelated per-page values.
- Elevation: border-only, low, medium, and overlay shadows.
- Motion: fast, standard, and slow durations plus standard easing curves.
- Layering: announcement bar, sticky app bar, dropdown, drawer backdrop, drawer, toast, and modal z-index values.

Keep reusable component classes for high-value primitives, but use Tailwind utilities for page composition. Do not hide complex layout behavior in large custom CSS selectors.

### Dark mode strategy

Dark mode must preserve the soft pink floral identity instead of becoming a black or dark-green variant:

- Use deep plum, rose-charcoal, and muted berry surfaces rather than pure black.
- Use warm ivory for primary text, dusty pink for secondary text and borders, and brighter blush accents for focus, selection, active navigation, and primary actions.
- Keep floral imagery natural; add only a subtle theme-specific overlay when needed for text contrast.
- Define all light and dark values behind the same semantic tokens so components never hard-code theme-specific colors.
- Support `system`, `light`, and `dark` preferences. Default to `system` until the user explicitly chooses another mode.
- Persist the preference locally because it is device presentation state, not private account data.
- Apply the resolved theme before React paints to prevent a flash of the wrong theme.
- Set the browser `color-scheme` so form controls, scrollbars, and native UI match the selected mode.
- Put an accessible theme control in the customer account area and administrator shell; expose all three choices in a labeled menu rather than relying only on an ambiguous sun/moon icon.
- Recheck every hover, focus, disabled, error, success, skeleton, backdrop, and image-overlay state in both themes.

### Component primitives

Create a small shared UI layer under `client/src/components/ui/`:

- `Button` with primary, secondary, quiet, destructive, icon, loading, and disabled states.
- `IconButton` with consistent target size, tooltip/accessible label requirements, hover, active, and focus states.
- `Badge` and `StockIndicator` with semantic variants.
- `Field`, `Input`, `Select`, and `Textarea` wrappers with hint/error states.
- `Surface` or `Card` for shared border, radius, and shadow behavior.
- `Skeleton`, `ProductCardSkeleton`, `PageHeaderSkeleton`, `CartSkeleton`, `CheckoutSkeleton`, and `OrderSkeleton`.
- `Drawer` for customer and administrator mobile navigation.
- `ThemeSelector` for the accessible `system`, `light`, and `dark` preference.
- `InlineNotice`, `EmptyState`, and `Toast` for non-blocking feedback.

Do not attempt a broad component abstraction before two real call sites demonstrate the same pattern.

## Motion and Interaction Specification

Use Tailwind transitions and CSS keyframes; a new animation runtime is not required for this scope.

### Motion tokens

- Fast feedback: approximately 120–160 ms for color, border, and pressed states.
- Standard transition: approximately 180–240 ms for hover elevation, dropdowns, and small reveals.
- Large surface transition: approximately 240–320 ms for drawers and backdrops.
- Use decelerating easing for entrances and accelerating easing for exits.
- Limit transforms to `transform` and `opacity` where possible to avoid layout/repaint cost.

### Required interactions

- Product cards: subtle image scale, surface lift/border change, and clear keyboard-focus equivalent.
- Buttons: hover, pressed, focus-visible, disabled, and loading feedback with no width jump.
- App bar: stable sticky behavior and subtle shadow/border change after scroll.
- Customer/admin drawers: backdrop fade and side-panel slide; close on Escape, backdrop click, route change, and explicit close.
- Search: animated expansion without shifting the content unexpectedly.
- Filters: mobile drawer/sheet behavior and visible applied-filter count.
- Cart count: brief scale feedback after a successful add without repeatedly announcing decorative motion.
- Page content: a very light one-time entrance only where it improves orientation; do not animate every list item.
- Skeleton shimmer: one continuous gradient animation, replaced without a large crossfade or layout shift.

### Accessibility constraints

- Honor `prefers-reduced-motion` for animations, smooth scrolling, shimmer, and transform effects.
- Hover must never be the only way to discover information or an action.
- Drawers need focus containment, focus restoration, an accessible name, and body-scroll locking.
- Maintain a minimum 44 px interactive target on touch layouts.
- Preserve visible focus and meet WCAG AA contrast for text and controls.

## Data Fetching and Cache Architecture

### Query layer

Add TanStack Query to the client and mount one `QueryClientProvider` in `client/src/main.jsx`. Replace page-level `useAsync` usage incrementally with feature hooks under `client/src/queries/`:

- `queryKeys.js`
- `useCategoriesQuery.js`
- `useProductsQuery.js`
- `useProductQuery.js`
- `useCartQuery.js`
- `useOrdersQuery.js`
- `useOrderQuery.js`
- administrator query and mutation hooks

Normalize filter objects before constructing query keys so equivalent URLs share the same cache entry. Use placeholder/previous data for pagination so the grid does not disappear between pages.

Update `client/src/services/api.js` so every GET can receive an `AbortSignal`. Preserve `AbortError` instead of converting it into a generic offline error. Continue using the existing `ApiError` shape for real network, parsing, and HTTP failures.

### Initial cache policy

These values are starting points and should be validated during QA:

| Resource                  | Stale time | Refresh behavior                                               |          Cache/GC |
| ------------------------- | ---------: | -------------------------------------------------------------- | ----------------: |
| Categories                | 10 minutes | Focus/reconnect                                                |        30 minutes |
| Product lists             | 20 seconds | Focus/reconnect; 30-second foreground polling on catalog pages |        10 minutes |
| Product detail            | 15 seconds | Focus/reconnect; 30-second foreground polling                  |        10 minutes |
| Authenticated cart        |  5 seconds | Focus/reconnect; 10-second polling while checkout is visible   | User session only |
| Customer order list       | 30 seconds | Focus/reconnect                                                |        10 minutes |
| Pending order detail      | 15 seconds | Focus/reconnect; optional foreground polling                   |        10 minutes |
| Completed order detail    |  5 minutes | Focus/reconnect                                                |        30 minutes |
| Admin catalog/order lists | 15 seconds | Focus/reconnect and mutation invalidation                      |        10 minutes |

Polling must stop when the tab is hidden and when the relevant route is not mounted.

### Retry, ownership, and invalidation rules

- Retry GET network failures and transient `5xx` responses at most twice with backoff and jitter.
- Do not retry `4xx` responses automatically.
- Do not automatically retry mutations. Checkout remains protected by its idempotency key, but a retry should still be an explicit user action.
- Scope authenticated query keys by `user.id` where data is user-specific.
- On login/register, establish the new user and fetch their cart.
- On logout, cancel in-flight authenticated requests and remove session, cart, and order data from the cache.
- On cart add/update/remove, write the returned server cart into the cache, then invalidate affected catalog/product stock if necessary.
- On checkout success, set the cart to empty, invalidate product stock and customer orders, and seed the new order detail/confirmation cache.
- On checkout stock conflict, write the server's refreshed cart into cache and preserve form values.
- On admin product/inventory mutation, invalidate public product lists, product detail, admin product lists, and affected carts.
- On admin order cancellation, invalidate the order, order lists, and product inventory because stock is restored.

Avoid localStorage persistence for authenticated cart, order, or session data. The cookie-authenticated server remains authoritative and shared-browser data must not leak between accounts.

## Live Stock Experience

### Shared stock presentation

Add a `StockIndicator` component that receives `stockQuantity`, optional requested quantity, and optional last-updated time.

Customer wording:

- `0 available` → `Out of stock` with a neutral-danger treatment and disabled purchase action.
- `1–5 available` → `Only N left` with a warning treatment.
- More than `5` → `N in stock` with a success treatment.
- Loading/refetching → keep the last known value visible and add a subtle updating state; do not replace useful content with a spinner.

### Catalog and product details

- Display stock directly on every `ProductCard` beneath price/category metadata.
- Keep product card and product-detail Add to Cart controls synchronized with the same cached product data.
- Update product details to use the shared wording and indicator rather than page-specific stock text.
- Announce an out-of-stock transition politely when it occurs while the user is viewing the product.

### Cart and checkout

- Show `N available · M in your cart` for every checkout line.
- Show `Stock checked just now` or a concise last-checked timestamp in the order summary.
- Refresh the cart on checkout mount, every 10 seconds while visible, on focus/reconnect, and immediately before submission.
- Disable `Place order` if any line is inactive, out of stock, or below the requested quantity.
- If stock changes, retain delivery-address input, highlight only affected lines, and explain the required correction.
- Keep the existing cart revision and transactional order creation as the final race-condition protection.

No database or public catalog API change is expected for the first pass because current responses already include `stock_quantity`. Add server work only if implementation discovers an endpoint that omits the field or if an explicit lightweight stock endpoint is needed to reduce polling payload size.

## Navigation, Labels, and User Identity

### Customer app bar

Refactor `StorefrontLayout.jsx` into smaller pieces if needed:

- `AnnouncementBar`
- `StorefrontAppBar`
- `DesktopNavigation`
- `MobileNavigationDrawer`
- `AccountMenu`

Desktop behavior:

- Show `Hi, {firstName}` beside the account icon at suitable widths.
- Use the full name in the accessible label and account menu.
- Keep long names constrained with truncation so search/cart controls never overflow.
- Signed-out state reads `Sign in` rather than reserving blank name space.

Mobile behavior:

- Keep the app bar compact.
- Show the full user name and email at the top of the navigation/account drawer.
- Include Account, My Orders, Cart, and Sign out in a clearly separated account section.

### Administrator shell

- Replace the desktop horizontal navigation in `AdminLayout.jsx` with a fixed-width sidebar.
- Keep the current user name/email visible in the desktop sidebar footer or top bar.
- Show the administrator's name inside the mobile drawer instead of hiding it below the `sm` breakpoint.
- Include a clear active-route marker, collapsed-safe icons, and a sign-out action.
- Preserve the skip link and ensure the main content scrolls independently without horizontal overflow.

### Label replacements

Make these exact changes:

| Current location                          | Current label       | New label           | Destination |
| ----------------------------------------- | ------------------- | ------------------- | ----------- |
| Authentication shell back link            | `Storefront`        | `Home`              | `/`         |
| Administrator cross-app navigation        | `Storefront`        | `Floréa Haven`      | `/`         |
| Administrator dashboard card, if retained | `Storefront review` | `View Floréa Haven` | `/`         |

Search the entire client for remaining user-facing `Storefront` strings and update tests with the new accessible names.

## Skeleton Loading System

### Base behavior

Replace duplicated `animate-pulse` blocks with the shared skeleton primitives. The base `Skeleton` should:

- Use a low-contrast blush/petal surface plus a restrained pearl-pink animated gradient shimmer.
- Inherit radius from the content type.
- Accept dimensions through class names without inline styles.
- Disable shimmer under reduced motion while retaining the placeholder.
- Keep decorative blocks `aria-hidden="true"` and expose one concise `role="status"` label per loading region.

### Required page skeletons

- Home: hero copy/media placeholder only if the hero becomes data-dependent; category and featured-product geometry otherwise.
- Catalog: filter sidebar/header, result count, and product cards matching the final responsive columns.
- Product detail: media, breadcrumb, title, price, stock, copy, and purchase control.
- Cart: line items and summary panel.
- Checkout: delivery form and sticky order summary.
- Orders: order cards/table rows.
- Order detail/confirmation: status, item list, totals, and delivery card.
- Admin lists: page heading, toolbar, table rows/cards, and pagination.

Use skeletons only for the first unresolved load. During background refetch, keep stale content visible and show a subtle non-blocking updating indicator.

## Responsive Page Improvements

### Breakpoint expectations

- **320–639 px:** single-column content, 16 px minimum gutters, drawer navigation, stacked checkout/cart summaries, and no horizontal page scrolling.
- **640–1023 px:** increased gutters, two-column catalog where space permits, compact app bar, and filters in a drawer/sheet.
- **1024–1279 px:** desktop customer navigation, administrator sidebar, three-column catalog, and two-column checkout.
- **1280 px and above:** controlled maximum content width, four-column featured products where appropriate, and balanced whitespace rather than stretched cards.

### High-priority page refinements

- Home: improve hero text readability on mobile, CTA hierarchy, section rhythm, image cropping, and card consistency.
- Catalog: keep filters discoverable, show active filter count/chips, retain previous results during fetching, and prevent layout movement from result-count changes.
- Product detail: place stock and purchase actions near price, use a sticky purchase summary only where it does not obscure content, and maintain a single-column mobile reading order.
- Cart/checkout: make order summary sticky only on desktop, keep totals visible, and place validation close to affected items/fields.
- Auth: keep form width/readability stable, replace the large image with an efficient responsive image treatment, and make the Home link obvious.
- Admin: use responsive tables at desktop and labeled cards/rows on narrow screens instead of forcing horizontal scrolling for core actions.

## Implementation Phases

### Phase 1 — Visual inventory and Figma specification

- Handoff: [visual inventory and audit](docs/ui-ux/phase-1-visual-audit.md)
- Handoff: [Figma specification](docs/ui-ux/phase-1-figma-specification.md)
- Handoff: [machine-readable variable specification](docs/ui-ux/figma-variable-spec.json)

- [ ] Capture current customer and admin screens at the target breakpoints.
- [x] Audit contrast, spacing, type hierarchy, overflow, touch targets, and duplicated patterns.
- [x] Approve light and dark soft-pink floral mood boards and explicitly reject off-brand black, dark-green, corporate, or overly ornate alternatives.
- [x] Define Figma foundations and map every token to Tailwind.
- [ ] Approve representative light and dark Home, catalog, checkout, and admin-list frames before broad implementation.

**Exit gate:** The visual direction, navigation anatomy, component states, and responsive rules are unambiguous.

### Phase 2 — Code design system and skeleton primitives

- [x] Refine semantic tokens in `styles.css`.
- [x] Add shared UI primitives and stock states.
- [x] Add motion utilities and reduced-motion fallbacks.
- [x] Build the shared shimmer skeleton system.
- [ ] Add a small component showcase/test route only in development if it speeds visual QA.

**Exit gate:** Common controls and loaders can be reused without page-specific visual overrides.

### Phase 3 — Dark mode and theme preference

- [ ] Define approved dark-mode Figma variables and representative customer/admin frames.
- [x] Add dark values for every semantic color, elevation, border, backdrop, and skeleton token.
- [x] Add a small theme provider with `system`, `light`, and `dark` preferences.
- [x] Resolve and apply the theme before the first paint to prevent flashing.
- [x] Persist explicit preference changes and respond to system-theme changes while `system` is selected.
- [x] Add accessible theme controls to the storefront account area, mobile drawer, and administrator shell.
- [x] Verify native controls and browser chrome through `color-scheme`.
- [x] Add tests for initial resolution, persistence, system changes, and the theme control's accessible state.
- [ ] Visually verify all primitives, skeletons, navigation shells, imagery, and semantic feedback states in both themes.

Implementation note (2026-09-01): the production code and automated checks are complete. Applying the variables and representative frames in Figma still needs a target design file, and connected-browser visual QA is pending a compatible local browser-controller runtime.

**Exit gate:** Light and dark modes both retain the soft pink floral identity, render without a theme flash, meet WCAG AA contrast, and work with system or explicit preference.

### Phase 4 — Stable fetching and caching

- [ ] Install and configure TanStack Query.
- [ ] Make API GET functions signal-aware and preserve abort errors.
- [ ] Add normalized query keys and catalog/cart/order hooks.
- [ ] Migrate Home, catalog, and product detail away from `useAsync`.
- [ ] Migrate cart, checkout, customer orders, and admin queries.
- [ ] Implement cache ownership, retry, refresh, and invalidation rules.
- [ ] Remove `useAsync.js` only after no imports remain.

**Exit gate:** Duplicate consumers share a response, stale content remains visible during refresh, obsolete requests cancel cleanly, and mutations update/invalidate the right views.

### Phase 5 — Navigation, user identity, and auth flow

- [ ] Modernize the customer app bar and mobile drawer.
- [ ] Display the signed-in user's first name on desktop and full identity in the mobile drawer.
- [ ] Convert the administrator desktop navigation to a sidebar.
- [ ] Replace all user-facing `Storefront` labels.
- [ ] Change direct customer login/registration redirects from `/account` to `/`.
- [ ] Preserve safe protected-route returns and `/admin` for administrators.
- [ ] Update routing/auth/navigation tests.

**Exit gate:** All roles land in the correct location and navigation works by keyboard at every target breakpoint.

### Phase 6 — Catalog and live stock

- [ ] Add shared stock indicators to product cards and product detail.
- [ ] Add foreground polling plus focus/reconnect refresh.
- [ ] Synchronize Add to Cart disabled states with refreshed inventory.
- [ ] Refine catalog filters, cards, pagination, empty states, and mobile layout.
- [ ] Add tests for stock thresholds and stock transitions.

**Exit gate:** A visible catalog item updates without a full reload and never remains purchasable after refreshed stock reaches zero.

### Phase 7 — Cart, checkout, and order experience

- [ ] Show available and requested quantities per cart/checkout line.
- [ ] Add checkout last-checked/updating feedback.
- [ ] Refresh immediately before submission without clearing form input.
- [ ] Improve conflict messaging and focus management.
- [ ] Apply responsive layout, shared surfaces, motion, and skeletons.
- [ ] Preserve historical order semantics and confirmation clarity.

**Exit gate:** A stock change is clear and recoverable, address input is preserved, and the server remains the final checkout authority.

### Phase 8 — Remaining page polish and administrator UI

- [ ] Apply the design system to Home, auth, Account, order history, and error/empty states.
- [ ] Apply the sidebar shell and responsive table/card patterns to all administrator pages.
- [ ] Standardize saving, success, destructive confirmation, and failure feedback.
- [ ] Remove obsolete one-off styles and duplicated loading markup.

**Exit gate:** Customer and administrator pages feel like one product and use the same state language.

### Phase 9 — Verification and release

- [ ] Run client unit/component tests, server tests, lint, and production build.
- [ ] Add end-to-end coverage for the release-critical flows below.
- [ ] Test 320, 390, 768, 1024, 1280, and 1440 px widths.
- [ ] Test keyboard-only use, screen-reader landmarks/names, zoom to 200%, and reduced motion.
- [ ] Test light, dark, and system modes with no first-paint theme flash and no theme-specific contrast regression.
- [ ] Check slow 3G, offline/reconnect, duplicate mounts in React Strict Mode, and repeated focus changes.
- [ ] Check layout shift and image sizing on Home/catalog.
- [ ] Complete a Figma-to-build visual comparison at all approved breakpoints.

**Exit gate:** Automated checks pass and no critical accessibility, stale-data, inventory, navigation, or responsive defect remains.

## File-Level Change Map

Expected primary changes:

| Area                | Files                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| App providers       | `client/src/main.jsx`, new query client and theme provider configuration                               |
| API/caching         | `client/src/services/api.js`, `client/src/queries/*`, current `useAsync.js` consumers                  |
| Design system       | `client/src/styles.css`, new `client/src/components/ui/*`                                              |
| Theme preference    | new theme context/hook, pre-paint initialization, and theme control                                    |
| Customer navigation | `client/src/components/StorefrontLayout.jsx` and extracted navigation components                       |
| Admin navigation    | `client/src/components/AdminLayout.jsx`                                                                |
| Authentication UX   | `client/src/components/AuthShell.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `RouteGuards.jsx`          |
| Stock UI            | `ProductCard.jsx`, `ProductDetailsPage.jsx`, `CartPage.jsx`, `CheckoutPage.jsx`, `AddToCartButton.jsx` |
| Skeletons           | `ProductGridSkeleton.jsx` plus page-level loading branches                                             |
| Tests               | `AuthFlows.test.jsx`, `CatalogPages.test.jsx`, cart/order/admin flow tests, new shared-component tests |

Potential supporting changes:

- `client/package.json` and root lockfile for TanStack Query.
- API contract documentation only if a lightweight stock endpoint, cache headers, or response field changes.
- Server tests only if the API response shape or stock endpoint changes.

## Test Plan

### Component and integration tests

- Stock indicator renders exact normal, low, and zero-stock states.
- Product purchase controls disable when cached stock becomes zero.
- Skeleton regions expose one useful loading status and no duplicate announcements.
- The initial theme follows an explicit saved preference or the current system preference without flashing.
- The system theme updates while `system` is selected and does not override an explicit light/dark choice.
- The theme control exposes its label, selected option, and keyboard interaction correctly.
- Customer direct login goes Home.
- Customer protected-route login returns to the intended route.
- Administrator direct login goes to Admin.
- Authenticated visits to login/register follow the same role rules.
- User name appears in the desktop app bar and mobile drawer without layout overflow.
- Drawer opens/closes by button, Escape, backdrop, and route selection; focus returns to the trigger.
- Paginated catalog keeps previous data while the next page loads.
- Query cancellation does not display a false offline error.
- Logout removes user-specific cart and order caches.
- Cart and admin inventory mutations invalidate the correct stock views.
- Checkout stock conflict preserves all entered delivery fields and focuses the explanation.

### Release-critical end-to-end flows

1. Browse catalog → see stock → sign in → return Home → add to cart → checkout.
2. Open Checkout while stock changes in Admin → observe refreshed availability → correct quantity → place order once.
3. Open a protected checkout URL signed out → sign in → return to Checkout.
4. Administrator signs in → uses responsive sidebar → changes inventory → customer catalog refreshes.
5. Sign out as one customer → sign in as another → verify no previous cart/order cache is visible.
6. Complete both customer and administrator journeys using keyboard-only navigation on mobile and desktop layouts.
7. Switch between system, light, and dark modes → reload and navigate across customer/admin pages → verify persistence, contrast, and no theme flash.

## Performance and Quality Budgets

- No loading transition should create a large geometry change between skeleton and content.
- Do not introduce background polling for routes that are not mounted or tabs that are hidden.
- Prefer CSS transforms/opacity for animation and avoid expensive perpetual effects outside skeleton loading.
- Use responsive image dimensions, lazy loading below the fold, and stable aspect ratios.
- Avoid duplicate catalog/category requests across Home, app navigation, and catalog consumers.
- Keep query cache payloads bounded through pagination and the specified garbage-collection times.
- Keep pre-paint theme initialization tiny and synchronous, with no network request or render-blocking dependency.
- Target no new critical accessibility violations and no horizontal overflow at 320 px.

## Risks and Mitigations

| Risk                                               | Mitigation                                                                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Polling creates unnecessary API load               | Poll only mounted visible routes, use shared cached requests, and tune intervals after measuring.                             |
| Cached authenticated data appears for another user | Include ownership in keys and cancel/remove user-scoped queries on logout or identity change.                                 |
| UI shows stock that changes during submission      | Keep the cart revision and transactional server check; refresh before submission and handle `409` without losing form state.  |
| Full visual rewrite creates regression churn       | Implement primitives and shells first, then migrate one vertical flow at a time behind small reviewable changes.              |
| Animation harms accessibility or performance       | Use short CSS motion, honor reduced motion, and avoid animating layout properties.                                            |
| Figma and Tailwind drift                           | Use matching semantic names and require a visual comparison at each phase gate.                                               |
| Visual work drifts away from the existing identity | Treat the soft pink floral palette, airy whitespace, and minimalist composition as review requirements, not optional styling. |
| Dark mode flashes or loses the floral identity     | Resolve the theme before React paints and use reviewed plum, rose-charcoal, blush, and ivory semantic tokens.                 |
| Administrator tables break on small screens        | Define narrow-screen labeled rows/cards instead of relying only on horizontal scroll.                                         |

## Definition of Done

- [ ] All nine requested improvements are implemented and traceable to the requirements table below.
- [ ] Customer and administrator screens retain the approved soft pink floral, airy, and minimalist identity at every target breakpoint.
- [ ] System, light, and dark preferences work across customer and administrator shells without a first-paint flash.
- [ ] Dark mode uses soft pink, plum, rose-charcoal, and ivory semantic colors and meets WCAG AA contrast.
- [ ] Customer login defaults to Home and all redirect exceptions are covered by tests.
- [ ] No visible user-facing `Storefront` label remains.
- [ ] Stock is visible in catalog and checkout, refreshes as specified, and remains server-authoritative.
- [ ] The customer UI visibly identifies the signed-in user.
- [ ] Customer app bar/mobile drawer and admin sidebar/mobile drawer pass keyboard and responsive QA.
- [ ] All first-load states use geometry-matched shared skeletons; background refresh keeps current content visible.
- [ ] Shared caching deduplicates requests, cancels stale work, protects account boundaries, and invalidates after mutations.
- [ ] Reduced motion, focus visibility, contrast, landmarks, labels, and touch targets pass manual review.
- [ ] `npm run lint`, `npm test`, and `npm run build` pass.
- [ ] Approved Figma frames and the production build are visually consistent at target breakpoints.

## Requirement Traceability

| Requested improvement                                        | Plan coverage                                            |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| 1. Better modern UI with Tailwind + Figma styling            | Visual direction/design-system specs; Phases 1, 2, and 8 |
| 2. Smooth animations, responsiveness, hover, app bar/sidebar | Motion/navigation/responsive specs; Phases 2, 5, and 8   |
| 3. Animated skeleton loader                                  | Skeleton specification; Phases 2, 7, and 8               |
| 4. Stable caching and fetching                               | Data-fetching specification; Phase 4                     |
| 5. Home after login instead of profile                       | Authentication redirect rules; Phase 5                   |
| 6. Replace `Storefront` label                                | Label replacement table; Phase 5                         |
| 7. Live stock in catalog and checkout/order flow             | Live-stock specification; Phases 6 and 7                 |
| 8. Display user's name in the UI/app bar                     | Customer app-bar specification; Phase 5                  |
| 9. Dark mode                                                 | Dark-mode strategy; Phases 1, 2, 3, and 9                |

## Recommended Delivery Order

Deliver the work as small vertical pull requests in phase order:

- **Phase 1 — Visual inventory and Figma specification:** approve light/dark direction, tokens, components, and responsive frames.
- **Phase 2 — Code design system and skeleton primitives:** build semantic foundations and shared UI states.
- **Phase 3 — Dark mode and theme preference:** add theme resolution, persistence, controls, and both-theme component QA.
- **Phase 4 — Stable fetching and caching:** add the query client, signal-aware requests, and feature query hooks.
- **Phase 5 — Navigation, user identity, and auth flow:** improve both shells, labels, user visibility, and redirects.
- **Phase 6 — Catalog and live stock:** modernize browsing and expose frequently refreshed availability.
- **Phase 7 — Cart, checkout, and order experience:** improve stock recovery, responsive composition, and feedback.
- **Phase 8 — Remaining page polish and administrator UI:** complete customer/admin migration in both themes.
- **Phase 9 — Verification and release:** run automated, responsive, accessibility, theme, performance, and visual QA.

Each pull request should keep the production build usable, include relevant tests, and avoid mixing unrelated server behavior with visual-only changes.
