// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate, useSearchParams, Navigate, useLocation } from 'react-router-dom';
import type { DateRangePreset, ItemSummary, SortType, SortOrder, Profile } from './types';
import { MainLayout } from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ItemDetailsPage from './pages/ItemDetailsPage';
import MarketPage from './pages/MarketPage';
import ListsPage from './pages/ListsPage';
import ListDetailsPage from './pages/ListDetailsPage';
import MarketScannerPage from './pages/MarketScannerPage';
import TrendHunterPage from './pages/TrendHunterPage';
import RiskMatrixPage from './pages/RiskMatrixPage';
import CraftingMarketPage from './pages/CraftingMarketPage';
import RecipeDetailsPage from './pages/RecipeDetailsPage';
import { useItems, useUpdateItem } from './hooks/useItems';
import { useCategories } from './hooks/useCategories';
import { useFavorites } from './hooks/useFavorites';

import { ConsumablesPage } from './pages/ConsumablesPage';
import { LevelingOptimizerPage } from './pages/LevelingOptimizerPage';
import { AlmanaxPage } from './pages/AlmanaxPage';
import BankPage from './pages/BankPage';
import BankCraftOpportunitiesPage from './pages/BankCraftOpportunitiesPage';

const DEFAULT_RANGE: DateRangePreset = '30d';

const App: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Initialize state from URL params
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    return searchParams.get('category') || null;
  });
  
  const [marketSearch, setMarketSearch] = useState(() => {
    return searchParams.get('search') || '';
  });

  const [sortType, setSortType] = useState<SortType>(() => {
    return (searchParams.get('sortType') as SortType) || 'name';
  });

  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    return (searchParams.get('sortOrder') as SortOrder) || 'asc';
  });

  // Sync state to URL params
  useEffect(() => {
    // Only sync market params to URL if we are on the market page
    if (location.pathname !== '/market') return;

    const params = new URLSearchParams(searchParams);
    
    if (selectedCategory) {
      params.set('category', selectedCategory);
    } else {
      params.delete('category');
    }

    if (marketSearch) {
      params.set('search', marketSearch);
    } else {
      params.delete('search');
    }

    if (sortType !== 'name') {
      params.set('sortType', sortType);
    } else {
      params.delete('sortType');
    }

    if (sortOrder !== 'asc') {
      params.set('sortOrder', sortOrder);
    } else {
      params.delete('sortOrder');
    }

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedCategory, marketSearch, sortType, sortOrder, searchParams, setSearchParams, location.pathname]);

  // Debounce search for API calls
  const [debouncedSearch, setDebouncedSearch] = useState(marketSearch);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(marketSearch), 300);
    return () => clearTimeout(timer);
  }, [marketSearch]);

  // Hybrid search logic:
  // If no category selected, use debouncedSearch for API.
  // If category selected, API search is undefined (we fetch all in category), and we filter client side.
  const searchParam = !selectedCategory ? debouncedSearch : undefined;

  const { data: items = [], isLoading: itemsLoading, error: itemsError } = useItems(searchParam, undefined, selectedCategory || undefined);
  const { data: categories = [] } = useCategories();
  const updateItemMutation = useUpdateItem();

  // Dashboard server state
  const [dashboardServer, setDashboardServer] = useState<string | null>(() => {
    return localStorage.getItem('dashboardServer');
  });

  useEffect(() => {
    if (dashboardServer) {
      localStorage.setItem('dashboardServer', dashboardServer);
    } else {
      localStorage.removeItem('dashboardServer');
    }
  }, [dashboardServer]);
  
  // Profile state
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(() => {
    try {
      const raw = localStorage.getItem('currentProfile');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentProfile) {
      localStorage.setItem('currentProfile', JSON.stringify(currentProfile));
    } else {
      localStorage.removeItem('currentProfile');
    }
  }, [currentProfile]);

  const { favorites, loading: favoritesLoading, toggleFavorite, pendingFavorites } = useFavorites(currentProfile);

  // Derived state
  const servers = useMemo(() => {
    const s = new Set(items.map(i => i.server));
    return Array.from(s).sort();
  }, [items]);

  // Default server selection logic
  const currentServer = useMemo(() => {
    if (dashboardServer) return dashboardServer;
    if (servers.length > 0) {
      return servers.includes('Draconiros') ? 'Draconiros' : servers[0];
    }
    return null;
  }, [dashboardServer, servers]);

  // Filter items for Market Page
  const filteredItems = useMemo(() => {
    let res = items;
    if (currentServer) {
      res = res.filter(i => i.server === currentServer);
    }
    if (marketSearch.trim()) {
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const q = normalize(marketSearch);
      res = res.filter(i => normalize(i.item_name).includes(q));
    }
    
    // Sort
    res.sort((a, b) => {
      if (sortType === 'price') {
        const valA = a.last_price;
        const valB = b.last_price;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      } else {
        // Use localeCompare for accent-insensitive sorting
        return sortOrder === 'asc' 
          ? a.item_name.localeCompare(b.item_name, 'fr', { sensitivity: 'base' })
          : b.item_name.localeCompare(a.item_name, 'fr', { sensitivity: 'base' });
      }
    });

    return res;
  }, [items, currentServer, marketSearch, sortType, sortOrder]);

  const navigate = useNavigate();
  const handleNavigateToItem = (item: ItemSummary) => {
    navigate(`/item/${item.server}/${encodeURIComponent(item.item_name)}`);
  };

  const handleItemUpdate = (oldName: string, newName: string, server: string, newCategory: string) => {
    updateItemMutation.mutate({ oldName, newName, server, category: newCategory });
  };

  // Date range state
  const [dateRange, setDateRange] = useState<DateRangePreset>(DEFAULT_RANGE);
  
  // Price filters
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Favorites filter state
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  return (
    <Routes>
      <Route element={
        <MainLayout 
          currentProfile={currentProfile}
          onSelectProfile={setCurrentProfile}
          servers={servers}
          selectedServer={currentServer}
          onSelectServer={setDashboardServer}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          minPrice={minPrice}
          onMinPriceChange={setMinPrice}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
          onlyFavorites={onlyFavorites}
          onToggleOnlyFavorites={() => setOnlyFavorites(!onlyFavorites)}
        />
      }>
        <Route 
          path="/" 
          element={
            <Dashboard
              items={items}
              favorites={favorites}
              favoritesLoading={favoritesLoading}
              onNavigateToItem={handleNavigateToItem}
              onToggleFavorite={toggleFavorite}
              server={currentServer}
              dateRange={dateRange}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onlyFavorites={onlyFavorites}
              currentProfile={currentProfile}
            />
          } 
        />
        <Route 
          path="/market" 
          element={
            <MarketPage
              items={filteredItems}
              loading={itemsLoading}
              error={itemsError ? (itemsError instanceof Error ? itemsError.message : String(itemsError)) : null}
              favorites={favorites}
              pendingFavorites={pendingFavorites}
              onToggleFavorite={toggleFavorite}
              sortType={sortType}
              sortOrder={sortOrder}
              onSortChange={(type, order) => {
                setSortType(type);
                setSortOrder(order);
              }}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              search={marketSearch}
              onSearchChange={setMarketSearch}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onlyFavorites={onlyFavorites}
              dateRange={dateRange}
              currentProfile={currentProfile}
            />
          } 
        />

        <Route
          path="/bank"
          element={
            <BankPage
              server={currentServer}
              currentProfile={currentProfile}
              dateRange={dateRange}
              categories={categories}
            />
          }
        />
        <Route
          path="/bank/crafts"
          element={
            <BankCraftOpportunitiesPage
              server={currentServer}
              currentProfile={currentProfile}
            />
          }
        />
        <Route 
          path="/item/:server/:itemName" 
          element={
            <ItemDetailsPage 
              items={items}
              dateRange={dateRange}
              favorites={favorites}
              pendingFavorites={pendingFavorites}
              onToggleFavorite={toggleFavorite}
              onItemUpdate={handleItemUpdate}
              currentProfile={currentProfile}
            />
          } 
        />
        <Route 
          path="/lists" 
          element={
            <ListsPage 
              currentProfile={currentProfile} 
              dateRange={dateRange}
            />
          } 
        />
        <Route 
          path="/lists/:listId" 
          element={
            <ListDetailsPage 
              dateRange={dateRange}
              favorites={favorites}
              pendingFavorites={pendingFavorites}
              onToggleFavorite={toggleFavorite}
              onlyFavorites={onlyFavorites}
            />
          } 
        />
        <Route 
          path="/analysis" 
          element={<Navigate to="/analysis/scanner" replace />} 
        />
        <Route 
          path="/analysis/scanner" 
          element={
            <MarketScannerPage 
              server={dashboardServer} 
              dateRange={dateRange}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onlyFavorites={onlyFavorites}
              favorites={favorites}
            />
          } 
        />
        <Route 
          path="/analysis/trends" 
          element={
            <TrendHunterPage 
              server={dashboardServer} 
              dateRange={dateRange}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onlyFavorites={onlyFavorites}
              favorites={favorites}
            />
          } 
        />
        <Route 
          path="/analysis/matrix" 
          element={
            <RiskMatrixPage 
              server={dashboardServer} 
              dateRange={dateRange}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onlyFavorites={onlyFavorites}
              favorites={favorites}
            />
          } 
        />
        <Route 
          path="/crafting" 
          element={
            <CraftingMarketPage 
              server={dashboardServer} 
            />
          } 
        />
        <Route 
          path="/recipes/item/:itemId" 
          element={
            <RecipeDetailsPage 
              server={dashboardServer} 
              dateRange={dateRange}
            />
          } 
        />
        <Route 
          path="/recipes/:id" 
          element={
            <RecipeDetailsPage 
              server={dashboardServer} 
              dateRange={dateRange}
            />
          } 
        />
        
        {/* Toolbox Routes */}
        <Route path="/toolbox/consumables" element={<ConsumablesPage server={currentServer} />} />
        <Route path="/toolbox/leveling" element={<LevelingOptimizerPage />} />
        <Route path="/toolbox/almanax" element={<AlmanaxPage server={currentServer} />} />

      </Route>
    </Routes>
  );
};

export default App;
