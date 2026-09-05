import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../services/api.js';
import { queryKeys } from './queryKeys.js';

export const useCategoriesQuery = () =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: ({ signal }) => catalogApi.getCategories({ signal }),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
