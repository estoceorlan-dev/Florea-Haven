export const normalizeProductFilters = (params = {}) => {
  const normalized = { sort: 'featured', page: 1, limit: 9 };

  for (const key of [
    'search',
    'category',
    'minPrice',
    'maxPrice',
    'sort',
    'page',
    'limit',
    'featured',
  ]) {
    const value = typeof params[key] === 'string' ? params[key].trim() : params[key];
    if (value === '' || value === null || value === undefined) continue;
    normalized[key] = ['minPrice', 'maxPrice', 'page', 'limit'].includes(key)
      ? Number(value)
      : key === 'featured'
        ? String(value)
        : value;
  }

  return normalized;
};

export const queryKeys = {
  catalog: ['catalog'],
  categories: ['catalog', 'categories'],
  products: ['catalog', 'products'],
  productList: (params) => ['catalog', 'products', normalizeProductFilters(params)],
  product: (id) => ['catalog', 'product', id],
  user: (userId) => ['user', userId],
  cart: (userId) => ['user', userId, 'cart'],
  orders: (userId) => ['user', userId, 'orders'],
  orderList: (userId, params) => [
    'user',
    userId,
    'orders',
    'list',
    {
      page: Math.max(1, Number(params?.page) || 1),
      limit: Math.max(1, Number(params?.limit) || 10),
    },
  ],
  order: (userId, orderId) => ['user', userId, 'orders', 'detail', orderId],
};
