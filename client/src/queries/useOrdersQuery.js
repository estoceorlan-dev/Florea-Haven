import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { orderApi } from '../services/api.js';
import { queryKeys } from './queryKeys.js';

export const useOrdersQuery = (userId, params) =>
  useQuery({
    queryKey: queryKeys.orderList(userId, params),
    queryFn: ({ queryKey, signal }) => orderApi.getOrders(queryKey[4], { signal }),
    enabled: Boolean(userId),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
