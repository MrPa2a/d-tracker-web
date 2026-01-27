import React, { useEffect, useState, useMemo } from 'react';
import { Zap, ArrowUpDown, ChevronDown, Crown, Heart, AlertTriangle } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useConsumables } from '../hooks/useToolbox';

type SortField = 'ratio_life' | 'ratio_energy' | 'price' | 'life' | 'energy' | 'score_life' | 'score_energy';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'life' | 'energy' | 'both';

interface ConsumablesPageProps {
  server: string | null;
  minPrice: string;
  maxPrice: string;
  onlyFavorites: boolean;
  favorites: Set<string>;
}

export const ConsumablesPage: React.FC<ConsumablesPageProps> = ({ 
  server,
  minPrice: globalMinPrice,
  maxPrice: globalMaxPrice,
  onlyFavorites,
  favorites
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [sortField, setSortField] = useState<SortField>((searchParams.get('sortField') as SortField) || 'score_life');
  const [sortDirection, setSortDirection] = useState<SortDirection>((searchParams.get('sortDirection') as SortDirection) || 'asc');
  const [optimizePods, setOptimizePods] = useState(searchParams.get('optimizePods') !== 'false');
  const [minLevel, setMinLevel] = useState(Number(searchParams.get('minLevel')) || 0);
  const [maxLevel, setMaxLevel] = useState(searchParams.get('maxLevel') ? Number(searchParams.get('maxLevel')) : 200);
  const [minLife, setMinLife] = useState<number | ''>(searchParams.get('minLife') ? Number(searchParams.get('minLife')) : '');
  const [maxLife, setMaxLife] = useState<number | ''>(searchParams.get('maxLife') ? Number(searchParams.get('maxLife')) : '');
  const [minEnergy, setMinEnergy] = useState<number | ''>(searchParams.get('minEnergy') ? Number(searchParams.get('minEnergy')) : '');
  const [maxEnergy, setMaxEnergy] = useState<number | ''>(searchParams.get('maxEnergy') ? Number(searchParams.get('maxEnergy')) : '');
  const [filterType, setFilterType] = useState<FilterType>((searchParams.get('filterType') as FilterType) || 'all');

  // Sync URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (sortField) params.sortField = sortField;
    if (sortDirection) params.sortDirection = sortDirection;
    params.optimizePods = String(optimizePods);
    if (minLevel !== 0) params.minLevel = String(minLevel);
    if (maxLevel !== 200) params.maxLevel = String(maxLevel);
    if (minLife !== '') params.minLife = String(minLife);
    if (maxLife !== '') params.maxLife = String(maxLife);
    if (minEnergy !== '') params.minEnergy = String(minEnergy);
    if (maxEnergy !== '') params.maxEnergy = String(maxEnergy);
    if (filterType !== 'all') params.filterType = filterType;
    
    setSearchParams(params, { replace: true });
  }, [sortField, sortDirection, optimizePods, minLevel, maxLevel, minLife, maxLife, minEnergy, maxEnergy, filterType, setSearchParams]);

  // Fetch Data using Hook
  const { data, isLoading, error } = useConsumables(server || undefined);
  const items = data?.items || [];
  const oldestObservation = data?.oldestObservation;

  // Check if data is older than 7 days
  const isDataOld = useMemo(() => {
    if (!oldestObservation) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(oldestObservation) < sevenDaysAgo;
  }, [oldestObservation]);

  // Format oldest observation date
  const oldestDateFormatted = useMemo(() => {
    if (!oldestObservation) return null;
    return new Date(oldestObservation).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [oldestObservation]);

  // 1. Calculate Scores for ALL items (No Filtering)
  const scoredItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    return items.map(item => {
      const life = item.stats.life || 0;
      const energy = item.stats.energy || 0;
      
      // Ratio: Kamas per 1 Point (Lower is better)
      const ratioLife = life > 0 ? item.price / life : Infinity;
      const ratioEnergy = energy > 0 ? item.price / energy : Infinity;

      // Weighted Score for Pods Optimization
      // We apply a "Virtual Pod Tax" (e.g. 100 kamas) to penalize low density items.
      // Formula: (Price + Tax) / Effect
      // This means we consider that using 1 slot costs us X kamas of "hassle" or "space value".
      const POD_TAX = 100;

      const podsScore = life > 0 ? (item.price + POD_TAX) / life : Infinity;
      const podsScoreEnergy = energy > 0 ? (item.price + POD_TAX) / energy : Infinity;
      
      // If optimizePods is true, we use podsScore for sorting, otherwise ratioLife
      const scoreLife = optimizePods ? podsScore : ratioLife;
      const scoreEnergy = optimizePods ? podsScoreEnergy : ratioEnergy;

      return {
        ...item,
        ratioLife,
        ratioEnergy,
        scoreLife,
        scoreEnergy,
        podsScore,
        podsScoreEnergy
      };
    });
  }, [items, optimizePods]);

  // 2. Filter for Table
  const processedItems = useMemo(() => {
    return scoredItems.filter(item => {
      // Level Filter
      if (item.level < minLevel || item.level > maxLevel) return false;

      // Stats Filter
      if (minLife !== '' && item.stats.life < minLife) return false;
      if (maxLife !== '' && item.stats.life > maxLife) return false;
      if (minEnergy !== '' && item.stats.energy < minEnergy) return false;
      if (maxEnergy !== '' && item.stats.energy > maxEnergy) return false;

      // Type Filter
      const hasLife = item.stats.life > 0;
      const hasEnergy = item.stats.energy > 0;

      if (filterType === 'life' && !hasLife) return false;
      if (filterType === 'energy' && !hasEnergy) return false;
      if (filterType === 'both' && (!hasLife || !hasEnergy)) return false;

      // Filtres globaux par prix
      if (globalMinPrice) {
        const min = parseFloat(globalMinPrice);
        if (!isNaN(min) && item.price < min) return false;
      }
      if (globalMaxPrice) {
        const max = parseFloat(globalMaxPrice);
        if (!isNaN(max) && item.price > max) return false;
      }

      // Filtre global par favoris
      if (onlyFavorites && !favorites.has(item.name)) return false;

      return true;
    });
  }, [scoredItems, minLevel, maxLevel, filterType, minLife, maxLife, minEnergy, maxEnergy, globalMinPrice, globalMaxPrice, onlyFavorites, favorites]);

  // 3. Calculate Top Cards (from scoredItems)
  const topCards = useMemo(() => {
    if (scoredItems.length === 0) return { life: null, energy: null, hybrid: null };

    // Best Life (>= 100 PV) - Sort by podsScore (lowest is best)
    const lifeCandidates = scoredItems.filter(i => i.stats.life >= 100 && i.podsScore !== Infinity);
    const bestLife = lifeCandidates.sort((a, b) => a.podsScore - b.podsScore)[0];

    // Best Energy (>= 150 Energy) - Sort by podsScoreEnergy (lowest is best)
    const energyCandidates = scoredItems.filter(i => i.stats.energy >= 150 && i.podsScoreEnergy !== Infinity);
    const bestEnergy = energyCandidates.sort((a, b) => a.podsScoreEnergy - b.podsScoreEnergy)[0];

    // Best Hybrid (Life > 0 && Energy > 0) - Sort by combined score
    const hybridCandidates = scoredItems.filter(i => i.stats.life > 0 && i.stats.energy > 0);
    const bestHybrid = hybridCandidates.sort((a, b) => {
        // Calculate hybrid score: (Price + 100) / (Life + Energy)
        const scoreA = (a.price + 100) / (a.stats.life + a.stats.energy);
        const scoreB = (b.price + 100) / (b.stats.life + b.stats.energy);
        return scoreA - scoreB;
    })[0];

    return { life: bestLife, energy: bestEnergy, hybrid: bestHybrid };
  }, [scoredItems]);

  // Calculate thresholds (tertiles) for color scaling
  const statsRange = useMemo(() => {
    const getThresholds = (values: number[]) => {
      if (values.length === 0) return { p33: 0, p66: 0 };
      const sorted = [...values].sort((a, b) => a - b);
      return {
        p33: sorted[Math.floor(sorted.length * 0.33)],
        p66: sorted[Math.floor(sorted.length * 0.66)]
      };
    };

    const lifeItems = processedItems.filter(i => i.ratioLife !== Infinity);
    const energyItems = processedItems.filter(i => i.ratioEnergy !== Infinity);

    return {
      lifeRatio: getThresholds(lifeItems.map(i => i.ratioLife)),
      lifeScore: getThresholds(lifeItems.map(i => i.podsScore)),
      energyRatio: getThresholds(energyItems.map(i => i.ratioEnergy)),
      energyScore: getThresholds(energyItems.map(i => i.podsScoreEnergy)),
    };
  }, [processedItems]);

  const getScoreColor = (value: number, thresholds: { p33: number, p66: number }) => {
    if (value === Infinity || isNaN(value)) return 'text-gray-600';
    
    if (value <= thresholds.p33) return 'text-green-400'; // Top 33%
    if (value <= thresholds.p66) return 'text-yellow-400'; // Middle 33%
    return 'text-red-400'; // Bottom 33%
  };

  // Sorting
  const sortedItems = useMemo(() => {
    return [...processedItems].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortField) {
        case 'ratio_life': valA = a.ratioLife; valB = b.ratioLife; break;
        case 'ratio_energy': valA = a.ratioEnergy; valB = b.ratioEnergy; break;
        case 'score_life': valA = a.scoreLife; valB = b.scoreLife; break;
        case 'score_energy': valA = a.scoreEnergy; valB = b.scoreEnergy; break;
        case 'price': valA = a.price; valB = b.price; break;
        case 'life': valA = a.stats.life; valB = b.stats.life; break;
        case 'energy': valA = a.stats.energy; valB = b.stats.energy; break;
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [processedItems, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (error) return <div className="text-red-500">Erreur: {(error as Error).message}</div>;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Zap className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
            Comparateur de Consommables
          </h1>
          <p className="text-sm md:text-base text-gray-400 mt-2">
            Trouvez les meilleurs consommables (Vie/Énergie) au meilleur prix sur {server}.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Chargement des données...</div>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Data Age Warning */}
          {isDataOld && oldestDateFormatted && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium">Données anciennes</p>
            <p className="text-amber-400/80 text-sm">
              Certains prix datent du {oldestDateFormatted}. Les prix réels peuvent avoir changé depuis.
            </p>
          </div>
        </div>
      )}

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Best Life */}
        {topCards.life && (
          <Link 
            to={`/item/${server}/${topCards.life.name}`}
            className="bg-[#1a1b1e] border border-green-500/20 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-green-500/40 transition-colors"
          >
            <div className="absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Heart className="w-24 h-24 text-green-500" />
            </div>
            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={topCards.life.img} alt={topCards.life.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-xs text-green-400 font-medium mb-1">Meilleur Soin ({'>100 PV'})</div>
              <div className="font-bold text-white text-lg">{topCards.life.name}</div>
              <div className="text-sm text-gray-400">
                <span className="text-green-400 font-bold">{topCards.life.price.toLocaleString()} k</span>
                <span className="mx-2">•</span>
                {topCards.life.stats.life} PV
              </div>
            </div>
          </Link>
        )}

        {/* Best Energy */}
        {topCards.energy && (
          <Link 
            to={`/item/${server}/${topCards.energy.name}`}
            className="bg-[#1a1b1e] border border-yellow-500/20 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-yellow-500/40 transition-colors"
          >
            <div className="absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="w-24 h-24 text-yellow-500" />
            </div>
            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={topCards.energy.img} alt={topCards.energy.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-xs text-yellow-400 font-medium mb-1">Meilleure Énergie ({'>150'})</div>
              <div className="font-bold text-white text-lg">{topCards.energy.name}</div>
              <div className="text-sm text-gray-400">
                <span className="text-yellow-400 font-bold">{topCards.energy.price.toLocaleString()} k</span>
                <span className="mx-2">•</span>
                {topCards.energy.stats.energy} Énergie
              </div>
            </div>
          </Link>
        )}
        {/* Best Hybrid */}
        {topCards.hybrid && (
          <Link 
            to={`/item/${server}/${topCards.hybrid.name}`}
            className="bg-[#1a1b1e] border border-purple-500/20 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-purple-500/40 transition-colors"
          >
            <div className="absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Crown className="w-24 h-24 text-purple-500" />
            </div>
            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={topCards.hybrid.img} alt={topCards.hybrid.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-xs text-purple-400 font-medium mb-1">Meilleur Hybride</div>
              <div className="font-bold text-white text-lg">{topCards.hybrid.name}</div>
              <div className="text-sm text-gray-400">
                <span className="text-purple-400 font-bold">{topCards.hybrid.price.toLocaleString()} k</span>
                <span className="mx-2">•</span>
                {topCards.hybrid.stats.life} PV / {topCards.hybrid.stats.energy} Énergie
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Controls */}
      <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 mb-6 flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
        
        {/* Group 1: Configuration */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Pods Optimization Toggle */}
          <div className="flex flex-col">
            <label className="block text-xs font-medium text-gray-400 mb-1">Mode</label>
            <div className="flex items-center gap-3 h-[38px]">
              <div 
                onClick={() => {
                  const newValue = !optimizePods;
                  setOptimizePods(newValue);
                  
                  // Reset sort to default for the mode, preserving energy context if applicable
                  const isEnergyContext = sortField.includes('energy') || filterType === 'energy';
                  
                  if (newValue) {
                    // Switching to Pods Optimization -> Sort by Score
                    setSortField(isEnergyContext ? 'score_energy' : 'score_life');
                  } else {
                    // Switching to Standard -> Sort by Ratio
                    setSortField(isEnergyContext ? 'ratio_energy' : 'ratio_life');
                  }
                  setSortDirection('asc');
                }}
                className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors ${optimizePods ? 'bg-accent-primary' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${optimizePods ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm font-medium text-gray-200 min-w-[140px]">
                {optimizePods ? 'Optimisation Pods' : 'Rentabilité (Kamas)'}
              </span>
            </div>
          </div>

          {/* Type Select */}
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
            <div className="relative">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as FilterType)}
                className="w-full bg-[#25262b] border border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500 transition-all"
              >
                <option value="all">Tous</option>
                <option value="life">Vie</option>
                <option value="energy">Énergie</option>
                <option value="both">Vie & Énergie</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="hidden md:block h-10 w-px bg-white/10" />

        {/* Group 2: Stats */}
        <div className="flex flex-wrap items-end gap-4 md:gap-6">
          {/* Life Range */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Vie</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={minLife}
                onChange={e => setMinLife(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-20 bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
                placeholder="Min"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={maxLife}
                onChange={e => setMaxLife(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-20 bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Energy Range */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Énergie</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={minEnergy}
                onChange={e => setMinEnergy(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-20 bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
                placeholder="Min"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={maxEnergy}
                onChange={e => setMaxEnergy(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-20 bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
                placeholder="Max"
              />
            </div>
          </div>
        </div>

        <div className="hidden md:block h-10 w-px bg-white/10" />

        {/* Group 3: Level */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Niveau</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={minLevel}
              onChange={e => setMinLevel(Number(e.target.value))}
              className="w-20 bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
              placeholder="Min"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              value={maxLevel}
              onChange={e => setMaxLevel(Number(e.target.value))}
              className="w-20 bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
              placeholder="Max"
            />
          </div>
        </div>

      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 mt-6">
        {sortedItems.map(item => (
          <div 
            key={item.id}
            className="bg-[#1a1b1e] border border-white/10 rounded-xl p-4 active:bg-white/5 transition-colors"
            onClick={() => navigate(`/item/${server}/${item.name}`)}
          >
            <div className="flex items-center gap-3 mb-4">
              <img src={item.img} alt={item.name} className="w-10 h-10 rounded bg-white/5" />
              <div>
                <div className="font-medium text-white">{item.name}</div>
                <div className="text-xs text-gray-500">Niv. {item.level}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-white/5">
              <div>
                <div className="text-xs text-gray-500 mb-1">Prix</div>
                <div className="text-white font-mono">{item.price.toLocaleString()} k</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Vie</div>
                {item.stats.life > 0 ? (
                  <span className="text-green-400 font-medium">+{item.stats.life}</span>
                ) : <span className="text-gray-600">-</span>}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Énergie</div>
                {item.stats.energy > 0 ? (
                  <span className="text-yellow-400 font-medium">+{item.stats.energy}</span>
                ) : <span className="text-gray-600">-</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">{optimizePods ? 'Score Vie' : 'Rentabilité Vie'}</div>
                {item.ratioLife !== Infinity ? (
                  <div className={`font-bold ${optimizePods ? getScoreColor(item.podsScore, statsRange.lifeScore) : getScoreColor(item.ratioLife, statsRange.lifeRatio)}`}>
                    {optimizePods ? item.podsScore.toFixed(2) : `${item.ratioLife.toFixed(2)} k/pv`}
                  </div>
                ) : <span className="text-gray-600">-</span>}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">{optimizePods ? 'Score Énergie' : 'Rentabilité Énergie'}</div>
                {item.ratioEnergy !== Infinity ? (
                  <div className={`font-bold ${optimizePods ? getScoreColor(item.podsScoreEnergy, statsRange.energyScore) : getScoreColor(item.ratioEnergy, statsRange.energyRatio)}`}>
                    {optimizePods ? item.podsScoreEnergy.toFixed(2) : `${item.ratioEnergy.toFixed(2)} k/e`}
                  </div>
                ) : <span className="text-gray-600">-</span>}
              </div>
            </div>
          </div>
        ))}
        {sortedItems.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Aucun consommable trouvé.
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-[#1a1b1e] border border-white/10 rounded-xl overflow-hidden mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-gray-400 text-sm border-b border-white/10">
              <th className="p-4 font-medium">Item</th>
              <th className="p-4 font-medium cursor-pointer hover:text-gray-200" onClick={() => handleSort('life')}>
                <div className="flex items-center gap-1">Vie <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-gray-200" onClick={() => handleSort('energy')}>
                <div className="flex items-center gap-1">Énergie <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-gray-200" onClick={() => handleSort('price')}>
                <div className="flex items-center gap-1">Prix Moyen <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-gray-200" onClick={() => handleSort(optimizePods ? 'score_life' : 'ratio_life')}>
                <div className="flex items-center gap-1">
                  {optimizePods ? 'Score (Vie)' : 'Rentabilité (K/PV)'} 
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-gray-200" onClick={() => handleSort(optimizePods ? 'score_energy' : 'ratio_energy')}>
                <div className="flex items-center gap-1">
                  {optimizePods ? 'Score (Énergie)' : 'Rentabilité (K/Énergie)'} 
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedItems.map(item => (
              <tr 
                key={item.id} 
                className="hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/item/${server}/${item.name}`)}
              >
                <td className="p-4">
                  <Link 
                    to={`/item/${server}/${item.name}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-3 group"
                  >
                    <img src={item.img} alt={item.name} className="w-10 h-10 rounded bg-white/5" />
                    <div>
                      <div className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors">{item.name}</div>
                      <div className="text-xs text-gray-500">Niv. {item.level}</div>
                    </div>
                  </Link>
                </td>
                <td className="p-4">
                  {item.stats.life > 0 ? (
                    <span className="text-green-400 font-medium">+{item.stats.life} PV</span>
                  ) : <span className="text-gray-600">-</span>}
                </td>
                <td className="p-4">
                  {item.stats.energy > 0 ? (
                    <span className="text-yellow-400 font-medium">+{item.stats.energy} Énergie</span>
                  ) : <span className="text-gray-600">-</span>}
                </td>
                <td className="p-4 text-gray-200 font-mono">
                  {item.price.toLocaleString()} k
                </td>
                <td className="p-4">
                  {item.ratioLife !== Infinity ? (
                    <div className="flex flex-col">
                      {optimizePods ? (
                        <>
                          <span className={`font-bold ${getScoreColor(item.podsScore, statsRange.lifeScore)}`}>
                            Score: {item.podsScore.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.ratioLife.toFixed(2)} k/pv
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={`font-bold ${getScoreColor(item.ratioLife, statsRange.lifeRatio)}`}>
                            {item.ratioLife.toFixed(2)} k/pv
                          </span>
                          <span className="text-xs text-gray-500">
                            Score: {item.podsScore.toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  ) : <span className="text-gray-600">-</span>}
                </td>
                <td className="p-4">
                  {item.ratioEnergy !== Infinity ? (
                    <div className="flex flex-col">
                      {optimizePods ? (
                        <>
                          <span className={`font-bold ${getScoreColor(item.podsScoreEnergy, statsRange.energyScore)}`}>
                            Score: {item.podsScoreEnergy.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.ratioEnergy.toFixed(2)} k/e
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={`font-bold ${getScoreColor(item.ratioEnergy, statsRange.energyRatio)}`}>
                            {item.ratioEnergy.toFixed(2)} k/e
                          </span>
                          <span className="text-xs text-gray-500">
                            Score: {item.podsScoreEnergy.toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  ) : <span className="text-gray-600">-</span>}
                </td>
              </tr>
            ))}
            {sortedItems.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Aucun consommable trouvé ou pas de prix disponible.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
};
