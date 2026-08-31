import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closeDatabase, initializeDatabase, query } from '../src/db/database.js';
import { createSessionToken, hashPassword } from '../src/services/auth-service.js';

const app = createApp();
const adminId = '30000000-0000-4000-8000-000000000071';
const customerId = '30000000-0000-4000-8000-000000000072';
const productId = '20000000-0000-4000-8000-000000000001';
const orderId = '60000000-0000-4000-8000-000000000071';
let adminToken;
let customerToken;

const authorize = (testRequest, token = adminToken) =>
  testRequest.set('Authorization', `Bearer ${token}`);

const createOrder = async ({
  id = orderId,
  status = 'pending',
  createdAt = '2026-08-15T04:00:00.000Z',
  quantity = 2,
} = {}) => {
  await query(
    `
      INSERT INTO orders (
        id, user_id, idempotency_key, request_fingerprint, subtotal,
        total_amount, status, delivery_address, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8)
    `,
    [
      id,
      customerId,
      id.replace(/^6/, '8'),
      `admin-order-${id}`,
      1890 * quantity,
      status,
      JSON.stringify({
        recipientName: 'Mara Santos',
        phone: '+63 917 123 4567',
        addressLine1: '12 Sampaguita Street',
        addressLine2: 'Barangay Maligaya',
        city: 'Quezon City',
        province: 'Metro Manila',
        postalCode: '1100',
        country: 'Philippines',
      }),
      createdAt,
    ],
  );
  await query(
    `
      INSERT INTO order_items (
        id, order_id, product_id, product_name, sku,
        unit_price, quantity, line_total
      )
      VALUES ($1, $2, $3, 'Blush Garden Bouquet', 'FLW-BLS-001', 1890, $4, $5)
    `,
    [id.replace(/^6/, '7'), id, productId, quantity, 1890 * quantity],
  );
};

beforeAll(async () => {
  await initializeDatabase();
  const passwordHash = await hashPassword('PhaseSeven123');

  await query(
    `
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES
        ($1, 'Fulfillment Admin', 'fulfillment.admin@example.com', $3, 'admin'),
        ($2, 'Mara Santos', 'mara.orders@example.com', $3, 'customer')
    `,
    [adminId, customerId, passwordHash],
  );

  adminToken = await createSessionToken({ id: adminId, role: 'admin' });
  customerToken = await createSessionToken({ id: customerId, role: 'customer' });
});

beforeEach(async () => {
  await query('DELETE FROM order_items');
  await query('DELETE FROM orders');
  await query(
    `
      UPDATE products
      SET stock_quantity = 8, is_active = TRUE
      WHERE id = $1
    `,
    [productId],
  );
});

afterAll(async () => {
  await closeDatabase();
});

describe('admin order API', () => {
  it('lists and filters orders with customer fulfillment summaries', async () => {
    await createOrder();

    const response = await authorize(
      request(app).get(
        '/api/admin/orders?search=60000000&customer=mara.orders&status=pending&dateFrom=2026-08-15&dateTo=2026-08-15&page=1&limit=10',
      ),
    ).expect(200);

    expect(response.body.pagination).toMatchObject({
      page: 1,
      total: 1,
      totalPages: 1,
    });
    expect(response.body.data[0]).toMatchObject({
      id: orderId,
      status: 'pending',
      item_count: 2,
      total_amount: 3780,
      customer: {
        id: customerId,
        name: 'Mara Santos',
        email: 'mara.orders@example.com',
      },
    });

    const noMatch = await authorize(
      request(app).get('/api/admin/orders?customer=someone-else'),
    ).expect(200);
    expect(noMatch.body.data).toEqual([]);

    await authorize(
      request(app).get('/api/admin/orders?dateFrom=2026-08-20&dateTo=2026-08-10'),
    ).expect(400);
  });

  it('returns order details with customer identity and immutable items', async () => {
    await createOrder();

    const response = await authorize(
      request(app).get(`/api/admin/orders/${orderId}`),
    ).expect(200);

    expect(response.body.data.customer).toEqual({
      id: customerId,
      name: 'Mara Santos',
      email: 'mara.orders@example.com',
    });
    expect(response.body.data.items[0]).toMatchObject({
      product_name: 'Blush Garden Bouquet',
      sku: 'FLW-BLS-001',
      quantity: 2,
      unit_price: 1890,
    });
  });

  it('allows only the agreed forward status workflow', async () => {
    await createOrder();

    const invalid = await authorize(
      request(app).put(`/api/admin/orders/${orderId}/status`),
    )
      .send({ status: 'shipped' })
      .expect(409);
    expect(invalid.body.error).toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      details: {
        currentStatus: 'pending',
        requestedStatus: 'shipped',
        allowedStatuses: ['confirmed', 'cancelled'],
      },
    });

    for (const status of ['confirmed', 'preparing', 'shipped', 'delivered']) {
      const response = await authorize(
        request(app).put(`/api/admin/orders/${orderId}/status`),
      )
        .send({ status })
        .expect(200);
      expect(response.body.data.status).toBe(status);
      expect(response.body.data.status_updated_at).toBeTruthy();
    }

    const terminal = await authorize(
      request(app).put(`/api/admin/orders/${orderId}/status`),
    )
      .send({ status: 'cancelled' })
      .expect(409);
    expect(terminal.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('restores cancelled stock atomically and exactly once', async () => {
    await createOrder({ quantity: 2 });

    const cancelled = await authorize(
      request(app).put(`/api/admin/orders/${orderId}/status`),
    )
      .send({ status: 'cancelled' })
      .expect(200);
    expect(cancelled.body.data.status).toBe('cancelled');

    const restored = await query('SELECT stock_quantity FROM products WHERE id = $1', [
      productId,
    ]);
    expect(Number(restored.rows[0].stock_quantity)).toBe(10);

    await authorize(request(app).put(`/api/admin/orders/${orderId}/status`))
      .send({ status: 'cancelled' })
      .expect(409);

    const unchanged = await query('SELECT stock_quantity FROM products WHERE id = $1', [
      productId,
    ]);
    expect(Number(unchanged.rows[0].stock_quantity)).toBe(10);
  });

  it('allows cancellation after confirmation and restores its inventory', async () => {
    await createOrder({ quantity: 1 });

    await authorize(request(app).put(`/api/admin/orders/${orderId}/status`))
      .send({ status: 'confirmed' })
      .expect(200);
    await authorize(request(app).put(`/api/admin/orders/${orderId}/status`))
      .send({ status: 'cancelled' })
      .expect(200);

    const stock = await query('SELECT stock_quantity FROM products WHERE id = $1', [
      productId,
    ]);
    expect(Number(stock.rows[0].stock_quantity)).toBe(9);
  });

  it('shows status changes in the owning customer order history', async () => {
    await createOrder();

    await authorize(request(app).put(`/api/admin/orders/${orderId}/status`))
      .send({ status: 'confirmed' })
      .expect(200);

    const history = await authorize(
      request(app).get('/api/orders'),
      customerToken,
    ).expect(200);
    expect(history.body.data[0]).toMatchObject({ id: orderId, status: 'confirmed' });
  });

  it('denies visitors and customers every admin order operation', async () => {
    await createOrder();
    const endpoints = [
      ['get', '/api/admin/orders'],
      ['get', `/api/admin/orders/${orderId}`],
      ['put', `/api/admin/orders/${orderId}/status`, { status: 'confirmed' }],
    ];

    for (const [method, path, body] of endpoints) {
      const visitorRequest = request(app)[method](path);
      if (body) visitorRequest.send(body);
      await visitorRequest.expect(401);

      const customerRequest = authorize(request(app)[method](path), customerToken);
      if (body) customerRequest.send(body);
      const response = await customerRequest.expect(403);
      expect(response.body.error.code).toBe('ADMIN_ACCESS_REQUIRED');
    }
  });
});
