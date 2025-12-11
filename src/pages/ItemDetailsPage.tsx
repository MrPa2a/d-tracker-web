import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PriceChart } from '../components/PriceChart';
import { useTimeseries } from '../hooks/useTimeseries';
import type { DateRangePreset, ItemSummary } from '../types';

interface ItemDetailsPageProps {
  items: ItemSummary[];
  dateRange: DateRangePreset;
  favorites: Set<string>;
  onToggleFavorite: (key: string) => void;
  onItemUpdate?: (oldName: string, newName: string, server: string, newCategory: string) => void;
}

const ItemDetailsPage: React.FC<ItemDetailsPageProps> = ({
  items,
  dateRange,
  favorites,
  onToggleFavorite,
  onItemUpdate,
}) => {
  const { server, itemName } = useParams<{ server: string; itemName: string }>();
  const navigate = useNavigate();
  
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

  const selectedItem = foundItem || (server && itemName ? {
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
        onToggleFavorite={onToggleFavorite}
        onRefresh={handleRefresh}
        onBackToDashboard={handleBack}
        onItemUpdate={onItemUpdate}
      />
    </div>
  );
};

export default ItemDetailsPage;
