// src/types.ts

export interface ItemSummary {
  item_name: string;
  server: string;
  last_observation_at: string; // ISO string
  last_price: number;
}

export interface TimeseriesPoint {
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
