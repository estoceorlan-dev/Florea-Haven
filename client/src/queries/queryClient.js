import { focusManager, QueryCache, QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys.js';

// Include window focus as well as tab visibility; hidden tabs never poll.
focusManager.setEventListener((handleFocus) => {
  const onFocus = () => handleFocus();
  window.addEventListener('focus', onFocus);
  window.addEventListener('visibilitychange', onFocus);
  return () => {
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('visibilitychange', onFocus);
  };
});

export function createAppQueryClient() {
  const syncStock = (items, sourceQuery) => {
    const stock = new Map(items.map((item) => [item.id, item.stock_quantity]));
    const updateItem = (item) =>
      stock.has(item.id) && stock.get(item.id) !== item.stock_quantity
        ? { ...item, stock_quantity: stock.get(item.id) }
        : item;

    // Share the newest inventory between list and detail consumers without
    // changing filter membership, prices, or the freshness of other fields.
    for (const query of client
      .getQueryCache()
      .findAll({ queryKey: queryKeys.catalog })) {
      if (query === sourceQuery || !query.state.data) continue;
      const payload = query.state.data;
      let data;
      if (query.queryKey[1] === 'products') {
        const items = payload.data.map(updateItem);
        if (items.some((item, index) => item !== payload.data[index])) data = items;
      } else if (query.queryKey[1] === 'product') {
        const item = updateItem(payload.data);
        if (item !== payload.data) data = item;
      }
      if (data)
        client.setQueryData(
          query.queryKey,
          { ...payload, data },
          { updatedAt: query.state.dataUpdatedAt },
        );
    }
  };

  const client = new QueryClient({
    queryCache: new QueryCache({
      onSuccess: (payload, query) => {
        if (query.queryKey[0] !== 'catalog') return;
        if (query.queryKey[1] === 'products') syncStock(payload.data, query);
        if (query.queryKey[1] === 'product') syncStock([payload.data], query);
      },
      onError: (error, query) => {
        if (
          query.queryKey[0] === 'catalog' &&
          query.queryKey[1] === 'product' &&
          error.status === 404
        ) {
          syncStock([{ id: query.queryKey[2], stock_quantity: 0 }], query);
        }
      },
    }),
    defaultOptions: {
      queries: {
        gcTime: 10 * 60_000,
        retry: (failureCount, error) =>
          failureCount < 2 &&
          (error.status === 0 || error.status >= 500) &&
          error.name !== 'AbortError',
        retryDelay: (attempt) =>
          Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 300,
      },
      mutations: { retry: false },
    },
  });
  return client;
}
