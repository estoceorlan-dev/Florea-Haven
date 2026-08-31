CREATE UNIQUE INDEX IF NOT EXISTS categories_name_lower_uq
  ON categories (LOWER(name));

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_lower_uq
  ON categories (LOWER(slug));

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_lower_uq
  ON products (LOWER(slug));

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_lower_uq
  ON products (LOWER(sku));
