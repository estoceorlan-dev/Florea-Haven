# Phase 1 Figma Specification

This document is the build-ready contract for the Floréa Haven Figma file. Variable,
component, variant, and frame names intentionally mirror Tailwind tokens and React props.

## File pages

Create these pages in order:

1. `Foundations`
2. `Components`
3. `Customer Flows`
4. `Admin Flows`
5. `Responsive QA`

Use the variable values in `figma-variable-spec.json`. Do not introduce a Figma-only
color, radius, shadow, spacing value, or breakpoint.

## Foundations page

### Semantic color variables

Create one `Color` collection with `Light` and `Dark` modes.

| Variable              | Light     | Dark      | Tailwind mapping        | Usage                  |
| --------------------- | --------- | --------- | ----------------------- | ---------------------- |
| `color/canvas`        | `#fffaf8` | `#211820` | `--color-canvas`        | Application background |
| `color/surface`       | `#ffffff` | `#2b2028` | `--color-surface`       | Cards, fields, menus   |
| `color/surface-muted` | `#fff1f5` | `#35262f` | `--color-surface-muted` | Supporting sections    |
| `color/text`          | `#3d2a31` | `#fff7f2` | `--color-text`          | Primary copy           |
| `color/text-muted`    | `#705b63` | `#d8bbc5` | `--color-text-muted`    | Secondary copy         |
| `color/brand`         | `#985168` | `#f2a9bd` | `--color-brand`         | Headings, active UI    |
| `color/brand-soft`    | `#f8e4ea` | `#4a2f3a` | `--color-brand-soft`    | Soft highlight         |
| `color/brand-strong`  | `#74374d` | `#ffd1dc` | `--color-brand-strong`  | Primary emphasis       |
| `color/floral-accent` | `#a64f6c` | `#e58da7` | `--color-floral-accent` | Labels and accents     |
| `color/success`       | `#39705a` | `#83c9a9` | `--color-success`       | Available/success      |
| `color/warning`       | `#8a5a18` | `#e5b76e` | `--color-warning`       | Low stock/caution      |
| `color/danger`        | `#9b405f` | `#f295b2` | `--color-danger`        | Error/destructive      |
| `color/border`        | `#ead9df` | `#523a47` | `--color-border`        | Default divider        |
| `color/border-strong` | `#d6b6c1` | `#73505f` | `--color-border-strong` | Hover/selected border  |

White or dark text placed on a filled semantic color must be tested as a separate pair.
Do not lower essential text opacity.

### Typography styles

| Figma style          | Family/weight       | Size and line height | Tailwind mapping                     |
| -------------------- | ------------------- | -------------------- | ------------------------------------ |
| `type/display`       | Iowan Old Style 400 | fluid 60–124 / 0.88  | `text-display font-display`          |
| `type/page-title`    | Iowan Old Style 400 | fluid 48–72 / 0.96   | `text-page-title font-display`       |
| `type/section-title` | Iowan Old Style 400 | fluid 40–60 / 1.0    | `text-section-title font-display`    |
| `type/body`          | Avenir Next 400     | 16 / 28              | `text-body`                          |
| `type/body-small`    | Avenir Next 400     | 14 / 22              | `text-body-sm`                       |
| `type/label`         | Avenir Next 700     | 11 / 16, 0.12 em     | `text-label` plus uppercase/tracking |
| `type/caption`       | Avenir Next 400     | 12 / 18              | `text-caption`                       |
| `type/numeric`       | Avenir Next 600     | 14 / 20, tabular     | `text-numeric tabular-nums`          |

Use Baskerville and Times New Roman as display fallbacks, and Segoe UI and Arial as sans
fallbacks. Limit display italics to short brand or editorial phrases.

### Spacing and grids

- Base spacing follows Tailwind's 4 px scale. Product composition uses 4, 8, 12, 16,
  20, 24, 32, 40, 48, 64, 80, 96, and 112 px only.
- Storefront maximum width: 1280 px. Administrator maximum width: 1440 px. Readable text
  width: 672 px.
- Page gutters: 16 px mobile, 24 px tablet, 40 px desktop.
- Customer desktop grid: 12 columns, 24 px gutter. Tablet: 8 columns, 24 px gutter.
  Mobile: 4 columns, 16 px gutter.
- Admin desktop shell: 256 px sidebar, flexible content, 24 px internal gutter.
- Major section spacing: 80 px mobile, 96 px tablet, 112 px desktop.

### Shape, elevation, motion, and icons

| Role                    | Value                      | Tailwind mapping    |
| ----------------------- | -------------------------- | ------------------- |
| `radius/control`        | 8 px                       | `rounded-control`   |
| `radius/card`           | 12 px                      | `rounded-card`      |
| `radius/overlay`        | 16 px                      | `rounded-overlay`   |
| `elevation/border-only` | semantic border, no shadow | `border-border`     |
| `elevation/low`         | subtle 2-layer shadow      | `shadow-low`        |
| `elevation/medium`      | 16×40 px soft plum shadow  | `shadow-medium`     |
| `elevation/overlay`     | 24×64 px soft plum shadow  | `shadow-overlay`    |
| `motion/fast`           | 140 ms                     | `--motion-fast`     |
| `motion/standard`       | 220 ms                     | `--motion-standard` |
| `motion/slow`           | 300 ms                     | `--motion-slow`     |

Use Lucide line icons at 16, 20, or 24 px with 1.5–2 px strokes. Interactive targets are
44 px minimum even when the visible icon is smaller.

## Components page

Use slash-separated component and property names. Every interactive component includes
default, hover, focus-visible, pressed, disabled, and loading states where applicable,
in both color modes.

| Component         | Required properties/variants |
| ----------------- | ---------------------------- |
| `Button`          | `emphasis=primary            | secondary                  | quiet                       | destructive`, `size=default | compact     | icon`, `state=default    | hover | focus  | pressed | disabled | loading` |
| `Field`           | `control=input               | select                     | textarea`, `state=default   | focus                       | error       | disabled`, `support=none | hint  | error` |
| `Badge`           | `tone=neutral                | brand                      | success                     | warning                     | danger`     |
| `StockIndicator`  | `state=loading               | available                  | low                         | unavailable                 | updating`   |
| `Surface`         | `elevation=border            | low                        | medium`, `density=customer  | admin`                      |
| `Skeleton`        | `shape=text                  | image                      | circle                      | card`, `motion=shimmer      | reduced`    |
| `Drawer`          | `side=left                   | right`, `state=closed      | open`, `context=customer    | admin                       | filters`    |
| `AppBar/Customer` | `viewport=mobile             | desktop`, `auth=signed-out | signed-in`, `search=closed  | open`                       |
| `Sidebar/Admin`   | `state=expanded              | drawer`, `active=dashboard | orders                      | products                    | categories` |
| `ProductCard`     | `stock=available             | low                        | out`, `featured=true        | false`, `state=default      | hover       | focus`                   |
| `InlineNotice`    | `tone=info                   | success                    | warning                     | danger`, `action=none       | present`    |
| `EmptyState`      | `context=catalog             | cart                       | orders                      | admin`, `action=none        | primary`    |
| `Pagination`      | `viewport=mobile             | desktop`, `state=first     | middle                      | last                        | loading`    |
| `OrderSummary`    | `context=cart                | checkout                   | confirmation`, `stock=valid | conflict`                   |

Component labels and icon-only controls must include their accessible names in Figma's
component description.

## Representative frame specifications

### Home

- **390:** compact app bar, hero copy anchored above the image-safe area, one primary CTA
  followed by a lower-emphasis link, single-column content, two-column product grid.
- **768:** compact app bar, wider hero copy, two-column product grid, three category cards
  when labels remain readable.
- **1024:** desktop app bar, 55/45 hero image split, three-column product grid.
- **1440:** bounded 1280 px content, four featured products, balanced negative space.
- Dark frame uses the plum canvas and keeps hero photography natural with only a subtle
  plum readability overlay.

### Catalog

- **390/768:** search and filter trigger remain visible; filters open in a right drawer;
  applied count is displayed; cards remain two columns only when names and prices fit.
- **1024/1440:** 210–240 px filter rail and three-column results; pagination keeps the
  grid geometry stable.
- Loading uses product-card skeletons. Refresh retains existing cards and shows a quiet
  updating state.

### Checkout

- **390/768:** delivery fields first, order summary second, no sticky panel, validation
  adjacent to each field and stock conflict announced before the form.
- **1024/1440:** flexible form plus 360 px sticky summary. The place-order control stays
  inside the summary and keeps its width while loading.
- Current stock, requested quantity, and last-checked status appear on each line.

### Admin orders list

- **390/768:** compact top bar and left drawer; each order is a labeled record card with
  customer, status, total, date, and a visible detail action.
- **1024/1440:** 256 px persistent sidebar, slim context bar, filter grid, responsive data
  table, and bounded admin content width.
- Admin styling uses the same palette and components with denser spacing and minimal
  decoration.

## Navigation anatomy

### Customer desktop

Announcement bar → brand → primary navigation → search → visible first name/account →
cart. The app bar remains sticky and adds only a subtle border/shadow after scroll.

### Customer mobile/tablet

Menu → centered/left brand → search/cart. The left drawer contains primary navigation,
full signed-in identity, theme selector, and account/sign-out actions. It closes on
Escape, backdrop click, route selection, and explicit close, then restores focus.

### Administrator desktop

Persistent sidebar contains Dashboard, Orders, Products, Categories, and Floréa Haven.
The top bar contains page context, theme selector, identity, and sign out.

### Administrator mobile/tablet

Compact top bar with brand/context and menu trigger. A modal left drawer contains the
same navigation and identity information as desktop.

## Approval checklist

- The light and dark palettes retain the soft pink floral identity.
- All normal text/background pairs meet WCAG AA before opacity is applied.
- Navigation anatomy and responsive changes match this document.
- Hover is paired with a focus-visible equivalent.
- Drawers document focus containment, focus restoration, Escape, backdrop, and scroll
  lock behavior.
- Loading skeletons match final geometry; background refresh preserves content.
- No user-facing `Storefront` label appears in approved frames.
- No unrepresented one-off token is introduced during Figma production.

The frame specifications are approved for production. Screenshot evidence and the
connected Figma canvas are the remaining mechanical handoff steps.
