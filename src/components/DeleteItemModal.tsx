import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import type { ItemSummary } from '../types';
import { fetchItemUsageStats } from '../api';

interface DeleteItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  item: ItemSummary;
}

interface UsageStats {
  recipes_created: number;
  recipes_used_in: number;
  lists: number;
  favorites: number;
  observations: number;
}

export const DeleteItemModal: React.FC<DeleteItemModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  item,
}) => {
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (isOpen && item.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingStats(true);
      fetchItemUsageStats(item.id)
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoadingStats(false));
    }
  }, [isOpen, item.id]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (confirmName !== item.item_name) return;
    
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting item:', error);
      setIsDeleting(false);
    }
  };

  const isMatch = confirmName === item.item_name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border-subtle bg-bg-tertiary/30">
          <div className="flex items-center gap-3 text-accent-danger mb-2">
            <div className="p-2 bg-accent-danger/10 rounded-lg">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-xl font-bold">Supprimer l'item ?</h2>
          </div>
          <p className="text-text-muted text-sm">
            Cette action est irréversible. Cela supprimera définitivement l'item 
            <span className="font-bold text-text-primary mx-1">{item.item_name}</span>
            et toutes les données associées.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Impact Report */}
          <div className="bg-bg-tertiary rounded-lg p-4 border border-border-subtle">
            <h3 className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">
              Impact de la suppression
            </h3>
            
            {loadingStats ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : stats ? (
              <ul className="space-y-2 text-sm text-text-muted">
                <li className="flex items-center justify-between">
                  <span>Recettes créées (résultat) :</span>
                  <span className="font-mono font-bold text-text-primary">{stats.recipes_created}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Utilisé dans les recettes (ingrédient) :</span>
                  <span className="font-mono font-bold text-text-primary">{stats.recipes_used_in}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Listes (perso & globales) :</span>
                  <span className="font-mono font-bold text-text-primary">{stats.lists}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Favoris utilisateurs :</span>
                  <span className="font-mono font-bold text-text-primary">{stats.favorites}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Historique de prix (observations) :</span>
                  <span className="font-mono font-bold text-text-primary">{stats.observations}</span>
                </li>
              </ul>
            ) : (
              <p className="text-sm text-text-muted italic">Impossible de charger les statistiques d'impact.</p>
            )}
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Pour confirmer, tapez <span className="font-mono font-bold select-all">{item.item_name}</span> ci-dessous :
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="w-full px-4 py-2 bg-bg-primary border border-border-strong rounded-lg text-text-primary focus:outline-none focus:border-accent-danger focus:ring-1 focus:ring-accent-danger transition-colors"
              placeholder={item.item_name}
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-subtle bg-bg-tertiary/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isMatch || isDeleting}
            className={`
              px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all
              ${isMatch 
                ? 'bg-accent-danger text-white hover:bg-red-600 shadow-lg shadow-red-900/20' 
                : 'bg-bg-tertiary text-text-muted cursor-not-allowed opacity-50'}
            `}
          >
            {isDeleting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 size={18} />
                Je comprends, supprimer cet item
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
