import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchCraftOpportunities, fetchCraftIngredientsWithStock } from '../api';
import type { CraftOpportunityFilters, CraftOpportunity, CraftIngredientStatus } from '../types';

export function useCraftOpportunities(filters: CraftOpportunityFilters) {
  return useQuery<CraftOpportunity[]>({
    queryKey: ['craft-opportunities', filters],
    queryFn: () => fetchCraftOpportunities(filters),
    enabled: !!filters.server,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCraftIngredientsWithStock(
  recipeId: number | undefined,
  server: string | null,
  profileId: string | null
) {
  return useQuery<CraftIngredientStatus[]>({
    queryKey: ['craft-ingredients-stock', recipeId, server, profileId],
    queryFn: () => fetchCraftIngredientsWithStock(recipeId!, server!, profileId),
    enabled: !!recipeId && !!server,
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: keepPreviousData,
  });
}
