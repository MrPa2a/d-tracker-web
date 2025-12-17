import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, TrendingDown, MoreVertical, Star, Trash2, Copy, Loader2 } from 'lucide-react';
import { fetchListDetails, fetchTimeseries, removeItemFromList, updateItemInList } from '../api';
import type { DateRangePreset, TimeseriesPoint, List } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import kamaIcon from '../assets/kama.png';
import { SmallSparkline } from '../components/Sparkline';
import { useTimeseries } from '../hooks/useTimeseries';
import { ContextMenu } from '../components/ContextMenu';

type ListItem = List['list_items'][0];

interface ListDetailsPageProps {
  dateRange: DateRangePreset;
  favorites: Set<string>;
  pendingFavorites?: Set<string>;
  onToggleFavorite: (key: string) => void;
  onlyFavorites: boolean;
}

const ListDetailsTableRow: React.FC<{
  item: ListItem;
  favorites: Set<string>;
  pendingFavorites?: Set<string>;
  onToggleFavorite: (key: string) => void;
  dateRange: DateRangePreset;
  onContextMenu: (e: React.MouseEvent, item: ListItem) => void;
  onUpdateQuantity: (itemId: number, quantity: number) => void;
}> = ({ item, favorites, pendingFavorites, onToggleFavorite, dateRange, onContextMenu, onUpdateQuantity }) => {
  const { data: ts } = useTimeseries(item.item_name, item.server || 'Hell Mina', dateRange);
  const [localQuantity, setLocalQuantity] = useState(item.quantity || 1);
  const [prevQuantity, setPrevQuantity] = useState(item.quantity || 1);

  if ((item.quantity || 1) !== prevQuantity) {
    setPrevQuantity(item.quantity || 1);
    setLocalQuantity(item.quantity || 1);
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      setLocalQuantity(val);
      onUpdateQuantity(item.item_id, val);
    }
  };

  const stats = useMemo(() => {
    // Evolution based on item data (consistent with KPIs)
    let evolution = null;
    if (item.previous_price && item.last_price) {
      evolution = ((item.last_price - item.previous_price) / item.previous_price) * 100;
    }

    // Avg and Date based on timeseries data (consistent with Sparkline)
    if (!ts || ts.length === 0) return { avg: null, lastDate: null, evolution };
    
    const prices = ts.map(p => p.avg_price);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const lastDate = ts[ts.length - 1].date;
    
    return { avg, lastDate, evolution };
  }, [ts, item.last_price, item.previous_price]);

  const isPending = pendingFavorites?.has(item.item_name);

  return (
    <tr 
      className="hover:bg-white/5 transition-colors cursor-pointer group border-b border-white/5 last:border-0"
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
      <td className="px-4 py-3 w-32">
        <input 
            type="number" 
            min="1"
            value={localQuantity}
            onChange={handleQuantityChange}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-center text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            onClick={(e) => e.stopPropagation()}
        />
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
            className="text-gray-200 hover:text-blue-400 no-underline"
          >
            {item.item_name}
          </Link>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-400">{item.category || '-'}</td>
      
      {/* Sparkline */}
      <td className="px-4 py-3 w-32 h-12">
        <div className="h-10 w-full">
           <SmallSparkline data={ts || null} />
        </div>
      </td>

      {/* Evolution */}
      <td className="px-4 py-3 text-right">
        {stats.evolution !== null ? (
          <span className={`font-medium ${stats.evolution > 0 ? 'text-rose-400' : stats.evolution < 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
            {stats.evolution > 0 ? '+' : ''}{stats.evolution.toFixed(2)}%
          </span>
        ) : (
          <span className="text-gray-600">-</span>
        )}
      </td>

      <td className="px-4 py-3 text-right font-medium text-gray-200">
        <div className="flex items-center justify-end gap-1">
          {(item.last_price || 0).toLocaleString('fr-FR')}
          <img src={kamaIcon} alt="kamas" className="w-3 h-3 opacity-70" />
        </div>
      </td>
      <td className="px-4 py-3 text-right text-gray-400">
        <div className="flex items-center justify-end gap-1">
          {stats.avg ? Math.round(stats.avg).toLocaleString('fr-FR') : '-'}
          <img src={kamaIcon} alt="kamas" className="w-3 h-3 opacity-50" />
        </div>
      </td>
      <td className="px-4 py-3 text-right text-xs text-gray-500">
        {stats.lastDate ? new Date(stats.lastDate).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-'}
      </td>
    </tr>
  );
};

const ListDetailsCard: React.FC<{
  item: ListItem;
  favorites: Set<string>;
  pendingFavorites?: Set<string>;
  onToggleFavorite: (key: string) => void;
  dateRange: DateRangePreset;
  onContextMenu: (e: React.MouseEvent, item: ListItem) => void;
  onUpdateQuantity: (itemId: number, quantity: number) => void;
}> = ({ item, favorites, pendingFavorites, onToggleFavorite, dateRange, onContextMenu, onUpdateQuantity }) => {
  const { data: ts } = useTimeseries(item.item_name, item.server || 'Hell Mina', dateRange);
  const [localQuantity, setLocalQuantity] = useState(item.quantity || 1);
  const [prevQuantity, setPrevQuantity] = useState(item.quantity || 1);

  if ((item.quantity || 1) !== prevQuantity) {
    setPrevQuantity(item.quantity || 1);
    setLocalQuantity(item.quantity || 1);
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      setLocalQuantity(val);
      onUpdateQuantity(item.item_id, val);
    }
  };

  const stats = useMemo(() => {
    let evolution = null;
    if (item.previous_price && item.last_price) {
      evolution = ((item.last_price - item.previous_price) / item.previous_price) * 100;
    }

    if (!ts || ts.length === 0) return { avg: null, lastDate: null, evolution };
    
    const prices = ts.map(p => p.avg_price);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const lastDate = ts[ts.length - 1].date;
    
    return { avg, lastDate, evolution };
  }, [ts, item.last_price, item.previous_price]);

  const isPending = pendingFavorites?.has(item.item_name);

  return (
    <div className="bg-[#1a1b1e] rounded-xl border border-white/5 p-4 relative">
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {item.item_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <Link 
                        to={`/item/${item.server}/${encodeURIComponent(item.item_name)}`}
                        className="text-gray-200 font-medium hover:text-blue-400 block line-clamp-2"
                        title={item.item_name}
                    >
                        {item.item_name}
                    </Link>
                    <span className="text-xs text-gray-500 truncate block">{item.category || '-'}</span>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isPending) onToggleFavorite(item.item_name);
                    }}
                    disabled={isPending}
                    className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
                        favorites.has(item.item_name) ? 'text-yellow-400' : 'text-gray-600'
                    }`}
                >
                    {isPending ? (
                        <Loader2 size={18} className="animate-spin text-accent-primary" />
                    ) : (
                        <Star size={18} fill={favorites.has(item.item_name) ? "currentColor" : "none"} />
                    )}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onContextMenu(e, item);
                    }}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-gray-200"
                >
                    <MoreVertical size={18} />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label className="text-xs text-gray-500 block mb-1">Quantité</label>
                <input 
                    type="number" 
                    min="1"
                    value={localQuantity}
                    onChange={handleQuantityChange}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
            </div>
            <div>
                 <label className="text-xs text-gray-500 block mb-1">Prix Actuel</label>
                 <div className="flex items-center gap-1 text-gray-200 font-medium h-[38px]">
                    {(item.last_price || 0).toLocaleString('fr-FR')}
                    <img src={kamaIcon} alt="kamas" className="w-3 h-3 opacity-70" />
                 </div>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
             <div>
                <span className="text-xs text-gray-500 block">Evolution</span>
                {stats.evolution !== null ? (
                  <span className={`font-medium ${stats.evolution > 0 ? 'text-rose-400' : stats.evolution < 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {stats.evolution > 0 ? '+' : ''}{stats.evolution.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-gray-600">-</span>
                )}
             </div>
             <div>
                <span className="text-xs text-gray-500 block">Moyenne</span>
                <div className="flex items-center gap-1 text-gray-400">
                  {stats.avg ? Math.round(stats.avg).toLocaleString('fr-FR') : '-'}
                  <img src={kamaIcon} alt="kamas" className="w-3 h-3 opacity-50" />
                </div>
             </div>
             <div className="text-right">
                <span className="text-xs text-gray-500 block">MAJ</span>
                <span className="text-xs text-gray-500">
                    {stats.lastDate ? new Date(stats.lastDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit'
                    }) : '-'}
                </span>
             </div>
        </div>

        <div className="h-12 w-full bg-white/5 rounded-lg p-2">
           <SmallSparkline data={ts || null} />
        </div>
    </div>
  );
};

const ListDetailsPage: React.FC<ListDetailsPageProps> = ({ dateRange, favorites, pendingFavorites, onToggleFavorite, onlyFavorites }) => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: ListItem } | null>(null);

  // Ref and state for dynamic chart height
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(300);

  // 1. Fetch List Details
  const { data: list, isLoading, error, refetch } = useQuery({
    queryKey: ['list', listId, dateRange],
    queryFn: () => fetchListDetails(listId!, dateRange),
    enabled: !!listId,
  });

  // 2. Fetch Timeseries for all items to build the portfolio chart
  const { data: rawPortfolioData, isLoading: historyLoading } = useQuery({
    queryKey: ['list-history-raw', listId, dateRange, list?.list_items],
    queryFn: async () => {
      if (!list?.list_items || list.list_items.length === 0) return [];
      
      // Fetch timeseries for all items in parallel
      const promises = list.list_items.map(item => 
        fetchTimeseries(item.item_name, item.server || 'Hell Mina', dateRange)
          .then(ts => ({ itemId: item.item_id, ts, quantity: item.quantity || 1, itemName: item.item_name }))
          .catch(() => ({ itemId: item.item_id, ts: [] as TimeseriesPoint[], quantity: item.quantity || 1, itemName: item.item_name }))
      );
      
      return await Promise.all(promises);
    },
    enabled: !!list && list.list_items.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const portfolioHistory = useMemo(() => {
    if (!rawPortfolioData || rawPortfolioData.length === 0) return [];

    const filteredResults = rawPortfolioData.filter(r => !onlyFavorites || favorites.has(r.itemName));
    
    if (filteredResults.length === 0) return [];

    // Aggregate
    const allDates = new Set<string>();
    const itemPrices = new Map<number, Map<string, number>>(); // itemId -> date -> price
    
    filteredResults.forEach(({ itemId, ts }) => {
      const prices = new Map<string, number>();
      ts.forEach(p => {
        allDates.add(p.date);
        prices.set(p.date, p.avg_price);
      });
      itemPrices.set(itemId, prices);
    });
    
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    // We need to keep track of the last known price for each item to fill gaps (forward fill)
    const lastKnownPrices = new Map<number, number>();
    
    // First pass: calculate totals and completeness
    const aggregated = sortedDates.map(date => {
      let total = 0;
      filteredResults.forEach(({ itemId, quantity }) => {
        const prices = itemPrices.get(itemId);
        if (prices && prices.has(date)) {
          lastKnownPrices.set(itemId, prices.get(date)!);
        }
        total += (lastKnownPrices.get(itemId) || 0) * quantity;
      });
      
      return { 
        date, 
        value: total, 
        isComplete: lastKnownPrices.size === filteredResults.length 
      };
    });

    // Find the first index where data is complete
    const firstCompleteIndex = aggregated.findIndex(p => p.isComplete);

    // Second pass: split into complete/incomplete series
    return aggregated.map((point, index) => {
       const { date, value } = point;
       
       // Incomplete series: exists until the data becomes complete (inclusive of the transition point)
       // If never complete, it's always incomplete.
       const showIncomplete = firstCompleteIndex === -1 || index <= firstCompleteIndex;
       
       // Complete series: exists from the point data becomes complete
       const showComplete = firstCompleteIndex !== -1 && index >= firstCompleteIndex;
       
       return {
         date,
         value, // For tooltip
         valueIncomplete: showIncomplete ? value : null,
         valueComplete: showComplete ? value : null
       };
    });
  }, [rawPortfolioData, onlyFavorites, favorites]);

  useEffect(() => {
    const updateChartHeight = () => {
      if (chartContainerRef.current) {
        const height = chartContainerRef.current.offsetHeight;
        if (height > 0) {
            setChartHeight(height);
        }
      }
    };

    // Immediate update
    updateChartHeight();
    
    // Update after a short delay to ensure DOM is fully rendered
    const timer1 = setTimeout(updateChartHeight, 50);
    const timer2 = setTimeout(updateChartHeight, 200);
    
    // Listen for resize
    window.addEventListener('resize', updateChartHeight);

    return () => {
      window.removeEventListener('resize', updateChartHeight);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [portfolioHistory]); // Trigger when data changes too

  // Calculations for KPIs
  const kpis = useMemo(() => {
    if (!list?.list_items) return null;
    
    let totalValue = 0;
    let totalPrevValue = 0;
    let topGainer = { name: '', pct: -Infinity };
    let topLoser = { name: '', pct: Infinity };
    
    const filteredItems = list.list_items.filter(item => !onlyFavorites || favorites.has(item.item_name));

    filteredItems.forEach(item => {
      const qty = item.quantity || 1;
      const price = (item.last_price || 0) * qty;
      const prevUnit = item.previous_price || item.last_price || 0;
      const prev = prevUnit * qty; // fallback to price if no prev
      
      totalValue += price;
      totalPrevValue += prev;
      
      if (prevUnit > 0) {
        const currentPrice = item.last_price || 0;
        const pct = ((currentPrice - prevUnit) / prevUnit) * 100;
        if (pct > topGainer.pct) topGainer = { name: item.item_name, pct };
        if (pct < topLoser.pct) topLoser = { name: item.item_name, pct };
      }
    });
    
    const totalChange = totalPrevValue > 0 ? ((totalValue - totalPrevValue) / totalPrevValue) * 100 : 0;
    const totalChangeValue = totalValue - totalPrevValue;
    
    return {
      totalValue,
      totalChange,
      totalChangeValue,
      topGainer: topGainer.pct !== -Infinity ? topGainer : null,
      topLoser: topLoser.pct !== Infinity ? topLoser : null,
    };
  }, [list, onlyFavorites, favorites]);

  const handleRemoveItem = async (itemId: number) => {
    if (!listId) return;
    try {
      await removeItemFromList(listId, itemId);
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateQuantity = async (itemId: number, quantity: number) => {
    if (!listId) return;
    try {
      await updateItemInList(listId, itemId, quantity);
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: ListItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400">Chargement de la liste...</div>;
  if (error) return <div className="p-8 text-center text-red-400">Erreur: {(error as Error).message}</div>;
  if (!list) return <div className="p-8 text-center text-gray-400">Liste introuvable</div>;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#141517] text-slate-200 p-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{list.name}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{list.list_items.length} items</span>
              <span>•</span>
              <span>Créée le {new Date(list.created_at).toLocaleDateString()}</span>
              {list.scope === 'private' && <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300">Privée</span>}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#1a1b1e] p-4 rounded-xl border border-white/5">
            <div className="text-gray-500 text-sm mb-1">Valeur Totale</div>
            <div className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              {kpis.totalValue.toLocaleString()} 
              <img src={kamaIcon} alt="K" className="w-5 h-5 opacity-80" />
            </div>
          </div>
          
          <div className="bg-[#1a1b1e] p-4 rounded-xl border border-white/5">
            <div className="text-gray-500 text-sm mb-1">Variation cumulée ({dateRange})</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${kpis.totalChange >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {kpis.totalChange >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {Math.abs(kpis.totalChange).toFixed(2)}%
            </div>
            <div className={`text-sm ${kpis.totalChangeValue >= 0 ? 'text-rose-400/70' : 'text-emerald-400/70'}`}>
              {kpis.totalChangeValue > 0 ? '+' : ''}{kpis.totalChangeValue.toLocaleString()} K
            </div>
          </div>

          <div className="bg-[#1a1b1e] p-4 rounded-xl border border-white/5">
            <div className="text-gray-500 text-sm mb-1">Top Gainer</div>
            {kpis.topGainer ? (
              <>
                <div className="text-lg font-medium text-gray-100 truncate">{kpis.topGainer.name}</div>
                <div className="text-rose-400 font-bold">+{kpis.topGainer.pct.toFixed(2)}%</div>
              </>
            ) : (
              <div className="text-gray-500">-</div>
            )}
          </div>

          <div className="bg-[#1a1b1e] p-4 rounded-xl border border-white/5">
            <div className="text-gray-500 text-sm mb-1">Top Loser</div>
            {kpis.topLoser ? (
              <>
                <div className="text-lg font-medium text-gray-100 truncate">{kpis.topLoser.name}</div>
                <div className="text-emerald-400 font-bold">{kpis.topLoser.pct.toFixed(2)}%</div>
              </>
            ) : (
              <div className="text-gray-500">-</div>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-[#1a1b1e] p-4 md:p-6 rounded-xl border border-white/5 h-[250px] md:h-[400px] lg:h-[600px] flex flex-col [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_*]:focus:outline-none outline-none">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Évolution du Portefeuille</h3>
        {historyLoading ? (
          <div className="h-full flex items-center justify-center text-gray-500">Chargement du graphique...</div>
        ) : portfolioHistory && portfolioHistory.length > 0 ? (
          <div className="flex-1 min-h-0 w-full" ref={chartContainerRef}>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={portfolioHistory} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  minTickGap={30}
                  tick={{ fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  width={40}
                  stroke="#94a3b8" 
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return val;
                  }}
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length && label) {
                      return (
                        <div className="bg-[#1a1b1e] border border-[#334155] p-3 rounded shadow-lg">
                          <p className="text-gray-200 text-sm mb-1">
                            {new Date(label).toLocaleDateString() + ' ' + new Date(label).toLocaleTimeString()}
                          </p>
                          <p className="text-[#3b82f6] text-sm font-medium">
                            Valeur Totale : {payload[0].value?.toLocaleString()} K
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="valueIncomplete" 
                  stroke="#3b82f6" 
                  strokeDasharray="5 5"
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  strokeWidth={2}
                  connectNulls={true}
                  name="valueIncomplete"
                />
                <Area 
                  type="monotone" 
                  dataKey="valueComplete" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  strokeWidth={2}
                  connectNulls={true}
                  name="valueComplete"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">Pas de données historiques suffisantes</div>
        )}
      </div>

      {/* Items List */}
      <div className="flex-shrink-0">
        {/* Mobile Header */}
        <h3 className="md:hidden text-lg font-semibold text-gray-100 mb-4 px-1">Détail des Items</h3>
        
        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
             {list.list_items
                .filter(item => !onlyFavorites || favorites.has(item.item_name))
                .map((item) => (
                <ListDetailsCard 
                  key={item.item_id} 
                  item={item} 
                  favorites={favorites}
                  pendingFavorites={pendingFavorites}
                  onToggleFavorite={onToggleFavorite}
                  dateRange={dateRange}
                  onContextMenu={handleContextMenu}
                  onUpdateQuantity={handleUpdateQuantity}
                />
             ))}
        </div>

        {/* Desktop Table Container */}
        <div className="hidden md:block bg-[#1a1b1e] rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
                <h3 className="text-lg font-semibold text-gray-100">Détail des Items</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 text-sm border-b border-white/5">
                <th className="p-4 font-medium w-16"></th>
                <th className="p-4 font-medium w-32">Qté</th>
                <th className="p-4 font-medium">Nom</th>
                <th className="p-4 font-medium">Catégorie</th>
                <th className="p-4 font-medium">Tendances</th>
                <th className="p-4 font-medium text-right">Evolution</th>
                <th className="p-4 font-medium text-right">Prix Actuel</th>
                <th className="p-4 font-medium text-right">Prix Moyen ({dateRange})</th>
                <th className="p-4 font-medium text-right">Dernière MAJ</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {list.list_items
                .filter(item => !onlyFavorites || favorites.has(item.item_name))
                .map((item) => (
                <ListDetailsTableRow 
                  key={item.item_id} 
                  item={item} 
                  favorites={favorites}
                  pendingFavorites={pendingFavorites}
                  onToggleFavorite={onToggleFavorite}
                  dateRange={dateRange}
                  onContextMenu={handleContextMenu}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          actions={[
            {
              label: 'Copier le nom',
              icon: <Copy size={16} />,
              onClick: () => {
                navigator.clipboard.writeText(contextMenu.item.item_name);
                setContextMenu(null);
              }
            },
            {
              label: 'Retirer de la liste',
              icon: <Trash2 size={16} className="text-rose-400" />,
              onClick: () => {
                handleRemoveItem(contextMenu.item.item_id);
                setContextMenu(null);
              }
            }
          ]}
        />
      )}
    </div>
  );
};

export default ListDetailsPage;
