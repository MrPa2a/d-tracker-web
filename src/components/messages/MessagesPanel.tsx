import { useState, useEffect, useRef } from 'react';
import { 
  useMessages, 
  useCreateMessage, 
  useUpdateMessage, 
  useDeleteMessage,
  useMarkMessagesAsRead,
  useMarkAllMessagesAsRead,
  useUnreadCount,
  MESSAGES_PAGE_SIZE
} from '../../hooks/useMessages';
import { MessageItem } from './MessageItem';
import { NewMessageForm } from './NewMessageForm';

interface MessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfileId: string | null;
  currentProfileName: string | null;
}

export function MessagesPanel({ isOpen, onClose, currentProfileId, currentProfileName }: MessagesPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Charger les messages avec limite initiale
  const { data: messages, isLoading, error } = useMessages(
    undefined, 
    currentProfileId ?? undefined,
    MESSAGES_PAGE_SIZE
  );
  const { data: unreadCount } = useUnreadCount(currentProfileId);

  const unread = typeof unreadCount === 'number' ? unreadCount : 0;
  const hasUnread = unread > 0;
  
  // Indicateur s'il y a potentiellement plus de messages
  const hasMoreMessages = messages?.length === MESSAGES_PAGE_SIZE;
  
  const createMutation = useCreateMessage();
  const updateMutation = useUpdateMessage();
  const deleteMutation = useDeleteMessage();
  const markAsReadMutation = useMarkMessagesAsRead();
  const markAllAsReadMutation = useMarkAllMessagesAsRead();

  // Fermer le panel en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Marquer les messages non lus comme lus quand on ferme le panel
  useEffect(() => {
    if (!isOpen && currentProfileId && messages) {
      const unreadMessages = messages.filter(m => m.isRead === false);
      if (unreadMessages.length > 0) {
        markAsReadMutation.mutate({
          readerProfileId: currentProfileId,
          messageIds: unreadMessages.map(m => m.id),
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCreate = (content: string) => {
    if (currentProfileId) {
      createMutation.mutate(
        { profileId: currentProfileId, content },
        {
          onSuccess: () => setIsCreating(false),
        }
      );
    }
  };

  const handleEdit = (id: string, content: string) => {
    if (currentProfileId) {
      updateMutation.mutate({ id, profileId: currentProfileId, content });
    }
  };

  const handleDelete = (id: string) => {
    if (currentProfileId && confirm('Supprimer ce message ?')) {
      deleteMutation.mutate({ id, profileId: currentProfileId });
    }
  };

  const handleMarkAsRead = (messageId: string) => {
    if (currentProfileId) {
      markAsReadMutation.mutate({
        readerProfileId: currentProfileId,
        messageIds: [messageId],
      });
    }
  };

  const handleMarkAllAsRead = () => {
    if (currentProfileId) {
      markAllAsReadMutation.mutate({ readerProfileId: currentProfileId });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={panelRef}
      className="absolute top-full left-0 mt-2 w-96 max-h-[70vh] bg-bg-primary border border-bg-tertiary rounded-lg shadow-xl overflow-hidden z-50"
    >
      {/* Header du panel */}
      <div className="flex items-center justify-between p-3 border-b border-bg-tertiary bg-bg-secondary">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Messages</h3>
          {hasUnread && (
            <span className="px-1.5 py-0.5 text-xs bg-accent-primary text-white rounded-full">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasUnread && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-text-muted hover:text-accent-primary transition-colors"
            >
              Tout lire
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Bouton nouveau message ou formulaire */}
      {currentProfileId ? (
        isCreating ? (
          <NewMessageForm
            profileName={currentProfileName || 'Anonyme'}
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
            isLoading={createMutation.isPending}
          />
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full p-3 border-b border-bg-tertiary text-left text-sm text-accent-primary hover:bg-bg-secondary transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14"/><path d="M5 12h14"/>
            </svg>
            Nouveau message
          </button>
        )
      ) : (
        <div className="p-3 border-b border-bg-tertiary text-sm text-text-muted text-center">
          Sélectionnez un profil pour poster
        </div>
      )}

      {/* Liste des messages */}
      <div className="overflow-y-auto max-h-[calc(70vh-120px)]">
        {error && (
          <div className="p-4 text-sm text-red-400 text-center">
            Erreur de chargement
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">
            Aucun message pour le moment
          </div>
        ) : (
          <>
            {messages?.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentProfileId={currentProfileId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
            
            {/* Indicateur "Plus de messages" - préparation pagination infinie */}
            {hasMoreMessages && (
              <div className="p-3 text-center text-xs text-text-muted border-t border-bg-tertiary">
                Affichage des {MESSAGES_PAGE_SIZE} derniers messages
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
