// src/pages/Dashboard.tsx
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import type { ItemSummary, TimeseriesPoint, DateRangePreset, Profile } from '../types';
import { fetchTimeseries } from '../api';
import { useMovers, useOpportunities, useSellOpportunities, useMarketIndex } from '../hooks/useMarketData';
import kamaIcon from '../assets/kama.png';
import { SmallSparkline } from '../components/Sparkline';
import { MoreVertical, Star, Loader2, LayoutDashboard, TrendingUp, TrendingDown, Clock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ContextMenu } from '../components/ContextMenu';
import { ItemContextMenu } from '../components/ItemContextMenu';
import { AddToListModal } from '../components/AddToListModal';
import { useLists } from '../hooks/useLists';
import { useMessages } from '../hooks/useMessages';

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
         <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0 overflow-hidden">
            {item.icon_url ? (
                <img src={item.icon_url} alt={item.item_name} className="w-full h-full object-contain" />
            ) : (
                item.item_name.charAt(0).toUpperCase()
            )}
         </div>
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

// Helper to format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

// Recent Messages Component
const RecentMessagesSection: React.FC<{ profileId?: string }> = ({ profileId }) => {
  const { data: messages, isLoading } = useMessages(undefined, profileId, 5, 0);
  
  if (isLoading) {
    return (
      <section className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 shadow-md">
        <div className="flex items-center gap-2 text-text-muted">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Chargement des messages...</span>
        </div>
      </section>
    );
  }
  
  if (!messages || messages.length === 0) {
    return (
      <section className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          {/* <MessageSquare size={18} className="text-accent-primary" /> */}
          <h3 className="text-lg font-bold text-text-primary m-0">💬 Derniers Messages</h3>
        </div>
        <p className="text-text-muted text-sm text-center py-4">Aucun message pour le moment.</p>
      </section>
    );
  }
  
  return (
    <section className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 shadow-md">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {/* <MessageSquare size={18} className="text-accent-primary" /> */}
          <h3 className="text-lg font-bold text-text-primary m-0">💬 Derniers Messages</h3>
        </div>
      </div>
      <div className="space-y-3">
        {messages.slice(0, 3).map((msg) => (
          <div 
            key={msg.id} 
            className={`p-3 rounded-lg bg-bg-tertiary/20 border ${msg.isRead === false ? 'border-accent-primary/30' : 'border-transparent'}`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-text-primary text-sm">{msg.author.name}</span>
              <span className="text-xs text-text-muted">{formatRelativeTime(msg.createdAt)}</span>
            </div>
            <p className="text-sm text-text-muted line-clamp-2">{msg.content}</p>
          </div>
        ))}
      </div>
    </section>
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
  
  // Watchlist collapsed state - collapsed by default on mobile
  const [watchlistExpanded, setWatchlistExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // md breakpoint
    }
    return true;
  });
  const WATCHLIST_MAX_HEIGHT = 210; // ~3 items visible with scroll

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

  // Movers toggle state (up/down)
  const [moversMode, setMoversMode] = useState<'up' | 'down'>('up');

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

  // Calcul du dernier scan (plus récent last_observation_at parmi les items)
  const lastScanAt = useMemo(() => {
    if (!items || items.length === 0) return null;
    const serverItems = items.filter(i => i.server === server);
    if (serverItems.length === 0) return null;
    const mostRecent = serverItems.reduce((latest, item) => {
      const itemDate = new Date(item.last_observation_at);
      return itemDate > latest ? itemDate : latest;
    }, new Date(0));
    return mostRecent.getTime() > 0 ? mostRecent : null;
  }, [items, server]);

  // Top opportunité (meilleure opportunité basée sur la marge absolue en kamas)
  // Calculée sur l'ensemble des items, pas seulement les opportunités filtrées
  const topOpportunity = useMemo(() => {
    if (!items || items.length === 0 || !server) return null;
    
    // Filtrer les items du serveur avec average_price défini et en dessous
    const serverItems = items.filter(i => 
      i.server === server && 
      i.average_price && 
      i.average_price > 0 &&
      i.last_price < i.average_price && // Prix actuel inférieur à la moyenne
      i.last_price > 0
    );
    
    if (serverItems.length === 0) return null;
    
    // Trier par marge absolue (average_price - last_price)
    const sorted = [...serverItems].sort((a, b) => {
      const marginA = (a.average_price || 0) - a.last_price;
      const marginB = (b.average_price || 0) - b.last_price;
      return marginB - marginA;
    });
    
    const best = sorted[0];
    if (!best || !best.average_price) return null;
    
    const margin = best.average_price - best.last_price;
    const discountPct = ((best.average_price - best.last_price) / best.average_price) * 100;
    
    return {
      item_name: best.item_name,
      server: best.server,
      current_price: best.last_price,
      target_price: best.average_price,
      discount_pct: discountPct,
      margin_kamas: margin,
      icon_url: best.icon_url
    };
  }, [items, server]);

  // Conseil du jour basé sur l'indice
  const dailyAdvice = useMemo(() => {
    if (!marketIndex || marketIndex.index_change == null) return null;
    const change = marketIndex.index_change;
    if (change < -3) {
      return { icon: '🟢', text: 'Marché en forte baisse — Bon moment pour acheter !', type: 'buy' as const };
    } else if (change < -1) {
      return { icon: '🟡', text: 'Marché en légère baisse — Surveillez les opportunités.', type: 'neutral' as const };
    } else if (change > 3) {
      return { icon: '🔴', text: 'Marché en forte hausse — Bon moment pour vendre !', type: 'sell' as const };
    } else if (change > 1) {
      return { icon: '🟠', text: 'Marché en hausse — Patience pour les achats.', type: 'neutral' as const };
    }
    return { icon: '⚪', text: 'Marché stable — Évaluez vos positions.', type: 'neutral' as const };
  }, [marketIndex]);

  // Sort states for movers section
  type PriceSortType = 'price-asc' | 'price-desc' | null;
  const [moversSort, setMoversSort] = useState<PriceSortType>(null);

  // Opportunities mode (buy/sell/mix)
  const [opportunitiesMode, setOpportunitiesMode] = useState<'buy' | 'sell' | 'mix'>('mix');

  // Unified sorted movers based on current mode
  const sortedMovers = useMemo(() => {
    const data = moversMode === 'up' ? moversUp : moversDown;
    if (!data) return null;
    if (!moversSort) return data;
    return [...data].sort((a, b) => {
        if (moversSort === 'price-asc') return a.last_price - b.last_price;
        return b.last_price - a.last_price;
    });
  }, [moversUp, moversDown, moversMode, moversSort]);

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
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6 flex flex-col gap-6">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-text-primary to-text-secondary bg-clip-text text-transparent m-0 mb-2 flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 md:w-8 md:h-8 text-accent-primary" />
            Tableau de bord
          </h1>
          <p className="text-sm md:text-base text-gray-400">Vue d'ensemble de votre activité et des opportunités du marché.</p>
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

      {/* ===== ZONE HERO ===== */}
      {indexLoading && <p className="text-text-muted text-sm text-center py-4">Chargement de l'indice HDV…</p>}
      {indexErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{indexErrorMsg}</p>}
      
      {!indexLoading && (marketIndex || topOpportunity) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Indice HDV + Conseil */}
          {marketIndex && marketIndex.index_change != null && (
            <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 shadow-md flex flex-col">
              <div className="flex items-start justify-between mb-3 flex-1">
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">
                    Indice HDV
                  </div>
                  <div className={`text-2xl font-bold font-mono flex items-center gap-2 ${
                    marketIndex.index_change > 0 ? 'text-accent-danger' : marketIndex.index_change < 0 ? 'text-accent-success' : 'text-text-primary'
                  }`}>
                    {marketIndex.index_change > 0 ? <TrendingUp size={20} /> : marketIndex.index_change < 0 ? <TrendingDown size={20} /> : null}
                    {marketIndex.index_change >= 0 ? '+' : ''}{marketIndex.index_change.toFixed(2)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-muted">{marketIndex.total_items ?? 0} items</div>
                  {lastScanAt && (
                    <div className="text-xs text-text-muted flex items-center gap-1 justify-end mt-1">
                      <Clock size={10} />
                      {lastScanAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
              {dailyAdvice && (
                <div className={`text-sm px-3 py-2 rounded-lg mt-auto ${
                  dailyAdvice.type === 'buy' ? 'bg-accent-success/10 text-accent-success' :
                  dailyAdvice.type === 'sell' ? 'bg-accent-danger/10 text-accent-danger' :
                  'bg-bg-tertiary/30 text-text-muted'
                }`}>
                  <span className="mr-2">{dailyAdvice.icon}</span>
                  {dailyAdvice.text}
                </div>
              )}
            </div>
          )}

          {/* Top Opportunité */}
          {topOpportunity && (
            <div 
              className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-accent-success/30 p-4 shadow-md cursor-pointer hover:border-accent-success/60 transition-colors flex flex-col"
              onClick={() => {
                const found = items.find(it => it.item_name === topOpportunity.item_name && it.server === topOpportunity.server);
                if (found) {
                  onNavigateToItem(found);
                } else {
                  onNavigateToItem({
                    id: 0,
                    item_name: topOpportunity.item_name,
                    server: topOpportunity.server,
                    last_price: topOpportunity.current_price,
                    last_observation_at: new Date().toISOString()
                  });
                }
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-accent-success" />
                <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Top Opportunité</span>
              </div>
              <div className="flex items-center justify-between flex-1">
                <div className="flex items-center gap-3">
                  {topOpportunity.icon_url && (
                    <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center overflow-hidden">
                      <img src={topOpportunity.icon_url} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-text-primary">{topOpportunity.item_name}</div>
                    <div className="text-sm text-text-muted flex items-center gap-1">
                      {Math.round(topOpportunity.current_price).toLocaleString('fr-FR')}
                      <img src={kamaIcon} alt="k" className="w-3 h-3" />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-accent-success flex items-center gap-1 justify-end">
                    +{Math.round(topOpportunity.margin_kamas).toLocaleString('fr-FR')}
                    <img src={kamaIcon} alt="k" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-text-muted">
                    -{topOpportunity.discount_pct.toFixed(1)}% vs moy.
                  </div>
                </div>
              </div>
              <div className="text-sm px-3 py-2 mt-3 rounded-lg bg-accent-success/10 text-accent-success">
                <span className="mr-2">💡</span>
                {topOpportunity.margin_kamas >= 1000000 
                  ? 'Marge exceptionnelle — Opportunité à saisir rapidement !'
                  : topOpportunity.margin_kamas >= 100000
                  ? 'Belle marge potentielle — À surveiller de près.'
                  : 'Petite marge — Vérifiez les frais de transaction.'}
              </div>
            </div>
          )}
        </section>
      )}
      
      {!indexLoading && !marketIndex && !indexErrorMsg && server && (
        <p className="text-text-muted text-sm text-center py-4">Aucune donnée d'indice disponible pour cette période.</p>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex flex-col shadow-md">
          <div 
            className="flex justify-between items-center mb-2 border-b border-border-subtle pb-2 cursor-pointer group"
            onClick={() => setWatchlistExpanded(!watchlistExpanded)}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-text-primary m-0 border-none pb-0 flex items-center gap-2">
                ⭐ Ma liste de surveillance
              </h3>
              <span className="text-xs text-text-muted bg-bg-tertiary/50 px-2 py-0.5 rounded-full">
                {favorites.size}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {watchlistExpanded && (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
              )}
              <button className="text-text-muted group-hover:text-text-primary transition-colors">
                {watchlistExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          </div>
          
          {watchlistExpanded && (
            <>
              {favoritesLoading && <p className="text-text-muted text-sm text-center py-4">Chargement des favoris...</p>}
              {!favoritesLoading && favorites.size === 0 && <p className="text-text-muted text-sm text-center py-4">Aucun item en favoris. Cliquez sur ☆ pour en ajouter.</p>}
              {!favoritesLoading && favorites.size > 0 && favItems.length === 0 && server && (
                <p className="text-text-muted text-sm text-center py-4">Aucun de vos favoris n'est disponible sur <strong>{server}</strong>.</p>
              )}
              {!favoritesLoading && !server && favorites.size > 0 && <p className="text-text-muted text-sm text-center py-4">Sélectionnez un serveur pour voir vos favoris.</p>}
              <ul 
                className={`list-none p-0 m-0 flex flex-col gap-2 overflow-y-auto ${favoritesLoading ? 'opacity-50 pointer-events-none' : ''}`}
                style={{ maxHeight: `${WATCHLIST_MAX_HEIGHT}px` }}
              >
                {sortedFavItems.map((it) => {
                  const key = it.item_name;
                  const ts = favTs[key];
                  const hasEvolution = ts && ts.length > 1;
                  
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
            </>
          )}
          
          {!watchlistExpanded && favorites.size > 0 && (
            <div className="text-sm text-text-muted py-2">
              {favItems.length > 0 ? (
                <span>Cliquez pour voir vos {favItems.length} favoris</span>
              ) : (
                <span>{favorites.size} favoris (aucun sur ce serveur)</span>
              )}
            </div>
          )}
        </div>

        {/* Movers Section - Toggle on mobile, separate blocks on desktop */}
        {/* Mobile: Toggle view */}
        <div className="md:hidden bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex flex-col shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <div className="flex items-center gap-2">
              {/* Toggle Hausses / Baisses (mobile only) */}
              <div className="flex bg-bg-tertiary/30 rounded-lg p-0.5">
                <button
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                    moversMode === 'up'
                      ? 'bg-accent-danger/20 text-accent-danger'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  onClick={() => setMoversMode('up')}
                >
                  📈 Hausses
                </button>
                <button
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                    moversMode === 'down'
                      ? 'bg-accent-success/20 text-accent-success'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  onClick={() => setMoversMode('down')}
                >
                  📉 Baisses
                </button>
              </div>
            </div>
            <button
                className={`px-2 py-1 text-xs font-medium rounded transition-all duration-300 flex items-center gap-1 border ${moversSort === 'price-asc' || moversSort === 'price-desc' ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:bg-accent-primary/20 hover:shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-transparent border-border-normal text-text-muted hover:border-accent-primary/50 hover:text-accent-primary hover:shadow-[0_0_8px_rgba(59,130,246,0.2)] hover:bg-accent-primary/5'}`}
                onClick={() => {
                  if (moversSort === 'price-desc') setMoversSort('price-asc');
                  else if (moversSort === 'price-asc') setMoversSort(null);
                  else setMoversSort('price-desc');
                }}
                title="Trier par prix"
              >
                <img src={kamaIcon} alt="kamas" style={{width: '12px', height: '12px', verticalAlign: 'middle'}} /> {moversSort === 'price-asc' ? '↑' : moversSort === 'price-desc' ? '↓' : '⇅'}
              </button>
          </div>
          {moversLoading && <p className="text-text-muted text-sm text-center py-4">Chargement…</p>}
          {moversMode === 'up' && moversUpErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{moversUpErrorMsg}</p>}
          {moversMode === 'down' && moversDownErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{moversDownErrorMsg}</p>}
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {!moversLoading && sortedMovers && sortedMovers.length === 0 && <li className="text-text-muted text-sm text-center py-4">Aucun résultat.</li>}
            {sortedMovers && sortedMovers.slice(0, 3).map((m) => {
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
                  metric={
                    <div className={`text-sm font-bold ${moversMode === 'up' ? 'text-accent-danger' : 'text-accent-success'}`}>
                      {moversMode === 'up' ? '+' : ''}{m.pct_change.toFixed(1)}%
                    </div>
                  }
                />
              );
            })}
          </ul>
        </div>

        {/* Desktop: Hausses block */}
        <div className="hidden md:flex bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex-col shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <h3 className="text-lg font-bold text-text-primary m-0 flex items-center gap-2">
              📈 Hausses
            </h3>
          </div>
          {moversUpLoading && <p className="text-text-muted text-sm text-center py-4">Chargement…</p>}
          {moversUpErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{moversUpErrorMsg}</p>}
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {!moversUpLoading && moversUp && moversUp.length === 0 && <li className="text-text-muted text-sm text-center py-4">Aucune hausse.</li>}
            {moversUp && moversUp.slice(0, 3).map((m) => {
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
                  metric={
                    <div className="text-sm font-bold text-accent-danger">
                      +{m.pct_change.toFixed(1)}%
                    </div>
                  }
                />
              );
            })}
          </ul>
        </div>

        {/* Desktop: Baisses block */}
        <div className="hidden md:flex bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex-col shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <h3 className="text-lg font-bold text-text-primary m-0 flex items-center gap-2">
              📉 Baisses
            </h3>
          </div>
          {moversDownLoading && <p className="text-text-muted text-sm text-center py-4">Chargement…</p>}
          {moversDownErrorMsg && <p className="text-accent-danger text-sm text-center py-4">{moversDownErrorMsg}</p>}
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {!moversDownLoading && moversDown && moversDown.length === 0 && <li className="text-text-muted text-sm text-center py-4">Aucune baisse.</li>}
            {moversDown && moversDown.slice(0, 3).map((m) => {
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
                  metric={
                    <div className="text-sm font-bold text-accent-success">
                      {m.pct_change.toFixed(1)}%
                    </div>
                  }
                />
              );
            })}
          </ul>
        </div>
      </section>

      {/* Opportunities Section - Unified */}
      <section className="grid grid-cols-1 gap-6">
        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex flex-col shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-2">
            <h3 className="text-lg font-bold text-text-primary m-0 border-none pb-0 flex items-center gap-2">
              💰 Opportunités
            </h3>
            {/* Toggle Achat / Vente / Mix */}
            <div className="flex bg-bg-tertiary/30 rounded-lg p-0.5">
              <button
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  opportunitiesMode === 'buy'
                    ? 'bg-accent-success/20 text-accent-success'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                onClick={() => setOpportunitiesMode('buy')}
              >
                🟢 Achat
              </button>
              <button
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  opportunitiesMode === 'mix'
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                onClick={() => setOpportunitiesMode('mix')}
              >
                ⚪ Mix
              </button>
              <button
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  opportunitiesMode === 'sell'
                    ? 'bg-accent-danger/20 text-accent-danger'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                onClick={() => setOpportunitiesMode('sell')}
              >
                🔴 Vente
              </button>
            </div>
          </div>
          
          {(opportunitiesLoading || sellOpportunitiesLoading) && (
            <p className="text-text-muted text-sm text-center py-4">Recherche d'opportunités…</p>
          )}
          {opportunitiesMode !== 'sell' && opportunitiesErrorMsg && (
            <p className="text-accent-danger text-sm text-center py-4">{opportunitiesErrorMsg}</p>
          )}
          {opportunitiesMode !== 'buy' && sellOpportunitiesErrorMsg && (
            <p className="text-accent-danger text-sm text-center py-4">{sellOpportunitiesErrorMsg}</p>
          )}
          
          {!opportunitiesLoading && !sellOpportunitiesLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Opportunités d'achat */}
              {(opportunitiesMode === 'buy' || opportunitiesMode === 'mix') && opportunities && opportunities.slice(0, opportunitiesMode === 'mix' ? 3 : 6).map((opp) => (
                <div 
                  key={`buy::${opp.server}::${opp.item_name}`}
                  className="p-3 rounded-lg bg-bg-tertiary/10 border border-accent-success/20 hover:border-accent-success/50 hover:bg-bg-tertiary/30 transition-all duration-200 cursor-pointer group"
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
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opp.icon_url && (
                        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                          <img src={opp.icon_url} alt="" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                        {opp.item_name}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-accent-success bg-accent-success/10 px-2 py-0.5 rounded border border-accent-success/20 shrink-0">
                      -{opp.discount_pct.toFixed(0)}%
                    </div>
                  </div>
                  <div className="flex justify-between items-end text-sm">
                    <span className="font-mono font-bold text-text-primary flex items-center">
                      {Math.round(opp.current_price).toLocaleString('fr-FR')} 
                      <img src={kamaIcon} alt="k" className="w-2.5 h-2.5 ml-1" />
                    </span>
                    <span className="text-xs text-text-muted">
                      vs {Math.round(opp.target_price).toLocaleString('fr-FR')} k
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Opportunités de vente */}
              {(opportunitiesMode === 'sell' || opportunitiesMode === 'mix') && sellOpportunities && sellOpportunities.slice(0, opportunitiesMode === 'mix' ? 3 : 6).map((opp) => (
                <div 
                  key={`sell::${opp.server}::${opp.item_name}`}
                  className="p-3 rounded-lg bg-bg-tertiary/10 border border-accent-danger/20 hover:border-accent-danger/50 hover:bg-bg-tertiary/30 transition-all duration-200 cursor-pointer group"
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
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opp.icon_url && (
                        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                          <img src={opp.icon_url} alt="" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                        {opp.item_name}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-accent-danger bg-accent-danger/10 px-2 py-0.5 rounded border border-accent-danger/20 shrink-0">
                      +{opp.premium_pct.toFixed(0)}%
                    </div>
                  </div>
                  <div className="flex justify-between items-end text-sm">
                    <span className="font-mono font-bold text-text-primary flex items-center">
                      {Math.round(opp.current_price).toLocaleString('fr-FR')} 
                      <img src={kamaIcon} alt="k" className="w-2.5 h-2.5 ml-1" />
                    </span>
                    <span className="text-xs text-text-muted">
                      vs {Math.round(opp.target_price).toLocaleString('fr-FR')} k
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Message si aucune opportunité */}
              {opportunitiesMode === 'buy' && (!opportunities || opportunities.length === 0) && (
                <p className="text-text-muted text-sm col-span-full text-center py-4">Aucune opportunité d'achat détectée.</p>
              )}
              {opportunitiesMode === 'sell' && (!sellOpportunities || sellOpportunities.length === 0) && (
                <p className="text-text-muted text-sm col-span-full text-center py-4">Aucune opportunité de vente détectée.</p>
              )}
              {opportunitiesMode === 'mix' && (!opportunities || opportunities.length === 0) && (!sellOpportunities || sellOpportunities.length === 0) && (
                <p className="text-text-muted text-sm col-span-full text-center py-4">Aucune opportunité détectée.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Recent Messages Section */}
      <RecentMessagesSection profileId={currentProfile?.id} />

      {contextMenu && (
        <ItemContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          favorites={favorites}
          pendingFavorites={pendingFavorites}
          onToggleFavorite={onToggleFavorite}
          onAddToList={(item) => {
            setListContextMenu({ x: contextMenu.x, y: contextMenu.y, item });
            setContextMenu(null);
          }}
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
