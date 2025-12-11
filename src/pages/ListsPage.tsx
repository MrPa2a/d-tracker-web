import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Globe, Lock, AlertTriangle, Loader2, Edit } from 'lucide-react';
import { useLists } from '../hooks/useLists';
import type { Profile, List, DateRangePreset } from '../types';
import { ManageListModal } from '../components/ManageListModal';

interface ListsPageProps {
  currentProfile: Profile | null;
  dateRange: DateRangePreset;
}

const ListCard: React.FC<{
  list: List;
  onDelete: (id: string) => void;
  onEdit: (list: List) => void;
  canDelete: boolean;
}> = ({ list, onDelete, onEdit, canDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const totalValue = list.list_items.reduce((sum, item) => sum + (item.last_price || 0), 0);
  const totalPrevious = list.list_items.reduce((sum, item) => sum + (item.previous_price || item.last_price || 0), 0);
  
  let indexChange = 0;
  if (totalPrevious > 0) {
    indexChange = ((totalValue - totalPrevious) / totalPrevious) * 100;
  }

  const visibleItems = isExpanded ? list.list_items : list.list_items.slice(0, 5);
  
  return (
    <div className="bg-bg-secondary border border-border-normal rounded-lg p-4 flex flex-col gap-4 hover:border-accent-primary transition-colors group relative">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            {list.name}
            {list.scope === 'public' ? <Globe size={14} className="text-text-muted" /> : <Lock size={14} className="text-text-muted" />}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">{list.list_items.length} objets</span>
            <span className="text-text-muted">•</span>
            <span className={`font-bold ${indexChange > 0 ? 'text-accent-danger' : indexChange < 0 ? 'text-accent-success' : 'text-text-muted'}`}>
              {indexChange > 0 ? '+' : ''}{indexChange.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {canDelete && (
            <>
              <button 
                onClick={() => onEdit(list)}
                className="text-text-muted hover:text-accent-primary transition-colors"
                title="Gérer la liste"
              >
                <Edit size={18} />
              </button>
              <button 
                onClick={() => onDelete(list.id)}
                className="text-text-muted hover:text-accent-danger transition-colors"
                title="Supprimer la liste"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex flex-wrap gap-2 transition-all duration-300 ease-in-out">
            {visibleItems.map(item => (
                <span key={item.item_id} className="text-xs bg-bg-tertiary px-2 py-1 rounded text-text-primary flex items-center gap-2 border border-border-subtle animate-[fadeIn_0.2s_ease-out]">
                    <span className="font-medium">{item.item_name}</span>
                    {item.category && <span className="text-[10px] text-text-muted bg-bg-primary px-1 rounded">{item.category}</span>}
                    <span className="text-text-muted font-mono">{(item.last_price || 0).toLocaleString('fr-FR')} k</span>
                </span>
            ))}
            {list.list_items.length > 5 && (
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-text-muted hover:text-accent-primary self-center cursor-pointer transition-colors"
                >
                    {isExpanded ? 'Voir moins' : `+${list.list_items.length - 5} autres`}
                </button>
            )}
        </div>
      </div>
      
      {/* Placeholder for variation if we had it */}
      {/* <div className="text-right text-sm font-mono text-accent-success">+5.2%</div> */}
    </div>
  );
};

export const ListsPage: React.FC<ListsPageProps> = ({ currentProfile, dateRange }) => {
  const { lists, createList, deleteList, isLoading, isCreating, isDeleting } = useLists(currentProfile?.id, dateRange);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListScope, setNewListScope] = useState<'public' | 'private'>('private');
  const [managingListId, setManagingListId] = useState<string | null>(null);

  const managingList = useMemo(() => lists.find(l => l.id === managingListId) || null, [lists, managingListId]);
  
  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; listId: string | null }>({
    isOpen: false,
    listId: null
  });

  const globalLists = lists.filter(l => l.scope === 'public');
  const customLists = lists.filter(l => l.scope === 'private');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createList({ name: newListName, scope: newListScope, profileId: currentProfile?.id }, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        setNewListName('');
        setNewListScope('private');
      }
    });
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmation({ isOpen: true, listId: id });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.listId) {
      deleteList(deleteConfirmation.listId, {
        onSuccess: () => {
          setDeleteConfirmation({ isOpen: false, listId: null });
        }
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Les listes</h1>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Créer une liste
        </button>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Listes globales</h2>
        {isLoading ? (
          <p className="text-text-muted">Chargement des listes...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {globalLists.map(list => (
              <ListCard 
                  key={list.id} 
                  list={list} 
                  onDelete={handleDeleteClick}
                  onEdit={(l) => setManagingListId(l.id)}
                  canDelete={list.profile_id === currentProfile?.id} // Only owner can delete even public lists? Or maybe admins. For now owner.
              />
            ))}
            {globalLists.length === 0 && (
              <p className="text-text-muted col-span-full">Aucune liste globale disponible.</p>
            )}
          </div>
        )}
      </section>

      {currentProfile && (
        <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Listes personnalisées</h2>
            {isLoading ? (
              <p className="text-text-muted">Chargement des listes...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {customLists.map(list => (
                  <ListCard 
                      key={list.id} 
                      list={list} 
                      onDelete={handleDeleteClick}
                      onEdit={(l) => setManagingListId(l.id)}
                      canDelete={true}
                  />
              ))}
              {customLists.length === 0 && (
                  <p className="text-text-muted col-span-full">Vous n'avez pas encore créé de liste personnalisée.</p>
              )}
              </div>
            )}
        </section>
      )}

      {/* Create List Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-secondary p-6 rounded-lg w-full max-w-md border border-border-normal">
            <h2 className="text-xl font-bold text-text-primary mb-4">Créer une nouvelle liste</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Nom de la liste</label>
                <input 
                  type="text" 
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-normal rounded px-3 py-2 text-text-primary focus:border-accent-primary outline-none"
                  placeholder="Ex: Stuff Feu 200"
                  required
                  disabled={isCreating}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Visibilité</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="scope" 
                      value="private" 
                      checked={newListScope === 'private'}
                      onChange={() => setNewListScope('private')}
                      className="accent-accent-primary"
                      disabled={isCreating}
                    />
                    <span className="text-text-primary">Privée</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="scope" 
                      value="public" 
                      checked={newListScope === 'public'}
                      onChange={() => setNewListScope('public')}
                      className="accent-accent-primary"
                      disabled={isCreating}
                    />
                    <span className="text-text-primary">Publique</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-text-muted hover:text-text-primary transition-colors"
                  disabled={isCreating}
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/90 text-white rounded transition-colors flex items-center gap-2"
                  disabled={isCreating}
                >
                  {isCreating && <Loader2 className="animate-spin" size={16} />}
                  {isCreating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-secondary p-6 rounded-lg w-full max-w-md border border-border-normal">
            <div className="flex items-center gap-3 text-accent-danger mb-4">
              <AlertTriangle size={24} />
              <h2 className="text-xl font-bold">Supprimer la liste ?</h2>
            </div>
            
            <p className="text-text-muted mb-6">
              Êtes-vous sûr de vouloir supprimer cette liste ? Cette action est irréversible.
            </p>

            <div className="flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setDeleteConfirmation({ isOpen: false, listId: null })}
                className="px-4 py-2 text-text-muted hover:text-text-primary transition-colors"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button 
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-accent-danger hover:bg-accent-danger/90 text-white rounded transition-colors flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="animate-spin" size={16} />}
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage List Modal */}
      {managingList && currentProfile && (
        <ManageListModal
          onClose={() => setManagingListId(null)}
          list={managingList}
          currentProfileId={currentProfile.id}
        />
      )}
    </div>
  );
};

export default ListsPage;
