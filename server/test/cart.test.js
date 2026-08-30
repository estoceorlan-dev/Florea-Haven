import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closeDatabase, initializeDatabase, query } from '../src/db/database.js';

const app = createApp();
const productId = '20000000-0000-4000-8000-000000000001';

const createCustomerAgent = async (suffix = 'one') => {
  const agent = request.agent(app);

  await agent
    .post('/api/auth/register')
    .send({
      name: `Cart Tester ${suffix}`,
      email: `cart.${suffix}@example.com`,
      password: 'Garden12345',
    })
    .expect(201);

  return agent;
};

beforeAll(async () => {
  await initializeDatabase();
});

beforeEach(async () => {
  await query('DELETE FROM cart_items');
  await query('DELETE FROM users');
  await query(
    `
      UPDATE products
      SET stock_quantity = 14, is_active = TRUE
      WHERE id = $1
    `,
    [productId],
  );
});

afterAll(async () => {
  await closeDatabase();
});

describe('cart API', () => {
  it('requires authentication and returns an empty cart for a new customer', async () => {
    await request(app).get('/api/cart').expect(401);

    const agent = await createCustomerAgent();
    const response = await agent.get('/api/cart').expect(200);

    expect(response.body.data.cart).toMatchObject({
      items: [],
      summary: {
        item_count: 0,
        distinct_items: 0,
        subtotal: 0,
        has_unavailable_items: false,
      },
    });
    expect(response.body.data.cart.revision).toMatch(/^[a-f0-9]{64}$/);
  });

  it('adds, merges, updates, and removes a cart item using server prices', async () => {
    const agent = await createCustomerAgent();

    const added = await agent
      .post('/api/cart/items')
      .send({ productId, quantity: 1, price: 1 })
      .expect(201);

    expect(added.body.data.cart.items[0]).toMatchObject({
      quantity: 1,
      unit_price: 1890,
      line_total: 1890,
      availability: 'available',
    });

    const merged = await agent
      .post('/api/cart/items')
      .send({ productId, quantity: 2 })
      .expect(201);
    const itemId = merged.body.data.cart.items[0].id;

    expect(merged.body.data.cart.summary).toMatchObject({
      item_count: 3,
      distinct_items: 1,
      subtotal: 5670,
    });

    const updated = await agent
      .put(`/api/cart/items/${itemId}`)
      .send({ quantity: 4 })
      .expect(200);
    expect(updated.body.data.cart.items[0].line_total).toBe(7560);

    const removed = await agent.delete(`/api/cart/items/${itemId}`).expect(200);
    expect(removed.body.data.cart.items).toHaveLength(0);
  });

  it('enforces cart ownership between customers', async () => {
    const owner = await createCustomerAgent('owner');
    const otherCustomer = await createCustomerAgent('other');
    const added = await owner
      .post('/api/cart/items')
      .send({ productId, quantity: 1 })
      .expect(201);
    const itemId = added.body.data.cart.items[0].id;

    await otherCustomer
      .put(`/api/cart/items/${itemId}`)
      .send({ quantity: 2 })
      .expect(404);
    await otherCustomer.delete(`/api/cart/items/${itemId}`).expect(404);

    const otherCart = await otherCustomer.get('/api/cart').expect(200);
    expect(otherCart.body.data.cart.items).toHaveLength(0);

    const ownerCart = await owner.get('/api/cart').expect(200);
    expect(ownerCart.body.data.cart.items[0].quantity).toBe(1);
  });

  it('rejects invalid quantities, inactive products, and quantities above stock', async () => {
    const agent = await createCustomerAgent();

    await agent.post('/api/cart/items').send({ productId, quantity: 0 }).expect(400);
    const insufficient = await agent
      .post('/api/cart/items')
      .send({ productId, quantity: 15 })
      .expect(409);
    expect(insufficient.body.error.code).toBe('INSUFFICIENT_STOCK');

    await query('UPDATE products SET is_active = FALSE WHERE id = $1', [productId]);
    const inactive = await agent
      .post('/api/cart/items')
      .send({ productId, quantity: 1 })
      .expect(409);
    expect(inactive.body.error.code).toBe('PRODUCT_INACTIVE');
  });

  it('reports products that become unavailable after being added', async () => {
    const agent = await createCustomerAgent();
    await agent.post('/api/cart/items').send({ productId, quantity: 3 }).expect(201);

    await query('UPDATE products SET stock_quantity = 2 WHERE id = $1', [productId]);
    const lowStockCart = await agent.get('/api/cart').expect(200);
    expect(lowStockCart.body.data.cart.items[0].availability).toBe(
      'insufficient_stock',
    );
    expect(lowStockCart.body.data.cart.summary.has_unavailable_items).toBe(true);

    await query('UPDATE products SET is_active = FALSE WHERE id = $1', [productId]);
    const inactiveCart = await agent.get('/api/cart').expect(200);
    expect(inactiveCart.body.data.cart.items[0].availability).toBe('inactive');
  });
});
