# Phase 1 Visual Inventory and Audit

**Status:** Code-backed audit complete; responsive screenshot capture pending a connected preview browser

## Scope and method

This audit covers the customer storefront, authentication flow, cart and checkout,
customer orders, and administrator workspace. Findings are based on the current React
routes, rendered component structure, Tailwind utilities, semantic tokens, and a healthy
local application response.

The required 390, 768, 1024, and 1440 px screenshots are not included yet because no
preview browser was connected during this pass. The capture matrix and filenames below
are the source of truth for completing that evidence without changing the approved
direction.

## Screen inventory

| Surface               | Routes                                                  | Primary states to capture                                                              |
| --------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Customer discovery    | `/`, `/products`, `/products/:productId`                | Loaded, first-load skeleton, empty catalog, error, low stock, out of stock             |
| Authentication        | `/login`, `/register`                                   | Default, validation error, submitting, server error                                    |
| Customer purchase     | `/cart`, `/checkout`                                    | Empty, populated, unavailable item, validation error, submitting, stale-stock conflict |
| Customer account      | `/account`, `/orders`, `/orders/:orderId`, confirmation | Default, empty history, pending order, completed order, error                          |
| Administrator shell   | `/admin`                                                | Dashboard, active navigation, signed-in identity                                       |
| Administrator catalog | `/admin/products`, `/admin/categories`                  | List, filters, editor form, saving, destructive action, empty/error                    |
| Administrator orders  | `/admin/orders`, `/admin/orders/:orderId`               | List, filters, detail, status action, loading/error                                    |

## Responsive capture matrix

Capture the representative routes below in both light and dark modes after Phase 3 makes
the modes available. Use full-page PNGs and keep browser zoom at 100%.

| Frame                        | 390 px  | 768 px  | 1024 px | 1440 px |
| ---------------------------- | :-----: | :-----: | :-----: | :-----: |
| Home `/`                     | Pending | Pending | Pending | Pending |
| Catalog `/products`          | Pending | Pending | Pending | Pending |
| Checkout `/checkout`         | Pending | Pending | Pending | Pending |
| Admin orders `/admin/orders` | Pending | Pending | Pending | Pending |

Filename pattern: `{surface}-{theme}-{width}.png`, for example
`catalog-light-390.png`. Store captures in `docs/ui-ux/screenshots/`.

## Audit findings

| ID     | Priority | Area                 | Current evidence                                                                                                                                                                                                              | Approved response                                                                                                                                        | Delivery phase                                 |
| ------ | -------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| AUD-01 | High     | Contrast             | The original `floral-accent`/`clay` value had 4.09:1 contrast on the ivory canvas while it is used for 10–12 px labels and errors. Several `text-ink/40` and `text-ink/45` utilities are also likely below AA for small text. | Use `#a64f6c` for accent text (5.13:1 on canvas). Reserve lower-opacity text for non-essential decoration; use `text-muted` for readable secondary copy. | Phase 1 token correction and Phase 8 migration |
| AUD-02 | High     | Touch targets        | Shared icon buttons are 40×40 px. Cart quantity controls are 36×36 px and several text-only actions have no 44 px touch area.                                                                                                 | Use a 44×44 px minimum interactive target on touch layouts; compact visual icons may remain 16–20 px.                                                    | Phases 2, 5, 7, 8                              |
| AUD-03 | High     | Mobile navigation    | The customer menu is an absolute dropdown without focus containment, focus restoration, Escape handling, or body-scroll locking.                                                                                              | Replace it with the approved modal drawer anatomy.                                                                                                       | Phase 5                                        |
| AUD-04 | High     | Admin responsiveness | Products and orders rely on `overflow-x-auto` tables and the administrator navigation is a horizontally scrolling header.                                                                                                     | Use a desktop sidebar at 1024 px and above; render labeled record cards below 768 px.                                                                    | Phases 5 and 8                                 |
| AUD-05 | Medium   | Loading states       | Cart, checkout, orders, confirmation, route guards, and administrator lists still mix pulse blocks and spinners.                                                                                                              | Use geometry-matched shared skeletons only for initial loads and preserve content during refresh.                                                        | Phases 2, 7, 8                                 |
| AUD-06 | Medium   | Surface consistency  | Pages repeatedly hard-code `bg-white`, `bg-mist`, `border-evergreen/10`, and unrelated shadow strengths.                                                                                                                      | Migrate to `surface`, `surface-muted`, semantic borders, and the approved four-level elevation model.                                                    | Phases 2, 3, 8                                 |
| AUD-07 | Medium   | Typography           | Display hierarchy is recognizable, but page titles and small uppercase labels repeat one-off sizes, tracking, and opacity values.                                                                                             | Use the approved display, page-title, section-title, body, body-small, label, caption, and numeric roles.                                                | Phases 2 and 8                                 |
| AUD-08 | Medium   | Customer identity    | The storefront account control exposes the signed-in name only through its accessible label.                                                                                                                                  | Show the first name at desktop widths and full identity inside the mobile drawer.                                                                        | Phase 5                                        |
| AUD-09 | Medium   | Labels               | `Storefront` remains visible in the auth shell and administrator navigation.                                                                                                                                                  | Use `Home` in customer contexts and `Floréa Haven` for the administrator cross-application link.                                                         | Phase 5                                        |
| AUD-10 | Medium   | Layout rhythm        | Customer sections range from 56–112 px vertical padding and admin panels use several unrelated gaps and widths.                                                                                                               | Use 80/96/112 px section spacing by viewport and the documented layout grid.                                                                             | Phases 2 and 8                                 |
| AUD-11 | Medium   | Filters              | The catalog filter overlay does not expose an applied-filter count and shares the drawer accessibility gaps.                                                                                                                  | Use the shared drawer, visible applied count, removable chips, and stable result-count geometry.                                                         | Phase 6                                        |
| AUD-12 | Low      | Motion               | Hover transitions are generally restrained, but durations are duplicated and some image transitions run for 700 ms.                                                                                                           | Use fast/standard/slow motion tokens; keep large image motion at or below 320 ms unless it is purely decorative.                                         | Phases 2 and 8                                 |

## Contrast decisions

The ratios below use the actual or approved solid token pair. AA targets are 4.5:1 for
normal text and 3:1 for large text and meaningful UI graphics.

| Pair                                      |          Ratio | Decision                |
| ----------------------------------------- | -------------: | ----------------------- |
| Light `text` on `canvas`                  |        12.89:1 | Approved                |
| Light `text-muted` on `canvas`            |         6.03:1 | Approved                |
| Light `brand` on `canvas`                 |         5.46:1 | Approved                |
| Light revised `floral-accent` on `canvas` |         5.13:1 | Approved for small text |
| Light `success` on `surface`              |         5.77:1 | Approved                |
| Light `warning` on `surface`              |         5.90:1 | Approved                |
| Light `danger` on `surface`               |         6.38:1 | Approved                |
| Dark `text` on `canvas`                   |        16.31:1 | Approved                |
| Dark `text-muted` on `canvas`             |         9.73:1 | Approved                |
| Dark `brand` on `canvas`                  |         9.20:1 | Approved                |
| Dark semantic feedback on `surface`       | 7.25:1 minimum | Approved                |

Opacity changes must be tested against the composited background; a passing base token
does not make `text-token/40` automatically accessible.

## Approved visual direction

### Light mood board

- Warm ivory canvas, white content surfaces, and petal-pink supporting sections.
- Dusty rose and berry for navigation, headings, primary actions, and focus.
- Natural floral photography with pale, diffused light and uncluttered crops.
- Fine borders, very soft shadows, generous whitespace, serif display type, and crisp
  sans-serif controls.

### Dark mood board

- Deep plum canvas and rose-charcoal surfaces; never pure black.
- Warm ivory primary text, dusty pink secondary text, and brighter blush focus/active
  states.
- Natural photography with at most a subtle plum overlay for text contrast.
- The same radius, spacing, typography, and restrained elevation as light mode.

### Explicitly rejected directions

- Black-and-white luxury minimalism that removes the pink floral signature.
- Dark-green botanical branding or large forest-green surfaces.
- Corporate blue/gray administrator styling that feels like a separate product.
- Vintage ornament, script-heavy typography, heavy glassmorphism, neon color, thick
  shadows, and pill-shaped treatment on every control.

## Approved responsive rules

- **320–639 px:** 16 px gutters, one content column, 44 px targets, modal drawers,
  stacked summaries, and no page-level horizontal scrolling.
- **640–1023 px:** 24 px gutters, two-column catalog where appropriate, compact customer
  chrome, drawer filters, and labeled admin record cards.
- **1024–1279 px:** 40 px gutters, desktop customer navigation, persistent admin sidebar,
  three-column catalog, and two-column cart/checkout.
- **1280 px and above:** content remains bounded to 1280 px for the storefront and 1440 px
  for admin; featured grids may use four columns without stretching cards.

## Phase 1 exit decision

The visual direction, navigation anatomy, component states, and responsive rules are
approved in the companion Figma specification. Phase 1 remains partially open only for
the evidence screenshots and production of the frames inside a connected Figma file.
