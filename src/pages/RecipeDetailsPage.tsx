import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Hammer, Loader2, Coins, TrendingUp, Edit2, Save, X, Trash2, Plus, Search, Clock, Minus, ChevronsDown, ChevronsUp } from 'lucide-react';
import { useRecipeDetails, useItemRecipe } from '../hooks/useRecipes';
import { useTimeseries } from '../hooks/useTimeseries';
import { updateRecipe, fetchItems, fetchRecipeDetails } from '../api';
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

interface ExtendedRecipeIngredient extends RecipeIngredient {
  isExpanded?: boolean;
  subRecipe?: {
    ingredients: ExtendedRecipeIngredient[];
    craft_cost: number;
  };
  isLoadingSubRecipe?: boolean;
}

// Helper to update the tree immutably
const updateIngredientInTree = (
  ingredients: ExtendedRecipeIngredient[],
  path: number[],
  updater: (ing: ExtendedRecipeIngredient) => ExtendedRecipeIngredient
): ExtendedRecipeIngredient[] => {
  if (path.length === 0) return ingredients;

  const [currentId, ...restPath] = path;

  return ingredients.map(ing => {
    if (ing.item_id !== currentId) return ing;

    if (restPath.length === 0) {
      return updater(ing);
    }

    if (ing.subRecipe) {
      return {
        ...ing,
        subRecipe: {
          ...ing.subRecipe,
          ingredients: updateIngredientInTree(ing.subRecipe.ingredients, restPath, updater)
        }
      };
    }

    return ing;
  });
};

// Helper to calculate recursive cost
const calculateRecursiveCost = (ingredients: ExtendedRecipeIngredient[]): number => {
  return ingredients.reduce((total, ing) => {
    if (ing.isExpanded && ing.subRecipe) {
      return total + calculateRecursiveCost(ing.subRecipe.ingredients) * ing.quantity;
    }
    return total + ing.total_price;
  }, 0);
};

// Helper to calculate recursive item count
const calculateRecursiveItemCount = (ingredients: ExtendedRecipeIngredient[]): number => {
  return ingredients.reduce((total, ing) => {
    if (ing.isExpanded && ing.subRecipe) {
      return total + calculateRecursiveItemCount(ing.subRecipe.ingredients);
    }
    return total + 1;
  }, 0);
};

const formatKamas = (k: number) => {
    return new Intl.NumberFormat('fr-FR').format(Math.round(k));
};

interface RecipeDetailsPageProps {
  server: string | null;
  dateRange: DateRangePreset;
}

// Recursive Row Component
const IngredientRow = ({ 
    ingredient, 
    depth, 
    path, 
    onToggle, 
    server, 
    adjustedCraftCost 
}: { 
    ingredient: ExtendedRecipeIngredient, 
    depth: number, 
    path: number[], 
    onToggle: (path: number[]) => void, 
    server: string | null, 
    adjustedCraftCost: number 
}) => {
    const isExpanded = ingredient.isExpanded;
    const subRecipeCost = isExpanded && ingredient.subRecipe ? calculateRecursiveCost(ingredient.subRecipe.ingredients) : 0;
    const percentCost = adjustedCraftCost > 0 ? ((isExpanded ? subRecipeCost * ingredient.quantity : ingredient.total_price) / adjustedCraftCost) * 100 : 0;

    return (
        <>
            <tr 
                className="transition-colors hover:!bg-white/10"
                style={{ backgroundColor: `rgba(255, 255, 255, ${(depth * 0.012) + (isExpanded ? 0.035 : 0)})` }}
            >
                <td className="p-4" style={{ paddingLeft: `${1 + depth * 2}rem` }}>
                    <div className="flex items-center gap-3 relative">
                        {depth > 0 && (
                             <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-px bg-gray-600"></div>
                        )}
                        <div className="w-10 h-10 bg-[#25262b] rounded-lg flex items-center justify-center overflow-hidden border border-white/5 shrink-0">
                            {ingredient.icon_url ? (
                                <img 
                                    src={ingredient.icon_url} 
                                    alt={ingredient.name} 
                                    className="w-full h-full object-contain" 
                                    referrerPolicy="no-referrer"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            ) : (
                                <div className="text-gray-500 font-bold">{ingredient.name.charAt(0)}</div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            {server ? (
                                <Link 
                                    to={ingredient.ingredient_recipe_id ? `/recipes/${ingredient.ingredient_recipe_id}` : `/item/${server}/${ingredient.name}`}
                                    className="font-medium text-gray-200 hover:text-blue-400 transition-colors"
                                >
                                    {ingredient.name}
                                </Link>
                            ) : (
                                <span className="font-medium text-gray-200">{ingredient.name}</span>
                            )}
                            {ingredient.ingredient_recipe_id && (
                                <div className="flex items-center gap-3 mt-0.5">
                                    <button
                                        onClick={() => onToggle(path)}
                                        className={`text-xs flex items-center gap-1 cursor-pointer ${isExpanded ? "text-orange-400 hover:text-orange-300" : "text-green-400 hover:text-green-300"}`}
                                        disabled={ingredient.isLoadingSubRecipe}
                                    >
                                        {ingredient.isLoadingSubRecipe ? (
                                            <Loader2 size={10} className="animate-spin" />
                                        ) : isExpanded ? (
                                            <Minus size={10} />
                                        ) : (
                                            <Plus size={10} />
                                        )}
                                        {isExpanded ? "Exclure la recette" : "Inclure la recette"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </td>
                <td className="p-4 text-right text-gray-300 font-mono">
                    x{ingredient.quantity}
                </td>
                <td className="p-4 text-right text-gray-300 font-mono">
                    <div className="flex items-center justify-end gap-2">
                        {ingredient.price > 0 ? formatKamas(ingredient.price) : <span className="text-red-400">???</span>}
                        {/* We could pass isStale logic here if needed, but let's skip for brevity or pass it down */}
                    </div>
                </td>
                <td className="p-4 text-right text-gray-200 font-mono font-medium">
                    {isExpanded ? (
                        <span className={subRecipeCost > ingredient.price ? "text-red-400" : "text-blue-400"}>
                            {formatKamas(subRecipeCost * ingredient.quantity)}
                        </span>
                    ) : (
                        ingredient.total_price > 0 ? formatKamas(ingredient.total_price) : '-'
                    )}
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
            {isExpanded && ingredient.subRecipe && ingredient.subRecipe.ingredients.map(subIng => (
                <IngredientRow 
                    key={subIng.item_id} 
                    ingredient={subIng} 
                    depth={depth + 1} 
                    path={[...path, subIng.item_id]}
                    onToggle={onToggle}
                    server={server}
                    adjustedCraftCost={adjustedCraftCost}
                />
            ))}
        </>
    );
};

// Mobile Row Component
const MobileIngredientRow = ({ 
    ingredient, 
    depth, 
    path, 
    onToggle, 
    server, 
    adjustedCraftCost 
}: { 
    ingredient: ExtendedRecipeIngredient, 
    depth: number, 
    path: number[], 
    onToggle: (path: number[]) => void, 
    server: string | null, 
    adjustedCraftCost: number 
}) => {
    const isExpanded = ingredient.isExpanded;
    const subRecipeCost = isExpanded && ingredient.subRecipe ? calculateRecursiveCost(ingredient.subRecipe.ingredients) : 0;
    const percentCost = adjustedCraftCost > 0 ? ((isExpanded ? subRecipeCost * ingredient.quantity : ingredient.total_price) / adjustedCraftCost) * 100 : 0;

    return (
        <div className="flex flex-col">
            <div 
                className="p-3 border-b border-white/5 relative transition-colors"
                style={{ 
                    paddingLeft: `${1 + depth}rem`,
                    backgroundColor: `rgba(255, 255, 255, ${(depth * 0.012) + (isExpanded ? 0.035 : 0)})` 
                }}
            >
                {depth > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/5" style={{ left: `${depth}rem` }}></div>
                )}
                
                <div className="flex gap-3">
                    <div className="w-10 h-10 bg-[#25262b] rounded-lg flex items-center justify-center overflow-hidden border border-white/5 shrink-0">
                        {ingredient.icon_url ? (
                            <img 
                                src={ingredient.icon_url} 
                                alt={ingredient.name} 
                                className="w-full h-full object-contain" 
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        ) : (
                            <div className="text-gray-500 font-bold">{ingredient.name.charAt(0)}</div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <div className="min-w-0 pr-2">
                                {server ? (
                                    <Link 
                                        to={ingredient.ingredient_recipe_id ? `/recipes/${ingredient.ingredient_recipe_id}` : `/item/${server}/${ingredient.name}`}
                                        className="font-medium text-gray-200 hover:text-blue-400 transition-colors truncate block"
                                    >
                                        {ingredient.name}
                                    </Link>
                                ) : (
                                    <span className="font-medium text-gray-200 truncate block">{ingredient.name}</span>
                                )}
                            </div>
                            <span className="text-gray-400 font-mono text-sm whitespace-nowrap">x{ingredient.quantity}</span>
                        </div>

                        {ingredient.ingredient_recipe_id && (
                            <button
                                onClick={() => onToggle(path)}
                                className={`text-xs flex items-center gap-1 cursor-pointer mb-2 ${isExpanded ? "text-orange-400" : "text-green-400"}`}
                                disabled={ingredient.isLoadingSubRecipe}
                            >
                                {ingredient.isLoadingSubRecipe ? (
                                    <Loader2 size={10} className="animate-spin" />
                                ) : isExpanded ? (
                                    <Minus size={10} />
                                ) : (
                                    <Plus size={10} />
                                )}
                                {isExpanded ? "Exclure la recette" : "Inclure la recette"}
                            </button>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs bg-black/20 rounded p-2">
                            <div>
                                <span className="text-gray-500 block">Unitaire</span>
                                <span className="text-gray-300 font-mono">
                                    {ingredient.price > 0 ? formatKamas(ingredient.price) : '???'}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-500 block">Total</span>
                                <span className={`font-mono font-medium ${isExpanded && subRecipeCost > ingredient.price ? "text-red-400" : "text-blue-400"}`}>
                                    {isExpanded ? formatKamas(subRecipeCost * ingredient.quantity) : (ingredient.total_price > 0 ? formatKamas(ingredient.total_price) : '-')}
                                </span>
                            </div>
                        </div>
                        
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500/50 rounded-full" 
                                    style={{ width: `${percentCost}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-gray-500 w-6 text-right">{percentCost.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {isExpanded && ingredient.subRecipe && ingredient.subRecipe.ingredients.map(subIng => (
                <MobileIngredientRow 
                    key={subIng.item_id} 
                    ingredient={subIng} 
                    depth={depth + 1} 
                    path={[...path, subIng.item_id]}
                    onToggle={onToggle}
                    server={server}
                    adjustedCraftCost={adjustedCraftCost}
                />
            ))}
        </div>
    );
};

const RecipeDetailsPage: React.FC<RecipeDetailsPageProps> = ({ server, dateRange }) => {
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Resolve recipe ID from item ID if needed
  const { data: itemRecipe, isLoading: isLoadingItemRecipe } = useItemRecipe(
    itemId ? Number(itemId) : undefined, 
    server
  );

  const recipeId = id ? parseInt(id) : (itemRecipe?.recipe_id || 0);

  const { data: recipe, isLoading: isLoadingRecipe, error } = useRecipeDetails(recipeId, server);
  
  const isLoading = isLoadingRecipe || (!!itemId && isLoadingItemRecipe);
  const { data: timeseries } = useTimeseries(
    recipe?.result_item_name || '', 
    server || '', 
    dateRange,
    { enabled: !!recipe?.result_item_name && !!server }
  );

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editedIngredients, setEditedIngredients] = useState<RecipeIngredient[]>([]);
  const [editedLevel, setEditedLevel] = useState<number>(1);
  
  // Expanded Ingredients State
  const [extendedIngredients, setExtendedIngredients] = useState<ExtendedRecipeIngredient[]>([]);
  const [isExpandingAll, setIsExpandingAll] = useState(false);

  useEffect(() => {
    if (recipe) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExtendedIngredients(recipe.ingredients.map(ing => ({
          ...ing,
          isExpanded: false,
          isLoadingSubRecipe: false
      })));
      setEditedLevel(recipe.level);
    }
  }, [recipe]);

  const handleToggleRecipe = async (path: number[]) => {
    if (!server) return;

    // Find the ingredient to check its state
    let targetIng: ExtendedRecipeIngredient | undefined;
    let currentList = extendedIngredients;
    for (const id of path) {
        targetIng = currentList.find(i => i.item_id === id);
        if (!targetIng) return;
        if (targetIng.subRecipe) {
            currentList = targetIng.subRecipe.ingredients;
        }
    }

    if (!targetIng) return;

    if (!targetIng.isExpanded && !targetIng.subRecipe) {
        // Load sub-recipe
        setExtendedIngredients(prev => updateIngredientInTree(prev, path, ing => ({ ...ing, isLoadingSubRecipe: true })));
        
        try {
            if (!targetIng.ingredient_recipe_id) return;
            const subRecipeData = await fetchRecipeDetails(targetIng.ingredient_recipe_id, server);
            
            const subIngredients: ExtendedRecipeIngredient[] = subRecipeData.ingredients.map(i => ({
                ...i,
                isExpanded: false,
                isLoadingSubRecipe: false
            }));

            setExtendedIngredients(prev => updateIngredientInTree(prev, path, ing => ({ 
                ...ing, 
                isLoadingSubRecipe: false, 
                isExpanded: true,
                subRecipe: {
                    ingredients: subIngredients,
                    craft_cost: subRecipeData.craft_cost
                }
            })));
        } catch (e) {
            console.error("Failed to load sub-recipe", e);
            setExtendedIngredients(prev => updateIngredientInTree(prev, path, ing => ({ ...ing, isLoadingSubRecipe: false })));
        }
    } else {
        // Toggle expansion
        setExtendedIngredients(prev => updateIngredientInTree(prev, path, ing => ({ ...ing, isExpanded: !ing.isExpanded })));
    }
  };

  const handleExpandAll = async () => {
    if (!server) return;
    
    // Helper for recursion
    const expandRecursively = async (ingredients: ExtendedRecipeIngredient[]): Promise<ExtendedRecipeIngredient[]> => {
        return Promise.all(ingredients.map(async (ing) => {
            if (!ing.ingredient_recipe_id) return ing;

            // If already has subRecipe, just recurse
            if (ing.subRecipe) {
                const subIngredients = await expandRecursively(ing.subRecipe.ingredients);
                return {
                    ...ing,
                    isExpanded: true,
                    subRecipe: {
                        ...ing.subRecipe,
                        ingredients: subIngredients
                    }
                };
            }

            // Fetch
            try {
                const data = await fetchRecipeDetails(ing.ingredient_recipe_id!, server);
                const subIngredientsRaw: ExtendedRecipeIngredient[] = data.ingredients.map(i => ({
                    ...i,
                    isExpanded: false,
                    isLoadingSubRecipe: false
                }));
                
                // Recurse immediately
                const subIngredients = await expandRecursively(subIngredientsRaw);

                return {
                    ...ing,
                    isExpanded: true,
                    isLoadingSubRecipe: false,
                    subRecipe: {
                        ingredients: subIngredients,
                        craft_cost: data.craft_cost
                    }
                };
            } catch (e) {
                console.error(e);
                return ing;
            }
        }));
    };

    // Set loading on top level
    setIsExpandingAll(true);
    setExtendedIngredients(prev => prev.map(ing => 
        ing.ingredient_recipe_id && !ing.isExpanded ? { ...ing, isLoadingSubRecipe: true } : ing
    ));

    // Execute
    try {
        const newIngredients = await expandRecursively(extendedIngredients);
        setExtendedIngredients(newIngredients);
    } finally {
        setIsExpandingAll(false);
    }
  };

  const hasAnyCollapsed = (ingredients: ExtendedRecipeIngredient[]): boolean => {
      return ingredients.some(ing => {
          if (ing.ingredient_recipe_id && !ing.isExpanded) return true;
          if (ing.isExpanded && ing.subRecipe) {
              return hasAnyCollapsed(ing.subRecipe.ingredients);
          }
          return false;
      });
  };

  const hasAnyExpanded = (ingredients: ExtendedRecipeIngredient[]): boolean => {
      return ingredients.some(ing => {
          if (ing.isExpanded) return true;
          if (ing.subRecipe) {
              return hasAnyExpanded(ing.subRecipe.ingredients);
          }
          return false;
      });
  };

  const canExpandAll = hasAnyCollapsed(extendedIngredients);
  const canCollapseAll = hasAnyExpanded(extendedIngredients);

  const handleCollapseAll = () => {
    // Recursive collapse helper
    const collapseRecursively = (ingredients: ExtendedRecipeIngredient[]): ExtendedRecipeIngredient[] => {
        return ingredients.map(ing => ({
            ...ing,
            isExpanded: false,
            subRecipe: ing.subRecipe ? {
                ...ing.subRecipe,
                ingredients: collapseRecursively(ing.subRecipe.ingredients)
            } : undefined
        }));
    };

    setExtendedIngredients(prev => collapseRecursively(prev));
  };

  const calculateAdjustedStats = () => {
    if (!recipe) return { craftCost: 0, margin: 0, roi: 0 };
    
    let totalCost = 0;
    // If editing, we use the flat list of edited ingredients (no recursion support in edit mode for now)
    if (isEditing) {
        totalCost = editedIngredients.reduce((sum, ing) => sum + ing.total_price, 0);
    } else {
        totalCost = calculateRecursiveCost(extendedIngredients);
    }

    const margin = recipe.sell_price - totalCost;
    const roi = totalCost > 0 ? (margin / totalCost) * 100 : 0;

    return { craftCost: totalCost, margin, roi };
  };

  const { craftCost: adjustedCraftCost, margin: adjustedMargin, roi: adjustedRoi } = calculateAdjustedStats();

  
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
      await updateRecipe(recipeId, payload, recipe?.result_item_id, editedLevel);
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
      setEditedLevel(recipe.level);
    }
    setIsEditing(false);
    setIsAddingIngredient(false);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 min-w-0">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-[#25262b] hover:bg-[#2c2e33] text-gray-400 hover:text-white transition-colors w-fit"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white flex flex-wrap items-center gap-3">
              {server ? (
                <Link 
                  to={`/item/${server}/${recipe.result_item_name}`}
                  className="flex items-center gap-3 hover:text-blue-400 transition-colors group"
                  title="Voir les détails de l'item"
                >
                  {recipe.result_item_icon ? (
                    <img 
                      src={recipe.result_item_icon} 
                      alt="" 
                      className="w-8 h-8 object-contain" 
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
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
                    <img 
                      src={recipe.result_item_icon} 
                      alt="" 
                      className="w-8 h-8 object-contain" 
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
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
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span>{recipe.job_name}</span>
                  <span className="text-gray-500">Niv.</span>
                  <input
                    type="number"
                    value={editedLevel}
                    onChange={(e) => setEditedLevel(parseInt(e.target.value) || 1)}
                    className="w-16 bg-[#25262b] border border-white/10 rounded px-2 py-0.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    min="1"
                    max="200"
                  />
                </div>
              ) : (
                <span>{recipe.job_name} (Niv. {recipe.level})</span>
              )}
            </div>
          </div>
        </div>

        {/* Edit Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
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
            {formatKamas(adjustedCraftCost)}
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
          <div className={`text-2xl font-bold flex items-center gap-1 ${adjustedMargin > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {adjustedMargin > 0 ? '+' : ''}{formatKamas(adjustedMargin)}
            <img src={kamaIcon} alt="k" className="w-5 h-5 opacity-70" />
          </div>
        </div>

        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4">
          <div className="text-gray-400 text-xs uppercase font-medium mb-1">ROI</div>
          <div className={`text-2xl font-bold ${getRoiColor(adjustedRoi)}`}>
            {adjustedRoi.toFixed(1)}%
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
          <div className="p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-t-xl bg-[#1a1b1e]">
            <div className="flex items-center justify-between w-full md:w-auto">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-blue-500" />
                  Ingrédients
                </h2>
                <span className="text-sm text-gray-400 md:hidden">
                    {isEditing ? editedIngredients.length : calculateRecursiveItemCount(extendedIngredients)} items
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-end w-full md:w-auto">
                {!isEditing && (
                    <>
                        <button 
                            onClick={handleExpandAll}
                            disabled={!canExpandAll || isExpandingAll}
                            className={`text-xs flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg bg-white/5 md:bg-transparent border border-white/5 md:border-none ${
                                !canExpandAll || isExpandingAll
                                    ? "text-gray-600 cursor-default" 
                                    : "text-blue-400 hover:text-blue-300 cursor-pointer hover:bg-white/10 md:hover:bg-transparent"
                            }`}
                            title="Inclure toutes les recettes"
                        >
                            {isExpandingAll ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <ChevronsDown size={14} />
                            )}
                            Tout inclure
                        </button>
                        <button 
                            onClick={handleCollapseAll}
                            disabled={!canCollapseAll}
                            className={`text-xs flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg bg-white/5 md:bg-transparent border border-white/5 md:border-none ${
                                !canCollapseAll 
                                    ? "text-gray-600 cursor-default" 
                                    : "text-orange-400 hover:text-orange-300 cursor-pointer hover:bg-white/10 md:hover:bg-transparent"
                            }`}
                            title="Exclure toutes les recettes"
                        >
                            <ChevronsUp size={14} />
                            Tout exclure
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-1 hidden md:block"></div>
                    </>
                )}
                <span className="text-sm text-gray-400 hidden md:block">
                    {isEditing ? editedIngredients.length : calculateRecursiveItemCount(extendedIngredients)} items
                </span>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1">
            {/* Mobile View */}
            <div className="md:hidden">
                {isEditing ? (
                    <div className="divide-y divide-white/5">
                        {editedIngredients.map((ing) => (
                            <div key={ing.item_id} className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-[#25262b] rounded-lg flex items-center justify-center overflow-hidden border border-white/5 shrink-0">
                                        {ing.icon_url ? (
                                            <img src={ing.icon_url} alt={ing.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="text-gray-500 font-bold">{ing.name.charAt(0)}</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{ing.name}</div>
                                        <div className="text-xs text-gray-400">{formatKamas(ing.price)} k</div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteIngredient(ing.item_id)}
                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between bg-[#25262b] p-2 rounded-lg">
                                    <span className="text-sm text-gray-400">Quantité</span>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={ing.quantity}
                                        onChange={(e) => handleQuantityChange(ing.item_id, parseInt(e.target.value) || 1)}
                                        className="w-20 bg-[#1a1b1e] border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {extendedIngredients.map(ing => (
                            <MobileIngredientRow 
                                key={ing.item_id} 
                                ingredient={ing} 
                                depth={0} 
                                path={[ing.item_id]}
                                onToggle={handleToggleRecipe}
                                server={server}
                                adjustedCraftCost={adjustedCraftCost}
                            />
                        ))}
                    </div>
                )}
            </div>

            <table className="w-full text-left border-collapse hidden md:table">
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
                {isEditing ? (
                    editedIngredients.map((ing) => {
                        return (
                            <tr key={ing.item_id} className="hover:bg-[#25262b] transition-colors">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#25262b] rounded-lg flex items-center justify-center overflow-hidden border border-white/5">
                                    {ing.icon_url ? (
                                    <img 
                                        src={ing.icon_url} 
                                        alt={ing.name} 
                                        className="w-full h-full object-contain" 
                                        referrerPolicy="no-referrer"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
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
                                </div>
                                </div>
                            </td>
                            <td className="p-4 text-right text-gray-300 font-mono">
                                <input 
                                    type="number" 
                                    min="1"
                                    value={ing.quantity}
                                    onChange={(e) => handleQuantityChange(ing.item_id, parseInt(e.target.value) || 1)}
                                    className="w-20 bg-[#1a1b1e] border border-white/10 rounded px-2 py-1 text-right focus:outline-none focus:border-blue-500"
                                />
                            </td>
                            <td className="p-4 text-right text-gray-300 font-mono">
                                <div className="flex items-center justify-end gap-2">
                                {ing.price > 0 ? formatKamas(ing.price) : <span className="text-red-400">???</span>}
                                </div>
                            </td>
                            <td className="p-4 text-right text-gray-200 font-mono font-medium">
                                {ing.total_price > 0 ? formatKamas(ing.total_price) : '-'}
                            </td>
                            <td className="p-4 text-right">
                                <button 
                                    onClick={() => handleDeleteIngredient(ing.item_id)}
                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Supprimer l'ingrédient"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                            </tr>
                        );
                    })
                ) : (
                    extendedIngredients.map(ing => (
                        <IngredientRow 
                            key={ing.item_id} 
                            ingredient={ing} 
                            depth={0} 
                            path={[ing.item_id]}
                            onToggle={handleToggleRecipe}
                            server={server}
                            adjustedCraftCost={adjustedCraftCost}
                        />
                    ))
                )}
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
                              {item.icon_url ? (
                                <img 
                                  src={item.icon_url} 
                                  alt="" 
                                  className="w-full h-full object-contain" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : <span className="text-gray-500 font-bold">{item.item_name[0]}</span>}
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
        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 flex flex-col h-[400px] [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_*]:focus:outline-none outline-none">
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
