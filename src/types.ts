// src/types.ts

export interface ItemSummary {
  item_name: string;
  server: string;
  last_observation_at: string; // ISO string
  last_price: number;
}

export interface TimeseriesPoint {
  date: string;      // "2025-11-16"
  avg_price: number; // prix moyen unitaire
}

export type DateRangePreset = '7d' | '30d' | '90d' | '365d';
