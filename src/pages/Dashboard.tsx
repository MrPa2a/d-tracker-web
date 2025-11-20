// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { ItemSummary, TimeseriesPoint, Mover, DateRangePreset, MarketIndex, VolatilityRanking } from '../types';
import { fetchTimeseries, fetchMovers, fetchMarketIndex, fetchVolatilityRankings } from '../api';
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
  server: string | null;
  dateRange: DateRangePreset;
}

// Tooltip custom for sparklines
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SmallSparklineTooltip: React.FC<{ active?: boolean; payload?: any[] }> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0];
  const price = point.value as number;
  const date = point.payload.date;

  let formattedDate = date;
  try {
    const d = new Date(date + 'T00:00:00Z');
    formattedDate = d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    // keep raw date
  }

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-price">
        {Math.round(price).toLocaleString('fr-FR')} <img src={kamaIcon} alt="kamas" style={{width: '12px', height: '12px', verticalAlign: 'middle', marginLeft: '-2px'}} />
      </div>
      <div className="chart-tooltip-date">{formattedDate}</div>
    </div>
  );
};

const SmallSparkline: React.FC<{ data: TimeseriesPoint[] | null }> = ({ data }) => {
  if (!data || data.length === 0) return <div className="sparkline-empty">—</div>;
  return (
    <div className="sparkline">
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={data}>
          <XAxis dataKey="date" hide />
          <Tooltip content={<SmallSparklineTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Line type="monotone" dataKey="avg_price" stroke="#60a5fa" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  items,
  favorites,
  onNavigateToItem,
  server,
  dateRange,
}) => {
  // Price filter state
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

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

  // Filter function for items based on price
  const filterByPrice = <T extends { last_price: number }>(item: T): boolean => {
    if (parsedMinPrice !== null && item.last_price < parsedMinPrice) return false;
    if (parsedMaxPrice !== null && item.last_price > parsedMaxPrice) return false;
    return true;
  };

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
      
      // Load all timeseries in parallel and update state progressively
      const promises = itemsToLoad.map(async (it) => {
        const key = `${it.item_name}`; // Use only item name as key since server is global
        try {
          const data = await fetchTimeseries(it.item_name, server, dateRange);
          // Update state immediately when this item loads
          if (!cancelled) {
            setFavTs((prev) => ({ ...prev, [key]: data }));
          }
          return { key, data };
        } catch (err) {
          console.error(`Error loading timeseries for ${it.item_name} on ${server}:`, err);
          if (!cancelled) {
            setFavTs((prev) => ({ ...prev, [key]: null }));
          }
          return { key, data: null };
        }
      });

      await Promise.allSettled(promises);
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

  const loadMovers = async () => {
    if (!server) return;
    setMoversLoading(true);
    setMoversError(null);
    try {
      const list = await fetchMovers(server, dateRange, 10);
      // split into up/down and apply price filter
      const up = list.filter((m) => m.pct_change > 0 && filterByPrice(m)).sort((a, b) => b.pct_change - a.pct_change).slice(0, 10);
      const down = list.filter((m) => m.pct_change < 0 && filterByPrice(m)).sort((a, b) => a.pct_change - b.pct_change).slice(0, 10);
      setMoversUp(up);
      setMoversDown(down);

      // Load timeseries for movers in parallel with progressive updates
      const allMovers = [...up, ...down];
      setMoversTs({}); // Reset first
      
      const promises = allMovers.map(async (m) => {
        const key = `${m.server}::${m.item_name}`;
        try {
          const data = await fetchTimeseries(m.item_name, m.server, dateRange);
          // Update state immediately when this item loads
          setMoversTs((prev) => ({ ...prev, [key]: data }));
          return { key, data };
        } catch {
          setMoversTs((prev) => ({ ...prev, [key]: null }));
          return { key, data: null };
        }
      });

      await Promise.allSettled(promises);
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

  // Volatility rankings
  const [volatile, setVolatile] = useState<VolatilityRanking[] | null>(null);
  const [stable, setStable] = useState<VolatilityRanking[] | null>(null);
  const [volatilityLoading, setVolatilityLoading] = useState(false);

  // Timeseries for volatility items
  const [volatilityTs, setVolatilityTs] = useState<Record<string, TimeseriesPoint[] | null>>({});

  const loadMarketStats = async () => {
    if (!server) return;

    // Load market index
    setIndexLoading(true);
    try {
      const indexData = await fetchMarketIndex(server, dateRange);
      console.log('Market index data:', indexData);
      setMarketIndex(indexData);
    } catch (err) {
      console.error('Error loading market index:', err);
      setMarketIndex(null);
    } finally {
      setIndexLoading(false);
    }

    // Load volatility rankings
    setVolatilityLoading(true);
    try {
      const [volatileData, stableData] = await Promise.all([
        fetchVolatilityRankings(server, dateRange, 10, 'desc'),
        fetchVolatilityRankings(server, dateRange, 10, 'asc'),
      ]);
      setVolatile(volatileData.filter(filterByPrice));
      setStable(stableData.filter(filterByPrice));

      // Load timeseries for volatility items in parallel with progressive updates
      const allItems = [...volatileData, ...stableData];
      setVolatilityTs({}); // Reset first
      
      const promises = allItems.map(async (item) => {
        const key = `${item.server}::${item.item_name}`;
        try {
          const data = await fetchTimeseries(item.item_name, item.server, dateRange);
          // Update state immediately when this item loads
          setVolatilityTs((prev) => ({ ...prev, [key]: data }));
          return { key, data };
        } catch {
          setVolatilityTs((prev) => ({ ...prev, [key]: null }));
          return { key, data: null };
        }
      });

      await Promise.allSettled(promises);
    } catch (err) {
      console.error('Error loading volatility rankings:', err);
      setVolatile(null);
      setStable(null);
    } finally {
      setVolatilityLoading(false);
    }
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
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Tableau de bord</h1>
        <div className="price-filter">
          <div className="price-filter-inputs">
            <div className="price-filter-group">
              <label htmlFor="min-price">Prix min</label>
              <input
                id="min-price"
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="price-filter-input"
              />
            </div>
            <span className="price-filter-separator">—</span>
            <div className="price-filter-group">
              <label htmlFor="max-price">Prix max</label>
              <input
                id="max-price"
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="price-filter-input"
              />
            </div>
          </div>
          {(minPrice || maxPrice) && (
            <button
              className="price-filter-clear"
              onClick={() => {
                setMinPrice('');
                setMaxPrice('');
              }}
              title="Réinitialiser le filtre"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Market Index Section */}
      {indexLoading && <p className="info-text">Chargement de l'indice HDV…</p>}
      {marketIndex && !indexLoading && marketIndex.index_change != null && (
        <div className="market-index">
          <div className="market-index-label">Indice HDV ({marketIndex.total_items ?? 0} items)</div>
          <div className={
            'market-index-value ' +
            (marketIndex.index_change > 0 ? 'market-index-value--up' : marketIndex.index_change < 0 ? 'market-index-value--down' : '')
          }>
            {marketIndex.index_change >= 0 ? '+' : ''}{marketIndex.index_change.toFixed(2)}%
            {marketIndex.index_change > 0 ? ' ↗' : marketIndex.index_change < 0 ? ' ↘' : ''}
          </div>
        </div>
      )}
      {!indexLoading && !marketIndex && server && (
        <p className="info-text">Aucune donnée d'indice disponible pour cette période.</p>
      )}

      <section className="dashboard-row">
        <div className="dashboard-col">
          <div className="watchlist-header">
            <h3>⭐ Ma liste de surveillance</h3>
            <div className="watchlist-sort">
              <button
                className={"sort-btn" + (watchlistSort?.startsWith('price') ? ' active' : '')}
                onClick={() => {
                  if (watchlistSort === 'price-asc') setWatchlistSort('price-desc');
                  else if (watchlistSort === 'price-desc') setWatchlistSort(null);
                  else setWatchlistSort('price-asc');
                }}
                title="Trier par prix"
              >
                <img src={kamaIcon} alt="kamas" style={{width: '12px', height: '12px', verticalAlign: 'middle'}} /> {watchlistSort === 'price-asc' ? '↑' : watchlistSort === 'price-desc' ? '↓' : '⇅'}
              </button>
              <button
                className={"sort-btn" + (watchlistSort?.startsWith('pct') ? ' active' : '')}
                onClick={() => {
                  if (watchlistSort === 'pct-asc') setWatchlistSort('pct-desc');
                  else if (watchlistSort === 'pct-desc') setWatchlistSort(null);
                  else setWatchlistSort('pct-asc');
                }}
                title="Trier par évolution"
              >
                % {watchlistSort === 'pct-asc' ? '↑' : watchlistSort === 'pct-desc' ? '↓' : '⇅'}
              </button>
            </div>
          </div>
          {favorites.size === 0 && <p className="info-text">Aucun item en favoris. Cliquez sur ☆ pour en ajouter.</p>}
          {favorites.size > 0 && favItems.length === 0 && server && (
            <p className="info-text">Aucun de vos favoris n'est disponible sur <strong>{server}</strong>.</p>
          )}
          {!server && favorites.size > 0 && <p className="info-text">Sélectionnez un serveur pour voir vos favoris.</p>}
          <ul className="movers-list movers-list--scrollable">
            {sortedFavItems.map((it) => {
              const key = it.item_name;
              const ts = favTs[key];
              const isLoading = ts === undefined;
              const hasPriceData = it.last_price != null && it.last_price > 0;
              const hasEvolution = ts && ts.length > 1;
              
              // compute pct change from first/last if available
              let pct = 0;
              if (hasEvolution) {
                const first = ts[0]!.avg_price;
                const last = ts[ts.length - 1]!.avg_price;
                pct = ((last - first) / first) * 100;
              }
              
              return (
                <li key={key} className="mover-row">
                  <button className="mover-name" onClick={() => onNavigateToItem(it)}>{it.item_name}</button>
                  <div className="mover-spark">
                    {isLoading ? (
                      <div className="sparkline-loading">⏳</div>
                    ) : (
                      <SmallSparkline data={ts} />
                    )}
                  </div>
                  <div className="mover-stats">
                    {isLoading ? (
                      <div className="mover-loading">Chargement...</div>
                    ) : hasPriceData ? (
                      <>
                        <div className="mover-price">{Math.round(it.last_price).toLocaleString('fr-FR')} <img src={kamaIcon} alt="kamas" style={{width: '14px', height: '14px', verticalAlign: 'middle', marginLeft: '4px'}} /></div>
                        {hasEvolution ? (
                          <div className={"mover-pct " + (pct > 0 ? 'up' : pct < 0 ? 'down' : '')}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</div>
                        ) : (
                          <div className="mover-pct" style={{color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85em'}}>N/A</div>
                        )}
                      </>
                    ) : (
                      <div className="mover-no-data" title="Aucune donnée disponible sur cette période">N/A</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="dashboard-col">
          <h3>📈 Plus fortes hausses</h3>
          {moversLoading && <p className="info-text">Chargement des movers…</p>}
          {moversError && <p className="error-text">{moversError}</p>}
          <ul className="movers-list">
            {!moversLoading && moversUp && moversUp.length === 0 && <li className="info-text">Aucun résultat.</li>}
            {moversUp && moversUp.slice(0, 5).map((m) => {
              const key = `${m.server}::${m.item_name}`;
              const ts = moversTs[key] ?? null;
              return (
                <li key={key} className="mover-row">
                  <button className="mover-name" onClick={() => {
                    const found = items.find(it => it.item_name === m.item_name && it.server === m.server);
                    if (found) onNavigateToItem(found);
                  }}>{m.item_name}</button>
                  <div className="mover-spark">
                    <SmallSparkline data={ts} />
                  </div>
                  <div className="mover-stats">
                    <div className="mover-price">{Math.round(m.last_price).toLocaleString('fr-FR')} <img src={kamaIcon} alt="kamas" style={{width: '14px', height: '14px', verticalAlign: 'middle', marginLeft: '4px'}} /></div>
                    <div className="mover-pct up">+{m.pct_change.toFixed(1)}%</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="dashboard-col">
          <h3>📉 Plus fortes baisses</h3>
          {moversLoading && <p className="info-text">Chargement des movers…</p>}
          <ul className="movers-list">
            {!moversLoading && moversDown && moversDown.length === 0 && <li className="info-text">Aucun résultat.</li>}
            {moversDown && moversDown.slice(0, 5).map((m) => {
              const key = `${m.server}::${m.item_name}`;
              const ts = moversTs[key] ?? null;
              return (
                <li key={key} className="mover-row">
                  <button className="mover-name" onClick={() => {
                    const found = items.find(it => it.item_name === m.item_name && it.server === m.server);
                    if (found) onNavigateToItem(found);
                  }}>{m.item_name}</button>
                  <div className="mover-spark">
                    <SmallSparkline data={ts} />
                  </div>
                  <div className="mover-stats">
                    <div className="mover-price">{Math.round(m.last_price).toLocaleString('fr-FR')} <img src={kamaIcon} alt="kamas" style={{width: '14px', height: '14px', verticalAlign: 'middle', marginLeft: '4px'}} /></div>
                    <div className="mover-pct down">{m.pct_change.toFixed(1)}%</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Volatility Section */}
      <section className="dashboard-row">
        <div className="dashboard-col">
          <h3>⚡ Items les plus volatils</h3>
          {volatilityLoading && <p className="info-text">Chargement…</p>}
          <ul className="movers-list">
            {!volatilityLoading && volatile && volatile.length === 0 && <li className="info-text">Aucun résultat.</li>}
            {volatile && volatile.slice(0, 5).map((v) => {
              const key = `${v.server}::${v.item_name}`;
              const ts = volatilityTs[key] ?? null;
              return (
                <li key={key} className="mover-row">
                  <button className="mover-name" onClick={() => {
                    const found = items.find(it => it.item_name === v.item_name && it.server === v.server);
                    if (found) onNavigateToItem(found);
                  }}>{v.item_name}</button>
                  <div className="mover-spark">
                    <SmallSparkline data={ts} />
                  </div>
                  <div className="mover-stats">
                    <div className="mover-price">{Math.round(v.last_price).toLocaleString('fr-FR')} <img src={kamaIcon} alt="kamas" style={{width: '14px', height: '14px', verticalAlign: 'middle', marginLeft: '4px'}} /></div>
                    <div className="mover-pct" style={{color: '#facc15'}}>{v.volatility != null ? v.volatility.toFixed(1) : 'N/A'}%</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="dashboard-col">
          <h3>🛡️ Items les plus stables</h3>
          {volatilityLoading && <p className="info-text">Chargement…</p>}
          <ul className="movers-list">
            {!volatilityLoading && stable && stable.length === 0 && <li className="info-text">Aucun résultat.</li>}
            {stable && stable.slice(0, 5).map((s) => {
              const key = `${s.server}::${s.item_name}`;
              const ts = volatilityTs[key] ?? null;
              return (
                <li key={key} className="mover-row">
                  <button className="mover-name" onClick={() => {
                    const found = items.find(it => it.item_name === s.item_name && it.server === s.server);
                    if (found) onNavigateToItem(found);
                  }}>{s.item_name}</button>
                  <div className="mover-spark">
                    <SmallSparkline data={ts} />
                  </div>
                  <div className="mover-stats">
                    <div className="mover-price">{Math.round(s.last_price).toLocaleString('fr-FR')} <img src={kamaIcon} alt="kamas" style={{width: '14px', height: '14px', verticalAlign: 'middle', marginLeft: '4px'}} /></div>
                    <div className="mover-pct" style={{color: '#60a5fa'}}>{s.volatility != null ? s.volatility.toFixed(1) : 'N/A'}%</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
