import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLists, createList, deleteList, addItemToList, removeItemFromList } from '../api';
import type { DateRangePreset } from '../types';

export function useLists(profileId?: string, range: DateRangePreset = '30d') {
  const queryClient = useQueryClient();

  const { data: lists = [], isLoading, error } = useQuery({
    queryKey: ['lists', profileId, range],
    queryFn: () => fetchLists(profileId, range),
  });

  const createMutation = useMutation({
    mutationFn: (params: { name: string; scope: 'public' | 'private'; profileId?: string }) =>
      createList(params.name, params.scope, params.profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (params: { listId: string; itemId: number }) =>
      addItemToList(params.listId, params.itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (params: { listId: string; itemId: number }) =>
      removeItemFromList(params.listId, params.itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  return {
    lists,
    isLoading,
    error,
    createList: createMutation.mutate,
    isCreating: createMutation.isPending,
    deleteList: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    addItem: addItemMutation.mutate,
    removeItem: removeItemMutation.mutate,
  };
}
