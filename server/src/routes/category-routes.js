import { Router } from 'express';
import { query } from '../db/database.js';

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
