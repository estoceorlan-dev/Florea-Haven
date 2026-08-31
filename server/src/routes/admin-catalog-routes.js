import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth-middleware.js';
import {
  listAdminCategories,
  listAdminProducts,
} from '../services/admin-catalog-service.js';
import { adminProductListSchema } from '../validation/admin-catalog-schemas.js';

export const adminCatalogRouter = Router();

adminCatalogRouter.use(authenticate, requireAdmin);

adminCatalogRouter.get('/categories', async (request, response) => {
  response.json({ data: await listAdminCategories() });
});

adminCatalogRouter.get('/products', async (request, response) => {
  const filters = adminProductListSchema.parse(request.query);
  const result = await listAdminProducts(filters);
  response.json({ data: result.products, pagination: result.pagination });
});
