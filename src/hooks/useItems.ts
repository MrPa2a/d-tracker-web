import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchItems, updateItem, fetchItemDetails } from '../api';

export function useItems(search?: string, server?: string, category?: string) {
  return useQuery({
    queryKey: ['items', { search, server, category }],
    queryFn: () => fetchItems(search, server, category),
    enabled: true, // Always enabled, but we can control it if needed
  });
}

export function useItemByName(itemName: string, server: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['item-details', server, itemName],
    queryFn: () => fetchItems(itemName, server),
    enabled: enabled && !!server && !!itemName,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useItemDetails(itemName: string, server: string) {
  return useQuery({
    queryKey: ['item-full-details', server, itemName],
    queryFn: () => fetchItemDetails(itemName, server),
    enabled: !!server && !!itemName,
    staleTime: 1000 * 60 * 60, // 1 hour
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
