// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { fetchItems, fetchTimeseries } from './api';
import type { DateRangePreset, ItemSummary, TimeseriesPoint } from './types';
import { Layout } from './components/Layout';
import { ItemList } from './components/ItemList';
import { PriceChart } from './components/PriceChart';
import { TopBar } from './components/TopBar';

const DEFAULT_RANGE: DateRangePreset = '30d';

const App: React.FC = () => {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<ItemSummary | null>(null);

  const [dateRange, setDateRange] = useState<DateRangePreset>(DEFAULT_RANGE);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[] | null>(null);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsError, setTsError] = useState<string | null>(null);

  // 👉 nouveau : compteur de refresh
  const [tsRefreshIndex, setTsRefreshIndex] = useState(0);

  // 1. Chargement des items
  useEffect(() => {
    let cancelled = false;

    setItemsLoading(true);
    setItemsError(null);

    fetchItems()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setItemsLoading(false);

        if (data.length > 0 && !selectedServer) {
          setSelectedServer(data[0].server);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setItemsError(err.message || 'Erreur inconnue');
        setItemsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const servers = useMemo(
    () => Array.from(new Set(items.map((i) => i.server))).sort(),
    [items]
  );

  useEffect(() => {
    if (selectedServer && !servers.includes(selectedServer)) {
      setSelectedServer(servers[0] ?? null);
      setSelectedItem(null);
    }
  }, [selectedServer, servers]);

  const filteredItems = useMemo(() => {
    return items
      .filter((i) => !selectedServer || i.server === selectedServer)
      .filter((i) =>
        i.item_name.toLowerCase().includes(search.trim().toLowerCase())
      )
      .sort((a, b) => a.item_name.localeCompare(b.item_name, 'fr'));
  }, [items, selectedServer, search]);

  // 2. Chargement de la timeseries (avec refreshIndex)
  useEffect(() => {
    if (!selectedItem || !selectedServer) {
      setTimeseries(null);
      return;
    }

    let cancelled = false;
    setTsLoading(true);
    setTsError(null);

    fetchTimeseries(selectedItem.item_name, selectedServer, dateRange)
      .then((data) => {
        if (cancelled) return;
        setTimeseries(data);
        setTsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setTsError(err.message || 'Erreur inconnue');
        setTsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedItem, selectedServer, dateRange, tsRefreshIndex]); // 👈 ajouté tsRefreshIndex

  // handler pour le bouton refresh
  const handleRefreshTimeseries = () => {
    setTsRefreshIndex((i) => i + 1);
  };

  return (
    <Layout
      sidebar={
        <ItemList
          items={filteredItems}
          loading={itemsLoading}
          error={itemsError}
          onSearchChange={setSearch}
          search={search}
          selectedItem={selectedItem}
          onSelectItem={setSelectedItem}
        />
      }
      topBar={
        <TopBar
          servers={servers}
          selectedServer={selectedServer}
          onSelectServer={setSelectedServer}
          dateRange={dateRange}
          onChangeDateRange={setDateRange}
        />
      }
      main={
        <PriceChart
          selectedItem={selectedItem}
          server={selectedServer}
          timeseries={timeseries}
          loading={tsLoading}
          error={tsError}
          dateRange={dateRange}
          onRefresh={handleRefreshTimeseries}   // 👈 nouveau
        />
      }
    />
  );
};

export default App;
