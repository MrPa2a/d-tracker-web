import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchHarvestJobs,
  fetchHarvestResources,
  optimizeHarvestRoute,
  fetchMapsGrid,
  type HarvestJob,
  type HarvestResource,
  type OptimizeResult,
  type MapsGridResult,
} from '../api';

// Query keys
const harvestKeys = {
  all: ['harvest'] as const,
  jobs: () => [...harvestKeys.all, 'jobs'] as const,
  resources: (jobIds: number[], levelMin?: number, levelMax?: number) =>
    [...harvestKeys.all, 'resources', { jobIds, levelMin, levelMax }] as const,
  mapsGrid: (bounds: { minX: number; maxX: number; minY: number; maxY: number } | null) =>
    [...harvestKeys.all, 'maps-grid', bounds] as const,
};

/**
 * Hook pour récupérer la liste des métiers de récolte
 */
export function useHarvestJobs() {
  return useQuery<HarvestJob[], Error>({
    queryKey: harvestKeys.jobs(),
    queryFn: fetchHarvestJobs,
    staleTime: 1000 * 60 * 60, // 1 heure - données statiques
  });
}

/**
 * Hook pour récupérer les ressources filtrées par métiers et niveau
 */
export function useHarvestResources(
  jobIds: number[],
  levelMin?: number,
  levelMax?: number
) {
  return useQuery<HarvestResource[], Error>({
    queryKey: harvestKeys.resources(jobIds, levelMin, levelMax),
    queryFn: () => fetchHarvestResources({ jobIds, levelMin, levelMax }),
    enabled: jobIds.length > 0,
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Hook mutation pour optimiser une route
 */
export function useOptimizeRoute() {
  return useMutation<
    OptimizeResult,
    Error,
    {
      resourceIds: number[];
      startX?: number;
      startY?: number;
      maxMoves?: number;
      maxMaps?: number;  // Deprecated
      excludeSubareaIds?: number[];
    }
  >({
    mutationFn: optimizeHarvestRoute,
  });
}

/**
 * Hook pour récupérer la grille de maps pour la visualisation du parcours
 */
export function useRouteMapGrid(bounds: {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} | null) {
  return useQuery<MapsGridResult, Error>({
    queryKey: harvestKeys.mapsGrid(bounds),
    queryFn: () => fetchMapsGrid(bounds!),
    enabled: !!bounds,
    staleTime: 1000 * 60 * 60 * 24, // 24h - données très statiques
  });
}
