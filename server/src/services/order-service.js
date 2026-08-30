import { createHash, randomUUID } from 'node:crypto';
import { query, withTransaction } from '../db/database.js';
import { getCart } from './cart-service.js';
import { HttpError } from '../utils/http-error.js';

const moneyFromCents = (cents) => Number((cents / 100).toFixed(2));
const centsFromMoney = (value) => Math.round(Number(value) * 100);

const requestFingerprintFor = (input) =>
  createHash('sha256').update(JSON.stringify(input)).digest('hex');

const mapOrder = (row, items = []) => ({
  id: row.id,
  status: row.status,
  status_updated_at: row.status_updated_at,
  payment_method: row.payment_method,
  delivery_address: row.delivery_address,
  subtotal: Number(row.subtotal),
  total_amount: Number(row.total_amount),
  item_count: Number(
    row.item_count ?? items.reduce((total, item) => total + item.quantity, 0),
  ),
  created_at: row.created_at,
  updated_at: row.updated_at,
  ...(items.length > 0 ? { items } : {}),
});

const mapOrderItem = (row) => ({
  id: row.id,
  product_id: row.product_id,
  product_name: row.product_name,
  sku: row.sku,
  unit_price: Number(row.unit_price),
  quantity: Number(row.quantity),
  line_total: Number(row.line_total),
  created_at: row.created_at,
});

const findOrderRowByIdempotencyKey = async (
  userId,
  idempotencyKey,
  execute = query,
) => {
  const result = await execute(
    `
      SELECT id, request_fingerprint
      FROM orders
      WHERE user_id = $1 AND idempotency_key = $2
      LIMIT 1
    `,
    [userId, idempotencyKey],
  );

  return result.rows[0] ?? null;
};

const loadOwnedOrder = async (userId, orderId, execute = query) => {
  const orderResult = await execute(
    `
      SELECT
        id,
        status,
        status_updated_at,
        payment_method,
        delivery_address,
        subtotal,
        total_amount,
        created_at,
        updated_at
      FROM orders
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [orderId, userId],
  );

  if (!orderResult.rows[0]) return null;

  const itemResult = await execute(
    `
      SELECT
        id,
        product_id,
        product_name,
        sku,
        unit_price,
        quantity,
        line_total,
        created_at
      FROM order_items
      WHERE order_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [orderId],
  );
  const items = itemResult.rows.map(mapOrderItem);

  return mapOrder(orderResult.rows[0], items);
};

const orderNotFound = () =>
  new HttpError(404, 'Order not found.', undefined, 'ORDER_NOT_FOUND');

const availabilityError = (item, code, message) =>
  new HttpError(409, message, { productId: item.product.id }, code);

const validateCartAvailability = (cart) => {
  for (const item of cart.items) {
    if (item.availability === 'inactive') {
      throw availabilityError(
        item,
        'PRODUCT_INACTIVE',
        `${item.product.name} is no longer available.`,
      );
    }

    if (item.availability !== 'available') {
      throw availabilityError(
        item,
        'INSUFFICIENT_STOCK',
        `There is not enough stock to complete ${item.product.name}.`,
      );
    }
  }
};

const existingOrderResult = async (
  userId,
  idempotencyKey,
  requestFingerprint,
  execute = query,
) => {
  const existing = await findOrderRowByIdempotencyKey(userId, idempotencyKey, execute);

  if (!existing) return null;

  if (existing.request_fingerprint !== requestFingerprint) {
    throw new HttpError(
      409,
      'This checkout key was already used for different order details.',
      undefined,
      'IDEMPOTENCY_CONFLICT',
    );
  }

  return {
    order: await loadOwnedOrder(userId, existing.id, execute),
    replayed: true,
  };
};

export const placeOrder = async (userId, idempotencyKey, input) => {
  const requestFingerprint = requestFingerprintFor(input);

  try {
    return await withTransaction(async (execute) => {
      const replay = await existingOrderResult(
        userId,
        idempotencyKey,
        requestFingerprint,
        execute,
      );
      if (replay) return replay;

      const cart = await getCart(userId, execute);

      if (cart.items.length === 0) {
        throw new HttpError(
          409,
          'Your cart is empty. Add an item before checking out.',
          undefined,
          'EMPTY_CART',
        );
      }

      if (cart.revision !== input.cartRevision) {
        throw new HttpError(
          409,
          'Your cart changed. Review the latest prices and availability before trying again.',
          { cart },
          'CART_CHANGED',
        );
      }

      validateCartAvailability(cart);

      const orderId = randomUUID();
      const subtotalCents = cart.items.reduce(
        (total, item) => total + centsFromMoney(item.unit_price) * item.quantity,
        0,
      );
      const subtotal = moneyFromCents(subtotalCents);

      await execute(
        `
          INSERT INTO orders (
            id,
            user_id,
            idempotency_key,
            request_fingerprint,
            subtotal,
            total_amount,
            payment_method,
            delivery_address
          )
          VALUES ($1, $2, $3, $4, $5, $5, $6, $7::jsonb)
        `,
        [
          orderId,
          userId,
          idempotencyKey,
          requestFingerprint,
          subtotal,
          input.paymentMethod,
          JSON.stringify(input.deliveryAddress),
        ],
      );

      for (const item of cart.items) {
        const stockResult = await execute(
          `
            UPDATE products
            SET
              stock_quantity = stock_quantity - $1::integer,
              updated_at = CURRENT_TIMESTAMP
            WHERE
              id = $2
              AND is_active = TRUE
              AND stock_quantity >= $1::integer
              AND price = $3::numeric
            RETURNING stock_quantity
          `,
          [item.quantity, item.product.id, item.unit_price],
        );

        if (stockResult.rowCount === 0) {
          const currentProduct = await execute(
            `
              SELECT name, price, stock_quantity, is_active
              FROM products
              WHERE id = $1
              LIMIT 1
            `,
            [item.product.id],
          );
          const current = currentProduct.rows[0];

          if (!current?.is_active) {
            throw availabilityError(
              item,
              'PRODUCT_INACTIVE',
              `${item.product.name} is no longer available.`,
            );
          }

          if (Number(current.stock_quantity) < item.quantity) {
            throw new HttpError(
              409,
              `Only ${Number(current.stock_quantity)} of ${item.product.name} remain.`,
              {
                productId: item.product.id,
                availableStock: Number(current.stock_quantity),
              },
              'INSUFFICIENT_STOCK',
            );
          }

          throw new HttpError(
            409,
            'A product price changed during checkout. Review your cart and try again.',
            undefined,
            'CART_CHANGED',
          );
        }

        const lineTotal = moneyFromCents(
          centsFromMoney(item.unit_price) * item.quantity,
        );

        await execute(
          `
            INSERT INTO order_items (
              id,
              order_id,
              product_id,
              product_name,
              sku,
              unit_price,
              quantity,
              line_total
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            randomUUID(),
            orderId,
            item.product.id,
            item.product.name,
            item.product.sku,
            item.unit_price,
            item.quantity,
            lineTotal,
          ],
        );
      }

      await execute('DELETE FROM cart_items WHERE user_id = $1', [userId]);

      return {
        order: await loadOwnedOrder(userId, orderId, execute),
        replayed: false,
      };
    });
  } catch (error) {
    if (
      error.code !== '23505' ||
      error.constraint !== 'orders_user_idempotency_key_uq'
    ) {
      throw error;
    }

    const replay = await existingOrderResult(
      userId,
      idempotencyKey,
      requestFingerprint,
    );
    if (replay) return replay;
    throw error;
  }
};

export const listOrders = async (userId, { page, limit }) => {
  const countResult = await query(
    'SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1',
    [userId],
  );
  const total = Number(countResult.rows[0].total);
  const offset = (page - 1) * limit;
  const result = await query(
    `
      SELECT
        o.id,
        o.status,
        o.status_updated_at,
        o.payment_method,
        o.delivery_address,
        o.subtotal,
        o.total_amount,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset],
  );
  const itemCounts = new Map();

  if (result.rows.length > 0) {
    const orderIds = result.rows.map((order) => order.id);
    const placeholders = orderIds.map((_, index) => `$${index + 1}`).join(', ');
    const itemCountResult = await query(
      `
        SELECT order_id, SUM(quantity)::int AS item_count
        FROM order_items
        WHERE order_id IN (${placeholders})
        GROUP BY order_id
      `,
      orderIds,
    );

    for (const row of itemCountResult.rows) {
      itemCounts.set(row.order_id, Number(row.item_count));
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    orders: result.rows.map((row) =>
      mapOrder({ ...row, item_count: itemCounts.get(row.id) ?? 0 }),
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  };
};

export const getOrder = async (userId, orderId) => {
  const order = await loadOwnedOrder(userId, orderId);
  if (!order) throw orderNotFound();
  return order;
};
