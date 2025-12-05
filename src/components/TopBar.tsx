// src/components/TopBar.tsx
import React, { useState, useEffect } from 'react';
import type { DateRangePreset, ItemSummary } from '../types';
import { fetchItems } from '../api';

interface TopBarProps {
  servers: string[];
  selectedServer: string | null;
  onSelectServer: (server: string | null) => void;
  dateRange: DateRangePreset;
  onChangeDateRange: (range: DateRangePreset) => void;
  onToggleSidebar: () => void;
  // Pour la recherche horizontale
  onNavigateToItem?: (item: ItemSummary) => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (val: string) => void;
  onMaxPriceChange: (val: string) => void;
}

const RANGE_LABELS: Record<DateRangePreset, string> = {
  '7d': '7j',
  '30d': '30j',
  '90d': '90j',
  '365d': '1 an',
};

const DebouncedPriceInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => {
  const [displayValue, setDisplayValue] = React.useState('');

  // Sync from parent (e.g. reset)
  React.useEffect(() => {
    const rawLocal = displayValue.replace(/\s/g, '');
    if (value !== rawLocal) {
      if (value === '') {
        setDisplayValue('');
      } else {
        // Format initial/external value
        const num = parseFloat(value);
        if (!isNaN(num)) {
          setDisplayValue(num.toLocaleString('fr-FR'));
        } else {
          setDisplayValue(value);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Debounce update to parent
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const raw = displayValue.replace(/\s/g, '');
      if (raw !== value) {
        onChange(raw);
      }
    }, 600); // 600ms debounce
    return () => clearTimeout(timer);
  }, [displayValue, onChange, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits and spaces only
    const raw = val.replace(/\s/g, '');
    if (val !== '' && !/^\d*$/.test(raw)) return;

    if (raw === '') {
      setDisplayValue('');
    } else {
      // Format while typing
      const num = parseInt(raw, 10);
      setDisplayValue(num.toLocaleString('fr-FR'));
    }
  };

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      className={className}
    />
  );
};

export const TopBar: React.FC<TopBarProps> = ({
  servers,
  selectedServer,
  onSelectServer,
  dateRange,
  onChangeDateRange,
  onToggleSidebar,
  onNavigateToItem,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<ItemSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search effect
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (query.trim()) {
        setLoading(true);
        // Search on selected server if available, otherwise global
        fetchItems(query, selectedServer || undefined)
          .then((data) => {
            if (!cancelled) {
              setSuggestions(data.slice(0, 8));
              setLoading(false);
            }
          })
          .catch((err) => {
            if (!cancelled) {
              console.error('Search error:', err);
              setSuggestions([]);
              setLoading(false);
            }
          });
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, selectedServer]);

  const handleChoose = (it: ItemSummary) => {
    setQuery('');
    setOpen(false);
    if (onNavigateToItem) onNavigateToItem(it);
  };

  return (
    <div className="relative z-50 bg-bg-secondary/50 backdrop-blur-md border border-border-normal rounded-2xl p-3 shadow-lg transition-all duration-300">
      
      {/* Mobile Header Row */}
      <div className="flex md:hidden items-center justify-between">
        <button
          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-border-normal bg-bg-secondary/60 text-text-primary text-sm font-semibold shadow-sm hover:bg-bg-secondary/80 hover:border-accent-primary hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300"
          type="button"
          onClick={onToggleSidebar}
        >
          ☰ Items
        </button>

        <button
          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-border-normal bg-bg-secondary/40 text-text-muted text-sm font-medium hover:text-text-primary hover:bg-bg-secondary/60 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Masquer ▲' : 'Filtres ▼'}
        </button>
      </div>

      {/* Content Container */}
      <div className={`
        flex flex-col gap-4 mt-4 
        md:flex-row md:items-center md:justify-between md:gap-4 md:mt-0 md:flex
        ${isExpanded ? 'flex' : 'hidden'}
      `}>
        
        {/* Server Selector */}
        <div className="flex items-center gap-4 flex-1 min-w-[200px] order-1">
          <div className="flex flex-col gap-1.5 w-full md:w-auto">
            <span className="text-[0.7rem] uppercase tracking-wider text-text-muted font-bold ml-1">Serveur</span>
            <select
              className="appearance-none bg-bg-secondary border border-border-normal text-text-primary rounded-lg px-3 py-1.5 text-sm font-medium outline-none cursor-pointer transition-all duration-200 hover:border-accent-primary/50 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 min-w-[140px] w-full md:w-auto"
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

        {/* Price Filter - Order 2 Mobile, Order 3 Desktop */}
        <div className="flex items-center gap-4 order-2 md:order-3 flex-none w-full md:w-auto">
          <div className="flex flex-col gap-1.5 w-full md:w-auto">
            <span className="text-[0.7rem] uppercase tracking-wider text-text-muted font-bold ml-1">Prix</span>
            <div className="flex items-center gap-2 bg-bg-primary/50 p-1 rounded-lg border border-border-normal w-full md:w-auto">
              <DebouncedPriceInput
                placeholder="Min"
                value={minPrice}
                onChange={onMinPriceChange}
                className="flex-1 md:flex-none md:w-28 bg-transparent text-text-primary text-xs px-2 py-1 outline-none border-r border-border-normal placeholder:text-text-muted/50 text-center min-w-0"
              />
              <DebouncedPriceInput
                placeholder="Max"
                value={maxPrice}
                onChange={onMaxPriceChange}
                className="flex-1 md:flex-none md:w-28 bg-transparent text-text-primary text-xs px-2 py-1 outline-none placeholder:text-text-muted/50 text-center min-w-0"
              />
              {(minPrice || maxPrice) && (
                <button
                  className="text-text-muted hover:text-accent-danger bg-transparent border-none cursor-pointer px-2 text-sm leading-none transition-colors border-l border-border-normal"
                  onClick={() => {
                    onMinPriceChange('');
                    onMaxPriceChange('');
                  }}
                  title="Réinitialiser"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Period Selector - Order 3 Mobile, Order 4 Desktop */}
        <div className="flex items-center gap-4 order-3 md:order-4 flex-none w-full md:w-auto">
          <div className="flex flex-col gap-1.5 w-full md:w-auto">
            <span className="text-[0.7rem] uppercase tracking-wider text-text-muted font-bold ml-1">Période</span>
            <div className="flex bg-bg-primary/50 p-1 rounded-lg border border-border-normal w-full md:w-auto justify-between md:justify-start">
              {(Object.keys(RANGE_LABELS) as DateRangePreset[]).map((range) => (
                <button
                  key={range}
                  className={`
                    px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 flex-1 md:flex-none text-center
                    ${dateRange === range 
                      ? 'bg-accent-primary text-white shadow-sm' 
                      : 'text-text-muted hover:text-text-primary'
                    }
                  `}
                  onClick={() => onChangeDateRange(range)}
                >
                  {RANGE_LABELS[range]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search - Order 4 Mobile, Order 2 Desktop */}
        <div className="flex-1 flex min-w-[250px] order-4 md:order-2 md:justify-start w-full">
          <div className="w-full md:max-w-md relative z-[9999] flex flex-col gap-1.5">
            <span className="text-[0.7rem] uppercase tracking-wider text-text-muted font-bold ml-1">Recherche</span>
            <div className="relative">
              <input
                className="w-full bg-bg-primary/50 border border-border-normal text-text-primary rounded-lg px-4 py-2 text-sm outline-none transition-all duration-200 focus:border-accent-primary focus:bg-bg-primary focus:ring-2 focus:ring-accent-primary/10 placeholder:text-text-muted"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Rechercher un item…"
              />
              {open && (query.trim().length > 0) && (
                <ul className="absolute top-full left-0 right-0 mt-2 bg-bg-secondary border border-border-normal rounded-xl shadow-xl overflow-hidden z-50 max-h-[300px] overflow-y-auto">
                  {loading ? (
                    <li className="px-4 py-3 text-sm text-text-muted text-center italic">
                      Recherche en cours...
                    </li>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((s) => (
                      <li
                        key={`${s.server}::${s.item_name}`}
                        className="px-4 py-2.5 cursor-pointer flex justify-between items-center hover:bg-accent-primary/10 hover:text-accent-primary transition-colors border-b border-border-subtle last:border-0"
                        onMouseDown={() => handleChoose(s)}
                      >
                        <strong>{s.item_name}</strong>
                        <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">{s.server}</span>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-3 text-sm text-text-muted text-center">
                      Aucun résultat
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
