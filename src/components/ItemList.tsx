// src/components/ItemList.tsx
import React from 'react';
import type { ItemSummary, SortType, SortOrder } from '../types';
import kamaIcon from '../assets/kama.png';

interface ItemListProps {
  items: ItemSummary[];
  loading: boolean;
  favoritesLoading?: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  selectedItem: ItemSummary | null;
  onSelectItem: (item: ItemSummary | null) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (key: string) => void;
  sortType: SortType;
  sortOrder: SortOrder;
  onSortChange: (type: SortType, order: SortOrder) => void;
}

export const ItemList: React.FC<ItemListProps> = ({
  items,
  loading,
  favoritesLoading = false,
  error,
  search,
  onSearchChange,
  selectedItem,
  onSelectItem,
  favorites = new Set<string>(),
  onToggleFavorite,
  sortType,
  sortOrder,
  onSortChange,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold bg-linear-to-br from-accent-primary to-accent-secondary bg-clip-text text-transparent tracking-tight m-0 flex items-center gap-2">
          Items
          {favoritesLoading && (
            <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          )}
        </h2>
        <div className="flex gap-1">
          <button
            className={`px-2 py-1 text-xs font-medium rounded transition-all duration-300 flex items-center gap-1 border ${sortType === 'name' ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:bg-accent-primary/20 hover:shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-transparent border-border-normal text-text-muted hover:border-accent-primary/50 hover:text-accent-primary hover:shadow-[0_0_8px_rgba(59,130,246,0.2)] hover:bg-accent-primary/5'}`}
            onClick={() => {
              if (sortType === 'name') {
                onSortChange('name', sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                onSortChange('name', 'asc');
              }
            }}
            title="Trier par nom"
          >
            Aa {sortType === 'name' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}
          </button>
          <button
            className={`px-2 py-1 text-xs font-medium rounded transition-all duration-300 flex items-center gap-1 border ${sortType === 'price' ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:bg-accent-primary/20 hover:shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-transparent border-border-normal text-text-muted hover:border-accent-primary/50 hover:text-accent-primary hover:shadow-[0_0_8px_rgba(59,130,246,0.2)] hover:bg-accent-primary/5'}`}
            onClick={() => {
              if (sortType === 'price') {
                onSortChange('price', sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                onSortChange('price', 'desc'); // Default to desc for price (highest first usually more interesting?) or asc? User didn't specify. Let's stick to asc default or desc default. Usually price sort toggles. Let's start with asc.
              }
            }}
            title="Trier par prix"
          >
            <img src={kamaIcon} alt="kamas" style={{width: '12px', height: '12px', verticalAlign: 'middle'}} /> {sortType === 'price' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>
      </div>
      <div className="relative mb-4">
        <input
          type="text"
          className="w-full px-4 py-3 rounded-xl border border-border-normal bg-bg-secondary/50 text-text-primary outline-none transition-all duration-300 text-sm shadow-inner focus:border-accent-primary focus:bg-bg-secondary/80 focus:ring-2 focus:ring-accent-primary/10 focus:shadow-lg transform focus:-translate-y-px placeholder:text-text-muted pr-10"
          placeholder="Rechercher un item…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded-full hover:bg-bg-tertiary transition-colors"
            title="Effacer la recherche"
          >
            ✕
          </button>
        )}
      </div>

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
                  ? 'bg-linear-to-br from-accent-success/15 to-accent-success/5 border-accent-success/40 shadow-sm' 
                  : 'border-transparent hover:bg-bg-secondary/60 hover:border-accent-primary/30 hover:shadow-sm'
                }
              `}
              onClick={() => onSelectItem(item)}
            >
              {/* Hover effect background */}
              <div className="absolute inset-0 bg-linear-to-br from-accent-primary/5 to-accent-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="text-sm font-semibold text-text-primary relative z-10 flex justify-between items-center">
                {item.item_name}
                <button
                  className={`ml-2 text-lg leading-none bg-transparent border-none cursor-pointer transition-colors ${isFav ? 'text-accent-warning' : 'text-text-muted hover:text-accent-warning'} ${favoritesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleFavorite && !favoritesLoading) {
                      onToggleFavorite(item.item_name);
                    }
                  }}
                  disabled={favoritesLoading}
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
