const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(message, status, details, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

const request = async (path, options = {}) => {
  let response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      headers: { Accept: 'application/json', ...options.headers },
      ...options,
    });
  } catch (error) {
    if (error.name === 'AbortError' || options.signal?.aborted) throw error;
    throw new ApiError(
      'We could not reach the garden right now. Please check your connection and try again.',
      0,
    );
  }

  const payload = await response.json().catch((error) => {
    if (error.name === 'AbortError' || options.signal?.aborted) throw error;
    throw new ApiError(
      'We could not read the response. Please try again.',
      response.status,
    );
  });

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      payload?.error?.details,
      payload?.error?.code,
    );
  }

  return payload;
};

const jsonRequest = (path, method, body, headers = {}) =>
  request(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

const toQueryString = (params) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

export const catalogApi = {
  getCategories: (options = {}) => request('/api/categories', options),
  getProducts: (params = {}, options = {}) =>
    request(`/api/products${toQueryString(params)}`, options),
  getProduct: (id, options = {}) => request(`/api/products/${id}`, options),
};

export const adminCatalogApi = {
  getCategories: () => request('/api/admin/categories'),
  createCategory: (input) => jsonRequest('/api/categories', 'POST', input),
  updateCategory: (id, input) => jsonRequest(`/api/categories/${id}`, 'PUT', input),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),
  getProducts: (params = {}) => request(`/api/admin/products${toQueryString(params)}`),
  createProduct: (input) => jsonRequest('/api/products', 'POST', input),
  updateProduct: (id, input) => jsonRequest(`/api/products/${id}`, 'PUT', input),
  deactivateProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),
};

export const adminOrderApi = {
  getOrders: (params = {}) => request(`/api/admin/orders${toQueryString(params)}`),
  getOrder: (id) => request(`/api/admin/orders/${id}`),
  updateStatus: (id, status) =>
    jsonRequest(`/api/admin/orders/${id}/status`, 'PUT', { status }),
};

export const authApi = {
  register: (input) => jsonRequest('/api/auth/register', 'POST', input),
  login: (input) => jsonRequest('/api/auth/login', 'POST', input),
  logout: () => jsonRequest('/api/auth/logout', 'POST'),
  getMe: () => request('/api/auth/me'),
};

export const cartApi = {
  getCart: () => request('/api/cart'),
  addItem: (productId, quantity = 1) =>
    jsonRequest('/api/cart/items', 'POST', { productId, quantity }),
  updateItem: (itemId, quantity) =>
    jsonRequest(`/api/cart/items/${itemId}`, 'PUT', { quantity }),
  removeItem: (itemId) => request(`/api/cart/items/${itemId}`, { method: 'DELETE' }),
};

export const orderApi = {
  placeOrder: (input, idempotencyKey) =>
    jsonRequest('/api/orders', 'POST', input, {
      'Idempotency-Key': idempotencyKey,
    }),
  getOrders: (params = {}) => request(`/api/orders${toQueryString(params)}`),
  getOrder: (id) => request(`/api/orders/${id}`),
};
