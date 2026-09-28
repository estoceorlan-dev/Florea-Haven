import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../services/api.js';
import { queryKeys } from './queryKeys.js';

const isComplete = (status) => ['delivered', 'cancelled'].includes(status);

export const useOrderQuery = (userId, orderId) =>
  useQuery({
    queryKey: queryKeys.order(userId, orderId),
    queryFn: ({ signal }) => orderApi.getOrder(orderId, { signal }),
    enabled: Boolean(userId && orderId),
    staleTime: (query) =>
      isComplete(query.state.data?.data?.status) ? 5 * 60_000 : 15_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
