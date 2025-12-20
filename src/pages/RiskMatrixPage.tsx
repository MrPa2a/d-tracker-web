import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchCategories } from '../api';
import { useScanner } from '../hooks/useAnalysis';
import type { Category, DateRangePreset, ScannerFilters as ScannerFiltersType, ScannerResult } from '../types';
import { Filter, AlertTriangle, Info, Loader2, Target } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ScannerFilters } from '../components/ScannerFilters';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ZAxis,
  Cell
} from 'recharts';

interface RiskMatrixPageProps {
  server: string | null;
  dateRange: DateRangePreset;
  minPrice: string;
  maxPrice: string;
  onlyFavorites: boolean;
  favorites: Set<string>;
}

const RiskMatrixPage: React.FC<RiskMatrixPageProps> = ({ 
  server: propServer,
  dateRange,
  minPrice: propMinPrice,
  maxPrice: propMaxPrice,
  onlyFavorites,
  favorites
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filters State
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  
  // Derived State from URL (Source of Truth)
  const appliedMinProfit = searchParams.get('minProfit') || '500 000';
  const appliedMinMargin = searchParams.get('minMargin') || '15';
  const appliedFreshness = searchParams.get('freshness') || '24';
  const appliedMaxVolatility = searchParams.get('maxVolatility') || '10';
  const appliedCategories = useMemo(() => searchParams.get('categories')?.split(',').filter(Boolean) || [], [searchParams]);

  // UI State
  const [minProfit, setMinProfit] = useState<string>(appliedMinProfit);
  const [minMargin, setMinMargin] = useState<string>(appliedMinMargin);
  const [freshness, setFreshness] = useState<string>(appliedFreshness);
  const [maxVolatility, setMaxVolatility] = useState<string>(appliedMaxVolatility);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(appliedCategories);

  // Update local state when URL params change
  useEffect(() => {
    if (minProfit !== appliedMinProfit) setMinProfit(appliedMinProfit);
    if (minMargin !== appliedMinMargin) setMinMargin(appliedMinMargin);
    if (freshness !== appliedFreshness) setFreshness(appliedFreshness);
    if (maxVolatility !== appliedMaxVolatility) setMaxVolatility(appliedMaxVolatility);
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
    limit: 200, // Higher limit for the matrix to show more points
    period: getDaysFromRange(dateRange),
    filter_items: onlyFavorites ? Array.from(favorites) : undefined
  }), [propServer, propMinPrice, propMaxPrice, appliedMinProfit, appliedMinMargin, appliedFreshness, appliedMaxVolatility, appliedCategories, dateRange, onlyFavorites, favorites]);

  // Chart sizing logic
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(550);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current) {
        const height = chartContainerRef.current.offsetHeight;
        // Subtract padding (p-6 = 24px * 2 = 48px)
        const calculatedHeight = Math.max(height - 48, 300);
        setChartHeight(calculatedHeight);
      }
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    
    const timer1 = setTimeout(handleResize, 50);
    const timer2 = setTimeout(handleResize, 200);
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const { data: results, isLoading: loading, error } = useScanner(filters);

  const handleSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    if (minProfit) newParams.set('minProfit', minProfit); else newParams.delete('minProfit');
    if (minMargin) newParams.set('minMargin', minMargin); else newParams.delete('minMargin');
    if (freshness) newParams.set('freshness', freshness); else newParams.delete('freshness');
    if (maxVolatility) newParams.set('maxVolatility', maxVolatility); else newParams.delete('maxVolatility');
    if (selectedCategories.length > 0) newParams.set('categories', selectedCategories.join(',')); else newParams.delete('categories');
    
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

  const formatNumber = (num: string) => {
    return num.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleNumberChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatNumber(e.target.value));
  };

  const filterProps = {
    minProfit, setMinProfit,
    minMargin, setMinMargin,
    freshness, setFreshness,
    maxVolatility, setMaxVolatility,
    categories, selectedCategories, toggleCategory,
    handleSearch,
    loading, handleNumberChange
  };

  // Custom Tooltip
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ScannerResult;
      return (
        <div className="bg-[#1A1B1E] border border-white/10 p-3 rounded-lg shadow-xl z-50">
          <div className="flex items-center gap-2 mb-2">
            <img 
              src={data.icon_url} 
              alt="" 
              className="w-8 h-8 rounded bg-[#25262b] object-contain" 
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div>
              <p className="font-bold text-white">{data.item_name}</p>
              <p className="text-xs text-gray-400">{data.category}</p>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Profit:</span>
              <span className="text-green-400 font-medium">+{data.profit.toLocaleString()} k</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Marge:</span>
              <span className="text-green-400 font-medium">{data.margin}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Volatilité:</span>
              <span className="text-yellow-400 font-medium">{data.volatility}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Prix Actuel:</span>
              <span className="text-white">{data.current_price.toLocaleString()} k</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6">
      <div className="mb-6 md:mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Target className="w-6 h-6 md:w-8 md:h-8 text-accent-primary" />
            Matrice Risque / Rendement
          </h1>
          <p className="text-sm md:text-base text-gray-400">Visualisez les opportunités selon leur potentiel de gain et leur stabilité.</p>
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
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileFiltersOpen(false)}
        />
        <div className={`
          absolute bottom-0 left-0 right-0 bg-[#1A1B1E] rounded-t-2xl p-6 transform transition-transform duration-300
          ${isMobileFiltersOpen ? 'translate-y-0' : 'translate-y-full'}
        `}>
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
          <h2 className="text-lg font-bold text-white mb-4">Filtres</h2>
          <ScannerFilters {...filterProps} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block space-y-6">
          <div className="bg-[#1A1B1E] rounded-xl p-5 border border-white/5 sticky top-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Filter size={20} className="text-accent-primary" />
              Filtres
            </h2>
            <ScannerFilters {...filterProps} />
          </div>
        </div>

        {/* Main Content - Chart */}
        <div className="lg:col-span-3 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400">
              <AlertTriangle size={20} />
              <p>Une erreur est survenue lors du chargement des données.</p>
            </div>
          )}

          <div 
            ref={chartContainerRef}
            className="bg-[#1A1B1E] rounded-xl border border-white/5 p-4 md:p-6 h-[500px] md:h-[600px] relative [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_*]:focus:outline-none outline-none [&_.recharts-scatter-symbol]:cursor-pointer"
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
              </div>
            ) : !results || results.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <Info size={48} className="mb-4 opacity-50" />
                <p>Aucune donnée à afficher avec ces filtres.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: isMobile ? 0 : 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      type="number" 
                      dataKey="volatility" 
                      name="Volatilité" 
                      unit="%" 
                      stroke="#666"
                      label={{ value: 'Volatilité (Risque)', position: 'bottom', offset: 0, fill: '#888', fontSize: isMobile ? 12 : 14 }}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="profit" 
                      name="Profit" 
                      stroke="#666"
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                        return value;
                      }}
                      width={isMobile ? 45 : 60}
                      label={isMobile ? undefined : { value: 'Profit Potentiel', angle: -90, position: 'left', fill: '#888' }}
                      domain={['auto', 'auto']}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                    />
                  <ZAxis type="number" dataKey="margin" range={isMobile ? [30, 150] : [50, 400]} name="Marge" />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  
                  {/* Zones */}
                  {/* Top Left: Low Volatility, High Profit (The Grail) */}
                  <ReferenceArea 
                    x1={0} 
                    x2={5} 
                    y1={appliedMinProfit ? parseFloat(appliedMinProfit.replace(/\s/g, '')) : 100000} 
                    strokeOpacity={0} 
                    fill="#10B981" 
                    fillOpacity={0.05} 
                  />
                  
                  {/* Top Right: High Volatility, High Profit (Speculation) */}
                  <ReferenceArea 
                    x1={5} 
                    y1={appliedMinProfit ? parseFloat(appliedMinProfit.replace(/\s/g, '')) : 100000} 
                    strokeOpacity={0} 
                    fill="#F59E0B" 
                    fillOpacity={0.05} 
                  />

                  {/* Bottom Left: Low Volatility, Low Profit (Safe/Stable) */}
                  <ReferenceArea 
                    x1={0} 
                    x2={5} 
                    y2={appliedMinProfit ? parseFloat(appliedMinProfit.replace(/\s/g, '')) : 100000} 
                    strokeOpacity={0} 
                    fill="#3B82F6" 
                    fillOpacity={0.05} 
                  />

                  {/* Bottom Right: High Volatility, Low Profit (Avoid) */}
                  <ReferenceArea 
                    x1={5} 
                    y2={appliedMinProfit ? parseFloat(appliedMinProfit.replace(/\s/g, '')) : 100000} 
                    strokeOpacity={0} 
                    fill="#6B7280" 
                    fillOpacity={0.05} 
                  />

                  <Scatter 
                    name="Items" 
                    data={results} 
                    fill="#8884d8"
                    onClick={(data) => {
                      const item = data.payload as ScannerResult;
                      navigate(`/item/${item.server}/${encodeURIComponent(item.item_name)}`);
                    }}
                    cursor="pointer"
                  >
                    {results.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.volatility < 5 ? "#10B981" : "#F59E0B"} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1A1B1E] p-4 rounded-lg border border-white/5 border-l-4 border-l-emerald-500">
              <h3 className="font-bold text-white mb-1">Le Graal (Haut-Gauche)</h3>
              <p className="text-sm text-gray-400">Profit élevé et faible volatilité. Les meilleures opportunités d'investissement sûr.</p>
            </div>
            <div className="bg-[#1A1B1E] p-4 rounded-lg border border-white/5 border-l-4 border-l-amber-500">
              <h3 className="font-bold text-white mb-1">Spéculation (Haut-Droite)</h3>
              <p className="text-sm text-gray-400">Gros profits potentiels mais prix instables. Risque de perte plus élevé.</p>
            </div>
            <div className="bg-[#1A1B1E] p-4 rounded-lg border border-white/5 border-l-4 border-l-blue-500">
              <h3 className="font-bold text-white mb-1">Fond de Portefeuille (Bas-Gauche)</h3>
              <p className="text-sm text-gray-400">Profits modestes mais très stables. Idéal pour faire tourner le capital.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMatrixPage;
