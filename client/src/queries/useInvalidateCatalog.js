import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys.js';

export function useInvalidateCatalog() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: queryKeys.catalog });
}
