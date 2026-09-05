import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, catalogApi } from './api.js';

afterEach(() => vi.restoreAllMocks());

describe('catalog request cancellation', () => {
  it('passes the abort signal to GET requests and preserves a fetch abort', async () => {
    const controller = new AbortController();
    const error = new DOMException('Aborted', 'AbortError');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(error);
    await expect(
      catalogApi.getProducts({}, { signal: controller.signal }),
    ).rejects.toBe(error);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/products',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('preserves an abort while the response body is being read', async () => {
    const error = new DOMException('Aborted', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(error),
    });
    await expect(catalogApi.getProduct('flower')).rejects.toBe(error);
  });

  it('reports malformed JSON as an API error instead of successful empty data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Invalid JSON')),
    });
    await expect(catalogApi.getCategories()).rejects.toBeInstanceOf(ApiError);
  });
});
