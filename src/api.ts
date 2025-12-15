// src/api.ts
import type { ItemSummary, TimeseriesPoint, DateRangePreset, Mover, ItemStats, MarketIndex, VolatilityRanking, InvestmentOpportunity, SellOpportunity, Profile, Category, List, ScannerResult, TrendFilters, TrendResult, ScannerFilters, RecipeStats, RecipeFilters, Job, RecipeDetails } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_TOKEN = import.meta.env.VITE_API_TOKEN as string | undefined;

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  }

  return headers;
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Le serveur est inaccessible. Veuillez vérifier votre connexion internet.');
    }
    throw err;
  }
}

export async function fetchItems(search?: string, server?: string, category?: string): Promise<ItemSummary[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (server) params.append('server', server);
  if (category) params.append('category', category);

  const res = await safeFetch(`${API_BASE}/api/items?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/items : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await safeFetch(`${API_BASE}/api/categories`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/categories : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await safeFetch(`${API_BASE}/api/recipes?mode=jobs`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/recipes?mode=jobs : ${res.status} ${res.statusText}`);
  }
  return res.json();
}



export async function fetchProfiles(): Promise<Profile[]> {
  const res = await safeFetch(`${API_BASE}/api/profiles`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/profiles : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function createProfile(name: string): Promise<Profile> {
  const res = await safeFetch(`${API_BASE}/api/profiles`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    if (res.status === 409) {
      throw new Error('Ce nom de profil existe déjà');
    }
    throw new Error(`Erreur API /api/profiles : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function deleteProfile(id: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/profiles?id=${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/profiles : ${res.status} ${res.statusText}`);
  }
}

export async function fetchProfileFavorites(profileId: string): Promise<string[]> {
  const res = await safeFetch(`${API_BASE}/api/profiles?mode=favorites&profileId=${profileId}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/profiles?mode=favorites : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function addProfileFavorite(profileId: string, itemName: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/profiles?mode=favorites`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ profileId, itemName }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/profiles?mode=favorites : ${res.status} ${res.statusText}`);
  }
}

export async function removeProfileFavorite(profileId: string, itemName: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/profiles?mode=favorites`, {
    method: 'DELETE',
    headers: buildHeaders(),
    body: JSON.stringify({ profileId, itemName }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/profiles?mode=favorites : ${res.status} ${res.statusText}`);
  }
}

export async function updateItem(oldName: string, newName: string, server: string, category?: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/items`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ old_item_name: oldName, new_item_name: newName, server, category }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/items (update) : ${res.status} ${res.statusText}`);
  }
}

export async function updateObservation(id: number, price: number): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/observations`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ id, price_unit_avg: price }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/observations (update) : ${res.status} ${res.statusText}`);
  }
}

function toDateOnlyIso(d: Date): string {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function computeFromDate(preset: DateRangePreset): string {
  const now = new Date();
  const d = new Date(now);
  const days =
    preset === '7d' ? 7 :
    preset === '30d' ? 30 :
    preset === '90d' ? 90 :
    365;
  d.setDate(now.getDate() - days);
  return toDateOnlyIso(d);
}

export async function fetchTimeseries(
  itemName: string,
  server: string,
  range: DateRangePreset
): Promise<TimeseriesPoint[]> {
  const from = computeFromDate(range);
  const to = toDateOnlyIso(new Date());

  const params = new URLSearchParams({
    item: itemName,
    server,
    from,
    to,
  });

  const res = await safeFetch(
    `${API_BASE}/api/timeseries?${params.toString()}`,
    {
      method: 'GET',
      headers: buildHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Erreur API /api/timeseries : ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

/**
 * Fetch top movers (increase/decrease) for a server and date range.
 */
export async function fetchMovers(
  server: string,
  range: DateRangePreset,
  limit = 10,
  minPrice?: number,
  maxPrice?: number,
  filterItems?: string[],
  order: 'asc' | 'desc' | 'abs' = 'abs'
): Promise<Mover[]> {
  const from = computeFromDate(range);
  const to = toDateOnlyIso(new Date());

  const params = new URLSearchParams({ server, from, to, limit: String(limit), order });
  if (minPrice !== undefined) params.append('min_price', String(minPrice));
  if (maxPrice !== undefined) params.append('max_price', String(maxPrice));
  if (filterItems && filterItems.length > 0) params.append('filterItems', filterItems.join(','));

  const res = await safeFetch(`${API_BASE}/api/market?type=movers&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market?type=movers : ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch item statistics (volatility, median, signal)
 */
export async function fetchItemStats(
  itemName: string,
  server: string,
  range: DateRangePreset
): Promise<ItemStats | null> {
  const from = computeFromDate(range);
  const to = toDateOnlyIso(new Date());

  const params = new URLSearchParams({ item: itemName, server, from, to });

  const res = await safeFetch(`${API_BASE}/api/market?type=stats&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market?type=stats : ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch market index (HDV index)
 */
export async function fetchMarketIndex(
  server: string,
  range: DateRangePreset,
  filterItems?: string[]
): Promise<MarketIndex | null> {
  const from = computeFromDate(range);
  const to = toDateOnlyIso(new Date());

  const params = new URLSearchParams({ server, from, to });
  if (filterItems && filterItems.length > 0) params.append('filterItems', filterItems.join(','));

  const res = await safeFetch(`${API_BASE}/api/market?type=index&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market?type=index : ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch volatility rankings (most/least volatile items)
 */
export async function fetchVolatilityRankings(
  server: string,
  range: DateRangePreset,
  limit = 10,
  order: 'asc' | 'desc' = 'desc',
  minPrice?: number,
  maxPrice?: number,
  filterItems?: string[]
): Promise<VolatilityRanking[]> {
  const from = computeFromDate(range);
  const to = toDateOnlyIso(new Date());

  const params = new URLSearchParams({ 
    server, 
    from, 
    to, 
    limit: String(limit),
    order 
  });
  if (minPrice !== undefined) params.append('min_price', String(minPrice));
  if (maxPrice !== undefined) params.append('max_price', String(maxPrice));
  if (filterItems && filterItems.length > 0) params.append('filterItems', filterItems.join(','));

  const res = await safeFetch(`${API_BASE}/api/market?type=volatility&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market?type=volatility : ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch investment opportunities (buy signals)
 */
export async function fetchOpportunities(
  server: string,
  range: DateRangePreset,
  limit = 20,
  minPrice?: number,
  maxPrice?: number,
  filterItems?: string[]
): Promise<InvestmentOpportunity[]> {
  const from = computeFromDate(range);
  const to = toDateOnlyIso(new Date());

  const params = new URLSearchParams({ server, from, to, limit: String(limit) });
  if (minPrice !== undefined) params.append('min_price', String(minPrice));
  if (maxPrice !== undefined) params.append('max_price', String(maxPrice));
  if (filterItems && filterItems.length > 0) params.append('filterItems', filterItems.join(','));

  const res = await safeFetch(`${API_BASE}/api/market?type=opportunities&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market?type=opportunities : ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch sell opportunities (sell signals)
 */
export async function fetchSellOpportunities(
  server: string,
  range: DateRangePreset,
  limit = 20,
  minPrice?: number,
  maxPrice?: number,
  filterItems?: string[]
): Promise<SellOpportunity[]> {
  const from = computeFromDate(range);
  const to = toDateOnlyIso(new Date());

  const params = new URLSearchParams({ server, from, to, limit: String(limit) });
  if (minPrice !== undefined) params.append('min_price', String(minPrice));
  if (maxPrice !== undefined) params.append('max_price', String(maxPrice));
  if (filterItems && filterItems.length > 0) params.append('filterItems', filterItems.join(','));

  const res = await safeFetch(`${API_BASE}/api/market?type=sell-opportunities&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market?type=sell-opportunities : ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function createObservation(itemName: string, server: string, price: number, date: string): Promise<TimeseriesPoint> {
  const res = await safeFetch(`${API_BASE}/api/observations`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ 
      item_name: itemName, 
      server, 
      price_unit_avg: price, 
      captured_at: date 
    }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/observations (create) : ${res.status} ${res.statusText}`);
  }
  
  const json = await res.json();
  return {
    id: json.data.id,
    date: json.data.captured_at,
    avg_price: json.data.price_unit_avg
  };
}

export async function deleteObservation(id: number): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/observations`, {
    method: 'DELETE',
    headers: buildHeaders(),
    body: JSON.stringify({ id }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/observations (delete) : ${res.status} ${res.statusText}`);
  }
}

export async function fetchLists(profileId?: string, range: DateRangePreset = '30d'): Promise<List[]> {
  const params = new URLSearchParams();
  if (profileId) params.append('profileId', profileId);
  params.append('range', range);

  const res = await safeFetch(`${API_BASE}/api/lists?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/lists : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchListDetails(listId: string, range?: string, server?: string): Promise<List> {
  const params = new URLSearchParams();
  params.append('id', listId);
  if (range) params.append('range', range);
  if (server) params.append('server', server);

  const res = await safeFetch(`${API_BASE}/api/lists?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/lists details : ${res.status} ${res.statusText}`);
  }
  
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  throw new Error('Liste introuvable');
}

export async function createList(name: string, scope: 'public' | 'private', profileId?: string): Promise<List> {
  const res = await safeFetch(`${API_BASE}/api/lists`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ name, scope, profileId }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/lists (create) : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function updateList(id: string, updates: { name?: string, scope?: 'public' | 'private', profileId?: string }): Promise<List> {
  const res = await safeFetch(`${API_BASE}/api/lists`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ id, ...updates }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/lists (update) : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function deleteList(id: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/lists?id=${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/lists (delete) : ${res.status} ${res.statusText}`);
  }
}

export async function addItemToList(listId: string, itemId: number, quantity: number = 1): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/lists?mode=items`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ listId, itemId, quantity }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/lists (add item) : ${res.status} ${res.statusText}`);
  }
}

export async function updateItemInList(listId: string, itemId: number, quantity: number): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/lists?mode=items`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ listId, itemId, quantity }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/lists (update item) : ${res.status} ${res.statusText}`);
  }
}

export async function removeItemFromList(listId: string, itemId: number): Promise<void> {
  const params = new URLSearchParams();
  params.append('mode', 'items');
  params.append('listId', listId);
  params.append('itemId', itemId.toString());

  const res = await safeFetch(`${API_BASE}/api/lists?${params.toString()}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/lists (remove item) : ${res.status} ${res.statusText}`);
  }
}

export async function fetchScannerResults(filters: ScannerFilters): Promise<ScannerResult[]> {
  const params = new URLSearchParams();
  params.append('type', 'scanner');
  params.append('server', filters.server);
  
  if (filters.min_price) params.append('min_price', filters.min_price.toString());
  if (filters.max_price) params.append('max_price', filters.max_price.toString());
  if (filters.min_profit) params.append('min_profit', filters.min_profit.toString());
  if (filters.min_margin) params.append('min_margin', filters.min_margin.toString());
  if (filters.freshness) params.append('freshness', filters.freshness.toString());
  if (filters.min_volatility) params.append('min_volatility', filters.min_volatility.toString());
  if (filters.max_volatility) params.append('max_volatility', filters.max_volatility.toString());
  if (filters.categories && filters.categories.length > 0) params.append('categories', filters.categories.join(','));
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.period) params.append('period', filters.period.toString());
  if (filters.filter_items && filters.filter_items.length > 0) params.append('filter_items', filters.filter_items.join(','));

  const res = await safeFetch(`${API_BASE}/api/analysis?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/analysis : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchTrendResults(filters: TrendFilters): Promise<TrendResult[]> {
  const params = new URLSearchParams();
  params.append('type', 'trends');
  params.append('server', filters.server);
  
  if (filters.min_price) params.append('min_price', filters.min_price.toString());
  if (filters.max_price) params.append('max_price', filters.max_price.toString());
  if (filters.trend_type) params.append('trend_type', filters.trend_type);
  if (filters.categories && filters.categories.length > 0) params.append('categories', filters.categories.join(','));
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.period) params.append('period', filters.period.toString());
  if (filters.filter_items && filters.filter_items.length > 0) params.append('filter_items', filters.filter_items.join(','));

  const res = await safeFetch(`${API_BASE}/api/analysis?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/analysis (trends) : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRecipes(filters: RecipeFilters): Promise<RecipeStats[]> {
  const params = new URLSearchParams();
  params.append('server', filters.server);
  
  if (filters.min_level !== undefined) params.append('min_level', filters.min_level.toString());
  if (filters.max_level !== undefined) params.append('max_level', filters.max_level.toString());
  if (filters.job_id !== undefined) params.append('job_id', filters.job_id.toString());
  if (filters.min_roi !== undefined) params.append('min_roi', filters.min_roi.toString());
  if (filters.search) params.append('search', filters.search);
  if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
  if (filters.offset !== undefined) params.append('offset', filters.offset.toString());
  if (filters.sort_by) params.append('sort_by', filters.sort_by);

  const res = await safeFetch(`${API_BASE}/api/recipes?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/recipes : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRecipeDetails(id: number, server: string): Promise<RecipeDetails> {
  const params = new URLSearchParams({ id: id.toString(), server });
  
  const res = await safeFetch(`${API_BASE}/api/recipes?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/recipes (details) : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

