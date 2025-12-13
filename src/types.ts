// src/types.ts

export interface ItemSummary {
  id: number;
  item_name: string;
  ankama_id?: number;
  server: string;
  last_observation_at: string; // ISO string
  last_price: number;
  category?: string;
  average_price?: number;
}

export interface TimeseriesPoint {
  id: number;        // ID unique de l'observation
  date: string;      // ISO string (ex: "2025-11-16T14:30:00.000Z")
  avg_price: number; // prix moyen unitaire
}

export type DateRangePreset = '7d' | '30d' | '90d' | '365d';

export interface Mover {
  item_name: string;
  server: string;
  last_price: number;
  pct_change: number; // pourcentage sur la période demandée
}

export interface ItemStats {
  item_name: string;
  server: string;
  volatility: number;      // écart-type des variations %
  median_price: number;    // prix médian sur la période
  signal: 'buy' | 'neutral' | 'sell'; // signal trading
  ma7: number;             // moyenne mobile 7 jours
  current_price: number;   // prix actuel
  category?: string;
}

export interface MarketIndex {
  server: string;
  index_change: number;    // variation % moyenne pondérée
  total_items: number;     // nombre d'items trackés
}

export interface VolatilityRanking {
  item_name: string;
  server: string;
  volatility: number;      // volatilité %
  last_price: number;
  pct_change: number;
  obs_count: number;       // nombre d'observations
}

export interface InvestmentOpportunity {
  item_name: string;
  server: string;
  current_price: number;
  ma7: number;
  volatility: number;
  target_price: number;
  discount_pct: number;
}

export interface SellOpportunity {
  item_name: string;
  server: string;
  current_price: number;
  ma7: number;
  volatility: number;
  target_price: number;
  premium_pct: number;
}

export interface Profile {
  id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export type SortType = 'name' | 'price';
export type SortOrder = 'asc' | 'desc';

export interface List {
  id: string;
  name: string;
  scope: 'public' | 'private';
  profile_id: string | null;
  created_at: string;
  list_items: { 
    item_id: number; 
    item_name: string;
    server?: string;
    last_price?: number;
    previous_price?: number;
    category?: string;
    quantity?: number;
    average_price?: number;
    last_observation_at?: string;
  }[];
}

export interface ScannerResult {
  item_name: string;
  server: string;
  category: string;
  current_price: number;
  avg_price: number;
  profit: number;
  margin: number;
  volatility: number;
  last_seen_at: string;
  days_seen: number;
}

export interface TrendFilters {
  server: string;
  min_price?: number;
  max_price?: number;
  trend_type?: 'bullish' | 'bearish' | 'rebound';
  categories?: string[];
  limit?: number;
  period?: number;
  filter_items?: string[];
}

export interface TrendResult {
  item_id: number;
  item_name: string;
  server: string;
  category: string;
  current_price: number;
  start_price: number;
  price_change_pct: number;
  trend_type: 'bullish' | 'bearish' | 'rebound' | 'stable';
  consecutive_days: number;
  history: { d: string; p: number }[];
}
