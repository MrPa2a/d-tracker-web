import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useJobs } from '../hooks/useRecipes';
import { useCraftOpportunities, useCraftIngredientsWithStock } from '../hooks/useCraftOpportunities';
import type { CraftOpportunityFilters, CraftOpportunity, CraftIngredientStatus, Profile } from '../types';
import { Search, Hammer, AlertTriangle, ChevronDown, Loader2, Clock, X, ArrowLeft, ChevronRight, Package, Plus, Minus } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import kamaIcon from '../assets/kama.png';
import { fetchCraftIngredientsWithStock } from '../api';

interface BankCraftOpportunitiesPageProps {
  server: string | null;
  currentProfile: Profile | null;
  minPrice: string;
  maxPrice: string;
  onlyFavorites: boolean;
  favorites: Set<string>;
}

// Extended ingredient type with cascade support
interface ExtendedCraftIngredient extends CraftIngredientStatus {
  isExpanded?: boolean;
  subIngredients?: ExtendedCraftIngredient[];
  isLoadingSubRecipe?: boolean;
  // Calculated values when expanded (replacing with sub-recipe)
  effectiveMissingCost?: number;
  effectiveOwnedValue?: number;
}

// Helper to update the tree immutably
const updateIngredientInTree = (
  ingredients: ExtendedCraftIngredient[],
  path: number[],
  updater: (ing: ExtendedCraftIngredient) => ExtendedCraftIngredient
): ExtendedCraftIngredient[] => {
  if (path.length === 0) return ingredients;

  const [currentId, ...restPath] = path;

  return ingredients.map(ing => {
    if (ing.item_id !== currentId) return ing;

    if (restPath.length === 0) {
      return updater(ing);
    }

    if (ing.subIngredients) {
      return {
        ...ing,
        subIngredients: updateIngredientInTree(ing.subIngredients, restPath, updater)
      };
    }

    return ing;
  });
};

// Calculate recursive costs for an ingredient tree
const calculateRecursiveCosts = (ingredients: ExtendedCraftIngredient[], multiplier: number = 1): { missingCost: number; ownedValue: number } => {
  return ingredients.reduce((acc, ing) => {
    if (ing.isExpanded && ing.subIngredients) {
      // Use sub-recipe costs multiplied by the quantity needed
      const subCosts = calculateRecursiveCosts(ing.subIngredients, ing.required_quantity);
      return {
        missingCost: acc.missingCost + subCosts.missingCost * multiplier,
        ownedValue: acc.ownedValue + subCosts.ownedValue * multiplier
      };
    }
    return {
      missingCost: acc.missingCost + ing.missing_cost * multiplier,
      ownedValue: acc.ownedValue + ing.owned_value * multiplier
    };
  }, { missingCost: 0, ownedValue: 0 });
};

// Composant pour afficher les détails des ingrédients avec expansion et cascades
const IngredientDetails: React.FC<{
  recipeId: number;
  server: string;
  profileId: string | null;
  isOpen: boolean;
}> = ({ recipeId, server, profileId, isOpen }) => {
  const { data: ingredients = [], isLoading } = useCraftIngredientsWithStock(
    isOpen ? recipeId : undefined,
    server,
    profileId
  );

  const [extendedIngredients, setExtendedIngredients] = useState<ExtendedCraftIngredient[]>([]);

  // Initialize extended ingredients when data loads
  useEffect(() => {
    if (ingredients.length > 0) {
      setExtendedIngredients(ingredients.map(ing => ({
        ...ing,
        isExpanded: false,
        isLoadingSubRecipe: false
      })));
    }
  }, [ingredients]);

  const handleToggleRecipe = useCallback(async (path: number[]) => {
    if (!server) return;

    // Find the target ingredient
    let targetIng: ExtendedCraftIngredient | undefined;
    let currentList = extendedIngredients;
    for (const id of path) {
      targetIng = currentList.find(i => i.item_id === id);
      if (!targetIng) return;
      if (targetIng.subIngredients) {
        currentList = targetIng.subIngredients;
      }
    }

    if (!targetIng || !targetIng.ingredient_recipe_id) return;

    if (!targetIng.isExpanded && !targetIng.subIngredients) {
      // Load sub-recipe
      setExtendedIngredients(prev => updateIngredientInTree(prev, path, ing => ({ ...ing, isLoadingSubRecipe: true })));
      
      try {
        const subIngredients = await fetchCraftIngredientsWithStock(
          targetIng.ingredient_recipe_id!,
          server,
          profileId
        );
        
        const extendedSubIngredients: ExtendedCraftIngredient[] = subIngredients.map(i => ({
          ...i,
          isExpanded: false,
          isLoadingSubRecipe: false
        }));

        setExtendedIngredients(prev => updateIngredientInTree(prev, path, ing => ({ 
          ...ing, 
          isLoadingSubRecipe: false, 
          isExpanded: true,
          subIngredients: extendedSubIngredients
        })));
      } catch (e) {
        console.error("Failed to load sub-recipe", e);
        setExtendedIngredients(prev => updateIngredientInTree(prev, path, ing => ({ ...ing, isLoadingSubRecipe: false })));
      }
    } else {
      // Toggle expansion
      setExtendedIngredients(prev => updateIngredientInTree(prev, path, ing => ({ ...ing, isExpanded: !ing.isExpanded })));
    }
  }, [server, profileId, extendedIngredients]);

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="p-4 bg-[#1a1b1e] border-t border-white/5">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-sm">Chargement des ingrédients...</span>
        </div>
      </div>
    );
  }

  // Calculate totals with cascade support
  const { missingCost: totalMissingCost, ownedValue: totalOwnedValue } = calculateRecursiveCosts(extendedIngredients);

  return (
    <div className="p-4 bg-[#15161a] border-t border-white/5">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        Ingrédients
        <span className="text-[10px] text-gray-600 font-normal normal-case">
          (cliquez sur les items craftables pour voir leur recette)
        </span>
      </div>
      <div className="space-y-1">
        {extendedIngredients.map((ing) => (
          <IngredientRowWithCascade
            key={ing.item_id}
            ingredient={ing}
            depth={0}
            path={[ing.item_id]}
            onToggle={handleToggleRecipe}
            server={server}
          />
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">En stock :</span>
          <span className="font-mono text-green-400 flex items-center gap-1">
            {formatKamas(totalOwnedValue)}
            <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">À acheter :</span>
          <span className="font-mono text-yellow-400 flex items-center gap-1">
            {formatKamas(totalMissingCost)}
            <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
          </span>
        </div>
      </div>
    </div>
  );
};

// Recursive ingredient row component with cascade support
const IngredientRowWithCascade: React.FC<{
  ingredient: ExtendedCraftIngredient;
  depth: number;
  path: number[];
  onToggle: (path: number[]) => void;
  server: string;
}> = ({ ingredient, depth, path, onToggle, server }) => {
  const isExpanded = ingredient.isExpanded;
  
  // Calculate sub-recipe costs if expanded
  const subCosts = isExpanded && ingredient.subIngredients 
    ? calculateRecursiveCosts(ingredient.subIngredients)
    : null;

  const statusBg = {
    complete: 'bg-green-500/10 border-green-500/20',
    partial: 'bg-yellow-500/10 border-yellow-500/20',
    missing: 'bg-red-500/10 border-red-500/20',
  }[ingredient.status];

  // When expanded, show a different style
  const containerStyle = isExpanded 
    ? 'bg-blue-500/10 border-blue-500/20' 
    : statusBg;

  return (
    <>
      <div 
        className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${containerStyle}`}
        style={{ marginLeft: `${depth * 1.5}rem` }}
      >
        <div className="w-8 h-8 bg-[#25262b] rounded flex items-center justify-center overflow-hidden border border-white/5 shrink-0">
          {ingredient.icon_url ? (
            <img
              src={ingredient.icon_url}
              alt={ingredient.name}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Package size={14} className="text-gray-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link 
              to={ingredient.ingredient_recipe_id ? `/recipes/${ingredient.ingredient_recipe_id}` : `/item/${server}/${ingredient.name}`}
              className="text-sm text-white truncate hover:text-blue-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {ingredient.name}
            </Link>
            <span className="text-xs text-gray-500 shrink-0">x{ingredient.required_quantity}</span>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
            <span>
              {ingredient.owned_quantity}/{ingredient.required_quantity} en stock
            </span>
            {ingredient.missing_quantity > 0 && !isExpanded && (
              <span className="text-yellow-400">
                (manque {ingredient.missing_quantity})
              </span>
            )}
            {ingredient.ingredient_recipe_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(path);
                }}
                className={`flex items-center gap-1 cursor-pointer transition-colors ${
                  isExpanded ? 'text-orange-400 hover:text-orange-300' : 'text-blue-400 hover:text-blue-300'
                }`}
                disabled={ingredient.isLoadingSubRecipe}
              >
                {ingredient.isLoadingSubRecipe ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : isExpanded ? (
                  <Minus size={10} />
                ) : (
                  <Plus size={10} />
                )}
                {isExpanded ? 'Acheter' : 'Crafter'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isExpanded && subCosts ? (
            <div className="text-right">
              <div className="font-mono text-xs text-blue-400 flex items-center gap-1">
                {formatKamas(subCosts.missingCost * ingredient.required_quantity)}
                <img src={kamaIcon} alt="k" className="w-2.5 h-2.5 opacity-70" />
              </div>
              {subCosts.missingCost < ingredient.missing_cost && (
                <div className="text-[10px] text-green-400">
                  -{formatKamas((ingredient.missing_cost - subCosts.missingCost * ingredient.required_quantity))}
                </div>
              )}
            </div>
          ) : ingredient.missing_cost > 0 ? (
            <span className="font-mono text-xs text-yellow-400 flex items-center gap-1">
              {formatKamas(ingredient.missing_cost)}
              <img src={kamaIcon} alt="k" className="w-2.5 h-2.5 opacity-70" />
            </span>
          ) : null}
        </div>
      </div>
      
      {/* Sub-ingredients (cascade) */}
      {isExpanded && ingredient.subIngredients && (
        <div className="mt-1">
          {ingredient.subIngredients.map(subIng => (
            <IngredientRowWithCascade
              key={subIng.item_id}
              ingredient={subIng}
              depth={depth + 1}
              path={[...path, subIng.item_id]}
              onToggle={onToggle}
              server={server}
            />
          ))}
        </div>
      )}
    </>
  );
};

// --- Helpers ---
const formatKamas = (k: number) => {
  return new Intl.NumberFormat('fr-FR').format(Math.round(k));
};

const getRoiColor = (roi: number) => {
  if (roi >= 50) return 'text-green-400 font-bold';
  if (roi >= 20) return 'text-green-300';
  if (roi > 0) return 'text-yellow-300';
  return 'text-red-400';
};

const isStale = (dateStr?: string) => {
  if (!dateStr) return true;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff > 7 * 24 * 60 * 60 * 1000; // 7 days
};

const BankCraftOpportunitiesPage: React.FC<BankCraftOpportunitiesPageProps> = ({ 
  server: propServer, 
  currentProfile,
  minPrice: globalMinPrice,
  maxPrice: globalMaxPrice,
  onlyFavorites,
  favorites
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [maxMissing, setMaxMissing] = useState<string>(searchParams.get('maxMissing') || '0');
  const [selectedJob, setSelectedJob] = useState<string>(searchParams.get('job') || '');
  const [minLevel, setMinLevel] = useState<string>(searchParams.get('minLevel') || '1');
  const [maxLevel, setMaxLevel] = useState<string>(searchParams.get('maxLevel') || '200');
  const [minRoi, setMinRoi] = useState<string>(searchParams.get('minRoi') || '');
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'margin_desc');
  const [hidePartialPrices, setHidePartialPrices] = useState<boolean>(searchParams.get('hidePartial') === 'true');

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 50;

  // Expanded rows (for ingredient details)
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Data Fetching
  const { data: jobs = [] } = useJobs();

  const filters: CraftOpportunityFilters = {
    server: propServer || '',
    profile_id: currentProfile?.id || null,
    max_missing: parseInt(maxMissing) || 0,
    min_level: parseInt(minLevel) || 0,
    max_level: parseInt(maxLevel) || 200,
    job_id: selectedJob ? parseInt(selectedJob) : undefined,
    min_roi: minRoi ? parseFloat(minRoi) : undefined,
    search: debouncedSearch || undefined,
    limit: limit,
    offset: (page - 1) * limit,
    sort_by: sortBy as CraftOpportunityFilters['sort_by']
  };

  const { 
    data: opportunities = [] as CraftOpportunity[], 
    isLoading: loading, 
    isFetching,
    error: queryError 
  } = useCraftOpportunities(filters);

  // Filter partial prices if toggle is on + global filters
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      // Filtre prix partiels
      if (hidePartialPrices && (o.sell_price <= 0 || o.total_craft_cost <= 0)) {
        return false;
      }

      // Filtres globaux par prix
      if (globalMinPrice) {
        const min = parseFloat(globalMinPrice);
        if (!isNaN(min) && o.sell_price < min) return false;
      }
      if (globalMaxPrice) {
        const max = parseFloat(globalMaxPrice);
        if (!isNaN(max) && o.sell_price > max) return false;
      }

      // Filtre global par favoris
      if (onlyFavorites && !favorites.has(o.result_item_name)) {
        return false;
      }

      return true;
    });
  }, [opportunities, hidePartialPrices, globalMinPrice, globalMaxPrice, onlyFavorites, favorites]);

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Une erreur est survenue' : null;

  // Sync URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (maxMissing !== '0') params.maxMissing = maxMissing;
    if (selectedJob) params.job = selectedJob;
    if (minLevel !== '1') params.minLevel = minLevel;
    if (maxLevel !== '200') params.maxLevel = maxLevel;
    if (minRoi) params.minRoi = minRoi;
    if (search) params.search = search;
    if (sortBy !== 'margin_desc') params.sortBy = sortBy;
    if (hidePartialPrices) params.hidePartial = 'true';
    setSearchParams(params, { replace: true });
  }, [maxMissing, selectedJob, minLevel, maxLevel, minRoi, search, sortBy, hidePartialPrices, setSearchParams]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [maxMissing, selectedJob, minLevel, maxLevel, minRoi, debouncedSearch, sortBy]);

  const handleRowClick = (opportunity: CraftOpportunity, e: React.MouseEvent) => {
    // Ctrl/Cmd click or middle click -> open in new tab
    if (e.ctrlKey || e.metaKey) {
      window.open(`/recipes/${opportunity.recipe_id}`, '_blank');
    } else {
      // Toggle expansion
      setExpandedRow(prev => prev === opportunity.recipe_id ? null : opportunity.recipe_id);
    }
  };

  const handleMiddleClick = (opportunity: CraftOpportunity, e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      window.open(`/recipes/${opportunity.recipe_id}`, '_blank');
    }
  };

  // --- Render ---

  if (!propServer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <AlertTriangle className="w-12 h-12 mb-4 text-yellow-500" />
        <p className="text-lg">Veuillez sélectionner un serveur pour accéder aux opportunités de craft.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/bank"
              className="p-2 rounded-lg bg-[#25262b] hover:bg-[#2c2e33] text-gray-400 hover:text-white transition-colors"
              title="Retour à la banque"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Hammer className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
              Opportunités de Craft
            </h1>
          </div>
          <p className="text-sm md:text-base text-gray-400 ml-12">
            Identifiez les recettes craftables avec votre banque sur {propServer}
            {currentProfile && <span className="text-blue-400"> • {currentProfile.name}</span>}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
        
        {/* Max Missing Ingredients */}
        <div className="w-48">
          <label className="block text-xs font-medium text-gray-400 mb-1">Ingrédients manquants</label>
          <div className="relative">
            <select
              value={maxMissing}
              onChange={(e) => setMaxMissing(e.target.value)}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500 transition-all"
            >
              <option value="0">0 (Craft complet)</option>
              <option value="1">1 max</option>
              <option value="2">2 max</option>
              <option value="3">3 max</option>
              <option value="5">5 max</option>
              <option value="99">Tous</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-400 mb-1">Recherche</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom de l'item..."
              className="w-full bg-[#25262b] border border-white/10 rounded-lg pl-9 pr-10 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Job Select */}
        <div className="w-48">
          <label className="block text-xs font-medium text-gray-400 mb-1">Métier</label>
          <div className="relative">
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500 transition-all"
            >
              <option value="">Tous les métiers</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Level Range */}
        <div className="flex gap-2 items-end">
          <div className="w-20">
            <label className="block text-xs font-medium text-gray-400 mb-1">Niveau Min</label>
            <input
              type="number"
              value={minLevel}
              onChange={(e) => setMinLevel(e.target.value)}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-gray-500 pb-2">-</span>
          <div className="w-20">
            <label className="block text-xs font-medium text-gray-400 mb-1">Max</label>
            <input
              type="number"
              value={maxLevel}
              onChange={(e) => setMaxLevel(e.target.value)}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Min ROI */}
        <div className="w-24">
          <label className="block text-xs font-medium text-gray-400 mb-1">ROI Min (%)</label>
          <input
            type="number"
            value={minRoi}
            onChange={(e) => setMinRoi(e.target.value)}
            placeholder="0"
            className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Sort */}
        <div className="w-44">
          <label className="block text-xs font-medium text-gray-400 mb-1">Trier par</label>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500 transition-all"
            >
              <option value="completeness_desc">Complétude ↓</option>
              <option value="margin_desc">Marge ↓</option>
              <option value="roi_desc">ROI ↓</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Partial Prices Toggle */}
        <div className="flex items-center h-10 pb-1">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${hidePartialPrices ? 'bg-blue-500 border-blue-500' : 'bg-[#25262b] border-white/10 group-hover:border-white/30'}`}>
              {hidePartialPrices && <X size={14} className="text-white" />}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={hidePartialPrices} 
              onChange={(e) => setHidePartialPrices(e.target.checked)} 
            />
            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Masquer prix incomplets</span>
          </label>
        </div>
      </div>

      {/* Results Table */}
      <div className={`bg-[#1a1b1e] border border-white/5 rounded-xl overflow-hidden relative ${(loading || isFetching) ? 'min-h-[300px]' : ''}`}>
        {(loading || isFetching) && (
          <div className="absolute inset-0 bg-[#1a1b1e]/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
            <div className="bg-[#25262b] p-4 rounded-xl border border-white/10 shadow-xl flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-400 font-medium">Chargement...</span>
            </div>
          </div>
        )}
        
        {/* Mobile Card View */}
        <div className="md:hidden">
          {filteredOpportunities.length === 0 && !loading && !isFetching ? (
            <div className="p-8 text-center text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune opportunité trouvée avec ces critères.</p>
              <p className="text-sm mt-1">Essayez d'augmenter le nombre d'ingrédients manquants autorisés.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredOpportunities.map((opportunity) => (
                <div key={opportunity.recipe_id}>
                  <div 
                    onClick={(e) => handleRowClick(opportunity, e)}
                    onMouseDown={(e) => handleMiddleClick(opportunity, e)}
                    className="p-4 hover:bg-[#25262b] transition-colors active:bg-[#25262b] cursor-pointer"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 bg-[#25262b] rounded-lg flex items-center justify-center overflow-hidden border border-white/5 text-gray-500 font-bold text-lg shrink-0">
                        {opportunity.result_item_icon ? (
                          <img 
                            src={opportunity.result_item_icon} 
                            alt={opportunity.result_item_name} 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          opportunity.result_item_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-base leading-tight mb-1">
                          {opportunity.result_item_name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>Niv. {opportunity.level}</span>
                          <span>•</span>
                          <span>{opportunity.job_name}</span>
                        </div>
                      </div>
                      <ChevronRight 
                        size={18} 
                        className={`text-gray-500 transition-transform ${expandedRow === opportunity.recipe_id ? 'rotate-90' : ''}`} 
                      />
                    </div>

                    {/* Completeness Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-400">Complétude</span>
                        <span className={opportunity.missing_ingredients === 0 ? 'text-green-400' : 'text-yellow-400'}>
                          {opportunity.owned_ingredients}/{opportunity.total_ingredients} ingrédients
                        </span>
                      </div>
                      <div className="h-2 bg-[#25262b] rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${opportunity.missing_ingredients === 0 ? 'bg-green-500' : 'bg-yellow-500'}`}
                          style={{ width: `${opportunity.completeness_pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
                      {/* Row 1: Missing Cost & Sell Price */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">À acheter</div>
                        {opportunity.missing_cost > 0 ? (
                          <div className="font-mono text-yellow-300 flex items-center gap-1">
                            {formatKamas(opportunity.missing_cost)} 
                            <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                          </div>
                        ) : (
                          <div className="font-mono text-gray-500">-</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">Prix Vente</div>
                        <div className="font-mono text-gray-300 flex items-center justify-end gap-1">
                          {formatKamas(opportunity.sell_price)}
                          <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                        </div>
                        {isStale(opportunity.result_item_last_update) && opportunity.sell_price > 0 && (
                          <div className="text-[10px] text-yellow-500/80 flex items-center justify-end gap-1 mt-1">
                            <Clock size={10} />
                            <span>Obsolète</span>
                          </div>
                        )}
                      </div>

                      {/* Row 2: ROI & Margin */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">ROI</div>
                        <div className={`font-mono font-bold ${getRoiColor(opportunity.roi)}`}>
                          {opportunity.roi.toFixed(1)}%
                        </div>
                        {/* Labels de fiabilité ROI */}
                        {isStale(opportunity.result_item_last_update) && opportunity.sell_price > 0 && (
                          <div className="text-[10px] text-yellow-500/80 flex items-center gap-1 mt-1">
                            <Clock size={10} />
                            <span>Obsolète</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">Marge</div>
                        <div className={`font-mono font-medium flex items-center justify-end gap-1 ${opportunity.margin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {opportunity.margin > 0 ? '+' : ''}{formatKamas(opportunity.margin)}
                          <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                        </div>
                        {/* Labels de fiabilité Marge */}
                        {isStale(opportunity.result_item_last_update) && opportunity.sell_price > 0 && (
                          <div className="text-[10px] text-yellow-500/80 flex items-center justify-end gap-1 mt-1">
                            <Clock size={10} />
                            <span>Obsolète</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Ingredient Details (expandable) */}
                  <IngredientDetails
                    recipeId={opportunity.recipe_id}
                    server={propServer}
                    profileId={currentProfile?.id || null}
                    isOpen={expandedRow === opportunity.recipe_id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#25262b] text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="p-4 font-medium">Item</th>
                <th className="p-4 font-medium">Métier</th>
                <th className="p-4 font-medium text-center">Complétude</th>
                <th className="p-4 font-medium text-right">À acheter</th>
                <th className="p-4 font-medium text-right">Coût Total</th>
                <th className="p-4 font-medium text-right">Prix Vente</th>
                <th className="p-4 font-medium text-right">Marge</th>
                <th className="p-4 font-medium text-right">ROI</th>
                <th className="p-4 font-medium text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOpportunities.length === 0 && !loading && !isFetching ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune opportunité trouvée avec ces critères.</p>
                    <p className="text-sm mt-1">Essayez d'augmenter le nombre d'ingrédients manquants autorisés.</p>
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((opportunity) => (
                  <React.Fragment key={opportunity.recipe_id}>
                    <tr 
                      onClick={(e) => handleRowClick(opportunity, e)}
                      onMouseDown={(e) => handleMiddleClick(opportunity, e)}
                      className={`hover:bg-[#25262b] transition-colors group cursor-pointer ${expandedRow === opportunity.recipe_id ? 'bg-[#25262b]' : ''}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#25262b] rounded-lg flex items-center justify-center overflow-hidden border border-white/5 text-gray-500 font-bold text-lg">
                            {opportunity.result_item_icon ? (
                              <img 
                                src={opportunity.result_item_icon} 
                                alt={opportunity.result_item_name} 
                                className="w-full h-full object-contain" 
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              opportunity.result_item_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                              {opportunity.result_item_name}
                            </div>
                            <div className="text-xs text-gray-500">Niv. {opportunity.level}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">
                        <span>{opportunity.job_name}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-medium ${opportunity.missing_ingredients === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {opportunity.owned_ingredients}/{opportunity.total_ingredients}
                          </span>
                          <div className="w-16 h-1.5 bg-[#25262b] rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${opportunity.missing_ingredients === 0 ? 'bg-green-500' : 'bg-yellow-500'}`}
                              style={{ width: `${opportunity.completeness_pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-yellow-300">
                        {opportunity.missing_cost > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            {formatKamas(opportunity.missing_cost)} 
                            <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono text-gray-300">
                        <div className="flex items-center justify-end gap-1">
                          {formatKamas(opportunity.total_craft_cost)} 
                          <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-gray-300">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center justify-end gap-1">
                            {formatKamas(opportunity.sell_price)}
                            <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                          </div>
                          {isStale(opportunity.result_item_last_update) && opportunity.sell_price > 0 && (
                            <div className="text-xs text-yellow-500/80 flex items-center justify-end gap-1">
                              <Clock size={10} />
                              <span>Obsolète</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`p-4 text-right font-mono font-medium ${opportunity.margin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center justify-end gap-1">
                            {opportunity.margin > 0 ? '+' : ''}{formatKamas(opportunity.margin)}
                            <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                          </div>
                          {isStale(opportunity.result_item_last_update) && opportunity.sell_price > 0 && (
                            <div className="text-xs text-yellow-500/80 flex items-center justify-end gap-1" title="Marge basée sur un prix de vente potentiellement obsolète">
                              <Clock size={10} />
                              <span>Obsolète</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`p-4 text-right font-mono font-bold ${getRoiColor(opportunity.roi)}`}>
                        <div className="flex flex-col items-end gap-1">
                          <div>{opportunity.roi.toFixed(1)}%</div>
                          {isStale(opportunity.result_item_last_update) && opportunity.sell_price > 0 && (
                            <div className="text-xs font-normal text-yellow-500/80 flex items-center justify-end gap-1" title="ROI basé sur un prix de vente potentiellement obsolète">
                              <Clock size={10} />
                              <span>Obsolète</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <ChevronRight 
                          size={16} 
                          className={`text-gray-500 transition-transform ${expandedRow === opportunity.recipe_id ? 'rotate-90' : ''}`} 
                        />
                      </td>
                    </tr>
                    {/* Expanded Row for Ingredients */}
                    {expandedRow === opportunity.recipe_id && (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <IngredientDetails
                            recipeId={opportunity.recipe_id}
                            server={propServer}
                            profileId={currentProfile?.id || null}
                            isOpen={true}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between bg-[#1a1b1e]">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-4 py-2 text-sm font-medium text-gray-400 bg-[#25262b] rounded-lg hover:bg-[#2c2e33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-400">
            Page {page}
            {filteredOpportunities.length > 0 && (
              <span className="text-gray-600"> • {filteredOpportunities.length} résultats</span>
            )}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={opportunities.length < limit || loading}
            className="px-4 py-2 text-sm font-medium text-gray-400 bg-[#25262b] rounded-lg hover:bg-[#2c2e33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
};

export default BankCraftOpportunitiesPage;
