import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closeDatabase, initializeDatabase } from '../src/db/database.js';

const app = createApp();

beforeAll(async () => {
  await initializeDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe('catalog API', () => {
  it('reports application and database health', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body.data.status).toBe('up');
    expect(response.body.data.database.status).toBe('up');
  });

  it('returns categories with product counts', async () => {
    const response = await request(app).get('/api/categories').expect(200);

    expect(response.body.data).toHaveLength(3);
    expect(response.body.data.every((category) => category.product_count === 3)).toBe(
      true,
    );
  });

  it('paginates and filters products by category', async () => {
    const response = await request(app)
      .get('/api/products?category=perfumes&limit=2&page=1&sort=price-asc')
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination.total).toBe(3);
    expect(response.body.pagination.hasNextPage).toBe(true);
    expect(
      response.body.data.every((product) => product.category.slug === 'perfumes'),
    ).toBe(true);
    expect(response.body.data[0].price).toBeLessThanOrEqual(
      response.body.data[1].price,
    );
  });

  it('searches product names and descriptions', async () => {
    const response = await request(app)
      .get('/api/products?search=bergamot')
      .expect(200);

    expect(response.body.pagination.total).toBe(1);
    expect(response.body.data[0].name).toBe('Verdant Mist Eau de Parfum');
  });

  it('rejects invalid price ranges', async () => {
    const response = await request(app)
      .get('/api/products?minPrice=500&maxPrice=100')
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns a product by ID and hides missing products', async () => {
    const listResponse = await request(app).get('/api/products?limit=1').expect(200);
    const product = listResponse.body.data[0];

    const detailResponse = await request(app)
      .get(`/api/products/${product.id}`)
      .expect(200);

    expect(detailResponse.body.data.id).toBe(product.id);

    const missingResponse = await request(app)
      .get('/api/products/ffffffff-ffff-4fff-8fff-ffffffffffff')
      .expect(404);

    expect(missingResponse.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});
