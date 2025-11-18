// src/components/TopBar.tsx
import React from 'react';
import type { DateRangePreset, ItemSummary } from '../types';

interface TopBarProps {
  servers: string[];
  selectedServer: string | null;
  onSelectServer: (server: string | null) => void;
  dateRange: DateRangePreset;
  onChangeDateRange: (range: DateRangePreset) => void;
  onToggleSidebar: () => void; // 👈 nouveau
  // Pour la recherche horizontale
  items?: ItemSummary[];
  onNavigateToItem?: (item: ItemSummary) => void;
}

const RANGE_LABELS: Record<DateRangePreset, string> = {
  '7d': '7j',
  '30d': '30j',
  '90d': '90j',
  '365d': '1 an',
};

export const TopBar: React.FC<TopBarProps> = ({
  servers,
  selectedServer,
  onSelectServer,
  dateRange,
  onChangeDateRange,
  onToggleSidebar,
  items = [],
  onNavigateToItem,
}) => {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const suggestions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as ItemSummary[];
    return items
      .filter((it) =>
        it.item_name.toLowerCase().includes(q) &&
        (!selectedServer || it.server === selectedServer)
      )
      .slice(0, 8);
  }, [query, items, selectedServer]);

  const handleChoose = (it: ItemSummary) => {
    setQuery('');
    setOpen(false);
    if (onNavigateToItem) onNavigateToItem(it);
  };
  return (
    <div className="topbar">
      <div className="topbar-left">
        {/* Bouton burger mobile */}
        <button
          className="topbar-burger"
          type="button"
          onClick={onToggleSidebar}
        >
          ☰ Items
        </button>

        <div className="topbar-section">
          <span className="topbar-label">Serveur</span>
          <select
            className="topbar-select"
            value={selectedServer ?? ''}
            onChange={(e) =>
              onSelectServer(e.target.value ? e.target.value : null)
            }
          >
            {servers.length === 0 && <option value="">—</option>}
            {servers.map((server) => (
              <option key={server} value={server}>
                {server}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="topbar-center">
        <div className="topbar-section topbar-search-section">
          <span className="topbar-label">Recherche</span>
          <div className="topbar-search">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Rechercher un item…"
            />
            {open && suggestions.length > 0 && (
              <ul className="topbar-search-suggestions">
                {suggestions.map((s) => (
                  <li
                    key={`${s.server}::${s.item_name}`}
                    onMouseDown={() => handleChoose(s)}
                  >
                    <strong>{s.item_name}</strong>
                    <span className="suggestion-server">{s.server}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-section topbar-period">
          <span className="topbar-label">Période</span>
          <div className="topbar-range-group">
            {(Object.keys(RANGE_LABELS) as DateRangePreset[]).map((range) => (
              <button
                key={range}
                className={
                  'topbar-range-btn' +
                  (dateRange === range ? ' topbar-range-btn--active' : '')
                }
                onClick={() => onChangeDateRange(range)}
              >
                {RANGE_LABELS[range]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
