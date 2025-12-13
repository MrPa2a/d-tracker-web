import React, { useState, useEffect } from 'react';
import { fetchScannerResults, fetchCategories } from '../api';
import type { ScannerResult, Category, DateRangePreset } from '../types';
import { Search, Filter, AlertTriangle, Clock, Activity, Loader2, X, ChevronUp } from 'lucide-react';
import kamaIcon from '../assets/kama.png';
import { Link } from 'react-router-dom';

interface AnalysisPageProps {
  server: string | null;
  dateRange: DateRangePreset;
  minPrice: string;
  maxPrice: string;
  onlyFavorites: boolean;
  favorites: Set<string>;
}

interface ScannerFiltersProps {
  minProfit: string;
  setMinProfit: (val: string) => void;
  minMargin: string;
  setMinMargin: (val: string) => void;
  freshness: string;
  setFreshness: (val: string) => void;
  maxVolatility: string;
  setMaxVolatility: (val: string) => void;
  categories: Category[];
  selectedCategories: string[];
  toggleCategory: (cat: string) => void;
  handleSearch: () => void;
  loading: boolean;
  handleNumberChange: (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ScannerFilters: React.FC<ScannerFiltersProps> = ({
  minProfit, setMinProfit,
  minMargin, setMinMargin,
  freshness, setFreshness,
  maxVolatility, setMaxVolatility,
  categories, selectedCategories, toggleCategory,
  handleSearch, loading, handleNumberChange
}) => (
  <div className="space-y-4">
    {/* Profit Min */}
    <div>
      <label className="block text-sm text-gray-400 mb-1">Profit Minimum</label>
      <div className="relative">
        <input 
          type="text" 
          value={minProfit}
          onChange={handleNumberChange(setMinProfit)}
          className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-accent-primary focus:outline-none pl-8"
          placeholder="Ex: 5 000"
        />
        <img src={kamaIcon} className="w-4 h-4 absolute left-2.5 top-3 opacity-50" />
      </div>
    </div>

    {/* Marge Min */}
    <div>
      <label className="block text-sm text-gray-400 mb-1">Marge Minimum (%)</label>
      <div className="relative">
        <input 
          type="number" 
          value={minMargin}
          onChange={(e) => setMinMargin(e.target.value)}
          className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-accent-primary focus:outline-none pl-8"
          placeholder="Ex: 15"
        />
        <span className="absolute left-3 top-2.5 text-gray-500">%</span>
      </div>
    </div>

    {/* Freshness */}
    <div>
      <label className="block text-sm text-gray-400 mb-1">Ancienneté Max (Heures)</label>
      <div className="relative">
        <input 
          type="number" 
          value={freshness}
          onChange={(e) => setFreshness(e.target.value)}
          className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-accent-primary focus:outline-none pl-8"
          placeholder="Ex: 24"
        />
        <Clock className="w-4 h-4 absolute left-2.5 top-3 text-gray-500" />
      </div>
      <p className="text-xs text-gray-500 mt-1">Exclure les prix relevés il y a plus de X heures</p>
    </div>

    {/* Stability */}
    <div>
      <label className="block text-sm text-gray-400 mb-1">Volatilité Max (%)</label>
      <div className="relative">
        <input 
          type="number" 
          value={maxVolatility}
          onChange={(e) => setMaxVolatility(e.target.value)}
          className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-accent-primary focus:outline-none pl-8"
          placeholder="Ex: 10"
        />
        <Activity className="w-4 h-4 absolute left-2.5 top-3 text-gray-500" />
      </div>
      <p className="text-xs text-gray-500 mt-1">Plus bas = Plus stable (Moins risqué)</p>
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
      Scanner le marché
    </button>
  </div>
);

const AnalysisPage: React.FC<AnalysisPageProps> = ({ 
  server: propServer,
  dateRange,
  minPrice: propMinPrice,
  maxPrice: propMaxPrice,
  onlyFavorites,
  favorites
}) => {
  // Filters State
  const [server, setServer] = useState<string>(propServer || 'Hell Mina'); 
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  
  useEffect(() => {
    if (propServer) {
      setServer(propServer);
    }
  }, [propServer]);

  // Use props for price if available, otherwise local state (though we removed local state for price to use header)
  // Actually, we should use the props directly in the search.
  
  const [minProfit, setMinProfit] = useState<string>('500 000');
  const [minMargin, setMinMargin] = useState<string>('15');
  const [freshness, setFreshness] = useState<string>('24');
  const [maxVolatility, setMaxVolatility] = useState<string>('10'); // Stable by default
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Data State
  const [results, setResults] = useState<ScannerResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScannerResults({
        server,
        min_price: propMinPrice ? parseFloat(propMinPrice.replace(/\s/g, '')) : undefined,
        max_price: propMaxPrice ? parseFloat(propMaxPrice.replace(/\s/g, '')) : undefined,
        min_profit: minProfit ? parseFloat(minProfit.replace(/\s/g, '')) : undefined,
        min_margin: minMargin ? parseFloat(minMargin) : undefined,
        freshness: freshness ? parseInt(freshness) : undefined,
        max_volatility: maxVolatility ? parseFloat(maxVolatility) : undefined,
        categories: selectedCategories,
        limit: 50,
        period: getDaysFromRange(dateRange),
        filter_items: onlyFavorites ? Array.from(favorites) : undefined
      });
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // Trigger search when filters change
  useEffect(() => {
    handleSearch();
  }, [server, dateRange, propMinPrice, propMaxPrice, onlyFavorites, favorites]); // Add other dependencies if we want auto-search on sidebar change too

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
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Analyse de Marché</h1>
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
        <div className="hidden lg:block w-80 flex-shrink-0 space-y-6">
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
                    <div>
                      <h3 className="font-medium text-white group-hover:text-accent-primary transition-colors">{item.item_name}</h3>
                      <span className="text-xs text-gray-500">{item.category}</span>
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
