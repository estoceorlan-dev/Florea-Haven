import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireCustomer } from '../middleware/auth-middleware.js';
import { verifyRequestOrigin } from '../middleware/origin-middleware.js';
import { getOrder, listOrders, placeOrder } from '../services/order-service.js';

const idSchema = z.string().uuid('Order ID must be a valid UUID.');
const idempotencySchema = z.object({
  idempotencyKey: z
    .string({ error: 'Idempotency-Key header is required.' })
    .uuid('Idempotency-Key must be a valid UUID.'),
});
const deliveryAddressSchema = z
  .object({
    recipientName: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(7).max(30),
    addressLine1: z.string().trim().min(5).max(160),
    addressLine2: z.string().trim().max(160).optional().default(''),
    city: z.string().trim().min(2).max(80),
    province: z.string().trim().min(2).max(80),
    postalCode: z
      .string()
      .trim()
      .min(3)
      .max(12)
      .regex(/^[A-Za-z0-9 -]+$/, 'Enter a valid postal code.'),
    country: z.literal('Philippines'),
  })
  .strict();
const checkoutSchema = z
  .object({
    cartRevision: z.string().regex(/^[a-f0-9]{64}$/, 'Cart revision is invalid.'),
    paymentMethod: z.literal('cash_on_delivery'),
    deliveryAddress: deliveryAddressSchema,
  })
  .strict();
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(48).optional().default(10),
});

export const orderRouter = Router();

orderRouter.use(authenticate, requireCustomer);

orderRouter.post('/', verifyRequestOrigin, async (request, response) => {
  const { idempotencyKey } = idempotencySchema.parse({
    idempotencyKey: request.get('Idempotency-Key'),
  });
  const input = checkoutSchema.parse(request.body);
  const result = await placeOrder(request.user.id, idempotencyKey, input);

  response.status(result.replayed ? 200 : 201).json({
    data: {
      order: result.order,
      idempotent_replay: result.replayed,
    },
  });
});

orderRouter.get('/', async (request, response) => {
  const filters = listQuerySchema.parse(request.query);
  const result = await listOrders(request.user.id, filters);

  response.json({ data: result.orders, pagination: result.pagination });
});

orderRouter.get('/:id', async (request, response) => {
  const orderId = idSchema.parse(request.params.id);
  response.json({ data: await getOrder(request.user.id, orderId) });
});
