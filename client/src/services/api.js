const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const request = async (path, options = {}) => {
  let response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { Accept: 'application/json', ...options.headers },
      ...options,
    });
  } catch {
    throw new ApiError(
      'We could not reach the garden right now. Please check your connection and try again.',
      0,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      payload?.error?.details,
    );
  }

  return payload;
};

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
  getCategories: () => request('/api/categories'),
  getProducts: (params = {}) => request(`/api/products${toQueryString(params)}`),
  getProduct: (id) => request(`/api/products/${id}`),
};
