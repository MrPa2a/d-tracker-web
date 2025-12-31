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
  icon_url?: string;
  is_craftable?: boolean;
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
  icon_url?: string;
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
  icon_url?: string;
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
  icon_url?: string;
}

export interface InvestmentOpportunity {
  item_name: string;
  server: string;
  current_price: number;
  ma7: number;
  volatility: number;
  target_price: number;
  discount_pct: number;
  icon_url?: string;
}

export interface SellOpportunity {
  item_name: string;
  server: string;
  current_price: number;
  ma7: number;
  volatility: number;
  target_price: number;
  premium_pct: number;
  icon_url?: string;
}

export interface Profile {
  id: string;
  name: string;
  created_at: string;
}

export interface RecipeStats {
  recipe_id: number;
  result_item_id: number;
  result_item_name: string;
  result_item_icon?: string;
  job_id: number;
  job_name: string;
  job_icon_id?: number;
  level: number;
  craft_cost: number;
  sell_price: number;
  margin: number;
  roi: number;
  ingredients_count: number;
  ingredients_with_price: number;
  result_item_last_update?: string;
  ingredients_last_update?: string;
}

export interface RecipeIngredient {
  item_id: number;
  name: string;
  icon_url?: string;
  quantity: number;
  price: number;
  total_price: number;
  last_update?: string;
  ingredient_recipe_id?: number;
}

export interface RecipeDetails extends RecipeStats {
  ingredients: RecipeIngredient[];
}

export interface RecipeFilters {
  server: string;
  min_level?: number;
  max_level?: number;
  job_id?: number;
  min_roi?: number;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'margin_desc' | 'roi_desc' | 'level_desc' | 'cost_asc';
}

export interface Job {
  id: number;
  name: string;
  icon_id?: number;
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
    icon_url?: string;
    is_craftable?: boolean;
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
  icon_url?: string;
}

export interface ScannerFilters {
  server: string;
  min_price?: number;
  max_price?: number;
  min_profit?: number;
  min_margin?: number;
  freshness?: number;
  min_volatility?: number;
  max_volatility?: number;
  categories?: string[];
  limit?: number;
  period?: number;
  filter_items?: string[];
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
  icon_url?: string;
}

export interface RecipeUsage {
  recipe_id: number;
  result_item_id: number;
  result_item_name: string;
  result_item_icon: string;
  job_name: string;
  level: number;
  quantity_required: number;
  craft_cost: number;
  sell_price: number;
  margin: number;
  roi: number;
  total_count?: number;
}

export interface ItemEffect {
  id: number;
  item_id: number;
  effect_id: number;
  min_value: number;
  max_value: number;
  formatted_description: string;
  order_index: number;
  icon_url?: string;
}

export interface ItemDetails {
  id: number;
  name: string;
  level: number;
  icon_url?: string;
  ankama_id?: number;
  category_id?: number;
  effects: ItemEffect[];
}

// --- Bank (storage tracker) ---

export interface BankItem {
  id: number;
  server: string;
  profile_id: string | null;
  item_id: number;
  gid: number;
  quantity: number;
  captured_at: string;
  item_name: string;
  icon_url?: string;
  item_level?: number;
  category_id?: number;
  last_price?: number | null;
}

export interface BankStats {
  total_items: number;
  unique_items: number;
  total_value: number;
}

export interface BankResponse {
  items: BankItem[];
  stats: BankStats;
}

export interface BankSummary {
  totalValue: number;
  uniqueItems: number;
  progressionPct: number | null;
}

export interface BankOpportunity {
  item: BankItem;
  score: number;
}

export type BankTableSortColumn =
  | 'quantity'
  | 'name'
  | 'category'
  | 'trend'
  | 'evolution'
  | 'current_price'
  | 'avg_price'
  | 'last_update'
  | 'total_value';

export interface BankTableSort {
  column: BankTableSortColumn;
  direction: 'asc' | 'desc';
}

// --- Messages (bulletin board) ---

export interface MessageAuthor {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: MessageAuthor;
  isRead?: boolean; // Optionnel: indique si le message a été lu par le profil courant
}

export interface UnreadCountResponse {
  count: number;
}

// --- Bank Craft Opportunities ---

export interface CraftOpportunity {
  recipe_id: number;
  result_item_id: number;
  result_item_name: string;
  result_item_icon?: string;
  job_id: number;
  job_name: string;
  job_icon_id?: number;
  level: number;

  // Complétude
  total_ingredients: number;
  owned_ingredients: number;
  missing_ingredients: number;
  completeness_pct: number;

  // Quantités
  max_craftable: number;

  // Coûts
  owned_value: number;
  missing_cost: number;
  total_craft_cost: number;

  // Profit
  sell_price: number;
  margin: number;
  roi: number;

  // Métadonnées
  result_item_last_update?: string;
}

export interface CraftIngredientStatus {
  item_id: number;
  name: string;
  icon_url?: string;
  required_quantity: number;
  owned_quantity: number;
  missing_quantity: number;
  unit_price: number;
  owned_value: number;
  missing_cost: number;
  status: 'complete' | 'partial' | 'missing';
  ingredient_recipe_id?: number | null;  // ID de la recette si l'ingrédient est craftable
}

export interface CraftOpportunityFilters {
  server: string;
  profile_id?: string | null;
  max_missing?: number;
  min_level?: number;
  max_level?: number;
  job_id?: number;
  min_roi?: number;
  limit?: number;
  offset?: number;
  sort_by?: 'completeness_desc' | 'margin_desc' | 'roi_desc';
  search?: string;
}
