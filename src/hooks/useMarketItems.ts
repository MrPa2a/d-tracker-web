import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchMarketItems } from '../api';
import type { MarketItemsFilters, MarketItemsResponse } from '../types';

export interface UseMarketItemsOptions {
  server: string | null;
  search?: string;
  category?: string | null;
  minPrice?: number;
  maxPrice?: number;
  onlyFavorites?: boolean;
  favorites?: Set<string>;
  sortBy?: 'name' | 'price';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

export function useMarketItems(options: UseMarketItemsOptions) {
  const {
    server,
    search,
    category,
    minPrice,
    maxPrice,
    onlyFavorites,
    favorites,
    sortBy = 'name',
    sortOrder = 'asc',
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = options;

  // Build filter items array if onlyFavorites is true
  const filterItems = onlyFavorites && favorites ? Array.from(favorites) : undefined;

  // Build query filters
  const filters: MarketItemsFilters | null = server ? {
    server,
    search: search?.trim() || undefined,
    category: category || undefined,
    minPrice,
    maxPrice,
    filterItems,
    sortBy,
    sortOrder,
    page,
    pageSize,
  } : null;

  return useQuery<MarketItemsResponse>({
    queryKey: ['marketItems', filters],
    queryFn: () => fetchMarketItems(filters!),
    enabled: !!server,
    placeholderData: keepPreviousData, // Keep previous data while fetching new page
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export { DEFAULT_PAGE_SIZE };
