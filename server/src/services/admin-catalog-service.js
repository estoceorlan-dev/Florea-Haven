import { randomUUID } from 'node:crypto';
import { query } from '../db/database.js';
import { HttpError } from '../utils/http-error.js';

const productSelect = `
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
    p.is_active,
    p.created_at,
    p.updated_at,
    c.id AS category_id,
    c.slug AS category_slug,
    c.name AS category_name
  FROM products p
  INNER JOIN categories c ON c.id = p.category_id
`;

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
  is_active: row.is_active,
  created_at: row.created_at,
  updated_at: row.updated_at,
  category: {
    id: row.category_id,
    slug: row.category_slug,
    name: row.category_name,
  },
});

export const createSlug = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');

const categoryNotFound = () =>
  new HttpError(404, 'Category not found.', undefined, 'CATEGORY_NOT_FOUND');

const productNotFound = () =>
  new HttpError(404, 'Product not found.', undefined, 'PRODUCT_NOT_FOUND');

const uniqueError = (resource, field) =>
  new HttpError(
    409,
    `A ${resource} with this ${field} already exists.`,
    { field },
    `${resource.toUpperCase()}_${field.toUpperCase()}_IN_USE`,
  );

const generatedSlug = (name, suppliedSlug) => {
  const slug = suppliedSlug || createSlug(name);
  if (!slug) {
    throw new HttpError(
      400,
      'Enter a slug containing lowercase letters or numbers.',
      [{ field: 'slug', message: 'A valid slug is required.' }],
      'VALIDATION_ERROR',
    );
  }
  return slug;
};

const ensureCategoryExists = async (categoryId) => {
  const result = await query('SELECT 1 FROM categories WHERE id = $1 LIMIT 1', [
    categoryId,
  ]);

  if (result.rowCount === 0) throw categoryNotFound();
};

const ensureCategoryUnique = async ({ name, slug }, excludeId = null) => {
  if (name !== undefined) {
    const result = await query(
      `
        SELECT 1
        FROM categories
        WHERE LOWER(name) = LOWER($1) AND ($2::uuid IS NULL OR id <> $2)
        LIMIT 1
      `,
      [name, excludeId],
    );
    if (result.rowCount > 0) throw uniqueError('category', 'name');
  }

  if (slug !== undefined) {
    const result = await query(
      `
        SELECT 1
        FROM categories
        WHERE LOWER(slug) = LOWER($1) AND ($2::uuid IS NULL OR id <> $2)
        LIMIT 1
      `,
      [slug, excludeId],
    );
    if (result.rowCount > 0) throw uniqueError('category', 'slug');
  }
};

const ensureProductUnique = async ({ slug, sku }, excludeId = null) => {
  for (const [field, value] of Object.entries({ slug, sku })) {
    if (value === undefined) continue;
    const result = await query(
      `
        SELECT 1
        FROM products
        WHERE LOWER(${field}) = LOWER($1) AND ($2::uuid IS NULL OR id <> $2)
        LIMIT 1
      `,
      [value, excludeId],
    );
    if (result.rowCount > 0) throw uniqueError('product', field);
  }
};

const translateUniqueViolation = (error) => {
  if (error.code !== '23505') throw error;

  const detail = `${error.constraint ?? ''} ${error.message ?? ''}`.toLowerCase();
  if (detail.includes('categories') && detail.includes('name')) {
    throw uniqueError('category', 'name');
  }
  if (detail.includes('categories') && detail.includes('slug')) {
    throw uniqueError('category', 'slug');
  }
  if (detail.includes('sku')) throw uniqueError('product', 'sku');
  throw uniqueError('product', 'slug');
};

export const listAdminCategories = async () => {
  const result = await query(`
    SELECT
      c.id,
      c.slug,
      c.name,
      c.description,
      c.created_at,
      c.updated_at,
      COUNT(p.id)::int AS product_count,
      COUNT(CASE WHEN p.is_active = TRUE THEN 1 END)::int AS active_product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id, c.slug, c.name, c.description, c.created_at, c.updated_at
    ORDER BY c.name ASC
  `);

  return result.rows.map((row) => ({
    ...row,
    product_count: Number(row.product_count),
    active_product_count: Number(row.active_product_count),
  }));
};

export const listAdminProducts = async (filters) => {
  const conditions = [];
  const values = [];
  const addValue = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (filters.search) {
    const placeholder = addValue(`%${filters.search.toLowerCase()}%`);
    conditions.push(
      `(LOWER(p.name) LIKE ${placeholder} OR LOWER(p.sku) LIKE ${placeholder})`,
    );
  }
  if (filters.category) {
    conditions.push(`p.category_id = ${addValue(filters.category)}`);
  }
  if (filters.status !== 'all') {
    conditions.push(`p.is_active = ${addValue(filters.status === 'active')}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM products p
      ${whereClause}
    `,
    values,
  );
  const total = Number(countResult.rows[0].total);
  const offset = (filters.page - 1) * filters.limit;
  const productValues = [...values, filters.limit, offset];
  const sortExpressions = {
    newest: 'p.created_at DESC, p.name ASC',
    'name-asc': 'p.name ASC',
    'stock-asc': 'p.stock_quantity ASC, p.name ASC',
    'stock-desc': 'p.stock_quantity DESC, p.name ASC',
  };
  const result = await query(
    `
      ${productSelect}
      ${whereClause}
      ORDER BY ${sortExpressions[filters.sort]}
      LIMIT $${productValues.length - 1}
      OFFSET $${productValues.length}
    `,
    productValues,
  );
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return {
    products: result.rows.map(mapProduct),
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

const getAdminProduct = async (productId) => {
  const result = await query(`${productSelect} WHERE p.id = $1 LIMIT 1`, [productId]);
  if (!result.rows[0]) throw productNotFound();
  return mapProduct(result.rows[0]);
};

export const createCategory = async (input) => {
  const slug = generatedSlug(input.name, input.slug);
  await ensureCategoryUnique({ name: input.name, slug });

  try {
    const result = await query(
      `
        INSERT INTO categories (id, slug, name, description)
        VALUES ($1, $2, $3, $4)
        RETURNING id, slug, name, description, created_at, updated_at
      `,
      [randomUUID(), slug, input.name, input.description],
    );
    return { ...result.rows[0], product_count: 0, active_product_count: 0 };
  } catch (error) {
    translateUniqueViolation(error);
  }
};

export const updateCategory = async (categoryId, input) => {
  const existing = await query(
    'SELECT id, slug, name, description FROM categories WHERE id = $1 LIMIT 1',
    [categoryId],
  );
  if (!existing.rows[0]) throw categoryNotFound();

  await ensureCategoryUnique(input, categoryId);
  const values = [];
  const assignments = [];
  const columnMap = { name: 'name', slug: 'slug', description: 'description' };
  for (const [field, column] of Object.entries(columnMap)) {
    if (input[field] === undefined) continue;
    values.push(input[field]);
    assignments.push(`${column} = $${values.length}`);
  }
  values.push(categoryId);

  try {
    await query(
      `
        UPDATE categories
        SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${values.length}
      `,
      values,
    );
    return (await listAdminCategories()).find((category) => category.id === categoryId);
  } catch (error) {
    translateUniqueViolation(error);
  }
};

export const deleteCategory = async (categoryId) => {
  const existing = await query('SELECT id FROM categories WHERE id = $1 LIMIT 1', [
    categoryId,
  ]);
  if (!existing.rows[0]) throw categoryNotFound();

  const products = await query(
    'SELECT COUNT(*)::int AS total FROM products WHERE category_id = $1',
    [categoryId],
  );
  if (Number(products.rows[0].total) > 0) {
    throw new HttpError(
      409,
      'This category is still referenced by products and cannot be deleted.',
      undefined,
      'CATEGORY_IN_USE',
    );
  }

  await query('DELETE FROM categories WHERE id = $1', [categoryId]);
  return { id: categoryId, deleted: true };
};

export const createProduct = async (input) => {
  const slug = generatedSlug(input.name, input.slug);
  const normalized = { ...input, slug, sku: input.sku.toUpperCase() };
  await ensureCategoryExists(normalized.categoryId);
  await ensureProductUnique(normalized);

  try {
    const result = await query(
      `
        INSERT INTO products (
          id, category_id, slug, sku, name, description, price,
          stock_quantity, image_url, featured, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
        RETURNING id
      `,
      [
        randomUUID(),
        normalized.categoryId,
        normalized.slug,
        normalized.sku,
        normalized.name,
        normalized.description,
        normalized.price,
        normalized.stockQuantity,
        normalized.imageUrl,
        normalized.featured,
      ],
    );
    return getAdminProduct(result.rows[0].id);
  } catch (error) {
    translateUniqueViolation(error);
  }
};

export const updateProduct = async (productId, input) => {
  await getAdminProduct(productId);
  if (input.categoryId !== undefined) await ensureCategoryExists(input.categoryId);

  const normalized = {
    ...input,
    ...(input.sku !== undefined ? { sku: input.sku.toUpperCase() } : {}),
  };
  await ensureProductUnique(normalized, productId);

  const values = [];
  const assignments = [];
  const columnMap = {
    categoryId: 'category_id',
    slug: 'slug',
    sku: 'sku',
    name: 'name',
    description: 'description',
    price: 'price',
    stockQuantity: 'stock_quantity',
    imageUrl: 'image_url',
    featured: 'featured',
    isActive: 'is_active',
  };
  for (const [field, column] of Object.entries(columnMap)) {
    if (normalized[field] === undefined) continue;
    values.push(normalized[field]);
    assignments.push(`${column} = $${values.length}`);
  }
  values.push(productId);

  try {
    await query(
      `
        UPDATE products
        SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${values.length}
      `,
      values,
    );
    return getAdminProduct(productId);
  } catch (error) {
    translateUniqueViolation(error);
  }
};

export const deactivateProduct = async (productId) => {
  const result = await query(
    `
      UPDATE products
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `,
    [productId],
  );
  if (result.rowCount === 0) throw productNotFound();
  return getAdminProduct(productId);
};
