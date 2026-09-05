import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { catalogApi } from '../services/api.js';
import { liveStockOptions } from './catalogOptions.js';
import { queryKeys } from './queryKeys.js';

export const useProductsQuery = (params) =>
  useQuery({
    queryKey: queryKeys.productList(params),
    queryFn: ({ queryKey, signal }) => catalogApi.getProducts(queryKey[2], { signal }),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
    ...liveStockOptions,
  });
