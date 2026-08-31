import { query, withTransaction } from '../db/database.js';
import { HttpError } from '../utils/http-error.js';

export const allowedOrderTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

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

const mapAdminOrder = (row, items = []) => ({
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
  customer: {
    id: row.customer_id,
    name: row.customer_name,
    email: row.customer_email,
  },
  ...(items.length > 0 ? { items } : {}),
});

const orderNotFound = () =>
  new HttpError(404, 'Order not found.', undefined, 'ORDER_NOT_FOUND');

const loadAdminOrder = async (orderId, execute = query) => {
  const orderResult = await execute(
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
        o.updated_at,
        u.id AS customer_id,
        u.name AS customer_name,
        u.email AS customer_email
      FROM orders o
      INNER JOIN users u ON u.id = o.user_id
      WHERE o.id = $1
      LIMIT 1
    `,
    [orderId],
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

  return mapAdminOrder(orderResult.rows[0], itemResult.rows.map(mapOrderItem));
};

const endOfDate = (value) => {
  const nextDay = new Date(`${value}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.toISOString();
};

const buildFilters = ({ search, customer, status, dateFrom, dateTo }) => {
  const clauses = [];
  const values = [];
  const addValue = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (search) {
    const placeholder = addValue(`%${search}%`);
    clauses.push(`CAST(o.id AS TEXT) ILIKE ${placeholder}`);
  }

  if (customer) {
    const placeholder = addValue(`%${customer}%`);
    clauses.push(`(u.name ILIKE ${placeholder} OR u.email ILIKE ${placeholder})`);
  }

  if (status !== 'all') {
    clauses.push(`o.status = ${addValue(status)}`);
  }

  if (dateFrom) {
    clauses.push(`o.created_at >= ${addValue(`${dateFrom}T00:00:00.000Z`)}`);
  }

  if (dateTo) {
    clauses.push(`o.created_at < ${addValue(endOfDate(dateTo))}`);
  }

  return {
    where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

export const listAdminOrders = async (filters) => {
  const { where, values } = buildFilters(filters);
  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM orders o
      INNER JOIN users u ON u.id = o.user_id
      ${where}
    `,
    values,
  );
  const total = Number(countResult.rows[0].total);
  const offset = (filters.page - 1) * filters.limit;
  const limitPlaceholder = `$${values.length + 1}`;
  const offsetPlaceholder = `$${values.length + 2}`;
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
        o.updated_at,
        u.id AS customer_id,
        u.name AS customer_name,
        u.email AS customer_email
      FROM orders o
      INNER JOIN users u ON u.id = o.user_id
      ${where}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `,
    [...values, filters.limit, offset],
  );
  const itemCounts = new Map();

  if (result.rows.length > 0) {
    const orderIds = result.rows.map(({ id }) => id);
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

  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return {
    orders: result.rows.map((row) =>
      mapAdminOrder({ ...row, item_count: itemCounts.get(row.id) ?? 0 }),
    ),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages,
      hasPreviousPage: filters.page > 1,
      hasNextPage: filters.page < totalPages,
    },
  };
};

export const getAdminOrder = async (orderId) => {
  const order = await loadAdminOrder(orderId);
  if (!order) throw orderNotFound();
  return order;
};

export const updateAdminOrderStatus = async (orderId, requestedStatus) =>
  withTransaction(async (execute) => {
    const orderResult = await execute(
      `
        SELECT id, status
        FROM orders
        WHERE id = $1
        FOR UPDATE
      `,
      [orderId],
    );
    const currentOrder = orderResult.rows[0];

    if (!currentOrder) throw orderNotFound();

    const allowedStatuses = allowedOrderTransitions[currentOrder.status] ?? [];

    if (!allowedStatuses.includes(requestedStatus)) {
      throw new HttpError(
        409,
        `An order cannot move from ${currentOrder.status} to ${requestedStatus}.`,
        {
          currentStatus: currentOrder.status,
          requestedStatus,
          allowedStatuses,
        },
        'INVALID_STATUS_TRANSITION',
      );
    }

    if (requestedStatus === 'cancelled') {
      const itemResult = await execute(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId],
      );

      for (const item of itemResult.rows) {
        await execute(
          `
            UPDATE products
            SET
              stock_quantity = stock_quantity + $1::integer,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `,
          [Number(item.quantity), item.product_id],
        );
      }
    }

    await execute(
      `
        UPDATE orders
        SET
          status = $1,
          status_updated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [requestedStatus, orderId],
    );

    return loadAdminOrder(orderId, execute);
  });
