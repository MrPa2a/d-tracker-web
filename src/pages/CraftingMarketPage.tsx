import React, { useState, useEffect } from 'react';
import { useJobs, useRecipes } from '../hooks/useRecipes';
import type { RecipeFilters, RecipeStats } from '../types';
import { Search, Hammer, AlertTriangle, ChevronDown, Loader2, Clock, X, Plus } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import kamaIcon from '../assets/kama.png';
import { AddRecipeModal } from '../components/AddRecipeModal';

interface CraftingMarketPageProps {
  server: string | null;
}

const CraftingMarketPage: React.FC<CraftingMarketPageProps> = ({ server: propServer }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filters
  const [selectedJob, setSelectedJob] = useState<string>(searchParams.get('job') || '');
  const [minLevel, setMinLevel] = useState<string>(searchParams.get('minLevel') || '1');
  const [maxLevel, setMaxLevel] = useState<string>(searchParams.get('maxLevel') || '200');
  const [minRoi, setMinRoi] = useState<string>(searchParams.get('minRoi') || '15');
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'margin_desc');

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 50;

  const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Data Fetching
  const { data: jobs = [] } = useJobs();

  const filters: RecipeFilters = {
    server: propServer || '',
    min_level: parseInt(minLevel) || 0,
    max_level: parseInt(maxLevel) || 200,
    job_id: selectedJob ? parseInt(selectedJob) : undefined,
    min_roi: parseInt(minRoi) || 0,
    search: debouncedSearch || undefined,
    limit: limit,
    offset: (page - 1) * limit,
    sort_by: sortBy as RecipeFilters['sort_by']
  };

  const { 
    data: recipes = [] as RecipeStats[], 
    isLoading: loading, 
    isFetching,
    error: queryError 
  } = useRecipes(filters);

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Une erreur est survenue' : null;

  // Sync URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedJob) params.job = selectedJob;
    if (minLevel) params.minLevel = minLevel;
    if (maxLevel) params.maxLevel = maxLevel;
    if (minRoi) params.minRoi = minRoi;
    if (search) params.search = search;
    if (sortBy) params.sortBy = sortBy;
    setSearchParams(params, { replace: true });
  }, [selectedJob, minLevel, maxLevel, minRoi, search, sortBy, setSearchParams]);


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
    return diff > 24 * 60 * 60 * 1000; // 24 hours
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleString();
  };

  // --- Render ---

  if (!propServer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <AlertTriangle className="w-12 h-12 mb-4 text-yellow-500" />
        <p className="text-lg">Veuillez sélectionner un serveur pour accéder au marché des artisans.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6">
      <div className="mb-6 md:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Hammer className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
            Marché des Artisans
          </h1>
          <p className="text-sm md:text-base text-gray-400 mt-2">
            Identifiez les recettes les plus rentables à crafter sur {propServer}.
          </p>
        </div>
        <button
          onClick={() => setIsAddRecipeModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span className="hidden md:inline">Ajouter une recette</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
        
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
            className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Sort */}
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1">Trier par</label>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500 transition-all"
            >
              <option value="margin_desc">Marge (High)</option>
              <option value="roi_desc">ROI (High)</option>
              <option value="level_desc">Niveau (High)</option>
              <option value="cost_asc">Coût (Low)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
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
          {recipes.length === 0 && !loading && !isFetching ? (
            <div className="p-8 text-center text-gray-400">Aucune recette trouvée avec ces critères.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {recipes.map((recipe) => (
                <div 
                  key={recipe.recipe_id}
                  onClick={() => navigate(`/recipes/${recipe.recipe_id}`)}
                  className="p-4 hover:bg-[#25262b] transition-colors active:bg-[#25262b]"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-[#25262b] rounded-lg flex items-center justify-center overflow-hidden border border-white/5 text-gray-500 font-bold text-lg shrink-0">
                      {recipe.result_item_icon ? (
                        <img 
                          src={recipe.result_item_icon} 
                          alt={recipe.result_item_name} 
                          className="w-full h-full object-contain" 
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        recipe.result_item_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-base leading-tight mb-1">
                        {recipe.result_item_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Niv. {recipe.level}</span>
                        <span>•</span>
                        <span>{recipe.job_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
                    {/* Row 1: Cost & Sell Price */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Coût Craft</div>
                      <div className="font-mono text-gray-300 flex items-center gap-1">
                        {formatKamas(recipe.craft_cost)} 
                        <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                      </div>
                      {(isStale(recipe.ingredients_last_update) || recipe.ingredients_with_price < recipe.ingredients_count) && (
                        <div className="flex flex-col gap-0.5 mt-1">
                          {isStale(recipe.ingredients_last_update) && recipe.craft_cost > 0 && (
                            <div className="text-[10px] text-yellow-500/80 flex items-center gap-1">
                              <Clock size={10} />
                              <span>Obsolète</span>
                            </div>
                          )}
                          {recipe.ingredients_with_price < recipe.ingredients_count && (
                            <div className="text-[10px] text-yellow-500/80 flex items-center gap-1">
                              <AlertTriangle size={10} />
                              <span>Partiel ({recipe.ingredients_with_price}/{recipe.ingredients_count})</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Prix Vente</div>
                      <div className="font-mono text-gray-300 flex items-center justify-end gap-1">
                        {formatKamas(recipe.sell_price)}
                        <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                      </div>
                      {isStale(recipe.result_item_last_update) && recipe.sell_price > 0 && (
                        <div className="text-[10px] text-yellow-500/80 flex items-center justify-end gap-1 mt-1">
                          <Clock size={10} />
                          <span>Obsolète</span>
                        </div>
                      )}
                    </div>

                    {/* Row 2: ROI & Margin */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">ROI</div>
                      <div className={`font-mono font-bold ${getRoiColor(recipe.roi)}`}>
                        {recipe.roi.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Marge</div>
                      <div className={`font-mono font-medium flex items-center justify-end gap-1 ${recipe.margin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {recipe.margin > 0 ? '+' : ''}{formatKamas(recipe.margin)}
                        <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                      </div>
                    </div>
                  </div>
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
                <th className="p-4 font-medium text-right">Coût Craft</th>
                <th className="p-4 font-medium text-right">Prix Vente</th>
                <th className="p-4 font-medium text-right">Marge</th>
                <th className="p-4 font-medium text-right">ROI</th>
                <th className="p-4 font-medium text-center">Ingrédients</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recipes.length === 0 && !loading && !isFetching ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">Aucune recette trouvée avec ces critères.</td>
                </tr>
              ) : (
                recipes.map((recipe) => (
                  <tr 
                    key={recipe.recipe_id} 
                    onClick={() => navigate(`/recipes/${recipe.recipe_id}`)}
                    className="hover:bg-[#25262b] transition-colors group cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#25262b] rounded-lg flex items-center justify-center overflow-hidden border border-white/5 text-gray-500 font-bold text-lg">
                          {recipe.result_item_icon ? (
                            <img 
                              src={recipe.result_item_icon} 
                              alt={recipe.result_item_name} 
                              className="w-full h-full object-contain" 
                              referrerPolicy="no-referrer"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            recipe.result_item_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                            {recipe.result_item_name}
                          </div>
                          <div className="text-xs text-gray-500">Niv. {recipe.level}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-300">
                      <div className="flex items-center gap-2">
                        <span>{recipe.job_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-gray-300">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center justify-end gap-1">
                          {formatKamas(recipe.craft_cost)} 
                          <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                        </div>
                        {isStale(recipe.ingredients_last_update) && recipe.craft_cost > 0 && (
                          <div className="text-xs text-yellow-500/80 flex items-center justify-end gap-1" title={`Prix ingrédients potentiellement obsolètes (Plus vieux : ${formatDate(recipe.ingredients_last_update)})`}>
                            <Clock size={10} />
                            <span>Obsolète</span>
                          </div>
                        )}
                        {recipe.ingredients_with_price < recipe.ingredients_count && (
                          <div className="text-xs text-yellow-500/80 flex items-center justify-end gap-1">
                            <AlertTriangle size={10} />
                            <span>Prix partiels</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-gray-300">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center justify-end gap-1">
                          {formatKamas(recipe.sell_price)}
                          <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                        </div>
                        {isStale(recipe.result_item_last_update) && recipe.sell_price > 0 && (
                          <div className="text-xs text-yellow-500/80 flex items-center justify-end gap-1" title={`Prix potentiellement obsolète (Dernière maj : ${formatDate(recipe.result_item_last_update)})`}>
                            <Clock size={10} />
                            <span>Obsolète</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`p-4 text-right font-mono font-medium ${recipe.margin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {recipe.margin > 0 ? '+' : ''}{formatKamas(recipe.margin)}
                        <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                      </div>
                    </td>
                    <td className={`p-4 text-right font-mono font-bold ${getRoiColor(recipe.roi)}`}>
                      {recipe.roi.toFixed(1)}%
                    </td>
                    <td className="p-4 text-center text-gray-400 text-sm">
                      {recipe.ingredients_with_price}/{recipe.ingredients_count}
                    </td>
                  </tr>
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
          <span className="text-sm text-gray-400">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={recipes.length < limit || loading}
            className="px-4 py-2 text-sm font-medium text-gray-400 bg-[#25262b] rounded-lg hover:bg-[#2c2e33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Suivant
          </button>
        </div>
      </div>

      <AddRecipeModal 
        isOpen={isAddRecipeModalOpen} 
        onClose={() => setIsAddRecipeModalOpen(false)} 
      />
    </div>
  );
};

export default CraftingMarketPage;
