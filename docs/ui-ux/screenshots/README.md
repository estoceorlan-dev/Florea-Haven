# Phase 1 Screenshot Evidence

Capture full-page PNGs at 100% browser zoom after loading deterministic catalog,
customer-cart, checkout, and administrator-order data.

Required widths are 390, 768, 1024, and 1440 px. Capture Home, catalog, checkout, and
administrator orders in light and dark modes using this filename pattern:

`{surface}-{theme}-{width}.png`

Examples:

- `home-light-390.png`
- `catalog-dark-768.png`
- `checkout-light-1024.png`
- `admin-orders-dark-1440.png`

Before accepting a capture, confirm:

- no horizontal page overflow;
- no clipped heading, price, stock message, field, table/card label, or action;
- app bar, drawer/sidebar, and sticky summary match the approved breakpoint anatomy;
- the visible state is stable and not a transient first-load skeleton unless the capture
  is specifically documenting that skeleton;
- customer or administrator data contains no real personal information;
- light and dark images use equivalent content and scroll position.
