import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/database.js';
import { HttpError } from '../utils/http-error.js';

const listQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional().default(''),
    category: z.string().trim().max(60).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z
      .enum(['featured', 'newest', 'price-asc', 'price-desc', 'name-asc'])
      .optional()
      .default('featured'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(48).optional().default(9),
    featured: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    {
      message: 'Minimum price cannot be greater than maximum price.',
      path: ['minPrice'],
    },
  );

const idSchema = z.string().uuid('Product ID must be a valid UUID.');

const sortExpressions = {
  featured: 'p.featured DESC, p.created_at DESC, p.name ASC',
  newest: 'p.created_at DESC, p.name ASC',
  'price-asc': 'p.price ASC, p.name ASC',
  'price-desc': 'p.price DESC, p.name ASC',
  'name-asc': 'p.name ASC',
};

const mapProduct = (row) => ({
  id: row.id,
  slug: row.slug,
  sku: row.sku,
  name: row.name,
  description: row.description,
  price: Number(row.price),
  stock_quantity: Number(row.stock_quantity),
  image_url: row.image_url,
  featured: row.featured,
  created_at: row.created_at,
  category: {
    id: row.category_id,
    slug: row.category_slug,
    name: row.category_name,
  },
});

export const productRouter = Router();

productRouter.get('/', async (request, response) => {
  const filters = listQuerySchema.parse(request.query);
  const conditions = ['p.is_active = TRUE'];
  const values = [];

  const addValue = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (filters.search) {
    const placeholder = addValue(`%${filters.search.toLowerCase()}%`);
    conditions.push(
      `(LOWER(p.name) LIKE ${placeholder} OR LOWER(p.description) LIKE ${placeholder})`,
    );
  }

  if (filters.category) {
    conditions.push(`c.slug = ${addValue(filters.category)}`);
  }

  if (filters.minPrice !== undefined) {
    conditions.push(`p.price >= ${addValue(filters.minPrice)}`);
  }

  if (filters.maxPrice !== undefined) {
    conditions.push(`p.price <= ${addValue(filters.maxPrice)}`);
  }

  if (filters.featured !== undefined) {
    conditions.push(`p.featured = ${addValue(filters.featured)}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      ${whereClause}
    `,
    values,
  );

  const total = Number(countResult.rows[0].total);
  const offset = (filters.page - 1) * filters.limit;
  const productValues = [...values, filters.limit, offset];
  const limitPlaceholder = `$${productValues.length - 1}`;
  const offsetPlaceholder = `$${productValues.length}`;

  const result = await query(
    `
      SELECT
        p.id,
        p.slug,
        p.sku,
        p.name,
        p.description,
        p.price,
        p.stock_quantity,
        p.image_url,
        p.featured,
        p.created_at,
        c.id AS category_id,
        c.slug AS category_slug,
        c.name AS category_name
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      ${whereClause}
      ORDER BY ${sortExpressions[filters.sort]}
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `,
    productValues,
  );

  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  response.json({
    data: result.rows.map(mapProduct),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages,
      hasPreviousPage: filters.page > 1,
      hasNextPage: filters.page < totalPages,
    },
    filters: {
      search: filters.search,
      category: filters.category ?? null,
      minPrice: filters.minPrice ?? null,
      maxPrice: filters.maxPrice ?? null,
      sort: filters.sort,
      featured: filters.featured ?? null,
    },
  });
});

productRouter.get('/:id', async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const result = await query(
    `
      SELECT
        p.id,
        p.slug,
        p.sku,
        p.name,
        p.description,
        p.price,
        p.stock_quantity,
        p.image_url,
        p.featured,
        p.created_at,
        c.id AS category_id,
        c.slug AS category_slug,
        c.name AS category_name
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1 AND p.is_active = TRUE
      LIMIT 1
    `,
    [id],
  );

  if (!result.rows[0]) {
    throw new HttpError(404, 'Product not found.');
  }

  response.json({ data: mapProduct(result.rows[0]) });
});
