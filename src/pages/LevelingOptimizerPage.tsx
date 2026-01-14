
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchLevelingPlan } from '../api';
import { useJobs } from '../hooks/useRecipes';
import { LevelingInfoModal } from '../components/LevelingInfoModal';
import { 
  Hammer, 
  ArrowRight, 
  Coins, 
  TrendingUp, 
  ChevronRight,
  ChevronDown,
  Loader2,
  ChevronsUp,
  AlertTriangle,
  Infinity,
  SlidersHorizontal,
  HelpCircle
} from 'lucide-react';

const EXCLUDED_JOBS = [
  'Base',
  'Bestiologue',
  'Cordomage',
  'Costumage',
  'Façomage',
  'Forgemage',
  'Joaillomage',
  'Parchomage',
  'Sculptemage'
];

interface Ingredient {
  id: number;
  name: string;
  imgUrl: string;
  quantity: number;
  price: number;
}

interface LevelingStep {
  startLevel: number;
  endLevel: number;
  recipeId: number;
  recipeName: string;
  recipeLevel: number;
  quantity: number;
  xpPerCraft: number;
  costPerCraft: number;
  totalCost: number;
  totalXp: number;
  imgUrl?: string;
  ingredients?: Ingredient[];
}

interface LevelingPlan {
  jobId: number;
  fromLevel: number;
  toLevel: number;
  totalCost: number;
  steps: LevelingStep[];
}

export const LevelingOptimizerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: allJobs = [] } = useJobs();
  
  const jobs = allJobs
    .filter(job => !EXCLUDED_JOBS.includes(job.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [selectedJob, setSelectedJob] = useState<number>(() => {
    const job = searchParams.get('job');
    return job ? parseInt(job) : 26; // Alchimiste par défaut
  });
  
  const [fromLevel, setFromLevel] = useState<number>(() => {
    const from = searchParams.get('from');
    return from ? parseInt(from) : 1;
  });
  
  const [toLevel, setToLevel] = useState<number>(() => {
    const to = searchParams.get('to');
    return to ? parseInt(to) : 200;
  });

  const [server] = useState<string>('Hell Mina'); // TODO: Get from context
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [isShoppingListExpanded, setIsShoppingListExpanded] = useState(false);
  
  // Tab system: 'optimal' (no limit), 'realistic' (penalty mode), 'custom' (with limit)
  const [activeTab, setActiveTab] = useState<'optimal' | 'realistic' | 'custom'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'optimal' || tab === 'realistic' || tab === 'custom') return tab;
    return 'optimal';
  });
  const [customLimit, setCustomLimit] = useState<number>(() => {
    const limit = searchParams.get('limit');
    return limit ? parseInt(limit) : 1000;
  });
  const [penaltyMode, setPenaltyMode] = useState<'low' | 'medium' | 'high'>(() => {
    const penalty = searchParams.get('penalty');
    if (penalty === 'low' || penalty === 'medium' || penalty === 'high') return penalty;
    return 'medium';
  });
  
  // Custom mode parameters
  const [customAlpha, setCustomAlpha] = useState<number>(() => {
    const alpha = searchParams.get('alpha');
    return alpha ? parseFloat(alpha) : 0.5;
  });
  const [customThreshold, setCustomThreshold] = useState<number>(() => {
    const threshold = searchParams.get('threshold');
    return threshold ? parseInt(threshold) : 2000;
  });
  const [customMinBatch, setCustomMinBatch] = useState<number>(() => {
    const minBatch = searchParams.get('minBatch');
    return minBatch ? parseInt(minBatch) : 50;
  });
  const [customMaxResource, setCustomMaxResource] = useState<number>(() => {
    const maxResource = searchParams.get('maxResource');
    return maxResource ? parseInt(maxResource) : 5000;
  });
  const [customEnablePenalty, setCustomEnablePenalty] = useState<boolean>(() => {
    const enablePenalty = searchParams.get('enablePenalty');
    return enablePenalty === 'true';
  });
  
  // Info modal
  const [showInfoModal, setShowInfoModal] = useState(false);

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('job', selectedJob.toString());
    params.set('from', fromLevel.toString());
    params.set('to', toLevel.toString());
    params.set('tab', activeTab);
    if (activeTab === 'custom') {
      params.set('limit', customLimit.toString());
      params.set('enablePenalty', customEnablePenalty.toString());
      if (customEnablePenalty) {
        params.set('alpha', customAlpha.toString());
        params.set('threshold', customThreshold.toString());
        params.set('minBatch', customMinBatch.toString());
        params.set('maxResource', customMaxResource.toString());
      }
    }
    if (activeTab === 'realistic') {
      params.set('penalty', penaltyMode);
    }
    setSearchParams(params, { replace: true });
  }, [selectedJob, fromLevel, toLevel, activeTab, customLimit, penaltyMode, customAlpha, customThreshold, customMinBatch, customMaxResource, customEnablePenalty, setSearchParams]);

  // Query for optimal plan (no limit, no penalty)
  const { data: optimalPlan, isLoading: isLoadingOptimal, error: errorOptimal, refetch: refetchOptimal } = useQuery<LevelingPlan>({
    queryKey: ['leveling-plan-optimal', selectedJob, fromLevel, toLevel, server],
    queryFn: async () => {
      return await fetchLevelingPlan({
        job_id: selectedJob,
        from_level: fromLevel,
        to_level: toLevel,
        server,
        max_quantity_per_recipe: null,
        penalty_mode: 'none'
      });
    },
    enabled: false,
  });

  // Query for realistic plan (with penalty)
  const { data: realisticPlan, isLoading: isLoadingRealistic, refetch: refetchRealistic } = useQuery<LevelingPlan>({
    queryKey: ['leveling-plan-realistic', selectedJob, fromLevel, toLevel, server, penaltyMode],
    queryFn: async () => {
      return await fetchLevelingPlan({
        job_id: selectedJob,
        from_level: fromLevel,
        to_level: toLevel,
        server,
        max_quantity_per_recipe: null,
        penalty_mode: penaltyMode
      });
    },
    enabled: false,
  });

  // Query for custom plan (with all custom parameters)
  const { data: customPlan, isLoading: isLoadingCustom, refetch: refetchCustom } = useQuery<LevelingPlan>({
    queryKey: ['leveling-plan-custom', selectedJob, fromLevel, toLevel, server, customLimit, customEnablePenalty, customAlpha, customThreshold, customMinBatch, customMaxResource],
    queryFn: async () => {
      return await fetchLevelingPlan({
        job_id: selectedJob,
        from_level: fromLevel,
        to_level: toLevel,
        server,
        max_quantity_per_recipe: customLimit > 0 ? customLimit : null,
        penalty_mode: 'none',
        // Custom penalty parameters only if enabled
        ...(customEnablePenalty && {
          custom_alpha: customAlpha,
          custom_threshold: customThreshold,
          custom_min_batch: customMinBatch,
          custom_max_resource_usage: customMaxResource
        })
      });
    },
    enabled: false,
  });

  // Get the active plan based on current tab
  const plan = activeTab === 'optimal' ? optimalPlan : activeTab === 'realistic' ? realisticPlan : customPlan;
  const isLoading = activeTab === 'optimal' ? isLoadingOptimal : activeTab === 'realistic' ? isLoadingRealistic : isLoadingCustom;
  const error = errorOptimal; // Use optimal error as primary

  // Trigger initial calculation on mount
  useEffect(() => {
    refetchOptimal();
  }, []);

  const handleCalculate = () => {
    refetchOptimal();
    if (activeTab === 'realistic') {
      refetchRealistic();
    } else if (activeTab === 'custom') {
      refetchCustom();
    }
  };

  const handleRealisticCalculate = () => {
    refetchRealistic();
  };

  const handleCustomCalculate = () => {
    refetchCustom();
  };

  const shoppingList = React.useMemo(() => {
    if (!plan) return [];
    const map = new Map<number, Ingredient & { totalQuantity: number, totalCost: number }>();

    plan.steps.forEach(step => {
      step.ingredients?.forEach(ing => {
        const existing = map.get(ing.id);
        const quantityNeeded = ing.quantity * step.quantity;
        if (existing) {
          existing.totalQuantity += quantityNeeded;
          existing.totalCost += quantityNeeded * ing.price;
        } else {
          map.set(ing.id, {
            ...ing,
            totalQuantity: quantityNeeded,
            totalCost: quantityNeeded * ing.price
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [plan]);

  const formatKamas = (kamas: number) => {
    return new Intl.NumberFormat('fr-FR').format(Math.round(kamas));
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <ChevronsUp className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
            Optimiseur de Leveling
            <button
              onClick={() => setShowInfoModal(true)}
              className="p-1.5 hover:bg-bg-tertiary rounded-lg transition-colors group"
              title="Comment ça marche ?"
            >
              <HelpCircle size={20} className="text-text-tertiary group-hover:text-blue-400 transition-colors" />
            </button>
          </h1>
          <p className="text-sm md:text-base text-gray-400 mt-2">
            Trouvez le chemin le moins cher pour monter vos métiers sur {server}.
          </p>
        </div>
      </div>

      {/* Info Modal */}
      <LevelingInfoModal 
        isOpen={showInfoModal} 
        onClose={() => setShowInfoModal(false)} 
      />

      {/* Configuration Panel */}
      <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          {/* Job Selector */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-400">Métier</label>
            <div className="relative">
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(Number(e.target.value))}
                className="w-full bg-[#25262b] border border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500 transition-all"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Level Range */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-400">Niveau de départ</label>
            <input
              type="number"
              min={1}
              max={toLevel - 1}
              value={fromLevel}
              onChange={(e) => setFromLevel(Number(e.target.value))}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-400">Niveau cible</label>
            <input
              type="number"
              min={fromLevel + 1}
              max={200}
              value={toLevel}
              onChange={(e) => setToLevel(Number(e.target.value))}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Action Button */}
          <button
            onClick={handleCalculate}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-[38px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Calcul...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2" size={18} />
                Calculer
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          { /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ }
          Une erreur est survenue lors du calcul : {(error as any).message || 'Erreur inconnue'}
        </div>
      )}

      {/* Results - show if we have at least one plan */}
      {(optimalPlan || realisticPlan || customPlan) && (
        <div className="space-y-6">
          {/* Summary Cards - use current plan or fallback to optimal */}
          {(plan || optimalPlan) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-bg-secondary p-4 rounded-xl shadow-sm border border-border-normal flex items-center space-x-4">
              <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-full">
                <Coins size={24} />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Coût Total Estimé</p>
                <p className="text-2xl font-bold text-text-primary">{formatKamas((plan || optimalPlan)!.totalCost)} ₭</p>
              </div>
            </div>
            
            <div className="bg-bg-secondary p-4 rounded-xl shadow-sm border border-border-normal flex items-center space-x-4">
              <div className="p-3 bg-green-500/10 text-green-500 rounded-full">
                <ArrowRight size={24} />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Progression</p>
                <p className="text-2xl font-bold text-text-primary">{(plan || optimalPlan)!.fromLevel} ➔ {(plan || optimalPlan)!.toLevel}</p>
              </div>
            </div>

            <div className="bg-bg-secondary p-4 rounded-xl shadow-sm border border-border-normal flex items-center space-x-4">
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-full">
                <Hammer size={24} />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Étapes</p>
                <p className="text-2xl font-bold text-text-primary">{(plan || optimalPlan)!.steps.length}</p>
              </div>
            </div>
          </div>
          )}

          {/* Shopping List */}
          {shoppingList.length > 0 && (
            <div className="bg-bg-secondary rounded-xl shadow-sm border border-border-normal overflow-hidden">
              <div 
                className="px-4 md:px-6 py-4 border-b border-border-normal bg-bg-tertiary/30 flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0 cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
                onClick={() => setIsShoppingListExpanded(!isShoppingListExpanded)}
              >
                <div className="flex items-center space-x-2">
                  {isShoppingListExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <h3 className="text-base md:text-lg font-semibold text-text-primary">Liste des courses (Ingrédients cumulés)</h3>
                </div>
                <span className="text-xs md:text-sm text-text-secondary ml-7 md:ml-0">{shoppingList.length} ingrédients différents</span>
              </div>
              
              {isShoppingListExpanded && (
                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {shoppingList.map((ing) => (
                    <div key={ing.id} className="flex items-center space-x-3 p-3 bg-bg-tertiary rounded-lg border border-border-normal">
                      <img 
                        src={ing.imgUrl} 
                        alt={ing.name} 
                        className="w-10 h-10 object-contain" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate" title={ing.name}>{ing.name}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-text-secondary">x {new Intl.NumberFormat('fr-FR').format(ing.totalQuantity)}</span>
                          <span className="text-xs font-bold text-yellow-500">{formatKamas(ing.totalCost)} ₭</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Steps List */}
          <div className="bg-bg-secondary rounded-xl shadow-sm border border-border-normal overflow-hidden">
            {/* Tab Header */}
            <div className="px-4 md:px-6 py-4 border-b border-border-normal bg-bg-tertiary/30">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h3 className="text-lg font-semibold text-text-primary">Plan de Leveling</h3>
                
                {/* Tabs */}
                <div className="flex w-full sm:w-auto gap-1 bg-bg-tertiary/50 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('optimal')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'optimal' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    <Infinity size={14} />
                    <span>Optimal</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('realistic')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'realistic' 
                        ? 'bg-amber-600 text-white' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    <TrendingUp size={14} />
                    <span>Réaliste</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('custom')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'custom' 
                        ? 'bg-purple-600 text-white' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    <SlidersHorizontal size={14} />
                    <span>Personnalisé</span>
                  </button>
                </div>
              </div>
              
              {/* Tab description */}
              <div className="mt-3 text-xs text-text-secondary">
                {activeTab === 'optimal' && (
                  <p className="flex items-center gap-1">
                    <Infinity size={12} />
                    Chemin mathématiquement optimal, sans limite de quantité par recette.
                  </p>
                )}
                {activeTab === 'realistic' && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={12} />
                      <span>Pénalité HDV :</span>
                      <select
                        value={penaltyMode}
                        onChange={(e) => setPenaltyMode(e.target.value as 'low' | 'medium' | 'high')}
                        className="bg-bg-tertiary border border-border-normal rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-amber-500"
                      >
                        <option value="low">Faible</option>
                        <option value="medium">Modérée</option>
                        <option value="high">Importante</option>
                      </select>
                    </div>
                    <button
                      onClick={handleRealisticCalculate}
                      disabled={isLoadingRealistic}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                    >
                      {isLoadingRealistic ? 'Calcul...' : 'Recalculer'}
                    </button>
                    <span className="text-text-tertiary text-xs">
                      Simule la hausse des prix HDV quand on achète en grande quantité
                    </span>
                  </div>
                )}
                {activeTab === 'custom' && (
                  <div className="space-y-3 mt-2">
                    {/* Row 1: Limit per recipe */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal size={12} />
                        <span className="text-sm">Limite par recette :</span>
                        <input
                          type="number"
                          min={0}
                          max={50000}
                          step={100}
                          value={customLimit}
                          onChange={(e) => setCustomLimit(Number(e.target.value))}
                          className="w-24 bg-bg-tertiary border border-border-normal rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-purple-500"
                        />
                        <span className="text-xs text-text-tertiary">(0 = illimité)</span>
                      </div>
                    </div>

                    {/* Row 2: Enable penalty system */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customEnablePenalty}
                          onChange={(e) => setCustomEnablePenalty(e.target.checked)}
                          className="w-4 h-4 rounded border-border-normal bg-bg-tertiary text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm">Activer la simulation HDV (pénalités)</span>
                      </label>
                    </div>

                    {/* Row 3: Penalty parameters (conditional) */}
                    {customEnablePenalty && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-tertiary">Alpha (pénalité)</label>
                          <input
                            type="number"
                            min={0}
                            max={2}
                            step={0.1}
                            value={customAlpha}
                            onChange={(e) => setCustomAlpha(Number(e.target.value))}
                            className="bg-bg-tertiary border border-border-normal rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-tertiary">Seuil</label>
                          <input
                            type="number"
                            min={100}
                            max={10000}
                            step={100}
                            value={customThreshold}
                            onChange={(e) => setCustomThreshold(Number(e.target.value))}
                            className="bg-bg-tertiary border border-border-normal rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-tertiary">Lot minimum</label>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            step={10}
                            value={customMinBatch}
                            onChange={(e) => setCustomMinBatch(Number(e.target.value))}
                            className="bg-bg-tertiary border border-border-normal rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-tertiary">Stock max/ressource</label>
                          <input
                            type="number"
                            min={500}
                            max={50000}
                            step={500}
                            value={customMaxResource}
                            onChange={(e) => setCustomMaxResource(Number(e.target.value))}
                            className="bg-bg-tertiary border border-border-normal rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Recalculate button */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleCustomCalculate}
                        disabled={isLoadingCustom}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                      >
                        {isLoadingCustom ? 'Calcul...' : 'Recalculer'}
                      </button>
                      <span className="text-xs text-text-tertiary">
                        {customEnablePenalty 
                          ? 'Limite + simulation HDV personnalisée'
                          : 'Limite seule, sans simulation HDV'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Cost comparison banner */}
              {optimalPlan && plan && activeTab !== 'optimal' && plan.totalCost > optimalPlan.totalCost && (
                <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs">
                  <span className="text-yellow-500">
                    Surcoût par rapport à l'optimal : +{formatKamas(plan.totalCost - optimalPlan.totalCost)} ₭ 
                    ({((plan.totalCost - optimalPlan.totalCost) / optimalPlan.totalCost * 100).toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            
            {/* Loading state for current tab */}
            {isLoading && (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <span className="ml-2 text-text-secondary">Calcul en cours...</span>
              </div>
            )}
            
            {/* No plan for this tab yet */}
            {!isLoading && !plan && activeTab === 'custom' && (
              <div className="p-8 text-center text-text-secondary">
                <SlidersHorizontal size={32} className="mx-auto mb-2 opacity-50" />
                <p>Configurez votre limite et cliquez sur "Recalculer"</p>
              </div>
            )}
            
            {/* Steps */}
            {plan && (
            <div className="divide-y divide-border-normal">
              {plan.steps.map((step, index) => (
                <div key={index} className="hover:bg-bg-tertiary/50 transition-colors">
                  <div 
                    className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-0 cursor-pointer"
                    onClick={() => toggleStep(index)}
                  >
                    
                    {/* Level Range */}
                    <div className="order-2 md:order-1 w-full md:w-1/4">
                      {/* Mobile View */}
                      <div className="md:hidden flex items-center justify-between bg-bg-tertiary/20 px-4 py-3 rounded-lg">
                        <span className="font-bold text-blue-500">Niv. {step.startLevel}</span>
                        <div className="flex-1 mx-4 flex items-center">
                          <div className="h-0.5 w-full bg-gradient-to-r from-blue-500/50 to-green-500/50 rounded-full"></div>
                          <ChevronRight size={16} className="text-green-500/50 -ml-1" />
                        </div>
                        <span className="font-bold text-green-500">Niv. {step.endLevel}</span>
                      </div>

                      {/* Desktop View */}
                      <div className="hidden md:flex items-center justify-start space-x-4">
                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-blue-500/10 rounded-full border-2 border-blue-500/20">
                          <span className="text-xs text-text-secondary">Niveau</span>
                          <span className="text-xl font-bold text-blue-500">{step.startLevel}</span>
                        </div>
                        <ChevronRight className="text-text-muted" />
                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-green-500/10 rounded-full border-2 border-green-500/20">
                          <span className="text-xs text-text-secondary">Niveau</span>
                          <span className="text-xl font-bold text-green-500">{step.endLevel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Recipe Info */}
                    <div className="order-1 md:order-2 flex items-center space-x-4 flex-1 w-full md:w-auto">
                      {step.imgUrl ? (
                        <img 
                          src={step.imgUrl} 
                          alt={step.recipeName} 
                          className="w-10 h-10 md:w-12 md:h-12 object-contain" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-bg-tertiary rounded-lg flex items-center justify-center">
                          <Hammer size={20} className="text-text-muted" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-text-primary text-sm md:text-base">{step.recipeName}</h4>
                        <p className="text-xs md:text-sm text-text-secondary">Recette Niv. {step.recipeLevel}</p>
                      </div>
                      {/* Mobile Expand Icon */}
                      <div className="md:hidden text-text-muted">
                        {expandedSteps.has(index) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="order-3 md:order-3 grid grid-cols-3 gap-2 w-full md:w-auto md:flex md:items-center md:space-x-8 md:text-right bg-bg-tertiary/10 md:bg-transparent p-3 md:p-0 rounded-lg md:rounded-none">
                      <div className="flex flex-col md:block items-center md:items-end">
                        <p className="text-xs md:text-sm text-text-secondary">Quantité</p>
                        <div className="flex items-center gap-1 group relative">
                          {step.quantity > 500 && (
                            <>
                              <AlertTriangle size={14} className="text-yellow-500 cursor-help" />
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg border border-white/10">
                                <div className="text-yellow-400 font-semibold mb-1">⚠️ Grande quantité</div>
                                <div>Acheter {step.quantity.toLocaleString()} ressources peut</div>
                                <div>faire monter les prix en HDV.</div>
                                <div className="text-gray-400 mt-1">Utilisez le mode Personnalisé pour limiter.</div>
                                {/* Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </>
                          )}
                          <p className={`text-base md:text-lg font-semibold ${step.quantity > 500 ? 'text-yellow-500' : 'text-text-primary'}`}>
                            x {step.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col md:block items-center md:items-end border-l border-r border-border-normal md:border-0 px-2 md:px-0">
                        <p className="text-xs md:text-sm text-text-secondary">Coût/u</p>
                        <p className="text-xs md:text-sm font-medium text-text-primary">{formatKamas(step.costPerCraft)} ₭</p>
                      </div>
                      <div className="flex flex-col md:block items-center md:items-end md:w-32">
                        <p className="text-xs md:text-sm text-text-secondary">Total</p>
                        <p className="text-base md:text-lg font-bold text-blue-500">{formatKamas(step.totalCost)} ₭</p>
                      </div>
                    </div>
                    
                    {/* Desktop Expand Icon */}
                    <div className="hidden md:block order-4 text-text-muted ml-4">
                      {expandedSteps.has(index) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </div>

                  {/* Ingredients Section */}
                  {expandedSteps.has(index) && step.ingredients && (
                    <div className="px-4 md:px-6 pb-4 md:pb-6 pt-0">
                      <div className="bg-bg-tertiary/30 rounded-lg p-3 md:p-4 border border-border-normal">
                        <h5 className="text-sm font-medium text-text-secondary mb-3">Ressources nécessaires</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                          {step.ingredients.map((ing) => (
                            <div key={ing.id} className="flex items-center space-x-3 bg-bg-secondary p-2 rounded-lg border border-border-normal">
                              <div className="w-8 h-8 md:w-10 md:h-10 bg-bg-tertiary rounded flex items-center justify-center shrink-0">
                                {ing.imgUrl ? (
                                  <img 
                                    src={ing.imgUrl} 
                                    alt={ing.name} 
                                    className="w-6 h-6 md:w-8 md:h-8 object-contain" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-700 rounded-full" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs md:text-sm font-medium text-text-primary truncate" title={ing.name}>{ing.name}</p>
                                <div className="flex justify-between items-center mt-1">
                                  <p className="text-[10px] md:text-xs text-text-secondary">x {ing.quantity * step.quantity}</p>
                                  <p className="text-[10px] md:text-xs font-medium text-text-muted">{formatKamas(ing.price)} ₭/u</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
