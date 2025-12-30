import { useState } from 'react';
import { useUnreadCount } from '../../hooks/useMessages';
import { MessagesPanel } from './MessagesPanel';

interface MessagesButtonProps {
  currentProfileId: string | null;
  currentProfileName: string | null;
}

export function MessagesButton({ currentProfileId, currentProfileName }: MessagesButtonProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { data: unreadCount } = useUnreadCount(currentProfileId);

  const unread = typeof unreadCount === 'number' ? unreadCount : 0;
  const hasUnread = unread > 0;

  return (
    <div className="relative hidden md:block">
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="p-2 text-text-muted hover:text-text-primary transition-colors inline-flex items-center justify-center"
        title="Messages"
      >
        <span className="relative inline-flex items-center justify-center">
          {/* Icône message */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>

          {/* Pastille de notification */}
          {hasUnread && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-accent-primary rounded-full leading-none">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </span>
      </button>

      {/* Panel des messages */}
      <MessagesPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        currentProfileId={currentProfileId}
        currentProfileName={currentProfileName}
      />
    </div>
  );
}
