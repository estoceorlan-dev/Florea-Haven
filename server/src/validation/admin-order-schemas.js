import { z } from 'zod';

export const orderStatuses = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
];

const dateFilterSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
  }, 'Enter a valid calendar date.');

export const adminOrderListSchema = z
  .object({
    search: z.string().trim().max(100).optional().default(''),
    customer: z.string().trim().max(100).optional().default(''),
    status: z
      .enum(['all', ...orderStatuses])
      .optional()
      .default('all'),
    dateFrom: dateFilterSchema.optional(),
    dateTo: dateFilterSchema.optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .refine(({ dateFrom, dateTo }) => !dateFrom || !dateTo || dateFrom <= dateTo, {
    message: 'The start date cannot be after the end date.',
    path: ['dateFrom'],
  });

export const updateOrderStatusSchema = z
  .object({ status: z.enum(orderStatuses) })
  .strict();

export const adminOrderIdSchema = z.string().uuid('Order ID must be a valid UUID.');
