// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate, useMatch } from 'react-router-dom';
import { fetchItems } from './api';
import type { DateRangePreset, ItemSummary } from './types';
import { Layout } from './components/Layout';
import { ItemList } from './components/ItemList';
import { TopBar } from './components/TopBar';
import Dashboard from './pages/Dashboard';
import ItemDetailsPage from './pages/ItemDetailsPage';

const DEFAULT_RANGE: DateRangePreset = '30d';

const App: React.FC = () => {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Dashboard server state
  const [dashboardServer, setDashboardServer] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  
  // Favorites stored as set of item names (server-independent)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('favorites');
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw) as string[];
      // Migration: if old format with "server::item_name", extract item_name only
      const migrated = arr.map(fav => {
        const parts = fav.split('::');
        return parts.length > 1 ? parts[1] : fav;
      });
      return new Set(migrated);
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
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // 👉 Nouveau : état d'ouverture de la sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Ouverte par défaut uniquement sur desktop
    return typeof window !== 'undefined' && window.innerWidth >= 768;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((open) => !open);
  };

  const navigate = useNavigate();
  const itemMatch = useMatch('/item/:server/:itemName');

  // Determine current server based on route or dashboard state
  const currentServer = itemMatch ? itemMatch.params.server : dashboardServer;

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

        if (data.length > 0 && !dashboardServer) {
          setDashboardServer(data[0].server);
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
    if (dashboardServer && servers.length > 0 && !servers.includes(dashboardServer)) {
      setDashboardServer(servers[0] ?? null);
    }
  }, [dashboardServer, servers]);

  const filteredItems = useMemo(() => {
    return items
      .filter((i) => !currentServer || i.server === currentServer)
      .filter((i) =>
        i.item_name.toLowerCase().includes(search.trim().toLowerCase())
      )
      .sort((a, b) => a.item_name.localeCompare(b.item_name, 'fr'));
  }, [items, currentServer, search]);

  // Handle server selection from TopBar
  const handleSelectServer = (newServer: string | null) => {
    if (!newServer) return;
    
    if (itemMatch) {
      // If on item page, navigate to same item on new server
      const { itemName } = itemMatch.params;
      if (itemName) {
        navigate(`/item/${newServer}/${itemName}`);
      }
    } else {
      // If on dashboard, just update state
      setDashboardServer(newServer);
    }
  };

  // handler de sélection d’item qui ferme la sidebar sur mobile
  const handleSelectItem = (item: ItemSummary | null) => {
    if (item) {
      navigate(`/item/${item.server}/${item.item_name}`);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    } else {
      navigate('/');
    }
  };

  const handleNavigateToItem = (item: ItemSummary) => {
    navigate(`/item/${item.server}/${item.item_name}`);
    // Don't open sidebar on mobile
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  };

  // Determine selected item for sidebar highlighting
  const selectedItem = itemMatch && currentServer ? items.find(i => i.server === currentServer && i.item_name === itemMatch.params.itemName) || null : null;

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
          selectedServer={currentServer || null}
          onSelectServer={handleSelectServer}
          dateRange={dateRange}
          onChangeDateRange={setDateRange}
          onToggleSidebar={toggleSidebar}
          items={items}
          onNavigateToItem={handleNavigateToItem}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
        />
      }
      main={
        <Routes>
          <Route 
            path="/" 
            element={
              <React.Suspense fallback={<div className="info-text">Chargement...</div>}>
                <Dashboard
                  items={items}
                  favorites={favorites}
                  onNavigateToItem={handleNavigateToItem}
                  onToggleFavorite={handleToggleFavorite}
                  server={dashboardServer}
                  dateRange={dateRange}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                />
              </React.Suspense>
            } 
          />
          <Route 
            path="/item/:server/:itemName" 
            element={
              <ItemDetailsPage 
                items={items}
                dateRange={dateRange}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
              />
            } 
          />
        </Routes>
      }
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={toggleSidebar}
    />
  );
};

export default App;
