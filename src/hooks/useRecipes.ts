import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchJobs, fetchRecipes, fetchRecipeDetails, fetchItemRecipe, fetchItemUsages } from '../api';
import type { RecipeFilters, Job, RecipeStats, RecipeDetails, RecipeUsage } from '../types';

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useRecipes(filters: RecipeFilters) {
  return useQuery<RecipeStats[]>({
    queryKey: ['recipes', filters],
    queryFn: () => fetchRecipes(filters),
    enabled: !!filters.server, // Only fetch if server is selected
    placeholderData: keepPreviousData, // Keep showing previous data while fetching new data
  });
}

export function useRecipeDetails(id: number, server: string | null) {
  return useQuery<RecipeDetails>({
    queryKey: ['recipe', id, server],
    queryFn: () => fetchRecipeDetails(id, server!),
    enabled: !!server && !!id,
  });
}

export function useItemRecipe(itemId: number | undefined, server: string | null) {
  return useQuery<RecipeStats | null>({
    queryKey: ['item-recipe', itemId, server],
    queryFn: () => fetchItemRecipe(itemId!, server!),
    enabled: !!server && !!itemId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useItemUsages(
  itemName: string | undefined, 
  server: string | null,
  limit: number = 20,
  offset: number = 0,
  search?: string
) {
  return useQuery<RecipeUsage[]>({
    queryKey: ['item-usages', itemName, server, limit, offset, search],
    queryFn: () => fetchItemUsages(itemName!, server!, limit, offset, search),
    enabled: !!server && !!itemName,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}
