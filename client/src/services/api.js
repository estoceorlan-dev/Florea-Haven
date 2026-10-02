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
  getCategories: (options = {}) => request('/api/admin/categories', options),
  createCategory: (input) => jsonRequest('/api/categories', 'POST', input),
  updateCategory: (id, input) => jsonRequest(`/api/categories/${id}`, 'PUT', input),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),
  getProducts: (params = {}, options = {}) =>
    request(`/api/admin/products${toQueryString(params)}`, options),
  createProduct: (input) => jsonRequest('/api/products', 'POST', input),
  updateProduct: (id, input) => jsonRequest(`/api/products/${id}`, 'PUT', input),
  deactivateProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),
};

export const adminOrderApi = {
  getOrders: (params = {}, options = {}) =>
    request(`/api/admin/orders${toQueryString(params)}`, options),
  getOrder: (id, options = {}) => request(`/api/admin/orders/${id}`, options),
  updateStatus: (id, status) =>
    jsonRequest(`/api/admin/orders/${id}/status`, 'PUT', { status }),
};

export const adminUserApi = {
  getUsers: (params = {}, options = {}) =>
    request(`/api/admin/users${toQueryString(params)}`, options),
  createUser: (input) => jsonRequest('/api/admin/users', 'POST', input),
  updateUser: (id, input) => jsonRequest(`/api/admin/users/${id}`, 'PUT', input),
};

export const authApi = {
  register: (input) => jsonRequest('/api/auth/register', 'POST', input),
  login: (input) => jsonRequest('/api/auth/login', 'POST', input),
  logout: () => jsonRequest('/api/auth/logout', 'POST'),
  getMe: () => request('/api/auth/me'),
};

export const imageApi = {
  remove: (endpoint) => request(endpoint, { method: 'DELETE' }),
  upload: (endpoint, file, onProgress) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', `${apiBaseUrl}${endpoint}`);
      xhr.withCredentials = true;
      xhr.timeout = 90000;
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable)
          onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        let payload;
        try {
          payload = JSON.parse(xhr.responseText);
        } catch {
          reject(
            new ApiError(
              'We could not read the response. Please try again.',
              xhr.status,
            ),
          );
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
        else
          reject(
            new ApiError(
              payload?.error?.details?.[0]?.message ??
                payload?.error?.message ??
                'Image upload failed. Please try again.',
              xhr.status,
            ),
          );
      };
      xhr.onerror = () =>
        reject(
          new ApiError('Image upload failed. Check your connection and try again.', 0),
        );
      xhr.ontimeout = () =>
        reject(new ApiError('The upload timed out. Please try again.', 0));
      const body = new FormData();
      body.append('file', file);
      xhr.send(body);
    }),
};

export const cartApi = {
  getCart: (options = {}) => request('/api/cart', options),
  addItem: (productId, quantity = 1) =>
    jsonRequest('/api/cart/items', 'POST', { productId, quantity }),
  updateItem: (itemId, quantity) =>
    jsonRequest(`/api/cart/items/${itemId}`, 'PUT', { quantity }),
  removeItem: (itemId) => request(`/api/cart/items/${itemId}`, { method: 'DELETE' }),
};

export const orderApi = {
  buyNow: (input, idempotencyKey) =>
    jsonRequest('/api/orders/buy-now', 'POST', input, {
      'Idempotency-Key': idempotencyKey,
    }),
  placeOrder: (input, idempotencyKey) =>
    jsonRequest('/api/orders', 'POST', input, {
      'Idempotency-Key': idempotencyKey,
    }),
  getOrders: (params = {}, options = {}) =>
    request(`/api/orders${toQueryString(params)}`, options),
  getOrder: (id, options = {}) => request(`/api/orders/${id}`, options),
};
