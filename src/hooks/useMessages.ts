import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchMessages, 
  createMessage, 
  updateMessage, 
  deleteMessage,
  fetchUnreadCount,
  markMessagesAsRead,
  markAllMessagesAsRead,
  MESSAGES_PAGE_SIZE
} from '../api';

// Ré-exporter pour usage dans les composants
export { MESSAGES_PAGE_SIZE };

/**
 * Hook pour charger les messages avec pagination
 * @param authorProfileId - Filtrer par auteur (optionnel)
 * @param readerProfileId - Profil du lecteur pour le statut lu/non-lu
 * @param limit - Nombre de messages à charger (défaut: MESSAGES_PAGE_SIZE)
 * @param offset - Décalage pour la pagination (défaut: 0)
 * 
 * Note: Préparé pour une future pagination infinie au scroll
 */
export function useMessages(
  authorProfileId?: string, 
  readerProfileId?: string,
  limit = MESSAGES_PAGE_SIZE,
  offset = 0
) {
  return useQuery({
    queryKey: ['messages', authorProfileId, readerProfileId, limit, offset],
    queryFn: () => fetchMessages(authorProfileId, readerProfileId, limit, offset),
    staleTime: 30 * 1000,
  });
}

export function useUnreadCount(readerProfileId: string | null) {
  return useQuery({
    queryKey: ['messages', 'unread-count', readerProfileId],
    queryFn: () => fetchUnreadCount(readerProfileId!),
    enabled: !!readerProfileId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ profileId, content }: { profileId: string; content: string }) => 
      createMessage(profileId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useUpdateMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, profileId, content }: { id: string; profileId: string; content: string }) => 
      updateMessage(id, profileId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, profileId }: { id: string; profileId: string }) => 
      deleteMessage(id, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ readerProfileId, messageIds }: { readerProfileId: string; messageIds: string[] }) => 
      markMessagesAsRead(readerProfileId, messageIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count', variables.readerProfileId] });
    },
  });
}

export function useMarkAllMessagesAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ readerProfileId }: { readerProfileId: string }) => 
      markAllMessagesAsRead(readerProfileId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count', variables.readerProfileId] });
    },
  });
}
