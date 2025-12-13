// src/pages/Dashboard.tsx
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import type { ItemSummary, TimeseriesPoint, DateRangePreset, Profile } from '../types';
import { fetchTimeseries } from '../api';
import { useMovers, useVolatilityRankings, useOpportunities, useSellOpportunities, useMarketIndex } from '../hooks/useMarketData';
import kamaIcon from '../assets/kama.png';
import { SmallSparkline } from '../components/Sparkline';
import { MoreVertical, Star, StarOff, Copy, List, Loader2 } from 'lucide-react';
import { ContextMenu } from '../components/ContextMenu';
import { AddToListModal } from '../components/AddToListModal';
import { useLists } from '../hooks/useLists';

interface DashboardProps {
  items: ItemSummary[];
  favorites: Set<string>;
  favoritesLoading?: boolean;
  pendingFavorites?: Set<string>;
  onNavigateToItem: (item: ItemSummary) => void;
  onToggleFavorite: (itemName: string) => void;
  server: string | null;
  dateRange: DateRangePreset;
  minPrice: string;
  maxPrice: string;
  onlyFavorites: boolean;
  currentProfile: Profile | null;
}

const DashboardRow: React.FC<{
  item: ItemSummary;
  ts: TimeseriesPoint[] | null;
  onNavigate: () => void;
  isFavorite: boolean;
  isPending?: boolean;
  onToggleFavorite: (itemName: string) => void;
  metric: React.ReactNode;
  onContextMenu: (e: React.MouseEvent, item: ItemSummary) => void;
}> = ({ item, ts, onNavigate, isFavorite, isPending, onToggleFavorite, metric, onContextMenu }) => {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_6rem_7rem] gap-4 items-center p-2 rounded-lg bg-bg-tertiary/10 border border-transparent hover:border-border-normal hover:bg-bg-tertiary/30 transition-all duration-200">
      <div className="flex items-center gap-2 min-w-0 relative group">
         <Link 
            to={`/item/${item.server}/${item.item_name}`}
            className="text-sm font-medium text-text-primary hover:text-accent-primary no-underline truncate" 
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
                e.preventDefault();
                onNavigate();
              }
            }}
         >
            {item.item_name}
         </Link>
         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                className={`
                text-lg leading-none bg-transparent border-none cursor-pointer transition-all duration-200
                ${isFavorite 
                    ? 'text-accent-warning opacity-100' 
                    : 'text-text-muted hover:text-accent-warning'
                }
                `}
                onClick={(e) => {
                e.stopPropagation();
                if (!isPending) onToggleFavorite(item.item_name);
                }}
                title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                disabled={isPending}
            >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin text-text-muted" />
                ) : (
                  isFavorite ? <Star size={14} fill="currentColor" /> : <Star size={14} />
                )}
            </button>
            <button
                className="text-text-muted hover:text-text-primary p-0.5 rounded hover:bg-bg-tertiary"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onContextMenu(e, item);
                }}
            >
                <MoreVertical size={14} />
            </button>
         </div>
      </div>
      
      <div className="h-10 hidden sm:block w-full">
        <SmallSparkline data={ts} />
      </div>
      
      <div className="flex flex-col items-end min-w-20">
        <div className="text-base font-mono text-text-primary flex items-center">
            {Math.round(ts && ts.length > 0 ? ts[ts.length - 1].avg_price : item.last_price).toLocaleString('fr-FR')} 
            <img src={kamaIcon} alt="kamas" style={{width: '14px', height: '14px', verticalAlign: 'middle', marginLeft: '4px'}} />
        </div>
        {metric}
      </div>
    </li>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  items,
  favorites,
  favoritesLoading = false,
  pendingFavorites,
  onNavigateToItem,
  onToggleFavorite,
  server,
  dateRange,
  minPrice,
  maxPrice,
  onlyFavorites,
  currentProfile,
}) => {
  const [addToListItem, setAddToListItem] = useState<ItemSummary | null>(null);
  const [listContextMenu, setListContextMenu] = useState<{ x: number; y: number; item: ItemSummary } | null>(null);
  const { lists, addItem } = useLists(currentProfile?.id);

  // Parse price filters
  const parsedMinPrice = minPrice ? parseFloat(minPrice) : null;
  const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : null;

  // Get favorite items from the currently selected server and apply price filter
  const favItems = useMemo(() => {
    if (!server) return [];
    
    // Create a map of known items for quick lookup
    const knownItemsMap = new Map(items.filter(i => i.server === server).map(i => [i.item_name, i]));
    
    const result: ItemSummary[] = [];
    
    favorites.forEach(favName => {
        const known = knownItemsMap.get(favName);
        if (known) {
            if (parsedMinPrice !== null && known.last_price < parsedMinPrice) return;
            if (parsedMaxPrice !== null && known.last_price > parsedMaxPrice) return;
            result.push(known);
        } else {
            // Item not in the loaded list. Add as placeholder.
            // We can't apply price filter yet because we don't know the price.
            result.push({
                id: 0,
                item_name: favName,
                server: server,
                last_price: 0,
                last_observation_at: new Date().toISOString()
            });
        }
    });
    
    return result;
  }, [items, favorites, server, parsedMinPrice, parsedMaxPrice]);

  // timeseries cache for favorites
  const itemsToLoad = useMemo(() => favItems.slice(0, 50), [favItems]);

  const favQueries = useQueries({
    queries: itemsToLoad.map(item => ({
      queryKey: ['timeseries', item.item_name, server, dateRange],
      queryFn: () => fetchTimeseries(item.item_name, server!, dateRange),
      enabled: !!server,
      staleTime: 1000 * 60 * 10,
    })),
  });

  const favTs = useMemo(() => {
    const map: Record<string, TimeseriesPoint[] | null> = {};
    itemsToLoad.forEach((item, index) => {
      map[item.item_name] = favQueries[index].data || null;
    });
    return map;
  }, [itemsToLoad, favQueries]);

  // Watchlist sort state
  type WatchlistSortType = 'price-asc' | 'price-desc' | 'pct-asc' | 'pct-desc' | null;
  const [watchlistSort, setWatchlistSort] = useState<WatchlistSortType>(null);

  // Sort favorite items based on watchlistSort
  const sortedFavItems = useMemo(() => {
    if (!watchlistSort) return favItems;
    
    return [...favItems].sort((a, b) => {
      const priceA = favTs[a.item_name] && favTs[a.item_name]!.length > 0 ? favTs[a.item_name]![favTs[a.item_name]!.length - 1].avg_price : a.last_price;
      const priceB = favTs[b.item_name] && favTs[b.item_name]!.length > 0 ? favTs[b.item_name]![favTs[b.item_name]!.length - 1].avg_price : b.last_price;

      if (watchlistSort === 'price-asc') return priceA - priceB;
      if (watchlistSort === 'price-desc') return priceB - priceA;
      
      // For percentage sort, we need to compute pct change
      const tsA = favTs[a.item_name];
      const tsB = favTs[b.item_name];
      
      const pctA = tsA && tsA.length > 1 ? ((tsA[tsA.length - 1]!.avg_price - tsA[0]!.avg_price) / tsA[0]!.avg_price) * 100 : 0;
      const pctB = tsB && tsB.length > 1 ? ((tsB[tsB.length - 1]!.avg_price - tsB[0]!.avg_price) / tsB[0]!.avg_price) * 100 : 0;
      
      if (watchlistSort === 'pct-asc') return pctA - pctB;
      if (watchlistSort === 'pct-desc') return pctB - pctA;
      
      return 0;
    });
  }, [favItems, watchlistSort, favTs]);

  // Filter items
  const filterItems = useMemo(() => onlyFavorites ? Array.from(favorites) : undefined, [onlyFavorites, favorites]);

  // Movers
  const { data: moversUp, isLoading: moversUpLoading, error: moversUpError } = useMovers(
    server!, dateRange, 10, parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems, 'desc'
  );
  const { data: moversDown, isLoading: moversDownLoading, error: moversDownError } = useMovers(
    server!, dateRange, 10, parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems, 'asc'
  );

  const moversLoading = moversUpLoading || moversDownLoading;
  const moversUpErrorMsg = moversUpError ? (moversUpError instanceof Error ? moversUpError.message : String(moversUpError)) : null;
  const moversDownErrorMsg = moversDownError ? (moversDownError instanceof Error ? moversDownError.message : String(moversDownError)) : null;

  // Movers Timeseries
  const allMovers = useMemo(() => [...(moversUp || []), ...(moversDown || [])], [moversUp, moversDown]);
  const moversQueries = useQueries({
    queries: allMovers.map(m => ({
      queryKey: ['timeseries', m.item_name, m.server, dateRange],
      queryFn: () => fetchTimeseries(m.item_name, m.server, dateRange),
      enabled: !!server,
      staleTime: 1000 * 60 * 10,
    })),
  });

  const moversTs = useMemo(() => {
    const map: Record<string, TimeseriesPoint[] | null> = {};
    allMovers.forEach((m, index) => {
      map[`${m.server}::${m.item_name}`] = moversQueries[index].data || null;
    });
    return map;
  }, [allMovers, moversQueries]);

  // Volatility rankings
  const { data: volatile, isLoading: volatileLoading1, error: volatileError1 } = useVolatilityRankings(
    server!, dateRange, 10, 'desc', parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems
  );
  const { data: stable, isLoading: volatileLoading2, error: volatileError2 } = useVolatilityRankings(
    server!, dateRange, 10, 'asc', parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems
  );
  const volatilityLoading = volatileLoading1 || volatileLoading2;
  const volatileErrorMsg = volatileError1 ? (volatileError1 instanceof Error ? volatileError1.message : String(volatileError1)) : null;
  const stableErrorMsg = volatileError2 ? (volatileError2 instanceof Error ? volatileError2.message : String(volatileError2)) : null;

  // Volatility Timeseries
  const allVolatility = useMemo(() => [...(volatile || []), ...(stable || [])], [volatile, stable]);
  const volatilityQueries = useQueries({
    queries: allVolatility.map(item => ({
      queryKey: ['timeseries', item.item_name, item.server, dateRange],
      queryFn: () => fetchTimeseries(item.item_name, item.server, dateRange),
      enabled: !!server,
      staleTime: 1000 * 60 * 10,
    })),
  });

  const volatilityTs = useMemo(() => {
    const map: Record<string, TimeseriesPoint[] | null> = {};
    allVolatility.forEach((item, index) => {
      map[`${item.server}::${item.item_name}`] = volatilityQueries[index].data || null;
    });
    return map;
  }, [allVolatility, volatilityQueries]);

  // Opportunities
  const { data: opportunities, isLoading: opportunitiesLoading, error: opportunitiesError } = useOpportunities(
    server!, dateRange, 12, parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems
  );
  const opportunitiesErrorMsg = opportunitiesError ? (opportunitiesError instanceof Error ? opportunitiesError.message : String(opportunitiesError)) : null;

  // Sell Opportunities
  const { data: sellOpportunities, isLoading: sellOpportunitiesLoading, error: sellOpportunitiesError } = useSellOpportunities(
    server!, dateRange, 12, parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems
  );
  const sellOpportunitiesErrorMsg = sellOpportunitiesError ? (sellOpportunitiesError instanceof Error ? sellOpportunitiesError.message : String(sellOpportunitiesError)) : null;

  // Market Index
  const { data: marketIndex, isLoading: indexLoading, error: indexError } = useMarketIndex(server!, dateRange, filterItems);
  const indexErrorMsg = indexError ? (indexError instanceof Error ? indexError.message : String(indexError)) : null;

  // Sort states for other sections
  type PriceSortType = 'price-asc' | 'price-desc' | null;
  const [moversUpSort, setMoversUpSort] = useState<PriceSortType>(null);
  const [moversDownSort, setMoversDownSort] = useState<PriceSortType>(null);
  const [volatileSort, setVolatileSort] = useState<PriceSortType>(null);
  const [stableSort, setStableSort] = useState<PriceSortType>(null);

  const sortedMoversUp = useMemo(() => {
    if (!moversUp) return null;
    if (!moversUpSort) return moversUp;
    return [...moversUp].sort((a, b) => {
        if (moversUpSort === 'price-asc') return a.last_price - b.last_price;
        return b.last_price - a.last_price;
    });
  }, [moversUp, moversUpSort]);

  const sortedMoversDown = useMemo(() => {
    if (!moversDown) return null;
    if (!moversDownSort) return moversDown;
    return [...moversDown].sort((a, b) => {
        if (moversDownSort === 'price-asc') return a.last_price - b.last_price;
        return b.last_price - a.last_price;
    });
  }, [moversDown, moversDownSort]);

  const sortedVolatile = useMemo(() => {
    if (!volatile) return null;
    if (!volatileSort) return volatile;
    return [...volatile].sort((a, b) => {
        if (volatileSort === 'price-asc') return a.last_price - b.last_price;
        return b.last_price - a.last_price;
    });
  }, [volatile, volatileSort]);

  const sortedStable = useMemo(() => {
    if (!stable) return null;
    if (!stableSort) return stable;
    return [...stable].sort((a, b) => {
        if (stableSort === 'price-asc') return a.last_price - b.last_price;
        return b.last_price - a.last_price;
    });
  }, [stable, stableSort]);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: ItemSummary } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, item: { item_name: string; server: string; last_price: number }) => {
    e.preventDefault();
    // Reconstruct ItemSummary from partial item if needed, or just pass what we have
    // The context menu only needs item_name for now.
    // But to be safe let's cast or ensure we have enough info.
    // The item passed from DashboardRow has item_name, server, last_price.
    // We might need to fake other fields if ItemSummary requires them, but for now it seems fine.
    // Actually ItemSummary has more fields. Let's just cast it for now as we only use item_name in the menu.
    setContextMenu({ x: e.clientX, y: e.clientY, item: item as ItemSummary });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-text-primary to-text-secondary bg-clip-text text-transparent m-0">Tableau de bord</h1>
          </div>
        </div>
      </div>

      {onlyFavorites && (
        <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-4 mb-4 text-sm text-text-primary">
          <p className="font-semibold mb-1">Focus Favoris activé</p>
          <p className="text-text-muted">
            Le tableau de bord affiche uniquement les données relatives aux <strong>{favorites.size} items</strong> de votre liste de surveillance.
          </p>
        </div>
      )}

      {/* Market Index Section */}
      {indexLoading && <p className="text-text-muted text-sm text-center py-4">Chargement de l'indice HDV…</p>}
      {indexErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{indexErrorMsg}</p>}
      {marketIndex && !indexLoading && marketIndex.index_change != null && (
        <div className="bg-linear-to-r from-bg-secondary/50 to-bg-secondary/10 p-4 rounded-xl border border-border-normal flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
          <div className="text-sm text-text-muted uppercase tracking-wider font-semibold mb-1 relative z-10">Indice HDV ({marketIndex.total_items ?? 0} items)</div>
          <div className={`
            text-3xl font-bold font-mono relative z-10
            ${marketIndex.index_change > 0 ? 'text-accent-danger' : marketIndex.index_change < 0 ? 'text-accent-success' : ''}
          `}>
            {marketIndex.index_change >= 0 ? '+' : ''}{marketIndex.index_change.toFixed(2)}%
            {marketIndex.index_change > 0 ? ' ↗' : marketIndex.index_change < 0 ? ' ↘' : ''}
          </div>
        </div>
      )}
      {!indexLoading && !marketIndex && !indexErrorMsg && server && (
        <p className="text-text-muted text-sm text-center py-4">Aucune donnée d'indice disponible pour cette période.</p>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex flex-col shadow-md md:col-span-2 2xl:col-span-1">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <h3 className="text-lg font-bold text-text-primary m-0 border-none pb-0 flex items-center gap-2">⭐ Ma liste de surveillance</h3>
            <div className="flex gap-1">
              <button
                className={`px-2 py-1 text-xs font-medium rounded transition-all duration-300 flex items-center gap-1 border ${watchlistSort?.startsWith('price') ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:bg-accent-primary/20 hover:shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-transparent border-border-normal text-text-muted hover:border-accent-primary/50 hover:text-accent-primary hover:shadow-[0_0_8px_rgba(59,130,246,0.2)] hover:bg-accent-primary/5'}`}
                onClick={() => {
                  if (watchlistSort === 'price-desc') setWatchlistSort('price-asc');
                  else if (watchlistSort === 'price-asc') setWatchlistSort(null);
                  else setWatchlistSort('price-desc');
                }}
                title="Trier par prix"
              >
                <img src={kamaIcon} alt="kamas" style={{width: '12px', height: '12px', verticalAlign: 'middle'}} /> {watchlistSort === 'price-asc' ? '↑' : watchlistSort === 'price-desc' ? '↓' : '⇅'}
              </button>
              <button
                className={`px-2 py-1 text-xs font-medium rounded transition-all duration-300 flex items-center gap-1 border ${watchlistSort?.startsWith('pct') ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:bg-accent-primary/20 hover:shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-transparent border-border-normal text-text-muted hover:border-accent-primary/50 hover:text-accent-primary hover:shadow-[0_0_8px_rgba(59,130,246,0.2)] hover:bg-accent-primary/5'}`}
                onClick={() => {
                  if (watchlistSort === 'pct-desc') setWatchlistSort('pct-asc');
                  else if (watchlistSort === 'pct-asc') setWatchlistSort(null);
                  else setWatchlistSort('pct-desc');
                }}
                title="Trier par évolution"
              >
                % {watchlistSort === 'pct-asc' ? '↑' : watchlistSort === 'pct-desc' ? '↓' : '⇅'}
              </button>
            </div>
          </div>
          {favoritesLoading && <p className="text-text-muted text-sm text-center py-4">Chargement des favoris...</p>}
          {!favoritesLoading && favorites.size === 0 && <p className="text-text-muted text-sm text-center py-4">Aucun item en favoris. Cliquez sur ☆ pour en ajouter.</p>}
          {!favoritesLoading && favorites.size > 0 && favItems.length === 0 && server && (
            <p className="text-text-muted text-sm text-center py-4">Aucun de vos favoris n'est disponible sur <strong>{server}</strong>.</p>
          )}
          {!favoritesLoading && !server && favorites.size > 0 && <p className="text-text-muted text-sm text-center py-4">Sélectionnez un serveur pour voir vos favoris.</p>}
          <ul className={`list-none p-0 m-0 flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1 ${favoritesLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            {sortedFavItems.map((it) => {
              const key = it.item_name;
              const ts = favTs[key];
              const hasEvolution = ts && ts.length > 1;
              
              // compute pct change from first/last if available
              let pct = 0;
              if (hasEvolution) {
                const first = ts[0]!.avg_price;
                const last = ts[ts.length - 1]!.avg_price;
                pct = ((last - first) / first) * 100;
              }
              
              return (
                <DashboardRow
                  key={key}
                  item={it}
                  ts={ts}
                  onNavigate={() => onNavigateToItem(it)}
                  isFavorite={favorites.has(it.item_name)}
                  isPending={pendingFavorites?.has(it.item_name)}
                  onToggleFavorite={onToggleFavorite}
                  onContextMenu={handleContextMenu}
                  metric={hasEvolution ? (
                    <div className={`text-sm font-bold ${pct > 0 ? 'text-accent-danger' : pct < 0 ? 'text-accent-success' : ''}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</div>
                  ) : (
                    <div className="text-[0.7rem] text-text-muted italic font-normal">N/A</div>
                  )}
                />
              );
            })}
          </ul>
        </div>

        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex flex-col shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <h3 className="text-lg font-bold text-text-primary m-0 border-none pb-0 flex items-center gap-2">📈 Plus fortes hausses</h3>
            <button
                className={`px-2 py-1 text-xs font-medium rounded transition-all duration-300 flex items-center gap-1 border ${moversUpSort === 'price-asc' || moversUpSort === 'price-desc' ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:bg-accent-primary/20 hover:shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-transparent border-border-normal text-text-muted hover:border-accent-primary/50 hover:text-accent-primary hover:shadow-[0_0_8px_rgba(59,130,246,0.2)] hover:bg-accent-primary/5'}`}
                onClick={() => {
                  if (moversUpSort === 'price-desc') setMoversUpSort('price-asc');
                  else if (moversUpSort === 'price-asc') setMoversUpSort(null);
                  else setMoversUpSort('price-desc');
                }}
                title="Trier par prix"
              >
                <img src={kamaIcon} alt="kamas" style={{width: '12px', height: '12px', verticalAlign: 'middle'}} /> {moversUpSort === 'price-asc' ? '↑' : moversUpSort === 'price-desc' ? '↓' : '⇅'}
              </button>
          </div>
          {moversLoading && <p className="text-text-muted text-sm text-center py-4">Chargement…</p>}
          {moversUpErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{moversUpErrorMsg}</p>}
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {!moversLoading && moversUp && moversUp.length === 0 && <li className="text-text-muted text-sm text-center py-4">Aucun résultat.</li>}
            {sortedMoversUp && sortedMoversUp.slice(0, 5).map((m) => {
              const key = `${m.server}::${m.item_name}`;
              const ts = moversTs[key] ?? null;
              return (
                <DashboardRow
                  key={key}
                  item={{...m, id: 0, last_observation_at: new Date().toISOString()}}
                  ts={ts}
                  onNavigate={() => {
                    const found = items.find(it => it.item_name === m.item_name && it.server === m.server);
                    if (found) {
                      onNavigateToItem(found);
                    } else {
                      onNavigateToItem({
                        id: 0,
                        item_name: m.item_name,
                        server: m.server,
                        last_price: m.last_price,
                        last_observation_at: new Date().toISOString()
                      });
                    }
                  }}
                  isFavorite={favorites.has(m.item_name)}
                  isPending={pendingFavorites?.has(m.item_name)}
                  onToggleFavorite={onToggleFavorite}
                  onContextMenu={handleContextMenu}
                  metric={<div className="text-sm font-bold text-accent-danger">+{m.pct_change.toFixed(1)}%</div>}
                />
              );
            })}
          </ul>
        </div>

        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex flex-col shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <h3 className="text-lg font-bold text-text-primary m-0 border-none pb-0 flex items-center gap-2">📉 Plus fortes baisses</h3>
            <button
                className={`px-2 py-1 text-xs font-medium rounded transition-all duration-300 flex items-center gap-1 border ${moversDownSort === 'price-asc' || moversDownSort === 'price-desc' ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:bg-accent-primary/20 hover:shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-transparent border-border-normal text-text-muted hover:border-accent-primary/50 hover:text-accent-primary hover:shadow-[0_0_8px_rgba(59,130,246,0.2)] hover:bg-accent-primary/5'}`}
                onClick={() => {
                  if (moversDownSort === 'price-desc') setMoversDownSort('price-asc');
                  else if (moversDownSort === 'price-asc') setMoversDownSort(null);
                  else setMoversDownSort('price-desc');
                }}
                title="Trier par prix"
              >
                <img src={kamaIcon} alt="kamas" style={{width: '12px', height: '12px', verticalAlign: 'middle'}} /> {moversDownSort === 'price-asc' ? '↑' : moversDownSort === 'price-desc' ? '↓' : '⇅'}
              </button>
          </div>
          {moversLoading && <p className="text-text-muted text-sm text-center py-4">Chargement…</p>}
          {moversDownErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{moversDownErrorMsg}</p>}
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {!moversLoading && moversDown && moversDown.length === 0 && <li className="text-text-muted text-sm text-center py-4">Aucun résultat.</li>}
            {sortedMoversDown && sortedMoversDown.slice(0, 5).map((m) => {
              const key = `${m.server}::${m.item_name}`;
              const ts = moversTs[key] ?? null;
              return (
                <DashboardRow
                  key={key}
                  item={{...m, id: 0, last_observation_at: new Date().toISOString()}}
                  ts={ts}
                  onNavigate={() => {
                    const found = items.find(it => it.item_name === m.item_name && it.server === m.server);
                    if (found) {
                      onNavigateToItem(found);
                    } else {
                      onNavigateToItem({
                        id: 0,
                        item_name: m.item_name,
                        server: m.server,
                        last_price: m.last_price,
                        last_observation_at: new Date().toISOString()
                      });
                    }
                  }}
                  isFavorite={favorites.has(m.item_name)}
                  isPending={pendingFavorites?.has(m.item_name)}
                  onToggleFavorite={onToggleFavorite}
                  onContextMenu={handleContextMenu}
                  metric={<div className="text-sm font-bold text-accent-success">{m.pct_change.toFixed(1)}%</div>}
                />
              );
            })}
          </ul>
        </div>
      </section>

      {/* Volatility Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Volatile */}
        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex flex-col shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <h3 className="text-lg font-bold text-text-primary m-0 border-none pb-0 flex items-center gap-2">⚡ Plus Volatiles</h3>
            <button
                className={`px-2 py-1 text-xs font-medium rounded transition-all duration-300 flex items-center gap-1 border ${volatileSort === 'price-asc' || volatileSort === 'price-desc' ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:bg-accent-primary/20 hover:shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-transparent border-border-normal text-text-muted hover:border-accent-primary/50 hover:text-accent-primary hover:shadow-[0_0_8px_rgba(59,130,246,0.2)] hover:bg-accent-primary/5'}`}
                onClick={() => {
                  if (volatileSort === 'price-desc') setVolatileSort('price-asc');
                  else if (volatileSort === 'price-asc') setVolatileSort(null);
                  else setVolatileSort('price-desc');
                }}
                title="Trier par prix"
              >
                <img src={kamaIcon} alt="kamas" style={{width: '12px', height: '12px', verticalAlign: 'middle'}} /> {volatileSort === 'price-asc' ? '↑' : volatileSort === 'price-desc' ? '↓' : '⇅'}
              </button>
          </div>
          {volatilityLoading && <p className="text-text-muted text-sm text-center py-4">Chargement…</p>}
          {volatileErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{volatileErrorMsg}</p>}
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {!volatilityLoading && sortedVolatile && sortedVolatile.length === 0 && <li className="text-text-muted text-sm text-center py-4">Aucun résultat.</li>}
            {sortedVolatile && sortedVolatile.slice(0, 5).map((v) => {
              const key = `${v.server}::${v.item_name}`;
              const ts = volatilityTs[key] ?? null;
              return (
                <DashboardRow
                  key={key}
                  item={{...v, id: 0, last_observation_at: new Date().toISOString()}}
                  ts={ts}
                  onNavigate={() => {
                    const found = items.find(it => it.item_name === v.item_name && it.server === v.server);
                    if (found) {
                      onNavigateToItem(found);
                    } else {
                      onNavigateToItem({
                        id: 0,
                        item_name: v.item_name,
                        server: v.server,
                        last_price: v.last_price,
                        last_observation_at: new Date().toISOString()
                      });
                    }
                  }}
                  isFavorite={favorites.has(v.item_name)}
                  isPending={pendingFavorites?.has(v.item_name)}
                  onToggleFavorite={onToggleFavorite}
                  onContextMenu={handleContextMenu}
                  metric={<div className="text-sm font-bold text-accent-warning">{(v.volatility).toFixed(1)}%</div>}
                />
              );
            })}
          </ul>
        </div>

        {/* Most Stable */}
        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex flex-col shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <h3 className="text-lg font-bold text-text-primary m-0 border-none pb-0 flex items-center gap-2">🛡️ Plus Stables</h3>
            <button
                className={`px-2 py-1 text-xs font-medium rounded transition-all duration-300 flex items-center gap-1 border ${stableSort === 'price-asc' || stableSort === 'price-desc' ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:bg-accent-primary/20 hover:shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-transparent border-border-normal text-text-muted hover:border-accent-primary/50 hover:text-accent-primary hover:shadow-[0_0_8px_rgba(59,130,246,0.2)] hover:bg-accent-primary/5'}`}
                onClick={() => {
                  if (stableSort === 'price-desc') setStableSort('price-asc');
                  else if (stableSort === 'price-asc') setStableSort(null);
                  else setStableSort('price-desc');
                }}
                title="Trier par prix"
              >
                <img src={kamaIcon} alt="kamas" style={{width: '12px', height: '12px', verticalAlign: 'middle'}} /> {stableSort === 'price-asc' ? '↑' : stableSort === 'price-desc' ? '↓' : '⇅'}
              </button>
          </div>
          {volatilityLoading && <p className="text-text-muted text-sm text-center py-4">Chargement…</p>}
          {stableErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{stableErrorMsg}</p>}
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {!volatilityLoading && sortedStable && sortedStable.length === 0 && <li className="text-text-muted text-sm text-center py-4">Aucun résultat.</li>}
            {sortedStable && sortedStable.slice(0, 5).map((v) => {
              const key = `${v.server}::${v.item_name}`;
              const ts = volatilityTs[key] ?? null;
              return (
                <DashboardRow
                  key={key}
                  item={{...v, id: 0, last_observation_at: new Date().toISOString()}}
                  ts={ts}
                  onNavigate={() => {
                    const found = items.find(it => it.item_name === v.item_name && it.server === v.server);
                    if (found) {
                      onNavigateToItem(found);
                    } else {
                      onNavigateToItem({
                        id: 0,
                        item_name: v.item_name,
                        server: v.server,
                        last_price: v.last_price,
                        last_observation_at: new Date().toISOString()
                      });
                    }
                  }}
                  isFavorite={favorites.has(v.item_name)}
                  isPending={pendingFavorites?.has(v.item_name)}
                  onToggleFavorite={onToggleFavorite}
                  onContextMenu={handleContextMenu}
                  metric={<div className="text-sm font-bold text-accent-success">{(v.volatility).toFixed(1)}%</div>}
                />
              );
            })}
          </ul>
        </div>
      </section>

      {/* Opportunities Section */}
      <section className="grid grid-cols-1 gap-6">
        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex flex-col shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <h3 className="text-lg font-bold text-text-primary m-0 border-none pb-0 flex items-center gap-2">💰 Opportunités d'Achat (Sous-évalués)</h3>
          </div>
          {opportunitiesLoading && <p className="text-text-muted text-sm text-center py-4">Recherche d'opportunités…</p>}
          {opportunitiesErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{opportunitiesErrorMsg}</p>}
          {!opportunitiesLoading && opportunities && opportunities.length === 0 && <p className="text-text-muted text-sm text-center py-4">Aucune opportunité d'achat détectée pour le moment.</p>}
          
          {opportunities && opportunities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opportunities.map((opp) => (
                <div 
                  key={`${opp.server}::${opp.item_name}`}
                  className="p-3 rounded-lg bg-bg-tertiary/10 border border-transparent hover:border-accent-success/50 hover:bg-bg-tertiary/30 transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    const found = items.find(it => it.item_name === opp.item_name && it.server === opp.server);
                    if (found) {
                      onNavigateToItem(found);
                    } else {
                      onNavigateToItem({
                        id: 0,
                        item_name: opp.item_name,
                        server: opp.server,
                        last_price: opp.current_price,
                        last_observation_at: new Date().toISOString()
                      });
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-text-primary truncate pr-2 group-hover:text-accent-primary transition-colors">{opp.item_name}</div>
                    <div className="text-xs font-bold text-accent-success bg-accent-success/10 px-2 py-0.5 rounded border border-accent-success/20">
                      -{opp.discount_pct.toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex justify-between items-end text-sm">
                    <div className="flex flex-col">
                      <span className="text-xs text-text-muted">Prix actuel</span>
                      <span className="font-mono font-bold text-text-primary flex items-center">
                        {Math.round(opp.current_price).toLocaleString('fr-FR')} 
                        <img src={kamaIcon} alt="kamas" style={{width: '10px', height: '10px', verticalAlign: 'middle', marginLeft: '3px'}} />
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-text-muted">Prix estimé</span>
                      <span className="font-mono text-text-muted flex items-center">
                        {Math.round(opp.target_price).toLocaleString('fr-FR')}
                        <img src={kamaIcon} alt="kamas" style={{width: '10px', height: '10px', verticalAlign: 'middle', marginLeft: '3px'}} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex flex-col shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <h3 className="text-lg font-bold text-text-primary m-0 border-none pb-0 flex items-center gap-2">💎 Opportunités de Vente (Sur-évalués)</h3>
          </div>
          {sellOpportunitiesLoading && <p className="text-text-muted text-sm text-center py-4">Recherche d'opportunités de vente…</p>}
          {sellOpportunitiesErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{sellOpportunitiesErrorMsg}</p>}
          {!sellOpportunitiesLoading && sellOpportunities && sellOpportunities.length === 0 && <p className="text-text-muted text-sm text-center py-4">Aucune opportunité de vente détectée pour le moment.</p>}
          
          {sellOpportunities && sellOpportunities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sellOpportunities.map((opp) => (
                <div 
                  key={`${opp.server}::${opp.item_name}`}
                  className="p-3 rounded-lg bg-bg-tertiary/10 border border-transparent hover:border-accent-danger/50 hover:bg-bg-tertiary/30 transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    const found = items.find(it => it.item_name === opp.item_name && it.server === opp.server);
                    if (found) {
                      onNavigateToItem(found);
                    } else {
                      onNavigateToItem({
                        id: 0,
                        item_name: opp.item_name,
                        server: opp.server,
                        last_price: opp.current_price,
                        last_observation_at: new Date().toISOString()
                      });
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-text-primary truncate pr-2 group-hover:text-accent-primary transition-colors">{opp.item_name}</div>
                    <div className="text-xs font-bold text-accent-danger bg-accent-danger/10 px-2 py-0.5 rounded border border-accent-danger/20">
                      +{opp.premium_pct.toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex justify-between items-end text-sm">
                    <div className="flex flex-col">
                      <span className="text-xs text-text-muted">Prix actuel</span>
                      <span className="font-mono font-bold text-text-primary flex items-center">
                        {Math.round(opp.current_price).toLocaleString('fr-FR')} 
                        <img src={kamaIcon} alt="kamas" style={{width: '10px', height: '10px', verticalAlign: 'middle', marginLeft: '3px'}} />
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-text-muted">Prix estimé</span>
                      <span className="font-mono text-text-muted flex items-center">
                        {Math.round(opp.target_price).toLocaleString('fr-FR')}
                        <img src={kamaIcon} alt="kamas" style={{width: '10px', height: '10px', verticalAlign: 'middle', marginLeft: '3px'}} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
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
            ...lists.filter(l => l.profile_id === currentProfile?.id).map(list => ({
              label: list.name,
              onClick: () => addItem({ listId: list.id, itemId: listContextMenu.item.id }),
            })),
            ...(lists.filter(l => l.profile_id === currentProfile?.id).length === 0 ? [{
              label: 'Aucune liste',
              onClick: () => {},
            }] : [])
          ]}
        />
      )}
      {addToListItem && (
        <AddToListModal
          item={addToListItem}
          currentProfile={currentProfile}
          onClose={() => setAddToListItem(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
