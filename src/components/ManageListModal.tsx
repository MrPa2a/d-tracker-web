import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Trash2, Search, Loader2, Globe, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { List, ItemSummary } from '../types';
import { useLists } from '../hooks/useLists';
import { fetchItems } from '../api';

interface ManageListModalProps {
  list: List;
  onClose: () => void;
  currentProfileId?: string;
}

export const ManageListModal: React.FC<ManageListModalProps> = ({ list, onClose, currentProfileId }) => {
  const { addItem, removeItem, updateList, isUpdating } = useLists(currentProfileId);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadingItems, setLoadingItems] = useState<Set<number>>(new Set());
  const [showPublicConfirmation, setShowPublicConfirmation] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch items from API
  const { data: fetchedItems, isLoading: isSearching } = useQuery({
    queryKey: ['items', 'search', debouncedSearch],
    queryFn: () => fetchItems(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    staleTime: 1000 * 60,
  });

  // Create a map of items currently in the list for quick lookup
  const listItemsSet = useMemo(() => {
    return new Set(list.list_items.map(li => li.item_id));
  }, [list.list_items]);

  // Filter items for search results
  const searchResults = useMemo(() => {
    if (!debouncedSearch.trim() || debouncedSearch.length < 2) return [];
    
    const itemsToFilter = fetchedItems || [];
    
    // Filter items that match search AND are not already in the list
    // Also deduplicate by name since we might have same item on multiple servers
    const seen = new Set<string>();
    return itemsToFilter
      .filter(item => {
        if (seen.has(item.item_name)) return false;
        if (listItemsSet.has(item.id)) return false;
        seen.add(item.item_name);
        return true;
      })
      .slice(0, 10); // Limit results
  }, [debouncedSearch, fetchedItems, listItemsSet]);

  const handleAdd = (item: ItemSummary) => {
    setLoadingItems(prev => new Set(prev).add(item.id));
    addItem({ listId: list.id, itemId: item.id }, {
      onSettled: () => {
        setLoadingItems(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    });
  };

  const handleRemove = (itemId: number) => {
    setLoadingItems(prev => new Set(prev).add(itemId));
    removeItem({ listId: list.id, itemId }, {
      onSettled: () => {
        setLoadingItems(prev => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    });
  };

  const handleMakePublic = () => {
    updateList({ id: list.id, updates: { scope: 'public' } }, {
        onSuccess: () => {
            onClose();
        }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-bg-secondary p-4 md:p-6 rounded-lg w-full max-w-2xl border border-border-normal flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold text-text-primary truncate pr-4">Gérer la liste : {list.name}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary shrink-0">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 min-h-0">
          {/* Left Column: Search & Add */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">Ajouter des objets</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un objet..."
                className="w-full bg-bg-tertiary border border-border-normal rounded pl-10 pr-4 py-2 text-text-primary focus:border-accent-primary outline-none"
                autoFocus
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2">
              {isSearching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-text-muted" size={24} />
                </div>
              )}
              {!isSearching && searchResults.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 rounded bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors">
                  <span className="text-text-primary">{item.item_name}</span>
                  <button 
                    onClick={() => handleAdd(item)}
                    className={`p-1 text-accent-primary hover:bg-accent-primary/10 rounded transition-all ${
                      loadingItems.has(item.id) ? 'opacity-100' : ''
                    }`}
                    title="Ajouter"
                    disabled={loadingItems.has(item.id)}
                  >
                    {loadingItems.has(item.id) ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Plus size={18} />
                    )}
                  </button>
                </div>
              ))}
              {!isSearching && search && searchResults.length === 0 && (
                <p className="text-text-muted text-sm text-center py-4">Aucun objet trouvé.</p>
              )}
              {!search && (
                <p className="text-text-muted text-sm text-center py-4">Commencez à taper pour rechercher des objets.</p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-border-normal"></div>

          {/* Right Column: Current Items */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">Objets dans la liste ({list.list_items.length})</h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {list.list_items.map(li => (
                <div key={li.item_id} className="flex justify-between items-center p-2 rounded bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors group">
                  <div className="flex flex-col">
                    <span className="text-text-primary font-medium">{li.item_name}</span>
                    <div className="flex items-center gap-2 text-xs">
                      {li.category && <span className="text-text-muted bg-bg-primary px-1 rounded">{li.category}</span>}
                      {li.last_price && <span className="text-text-muted font-mono">{li.last_price.toLocaleString('fr-FR')} k</span>}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemove(li.item_id)}
                    className={`p-1 text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 rounded transition-all ${
                      loadingItems.has(li.item_id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title="Retirer"
                    disabled={loadingItems.has(li.item_id)}
                  >
                    {loadingItems.has(li.item_id) ? (
                      <Loader2 className="animate-spin text-text-muted" size={18} />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              ))}
              {list.list_items.length === 0 && (
                <p className="text-text-muted text-sm text-center py-4">Cette liste est vide.</p>
              )}
            </div>
          </div>
        </div>

        {list.scope === 'private' && (
            <div className="mt-6 pt-4 border-t border-border-normal">
                {!showPublicConfirmation ? (
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-yellow-500/80 text-sm">
                            <AlertTriangle size={16} />
                            <span>Liste privée liée au profil</span>
                        </div>
                        <button
                            onClick={() => setShowPublicConfirmation(true)}
                            disabled={isUpdating}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded text-sm transition-colors disabled:opacity-50"
                        >
                            <Globe size={16} />
                            Rendre publique
                        </button>
                    </div>
                ) : (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-start gap-3 mb-3">
                            <Globe className="text-blue-400 shrink-0 mt-0.5" size={18} />
                            <div>
                                <h4 className="text-sm font-bold text-blue-100 mb-1">Rendre cette liste publique ?</h4>
                                <p className="text-xs text-blue-200/80">
                                    Cette action est <span className="font-bold text-blue-100">irréversible</span>. La liste ne sera plus liée à votre profil et deviendra visible et modifiable par tout le monde.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowPublicConfirmation(false)}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleMakePublic}
                                disabled={isUpdating}
                                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isUpdating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={14} />
                                        Traitement...
                                    </>
                                ) : (
                                    'Confirmer et rendre publique'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
