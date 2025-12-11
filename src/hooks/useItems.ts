import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchItems, updateItem } from '../api';

export function useItems(search?: string, server?: string, category?: string) {
  return useQuery({
    queryKey: ['items', { search, server, category }],
    queryFn: () => fetchItems(search, server, category),
    enabled: true, // Always enabled, but we can control it if needed
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ oldName, newName, server, category }: { oldName: string; newName: string; server: string; category?: string }) =>
      updateItem(oldName, newName, server, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
