import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PriceChart } from '../components/PriceChart';
import { DeleteItemModal } from '../components/DeleteItemModal';
import { useTimeseries } from '../hooks/useTimeseries';
import { useItemRecipe, useItemUsages } from '../hooks/useRecipes';
import { fetchItems, deleteItem } from '../api';
import type { DateRangePreset, ItemSummary, Profile } from '../types';
import { Hammer, Coins, ArrowRight, Loader2, ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import kamaIcon from '../assets/kama.png';

const ItemIcon = ({ icon, name }: { icon?: string | null, name: string }) => {
  const [error, setError] = React.useState(false);

  if (!icon || error) {
    return <div className="text-text-muted font-bold">{name.charAt(0)}</div>;
  }

  return (
    <img 
      src={icon} 
      alt={name} 
      className="w-full h-full object-contain" 
      referrerPolicy="no-referrer"
      onError={() => setError(true)} 
    />
  );
};

interface ItemDetailsPageProps {
  items: ItemSummary[];
  dateRange: DateRangePreset;
  favorites: Set<string>;
  pendingFavorites?: Set<string>;
  onToggleFavorite: (key: string) => void;
  onItemUpdate?: (oldName: string, newName: string, server: string, newCategory: string) => void;
  currentProfile: Profile | null;
}

const ItemDetailsPage: React.FC<ItemDetailsPageProps> = ({
  items,
  dateRange,
  favorites,
  pendingFavorites,
  onToggleFavorite,
  onItemUpdate,
  currentProfile,
}) => {
  const { server, itemName } = useParams<{ server: string; itemName: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: timeseries, isLoading: loading, error: queryError, refetch } = useTimeseries(
    itemName || '',
    server || '',
    dateRange,
    { enabled: !!server && !!itemName }
  );
  
  const error = queryError ? (queryError instanceof Error ? queryError.message : String(queryError)) : null;

  // Find the item object from the global list
  const foundItem = items.find(
    (i) => i.item_name === itemName && i.server === server
  );

  // Fetch item details if not found in global list (to get the ID)
  const { data: fetchedItems } = useQuery({
    queryKey: ['item-details', server, itemName],
    queryFn: () => fetchItems(itemName, server),
    enabled: !foundItem && !!server && !!itemName,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const fetchedItem = fetchedItems?.find(i => i.item_name === itemName && i.server === server);

  const selectedItem = foundItem || fetchedItem || (server && itemName ? {
    item_name: itemName,
    server: server,
    last_price: 0,
    last_observation_at: new Date().toISOString()
  } as ItemSummary : null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const handleRefresh = () => {
    refetch();
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleDeleteItem = async () => {
    if (!selectedItem?.id) return;
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem?.id) return;
    try {
      await deleteItem(selectedItem.id);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['item-details'] });
      // Navigate back
      navigate('/');
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Erreur lors de la suppression de l\'item.');
    }
  };

  const handleItemUpdate = (oldName: string, newName: string, server: string, newCategory: string) => {
    if (onItemUpdate) {
      onItemUpdate(oldName, newName, server, newCategory);
    }

    // Invalidate local item details query to ensure UI updates immediately
    queryClient.invalidateQueries({ queryKey: ['item-details', server, oldName] });

    if (oldName !== newName) {
      queryClient.invalidateQueries({ queryKey: ['item-details', server, newName] });
      navigate(`/item/${server}/${encodeURIComponent(newName)}`, { replace: true });
    }
  };

  // Fetch Recipe Data
  const { data: recipe, isLoading: recipeLoading } = useItemRecipe(selectedItem?.id, server || null);
  
  const [usagesPage, setUsagesPage] = React.useState(1);
  const [usagesSearch, setUsagesSearch] = React.useState('');
  const usagesLimit = 20;
  const usagesOffset = (usagesPage - 1) * usagesLimit;

  const { data: usages, isLoading: usagesLoading, isFetching: usagesFetching } = useItemUsages(
    selectedItem?.item_name, 
    server || null,
    usagesLimit,
    usagesOffset,
    usagesSearch
  );

  const totalUsagesCount = usages && usages.length > 0 ? (usages[0].total_count || usages.length) : 0;
  const totalPages = Math.ceil(totalUsagesCount / usagesLimit);

  const formatKamas = (k: number) => {
    return new Intl.NumberFormat('fr-FR').format(Math.round(k));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div className="h-[820px] md:h-[600px] w-full">
          <PriceChart
            selectedItem={selectedItem}
            server={server || null}
            timeseries={timeseries || null}
            loading={loading}
            error={error}
            dateRange={dateRange}
            favorites={favorites}
            pendingFavorites={pendingFavorites}
            onToggleFavorite={onToggleFavorite}
            onRefresh={handleRefresh}
            onBackToDashboard={handleBack}
            onItemUpdate={handleItemUpdate}
            onDeleteItem={handleDeleteItem}
            currentProfile={currentProfile}
          />
        </div>

        {/* Section Craft (Si l'item est craftable) */}
        {recipeLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500/50" />
          </div>
        ) : recipe && (
          <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Hammer className="text-blue-500" />
                Craft & Rentabilité
              </h2>
              <Link 
                to={`/recipes/${recipe.recipe_id}`}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
              >
                Voir le détail de la recette
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-bg-tertiary/30 rounded-lg p-4 border border-border-subtle">
                <div className="text-text-muted text-xs uppercase font-medium mb-1">Coût de Craft Estimé</div>
                <div className="flex items-center gap-2">
                  <img src={kamaIcon} alt="Kamas" className="w-5 h-5" />
                  <span className="text-xl font-bold text-text-primary">{formatKamas(recipe.craft_cost)}</span>
                </div>
              </div>

              <div className="bg-bg-tertiary/30 rounded-lg p-4 border border-border-subtle">
                <div className="text-text-muted text-xs uppercase font-medium mb-1">Marge Nette</div>
                {recipe.sell_price ? (
                  <div className={`flex items-center gap-2 ${recipe.margin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <img src={kamaIcon} alt="Kamas" className="w-5 h-5 opacity-80" />
                    <span className="text-xl font-bold">{formatKamas(recipe.margin)}</span>
                  </div>
                ) : (
                  <div className="text-text-muted italic text-sm mt-1">Pas de prix connu</div>
                )}
              </div>

              <div className="bg-bg-tertiary/30 rounded-lg p-4 border border-border-subtle">
                <div className="text-text-muted text-xs uppercase font-medium mb-1">ROI (Retour sur Investissement)</div>
                {recipe.sell_price ? (
                  <div className={`text-xl font-bold ${recipe.roi > 20 ? 'text-green-400' : recipe.roi > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {recipe.roi.toFixed(1)}%
                  </div>
                ) : (
                  <div className="text-text-muted italic text-sm mt-1">-</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section Utilisations (Si l'item est utilisé dans des recettes) */}
        {usagesLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500/50" />
          </div>
        ) : (usages && usages.length > 0) || usagesSearch ? (
          <div className="bg-bg-secondary border border-border-subtle rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <Coins className="text-yellow-500" />
                  Utilisé dans {totalUsagesCount} recettes
                </h2>
                <p className="text-text-muted text-sm mt-1">
                  Recettes utilisant cet item, triées par rentabilité potentielle.
                </p>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher une recette..."
                  value={usagesSearch}
                  onChange={(e) => {
                    setUsagesSearch(e.target.value);
                    setUsagesPage(1);
                  }}
                  className="pl-9 pr-10 py-2 bg-bg-tertiary border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-blue-500 w-full md:w-64"
                />
                {usagesFetching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
            </div>

            {usages && usages.length > 0 ? (
              <>
                <div className={`transition-opacity duration-200 ${usagesFetching ? 'opacity-50' : 'opacity-100'}`}>
                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y divide-border-subtle">
                    {usages.map((usage) => (
                      <div 
                        key={usage.recipe_id}
                        onClick={() => navigate(`/recipes/${usage.recipe_id}`)}
                        className="p-4 hover:bg-bg-tertiary/50 transition-colors active:bg-bg-tertiary/50 cursor-pointer"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-12 h-12 bg-bg-tertiary rounded-lg flex items-center justify-center overflow-hidden border border-border-subtle shrink-0">
                            <ItemIcon icon={usage.result_item_icon} name={usage.result_item_name} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-text-primary text-base leading-tight mb-1">
                              {usage.result_item_name}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                              <span>Niv. {usage.level}</span>
                              <span>•</span>
                              <span>{usage.job_name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
                          {/* Row 1: Quantity & Sell Price */}
                          <div>
                            <div className="text-xs text-text-muted mb-1">Qté Requise</div>
                            <div className="font-mono text-text-primary">x{usage.quantity_required}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-text-muted mb-1">Prix Vente</div>
                            <div className="font-mono text-text-primary flex items-center justify-end gap-1">
                              {usage.sell_price ? formatKamas(usage.sell_price) : '-'}
                              {usage.sell_price && <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />}
                            </div>
                          </div>

                          {/* Row 2: ROI & Margin */}
                          <div>
                            <div className="text-xs text-text-muted mb-1">ROI</div>
                            <div className={`font-mono font-bold ${!usage.sell_price ? 'text-text-muted' : usage.roi > 20 ? 'text-green-400' : usage.roi > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {usage.sell_price ? `${usage.roi.toFixed(1)}%` : '-'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-text-muted mb-1">Marge</div>
                            <div className={`font-mono font-medium flex items-center justify-end gap-1 ${!usage.sell_price ? 'text-text-muted italic' : usage.margin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {usage.sell_price ? (
                                <>
                                  {usage.margin > 0 ? '+' : ''}{formatKamas(usage.margin)}
                                  <img src={kamaIcon} alt="k" className="w-3 h-3 opacity-70" />
                                </>
                              ) : 'Pas de prix'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-tertiary text-text-muted text-xs uppercase tracking-wider border-b border-border-subtle">
                        <th className="p-4 font-medium">Recette</th>
                        <th className="p-4 font-medium">Métier</th>
                        <th className="p-4 font-medium text-right">Niveau</th>
                        <th className="p-4 font-medium text-right">Qté Requise</th>
                        <th className="p-4 font-medium text-right">Marge</th>
                        <th className="p-4 font-medium text-right">ROI</th>
                        <th className="p-4 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {usages.map((usage) => (
                        <tr key={usage.recipe_id} className="hover:bg-bg-tertiary/50 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-bg-tertiary rounded-lg flex items-center justify-center overflow-hidden border border-border-subtle">
                                <ItemIcon icon={usage.result_item_icon} name={usage.result_item_name} />
                              </div>
                              <Link 
                                to={`/item/${server}/${encodeURIComponent(usage.result_item_name)}`}
                                className="font-medium text-text-primary hover:text-blue-400 transition-colors"
                              >
                                {usage.result_item_name}
                              </Link>
                            </div>
                          </td>
                          <td className="p-4 text-text-muted">{usage.job_name}</td>
                          <td className="p-4 text-right text-text-muted">Niv. {usage.level}</td>
                          <td className="p-4 text-right text-text-primary font-mono">x{usage.quantity_required}</td>
                          <td className={`p-4 text-right font-mono font-medium ${!usage.sell_price ? 'text-text-muted italic' : usage.margin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {usage.sell_price ? formatKamas(usage.margin) : 'Pas de prix'}
                          </td>
                          <td className={`p-4 text-right font-mono font-medium ${!usage.sell_price ? 'text-text-muted' : usage.roi > 20 ? 'text-green-400' : usage.roi > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {usage.sell_price ? `${usage.roi.toFixed(1)}%` : '-'}
                          </td>
                          <td className="p-4 text-right">
                            <Link 
                              to={`/recipes/${usage.recipe_id}`}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors opacity-0 group-hover:opacity-100"
                              title="Voir la recette"
                            >
                              <ExternalLink size={16} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

                {totalPages > 1 && (
                  <div className="p-4 border-t border-border-subtle flex items-center justify-between">
                    <div className="text-sm text-text-muted">
                      Page {usagesPage} sur {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUsagesPage(p => Math.max(1, p - 1))}
                        disabled={usagesPage === 1}
                        className="p-2 rounded-lg hover:bg-bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={() => setUsagesPage(p => Math.min(totalPages, p + 1))}
                        disabled={usagesPage === totalPages}
                        className="p-2 rounded-lg hover:bg-bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-text-muted">
                Aucune recette trouvée pour cette recherche.
              </div>
            )}
          </div>
        ) : null}
      </div>

      {selectedItem && (
        <DeleteItemModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          item={selectedItem}
        />
      )}
    </div>
  );
};

export default ItemDetailsPage;
