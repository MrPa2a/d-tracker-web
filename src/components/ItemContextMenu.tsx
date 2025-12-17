import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, List, Copy, Loader2, ScrollText } from 'lucide-react';
import { ContextMenu } from './ContextMenu';
import type { ContextMenuAction } from './ContextMenu';
import type { ItemSummary } from '../types';

interface ItemContextMenuProps {
  x: number;
  y: number;
  item: ItemSummary;
  onClose: () => void;
  favorites?: Set<string>;
  pendingFavorites?: Set<string>;
  onToggleFavorite?: (itemName: string) => void;
  onAddToList?: (item: ItemSummary) => void;
  extraActions?: ContextMenuAction[];
}

export const ItemContextMenu: React.FC<ItemContextMenuProps> = ({
  x,
  y,
  item,
  onClose,
  favorites,
  pendingFavorites,
  onToggleFavorite,
  onAddToList,
  extraActions,
}) => {
  const navigate = useNavigate();

  const actions = [
    ...(onToggleFavorite ? [{
      label: favorites?.has(item.item_name) ? 'Retirer des favoris' : 'Ajouter aux favoris',
      icon: pendingFavorites?.has(item.item_name) ? 
        <Loader2 size={16} className="animate-spin" /> : 
        <Star size={16} className={favorites?.has(item.item_name) ? "fill-accent-warning text-accent-warning" : ""} />,
      onClick: () => onToggleFavorite(item.item_name),
      disabled: pendingFavorites?.has(item.item_name)
    }] : []),
    ...(item.id && onAddToList ? [{
      label: 'Ajouter à une liste...',
      icon: <List size={16} />,
      onClick: () => onAddToList(item),
    }] : []),
    ...(item.is_craftable ? [{
      label: 'Voir la recette',
      icon: <ScrollText size={16} />,
      onClick: () => navigate(`/recipes/item/${item.id}`),
    }] : []),
    ...(extraActions || []),
    {
      label: 'Copier le nom',
      icon: <Copy size={16} />,
      onClick: () => navigator.clipboard.writeText(item.item_name),
    },
  ];

  return (
    <ContextMenu
      x={x}
      y={y}
      onClose={onClose}
      actions={actions}
    />
  );
};
