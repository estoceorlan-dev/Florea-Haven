import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { adminCatalogApi, adminOrderApi } from '../services/api.js';
import { queryKeys } from './queryKeys.js';

const loaders = {
  products: (params, signal) => adminCatalogApi.getProducts(params, { signal }),
  categories: (params, signal) => adminCatalogApi.getCategories({ signal }),
  orders: (params, signal) => adminOrderApi.getOrders(params, { signal }),
  order: (params, signal) => adminOrderApi.getOrder(params.id, { signal }),
};

export function useAdminQuery(resource, params = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.user(user?.id), 'admin', resource, params],
    queryFn: ({ signal }) => loaders[resource](params, signal),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
