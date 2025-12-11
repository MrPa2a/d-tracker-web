import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, Server, ChevronDown, Star, X } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import type { ItemSummary, DateRangePreset } from '../types';
import { fetchItems } from '../api';

interface HeaderProps {
  onToggleSidebar: () => void;
  servers: string[];
  selectedServer: string | null;
  onSelectServer: (server: string | null) => void;
  dateRange: DateRangePreset;
  onDateRangeChange: (range: DateRangePreset) => void;
  minPrice: string;
  onMinPriceChange: (val: string) => void;
  maxPrice: string;
  onMaxPriceChange: (val: string) => void;
  onlyFavorites: boolean;
  onToggleOnlyFavorites: () => void;
}

const RANGE_LABELS: Record<DateRangePreset, string> = {
  '7d': '7j',
  '30d': '30j',
  '90d': '90j',
  '365d': '1 an',
};

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  servers,
  selectedServer,
  onSelectServer,
  dateRange,
  onDateRangeChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  onlyFavorites,
  onToggleOnlyFavorites
}) => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<ItemSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const serverDropdownRef = useRef<HTMLDivElement>(null);

  // Determine if filters should be disabled (e.g. on Item Details page)
  const isItemDetailsPage = location.pathname.startsWith('/item/');
  const areListFiltersDisabled = isItemDetailsPage; // Price and Favorites are for lists


  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) {
        setIsServerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch items based on search query
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        // Pass selectedServer to filter by server if one is selected
        const results = await fetchItems(searchQuery, selectedServer || undefined);
        setSearchResults(results.slice(0, 10));
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, selectedServer]);

  // Helper for number formatting
  const formatNumber = (val: string) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handlePriceChange = (val: string, setter: (v: string) => void) => {
    const clean = val.replace(/\s/g, '');
    if (clean === '' || /^\d+$/.test(clean)) {
      setter(clean);
    }
  };

  return (
    <header className="h-16 bg-bg-secondary/50 backdrop-blur-md border-b border-border-normal flex items-center justify-between px-4 sticky top-0 z-30 gap-4">
      {/* Left: Menu, Server, Notifications */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2 text-text-muted hover:text-text-primary md:hidden"
        >
          <Menu size={24} />
        </button>

        {/* Server Selector */}
        <div className="relative" ref={serverDropdownRef}>
          <button
            onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary/50 border border-border-normal rounded-lg hover:bg-bg-tertiary transition-colors min-w-[140px] justify-between"
          >
            <div className="flex items-center gap-2">
              <Server size={16} className="text-accent-primary" />
              <span className="text-sm font-medium text-text-primary truncate max-w-[100px]">
                {selectedServer || 'Tous les serveurs'}
              </span>
            </div>
            <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 ${isServerDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isServerDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full min-w-40 bg-[#1a1b1e] border border-white/10 rounded-lg shadow-xl z-50 py-1">
              <button
                className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${!selectedServer ? 'text-blue-400 bg-blue-500/10' : 'text-gray-200'}`}
                onClick={() => {
                  onSelectServer(null);
                  setIsServerDropdownOpen(false);
                }}
              >
                Tous les serveurs
              </button>
              {servers.map((server) => (
                <button
                  key={server}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${selectedServer === server ? 'text-blue-400 bg-blue-500/10' : 'text-gray-200'}`}
                  onClick={() => {
                    onSelectServer(server);
                    setIsServerDropdownOpen(false);
                  }}
                >
                  {server}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Icon */}
        <button className="p-2 text-text-muted hover:text-text-primary relative">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-primary rounded-full"></span>
        </button>
      </div>
      
      {/* Center: Global Search */}
      <div className="hidden md:flex items-center relative flex-1 max-w-xl mx-auto" ref={searchRef}>
        <input 
          type="text" 
          placeholder="Rechercher un item..." 
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="w-full bg-bg-tertiary/50 border border-border-normal rounded-full py-1.5 pl-10 pr-4 text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            tabIndex={-1}
            title="Effacer la recherche"
          >
            <X size={16} />
          </button>
        )}
        <Search className="absolute left-3 text-text-muted" size={18} />
        
        {/* Search Results Dropdown */}
        {showResults && searchQuery.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1b1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Recherche en cours...</div>
            ) : searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((item) => (
                  <Link 
                    key={`${item.server}-${item.item_name}`}
                    to={`/item/${item.server}/${encodeURIComponent(item.item_name)}`}
                    onClick={() => {
                      setSearchQuery('');
                      setShowResults(false);
                    }}
                    className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center justify-between group transition-colors border-b border-white/5 last:border-0 no-underline"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:text-gray-300 transition-colors">
                        {item.item_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                          {item.item_name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{item.server}</span>
                          {item.category && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                              <span>{item.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">Aucun résultat trouvé</div>
            )}
          </div>
        )}
      </div>

      {/* Right: Filters */}
      <div className="flex items-center gap-3">
        {/* Favorites Toggle */}
        <button
          onClick={onToggleOnlyFavorites}
          disabled={areListFiltersDisabled}
          className={`p-2 rounded-lg border transition-colors ${
            onlyFavorites 
              ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' 
              : 'bg-bg-tertiary/50 border-border-normal text-text-muted hover:text-text-primary'
          } ${areListFiltersDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
          title="Afficher uniquement les favoris"
        >
          <Star size={18} fill={onlyFavorites ? "currentColor" : "none"} />
        </button>

        {/* Price Range */}
        <div className={`flex items-center bg-bg-tertiary/50 border border-border-normal rounded-lg px-3 py-2 gap-2 focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary/50 transition-all ${areListFiltersDisabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <input
            type="text"
            placeholder="Min"
            value={formatNumber(minPrice)}
            onChange={(e) => handlePriceChange(e.target.value, onMinPriceChange)}
            disabled={areListFiltersDisabled}
            className="w-16 bg-transparent border-none text-xs text-text-primary outline-none placeholder:text-text-muted/50 text-center"
          />
          <div className="h-4 w-px bg-border-normal mx-1"></div>
          <input
            type="text"
            placeholder="Max"
            value={formatNumber(maxPrice)}
            onChange={(e) => handlePriceChange(e.target.value, onMaxPriceChange)}
            disabled={areListFiltersDisabled}
            className="w-16 bg-transparent border-none text-xs text-text-primary outline-none placeholder:text-text-muted/50 text-center"
          />
          {(minPrice || maxPrice) && (
            <button
              onClick={() => {
                onMinPriceChange('');
                onMaxPriceChange('');
              }}
              className="ml-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        
        {/* Date Range - Always enabled */}
        <div className="flex bg-bg-tertiary/50 rounded-lg border border-border-normal p-1">
          {(Object.keys(RANGE_LABELS) as DateRangePreset[]).map((range) => (
            <button
              key={range}
              onClick={() => onDateRangeChange(range)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                dateRange === range
                  ? 'bg-accent-primary/20 text-accent-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
