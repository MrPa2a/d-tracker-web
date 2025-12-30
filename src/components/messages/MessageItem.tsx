import { useState } from 'react';
import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  currentProfileId: string | null;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
}

export function MessageItem({ 
  message, 
  currentProfileId, 
  onEdit, 
  onDelete, 
  onMarkAsRead 
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  
  const isOwner = currentProfileId === message.author.id;
  const isModified = message.createdAt !== message.updatedAt;
  const isUnread = message.isRead === false;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const handleSave = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleClick = () => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(message.id);
    }
  };

  // Mode édition
  if (isEditing) {
    return (
      <div className="p-3 border-b border-bg-tertiary bg-bg-secondary">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-text-primary">{message.author.name}</span>
          <span className="text-xs text-text-muted">Modification en cours...</span>
        </div>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full bg-bg-primary border border-bg-tertiary rounded-lg p-2 text-text-primary text-sm resize-none focus:outline-none focus:border-accent-primary"
          rows={3}
          maxLength={2000}
          autoFocus
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-text-muted">{editContent.length}/2000</span>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!editContent.trim()}
              className="px-3 py-1 text-sm bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode affichage
  return (
    <div 
      className={`p-3 border-b border-bg-tertiary hover:bg-bg-secondary/50 transition-colors cursor-pointer ${isUnread ? 'bg-accent-primary/5' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        {/* Indicateur non lu */}
        {isUnread && (
          <span className="w-2 h-2 mt-1.5 bg-accent-primary rounded-full flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          {/* Header: auteur + date + actions */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-text-primary truncate">
                {message.author.name}
              </span>
              <span className="text-xs text-text-muted flex-shrink-0">
                {formatDate(message.createdAt)}
                {isModified && <span className="italic"> (modifié)</span>}
              </span>
            </div>
            
            {isOwner && (
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="p-1 text-text-muted hover:text-accent-primary transition-colors"
                  title="Modifier"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(message.id);
                  }}
                  className="p-1 text-text-muted hover:text-red-500 transition-colors"
                  title="Supprimer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* Contenu du message */}
          <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}
