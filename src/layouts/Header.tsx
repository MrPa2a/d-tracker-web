import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, Server, ChevronDown, Star, X, MoreVertical, RefreshCw, Filter } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import type { ItemSummary, DateRangePreset, Profile } from '../types';
import { fetchItems } from '../api';
import { ItemContextMenu } from '../components/ItemContextMenu';
import { AddToListModal } from '../components/AddToListModal';
import { useFavorites } from '../hooks/useFavorites';
import { MessagesButton } from '../components/messages';

interface HeaderProps {
  currentProfile: Profile | null;
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
  currentProfile,
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
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const { favorites, toggleFavorite, pendingFavorites } = useFavorites(currentProfile);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<ItemSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: ItemSummary } | null>(null);
  const [itemToAddToList, setItemToAddToList] = useState<ItemSummary | null>(null);

  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const serverDropdownRef = useRef<HTMLDivElement>(null);

  // Determine if filters should be disabled (e.g. on Item Details page)
  const isItemDetailsPage = location.pathname.startsWith('/item/');
  const areListFiltersDisabled = isItemDetailsPage; // Price and Favorites are for lists


  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const isContextMenuClick = target.closest('[data-context-menu="true"]');

      if (searchRef.current && !searchRef.current.contains(target) && !isContextMenuClick) {
        setShowResults(false);
      }
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(target)) {
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
    <header className="bg-bg-secondary/50 backdrop-blur-md border-b border-border-normal sticky top-0 z-30 flex flex-col">
      <div className="h-16 flex items-center justify-between px-4 gap-4 w-full">
        {/* Left: Menu, Server (Desktop), Notifications */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleSidebar}
            className="p-2 text-text-muted hover:text-text-primary md:hidden"
          >
            <Menu size={24} />
          </button>

          {/* Server Selector - Desktop */}
          <div className="relative hidden md:block" ref={serverDropdownRef}>
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

          {/* Messages Button */}
          <MessagesButton 
            currentProfileId={currentProfile?.id ?? null}
            currentProfileName={currentProfile?.name ?? null}
          />
        </div>
        
        {/* Center: Global Search */}
        <div className="flex items-center gap-2 flex-1 max-w-xl mx-auto">
          <div className="relative flex-1" ref={searchRef}>
            <input 
              type="text" 
              placeholder="Rechercher..." 
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            
            {/* Search Results Dropdown */}
            {showResults && searchQuery.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1b1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500 text-sm">Recherche en cours...</div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((item) => (
                      <div 
                        key={`${item.server}-${item.item_name}`}
                        className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center justify-between group transition-colors border-b border-white/5 last:border-0"
                      >
                        <Link 
                          to={`/item/${item.server}/${encodeURIComponent(item.item_name)}`}
                          onClick={() => {
                            setSearchQuery('');
                            setShowResults(false);
                          }}
                          className="flex items-center gap-3 flex-1 no-underline"
                        >
                          <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:text-gray-300 transition-colors overflow-hidden">
                            {item.icon_url ? (
                              <img src={item.icon_url} alt={item.item_name} className="w-full h-full object-contain" />
                            ) : (
                              item.item_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                              {item.item_name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span className={item.ankama_id ? "hidden md:inline" : ""}>{item.ankama_id ? `GID: ${item.ankama_id}` : item.server}</span>
                              {item.category && (
                                <>
                                  <span className={`w-1 h-1 rounded-full bg-gray-600 ${item.ankama_id ? 'hidden md:block' : ''}`}></span>
                                  <span>{item.category}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, item });
                            }}
                            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-gray-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                            <MoreVertical size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">Aucun résultat trouvé</div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => queryClient.invalidateQueries()}
            className={`hidden md:block p-2 rounded-full bg-bg-tertiary/50 border border-border-normal text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all ${isFetching ? 'animate-spin text-accent-primary' : ''}`}
            title="Rafraîchir les données"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Right: Filters (Desktop) & Toggle (Mobile) */}
        <div className="flex items-center gap-3">
          {/* Desktop Filters */}
          <div className="hidden md:flex items-center gap-3">
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

            
            {/* Date Range */}
            <div className={`flex bg-bg-tertiary/50 rounded-lg border border-border-normal p-1 ${areListFiltersDisabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              {(Object.keys(RANGE_LABELS) as DateRangePreset[]).map((range) => (
                <button
                  key={range}
                  onClick={() => onDateRangeChange(range)}
                  disabled={areListFiltersDisabled}
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

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className={`md:hidden p-2 rounded-lg border transition-colors ${
              isMobileFiltersOpen
                ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                : 'bg-bg-tertiary/50 border-border-normal text-text-muted hover:text-text-primary'
            }`}
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Filters Panel */}
      {isMobileFiltersOpen && (
        <div className="md:hidden border-t border-white/10 p-4 space-y-4 bg-bg-secondary/95 backdrop-blur-xl animate-in slide-in-from-top-2">
          {/* Actions Row */}
          <div className="flex items-center gap-3">
             <button
              onClick={() => queryClient.invalidateQueries()}
              className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-bg-tertiary/50 border border-border-normal text-text-muted hover:text-text-primary transition-all ${isFetching ? 'text-accent-primary' : ''}`}
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
              <span className="text-sm">Rafraîchir</span>
            </button>

            <button
              onClick={onToggleOnlyFavorites}
              disabled={areListFiltersDisabled}
              className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                onlyFavorites 
                  ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' 
                  : 'bg-bg-tertiary/50 border-border-normal text-text-muted hover:text-text-primary'
              } ${areListFiltersDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
            >
              <Star size={16} fill={onlyFavorites ? "currentColor" : "none"} />
              <span className="text-sm">Favoris</span>
            </button>
          </div>

          {/* Price Range (Mobile) */}
          <div className={`space-y-2 ${areListFiltersDisabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            <label className="text-xs font-medium text-text-muted uppercase">Prix</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Min"
                value={formatNumber(minPrice)}
                onChange={(e) => handlePriceChange(e.target.value, onMinPriceChange)}
                className="flex-1 min-w-0 bg-bg-tertiary/50 border border-border-normal rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
              />
              <span className="text-text-muted">-</span>
              <input
                type="text"
                placeholder="Max"
                value={formatNumber(maxPrice)}
                onChange={(e) => handlePriceChange(e.target.value, onMaxPriceChange)}
                className="flex-1 min-w-0 bg-bg-tertiary/50 border border-border-normal rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
              />
            </div>
          </div>

          {/* Date Range (Mobile) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted uppercase">Période</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(RANGE_LABELS) as DateRangePreset[]).map((range) => (
                <button
                  key={range}
                  onClick={() => onDateRangeChange(range)}
                  className={`px-2 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    dateRange === range
                      ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                      : 'bg-bg-tertiary/50 border-border-normal text-text-muted'
                  }`}
                >
                  {RANGE_LABELS[range]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <ItemContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          favorites={favorites}
          pendingFavorites={pendingFavorites}
          onToggleFavorite={toggleFavorite}
          onAddToList={(item) => {
            setItemToAddToList(item);
          }}
        />
      )}

      {itemToAddToList && (
        <AddToListModal
          item={itemToAddToList}
          currentProfile={currentProfile}
          onClose={() => setItemToAddToList(null)}
        />
      )}
    </header>
  );
};
