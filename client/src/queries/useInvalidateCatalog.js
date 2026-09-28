import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys.js';

export function useInvalidateCatalog() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.catalog }),
      client.invalidateQueries({
        predicate: (query) =>
          query.queryKey[2] === 'admin' &&
          ['products', 'categories'].includes(query.queryKey[3]),
      }),
    ]);
}
