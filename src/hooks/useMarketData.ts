import { useQuery } from '@tanstack/react-query';
import { fetchMovers, fetchItemStats, fetchMarketIndex, fetchVolatilityRankings, fetchOpportunities, fetchSellOpportunities } from '../api';
import type { DateRangePreset } from '../types';

export function useMovers(
  server: string,
  range: DateRangePreset,
  limit = 10,
  minPrice?: number,
  maxPrice?: number,
  filterItems?: string[],
  order: 'asc' | 'desc' | 'abs' = 'abs'
) {
  return useQuery({
    queryKey: ['movers', server, range, limit, minPrice, maxPrice, filterItems, order],
    queryFn: () => fetchMovers(server, range, limit, minPrice, maxPrice, filterItems, order),
  });
}

export function useItemStats(itemName: string, server: string, range: DateRangePreset) {
  return useQuery({
    queryKey: ['itemStats', itemName, server, range],
    queryFn: () => fetchItemStats(itemName, server, range),
  });
}

export function useMarketIndex(server: string, range: DateRangePreset, filterItems?: string[]) {
  return useQuery({
    queryKey: ['marketIndex', server, range, filterItems],
    queryFn: () => fetchMarketIndex(server, range, filterItems),
  });
}

export function useVolatilityRankings(
  server: string,
  range: DateRangePreset,
  limit = 10,
  order: 'asc' | 'desc' = 'desc',
  minPrice?: number,
  maxPrice?: number,
  filterItems?: string[]
) {
  return useQuery({
    queryKey: ['volatilityRankings', server, range, limit, order, minPrice, maxPrice, filterItems],
    queryFn: () => fetchVolatilityRankings(server, range, limit, order, minPrice, maxPrice, filterItems),
  });
}

export function useOpportunities(
  server: string,
  range: DateRangePreset,
  limit = 20,
  minPrice?: number,
  maxPrice?: number,
  filterItems?: string[]
) {
  return useQuery({
    queryKey: ['opportunities', server, range, limit, minPrice, maxPrice, filterItems],
    queryFn: () => fetchOpportunities(server, range, limit, minPrice, maxPrice, filterItems),
  });
}

export function useSellOpportunities(
  server: string,
  range: DateRangePreset,
  limit = 20,
  minPrice?: number,
  maxPrice?: number,
  filterItems?: string[]
) {
  return useQuery({
    queryKey: ['sellOpportunities', server, range, limit, minPrice, maxPrice, filterItems],
    queryFn: () => fetchSellOpportunities(server, range, limit, minPrice, maxPrice, filterItems),
  });
}
