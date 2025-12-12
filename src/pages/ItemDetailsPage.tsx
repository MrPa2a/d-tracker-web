import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PriceChart } from '../components/PriceChart';
import { useTimeseries } from '../hooks/useTimeseries';
import { fetchItems } from '../api';
import type { DateRangePreset, ItemSummary, Profile } from '../types';

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

  const handleRefresh = () => {
    refetch();
  };

  const handleBack = () => {
    navigate('/');
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

  return (
    <div className="flex flex-col h-full">
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
        currentProfile={currentProfile}
      />
    </div>
  );
};

export default ItemDetailsPage;
