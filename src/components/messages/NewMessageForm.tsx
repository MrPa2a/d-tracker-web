import { useState } from 'react';

interface NewMessageFormProps {
  profileName: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function NewMessageForm({ profileName, onSubmit, onCancel, isLoading }: NewMessageFormProps) {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim());
    }
  };

  return (
    <div className="p-3 border-b border-bg-tertiary bg-bg-secondary">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-text-primary">{profileName}</span>
        <span className="text-xs text-text-muted">Nouveau message</span>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Écrivez votre message..."
        className="w-full bg-bg-primary border border-bg-tertiary rounded-lg p-2 text-text-primary text-sm resize-none placeholder-text-muted focus:outline-none focus:border-accent-primary"
        rows={3}
        maxLength={2000}
        disabled={isLoading}
        autoFocus
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-text-muted">{content.length}/2000</span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-3 py-1 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isLoading}
            className="px-3 py-1 text-sm bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
          >
            {isLoading ? 'Envoi...' : 'Publier'}
          </button>
        </div>
      </div>
    </div>
  );
}
