// src/components/ItemList.tsx
import React from 'react';
import type { ItemSummary } from '../types';
import kamaIcon from '../assets/kama.png';

interface ItemListProps {
  items: ItemSummary[];
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  selectedItem: ItemSummary | null;
  onSelectItem: (item: ItemSummary | null) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (key: string) => void;
}

export const ItemList: React.FC<ItemListProps> = ({
  items,
  loading,
  error,
  search,
  onSearchChange,
  selectedItem,
  onSelectItem,
  favorites = new Set<string>(),
  onToggleFavorite,
}) => {
  return (
    <div className="flex flex-col h-full">
      <h2 className="mb-4 text-xl font-bold bg-gradient-to-br from-accent-primary to-accent-secondary bg-clip-text text-transparent tracking-tight">
        Items
      </h2>
      <input
        type="text"
        className="w-full px-4 py-3 rounded-xl border border-border-normal bg-bg-secondary/50 text-text-primary mb-4 outline-none transition-all duration-300 text-sm shadow-inner focus:border-accent-primary focus:bg-bg-secondary/80 focus:ring-2 focus:ring-accent-primary/10 focus:shadow-lg transform focus:-translate-y-px placeholder:text-text-muted"
        placeholder="Rechercher un item…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {loading && <p className="text-text-muted text-sm text-center py-4">Chargement des items…</p>}
      {error && <p className="text-accent-danger text-sm text-center py-4">Erreur : {error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="text-text-muted text-sm text-center py-4">Aucun item trouvé.</p>
      )}

      <ul className="list-none p-0 m-0 overflow-y-auto overflow-x-hidden flex-1">
        {items.map((item) => {
          const isSelected =
            selectedItem?.item_name === item.item_name &&
            selectedItem?.server === item.server;

          const isFav = favorites.has(item.item_name);

          return (
            <li
              key={`${item.server}::${item.item_name}`}
              className={`
                p-3 mb-1.5 cursor-pointer rounded-lg transition-all duration-300 border relative overflow-hidden group
                ${isSelected 
                  ? 'bg-gradient-to-br from-accent-success/15 to-accent-success/5 border-accent-success/40 shadow-sm' 
                  : 'border-transparent hover:bg-bg-secondary/60 hover:border-accent-primary/30 hover:shadow-sm'
                }
              `}
              onClick={() => onSelectItem(item)}
            >
              {/* Hover effect background */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="text-sm font-semibold text-text-primary relative z-10 flex justify-between items-center">
                {item.item_name}
                <button
                  className={`ml-2 text-lg leading-none bg-transparent border-none cursor-pointer transition-colors ${isFav ? 'text-accent-warning' : 'text-text-muted hover:text-accent-warning'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleFavorite) {
                      onToggleFavorite(item.item_name);
                    }
                  }}
                  title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  {isFav ? '★' : '☆'}
                </button>
              </div>
              <div className="mt-1 flex flex-col text-xs text-text-muted relative z-10">
                <span className="font-medium flex items-center">
                  {Math.round(item.last_price).toLocaleString('fr-FR')}{' '}
                  <img src={kamaIcon} alt="kamas" className="opacity-80 ml-0.5 w-2.5 h-2.5 align-middle"/>
                </span>
                <span className="text-[0.7rem]">
                  {new Date(item.last_observation_at).toLocaleString('fr-FR')}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
