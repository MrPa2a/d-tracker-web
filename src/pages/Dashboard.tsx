// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { ItemSummary, TimeseriesPoint, Mover, DateRangePreset, MarketIndex, VolatilityRanking, InvestmentOpportunity, SellOpportunity } from '../types';
import { fetchTimeseries, fetchMovers, fetchMarketIndex, fetchVolatilityRankings, fetchOpportunities, fetchSellOpportunities } from '../api';
import kamaIcon from '../assets/kama.png';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
} from 'recharts';

interface DashboardProps {
  items: ItemSummary[];
  favorites: Set<string>;
  onNavigateToItem: (item: ItemSummary) => void;
  onToggleFavorite: (itemName: string) => void;
  server: string | null;
  dateRange: DateRangePreset;
  minPrice: string;
  maxPrice: string;
}

// Tooltip custom for sparklines
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SmallSparklineTooltip: React.FC<{ active?: boolean; payload?: any[]; coordinate?: { x: number; y: number }; containerNode?: HTMLDivElement | null }> = ({ active, payload, coordinate, containerNode }) => {
  if (!active || !payload || payload.length === 0 || !coordinate || !containerNode) return null;

  const point = payload[0];
  const price = point.value as number;
  const date = point.payload.date;

  let formattedDate = date;
  try {
    // Support ISO string or YYYY-MM-DD
    const d = new Date(date);
    if (isNaN(d.getTime())) {
       const d2 = new Date(date + 'T00:00:00Z');
       if (!isNaN(d2.getTime())) {
         formattedDate = d2.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
         });
       }
    } else {
      formattedDate = d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch {
    // keep raw date
  }

  const rect = containerNode.getBoundingClientRect();
  const x = rect.left + coordinate.x;
  const y = rect.top + coordinate.y;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y - 10,
    transform: 'translate(-50%, -100%)',
    zIndex: 9999,
    pointerEvents: 'none',
  };

  return createPortal(
    <div style={style} className="bg-bg-secondary/90 backdrop-blur-md border border-border-normal p-2 rounded shadow-lg text-xs whitespace-nowrap">
      <div className="font-bold text-text-primary mb-0.5 flex items-center justify-center">
        {Math.round(price).toLocaleString('fr-FR')} <img src={kamaIcon} alt="kamas" style={{width: '10px', height: '10px', verticalAlign: 'middle', marginLeft: '5px'}} />
      </div>
      <div className="text-text-muted text-center">{formattedDate}</div>
    </div>,
    document.body
  );
};

const SmallSparkline: React.FC<{ data: TimeseriesPoint[] | null }> = ({ data }) => {
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  if (!data || data.length === 0) return <div className="text-center text-text-muted text-xs leading-10">—</div>;
  return (
    <div className="w-full h-full" ref={setContainerNode}>
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={data}>
          <XAxis dataKey="date" hide />
          <Tooltip
            content={<SmallSparklineTooltip containerNode={containerNode} />}
            cursor={{ strokeDasharray: '3 3' }}
            isAnimationActive={false}
          />
          <Line type="monotone" dataKey="avg_price" stroke="#60a5fa" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const DashboardRow: React.FC<{
  item: { item_name: string; server: string; last_price: number };
  ts: TimeseriesPoint[] | null;
  onNavigate: () => void;
  isFavorite: boolean;
  onToggleFavorite: (itemName: string) => void;
  metric: React.ReactNode;
}> = ({ item, ts, onNavigate, isFavorite, onToggleFavorite, metric }) => {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_6rem_7rem] gap-4 items-center p-2 rounded-lg bg-bg-primary/40 border border-transparent hover:border-border-strong hover:bg-bg-primary/60 transition-all duration-200">
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
            {Math.round(item.last_price).toLocaleString('fr-FR')} 
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
  onNavigateToItem,
  onToggleFavorite,
  server,
  dateRange,
  minPrice,
  maxPrice,
}) => {
  // Parse price filters
  const parsedMinPrice = minPrice ? parseFloat(minPrice) : null;
  const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : null;

  // Get favorite items from the currently selected server and apply price filter
  const favItems = useMemo(() => {
    if (!server) return [];
    return items.filter((it) => {
      if (it.server !== server || !favorites.has(it.item_name)) return false;
      if (parsedMinPrice !== null && it.last_price < parsedMinPrice) return false;
      if (parsedMaxPrice !== null && it.last_price > parsedMaxPrice) return false;
      return true;
    });
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
      if (watchlistSort === 'price-asc') return a.last_price - b.last_price;
      if (watchlistSort === 'price-desc') return b.last_price - a.last_price;
      
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
      
      const itemsToLoad = favItems.slice(0, 10);
      
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
    setMoversLoading(true);
    setMoversError(null);
    try {
      // On récupère 20 items avec le filtre de prix appliqué côté serveur
      const list = await fetchMovers(server, dateRange, 20, parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined);
      // split into up/down
      const up = list.filter((m) => m.pct_change > 0).sort((a, b) => b.pct_change - a.pct_change).slice(0, 10);
      const down = list.filter((m) => m.pct_change < 0).sort((a, b) => a.pct_change - b.pct_change).slice(0, 10);
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
      setMoversError(errMessage || 'Erreur lors du chargement des movers. Le backend pourrait ne pas exposer /api/movers.');
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
  }, [server, dateRange, parsedMinPrice, parsedMaxPrice]);

  // Market index (HDV)
  const [marketIndex, setMarketIndex] = useState<MarketIndex | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);

  // Timeseries for volatility items
  const [volatilityTs, setVolatilityTs] = useState<Record<string, TimeseriesPoint[] | null>>({});

  const loadMarketStats = () => {
    if (!server) return;

    // 1. Market Index
    setIndexLoading(true);
    fetchMarketIndex(server, dateRange)
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
          fetchVolatilityRankings(server, dateRange, 10, 'desc', parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined),
          fetchVolatilityRankings(server, dateRange, 10, 'asc', parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined),
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
    fetchOpportunities(server, dateRange, 12, parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined)
      .then(opps => setOpportunities(opps))
      .catch(err => {
        console.error('Error loading opportunities:', err);
        setOpportunities(null);
      })
      .finally(() => setOpportunitiesLoading(false));

    // 4. Sell Opportunities
    setSellOpportunitiesLoading(true);
    fetchSellOpportunities(server, dateRange, 12, parsedMinPrice ?? undefined, parsedMaxPrice ?? undefined)
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
  }, [server, dateRange, parsedMinPrice, parsedMaxPrice]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-text-primary to-text-secondary bg-clip-text text-transparent m-0">Tableau de bord</h1>
      </div>

      {/* Market Index Section */}
      {indexLoading && <p className="text-text-muted text-sm text-center py-4">Chargement de l'indice HDV…</p>}
      {marketIndex && !indexLoading && marketIndex.index_change != null && (
        <div className="bg-linear-to-r from-bg-secondary to-bg-primary p-4 rounded-xl border border-border-normal flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
          <div className="text-sm text-text-muted uppercase tracking-wider font-semibold mb-1 relative z-10">Indice HDV ({marketIndex.total_items ?? 0} items)</div>
          <div className={`
            text-3xl font-bold font-mono relative z-10
            ${marketIndex.index_change > 0 ? 'text-accent-success' : marketIndex.index_change < 0 ? 'text-accent-danger' : ''}
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
          {favorites.size === 0 && <p className="text-text-muted text-sm text-center py-4">Aucun item en favoris. Cliquez sur ☆ pour en ajouter.</p>}
          {favorites.size > 0 && favItems.length === 0 && server && (
            <p className="text-text-muted text-sm text-center py-4">Aucun de vos favoris n'est disponible sur <strong>{server}</strong>.</p>
          )}
          {!server && favorites.size > 0 && <p className="text-text-muted text-sm text-center py-4">Sélectionnez un serveur pour voir vos favoris.</p>}
          <ul className="list-none p-0 m-0 flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
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
                    <div className={`text-sm font-bold ${pct > 0 ? 'text-accent-success' : pct < 0 ? 'text-accent-danger' : ''}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</div>
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
                    if (found) onNavigateToItem(found);
                  }}
                  isFavorite={favorites.has(m.item_name)}
                  onToggleFavorite={onToggleFavorite}
                  metric={<div className="text-sm font-bold text-accent-success">+{m.pct_change.toFixed(1)}%</div>}
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
                    if (found) onNavigateToItem(found);
                  }}
                  isFavorite={favorites.has(m.item_name)}
                  onToggleFavorite={onToggleFavorite}
                  metric={<div className="text-sm font-bold text-accent-danger">{m.pct_change.toFixed(1)}%</div>}
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
                    if (found) onNavigateToItem(found);
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
                    if (found) onNavigateToItem(found);
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
          {!opportunitiesLoading && opportunities && opportunities.length === 0 && <p className="text-text-muted text-sm text-center py-4">Aucune opportunité détectée pour le moment.</p>}
          
          {opportunities && opportunities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opportunities.map((opp) => (
                <div 
                  key={`${opp.server}::${opp.item_name}`}
                  className="p-3 rounded-lg bg-bg-primary/40 border border-transparent hover:border-accent-success/50 hover:bg-bg-primary/60 transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    const found = items.find(it => it.item_name === opp.item_name && it.server === opp.server);
                    if (found) onNavigateToItem(found);
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
                  className="p-3 rounded-lg bg-bg-primary/40 border border-transparent hover:border-accent-danger/50 hover:bg-bg-primary/60 transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    const found = items.find(it => it.item_name === opp.item_name && it.server === opp.server);
                    if (found) onNavigateToItem(found);
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
