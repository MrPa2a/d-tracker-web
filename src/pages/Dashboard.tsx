// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { ItemSummary, TimeseriesPoint, Mover, DateRangePreset } from '../types';
import { fetchTimeseries, fetchMovers } from '../api';
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
        {Math.round(price).toLocaleString('fr-FR')} <span>💰</span>
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
  const favItems = useMemo(() => {
    return items.filter((it) => favorites.has(`${it.server}::${it.item_name}`));
  }, [items, favorites]);

  // timeseries cache for favorites
  const [favTs, setFavTs] = useState<Record<string, TimeseriesPoint[] | null>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const map: Record<string, TimeseriesPoint[] | null> = {};
      for (const it of favItems.slice(0, 10)) {
        try {
          const data = await fetchTimeseries(it.item_name, it.server, dateRange);
          if (cancelled) return;
          map[`${it.server}::${it.item_name}`] = data;
        } catch {
          map[`${it.server}::${it.item_name}`] = null;
        }
      }
      if (!cancelled) setFavTs(map);
    };
    if (favItems.length > 0 && server) load();
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
      // split into up/down
      const up = list.filter((m) => m.pct_change > 0).sort((a, b) => b.pct_change - a.pct_change).slice(0, 10);
      const down = list.filter((m) => m.pct_change < 0).sort((a, b) => a.pct_change - b.pct_change).slice(0, 10);
      setMoversUp(up);
      setMoversDown(down);

      // Load timeseries for movers
      const allMovers = [...up, ...down];
      const tsMap: Record<string, TimeseriesPoint[] | null> = {};
      for (const m of allMovers) {
        try {
          const data = await fetchTimeseries(m.item_name, m.server, dateRange);
          tsMap[`${m.server}::${m.item_name}`] = data;
        } catch {
          tsMap[`${m.server}::${m.item_name}`] = null;
        }
      }
      setMoversTs(tsMap);
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
  }, [server, dateRange]);

  return (
    <div className="dashboard">
      <h1>Tableau de bord</h1>

      <section className="dashboard-row">
        <div className="dashboard-col">
          <h3>Ma liste de surveillance</h3>
          {favItems.length === 0 && <p className="info-text">Aucun item en favoris. Cliquez sur ☆ pour en ajouter.</p>}
          <ul className="movers-list">
            {favItems.map((it) => {
              const key = `${it.server}::${it.item_name}`;
              const ts = favTs[key] ?? null;
              // compute pct change from first/last if available
              let pct = 0;
              if (ts && ts.length > 1) {
                const first = ts[0]!.avg_price;
                const last = ts[ts.length - 1]!.avg_price;
                pct = ((last - first) / first) * 100;
              }
              return (
                <li key={key} className="mover-row">
                  <button className="mover-name" onClick={() => onNavigateToItem(it)}>{it.item_name}</button>
                  <div className="mover-spark">
                    <SmallSparkline data={ts} />
                  </div>
                  <div className="mover-stats">
                    <div className="mover-price">{Math.round(it.last_price).toLocaleString('fr-FR')} 💰</div>
                    <div className={"mover-pct " + (pct > 0 ? 'up' : pct < 0 ? 'down' : '')}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="dashboard-col">
          <h3>Plus fortes hausses</h3>
          {moversLoading && <p className="info-text">Chargement des movers…</p>}
          {moversError && <p className="error-text">{moversError}</p>}
          <ul className="movers-list">
            {!moversLoading && moversUp && moversUp.length === 0 && <li className="info-text">Aucun résultat.</li>}
            {moversUp && moversUp.map((m) => {
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
                    <div className="mover-price">{Math.round(m.last_price).toLocaleString('fr-FR')} 💰</div>
                    <div className="mover-pct up">+{m.pct_change.toFixed(1)}%</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="dashboard-col">
          <h3>Plus fortes baisses</h3>
          {moversLoading && <p className="info-text">Chargement des movers…</p>}
          <ul className="movers-list">
            {!moversLoading && moversDown && moversDown.length === 0 && <li className="info-text">Aucun résultat.</li>}
            {moversDown && moversDown.map((m) => {
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
                    <div className="mover-price">{Math.round(m.last_price).toLocaleString('fr-FR')} 💰</div>
                    <div className="mover-pct down">{m.pct_change.toFixed(1)}%</div>
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
