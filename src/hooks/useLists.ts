import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLists, createList, deleteList, addItemToList, removeItemFromList, updateList } from '../api';
import type { DateRangePreset } from '../types';

export function useLists(profileId?: string, range: DateRangePreset = '30d') {
  const queryClient = useQueryClient();
  
  // Local loading states to include refetch time
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: lists = [], isLoading, error } = useQuery({
    queryKey: ['lists', profileId, range],
    queryFn: () => fetchLists(profileId, range),
  });

  const createMutation = useMutation({
    mutationFn: (params: { name: string; scope: 'public' | 'private'; profileId?: string }) =>
      createList(params.name, params.scope, params.profileId),
  });

  const handleCreateList = async (
    params: { name: string; scope: 'public' | 'private'; profileId?: string },
    options?: { onSuccess?: () => void; onError?: (err: unknown) => void }
  ) => {
    setIsCreating(true);
    try {
      await createMutation.mutateAsync(params);
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
      options?.onSuccess?.();
    } catch (err) {
      options?.onError?.(err);
    } finally {
      setIsCreating(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; updates: { name?: string; scope?: 'public' | 'private'; profileId?: string } }) =>
      updateList(params.id, params.updates),
  });

  const handleUpdateList = async (
    params: { id: string; updates: { name?: string; scope?: 'public' | 'private'; profileId?: string } },
    options?: { onSuccess?: () => void; onError?: (err: unknown) => void }
  ) => {
    setIsUpdating(true);
    try {
      await updateMutation.mutateAsync(params);
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
      options?.onSuccess?.();
    } catch (err) {
      options?.onError?.(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteList(id),
  });

  const handleDeleteList = async (
    id: string,
    options?: { onSuccess?: () => void; onError?: (err: unknown) => void }
  ) => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(id);
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
      options?.onSuccess?.();
    } catch (err) {
      options?.onError?.(err);
    } finally {
      setIsDeleting(false);
    }
  };

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
    createList: handleCreateList,
    isCreating,
    updateList: handleUpdateList,
    isUpdating,
    deleteList: handleDeleteList,
    isDeleting,
    addItem: addItemMutation.mutate,
    removeItem: removeItemMutation.mutate,
  };
}
