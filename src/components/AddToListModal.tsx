import React from 'react';
import { useLists } from '../hooks/useLists';
import type { Profile, ItemSummary } from '../types';

interface AddToListModalProps {
  item: ItemSummary;
  currentProfile: Profile | null;
  onClose: () => void;
}

export const AddToListModal: React.FC<AddToListModalProps> = ({ item, currentProfile, onClose }) => {
  const { lists, addItem } = useLists(currentProfile?.id);

  // Only show lists owned by the user
  const myLists = lists.filter(l => l.profile_id === currentProfile?.id);

  const handleAdd = (listId: string) => {
    addItem({ listId, itemId: item.id });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 flex items-start justify-center z-50 pt-32" 
      onClick={onClose}
      data-context-menu="true"
    >
      <div className="bg-bg-secondary p-6 rounded-lg w-full max-w-sm border border-border-normal shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-text-primary mb-4">Ajouter {item.item_name} à une liste</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {myLists.map(list => (
            <button
              key={list.id}
              onClick={() => handleAdd(list.id)}
              className="w-full text-left px-4 py-3 rounded bg-bg-tertiary hover:bg-accent-primary/20 hover:text-accent-primary transition-colors text-text-primary"
            >
              {list.name}
            </button>
          ))}
          {myLists.length === 0 && (
            <p className="text-text-muted">Vous n'avez aucune liste.</p>
          )}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 text-text-muted hover:text-text-primary">
          Annuler
        </button>
      </div>
    </div>
  );
};
