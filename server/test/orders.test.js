import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import {
  closeDatabase,
  initializeDatabase,
  query,
  withTransaction,
} from '../src/db/database.js';
import { createSessionToken, hashPassword } from '../src/services/auth-service.js';

const app = createApp();
const bouquetId = '20000000-0000-4000-8000-000000000001';
const daisiesId = '20000000-0000-4000-8000-000000000002';

const address = {
  recipientName: 'Mara Santos',
  phone: '+63 917 123 4567',
  addressLine1: '12 Sampaguita Street',
  addressLine2: 'Barangay Maligaya',
  city: 'Quezon City',
  province: 'Metro Manila',
  postalCode: '1100',
  country: 'Philippines',
};

const createCustomerAgent = async (suffix) => {
  const agent = request.agent(app);

  await agent
    .post('/api/auth/register')
    .send({
      name: `Order Tester ${suffix}`,
      email: `orders.${suffix}@example.com`,
      password: 'Garden12345',
    })
    .expect(201);

  return agent;
};

const addItem = async (agent, productId, quantity = 1) =>
  agent.post('/api/cart/items').send({ productId, quantity }).expect(201);

const checkoutBody = (cartRevision, overrides = {}) => ({
  cartRevision,
  paymentMethod: 'cash_on_delivery',
  deliveryAddress: address,
  ...overrides,
});

const placeOrder = (agent, key, body) =>
  agent.post('/api/orders').set('Idempotency-Key', key).send(body);

beforeAll(async () => {
  await initializeDatabase();
});

beforeEach(async () => {
  await query('DELETE FROM order_items');
  await query('DELETE FROM orders');
  await query('DELETE FROM cart_items');
  await query('DELETE FROM users');
  await query(
    `
      UPDATE products
      SET
        name = CASE
          WHEN id = $1 THEN 'Blush Garden Bouquet'
          WHEN id = $2 THEN 'Sunlit Daisy Wrap'
          ELSE name
        END,
        price = CASE
          WHEN id = $1 THEN 1890.00
          WHEN id = $2 THEN 1150.00
          ELSE price
        END,
        stock_quantity = CASE
          WHEN id = $1 THEN 14
          WHEN id = $2 THEN 20
          ELSE stock_quantity
        END,
        is_active = TRUE
      WHERE id IN ($1, $2)
    `,
    [bouquetId, daisiesId],
  );
});

afterAll(async () => {
  await closeDatabase();
});

describe('customer order API', () => {
  it('creates an exact order snapshot, reduces stock, clears the cart, and lists it', async () => {
    const agent = await createCustomerAgent('success');
    await addItem(agent, bouquetId, 2);
    const cartResponse = await addItem(agent, daisiesId, 3);
    const revision = cartResponse.body.data.cart.revision;

    const response = await placeOrder(
      agent,
      '50000000-0000-4000-8000-000000000001',
      checkoutBody(revision),
    ).expect(201);
    const order = response.body.data.order;

    expect(response.body.data.idempotent_replay).toBe(false);
    expect(order).toMatchObject({
      status: 'pending',
      payment_method: 'cash_on_delivery',
      subtotal: 7230,
      total_amount: 7230,
      item_count: 5,
      delivery_address: address,
    });
    expect(order.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          product_id: bouquetId,
          product_name: 'Blush Garden Bouquet',
          unit_price: 1890,
          quantity: 2,
          line_total: 3780,
        }),
        expect.objectContaining({
          product_id: daisiesId,
          product_name: 'Sunlit Daisy Wrap',
          unit_price: 1150,
          quantity: 3,
          line_total: 3450,
        }),
      ]),
    );

    const productResult = await query(
      'SELECT id, stock_quantity FROM products WHERE id IN ($1, $2)',
      [bouquetId, daisiesId],
    );
    expect(
      Object.fromEntries(
        productResult.rows.map((product) => [
          product.id,
          Number(product.stock_quantity),
        ]),
      ),
    ).toEqual({ [bouquetId]: 12, [daisiesId]: 17 });

    const cart = await agent.get('/api/cart').expect(200);
    expect(cart.body.data.cart.items).toHaveLength(0);

    const list = await agent.get('/api/orders').expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ id: order.id, item_count: 5 });

    const detail = await agent.get(`/api/orders/${order.id}`).expect(200);
    expect(detail.body.data.items).toHaveLength(2);
  });

  it('replays the same idempotent checkout and rejects different input', async () => {
    const agent = await createCustomerAgent('idempotency');
    const cartResponse = await addItem(agent, bouquetId, 1);
    const body = checkoutBody(cartResponse.body.data.cart.revision);
    const key = '50000000-0000-4000-8000-000000000002';

    const first = await placeOrder(agent, key, body).expect(201);
    const replay = await placeOrder(agent, key, body).expect(200);

    expect(replay.body.data.idempotent_replay).toBe(true);
    expect(replay.body.data.order.id).toBe(first.body.data.order.id);

    const conflict = await placeOrder(agent, key, {
      ...body,
      deliveryAddress: { ...address, city: 'Makati City' },
    }).expect(409);
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT');

    const count = await query('SELECT COUNT(*)::int AS total FROM orders');
    expect(Number(count.rows[0].total)).toBe(1);
  });

  it('rejects empty carts, invalid addresses, and changed carts without mutations', async () => {
    const agent = await createCustomerAgent('validation');
    const emptyCart = await agent.get('/api/cart').expect(200);

    const empty = await placeOrder(
      agent,
      '50000000-0000-4000-8000-000000000003',
      checkoutBody(emptyCart.body.data.cart.revision),
    ).expect(409);
    expect(empty.body.error.code).toBe('EMPTY_CART');

    const added = await addItem(agent, bouquetId, 2);
    await placeOrder(
      agent,
      '50000000-0000-4000-8000-000000000004',
      checkoutBody(added.body.data.cart.revision, {
        deliveryAddress: { ...address, postalCode: '@' },
      }),
    ).expect(400);

    await query('UPDATE products SET price = 1990.00 WHERE id = $1', [bouquetId]);
    const changed = await placeOrder(
      agent,
      '50000000-0000-4000-8000-000000000005',
      checkoutBody(added.body.data.cart.revision),
    ).expect(409);
    expect(changed.body.error.code).toBe('CART_CHANGED');
    expect(changed.body.error.details.cart.revision).not.toBe(
      added.body.data.cart.revision,
    );

    const orderCount = await query('SELECT COUNT(*)::int AS total FROM orders');
    const cartCount = await query('SELECT COUNT(*)::int AS total FROM cart_items');
    const stock = await query('SELECT stock_quantity FROM products WHERE id = $1', [
      bouquetId,
    ]);
    expect(Number(orderCount.rows[0].total)).toBe(0);
    expect(Number(cartCount.rows[0].total)).toBe(1);
    expect(Number(stock.rows[0].stock_quantity)).toBe(14);
  });

  it('returns specific availability conflicts from a current unavailable cart', async () => {
    const agent = await createCustomerAgent('availability');
    await addItem(agent, bouquetId, 2);

    await query('UPDATE products SET stock_quantity = 1 WHERE id = $1', [bouquetId]);
    const lowStockCart = await agent.get('/api/cart').expect(200);
    const insufficient = await placeOrder(
      agent,
      '50000000-0000-4000-8000-000000000006',
      checkoutBody(lowStockCart.body.data.cart.revision),
    ).expect(409);
    expect(insufficient.body.error.code).toBe('INSUFFICIENT_STOCK');

    await query(
      'UPDATE products SET stock_quantity = 14, is_active = FALSE WHERE id = $1',
      [bouquetId],
    );
    const inactiveCart = await agent.get('/api/cart').expect(200);
    const inactive = await placeOrder(
      agent,
      '50000000-0000-4000-8000-000000000007',
      checkoutBody(inactiveCart.body.data.cart.revision),
    ).expect(409);
    expect(inactive.body.error.code).toBe('PRODUCT_INACTIVE');
  });

  it('prevents simultaneous customers from purchasing the same last item', async () => {
    const firstCustomer = await createCustomerAgent('race-one');
    const secondCustomer = await createCustomerAgent('race-two');
    await addItem(firstCustomer, bouquetId, 1);
    await addItem(secondCustomer, bouquetId, 1);
    await query('UPDATE products SET stock_quantity = 1 WHERE id = $1', [bouquetId]);

    const [firstCart, secondCart] = await Promise.all([
      firstCustomer.get('/api/cart').expect(200),
      secondCustomer.get('/api/cart').expect(200),
    ]);
    const responses = await Promise.all([
      placeOrder(
        firstCustomer,
        '50000000-0000-4000-8000-000000000008',
        checkoutBody(firstCart.body.data.cart.revision),
      ),
      placeOrder(
        secondCustomer,
        '50000000-0000-4000-8000-000000000009',
        checkoutBody(secondCart.body.data.cart.revision),
      ),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const stock = await query('SELECT stock_quantity FROM products WHERE id = $1', [
      bouquetId,
    ]);
    const orderCount = await query('SELECT COUNT(*)::int AS total FROM orders');
    expect(Number(stock.rows[0].stock_quantity)).toBe(0);
    expect(Number(orderCount.rows[0].total)).toBe(1);
  });

  it('keeps order history immutable and hides it from other customers', async () => {
    const owner = await createCustomerAgent('owner');
    const other = await createCustomerAgent('other');
    const added = await addItem(owner, bouquetId, 1);
    const placed = await placeOrder(
      owner,
      '50000000-0000-4000-8000-000000000010',
      checkoutBody(added.body.data.cart.revision),
    ).expect(201);
    const orderId = placed.body.data.order.id;

    await query(
      "UPDATE products SET name = 'Renamed Bouquet', price = 9999.00 WHERE id = $1",
      [bouquetId],
    );

    const detail = await owner.get(`/api/orders/${orderId}`).expect(200);
    expect(detail.body.data.items[0]).toMatchObject({
      product_name: 'Blush Garden Bouquet',
      unit_price: 1890,
    });

    const hidden = await other.get(`/api/orders/${orderId}`).expect(404);
    expect(hidden.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('rolls database changes back when a transaction fails', async () => {
    const before = await query('SELECT stock_quantity FROM products WHERE id = $1', [
      bouquetId,
    ]);

    await expect(
      withTransaction(async (execute) => {
        await execute(
          'UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = $1',
          [bouquetId],
        );
        throw new Error('Force rollback');
      }),
    ).rejects.toThrow('Force rollback');

    const after = await query('SELECT stock_quantity FROM products WHERE id = $1', [
      bouquetId,
    ]);
    expect(Number(after.rows[0].stock_quantity)).toBe(
      Number(before.rows[0].stock_quantity),
    );
  });

  it('requires authentication, customer access, a trusted origin, and an idempotency key', async () => {
    await request(app).post('/api/orders').send({}).expect(401);

    const passwordHash = await hashPassword('Admin12345');
    const adminResult = await query(
      `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES ('30000000-0000-4000-8000-000000000099', 'Order Admin',
          'order.admin@example.com', $1, 'admin')
        RETURNING id, name, email, role, created_at
      `,
      [passwordHash],
    );
    const adminToken = await createSessionToken(adminResult.rows[0]);
    const customerOnly = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
    expect(customerOnly.body.error.code).toBe('CUSTOMER_ACCESS_REQUIRED');

    const agent = await createCustomerAgent('security');
    const added = await addItem(agent, bouquetId, 1);
    const body = checkoutBody(added.body.data.cart.revision);

    await agent.post('/api/orders').send(body).expect(400);
    const originError = await agent
      .post('/api/orders')
      .set('Origin', 'https://malicious.example')
      .set('Idempotency-Key', '50000000-0000-4000-8000-000000000011')
      .send(body)
      .expect(403);
    expect(originError.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });
});
