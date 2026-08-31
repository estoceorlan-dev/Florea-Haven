import { Router } from 'express';
import { query } from '../db/database.js';
import { authenticate, requireAdmin } from '../middleware/auth-middleware.js';
import { verifyRequestOrigin } from '../middleware/origin-middleware.js';
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '../services/admin-catalog-service.js';
import {
  createCategorySchema,
  resourceIdSchema,
  updateCategorySchema,
} from '../validation/admin-catalog-schemas.js';

export const categoryRouter = Router();

categoryRouter.get('/', async (request, response) => {
  const result = await query(`
    SELECT
      c.id,
      c.slug,
      c.name,
      c.description,
      COUNT(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p
      ON p.category_id = c.id
      AND p.is_active = TRUE
    GROUP BY c.id, c.slug, c.name, c.description
    ORDER BY c.name ASC
  `);

  response.json({
    data: result.rows.map((category) => ({
      ...category,
      product_count: Number(category.product_count),
    })),
  });
});

categoryRouter.post(
  '/',
  authenticate,
  requireAdmin,
  verifyRequestOrigin,
  async (request, response) => {
    const input = createCategorySchema.parse(request.body);
    response.status(201).json({ data: await createCategory(input) });
  },
);

categoryRouter.put(
  '/:id',
  authenticate,
  requireAdmin,
  verifyRequestOrigin,
  async (request, response) => {
    const categoryId = resourceIdSchema.parse(request.params.id);
    const input = updateCategorySchema.parse(request.body);
    response.json({ data: await updateCategory(categoryId, input) });
  },
);

categoryRouter.delete(
  '/:id',
  authenticate,
  requireAdmin,
  verifyRequestOrigin,
  async (request, response) => {
    const categoryId = resourceIdSchema.parse(request.params.id);
    response.json({ data: await deleteCategory(categoryId) });
  },
);
