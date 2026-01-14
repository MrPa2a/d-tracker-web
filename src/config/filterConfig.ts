// Configuration de visibilité des filtres par route
// Détermine quels filtres du Header sont actifs ou grisés selon la page

export interface FilterVisibility {
  server: boolean;
  dateRange: boolean;
  price: boolean;      // minPrice + maxPrice
  favorites: boolean;  // onlyFavorites
}

// Configuration par route
// Les routes avec paramètres utilisent des patterns simplifiés
export const FILTER_CONFIG: Record<string, FilterVisibility> = {
  // Dashboard - Tous les filtres actifs
  '/': { server: true, dateRange: true, price: true, favorites: true },
  
  // Market - Tous les filtres actifs
  '/market': { server: true, dateRange: true, price: true, favorites: true },
  
  // Analysis pages - Tous les filtres actifs
  '/analysis/scanner': { server: true, dateRange: true, price: true, favorites: true },
  '/analysis/trends': { server: true, dateRange: true, price: true, favorites: true },
  '/analysis/matrix': { server: true, dateRange: true, price: true, favorites: true },
  
  // Crafting - Pas de dateRange (prix calculés en temps réel)
  '/crafting': { server: true, dateRange: false, price: true, favorites: true },
  
  // Bank - Tous les filtres actifs
  '/bank': { server: true, dateRange: true, price: true, favorites: true },
  
  // Bank Craft Opportunities - Pas de dateRange
  '/bank/crafts': { server: true, dateRange: false, price: true, favorites: true },
  
  // Lists index - Seul le serveur est pertinent
  '/lists': { server: true, dateRange: false, price: false, favorites: false },
  
  // List details - Tous les filtres actifs (pattern pour route dynamique)
  '/lists/:listId': { server: true, dateRange: true, price: true, favorites: true },
  
  // Toolbox - Consumables: pas de dateRange
  '/toolbox/consumables': { server: true, dateRange: false, price: true, favorites: true },
  
  // Toolbox - Leveling: seul le serveur
  '/toolbox/leveling': { server: true, dateRange: false, price: false, favorites: false },
  
  // Toolbox - Almanax: seul le serveur
  '/toolbox/almanax': { server: true, dateRange: false, price: false, favorites: false },
  
  // Item details - Server + DateRange, pas de prix/favoris
  '/item/:server/:itemName': { server: true, dateRange: true, price: false, favorites: false },
  
  // Recipe details - Server + DateRange, pas de prix/favoris
  '/recipes/:id': { server: true, dateRange: true, price: false, favorites: false },
  '/recipes/item/:itemId': { server: true, dateRange: true, price: false, favorites: false },
};

// Configuration par défaut (tous les filtres actifs)
const DEFAULT_CONFIG: FilterVisibility = {
  server: true,
  dateRange: true,
  price: true,
  favorites: true,
};

/**
 * Récupère la configuration de visibilité des filtres pour une route donnée
 * Gère les routes dynamiques avec paramètres (ex: /lists/123 -> /lists/:listId)
 */
export function getFilterVisibility(pathname: string): FilterVisibility {
  // Vérification exacte d'abord
  if (FILTER_CONFIG[pathname]) {
    return FILTER_CONFIG[pathname];
  }

  // Gestion des routes dynamiques
  // /lists/xxx -> /lists/:listId
  if (pathname.startsWith('/lists/') && pathname !== '/lists') {
    return FILTER_CONFIG['/lists/:listId'] || DEFAULT_CONFIG;
  }

  // /item/xxx/xxx -> /item/:server/:itemName
  if (pathname.startsWith('/item/')) {
    return FILTER_CONFIG['/item/:server/:itemName'] || DEFAULT_CONFIG;
  }

  // /recipes/xxx -> /recipes/:id ou /recipes/item/:itemId
  if (pathname.startsWith('/recipes/item/')) {
    return FILTER_CONFIG['/recipes/item/:itemId'] || DEFAULT_CONFIG;
  }
  if (pathname.startsWith('/recipes/')) {
    return FILTER_CONFIG['/recipes/:id'] || DEFAULT_CONFIG;
  }

  // Route non trouvée, retourne la config par défaut
  return DEFAULT_CONFIG;
}
