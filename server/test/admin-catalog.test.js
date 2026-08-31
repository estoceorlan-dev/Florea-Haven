import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closeDatabase, initializeDatabase, query } from '../src/db/database.js';
import { createSessionToken, hashPassword } from '../src/services/auth-service.js';

const app = createApp();
const adminId = '30000000-0000-4000-8000-000000000021';
const customerId = '30000000-0000-4000-8000-000000000022';
const flowersCategoryId = '10000000-0000-4000-8000-000000000002';
let adminToken;
let customerToken;

const authorize = (testRequest, token = adminToken) =>
  testRequest.set('Authorization', `Bearer ${token}`);

const productInput = (suffix, overrides = {}) => ({
  categoryId: flowersCategoryId,
  name: `Phase Six Bloom ${suffix}`,
  slug: `phase-six-bloom-${suffix}`,
  sku: `PHS-${suffix}`,
  description: 'A test product used to verify protected catalog management.',
  price: 799.5,
  stockQuantity: 12,
  imageUrl: 'https://images.example.com/phase-six-bloom.jpg',
  featured: false,
  ...overrides,
});

beforeAll(async () => {
  await initializeDatabase();
  const passwordHash = await hashPassword('PhaseSix123');
  const users = [
    [adminId, 'Catalog Admin', 'catalog.admin@example.com', 'admin'],
    [customerId, 'Catalog Customer', 'catalog.customer@example.com', 'customer'],
  ];

  for (const [id, name, email, role] of users) {
    await query(
      `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [id, name, email, passwordHash, role],
    );
  }

  adminToken = await createSessionToken({ id: adminId, role: 'admin' });
  customerToken = await createSessionToken({ id: customerId, role: 'customer' });
});

afterAll(async () => {
  await closeDatabase();
});

describe('admin catalog authorization', () => {
  it('rejects every administration endpoint for visitors and customers', async () => {
    const categoryId = '10000000-0000-4000-8000-000000000001';
    const productId = '20000000-0000-4000-8000-000000000001';
    const endpoints = [
      ['get', '/api/admin/categories'],
      ['get', '/api/admin/products'],
      ['post', '/api/categories', { name: 'Unauthorized', description: '' }],
      ['put', `/api/categories/${categoryId}`, { description: 'Unauthorized' }],
      ['delete', `/api/categories/${categoryId}`],
      ['post', '/api/products', productInput('unauthorized')],
      ['put', `/api/products/${productId}`, { stockQuantity: 3 }],
      ['delete', `/api/products/${productId}`],
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

describe('admin category management', () => {
  it('creates, lists, updates, and deletes an unused category', async () => {
    const createResponse = await authorize(request(app).post('/api/categories'))
      .send({
        name: 'Garden Tools',
        slug: 'garden-tools',
        description: 'Small tools for tending a home garden.',
      })
      .expect(201);
    const category = createResponse.body.data;

    const updateResponse = await authorize(
      request(app).put(`/api/categories/${category.id}`),
    )
      .send({ name: 'Garden Essentials', slug: 'garden-essentials' })
      .expect(200);
    expect(updateResponse.body.data).toMatchObject({
      id: category.id,
      name: 'Garden Essentials',
      slug: 'garden-essentials',
      product_count: 0,
    });

    const listResponse = await authorize(
      request(app).get('/api/admin/categories'),
    ).expect(200);
    expect(listResponse.body.data.some(({ id }) => id === category.id)).toBe(true);

    const deleteResponse = await authorize(
      request(app).delete(`/api/categories/${category.id}`),
    ).expect(200);
    expect(deleteResponse.body.data).toEqual({ id: category.id, deleted: true });
  });

  it('rejects duplicate category names regardless of case', async () => {
    const first = await authorize(request(app).post('/api/categories'))
      .send({ name: 'Planters', description: 'Indoor and outdoor planters.' })
      .expect(201);

    const duplicate = await authorize(request(app).post('/api/categories'))
      .send({ name: '  PLANTERS  ', slug: 'planters-two', description: '' })
      .expect(409);
    expect(duplicate.body.error.code).toBe('CATEGORY_NAME_IN_USE');

    await authorize(
      request(app).delete(`/api/categories/${first.body.data.id}`),
    ).expect(200);
  });

  it('rejects deleting a category referenced by any product', async () => {
    const response = await authorize(
      request(app).delete(`/api/categories/${flowersCategoryId}`),
    ).expect(409);

    expect(response.body.error.code).toBe('CATEGORY_IN_USE');
  });
});

describe('admin product and inventory management', () => {
  it('creates, searches, updates, deactivates, and restores a product', async () => {
    const createResponse = await authorize(request(app).post('/api/products'))
      .send(productInput('lifecycle'))
      .expect(201);
    const product = createResponse.body.data;
    expect(product).toMatchObject({
      sku: 'PHS-LIFECYCLE',
      stock_quantity: 12,
      is_active: true,
    });

    const listResponse = await authorize(
      request(app).get('/api/admin/products?search=PHS-LIFECYCLE&status=all'),
    ).expect(200);
    expect(listResponse.body.data.map(({ id }) => id)).toContain(product.id);

    const updateResponse = await authorize(
      request(app).put(`/api/products/${product.id}`),
    )
      .send({ price: 825.25, stockQuantity: 4, featured: true })
      .expect(200);
    expect(updateResponse.body.data).toMatchObject({
      price: 825.25,
      stock_quantity: 4,
      featured: true,
    });

    const publicResponse = await request(app)
      .get('/api/products?search=Phase%20Six%20Bloom%20lifecycle')
      .expect(200);
    expect(publicResponse.body.data[0].id).toBe(product.id);

    await authorize(request(app).delete(`/api/products/${product.id}`)).expect(200);
    await request(app).get(`/api/products/${product.id}`).expect(404);

    const inactiveResponse = await authorize(
      request(app).get('/api/admin/products?status=inactive&search=PHS-LIFECYCLE'),
    ).expect(200);
    expect(inactiveResponse.body.data[0].is_active).toBe(false);

    const restoreResponse = await authorize(
      request(app).put(`/api/products/${product.id}`),
    )
      .send({ isActive: true })
      .expect(200);
    expect(restoreResponse.body.data.is_active).toBe(true);
  });

  it('rejects invalid prices, negative stock, bad images, and missing categories', async () => {
    const invalidInputs = [
      [productInput('negative-price', { price: -1 }), 'price'],
      [productInput('fractional-stock', { stockQuantity: 1.5 }), 'stockQuantity'],
      [productInput('negative-stock', { stockQuantity: -1 }), 'stockQuantity'],
      [productInput('bad-image', { imageUrl: 'file:///product.jpg' }), 'imageUrl'],
    ];

    for (const [input, field] of invalidInputs) {
      const response = await authorize(request(app).post('/api/products'))
        .send(input)
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.some((detail) => detail.field === field)).toBe(
        true,
      );
    }

    const missingCategory = await authorize(request(app).post('/api/products'))
      .send(
        productInput('missing-category', {
          categoryId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        }),
      )
      .expect(404);
    expect(missingCategory.body.error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('preserves customer order snapshots after product deactivation', async () => {
    const createResponse = await authorize(request(app).post('/api/products'))
      .send(productInput('history', { name: 'Original Order Bloom', price: 450 }))
      .expect(201);
    const product = createResponse.body.data;
    const orderId = '50000000-0000-4000-8000-000000000021';

    await query(
      `
        INSERT INTO orders (
          id, user_id, idempotency_key, request_fingerprint, subtotal,
          total_amount, delivery_address
        )
        VALUES ($1, $2, $3, $4, 900, 900, $5)
      `,
      [
        orderId,
        customerId,
        '60000000-0000-4000-8000-000000000021',
        'phase-six-order-history',
        JSON.stringify({ recipientName: 'Catalog Customer' }),
      ],
    );
    await query(
      `
        INSERT INTO order_items (
          id, order_id, product_id, product_name, sku,
          unit_price, quantity, line_total
        )
        VALUES ($1, $2, $3, $4, $5, 450, 2, 900)
      `,
      [
        '70000000-0000-4000-8000-000000000021',
        orderId,
        product.id,
        product.name,
        product.sku,
      ],
    );

    await authorize(request(app).delete(`/api/products/${product.id}`)).expect(200);

    const orderResponse = await authorize(
      request(app).get(`/api/orders/${orderId}`),
      customerToken,
    ).expect(200);
    expect(orderResponse.body.data.items[0]).toMatchObject({
      product_name: 'Original Order Bloom',
      sku: 'PHS-HISTORY',
      unit_price: 450,
      quantity: 2,
    });
  });
});
