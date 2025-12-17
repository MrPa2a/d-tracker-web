import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { ItemSummary, SortType, SortOrder, Category, DateRangePreset } from '../types';
import { useTimeseries } from '../hooks/useTimeseries';
import kamaIcon from '../assets/kama.png';
import { Star, StarOff, Search, Filter, X, ChevronDown, ChevronUp, LayoutGrid, List, MoreVertical, Copy, Loader2, ShoppingBag } from 'lucide-react';
import { SmallSparkline } from '../components/Sparkline';
import { ContextMenu } from '../components/ContextMenu';
import { useLists } from '../hooks/useLists';
import type { Profile } from '../types';

interface MarketPageProps {
  items: ItemSummary[];
  loading: boolean;
  error: string | null;
  favorites: Set<string>;
  pendingFavorites?: Set<string>;
  onToggleFavorite: (key: string) => void;
  sortType: SortType;
  sortOrder: SortOrder;
  onSortChange: (type: SortType, order: SortOrder) => void;
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  minPrice: string;
  maxPrice: string;
  onlyFavorites: boolean;
  dateRange: DateRangePreset;
  search: string;
  onSearchChange: (value: string) => void;
  currentProfile: Profile | null;
}

const MarketGridCard: React.FC<{
  item: ItemSummary;
  favorites: Set<string>;
  pendingFavorites?: Set<string>;
  onToggleFavorite: (key: string) => void;
  dateRange: DateRangePreset;
  onContextMenu: (e: React.MouseEvent, item: ItemSummary) => void;
}> = ({ item, favorites, pendingFavorites, onToggleFavorite, dateRange, onContextMenu }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: ts, isLoading: loadingTs } = useTimeseries(item.item_name, item.server, dateRange, {
    enabled: isExpanded,
  });

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const evolution = React.useMemo(() => {
    if (!ts || ts.length < 2) return null;
    const first = ts[0].avg_price;
    const last = ts[ts.length - 1].avg_price;
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [ts]);

  const isPending = pendingFavorites?.has(item.item_name);

  return (
    <div 
      className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 hover:border-blue-500/30 hover:bg-[#25262b] transition-all cursor-pointer group relative flex flex-col h-full"
    >
        <Link 
            to={`/item/${item.server}/${encodeURIComponent(item.item_name)}`}
            className="absolute inset-0 z-10 rounded-xl"
        />
        
        <div className="mb-3 relative z-20 pointer-events-none">
            <div className="float-right ml-2 flex items-center gap-1 pointer-events-auto">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onContextMenu(e, item);
                    }}
                    className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <MoreVertical size={16} />
                </button>
                <button
                    onClick={(e) => {
                    e.stopPropagation();
                    if (!isPending) onToggleFavorite(item.item_name);
                    }}
                    disabled={isPending}
                    className={`p-1.5 rounded-full hover:bg-white/10 transition-opacity ${
                    favorites.has(item.item_name) ? 'text-yellow-400 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'
                    }`}
                >
                    {isPending ? (
                      <Loader2 size={16} className="animate-spin text-accent-primary" />
                    ) : (
                      <Star size={16} fill={favorites.has(item.item_name) ? "currentColor" : "none"} />
                    )}
                </button>
            </div>

            <div className="float-left mr-3 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg font-bold text-gray-600 shrink-0 overflow-hidden">
                {item.icon_url ? (
                    <img 
                      src={item.icon_url} 
                      alt={item.item_name} 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    item.item_name.charAt(0).toUpperCase()
                )}
            </div>

            <div>
                <h3 className="font-medium text-gray-200 break-words" title={item.item_name}>
                {item.item_name}
                </h3>
                {item.category && (
                <div className="text-xs text-gray-500 truncate">{item.category}</div>
                )}
            </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-auto">
            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded text-sm font-medium text-gray-300">
                <img src={kamaIcon} alt="kamas" className="w-3 h-3" />
                {item.last_price?.toLocaleString('fr-FR') ?? '-'}
            </div>
            <button
                onClick={handleExpand}
                className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded text-xs font-medium text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-all border border-transparent hover:border-white/10 relative z-20"
                title={isExpanded ? "Masquer l'historique" : "Voir l'historique"}
            >
                <span className="text-[10px] text-gray-500">Moy.</span>
                {item.average_price?.toLocaleString('fr-FR') ?? '-'}
                <div className="ml-1 text-gray-500">
                     {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </button>
        </div>

        <div 
            className={`grid transition-all duration-300 ease-in-out relative z-20 ${
                isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="overflow-hidden">
                <div className="pt-4 mt-4 border-t border-white/5">
                    {loadingTs ? (
                        <div className="h-20 flex items-center justify-center text-xs text-gray-500">Chargement...</div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Évolution ({dateRange})</span>
                                {evolution !== null ? (
                                    <span className={`font-medium ${evolution > 0 ? 'text-green-400' : evolution < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                        {evolution > 0 ? '+' : ''}{evolution.toFixed(2)}%
                                    </span>
                                ) : (
                                    <span className="text-gray-500">-</span>
                                )}
                            </div>
                            <div className="h-16 w-full">
                                <SmallSparkline data={ts || null} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

const MarketTableRow: React.FC<{
  item: ItemSummary;
  favorites: Set<string>;
  pendingFavorites?: Set<string>;
  onToggleFavorite: (key: string) => void;
  navigate: (path: string) => void;
  dateRange: DateRangePreset;
  onContextMenu: (e: React.MouseEvent, item: ItemSummary) => void;
}> = ({ item, favorites, pendingFavorites, onToggleFavorite, navigate, dateRange, onContextMenu }) => {
  const { data: ts } = useTimeseries(item.item_name, item.server, dateRange);

  const evolution = React.useMemo(() => {
    if (!ts || ts.length < 2) return null;
    const first = ts[0].avg_price;
    const last = ts[ts.length - 1].avg_price;
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [ts]);

  const isPending = pendingFavorites?.has(item.item_name);

  return (
    <tr 
      onClick={() => navigate(`/item/${item.server}/${encodeURIComponent(item.item_name)}`)}
      onAuxClick={(e) => {
        if (e.button === 1) {
          window.open(`/item/${item.server}/${encodeURIComponent(item.item_name)}`, '_blank');
        }
      }}
      className="hover:bg-white/5 transition-colors cursor-pointer group"
    >
      <td className="px-4 py-3 flex items-center gap-2">
        <button
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onContextMenu(e, item);
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
        >
            <MoreVertical size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isPending) onToggleFavorite(item.item_name);
          }}
          disabled={isPending}
          onAuxClick={(e) => e.stopPropagation()}
          className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
            favorites.has(item.item_name) ? 'text-yellow-400 opacity-100' : 'text-gray-600 opacity-0 group-hover:opacity-100'
          }`}
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin text-accent-primary" />
          ) : (
            <Star size={16} fill={favorites.has(item.item_name) ? "currentColor" : "none"} />
          )}
        </button>
      </td>
      <td className="px-4 py-3 font-medium text-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden">
            {item.icon_url ? (
                <img 
                  src={item.icon_url} 
                  alt={item.item_name} 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
            ) : (
                item.item_name.charAt(0).toUpperCase()
            )}
          </div>
          <Link 
            to={`/item/${item.server}/${encodeURIComponent(item.item_name)}`}
            onClick={(e) => e.stopPropagation()}
            onAuxClick={(e) => e.stopPropagation()}
            className="text-gray-200 hover:text-blue-400 no-underline"
          >
            {item.item_name}
          </Link>
        </div>
      </td>
      <td className="px-4 py-3">{item.category || '-'}</td>
      
      {/* Sparkline */}
      <td className="px-4 py-3 w-32 h-12">
        <div className="h-10 w-full">
           <SmallSparkline data={ts || null} />
        </div>
      </td>

      {/* Evolution */}
      <td className="px-4 py-3 text-right">
        {evolution !== null ? (
          <span className={`font-medium ${evolution > 0 ? 'text-green-400' : evolution < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {evolution > 0 ? '+' : ''}{evolution.toFixed(2)}%
          </span>
        ) : (
          <span className="text-gray-600">-</span>
        )}
      </td>

      <td className="px-4 py-3 text-right font-medium text-gray-200">
        <div className="flex items-center justify-end gap-1">
          {item.last_price?.toLocaleString('fr-FR') ?? '-'}
          <img src={kamaIcon} alt="kamas" className="w-3 h-3 opacity-70" />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {item.average_price?.toLocaleString('fr-FR') ?? '-'}
          <img src={kamaIcon} alt="kamas" className="w-3 h-3 opacity-50" />
        </div>
      </td>
      <td className="px-4 py-3 text-right text-xs opacity-70">
        {new Date(item.last_observation_at).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </td>
    </tr>
  );
};

const MarketPage: React.FC<MarketPageProps> = ({
  items,
  loading,
  error,
  favorites,
  pendingFavorites,
  onToggleFavorite,
  sortType,
  sortOrder,
  onSortChange,
  categories,
  selectedCategory,
  onSelectCategory,
  minPrice,
  maxPrice,
  onlyFavorites,
  dateRange,
  search,
  onSearchChange,
  currentProfile,
}) => {
  const navigate = useNavigate();
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('marketViewMode') as 'grid' | 'table') || 'grid';
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: ItemSummary } | null>(null);
  const [listContextMenu, setListContextMenu] = useState<{ x: number; y: number; item: ItemSummary } | null>(null);
  const { lists, addItem } = useLists(currentProfile?.id);

  const handleContextMenu = (e: React.MouseEvent, item: ItemSummary) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  // Filter items based on local filters (Category, Price, Favorites)
  // Note: items are already filtered by Server and Search and Sorted by App.tsx
  const displayedItems = React.useMemo(() => {
    let res = items;

    // Category
    if (selectedCategory) {
      res = res.filter(i => i.category === selectedCategory);
    }

    // Favorites
    if (onlyFavorites) {
      res = res.filter(i => favorites.has(i.item_name));
    }

    // Price
    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        res = res.filter(i => i.last_price >= min);
      }
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        res = res.filter(i => i.last_price <= max);
      }
    }

    return res;
  }, [items, selectedCategory, onlyFavorites, favorites, minPrice, maxPrice]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('marketViewMode', mode);
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6 space-y-6">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
            Marché
          </h1>
          <p className="text-sm md:text-base text-gray-400">Explorez les items et analysez les tendances</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Item Search (restored) */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Rechercher un item..."
              className="bg-[#1a1b1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 w-48"
            />
            {search ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                tabIndex={-1}
                title="Effacer la recherche"
              >
                <X size={16} />
              </button>
            ) : (
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            )}
          </div>

          {/* Category Filter */}
          <div className="relative" ref={categoryRef}>
            <div className="flex items-center bg-[#1a1b1e] border border-white/10 rounded-lg px-3 py-2 gap-2 h-[38px]">
              <Filter size={14} className="text-gray-400" />
              
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="text-sm text-gray-200 bg-transparent border-none outline-none cursor-pointer flex items-center gap-2 hover:text-white transition-colors"
              >
                <span className="whitespace-nowrap">{selectedCategory || 'Toutes catégories'}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`} />
              </button>

              {selectedCategory && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCategory(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors ml-1"
                  title="Effacer le filtre"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Custom Dropdown */}
            {isCategoryOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-full w-max max-w-xs max-h-60 overflow-y-auto bg-[#1a1b1e] border border-white/10 rounded-lg shadow-xl z-50 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <button
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${!selectedCategory ? 'text-blue-400 bg-blue-500/10' : 'text-gray-200'}`}
                  onClick={() => {
                    onSelectCategory(null);
                    setIsCategoryOpen(false);
                  }}
                >
                  Toutes catégories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${selectedCategory === cat.name ? 'text-blue-400 bg-blue-500/10' : 'text-gray-200'}`}
                    onClick={() => {
                      onSelectCategory(cat.name);
                      setIsCategoryOpen(false);
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tri boutons */}
          <div className="flex gap-1 bg-[#1a1b1e] p-1 rounded-lg border border-white/10">
            <button
              onClick={() => {
                if (sortType === 'name') {
                  onSortChange('name', sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  onSortChange('name', 'asc');
                }
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                sortType === 'name' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Nom {sortType === 'name' && (sortOrder === 'asc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortType === 'price') {
                  onSortChange('price', sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  onSortChange('price', 'desc');
                }
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                sortType === 'price' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Prix {sortType === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
          <div className="hidden md:flex gap-1 bg-[#1a1b1e] p-1 rounded-lg border border-white/10">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Vue grille"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => handleViewModeChange('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Vue tableau"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Items Grid or Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement du marché...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">{error}</div>
      ) : displayedItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Aucun item trouvé.</div>
      ) : (
        <>
          {/* Mobile View: Always Grid */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {displayedItems.map((item) => (
              <MarketGridCard
                key={`${item.server}-${item.item_name}`}
                item={item}
                favorites={favorites}
                pendingFavorites={pendingFavorites}
                onToggleFavorite={onToggleFavorite}
                dateRange={dateRange}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>

          {/* Desktop View: Grid or Table */}
          <div className="hidden md:block">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 gap-4">
                {displayedItems.map((item) => (
                  <MarketGridCard
                    key={`${item.server}-${item.item_name}`}
                    item={item}
                    favorites={favorites}
                    pendingFavorites={pendingFavorites}
                    onToggleFavorite={onToggleFavorite}
                    dateRange={dateRange}
                    onContextMenu={handleContextMenu}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-[#1a1b1e] border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-gray-200 font-medium">
                      <tr>
                        <th className="px-4 py-3 w-10"></th>
                        <th className="px-4 py-3">Nom</th>
                        <th className="px-4 py-3">Catégorie</th>
                        <th className="px-4 py-3 w-32">Tendances</th>
                        <th className="px-4 py-3 text-right">Evolution</th>
                        <th className="px-4 py-3 text-right">Prix Actuel</th>
                        <th className="px-4 py-3 text-right">Prix Moyen (30j)</th>
                        <th className="px-4 py-3 text-right">Dernière MAJ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {displayedItems.map((item) => (
                        <MarketTableRow
                          key={`${item.server}-${item.item_name}`}
                          item={item}
                          favorites={favorites}
                          pendingFavorites={pendingFavorites}
                          onToggleFavorite={onToggleFavorite}
                          navigate={navigate}
                          dateRange={dateRange}
                          onContextMenu={handleContextMenu}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          actions={[
            {
              label: favorites.has(contextMenu.item.item_name) ? 'Retirer des favoris' : 'Ajouter aux favoris',
              icon: pendingFavorites?.has(contextMenu.item.item_name) ? <Loader2 size={16} className="animate-spin" /> : (favorites.has(contextMenu.item.item_name) ? <StarOff size={16} /> : <Star size={16} />),
              onClick: () => onToggleFavorite && onToggleFavorite(contextMenu.item.item_name),
              disabled: pendingFavorites?.has(contextMenu.item.item_name)
            },
            {
              label: 'Ajouter à une liste',
              icon: <List size={16} />,
              onClick: () => {
                setListContextMenu({ x: contextMenu.x, y: contextMenu.y, item: contextMenu.item });
                setContextMenu(null);
              },
            },
            {
              label: 'Copier le nom',
              icon: <Copy size={16} />,
              onClick: () => navigator.clipboard.writeText(contextMenu.item.item_name),
            },
          ]}
        />
      )}
      {listContextMenu && (
        <ContextMenu
          x={listContextMenu.x}
          y={listContextMenu.y}
          onClose={() => setListContextMenu(null)}
          actions={[
            ...lists.filter(l => l.profile_id === currentProfile?.id || l.scope === 'public').map(list => ({
              label: list.name,
              onClick: () => addItem({ listId: list.id, itemId: listContextMenu.item.id }),
            })),
            ...(lists.filter(l => l.profile_id === currentProfile?.id || l.scope === 'public').length === 0 ? [{
              label: 'Aucune liste',
              onClick: () => {},
            }] : [])
          ]}
        />
      )}
    </div>
  );
};

export default MarketPage;
