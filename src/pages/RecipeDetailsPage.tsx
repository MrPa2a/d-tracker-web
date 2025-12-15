import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Hammer, Loader2, Coins, TrendingUp, Edit2, Save, X, Trash2, Plus, Search, Clock } from 'lucide-react';
import { useRecipeDetails } from '../hooks/useRecipes';
import { useTimeseries } from '../hooks/useTimeseries';
import { updateRecipe, fetchItems } from '../api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DateRangePreset, RecipeIngredient, ItemSummary } from '../types';
import kamaIcon from '../assets/kama.png';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface RecipeDetailsPageProps {
  server: string | null;
  dateRange: DateRangePreset;
}

const RecipeDetailsPage: React.FC<RecipeDetailsPageProps> = ({ server, dateRange }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const recipeId = parseInt(id || '0');

  const { data: recipe, isLoading, error } = useRecipeDetails(recipeId, server);
  const { data: timeseries } = useTimeseries(
    recipe?.result_item_name || '', 
    server || '', 
    dateRange,
    { enabled: !!recipe?.result_item_name && !!server }
  );

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editedIngredients, setEditedIngredients] = useState<RecipeIngredient[]>([]);
  
  // Add Ingredient State
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ItemSummary[]>([]);

  // Search Effect
  useEffect(() => {
    if (searchQuery.length < 3) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await fetchItems(searchQuery, server || undefined);
        setSearchResults(results.slice(0, 5));
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, server]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = editedIngredients.map(ing => ({
        item_id: ing.item_id,
        quantity: ing.quantity
      }));
      await updateRecipe(recipeId, payload);
    },
    onSuccess: () => {
      // Invalidate specific recipe details
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      // Invalidate recipe lists (margins changed)
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      // Invalidate item usages (ingredients usage changed)
      queryClient.invalidateQueries({ queryKey: ['item-usages'] });
      // Invalidate item recipe (if this item is viewed elsewhere)
      queryClient.invalidateQueries({ queryKey: ['item-recipe'] });
      
      setIsEditing(false);
      setIsAddingIngredient(false);
    },
  });

  const handleQuantityChange = (itemId: number, newQty: number) => {
    setEditedIngredients(prev => 
      prev.map(ing => ing.item_id === itemId ? { ...ing, quantity: Math.max(1, newQty) } : ing)
    );
  };

  const handleDeleteIngredient = (itemId: number) => {
    setEditedIngredients(prev => prev.filter(ing => ing.item_id !== itemId));
  };

  const handleAddIngredient = (item: ItemSummary) => {
    // Check if already exists
    if (editedIngredients.some(ing => ing.item_id === item.id)) {
      alert("Cet ingrédient est déjà dans la recette.");
      return;
    }

    const newIngredient: RecipeIngredient = {
      item_id: item.id,
      name: item.item_name,
      icon_url: item.icon_url,
      quantity: 1,
      price: item.last_price || 0,
      total_price: item.last_price || 0,
    };
    setEditedIngredients(prev => [...prev, newIngredient]);
    setIsAddingIngredient(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSave = () => {
    updateMutation.mutate();
  };

  const handleCancel = () => {
    if (recipe) {
      setEditedIngredients(recipe.ingredients);
    }
    setIsEditing(false);
    setIsAddingIngredient(false);
  };

  const formatKamas = (k: number) => {
    return new Intl.NumberFormat('fr-FR').format(Math.round(k));
  };

  const getRoiColor = (roi: number) => {
    if (roi >= 50) return 'text-green-400';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <AlertTriangle className="w-12 h-12 mb-4 text-red-500" />
        <p className="text-lg">Impossible de charger la recette.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-400 hover:underline">
          Retour
        </button>
      </div>
    );
  }

  const hasMissingPrices = recipe.ingredients_with_price < recipe.ingredients_count;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-[#25262b] hover:bg-[#2c2e33] text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              {server ? (
                <Link 
                  to={`/item/${server}/${recipe.result_item_name}`}
                  className="flex items-center gap-3 hover:text-blue-400 transition-colors group"
                  title="Voir les détails de l'item"
                >
                  {recipe.result_item_icon ? (
                    <img src={recipe.result_item_icon} alt="" className="w-8 h-8 object-contain" />
                  ) : (
                    <div className="w-8 h-8 bg-[#25262b] rounded flex items-center justify-center text-gray-500 font-bold">
                      {recipe.result_item_name.charAt(0)}
                    </div>
                  )}
                  <span className="">
                    {recipe.result_item_name}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  {recipe.result_item_icon ? (
                    <img src={recipe.result_item_icon} alt="" className="w-8 h-8 object-contain" />
                  ) : (
                    <div className="w-8 h-8 bg-[#25262b] rounded flex items-center justify-center text-gray-500 font-bold">
                      {recipe.result_item_name.charAt(0)}
                    </div>
                  )}
                  {recipe.result_item_name}
                </div>
              )}
            </h1>
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
              <Hammer size={14} />
              <span>{recipe.job_name} (Niv. {recipe.level})</span>
            </div>
          </div>
        </div>

        {/* Edit Controls */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button 
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                disabled={updateMutation.isPending}
              >
                <X size={16} />
                Annuler
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Sauvegarder
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                setEditedIngredients(recipe.ingredients);
                setIsEditing(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              <Edit2 size={16} />
              Modifier la recette
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4">
          <div className="text-gray-400 text-xs uppercase font-medium mb-1 flex items-center justify-between">
            Prix de Vente
            {isStale(recipe.result_item_last_update) && recipe.sell_price > 0 && (
              <div className="text-yellow-500 cursor-help" title={`Prix potentiellement obsolète (Dernière maj : ${formatDate(recipe.result_item_last_update)})`}>
                <Clock size={14} />
              </div>
            )}
          </div>
          <div className="text-2xl font-bold text-white flex items-center gap-1">
            {formatKamas(recipe.sell_price)}
            <img src={kamaIcon} alt="k" className="w-5 h-5 opacity-70" />
          </div>
        </div>

        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 relative overflow-hidden">
          <div className="text-gray-400 text-xs uppercase font-medium mb-1">Coût de Craft</div>
          <div className="text-2xl font-bold text-white flex items-center gap-1">
            {formatKamas(recipe.craft_cost)}
            <img src={kamaIcon} alt="k" className="w-5 h-5 opacity-70" />
          </div>
          {hasMissingPrices && (
            <div className="absolute top-2 right-2 text-yellow-500" title="Prix partiels">
              <AlertTriangle size={16} />
            </div>
          )}
        </div>

        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4">
          <div className="text-gray-400 text-xs uppercase font-medium mb-1">Marge</div>
          <div className={`text-2xl font-bold flex items-center gap-1 ${recipe.margin > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {recipe.margin > 0 ? '+' : ''}{formatKamas(recipe.margin)}
            <img src={kamaIcon} alt="k" className="w-5 h-5 opacity-70" />
          </div>
        </div>

        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4">
          <div className="text-gray-400 text-xs uppercase font-medium mb-1">ROI</div>
          <div className={`text-2xl font-bold ${getRoiColor(recipe.roi)}`}>
            {recipe.roi.toFixed(1)}%
          </div>
        </div>
      </div>

      {hasMissingPrices && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3 text-yellow-200">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <p className="text-sm">
            Attention, certains ingrédients n'ont pas de prix connu sur ce serveur. Le coût de craft est sous-estimé.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingredients Table */}
        <div className="lg:col-span-2 bg-[#1a1b1e] border border-white/5 rounded-xl flex flex-col relative">
          <div className="p-4 border-b border-white/5 flex items-center justify-between rounded-t-xl bg-[#1a1b1e]">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-blue-500" />
              Ingrédients
            </h2>
            <span className="text-sm text-gray-400">{recipe.ingredients.length} items</span>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#25262b] text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="p-4 font-medium">Item</th>
                  <th className="p-4 font-medium text-right">Qté</th>
                  <th className="p-4 font-medium text-right">Prix Unit.</th>
                  <th className="p-4 font-medium text-right">Total</th>
                  <th className="p-4 font-medium text-right">% Coût</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(isEditing ? editedIngredients : recipe.ingredients).map((ing) => {
                  const percentCost = recipe.craft_cost > 0 ? (ing.total_price / recipe.craft_cost) * 100 : 0;
                  return (
                    <tr key={ing.item_id} className="hover:bg-[#25262b] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#25262b] rounded-lg flex items-center justify-center overflow-hidden border border-white/5">
                            {ing.icon_url ? (
                              <img src={ing.icon_url} alt={ing.name} className="w-full h-full object-contain" />
                            ) : (
                              <div className="text-gray-500 font-bold">{ing.name.charAt(0)}</div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            {server ? (
                              <Link 
                                to={`/item/${server}/${ing.name}`}
                                className="font-medium text-gray-200 hover:text-blue-400 transition-colors"
                              >
                                {ing.name}
                              </Link>
                            ) : (
                              <span className="font-medium text-gray-200">{ing.name}</span>
                            )}
                            {ing.ingredient_recipe_id && (
                              <Link 
                                to={`/recipes/${ing.ingredient_recipe_id}`}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-0.5"
                              >
                                <Hammer size={10} />
                                Voir la recette
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right text-gray-300 font-mono">
                        {isEditing ? (
                          <input 
                            type="number" 
                            min="1"
                            value={ing.quantity}
                            onChange={(e) => handleQuantityChange(ing.item_id, parseInt(e.target.value) || 1)}
                            className="w-20 bg-[#1a1b1e] border border-white/10 rounded px-2 py-1 text-right focus:outline-none focus:border-blue-500"
                          />
                        ) : (
                          `x${ing.quantity}`
                        )}
                      </td>
                      <td className="p-4 text-right text-gray-300 font-mono">
                        <div className="flex items-center justify-end gap-2">
                          {ing.price > 0 ? formatKamas(ing.price) : <span className="text-red-400">???</span>}
                          {isStale(ing.last_update) && ing.price > 0 && (
                            <div className="text-yellow-500/70 cursor-help" title={`Prix potentiellement obsolète (Dernière maj : ${formatDate(ing.last_update)})`}>
                              <Clock size={12} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right text-gray-200 font-mono font-medium">
                        {ing.total_price > 0 ? formatKamas(ing.total_price) : '-'}
                      </td>
                      <td className="p-4 text-right">
                        {isEditing ? (
                          <button 
                            onClick={() => handleDeleteIngredient(ing.item_id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Supprimer l'ingrédient"
                          >
                            <Trash2 size={18} />
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-400 w-8">{percentCost.toFixed(0)}%</span>
                            <div className="w-16 h-1.5 bg-[#25262b] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500/50 rounded-full" 
                                style={{ width: `${percentCost}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isEditing && (
            <div className="p-4 border-t border-white/5 bg-[#1a1b1e] rounded-b-xl relative z-20">
              {!isAddingIngredient ? (
                <button
                  onClick={() => setIsAddingIngredient(true)}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Ajouter un ingrédient
                </button>
              ) : (
                <div className="relative max-w-md">
                  <div className="flex items-center gap-2 bg-[#1a1b1e] border border-white/10 rounded-lg px-3 py-2 focus-within:border-blue-500/50 transition-colors">
                    <Search size={16} className="text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        if (val.length < 3) setSearchResults([]);
                      }}
                      placeholder="Rechercher un item..."
                      className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-gray-600"
                      autoFocus
                    />
                    <button onClick={() => setIsAddingIngredient(false)} className="text-gray-500 hover:text-white">
                        <X size={16} />
                    </button>
                  </div>
                  
                  {/* Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute bottom-full left-0 w-full mb-1 bg-[#25262b] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                      {searchResults.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleAddIngredient(item)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left transition-colors border-b border-white/5 last:border-0"
                        >
                          <div className="w-8 h-8 bg-[#1a1b1e] rounded flex items-center justify-center overflow-hidden">
                              {item.icon_url ? <img src={item.icon_url} alt="" className="w-full h-full object-contain" /> : <span className="text-gray-500 font-bold">{item.item_name[0]}</span>}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{item.item_name}</div>
                            {item.last_price > 0 && (
                              <div className="text-xs text-gray-400">{formatKamas(item.last_price)} k</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 flex flex-col h-[400px]">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Historique Prix Vente
          </h2>
          <div className="flex-1 min-h-0">
            {timeseries && timeseries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeseries}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#9ca3af', fontSize: 10 }} 
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1b1e', borderColor: '#ffffff10', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(val: number) => [formatKamas(val), 'Prix Moyen']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avg_price" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                Pas de données historiques disponibles
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailsPage;
