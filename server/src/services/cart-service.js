import { query } from '../db/database.js';

const availabilityFor = (row) => {
  if (!row.is_active) return 'inactive';
  if (Number(row.stock_quantity) === 0) return 'out_of_stock';
  if (Number(row.quantity) > Number(row.stock_quantity)) {
    return 'insufficient_stock';
  }
  return 'available';
};

export const getCart = async (userId) => {
  const result = await query(
    `
      SELECT
        ci.id,
        ci.quantity,
        ci.created_at,
        ci.updated_at,
        p.id AS product_id,
        p.slug AS product_slug,
        p.sku AS product_sku,
        p.name AS product_name,
        p.description AS product_description,
        p.price AS product_price,
        p.stock_quantity,
        p.image_url,
        p.is_active,
        c.id AS category_id,
        c.slug AS category_slug,
        c.name AS category_name
      FROM cart_items ci
      INNER JOIN products p ON p.id = ci.product_id
      INNER JOIN categories c ON c.id = p.category_id
      WHERE ci.user_id = $1
      ORDER BY ci.created_at ASC
    `,
    [userId],
  );

  const items = result.rows.map((row) => {
    const quantity = Number(row.quantity);
    const unitPrice = Number(row.product_price);

    return {
      id: row.id,
      quantity,
      unit_price: unitPrice,
      line_total: unitPrice * quantity,
      availability: availabilityFor(row),
      created_at: row.created_at,
      updated_at: row.updated_at,
      product: {
        id: row.product_id,
        slug: row.product_slug,
        sku: row.product_sku,
        name: row.product_name,
        description: row.product_description,
        price: unitPrice,
        stock_quantity: Number(row.stock_quantity),
        image_url: row.image_url,
        is_active: row.is_active,
        category: {
          id: row.category_id,
          slug: row.category_slug,
          name: row.category_name,
        },
      },
    };
  });

  return {
    items,
    summary: {
      item_count: items.reduce((total, item) => total + item.quantity, 0),
      distinct_items: items.length,
      subtotal: items.reduce((total, item) => total + item.line_total, 0),
      has_unavailable_items: items.some((item) => item.availability !== 'available'),
    },
  };
};
