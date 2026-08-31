import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug must contain at least 2 characters.')
  .max(60, 'Slug must contain no more than 60 characters.')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug can contain lowercase letters, numbers, and single hyphens.',
  );

const optionalSlugSchema = z
  .union([slugSchema, z.literal('')])
  .transform((value) => value || undefined)
  .optional();

const moneySchema = z.coerce
  .number()
  .finite()
  .min(0, 'Price cannot be negative.')
  .max(9_999_999.99, 'Price cannot exceed ₱9,999,999.99.')
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    'Price cannot contain more than two decimal places.',
  );

const stockSchema = z.coerce
  .number()
  .int('Stock must be a whole number.')
  .min(0, 'Stock cannot be negative.')
  .max(2_147_483_647, 'Stock is too large.');

const imageUrlSchema = z
  .union([
    z
      .string()
      .trim()
      .max(2048)
      .refine((value) => {
        try {
          return ['http:', 'https:'].includes(new URL(value).protocol);
        } catch {
          return false;
        }
      }, 'Image URL must be an absolute HTTP or HTTPS URL.'),
    z.literal(''),
    z.null(),
  ])
  .transform((value) => value || null);

const categoryFields = {
  name: z
    .string()
    .trim()
    .min(2, 'Category name must contain at least 2 characters.')
    .max(80, 'Category name must contain no more than 80 characters.'),
  slug: optionalSlugSchema,
  description: z
    .string()
    .trim()
    .max(1000, 'Description must contain no more than 1,000 characters.'),
};

export const createCategorySchema = z
  .object({
    ...categoryFields,
    description: categoryFields.description.optional().default(''),
  })
  .strict();

export const updateCategorySchema = z
  .object(categoryFields)
  .partial()
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Provide at least one category field to update.',
  });

const productFields = {
  categoryId: z.string().uuid('Category ID must be a valid UUID.'),
  name: z
    .string()
    .trim()
    .min(2, 'Product name must contain at least 2 characters.')
    .max(120, 'Product name must contain no more than 120 characters.'),
  slug: optionalSlugSchema,
  sku: z
    .string()
    .trim()
    .min(2, 'SKU must contain at least 2 characters.')
    .max(50, 'SKU must contain no more than 50 characters.')
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Enter a valid SKU.'),
  description: z
    .string()
    .trim()
    .min(1, 'Product description is required.')
    .max(5000, 'Description must contain no more than 5,000 characters.'),
  price: moneySchema,
  stockQuantity: stockSchema,
  imageUrl: imageUrlSchema,
  featured: z.boolean(),
};

export const createProductSchema = z
  .object({
    ...productFields,
    imageUrl: productFields.imageUrl.optional().default(null),
    featured: productFields.featured.optional().default(false),
  })
  .strict();

export const updateProductSchema = z
  .object({ ...productFields, isActive: z.boolean() })
  .partial()
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Provide at least one product field to update.',
  });

export const resourceIdSchema = z.string().uuid('Resource ID must be a valid UUID.');

export const adminProductListSchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  category: z.string().uuid('Category filter must be a valid UUID.').optional(),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  sort: z
    .enum(['newest', 'name-asc', 'stock-asc', 'stock-desc'])
    .optional()
    .default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
