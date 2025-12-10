// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ItemSummary, TimeseriesPoint, Mover, DateRangePreset, MarketIndex, VolatilityRanking, InvestmentOpportunity, SellOpportunity } from '../types';
import { fetchTimeseries, fetchMovers, fetchMarketIndex, fetchVolatilityRankings, fetchOpportunities, fetchSellOpportunities } from '../api';
import kamaIcon from '../assets/kama.png';
import { SmallSparkline } from '../components/Sparkline';

interface DashboardProps {
  items: ItemSummary[];
  favorites: Set<string>;
  favoritesLoading?: boolean;
  onNavigateToItem: (item: ItemSummary) => void;
  onToggleFavorite: (itemName: string) => void;
  server: string | null;
  dateRange: DateRangePreset;
  minPrice: string;
  maxPrice: string;
  onlyFavorites: boolean;
}

const DashboardRow: React.FC<{
  item: { item_name: string; server: string; last_price: number };
  ts: TimeseriesPoint[] | null;
  onNavigate: () => void;
  isFavorite: boolean;
  onToggleFavorite: (itemName: string) => void;
  metric: React.ReactNode;
}> = ({ item, ts, onNavigate, isFavorite, onToggleFavorite, metric }) => {
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
         <button
            className={`
              text-lg leading-none bg-transparent border-none cursor-pointer transition-all duration-200
              ${isFavorite 
                 ? 'text-accent-warning opacity-30 group-hover:opacity-100' 
                 : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent-warning'
              }
            `}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.item_name);
            }}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
         >
            ★
         </button>
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
  onNavigateToItem,
  onToggleFavorite,
  server,
  dateRange,
  minPrice,
  maxPrice,
  onlyFavorites,
}) => {
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
  const [favTs, setFavTs] = useState<Record<string, TimeseriesPoint[] | null>>({});

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!server) return;
      
      // Load all favorites timeseries (up to 50 to avoid too many requests)
      const itemsToLoad = favItems.slice(0, 50);
      
      // Reset state first
      setFavTs({});
      
      // Load all timeseries in parallel
      const results: Record<string, TimeseriesPoint[] | null> = {};
      
      await Promise.all(itemsToLoad.map(async (it) => {
        const key = `${it.item_name}`;
        try {
          const data = await fetchTimeseries(it.item_name, server, dateRange);
          if (!cancelled) {
            results[key] = data;
          }
        } catch (err) {
          console.error(`Error loading timeseries for ${it.item_name} on ${server}:`, err);
          if (!cancelled) {
            results[key] = null;
          }
        }
      }));

      if (!cancelled) {
        setFavTs(results);
      }
    };
    if (favItems.length > 0 && server) {
      load();
    } else {
      setFavTs({});
    }
    return () => {
      cancelled = true;
    };
  }, [favItems, dateRange, server]);

  // movers
  const [moversUp, setMoversUp] = useState<Mover[] | null>(null);
  const [moversDown, setMoversDown] = useState<Mover[] | null>(null);
  const [moversError, setMoversError] = useState<string | null>(null);
  const [moversLoading, setMoversLoading] = useState(false);

  // timeseries cache for movers
  const [moversTs, setMoversTs] = useState<Record<string, TimeseriesPoint[] | null>>({});

  // Volatility rankings
  const [volatile, setVolatile] = useState<VolatilityRanking[] | null>(null);
  const [stable, setStable] = useState<VolatilityRanking[] | null>(null);
  const [volatilityLoading, setVolatilityLoading] = useState(false);

  // Opportunities
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[] | null>(null);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);

  // Sell Opportunities
  const [sellOpportunities, setSellOpportunities] = useState<SellOpportunity[] | null>(null);
  const [sellOpportunitiesLoading, setSellOpportunitiesLoading] = useState(false);

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

  const loadMovers = async () => {
    if (!server) return;

    // If filtering by favorites but no favorites, return empty results immediately
    if (onlyFavorites && favorites.size === 0) {
      setMoversUp([]);
      setMoversDown([]);
      setMoversTs({});
      return;
    }

    const filterItems = onlyFavorites ? Array.from(favorites) : undefined;

    setMoversLoading(true);
    setMoversError(null);
    try {
      // On récupère 20 items avec le filtre de prix appliqué côté serveur
      // Si le mode focus est activé, on passe la liste des favoris
      
      // Fetch Top Gainers (desc) and Top Losers (asc) separately
      const [up, down] = await Promise.all([
        fetchMovers(server, dateRange, 10, parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems, 'desc'),
        fetchMovers(server, dateRange, 10, parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems, 'asc')
      ]);

      setMoversUp(up);
      setMoversDown(down);

      // Load timeseries for movers in parallel
      const allMovers = [...up, ...down];
      setMoversTs({}); // Reset first
      
      const results: Record<string, TimeseriesPoint[] | null> = {};
      await Promise.all(allMovers.map(async (m) => {
        const key = `${m.server}::${m.item_name}`;
        try {
          const data = await fetchTimeseries(m.item_name, m.server, dateRange);
          results[key] = data;
        } catch {
          results[key] = null;
        }
      }));
      
      setMoversTs(results);
    } catch (err: unknown) {
      console.error(err);
      const errMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setMoversError(errMessage || 'Erreur lors du chargement des movers. Le backend pourrait ne pas exposer /api/market?type=movers.');
      setMoversUp(null);
      setMoversDown(null);
    } finally {
      setMoversLoading(false);
    }
  };

  useEffect(() => {
    if (server) {
      loadMovers();
    } else {
      setMoversUp(null);
      setMoversDown(null);
      setMoversError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, dateRange, parsedMinPrice, parsedMaxPrice, onlyFavorites, favorites]);

  // Market index (HDV)
  const [marketIndex, setMarketIndex] = useState<MarketIndex | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);

  // Timeseries for volatility items
  const [volatilityTs, setVolatilityTs] = useState<Record<string, TimeseriesPoint[] | null>>({});

  const loadMarketStats = () => {
    if (!server) return;

    // If filtering by favorites but no favorites, return empty results immediately
    if (onlyFavorites && favorites.size === 0) {
      setMarketIndex(null);
      setVolatile([]);
      setStable([]);
      setVolatilityTs({});
      setOpportunities([]);
      setSellOpportunities([]);
      return;
    }

    const filterItems = onlyFavorites ? Array.from(favorites) : undefined;

    // 1. Market Index
    setIndexLoading(true);
    fetchMarketIndex(server, dateRange, filterItems)
      .then(data => {
        console.log('Market index data:', data);
        setMarketIndex(data);
      })
      .catch(err => {
        console.error('Error loading market index:', err);
        setMarketIndex(null);
      })
      .finally(() => setIndexLoading(false));

    // 2. Volatility Rankings (Moved up to match UI order)
    setVolatilityLoading(true);
    const loadVolatility = async () => {
      try {
        const [volatileData, stableData] = await Promise.all([
          fetchVolatilityRankings(server, dateRange, 10, 'desc', parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems),
          fetchVolatilityRankings(server, dateRange, 10, 'asc', parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems),
        ]);
        setVolatile(volatileData);
        setStable(stableData);

        // Load timeseries for volatility items in parallel
        const allItems = [...volatileData, ...stableData];
        setVolatilityTs({}); // Reset first
        
        const results: Record<string, TimeseriesPoint[] | null> = {};
        await Promise.all(allItems.map(async (item) => {
          const key = `${item.server}::${item.item_name}`;
          try {
            const data = await fetchTimeseries(item.item_name, item.server, dateRange);
            results[key] = data;
          } catch {
            results[key] = null;
          }
        }));
        setVolatilityTs(results);
      } catch (err) {
        console.error('Error loading volatility rankings:', err);
        setVolatile(null);
        setStable(null);
      } finally {
        setVolatilityLoading(false);
      }
    };
    loadVolatility();

    // 3. Opportunities
    setOpportunitiesLoading(true);
    fetchOpportunities(server, dateRange, 12, parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems)
      .then(opps => setOpportunities(opps))
      .catch(err => {
        console.error('Error loading opportunities:', err);
        setOpportunities(null);
      })
      .finally(() => setOpportunitiesLoading(false));

    // 4. Sell Opportunities
    setSellOpportunitiesLoading(true);
    fetchSellOpportunities(server, dateRange, 12, parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined, filterItems)
      .then(sells => setSellOpportunities(sells))
      .catch(err => {
        console.error('Error loading sell opportunities:', err);
        setSellOpportunities(null);
      })
      .finally(() => setSellOpportunitiesLoading(false));
  };

  useEffect(() => {
    if (server) {
      loadMarketStats();
    } else {
      setMarketIndex(null);
      setVolatile(null);
      setStable(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, dateRange, parsedMinPrice, parsedMaxPrice, onlyFavorites, favorites]);

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
      {!indexLoading && !marketIndex && server && (
        <p className="text-text-muted text-sm text-center py-4">Aucune donnée d'indice disponible pour cette période.</p>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-bg-secondary/30 backdrop-blur-sm rounded-xl border border-border-normal p-4 flex flex-col shadow-md">
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
                  onToggleFavorite={onToggleFavorite}
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
          {moversError && <p className="text-accent-danger text-sm text-center py-4">{moversError}</p>}
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {!moversLoading && moversUp && moversUp.length === 0 && <li className="text-text-muted text-sm text-center py-4">Aucun résultat.</li>}
            {sortedMoversUp && sortedMoversUp.slice(0, 5).map((m) => {
              const key = `${m.server}::${m.item_name}`;
              const ts = moversTs[key] ?? null;
              return (
                <DashboardRow
                  key={key}
                  item={m}
                  ts={ts}
                  onNavigate={() => {
                    const found = items.find(it => it.item_name === m.item_name && it.server === m.server);
                    if (found) {
                      onNavigateToItem(found);
                    } else {
                      onNavigateToItem({
                        item_name: m.item_name,
                        server: m.server,
                        last_price: m.last_price,
                        last_observation_at: new Date().toISOString()
                      });
                    }
                  }}
                  isFavorite={favorites.has(m.item_name)}
                  onToggleFavorite={onToggleFavorite}
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
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {!moversLoading && moversDown && moversDown.length === 0 && <li className="text-text-muted text-sm text-center py-4">Aucun résultat.</li>}
            {sortedMoversDown && sortedMoversDown.slice(0, 5).map((m) => {
              const key = `${m.server}::${m.item_name}`;
              const ts = moversTs[key] ?? null;
              return (
                <DashboardRow
                  key={key}
                  item={m}
                  ts={ts}
                  onNavigate={() => {
                    const found = items.find(it => it.item_name === m.item_name && it.server === m.server);
                    if (found) {
                      onNavigateToItem(found);
                    } else {
                      onNavigateToItem({
                        item_name: m.item_name,
                        server: m.server,
                        last_price: m.last_price,
                        last_observation_at: new Date().toISOString()
                      });
                    }
                  }}
                  isFavorite={favorites.has(m.item_name)}
                  onToggleFavorite={onToggleFavorite}
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
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {!volatilityLoading && sortedVolatile && sortedVolatile.length === 0 && <li className="text-text-muted text-sm text-center py-4">Aucun résultat.</li>}
            {sortedVolatile && sortedVolatile.slice(0, 5).map((v) => {
              const key = `${v.server}::${v.item_name}`;
              const ts = volatilityTs[key] ?? null;
              return (
                <DashboardRow
                  key={key}
                  item={v}
                  ts={ts}
                  onNavigate={() => {
                    const found = items.find(it => it.item_name === v.item_name && it.server === v.server);
                    if (found) {
                      onNavigateToItem(found);
                    } else {
                      onNavigateToItem({
                        item_name: v.item_name,
                        server: v.server,
                        last_price: v.last_price,
                        last_observation_at: new Date().toISOString()
                      });
                    }
                  }}
                  isFavorite={favorites.has(v.item_name)}
                  onToggleFavorite={onToggleFavorite}
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
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {!volatilityLoading && sortedStable && sortedStable.length === 0 && <li className="text-text-muted text-sm text-center py-4">Aucun résultat.</li>}
            {sortedStable && sortedStable.slice(0, 5).map((v) => {
              const key = `${v.server}::${v.item_name}`;
              const ts = volatilityTs[key] ?? null;
              return (
                <DashboardRow
                  key={key}
                  item={v}
                  ts={ts}
                  onNavigate={() => {
                    const found = items.find(it => it.item_name === v.item_name && it.server === v.server);
                    if (found) {
                      onNavigateToItem(found);
                    } else {
                      onNavigateToItem({
                        item_name: v.item_name,
                        server: v.server,
                        last_price: v.last_price,
                        last_observation_at: new Date().toISOString()
                      });
                    }
                  }}
                  isFavorite={favorites.has(v.item_name)}
                  onToggleFavorite={onToggleFavorite}
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
    </div>
  );
};

export default Dashboard;
