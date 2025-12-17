import React, { useState, useEffect, useMemo } from 'react';
import { fetchCategories } from '../api';
import { useScanner } from '../hooks/useAnalysis';
import type { Category, DateRangePreset, ScannerFilters as ScannerFiltersType } from '../types';
import { Search, Filter, AlertTriangle, Clock, X, ScanLine } from 'lucide-react';
import kamaIcon from '../assets/kama.png';
import { ScannerFilters } from '../components/ScannerFilters';
import { Link, useSearchParams } from 'react-router-dom';

interface AnalysisPageProps {
  server: string | null;
  dateRange: DateRangePreset;
  minPrice: string;
  maxPrice: string;
  onlyFavorites: boolean;
  favorites: Set<string>;
}

const AnalysisPage: React.FC<AnalysisPageProps> = ({ 
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
  const appliedMinProfit = searchParams.get('minProfit') || '500 000';
  const appliedMinMargin = searchParams.get('minMargin') || '15';
  const appliedFreshness = searchParams.get('freshness') || '24';
  const appliedMaxVolatility = searchParams.get('maxVolatility') || '10';
  const appliedCategories = useMemo(() => searchParams.get('categories')?.split(',').filter(Boolean) || [], [searchParams]);

  // UI State (Local state for inputs before applying)
  // Initialize with URL values, but don't sync back automatically to avoid loops/renders
  // We only update these when the user types, or when the URL changes drastically (handled by key prop or manual reset if needed)
  // Actually, the best pattern for "draft" state vs "applied" state is:
  // 1. Init state from props/URL
  // 2. Update state on input change
  // 3. On "Search", push state to URL
  // 4. If URL changes externally (back button), we need to update state.
  // The issue was calling setState in useEffect. We can use a key on the component to force re-render, or just accept that
  // we need to update state when URL changes.
  
  // To fix "setState in useEffect", we can just use the URL as the source of truth for the initial value
  // and only update local state if the URL *really* changes (e.g. navigation).
  // But React warns about this pattern.
  // A better way: use `key` on the inputs or the form to reset them when URL changes?
  // Or simply:
  
  const [minProfit, setMinProfit] = useState<string>(appliedMinProfit);
  const [minMargin, setMinMargin] = useState<string>(appliedMinMargin);
  const [freshness, setFreshness] = useState<string>(appliedFreshness);
  const [maxVolatility, setMaxVolatility] = useState<string>(appliedMaxVolatility);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(appliedCategories);

  // Update local state when URL params change (e.g. back button)
  // We wrap this in a check to avoid unnecessary updates if values are same
  useEffect(() => {
    if (minProfit !== appliedMinProfit) setMinProfit(appliedMinProfit);
    if (minMargin !== appliedMinMargin) setMinMargin(appliedMinMargin);
    if (freshness !== appliedFreshness) setFreshness(appliedFreshness);
    if (maxVolatility !== appliedMaxVolatility) setMaxVolatility(appliedMaxVolatility);
    // Array comparison is tricky, but for this simple case:
    if (JSON.stringify(selectedCategories) !== JSON.stringify(appliedCategories)) {
        setSelectedCategories(appliedCategories);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedMinProfit, appliedMinMargin, appliedFreshness, appliedMaxVolatility, appliedCategories]);
  
  // Data State
  const [categories, setCategories] = useState<Category[]>([]);

  // Load categories on mount
  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  const formatNumber = (num: string) => {
    return num.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleNumberChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatNumber(e.target.value));
  };

  const getDaysFromRange = (range: DateRangePreset): number => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '365d': return 365;
      default: return 7;
    }
  };

  const filters = useMemo((): ScannerFiltersType => ({
    server: propServer || 'Hell Mina',
    min_price: propMinPrice ? parseFloat(propMinPrice.replace(/\s/g, '')) : undefined,
    max_price: propMaxPrice ? parseFloat(propMaxPrice.replace(/\s/g, '')) : undefined,
    min_profit: appliedMinProfit ? parseFloat(appliedMinProfit.replace(/\s/g, '')) : undefined,
    min_margin: appliedMinMargin ? parseFloat(appliedMinMargin) : undefined,
    freshness: appliedFreshness ? parseInt(appliedFreshness) : undefined,
    max_volatility: appliedMaxVolatility ? parseFloat(appliedMaxVolatility) : undefined,
    categories: appliedCategories,
    limit: 50,
    period: getDaysFromRange(dateRange),
    filter_items: onlyFavorites ? Array.from(favorites) : undefined
  }), [propServer, propMinPrice, propMaxPrice, appliedMinProfit, appliedMinMargin, appliedFreshness, appliedMaxVolatility, appliedCategories, dateRange, onlyFavorites, favorites]);

  const { data: results = [], isLoading: loading, error: queryError } = useScanner(filters);
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Une erreur est survenue' : null;

  const handleSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    
    if (minProfit) newParams.set('minProfit', minProfit); else newParams.delete('minProfit');
    if (minMargin) newParams.set('minMargin', minMargin); else newParams.delete('minMargin');
    if (freshness) newParams.set('freshness', freshness); else newParams.delete('freshness');
    if (maxVolatility) newParams.set('maxVolatility', maxVolatility); else newParams.delete('maxVolatility');
    
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
    minProfit, setMinProfit,
    minMargin, setMinMargin,
    freshness, setFreshness,
    maxVolatility, setMaxVolatility,
    categories, selectedCategories, toggleCategory,
    handleSearch: () => {
      handleSearch();
      setIsMobileFiltersOpen(false);
    },
    loading, handleNumberChange
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6">
      <div className="mb-6 md:mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ScanLine className="w-6 h-6 md:w-8 md:h-8 text-accent-primary" />
            Analyse de Marché
          </h1>
          <p className="text-sm md:text-base text-gray-400">Détectez les opportunités d'achat-revente et analysez les tendances.</p>
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
              <h2>Filtres Scanner</h2>
            </div>
            <button 
              onClick={() => setIsMobileFiltersOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          
          <ScannerFilters {...filterProps} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop Sidebar Filters */}
        <div className="hidden lg:block w-80 shrink-0 space-y-6">
          <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-5 sticky top-6">
            <div className="flex items-center gap-2 mb-4 text-accent-primary font-medium">
              <Filter size={20} />
              <h2>Filtres Scanner</h2>
            </div>
            <ScannerFilters {...filterProps} />
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

                  <div className="grid grid-cols-2 gap-4 my-2">
                    <div className="space-y-2">
                      <div className="h-3 bg-white/10 rounded w-1/2"></div>
                      <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-white/10 rounded w-1/2"></div>
                      <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    </div>
                  </div>

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
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      item.margin >= 15 ? 'bg-accent-primary/20 text-accent-primary' : 
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      +{item.margin}%
                    </div>
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
                      <p className="text-xs text-gray-500 mb-1">Moyenne (7j)</p>
                      <div className="flex items-center gap-1 text-gray-400">
                        {item.avg_price.toLocaleString('fr-FR')}
                        <img src={kamaIcon} className="w-3 h-3 opacity-50" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-1 text-accent-primary font-medium">
                      <span>+{item.profit.toLocaleString('fr-FR')} k</span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(item.last_seen_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="text-center py-20 text-gray-500">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p>Aucune opportunité trouvée avec ces critères.</p>
              <p className="text-sm mt-2">Essayez d'élargir vos filtres.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
