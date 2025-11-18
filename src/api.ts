// src/api.ts
import type { ItemSummary, TimeseriesPoint, DateRangePreset } from './types';
import type { Mover } from './types';

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
  limit = 10
): Promise<Mover[]> {
  const from = computeFromDate(range);
  const to = toDateOnlyIso(new Date());

  const params = new URLSearchParams({ server, from, to, limit: String(limit) });

  const res = await fetch(`${API_BASE}/api/movers?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Erreur API /api/movers : ${res.status} ${res.statusText}`);
  }

  return res.json();
}
