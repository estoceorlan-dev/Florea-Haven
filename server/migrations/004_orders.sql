CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  idempotency_key UUID NOT NULL,
  request_fingerprint TEXT NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery'
    CHECK (payment_method = 'cash_on_delivery'),
  delivery_address JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT orders_user_idempotency_key_uq UNIQUE (user_id, idempotency_key),
  CHECK (subtotal = total_amount)
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (order_id, product_id),
  CHECK (line_total = unit_price * quantity)
);

CREATE INDEX IF NOT EXISTS orders_user_created_at_idx
  ON orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
  ON orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items (product_id);
