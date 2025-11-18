// src/components/ItemList.tsx
import React from 'react';
import type { ItemSummary } from '../types';

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
    <div className="item-list">
      <h2 className="sidebar-title">Items</h2>
      <input
        type="text"
        className="item-search"
        placeholder="Rechercher un item…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {loading && <p className="info-text">Chargement des items…</p>}
      {error && <p className="error-text">Erreur : {error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="info-text">Aucun item trouvé.</p>
      )}

      <ul className="item-list-ul">
        {items.map((item) => {
          const isSelected =
            selectedItem?.item_name === item.item_name &&
            selectedItem?.server === item.server;

          const isFav = favorites.has(item.item_name);

          return (
            <li
              key={`${item.server}::${item.item_name}`}
              className={
                'item-list-row' + (isSelected ? ' item-list-row--selected' : '')
              }
              onClick={() => onSelectItem(item)}
            >
              <div className="item-name">
                {item.item_name}
                <button
                  className={'item-fav-btn' + (isFav ? ' item-fav-btn--active' : '')}
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
              <div className="item-meta">
                <span className="item-price">
                  {Math.round(item.last_price).toLocaleString('fr-FR')}{' '}
                  <span className="kama-symbol">💰</span>
                </span>
                <span className="item-date">
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
