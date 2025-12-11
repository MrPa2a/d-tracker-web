import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '../api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 60, // Categories rarely change, cache for 1 hour
  });
}
