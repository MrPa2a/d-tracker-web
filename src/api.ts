// src/api.ts
import type { ItemSummary, TimeseriesPoint, DateRangePreset, Mover, ItemStats, MarketIndex, VolatilityRanking, InvestmentOpportunity, SellOpportunity, Profile, Category, List, ScannerResult, TrendFilters, TrendResult, ScannerFilters, RecipeStats, RecipeFilters, Job, RecipeDetails, RecipeUsage, ItemDetails, Message, BankResponse, CraftOpportunityFilters, CraftOpportunity, CraftIngredientStatus } from './types';

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

  const res = await safeFetch(`${API_BASE}/api/data?resource=items&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/data?resource=items : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchItemDetails(itemName: string, server: string): Promise<ItemDetails> {
  const params = new URLSearchParams();
  params.append('mode', 'details');
  params.append('item_name', itemName);
  params.append('server', server);

  const res = await safeFetch(`${API_BASE}/api/data?resource=items&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/data?resource=items&mode=details : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await safeFetch(`${API_BASE}/api/data?resource=categories`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/data?resource=categories : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await safeFetch(`${API_BASE}/api/data?resource=recipes&mode=jobs`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/data?resource=recipes&mode=jobs : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchItemRecipe(itemId: number, server: string): Promise<RecipeStats | null> {
  const res = await safeFetch(`${API_BASE}/api/data?resource=recipes&item_id=${itemId}&server=${server}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/data?resource=recipes : ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.length > 0 ? data[0] : null;
}

export async function fetchItemUsages(
  itemName: string, 
  server: string, 
  limit: number = 20, 
  offset: number = 0, 
  search?: string
): Promise<RecipeUsage[]> {
  const params = new URLSearchParams();
  params.append('mode', 'usage');
  params.append('item_name', itemName);
  params.append('server', server);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  if (search) params.append('search', search);

  const res = await safeFetch(`${API_BASE}/api/data?resource=recipes&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/data?resource=recipes&mode=usage : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function updateRecipe(
  recipeId: number, 
  ingredients: { item_id: number; quantity: number }[],
  resultItemId?: number,
  level?: number
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = { recipe_id: recipeId, ingredients };
  if (resultItemId) body.result_item_id = resultItemId;
  if (level) body.level = level;

  const res = await safeFetch(`${API_BASE}/api/data?resource=recipes`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/data?resource=recipes (POST) : ${res.status} ${res.statusText}`);
  }
}

export async function fetchProfiles(): Promise<Profile[]> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=profiles`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=profiles : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchBankContent(server: string, profileId?: string | null): Promise<BankResponse> {
  const params = new URLSearchParams({ server });
  if (profileId) params.append('profileId', profileId);

  const res = await safeFetch(`${API_BASE}/api/user?resource=bank&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=bank : ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function createProfile(name: string): Promise<Profile> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=profiles`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    if (res.status === 409) {
      throw new Error('Ce nom de profil existe déjà');
    }
    throw new Error(`Erreur API /api/user?resource=profiles : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function deleteProfile(id: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=profiles&id=${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=profiles : ${res.status} ${res.statusText}`);
  }
}

export async function fetchProfileFavorites(profileId: string): Promise<string[]> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=profiles&mode=favorites&profileId=${profileId}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=profiles&mode=favorites : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function addProfileFavorite(profileId: string, itemName: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=profiles&mode=favorites`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ profileId, itemName }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=profiles&mode=favorites : ${res.status} ${res.statusText}`);
  }
}

export async function removeProfileFavorite(profileId: string, itemName: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=profiles&mode=favorites`, {
    method: 'DELETE',
    headers: buildHeaders(),
    body: JSON.stringify({ profileId, itemName }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=profiles&mode=favorites : ${res.status} ${res.statusText}`);
  }
}

export async function updateItem(oldName: string, newName: string, server: string, category?: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/data?resource=items`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ old_item_name: oldName, new_item_name: newName, server, category }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/data?resource=items (update) : ${res.status} ${res.statusText}`);
  }
}

export async function updateObservation(id: number, price: number): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/market_v2?resource=observations`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ id, price_unit_avg: price }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market_v2?resource=observations (update) : ${res.status} ${res.statusText}`);
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
    `${API_BASE}/api/market_v2?resource=timeseries&${params.toString()}`,
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

  const res = await safeFetch(`${API_BASE}/api/market_v2?resource=market&type=movers&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market_v2?resource=market&type=movers : ${res.status} ${res.statusText}`);
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

  const res = await safeFetch(`${API_BASE}/api/market_v2?resource=market&type=stats&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market_v2?resource=market&type=stats : ${res.status} ${res.statusText}`);
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

  const res = await safeFetch(`${API_BASE}/api/market_v2?resource=market&type=index&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market_v2?resource=market&type=index : ${res.status} ${res.statusText}`);
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

  const res = await safeFetch(`${API_BASE}/api/market_v2?resource=market&type=volatility&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market_v2?resource=market&type=volatility : ${res.status} ${res.statusText}`);
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

  const res = await safeFetch(`${API_BASE}/api/market_v2?resource=market&type=opportunities&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market_v2?resource=market&type=opportunities : ${res.status} ${res.statusText}`);
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

  const res = await safeFetch(`${API_BASE}/api/market_v2?resource=market&type=sell-opportunities&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market_v2?resource=market&type=sell-opportunities : ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function createObservation(itemName: string, server: string, price: number, date: string): Promise<TimeseriesPoint> {
  const res = await safeFetch(`${API_BASE}/api/market_v2?resource=observations`, {
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
    throw new Error(`Erreur API /api/market_v2?resource=observations (create) : ${res.status} ${res.statusText}`);
  }
  
  const json = await res.json();
  return {
    id: json.data.id,
    date: json.data.captured_at,
    avg_price: json.data.price_unit_avg
  };
}

export async function deleteObservation(id: number): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/market_v2?resource=observations`, {
    method: 'DELETE',
    headers: buildHeaders(),
    body: JSON.stringify({ id }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market_v2?resource=observations (delete) : ${res.status} ${res.statusText}`);
  }
}

export async function fetchLists(profileId?: string, range: DateRangePreset = '30d'): Promise<List[]> {
  const params = new URLSearchParams();
  if (profileId) params.append('profileId', profileId);
  params.append('range', range);

  const res = await safeFetch(`${API_BASE}/api/user?resource=lists&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=lists : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchListDetails(listId: string, range?: string, server?: string): Promise<List> {
  const params = new URLSearchParams();
  params.append('id', listId);
  if (range) params.append('range', range);
  if (server) params.append('server', server);

  const res = await safeFetch(`${API_BASE}/api/user?resource=lists&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=lists details : ${res.status} ${res.statusText}`);
  }
  
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  throw new Error('Liste introuvable');
}

export async function createList(name: string, scope: 'public' | 'private', profileId?: string): Promise<List> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=lists`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ name, scope, profileId }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=lists (create) : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function updateList(id: string, updates: { name?: string, scope?: 'public' | 'private', profileId?: string }): Promise<List> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=lists`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ id, ...updates }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=lists (update) : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function deleteList(id: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=lists&id=${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=lists (delete) : ${res.status} ${res.statusText}`);
  }
}

export async function addItemToList(listId: string, itemId: number, quantity: number = 1): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=lists&mode=items`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ listId, itemId, quantity }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=lists (add item) : ${res.status} ${res.statusText}`);
  }
}

export async function updateItemInList(listId: string, itemId: number, quantity: number): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=lists&mode=items`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ listId, itemId, quantity }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=lists (update item) : ${res.status} ${res.statusText}`);
  }
}

export async function removeItemFromList(listId: string, itemId: number): Promise<void> {
  const params = new URLSearchParams();
  params.append('mode', 'items');
  params.append('listId', listId);
  params.append('itemId', itemId.toString());

  const res = await safeFetch(`${API_BASE}/api/user?resource=lists&${params.toString()}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=lists (remove item) : ${res.status} ${res.statusText}`);
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

  const res = await safeFetch(`${API_BASE}/api/market_v2?resource=analysis&${params.toString()}`, {
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

  const res = await safeFetch(`${API_BASE}/api/market_v2?resource=analysis&${params.toString()}`, {
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

  const res = await safeFetch(`${API_BASE}/api/data?resource=recipes&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/data?resource=recipes : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRecipeDetails(id: number, server: string): Promise<RecipeDetails> {
  const params = new URLSearchParams({ id: id.toString(), server });
  
  const res = await safeFetch(`${API_BASE}/api/data?resource=recipes&${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/data?resource=recipes (details) : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function searchItems(query: string, limit = 10): Promise<any[]> {
  const res = await safeFetch(`${API_BASE}/api/data?resource=items&mode=search&search=${encodeURIComponent(query)}&limit=${limit}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch items');
  return res.json();
}

export async function createCustomRecipe(payload: { result_item_id: number; ingredients: { item_id: number; quantity: number }[] }): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/data?resource=recipes`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erreur lors de la sauvegarde');
  }
}

export async function deleteItem(id: number): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/data?resource=items&id=${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur API /api/data?resource=items DELETE : ${res.status} ${res.statusText}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchItemUsageStats(id: number): Promise<any> {
  const res = await safeFetch(`${API_BASE}/api/data?resource=items&mode=usage_stats&id=${id}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/data?resource=items (usage_stats) : ${res.status} ${res.statusText}`);
  }
  return res.json();
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchLevelingPlan(payload: { 
  job_id: number; 
  from_level: number; 
  to_level: number; 
  server: string;
  max_quantity_per_recipe?: number | null;
  penalty_mode?: 'none' | 'low' | 'medium' | 'high';
  // Custom penalty parameters (override preset if provided)
  custom_alpha?: number;
  custom_threshold?: number;
  custom_min_batch?: number;
  custom_max_resource_usage?: number;
}): Promise<any> {
  const res = await safeFetch(`${API_BASE}/api/data?resource=toolbox&mode=leveling`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur API /api/toolbox : ${res.status}`);
  }
  return res.json();
}


// =============================================
// Messages API (bulletin board)
// =============================================

// Constante pour la pagination (préparation pagination infinie)
export const MESSAGES_PAGE_SIZE = 20;

export async function fetchMessages(
  authorProfileId?: string, 
  readerProfileId?: string,
  limit = MESSAGES_PAGE_SIZE, 
  offset = 0
): Promise<Message[]> {
  const params = new URLSearchParams();
  params.append('resource', 'messages');
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  if (authorProfileId) params.append('profileId', authorProfileId);
  if (readerProfileId) params.append('readerProfileId', readerProfileId);

  const res = await safeFetch(`${API_BASE}/api/user?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=messages : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function createMessage(profileId: string, content: string): Promise<Message> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=messages`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ profileId, content }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=messages (POST) : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function updateMessage(id: string, profileId: string, content: string): Promise<Message> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=messages`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ id, profileId, content }),
  });

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('Vous ne pouvez modifier que vos propres messages');
    }
    if (res.status === 404) {
      throw new Error('Message non trouvé');
    }
    throw new Error(`Erreur API /api/user?resource=messages (PUT) : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function deleteMessage(id: string, profileId: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=messages&id=${id}&profileId=${profileId}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('Vous ne pouvez supprimer que vos propres messages');
    }
    if (res.status === 404) {
      throw new Error('Message non trouvé');
    }
    throw new Error(`Erreur API /api/user?resource=messages (DELETE) : ${res.status} ${res.statusText}`);
  }
}

// --- Messages Read/Unread API ---

export async function fetchUnreadCount(readerProfileId: string): Promise<number> {
  const res = await safeFetch(
    `${API_BASE}/api/user?resource=messages&mode=unread-count&readerProfileId=${readerProfileId}`,
    {
      method: 'GET',
      headers: buildHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=messages&mode=unread-count : ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.count;
}

export async function markMessagesAsRead(readerProfileId: string, messageIds: string[]): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=messages&mode=mark-read`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ readerProfileId, messageIds }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=messages&mode=mark-read : ${res.status} ${res.statusText}`);
  }
}

export async function markAllMessagesAsRead(readerProfileId: string): Promise<void> {
  const res = await safeFetch(`${API_BASE}/api/user?resource=messages&mode=mark-all-read`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ readerProfileId }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/user?resource=messages&mode=mark-all-read : ${res.status} ${res.statusText}`);
  }
}

// --- Bank Craft Opportunities API ---

export async function fetchCraftOpportunities(
  filters: CraftOpportunityFilters
): Promise<CraftOpportunity[]> {
  const params = new URLSearchParams();
  params.set('resource', 'bank');
  params.set('mode', 'craft-opportunities');
  params.set('server', filters.server);

  if (filters.profile_id) params.set('profileId', filters.profile_id);
  if (filters.max_missing !== undefined) params.set('max_missing', String(filters.max_missing));
  if (filters.min_level !== undefined) params.set('min_level', String(filters.min_level));
  if (filters.max_level !== undefined) params.set('max_level', String(filters.max_level));
  if (filters.job_id !== undefined) params.set('job_id', String(filters.job_id));
  if (filters.min_roi !== undefined) params.set('min_roi', String(filters.min_roi));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.search) params.set('search', filters.search);

  const res = await safeFetch(`${API_BASE}/api/user?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API craft-opportunities : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCraftIngredientsWithStock(
  recipeId: number,
  server: string,
  profileId?: string | null
): Promise<CraftIngredientStatus[]> {
  const params = new URLSearchParams();
  params.set('resource', 'bank');
  params.set('mode', 'craft-ingredients');
  params.set('server', server);
  params.set('recipe_id', String(recipeId));
  if (profileId) params.set('profileId', profileId);

  const res = await safeFetch(`${API_BASE}/api/user?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API craft-ingredients : ${res.status} ${res.statusText}`);
  }
  return res.json();
}