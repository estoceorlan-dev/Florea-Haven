import { useQuery } from '@tanstack/react-query';
import { cartApi } from '../services/api.js';
import { queryKeys } from './queryKeys.js';

export const emptyCart = {
  items: [],
  revision: null,
  summary: {
    item_count: 0,
    distinct_items: 0,
    subtotal: 0,
    has_unavailable_items: false,
  },
};

export const useCartQuery = (userId, options = {}) =>
  useQuery({
    queryKey: queryKeys.cart(userId),
    queryFn: ({ signal }) =>
      cartApi.getCart({ signal }).then((payload) => payload.data.cart),
    enabled: Boolean(userId),
    staleTime: 5_000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    ...options,
  });
