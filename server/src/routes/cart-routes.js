import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/database.js';
import { authenticate } from '../middleware/auth-middleware.js';
import { verifyRequestOrigin } from '../middleware/origin-middleware.js';
import { getCart } from '../services/cart-service.js';
import { HttpError } from '../utils/http-error.js';

const productIdSchema = z.string().uuid('Product ID must be a valid UUID.');
const itemIdSchema = z.string().uuid('Cart item ID must be a valid UUID.');
const quantitySchema = z.coerce
  .number()
  .int()
  .min(1, 'Quantity must be at least 1.')
  .max(99, 'Quantity cannot exceed 99.');

const addItemSchema = z.object({
  productId: productIdSchema,
  quantity: quantitySchema.optional().default(1),
});

const updateItemSchema = z.object({
  quantity: quantitySchema,
});

const productUnavailableError = (message, code) =>
  new HttpError(409, message, undefined, code);

const loadProduct = async (productId) => {
  const result = await query(
    `
      SELECT id, name, stock_quantity, is_active
      FROM products
      WHERE id = $1
      LIMIT 1
    `,
    [productId],
  );

  if (!result.rows[0]) {
    throw new HttpError(404, 'Product not found.', undefined, 'PRODUCT_NOT_FOUND');
  }

  return {
    ...result.rows[0],
    stock_quantity: Number(result.rows[0].stock_quantity),
  };
};

const validateAvailability = (product, quantity) => {
  if (!product.is_active) {
    throw productUnavailableError(
      `${product.name} is no longer available.`,
      'PRODUCT_INACTIVE',
    );
  }

  if (quantity > product.stock_quantity) {
    throw productUnavailableError(
      `Only ${product.stock_quantity} of this product are currently available.`,
      'INSUFFICIENT_STOCK',
    );
  }
};

export const cartRouter = Router();

cartRouter.use(authenticate);

cartRouter.get('/', async (request, response) => {
  response.json({ data: { cart: await getCart(request.user.id) } });
});

cartRouter.post('/items', verifyRequestOrigin, async (request, response) => {
  const input = addItemSchema.parse(request.body);
  const product = await loadProduct(input.productId);
  const existingResult = await query(
    `
      SELECT id, quantity
      FROM cart_items
      WHERE user_id = $1 AND product_id = $2
      LIMIT 1
    `,
    [request.user.id, input.productId],
  );
  const existingItem = existingResult.rows[0];
  const nextQuantity = Number(existingItem?.quantity ?? 0) + input.quantity;

  validateAvailability(product, nextQuantity);

  if (existingItem) {
    await query(
      `
        UPDATE cart_items
        SET quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3
      `,
      [nextQuantity, existingItem.id, request.user.id],
    );
  } else {
    await query(
      `
        INSERT INTO cart_items (id, user_id, product_id, quantity)
        VALUES ($1, $2, $3, $4)
      `,
      [randomUUID(), request.user.id, input.productId, input.quantity],
    );
  }

  response.status(201).json({ data: { cart: await getCart(request.user.id) } });
});

cartRouter.put('/items/:id', verifyRequestOrigin, async (request, response) => {
  const itemId = itemIdSchema.parse(request.params.id);
  const input = updateItemSchema.parse(request.body);
  const itemResult = await query(
    `
      SELECT ci.id, ci.product_id
      FROM cart_items ci
      WHERE ci.id = $1 AND ci.user_id = $2
      LIMIT 1
    `,
    [itemId, request.user.id],
  );
  const item = itemResult.rows[0];

  if (!item) {
    throw new HttpError(404, 'Cart item not found.', undefined, 'CART_ITEM_NOT_FOUND');
  }

  const product = await loadProduct(item.product_id);
  validateAvailability(product, input.quantity);

  await query(
    `
      UPDATE cart_items
      SET quantity = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
    `,
    [input.quantity, itemId, request.user.id],
  );

  response.json({ data: { cart: await getCart(request.user.id) } });
});

cartRouter.delete('/items/:id', verifyRequestOrigin, async (request, response) => {
  const itemId = itemIdSchema.parse(request.params.id);
  const result = await query(
    `
        DELETE FROM cart_items
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `,
    [itemId, request.user.id],
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Cart item not found.', undefined, 'CART_ITEM_NOT_FOUND');
  }

  response.json({ data: { cart: await getCart(request.user.id) } });
});
