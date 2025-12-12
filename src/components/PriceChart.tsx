// src/components/PriceChart.tsx
import React, { useMemo, useEffect, useState, useRef } from 'react';
import type { DateRangePreset, ItemSummary, TimeseriesPoint, ItemStats, Profile } from '../types';
import { fetchItemStats } from '../api';
import { EditItemModal } from './EditItemModal';
import { ContextMenu } from './ContextMenu';
import { MoreVertical, Star, Copy, List, Loader2 } from 'lucide-react';
import { useLists } from '../hooks/useLists';
import kamaIcon from '../assets/kama.png';
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
  onDateRangeChange?: (range: DateRangePreset) => void;
  onRefresh: () => void;
  refreshTrigger?: number;
  onBackToDashboard?: () => void;
  favorites?: Set<string>;
  pendingFavorites?: Set<string>;
  onToggleFavorite?: (key: string) => void;
  onItemUpdate?: (oldName: string, newName: string, server: string, newCategory: string) => void;
  currentProfile?: Profile | null;
}

// Tooltip custom, cohérent avec le thème
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]; // avg_price
  const price = point.value as number;

  // label est un timestamp (number) ou une date string
  let formattedDate = '';
  try {
    const d = new Date(label);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
        // Fallback pour les anciens formats si nécessaire
        formattedDate = String(label);
    }
  } catch {
    formattedDate = String(label);
  }

  return (
    <div className="bg-bg-secondary/90 backdrop-blur-md border border-border-normal p-3 rounded-lg shadow-xl">
      <div className="text-sm font-bold text-text-primary mb-1 flex items-center">
        Prix: {Math.round(price).toLocaleString('fr-FR')} <img src={kamaIcon} alt="kamas" className='opacity-80 ml-0.5 w-3 h-3 align-middle' style={{marginLeft: '5px'}} />
      </div>
      <div className="text-xs text-text-muted">{formattedDate}</div>
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
  onDateRangeChange,
  onRefresh,
  refreshTrigger = 0,
  onBackToDashboard,
  favorites = new Set<string>(),
  pendingFavorites,
  onToggleFavorite,
  onItemUpdate,
  currentProfile,
}) => {
  const hasData = !!timeseries && Array.isArray(timeseries) && timeseries.length > 0;

  // State for item stats (volatility, median, signal)
  const [itemStats, setItemStats] = useState<ItemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: ItemSummary } | null>(null);
  const [listContextMenu, setListContextMenu] = useState<{ x: number; y: number; item: ItemSummary } | null>(null);

  const { lists, addItem } = useLists(currentProfile?.id);

  const handleContextMenu = (e: React.MouseEvent, item: ItemSummary) => {
    e.preventDefault();
    e.stopPropagation();
    setListContextMenu(null);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY,
      item,
    });
  };

  // Ref et state pour la hauteur dynamique du graphique
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(350);

  // Mesurer la hauteur du container et adapter
  useEffect(() => {
    const updateChartHeight = () => {
      if (chartContainerRef.current) {
        const height = chartContainerRef.current.offsetHeight;
        // Soustraire le padding (16px * 2 = 32px)
        const calculatedHeight = Math.max(height - 32, 250);
        setChartHeight(calculatedHeight);
      }
    };

    // Mise à jour immédiate
    updateChartHeight();
    
    // Mise à jour après un court délai pour s'assurer que le DOM est complètement rendu
    const timer1 = setTimeout(updateChartHeight, 50);
    const timer2 = setTimeout(updateChartHeight, 200);
    
    // Écoute du resize
    window.addEventListener('resize', updateChartHeight);

    return () => {
      window.removeEventListener('resize', updateChartHeight);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [selectedItem, hasData]); // Déclencher aussi quand hasData change

  // Load item stats
  useEffect(() => {
    if (!selectedItem || !server) {
      setItemStats(null);
      return;
    }

    let cancelled = false;
    setStatsLoading(true);
    setItemStats(null); // Clear previous stats to avoid showing stale data

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
  }, [selectedItem, server, dateRange, refreshTrigger]);

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

  const chartData = useMemo(() => {
    if (!timeseries || !Array.isArray(timeseries)) return [];
    return timeseries
      .filter((p): p is TimeseriesPoint => p !== null)
      .map(p => ({
        ...p,
        timestamp: new Date(p.date).getTime()
      }));
  }, [timeseries]);

  if (!selectedItem || !server) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-lg">
        <p>Sélectionne un item dans la liste pour afficher son historique.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-secondary/30 backdrop-blur-sm rounded-2xl border border-border-normal p-4 md:p-6 shadow-lg">
      
      {/* Top Bar: Navigation & Date Range */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                className="text-sm font-medium text-accent-primary hover:text-accent-primary/80 hover:underline bg-transparent border-none cursor-pointer p-0"
                type="button"
                onClick={onBackToDashboard}
                title="Retour au tableau de bord"
              >
                ← Retour au tableau de bord
              </button>
            )}
            <button
              className="text-xs text-text-muted hover:text-text-primary bg-transparent border border-border-normal rounded px-2 py-0.5 cursor-pointer transition-colors"
              type="button"
              onClick={onRefresh}
            >
              ↻ Actualiser
            </button>
        </div>

        {onDateRangeChange && (
          <div className="flex bg-bg-tertiary/50 rounded-lg p-1 border border-border-normal">
            {(['7d', '30d', '90d', '365d'] as DateRangePreset[]).map((range) => (
              <button
                key={range}
                onClick={() => onDateRangeChange(range)}
                className={`
                  px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer
                  ${dateRange === range 
                    ? 'bg-accent-primary text-white shadow-sm' 
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'}
                `}
              >
                {range === '365d' ? '1 an' : range.replace('d', 'j')}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center flex-wrap gap-3">
            <h2 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-text-primary to-text-secondary bg-clip-text text-transparent m-0">{selectedItem.item_name}</h2>
            {onToggleFavorite && (
              <button
                className={`text-2xl leading-none bg-transparent border-none cursor-pointer transition-colors ${favorites.has(selectedItem.item_name) ? 'text-accent-warning' : 'text-text-muted hover:text-accent-warning'}`}
                onClick={() => {
                  if (!pendingFavorites?.has(selectedItem.item_name)) {
                    onToggleFavorite(selectedItem.item_name);
                  }
                }}
                disabled={pendingFavorites?.has(selectedItem.item_name)}
                title={favorites.has(selectedItem.item_name) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                {pendingFavorites?.has(selectedItem.item_name) ? (
                  <Loader2 size={24} className="animate-spin text-accent-primary" />
                ) : (
                  favorites.has(selectedItem.item_name) ? '★' : '☆'
                )}
              </button>
            )}
            <button
              className="p-1 hover:bg-bg-tertiary rounded-md transition-colors cursor-pointer text-text-muted hover:text-text-primary"
              onClick={(e) => handleContextMenu(e, selectedItem)}
              title="Plus d'options"
            >
              <MoreVertical size={20} />
            </button>
            <button
              className="text-xl leading-none bg-transparent border-none cursor-pointer transition-colors text-text-muted hover:text-accent-primary ml-1"
              onClick={() => setIsEditModalOpen(true)}
              title="Modifier l'item"
            >
              ✎
            </button>
            {(statsLoading || (itemStats && itemStats.signal)) && (
              <>
                <span className="text-border-strong">—</span>
                {statsLoading ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-bg-primary/50 text-text-muted border border-border-subtle animate-pulse">
                    ...
                  </span>
                ) : itemStats?.signal ? (
                  <span 
                    className={`
                      px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider
                      ${itemStats.signal === 'buy'
                        ? 'bg-accent-success/20 text-accent-success border border-accent-success/30'
                        : itemStats.signal === 'sell'
                        ? 'bg-accent-danger/20 text-accent-danger border border-accent-danger/30'
                        : 'bg-accent-warning/20 text-accent-warning border border-accent-warning/30'}
                    `}
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
                ) : null}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {selectedItem.ankama_id && (
              <span className="text-xs font-medium text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-subtle">
                GID: {selectedItem.ankama_id}
              </span>
            )}
            {statsLoading && !selectedItem.category ? (
              <span className="text-xs font-medium text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-subtle animate-pulse">
                -
              </span>
            ) : (selectedItem.category || itemStats?.category) ? (
              <span className="text-xs font-medium text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-subtle">
                {selectedItem.category || itemStats?.category}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-text-muted m-0 mt-1">
            Serveur : {server} — Période : {dateRange}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-4 bg-bg-primary/40 p-3 rounded-xl border border-border-subtle">
            <div className="flex flex-col">
              <span className="text-[0.65rem] uppercase tracking-wider text-text-muted font-semibold mb-0.5">Dernier prix</span>
              <span className="text-sm md:text-base font-bold text-text-primary font-mono">
                {loading ? (
                  <span className="animate-pulse text-text-muted">...</span>
                ) : stats ? (
                  Math.round(stats.last).toLocaleString('fr-FR')
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.65rem] uppercase tracking-wider text-text-muted font-semibold mb-0.5">Min</span>
              <span className="text-sm md:text-base font-bold text-text-primary font-mono">
                {loading ? (
                  <span className="animate-pulse text-text-muted">...</span>
                ) : stats ? (
                  Math.round(stats.min).toLocaleString('fr-FR')
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.65rem] uppercase tracking-wider text-text-muted font-semibold mb-0.5">Max</span>
              <span className="text-sm md:text-base font-bold text-text-primary font-mono">
                {loading ? (
                  <span className="animate-pulse text-text-muted">...</span>
                ) : stats ? (
                  Math.round(stats.max).toLocaleString('fr-FR')
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.65rem] uppercase tracking-wider text-text-muted font-semibold mb-0.5">Médian</span>
              <span className="text-sm md:text-base font-bold text-text-primary font-mono">
                {statsLoading ? (
                  <span className="animate-pulse text-text-muted">...</span>
                ) : (itemStats && itemStats.median_price != null) ? (
                  Math.round(itemStats.median_price).toLocaleString('fr-FR')
                ) : (
                  '—'
                )}
              </span>
            </div>
          </div>
          <div className="flex gap-4 bg-bg-primary/40 p-3 rounded-xl border border-border-subtle">
            <div className="flex flex-col">
              <span className="text-[0.65rem] uppercase tracking-wider text-text-muted font-semibold mb-0.5">Évolution</span>
              {loading ? (
                <span className="text-sm md:text-base font-bold font-mono animate-pulse text-text-muted">...</span>
              ) : stats ? (
                <span
                  className={`
                    text-sm md:text-base font-bold font-mono
                    ${stats.pctChange > 0
                      ? 'text-accent-danger'
                      : stats.pctChange < 0
                      ? 'text-accent-success'
                      : ''}
                  `}
                >
                  {stats.pctChange >= 0 ? '+' : ''}
                  {stats.pctChange.toFixed(1)}%
                </span>
              ) : (
                <span className="text-sm md:text-base font-bold font-mono">—</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[0.65rem] uppercase tracking-wider text-text-muted font-semibold mb-0.5">Volatilité</span>
              <span className="text-sm md:text-base font-bold font-mono text-accent-warning">
                {statsLoading ? (
                  <span className="animate-pulse text-text-muted">...</span>
                ) : (itemStats && itemStats.volatility != null) ? (
                  itemStats.volatility.toFixed(1) + '%'
                ) : (
                  '—'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading && <p className="text-text-muted text-sm text-center py-4">Chargement de la courbe…</p>}
      {error && <p className="text-accent-danger text-sm text-center py-4">Erreur : {error}</p>}

      {!loading && !error && !hasData && (
        <p className="text-text-muted text-sm text-center py-4">
          Aucune donnée disponible pour cet item sur la période sélectionnée.
        </p>
      )}

      {!loading && !error && hasData && timeseries && (
        <div className="flex-1 min-h-[300px] w-full" ref={chartContainerRef}>
          <ResponsiveContainer width="100%" height={chartHeight} maxHeight={600}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis 
                dataKey="timestamp" 
                type="number"
                domain={['dataMin', 'dataMax']}
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => {
                  try {
                    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                  } catch {
                    return '';
                  }
                }}
              />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ strokeDasharray: '3 3', stroke: 'rgba(148, 163, 184, 0.4)' }}
              />
              <Line
                type="monotone"
                dataKey="avg_price"
                dot={false}
                strokeWidth={2}
                stroke="#3b82f6"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {selectedItem && timeseries && Array.isArray(timeseries) && (
        <EditItemModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          item={selectedItem}
          timeseries={timeseries.filter((p): p is TimeseriesPoint => p !== null)}
          onRefresh={onRefresh}
          onItemUpdate={onItemUpdate}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          actions={[
            ...(onToggleFavorite ? [{
              label: favorites?.has(contextMenu.item.item_name) ? 'Retirer des favoris' : 'Ajouter aux favoris',
              icon: pendingFavorites?.has(contextMenu.item.item_name) ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} className={favorites?.has(contextMenu.item.item_name) ? "fill-accent-warning text-accent-warning" : ""} />,
              onClick: () => onToggleFavorite(contextMenu.item.item_name),
              disabled: pendingFavorites?.has(contextMenu.item.item_name)
            }] : []),
            ...(contextMenu.item.id ? [{
              label: 'Ajouter à une liste...',
              icon: <List size={16} />,
              onClick: () => {
                setListContextMenu({ x: contextMenu.x, y: contextMenu.y, item: contextMenu.item });
                setContextMenu(null);
              },
            }] : []),
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
    </div>
  );
};
