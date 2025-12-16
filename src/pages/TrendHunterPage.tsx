import React, { useState, useEffect, useMemo } from 'react';
import { fetchCategories } from '../api';
import { useTrends } from '../hooks/useAnalysis';
import type { Category, DateRangePreset, TrendFilters as TrendFiltersType } from '../types';
import { Search, Filter, AlertTriangle, TrendingUp, TrendingDown, Activity, Loader2, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import kamaIcon from '../assets/kama.png';
import { Link, useSearchParams } from 'react-router-dom';

interface TrendHunterPageProps {
  server: string | null;
  dateRange: DateRangePreset;
  minPrice: string;
  maxPrice: string;
  onlyFavorites: boolean;
  favorites: Set<string>;
}

interface TrendFiltersProps {
  trendType: 'bullish' | 'bearish' | 'rebound';
  setTrendType: (val: 'bullish' | 'bearish' | 'rebound') => void;
  categories: Category[];
  selectedCategories: string[];
  toggleCategory: (cat: string) => void;
  handleSearch: () => void;
  loading: boolean;
}

const TrendFilters: React.FC<TrendFiltersProps> = ({
  trendType, setTrendType,
  categories, selectedCategories, toggleCategory,
  handleSearch, loading
}) => (
  <div className="space-y-6">
    {/* Trend Type */}
    <div>
      <label className="block text-sm text-gray-400 mb-2">Type de Tendance</label>
      <div className="space-y-2">
        <button
          onClick={() => setTrendType('bullish')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
            trendType === 'bullish'
              ? 'bg-green-500/20 border-green-500 text-green-400'
              : 'bg-[#25262b] border-white/10 text-gray-400 hover:border-white/30'
          }`}
        >
          <TrendingUp size={18} />
          <div className="text-left">
            <div className="font-medium">Hausse (Bull Run)</div>
            <div className="text-xs opacity-70">Prix en hausse continue</div>
          </div>
        </button>

        <button
          onClick={() => setTrendType('rebound')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
            trendType === 'rebound'
              ? 'bg-blue-500/20 border-blue-500 text-blue-400'
              : 'bg-[#25262b] border-white/10 text-gray-400 hover:border-white/30'
          }`}
        >
          <Activity size={18} />
          <div className="text-left">
            <div className="font-medium">Rebond</div>
            <div className="text-xs opacity-70">Reprise après une baisse</div>
          </div>
        </button>

        <button
          onClick={() => setTrendType('bearish')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
            trendType === 'bearish'
              ? 'bg-red-500/20 border-red-500 text-red-400'
              : 'bg-[#25262b] border-white/10 text-gray-400 hover:border-white/30'
          }`}
        >
          <TrendingDown size={18} />
          <div className="text-left">
            <div className="font-medium">Baisse (Bear Run)</div>
            <div className="text-xs opacity-70">Prix en chute libre</div>
          </div>
        </button>
      </div>
    </div>

    {/* Categories */}
    <div>
      <label className="block text-sm text-gray-400 mb-2">Catégories</label>
      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.name)}
            className={`px-2 py-1 rounded text-xs border transition-colors ${
              selectedCategories.includes(cat.name)
                ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                : 'bg-[#25262b] border-white/10 text-gray-400 hover:border-white/30'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>

    <button 
      onClick={handleSearch}
      disabled={loading}
      className="w-full bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
      Rechercher les tendances
    </button>
  </div>
);

const TrendHunterPage: React.FC<TrendHunterPageProps> = ({ 
  server: propServer,
  dateRange,
  minPrice: propMinPrice,
  maxPrice: propMaxPrice,
  onlyFavorites,
  favorites
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filters State
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  
  // Derived State from URL (Source of Truth)
  const trendType = (searchParams.get('trend') as 'bullish' | 'bearish' | 'rebound') || 'bullish';
  const appliedCategories = useMemo(() => searchParams.get('categories')?.split(',').filter(Boolean) || [], [searchParams]);
  
  // UI State
  const [selectedCategories, setSelectedCategories] = useState<string[]>(appliedCategories);
  
  // Sync UI with URL (for back/forward navigation)
  useEffect(() => {
    setSelectedCategories(appliedCategories);
  }, [appliedCategories]);

  const setTrendType = (val: 'bullish' | 'bearish' | 'rebound') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('trend', val);
    setSearchParams(newParams);
  };
  
  // Data State
  const [categories, setCategories] = useState<Category[]>([]);

  // Load categories on mount
  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  const getDaysFromRange = (range: DateRangePreset): number => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '365d': return 365;
      default: return 7;
    }
  };

  const filters = useMemo((): TrendFiltersType => ({
    server: propServer || 'Hell Mina',
    min_price: propMinPrice ? parseFloat(propMinPrice.replace(/\s/g, '')) : undefined,
    max_price: propMaxPrice ? parseFloat(propMaxPrice.replace(/\s/g, '')) : undefined,
    trend_type: trendType,
    categories: appliedCategories,
    limit: 50,
    period: getDaysFromRange(dateRange),
    filter_items: onlyFavorites ? Array.from(favorites) : undefined
  }), [propServer, propMinPrice, propMaxPrice, trendType, appliedCategories, dateRange, onlyFavorites, favorites]);

  const { data: results = [], isLoading: loading, error: queryError } = useTrends(filters);
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Une erreur est survenue' : null;

  const handleSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedCategories.length > 0) {
      newParams.set('categories', selectedCategories.join(','));
    } else {
      newParams.delete('categories');
    }
    setSearchParams(newParams);
    setIsMobileFiltersOpen(false);
  };

  const toggleCategory = (catName: string) => {
    setSelectedCategories(prev => 
      prev.includes(catName) 
        ? prev.filter(c => c !== catName)
        : [...prev, catName]
    );
  };

  const filterProps = {
    trendType, setTrendType,
    categories, selectedCategories, toggleCategory,
    handleSearch: () => {
      handleSearch();
      setIsMobileFiltersOpen(false);
    },
    loading
  };

  // Simple Sparkline Component
  const Sparkline = ({ data, color }: { data: { d: string; p: number }[], color: string }) => {
    if (!data || data.length < 2) return null;
    const prices = data.map(d => d.p);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    
    const points = prices.map((p, i) => {
      const x = (i / (prices.length - 1)) * 100;
      const y = 100 - ((p - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox="0 0 100 100" className="w-full h-12 overflow-visible" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  const getTrendColor = (type: string) => {
    switch (type) {
      case 'bullish': return '#4ade80'; // green-400
      case 'bearish': return '#f87171'; // red-400
      case 'rebound': return '#60a5fa'; // blue-400
      default: return '#9ca3af'; // gray-400
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6">
      <div className="mb-6 md:mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Détecteur de Tendance</h1>
          <p className="text-sm md:text-base text-gray-400">Identifiez les mouvements de fond : Bull Run, Bear Run et Rebonds.</p>
        </div>
      </div>

      {/* Mobile Filter Toggle Button */}
      <button
        onClick={() => setIsMobileFiltersOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-30 bg-accent-primary text-white p-4 rounded-full shadow-lg shadow-accent-primary/20 hover:bg-accent-primary/90 transition-colors"
      >
        <Filter size={24} />
      </button>

      {/* Mobile Bottom Sheet Filters */}
      <div className={`
        fixed inset-0 z-40 lg:hidden transition-opacity duration-300
        ${isMobileFiltersOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileFiltersOpen(false)}
        />
        
        {/* Panel */}
        <div className={`
          absolute bottom-0 left-0 right-0 bg-[#1a1b1e] rounded-t-2xl p-6 border-t border-white/10
          transform transition-transform duration-300 max-h-[85vh] overflow-y-auto
          ${isMobileFiltersOpen ? 'translate-y-0' : 'translate-y-full'}
        `}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-accent-primary font-medium">
              <Filter size={20} />
              <h2>Filtres Tendances</h2>
            </div>
            <button 
              onClick={() => setIsMobileFiltersOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          
          <TrendFilters {...filterProps} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop Sidebar Filters */}
        <div className="hidden lg:block w-80 flex-shrink-0 space-y-6">
          <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-5 sticky top-6">
            <div className="flex items-center gap-2 mb-4 text-accent-primary font-medium">
              <Filter size={20} />
              <h2>Filtres Tendances</h2>
            </div>
            <TrendFilters {...filterProps} />
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
              <AlertTriangle size={20} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 h-[180px] animate-pulse flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 w-2/3">
                      <div className="h-5 bg-white/10 rounded w-3/4"></div>
                      <div className="h-3 bg-white/10 rounded w-1/3"></div>
                    </div>
                    <div className="h-6 bg-white/10 rounded w-12"></div>
                  </div>
                  <div className="h-12 bg-white/10 rounded w-full my-4"></div>
                  <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                    <div className="h-5 bg-white/10 rounded w-1/3"></div>
                    <div className="h-4 bg-white/10 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.map((item, idx) => (
                <div key={idx} className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 hover:border-accent-primary/30 transition-all group relative">
                  <Link 
                      to={`/item/${item.server}/${encodeURIComponent(item.item_name)}`}
                      className="absolute inset-0 z-10 rounded-xl"
                  />
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-lg font-bold text-gray-600 shrink-0 overflow-hidden">
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
                            <h3 className="font-medium text-white group-hover:text-accent-primary transition-colors">{item.item_name}</h3>
                            <span className="text-xs text-gray-500">{item.category}</span>
                        </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                      item.trend_type === 'bullish' ? 'bg-green-500/20 text-green-400' :
                      item.trend_type === 'bearish' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {item.trend_type === 'bullish' && <TrendingUp size={12} />}
                      {item.trend_type === 'bearish' && <TrendingDown size={12} />}
                      {item.trend_type === 'rebound' && <Activity size={12} />}
                      {item.consecutive_days}j consécutifs
                    </div>
                  </div>

                  <div className="mb-4">
                    <Sparkline data={item.history} color={getTrendColor(item.trend_type)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Prix Actuel</p>
                      <div className="flex items-center gap-1 text-white font-medium">
                        {item.current_price.toLocaleString('fr-FR')} 
                        <img src={kamaIcon} className="w-3 h-3 opacity-70" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Début ({item.consecutive_days}j)</p>
                      <div className="flex items-center gap-1 text-gray-400">
                        {item.start_price.toLocaleString('fr-FR')}
                        <img src={kamaIcon} className="w-3 h-3 opacity-50" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                    <div className={`flex items-center gap-1 font-medium ${
                      item.price_change_pct > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {item.price_change_pct > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      <span>{item.price_change_pct > 0 ? '+' : ''}{item.price_change_pct}%</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Sur {getDaysFromRange(dateRange)} jours
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="text-center py-20 text-gray-500">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p>Aucune tendance détectée avec ces critères.</p>
              <p className="text-sm mt-2">Essayez de changer de type de tendance ou d'élargir la période.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendHunterPage;
