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
}

const ItemDetailsPage: React.FC<ItemDetailsPageProps> = ({
  items,
  dateRange,
  favorites,
  onToggleFavorite,
}) => {
  const { server, itemName } = useParams<{ server: string; itemName: string }>();
  const navigate = useNavigate();
  
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // Find the item object from the global list
  const selectedItem = items.find(
    (i) => i.item_name === itemName && i.server === server
  ) || null;

  useEffect(() => {
    if (!server || !itemName) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTimeseries(itemName, server, dateRange)
      .then((data) => {
        if (cancelled) return;
        setTimeseries(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError(err.message || 'Erreur inconnue');
        setLoading(false);
      });

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

  if (!selectedItem && items.length > 0) {
    // Item not found in the list (maybe list not loaded yet or invalid URL)
    // We can show a loading state or error if items are loaded
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <p>Item introuvable ou chargement...</p>
      </div>
    );
  }

  return (
    <PriceChart
      selectedItem={selectedItem}
      server={server || null}
      timeseries={timeseries}
      loading={loading}
      error={error}
      dateRange={dateRange}
      onRefresh={handleRefresh}
      onBackToDashboard={handleBack}
      favorites={favorites}
      onToggleFavorite={onToggleFavorite}
    />
  );
};

export default ItemDetailsPage;
