// src/components/PriceChart.tsx
import React, { useMemo, useEffect, useState } from 'react';
import type { DateRangePreset, ItemSummary, TimeseriesPoint, ItemStats } from '../types';
import { fetchItemStats } from '../api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface PriceChartProps {
  selectedItem: ItemSummary | null;
  server: string | null;
  timeseries: TimeseriesPoint | null[] | TimeseriesPoint[] | null;
  loading: boolean;
  error: string | null;
  dateRange: DateRangePreset;
  onRefresh: () => void;
  onBackToDashboard?: () => void;
  favorites?: Set<string>;
  onToggleFavorite?: (key: string) => void;
}

// Tooltip custom, cohérent avec le thème
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]; // avg_price
  const price = point.value as number;

  // label = "YYYY-MM-DD"
  let formattedDate = label;
  try {
    const d = new Date(label + 'T00:00:00Z');
    formattedDate = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    // au pire on garde le label brut
  }

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-price">
        Prix: {Math.round(price).toLocaleString('fr-FR')} <span>💰</span>
      </div>
      <div className="chart-tooltip-date">{formattedDate}</div>
    </div>
  );
};

export const PriceChart: React.FC<PriceChartProps> = ({
  selectedItem,
  server,
  timeseries,
  loading,
  error,
  dateRange,
  onRefresh,
  onBackToDashboard,
  favorites = new Set<string>(),
  onToggleFavorite,
}) => {
  const hasData = !!timeseries && Array.isArray(timeseries) && timeseries.length > 0;

  // State for item stats (volatility, median, signal)
  const [itemStats, setItemStats] = useState<ItemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Load item stats
  useEffect(() => {
    if (!selectedItem || !server) {
      setItemStats(null);
      return;
    }

    let cancelled = false;
    setStatsLoading(true);

    fetchItemStats(selectedItem.item_name, server, dateRange)
      .then((data) => {
        if (cancelled) return;
        setItemStats(data);
        setStatsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error fetching item stats:', err);
        setItemStats(null);
        setStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedItem, server, dateRange]);

  const stats = useMemo(() => {
    if (!hasData || !timeseries) return null;

    const prices = timeseries.map((p) => p!.avg_price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const first = timeseries[0]!.avg_price;
    const last = timeseries[timeseries.length - 1]!.avg_price;
    const pctChange = ((last - first) / first) * 100;

    return { min, max, first, last, pctChange };
  }, [hasData, timeseries]);

  if (!selectedItem || !server) {
    return (
      <div className="chart-empty">
        <p>Sélectionne un item dans la liste pour afficher son historique.</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div className="chart-header-left">
          <div className="chart-nav-row">
            {onBackToDashboard && (
              <button
                className="chart-back-link"
                type="button"
                onClick={onBackToDashboard}
                title="Retour au tableau de bord"
              >
                ← Retour au tableau de bord
              </button>
            )}
            <button
              className="chart-refresh-btn"
              type="button"
              onClick={onRefresh}
            >
              ↻ Actualiser
            </button>
          </div>
          <div className="chart-title-row">
            <h2 className="chart-title">{selectedItem.item_name}</h2>
            {onToggleFavorite && (
              <button
                className={'chart-fav-btn' + (favorites.has(`${server}::${selectedItem.item_name}`) ? ' chart-fav-btn--active' : '')}
                onClick={() => onToggleFavorite(`${server}::${selectedItem.item_name}`)}
                title={favorites.has(`${server}::${selectedItem.item_name}`) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                {favorites.has(`${server}::${selectedItem.item_name}`) ? '★' : '☆'}
              </button>
            )}
            {itemStats && !statsLoading && itemStats.signal && (
              <>
                <span className="chart-title-separator">—</span>
                <span 
                  className={
                    'chart-signal ' +
                    (itemStats.signal === 'buy'
                      ? 'chart-signal--buy'
                      : itemStats.signal === 'sell'
                      ? 'chart-signal--sell'
                      : 'chart-signal--neutral')
                  }
                  title={
                    itemStats.signal === 'buy' 
                      ? 'Le prix est actuellement bas par rapport à la moyenne récente. Bon moment pour acheter !' 
                      : itemStats.signal === 'sell'
                      ? 'Le prix est actuellement élevé par rapport à la moyenne récente. Bon moment pour vendre !'
                      : 'Le prix est stable autour de sa moyenne récente.'
                  }
                >
                  {itemStats.signal === 'buy' ? '🟢 ACHAT' : itemStats.signal === 'sell' ? '🔴 VENTE' : '🟡 NEUTRE'}
                </span>
              </>
            )}
          </div>
          <p className="chart-subtitle">
            Serveur : {server} — Période : {dateRange}
          </p>
        </div>

        {stats && (
          <div className="chart-stats-wrapper">
            <div className="chart-stats">
              <div className="chart-stat">
                <span className="chart-stat-label">Dernier prix</span>
                <span className="chart-stat-value">
                  {Math.round(stats.last).toLocaleString('fr-FR')}
                </span>
              </div>
              <div className="chart-stat">
                <span className="chart-stat-label">Min</span>
                <span className="chart-stat-value">
                  {Math.round(stats.min).toLocaleString('fr-FR')}
                </span>
              </div>
              <div className="chart-stat">
                <span className="chart-stat-label">Max</span>
                <span className="chart-stat-value">
                  {Math.round(stats.max).toLocaleString('fr-FR')}
                </span>
              </div>
              {itemStats && !statsLoading && itemStats.median_price != null && (
                <div className="chart-stat">
                  <span className="chart-stat-label">Médian</span>
                  <span className="chart-stat-value">
                    {Math.round(itemStats.median_price).toLocaleString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
            <div className="chart-stats">
              <div className="chart-stat">
                <span className="chart-stat-label">Évolution</span>
                <span
                  className={
                    'chart-stat-value ' +
                    (stats.pctChange > 0
                      ? 'chart-stat-value--up'
                      : stats.pctChange < 0
                      ? 'chart-stat-value--down'
                      : '')
                  }
                >
                  {stats.pctChange >= 0 ? '+' : ''}
                  {stats.pctChange.toFixed(1)}%
                </span>
              </div>
              {itemStats && !statsLoading && itemStats.volatility != null && (
                <div className="chart-stat">
                  <span className="chart-stat-label">Volatilité</span>
                  <span className="chart-stat-value" style={{color: '#facc15'}}>
                    {itemStats.volatility.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {loading && <p className="info-text">Chargement de la courbe…</p>}
      {error && <p className="error-text">Erreur : {error}</p>}

      {!loading && !error && !hasData && (
        <p className="info-text">
          Aucune donnée disponible pour cet item sur la période sélectionnée.
        </p>
      )}

      {!loading && !error && hasData && timeseries && (
        <div className="chart-graph">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Line
                type="monotone"
                dataKey="avg_price"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
