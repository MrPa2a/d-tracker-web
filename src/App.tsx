// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { fetchItems, fetchProfileFavorites, addProfileFavorite, removeProfileFavorite, fetchCategories } from './api';
import type { DateRangePreset, ItemSummary, SortType, SortOrder, Profile, Category } from './types';
import { MainLayout } from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ItemDetailsPage from './pages/ItemDetailsPage';
import MarketPage from './pages/MarketPage';

const DEFAULT_RANGE: DateRangePreset = '30d';

const App: React.FC = () => {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
  
  const search = '';
  const [sortType, setSortType] = useState<SortType>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

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

  const [favoritesLoading, setFavoritesLoading] = useState(false);
  
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

  // Load favorites when profile changes
  useEffect(() => {
    let cancelled = false;
    
    const loadFavorites = async () => {
      if (currentProfile) {
        setFavoritesLoading(true);
        try {
          const favs = await fetchProfileFavorites(currentProfile.id);
          if (!cancelled) setFavorites(new Set(favs));
        } catch (err) {
          console.error('Failed to load profile favorites', err);
        } finally {
          if (!cancelled) setFavoritesLoading(false);
        }
      } else {
        // Load from local storage
        try {
          const raw = localStorage.getItem('favorites');
          if (raw) {
            const arr = JSON.parse(raw) as string[];
            const migrated = arr.map(fav => {
              const parts = fav.split('::');
              return parts.length > 1 ? parts[1] : fav;
            });
            if (!cancelled) setFavorites(new Set(migrated));
          } else {
            if (!cancelled) setFavorites(new Set());
          }
        } catch (e) {
          console.warn('Failed to load favorites', e);
          if (!cancelled) setFavorites(new Set());
        }
        if (!cancelled) setFavoritesLoading(false);
      }
    };

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [currentProfile]);

  // Save local favorites
  useEffect(() => {
    if (!currentProfile) {
      const arr = Array.from(favorites);
      localStorage.setItem('favorites', JSON.stringify(arr));
    }
  }, [favorites, currentProfile]);

  const handleToggleFavorite = async (itemName: string) => {
    const newFavs = new Set(favorites);
    const isAdding = !newFavs.has(itemName);
    
    if (isAdding) {
      newFavs.add(itemName);
    } else {
      newFavs.delete(itemName);
    }
    setFavorites(newFavs);

    if (currentProfile) {
      try {
        if (isAdding) {
          await addProfileFavorite(currentProfile.id, itemName);
        } else {
          await removeProfileFavorite(currentProfile.id, itemName);
        }
      } catch (err) {
        console.error('Failed to sync favorite', err);
        // Revert on error
        setFavorites(prev => {
          const rev = new Set(prev);
          if (isAdding) rev.delete(itemName);
          else rev.add(itemName);
          return rev;
        });
      }
    }
  };

  // Load categories once
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await fetchCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    loadCategories();
  }, []);

  // Load items when category changes
  useEffect(() => {
    const loadItems = async () => {
      setItemsLoading(true);
      setItemsError(null);
      
      try {
        const data = await fetchItems(undefined, undefined, selectedCategory || undefined);
        setItems(data);
      } catch (err) {
        setItemsError(err instanceof Error ? err.message : String(err));
      } finally {
        setItemsLoading(false);
      }
    };
    loadItems();
  }, [selectedCategory]);

  // Derived state
  const servers = useMemo(() => {
    const s = new Set(items.map(i => i.server));
    return Array.from(s).sort();
  }, [items]);

  // Default server selection logic
  useEffect(() => {
    if (!dashboardServer && servers.length > 0) {
      const defaultServer = servers.includes('Draconiros') ? 'Draconiros' : servers[0];
      setDashboardServer(defaultServer);
    }
  }, [servers, dashboardServer]);

  const currentServer = dashboardServer;

  // Filter items for Market Page
  const filteredItems = useMemo(() => {
    let res = items;
    if (currentServer) {
      res = res.filter(i => i.server === currentServer);
    }
    if (search.trim()) {
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const q = normalize(search);
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
  }, [items, currentServer, search, sortType, sortOrder]);

  const navigate = useNavigate();
  const handleNavigateToItem = (item: ItemSummary) => {
    navigate(`/item/${item.server}/${encodeURIComponent(item.item_name)}`);
  };

  const handleItemUpdate = (oldName: string, newName: string, server: string, newCategory: string) => {
    setItems(prev => prev.map(i => {
      if (i.item_name === oldName && i.server === server) {
        return { ...i, item_name: newName, category: newCategory };
      }
      return i;
    }));
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
          selectedServer={dashboardServer}
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
              onToggleFavorite={handleToggleFavorite}
              server={dashboardServer}
              dateRange={dateRange}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onlyFavorites={onlyFavorites}
            />
          } 
        />
        <Route 
          path="/market" 
          element={
            <MarketPage
              items={filteredItems}
              loading={itemsLoading}
              error={itemsError}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              sortType={sortType}
              sortOrder={sortOrder}
              onSortChange={(type, order) => {
                setSortType(type);
                setSortOrder(order);
              }}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onlyFavorites={onlyFavorites}
              dateRange={dateRange}
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
              onToggleFavorite={handleToggleFavorite}
              onItemUpdate={handleItemUpdate}
            />
          } 
        />
        {/* Placeholder routes */}
        <Route path="/favorites" element={<div className="text-white p-8">Favoris (À venir)</div>} />
        <Route path="/analytics" element={<div className="text-white p-8">Analyses (À venir)</div>} />
      </Route>
    </Routes>
  );
};

export default App;
