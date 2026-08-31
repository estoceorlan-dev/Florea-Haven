import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth-middleware.js';
import { verifyRequestOrigin } from '../middleware/origin-middleware.js';
import {
  getAdminOrder,
  listAdminOrders,
  updateAdminOrderStatus,
} from '../services/admin-order-service.js';
import {
  adminOrderIdSchema,
  adminOrderListSchema,
  updateOrderStatusSchema,
} from '../validation/admin-order-schemas.js';

export const adminOrderRouter = Router();

adminOrderRouter.use('/orders', authenticate, requireAdmin);

adminOrderRouter.get('/orders', async (request, response) => {
  const filters = adminOrderListSchema.parse(request.query);
  const result = await listAdminOrders(filters);

  response.json({ data: result.orders, pagination: result.pagination });
});

adminOrderRouter.get('/orders/:id', async (request, response) => {
  const orderId = adminOrderIdSchema.parse(request.params.id);
  response.json({ data: await getAdminOrder(orderId) });
});

adminOrderRouter.put(
  '/orders/:id/status',
  verifyRequestOrigin,
  async (request, response) => {
    const orderId = adminOrderIdSchema.parse(request.params.id);
    const { status } = updateOrderStatusSchema.parse(request.body);
    response.json({ data: await updateAdminOrderStatus(orderId, status) });
  },
);
