
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchLevelingPlan } from '../api';
import { useJobs } from '../hooks/useRecipes';
import { 
  Hammer, 
  ArrowRight, 
  Coins, 
  TrendingUp, 
  ChevronRight,
  ChevronDown,
  Loader2,
  ChevronsUp
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
    const params = new URLSearchParams(searchParams);
    params.set('job', selectedJob.toString());
    params.set('from', fromLevel.toString());
    params.set('to', toLevel.toString());
    setSearchParams(params, { replace: true });
  }, [selectedJob, fromLevel, toLevel, setSearchParams]);

  const { data: plan, isLoading, error, refetch } = useQuery<LevelingPlan>({
    queryKey: ['leveling-plan', selectedJob, fromLevel, toLevel, server],
    queryFn: async () => {
      return await fetchLevelingPlan({
        job_id: selectedJob,
        from_level: fromLevel,
        to_level: toLevel,
        server
      });
    },
    enabled: false, // Manually triggered
  });

  // Trigger initial calculation on mount
  useEffect(() => {
    refetch();
  }, []);

  const handleCalculate = () => {
    refetch();
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
          </h1>
          <p className="text-sm md:text-base text-gray-400 mt-2">
            Trouvez le chemin le moins cher pour monter vos métiers sur {server}.
          </p>
        </div>
      </div>

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

      {/* Results */}
      {plan && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-bg-secondary p-4 rounded-xl shadow-sm border border-border-normal flex items-center space-x-4">
              <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-full">
                <Coins size={24} />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Coût Total Estimé</p>
                <p className="text-2xl font-bold text-text-primary">{formatKamas(plan.totalCost)} ₭</p>
              </div>
            </div>
            
            <div className="bg-bg-secondary p-4 rounded-xl shadow-sm border border-border-normal flex items-center space-x-4">
              <div className="p-3 bg-green-500/10 text-green-500 rounded-full">
                <ArrowRight size={24} />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Progression</p>
                <p className="text-2xl font-bold text-text-primary">{plan.fromLevel} ➔ {plan.toLevel}</p>
              </div>
            </div>

            <div className="bg-bg-secondary p-4 rounded-xl shadow-sm border border-border-normal flex items-center space-x-4">
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-full">
                <Hammer size={24} />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Étapes</p>
                <p className="text-2xl font-bold text-text-primary">{plan.steps.length}</p>
              </div>
            </div>
          </div>

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
            <div className="px-6 py-4 border-b border-border-normal bg-bg-tertiary/30">
              <h3 className="text-lg font-semibold text-text-primary">Plan de Leveling</h3>
            </div>
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
                        <p className="text-base md:text-lg font-semibold text-text-primary">x {step.quantity}</p>
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
          </div>
        </div>
      )}
    </div>
  );
};
