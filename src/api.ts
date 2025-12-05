// src/api.ts
import type { ItemSummary, TimeseriesPoint, DateRangePreset, Mover, ItemStats, MarketIndex, VolatilityRanking, InvestmentOpportunity, SellOpportunity, Profile } from './types';

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

export async function fetchItems(): Promise<ItemSummary[]> {
  const res = await fetch(`${API_BASE}/api/items`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/items : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchProfiles(): Promise<Profile[]> {
  const res = await fetch(`${API_BASE}/api/profiles`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/profiles : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function createProfile(name: string): Promise<Profile> {
  const res = await fetch(`${API_BASE}/api/profiles`, {
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

export async function fetchProfileFavorites(profileId: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/favorites?profileId=${profileId}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/favorites : ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function addProfileFavorite(profileId: string, itemName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/favorites`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ profileId, itemName }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/favorites : ${res.status} ${res.statusText}`);
  }
}

export async function removeProfileFavorite(profileId: string, itemName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/favorites`, {
    method: 'DELETE',
    headers: buildHeaders(),
    body: JSON.stringify({ profileId, itemName }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/favorites : ${res.status} ${res.statusText}`);
  }
}

export async function updateItem(oldName: string, newName: string, server: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/update-item`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ old_item_name: oldName, new_item_name: newName, server }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/update-item : ${res.status} ${res.statusText}`);
  }
}

export async function updateObservation(id: number, price: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/update-observation`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ id, price_unit_avg: price }),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/update-observation : ${res.status} ${res.statusText}`);
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

  const res = await fetch(
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
  filterItems?: string[]
): Promise<Mover[]> {
  const from = computeFromDate(range);
  const to = toDateOnlyIso(new Date());

  const params = new URLSearchParams({ server, from, to, limit: String(limit) });
  if (minPrice !== undefined) params.append('min_price', String(minPrice));
  if (maxPrice !== undefined) params.append('max_price', String(maxPrice));
  if (filterItems && filterItems.length > 0) params.append('filterItems', filterItems.join(','));

  const res = await fetch(`${API_BASE}/api/movers?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/movers : ${res.status} ${res.statusText}`);
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

  const res = await fetch(`${API_BASE}/api/item-stats?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/item-stats : ${res.status} ${res.statusText}`);
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

  const res = await fetch(`${API_BASE}/api/market-index?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/market-index : ${res.status} ${res.statusText}`);
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

  const res = await fetch(`${API_BASE}/api/volatility-rankings?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/volatility-rankings : ${res.status} ${res.statusText}`);
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

  const res = await fetch(`${API_BASE}/api/opportunities?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/opportunities : ${res.status} ${res.statusText}`);
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

  const res = await fetch(`${API_BASE}/api/sell-opportunities?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/sell-opportunities : ${res.status} ${res.statusText}`);
  }

  return res.json();
}
