import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogApi } from '../services/api.js';
import { AppQueryProvider } from './AppQueryProvider.jsx';
import { createAppQueryClient } from './queryClient.js';
import { queryKeys } from './queryKeys.js';
import { useProductsQuery } from './useProductsQuery.js';
import { useProductQuery } from './useProductQuery.js';

const item = { id: 'flower', name: 'Garden bouquet', stock_quantity: 14 };
const list = { data: [item], pagination: { page: 1 } };
const clients = [];
const setup = () => {
  const client = createAppQueryClient();
  clients.push(client);
  return {
    client,
    wrapper: ({ children }) => (
      <AppQueryProvider client={client}>{children}</AppQueryProvider>
    ),
  };
};

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.restoreAllMocks();
});

describe('catalog queries', () => {
  it('deduplicates equivalent filters and shares refreshed stock with detail consumers', async () => {
    const listRequest = vi.spyOn(catalogApi, 'getProducts').mockResolvedValue(list);
    vi.spyOn(catalogApi, 'getProduct').mockResolvedValue({ data: item });
    const { client, wrapper } = setup();
    const { result } = renderHook(
      () => ({
        first: useProductsQuery({ page: '1', search: ' bouquet ', minPrice: '100.00' }),
        second: useProductsQuery({
          search: 'bouquet',
          minPrice: 100,
          page: 1,
          sort: 'featured',
          limit: 9,
        }),
        detail: useProductQuery(item.id),
      }),
      { wrapper },
    );
    await waitFor(() =>
      expect(
        result.current.detail.isSuccess &&
          result.current.first.isSuccess &&
          result.current.second.isSuccess,
      ).toBe(true),
    );
    expect(listRequest).toHaveBeenCalledTimes(1);
    expect(result.current.first.data.data[0].stock_quantity).toBe(14);
    expect(result.current.second.data.data[0].stock_quantity).toBe(14);
    expect(result.current.detail.data.data.stock_quantity).toBe(14);
    listRequest.mockResolvedValue({ ...list, data: [{ ...item, stock_quantity: 0 }] });
    await act(async () => client.invalidateQueries({ queryKey: queryKeys.products }));
    await waitFor(() => expect(result.current.detail.data.data.stock_quantity).toBe(0));
    expect(result.current.first.data.data[0].stock_quantity).toBe(0);
    expect(result.current.second.data.data[0].stock_quantity).toBe(0);
    expect(catalogApi.getProduct).toHaveBeenCalledTimes(1);
    vi.mocked(catalogApi.getProduct).mockResolvedValue({
      data: { ...item, stock_quantity: 5 },
    });
    await act(async () =>
      client.invalidateQueries({ queryKey: queryKeys.product(item.id) }),
    );
    await waitFor(() =>
      expect(result.current.first.data.data[0].stock_quantity).toBe(5),
    );
  });

  it('cancels obsolete filter requests and never replaces newer results with their response', async () => {
    let oldSignal;
    let finishOld;
    vi.spyOn(catalogApi, 'getProducts').mockImplementation((params, { signal }) => {
      if (params.search === 'old') {
        oldSignal = signal;
        return new Promise((resolve) => {
          finishOld = resolve;
        });
      }
      return Promise.resolve(list);
    });
    const { wrapper } = setup();
    const { result, rerender, unmount } = renderHook(
      ({ search }) => useProductsQuery({ search }),
      { wrapper, initialProps: { search: 'old' } },
    );
    rerender({ search: 'new' });
    expect(oldSignal.aborted).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => finishOld({ data: [{ ...item, name: 'Obsolete bouquet' }] }));
    expect(result.current.data.data[0].name).toBe('Garden bouquet');
    expect(result.current.error).toBeNull();
    rerender({ search: 'old' });
    unmount();
    expect(oldSignal.aborted).toBe(true);
  });

  it('does not retry client errors and bounds transient retries', async () => {
    const { client } = setup();
    const denied = vi.fn().mockRejectedValue({ status: 400 });
    await expect(
      client.fetchQuery({ queryKey: ['bad-request'], queryFn: denied }),
    ).rejects.toEqual({ status: 400 });
    expect(denied).toHaveBeenCalledTimes(1);
    const unavailable = vi.fn().mockRejectedValue({ status: 503 });
    await expect(
      client.fetchQuery({
        queryKey: ['unavailable'],
        queryFn: unavailable,
        retryDelay: 0,
      }),
    ).rejects.toEqual({ status: 503 });
    expect(unavailable).toHaveBeenCalledTimes(3);
  });
});
