import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PriceChart } from '../components/PriceChart';
import { fetchTimeseries } from '../api';
import type { DateRangePreset, ItemSummary, TimeseriesPoint } from '../types';

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
  
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

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

  useEffect(() => {
    if (!server || !itemName) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTimeseries(itemName, server, dateRange);
        if (!cancelled) {
          setTimeseries(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          const message = err instanceof Error ? err.message : 'Erreur inconnue';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [server, itemName, dateRange, refreshIndex]);

  const handleRefresh = () => {
    setRefreshIndex((i) => i + 1);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full">
      <PriceChart
        selectedItem={selectedItem}
        server={server || null}
        timeseries={timeseries}
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
