import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Hammer, Loader2, Coins, TrendingUp } from 'lucide-react';
import { useRecipeDetails } from '../hooks/useRecipes';
import { useTimeseries } from '../hooks/useTimeseries';
import type { DateRangePreset } from '../types';
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
  const recipeId = parseInt(id || '0');

  const { data: recipe, isLoading, error } = useRecipeDetails(recipeId, server);
  const { data: timeseries } = useTimeseries(
    recipe?.result_item_name || '', 
    server || '', 
    dateRange,
    { enabled: !!recipe?.result_item_name && !!server }
  );

  const formatKamas = (k: number) => {
    return new Intl.NumberFormat('fr-FR').format(Math.round(k));
  };

  const getRoiColor = (roi: number) => {
    if (roi >= 50) return 'text-green-400';
    if (roi >= 20) return 'text-green-300';
    if (roi > 0) return 'text-yellow-300';
    return 'text-red-400';
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
      <div className="flex items-center gap-4 mb-2">
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

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4">
          <div className="text-gray-400 text-xs uppercase font-medium mb-1">Prix de Vente</div>
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
        <div className="lg:col-span-2 bg-[#1a1b1e] border border-white/5 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
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
                {recipe.ingredients.map((ing) => {
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
                      <td className="p-4 text-right text-gray-300 font-mono">x{ing.quantity}</td>
                      <td className="p-4 text-right text-gray-300 font-mono">
                        {ing.price > 0 ? formatKamas(ing.price) : <span className="text-red-400">???</span>}
                      </td>
                      <td className="p-4 text-right text-gray-200 font-mono font-medium">
                        {ing.total_price > 0 ? formatKamas(ing.total_price) : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-400 w-8">{percentCost.toFixed(0)}%</span>
                          <div className="w-16 h-1.5 bg-[#25262b] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500/50 rounded-full" 
                              style={{ width: `${percentCost}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
