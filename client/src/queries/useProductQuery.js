import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../services/api.js';
import { liveStockOptions } from './catalogOptions.js';
import { queryKeys } from './queryKeys.js';

export const useProductQuery = (id) =>
  useQuery({
    queryKey: queryKeys.product(id),
    queryFn: ({ signal }) => catalogApi.getProduct(id, { signal }),
    staleTime: 15_000,
    ...liveStockOptions,
  });
