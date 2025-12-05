// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate, useMatch } from 'react-router-dom';
import { fetchItems, fetchProfileFavorites, addProfileFavorite, removeProfileFavorite } from './api';
import type { DateRangePreset, ItemSummary, SortType, SortOrder, Profile } from './types';
import { Layout } from './components/Layout';
import { ItemList } from './components/ItemList';
import { TopBar } from './components/TopBar';
import { ProfileSelector } from './components/ProfileSelector';
import Dashboard from './pages/Dashboard';
import ItemDetailsPage from './pages/ItemDetailsPage';

const DEFAULT_RANGE: DateRangePreset = '30d';

const App: React.FC = () => {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);

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
  
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ItemSummary[] | null>(null);
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
    setFavoritesLoading(true);
    if (currentProfile) {
      fetchProfileFavorites(currentProfile.id)
        .then(favs => setFavorites(new Set(favs)))
        .catch(err => console.error('Failed to load profile favorites', err))
        .finally(() => setFavoritesLoading(false));
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
          setFavorites(new Set(migrated));
        } else {
          setFavorites(new Set());
        }
      } catch (e) {
        console.warn('Failed to load favorites', e);
        setFavorites(new Set());
      }
      setFavoritesLoading(false);
    }
  }, [currentProfile]);

  const handleToggleFavorite = async (key: string) => {
    const next = new Set(favorites);
    const isAdding = !next.has(key);
    
    if (isAdding) next.add(key);
    else next.delete(key);
    
    setFavorites(next);

    if (currentProfile) {
      try {
        if (isAdding) {
          await addProfileFavorite(currentProfile.id, key);
        } else {
          await removeProfileFavorite(currentProfile.id, key);
        }
      } catch (err) {
        console.error('Failed to update profile favorite', err);
      }
    } else {
      try {
        localStorage.setItem('favorites', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.warn('Failed to persist favorites', e);
      }
    }
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

  // Search effect
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      if (search.trim()) {
        setItemsLoading(true);
        // On cherche sur le serveur courant si défini, sinon globalement (ou comportement par défaut)
        // Note: fetchItems a été modifié pour accepter search et server
        fetchItems(search, currentServer || undefined)
          .then((data) => {
            if (!cancelled) {
              setSearchResults(data);
              setItemsLoading(false);
            }
          })
          .catch((err) => {
            if (!cancelled) {
              console.error(err);
              setItemsLoading(false);
            }
          });
      } else {
        if (!cancelled) {
          setSearchResults(null);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, currentServer]);

  const filteredItems = useMemo(() => {
    // Si on a des résultats de recherche, on les utilise, sinon on prend la liste initiale
    const source = searchResults !== null ? searchResults : items;
    
    return source
      .filter((i) => !currentServer || i.server === currentServer)
      // On ne filtre plus par nom ici car c'est fait côté serveur lors de la recherche
      // .filter((i) =>
      //   i.item_name.toLowerCase().includes(search.trim().toLowerCase())
      // )
      .sort((a, b) => {
        if (sortType === 'name') {
          return sortOrder === 'asc' 
            ? a.item_name.localeCompare(b.item_name, 'fr')
            : b.item_name.localeCompare(a.item_name, 'fr');
        } else {
          return sortOrder === 'asc'
            ? a.last_price - b.last_price
            : b.last_price - a.last_price;
        }
      });
  }, [items, searchResults, currentServer, sortType, sortOrder]);

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
        <div className="flex flex-col h-full">
          <ProfileSelector 
            currentProfile={currentProfile} 
            onSelectProfile={setCurrentProfile} 
          />
          <div className="my-4 mx-2 h-px bg-gradient-to-r from-transparent via-border-normal to-transparent" />
          <div className="flex-1 min-h-0">
            <ItemList
              items={filteredItems}
              loading={itemsLoading}
              favoritesLoading={favoritesLoading}
              error={itemsError}
              onSearchChange={setSearch}
              search={search}
              selectedItem={selectedItem}
              onSelectItem={handleSelectItem}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              sortType={sortType}
              sortOrder={sortOrder}
              onSortChange={(type, order) => {
                setSortType(type);
                setSortOrder(order);
              }}
            />
          </div>
        </div>
      }
      topBar={
        <TopBar
          servers={servers}
          selectedServer={currentServer || null}
          onSelectServer={handleSelectServer}
          dateRange={dateRange}
          onChangeDateRange={setDateRange}
          onToggleSidebar={toggleSidebar}
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
                  favoritesLoading={favoritesLoading}
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
