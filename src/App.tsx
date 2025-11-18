// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { fetchItems, fetchTimeseries } from './api';
import type { DateRangePreset, ItemSummary, TimeseriesPoint } from './types';
import { Layout } from './components/Layout';
import { ItemList } from './components/ItemList';
import { PriceChart } from './components/PriceChart';
import { TopBar } from './components/TopBar';
import Dashboard from './pages/Dashboard';

const DEFAULT_RANGE: DateRangePreset = '30d';

const App: React.FC = () => {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<ItemSummary | null>(null);

  // Favorites stored as set of "server::item_name"
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('favorites');
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch (e) {
      console.warn('Failed to load favorites', e);
      return new Set<string>();
    }
  });

  const persistFavorites = (next: Set<string>) => {
    setFavorites(next);
    try {
      localStorage.setItem('favorites', JSON.stringify(Array.from(next)));
    } catch (e) {
      console.warn('Failed to persist favorites', e);
    }
  };

  const handleToggleFavorite = (key: string) => {
    const next = new Set(favorites);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persistFavorites(next);
  };

  const [dateRange, setDateRange] = useState<DateRangePreset>(DEFAULT_RANGE);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[] | null>(null);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsError, setTsError] = useState<string | null>(null);
  const [tsRefreshIndex, setTsRefreshIndex] = useState(0);

  // 👉 Nouveau : état d'ouverture de la sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Ouverte par défaut uniquement sur desktop
    return typeof window !== 'undefined' && window.innerWidth >= 768;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((open) => !open);
  };

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

  // 2. Chargement timeseries
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
  }, [selectedItem, selectedServer, dateRange, tsRefreshIndex]);

  const handleRefreshTimeseries = () => {
    setTsRefreshIndex((i) => i + 1);
  };

  // handler de sélection d’item qui ferme la sidebar sur mobile
  const handleSelectItem = (item: ItemSummary | null) => {
    setSelectedItem(item);
    if (item && typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleNavigateToItem = (item: ItemSummary) => {
    setSelectedItem(item);
    // Don't open sidebar on mobile
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedItem(null);
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
          onSelectItem={handleSelectItem}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      }
      topBar={
        <TopBar
          servers={servers}
          selectedServer={selectedServer}
          onSelectServer={setSelectedServer}
          dateRange={dateRange}
          onChangeDateRange={setDateRange}
          onToggleSidebar={toggleSidebar}
          items={items}
          onNavigateToItem={handleNavigateToItem}
        />
      }
      main={
        selectedItem ? (
          <PriceChart
            selectedItem={selectedItem}
            server={selectedServer}
            timeseries={timeseries}
            loading={tsLoading}
            error={tsError}
            dateRange={dateRange}
            onRefresh={handleRefreshTimeseries}
            onBackToDashboard={handleBackToDashboard}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          // Dashboard landing when no item selected
          <>
            {/* lazy load Dashboard component */}
            <React.Suspense fallback={<div className="info-text">Chargement...</div>}>
              <Dashboard
                items={items}
                favorites={favorites}
                onNavigateToItem={handleNavigateToItem}
                server={selectedServer}
                dateRange={dateRange}
              />
            </React.Suspense>
          </>
        )
      }
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={toggleSidebar}
    />
  );
};

export default App;
