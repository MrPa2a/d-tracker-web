import { useQuery, type UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { fetchTimeseries } from '../api';
import type { DateRangePreset, TimeseriesPoint } from '../types';
import { timeseriesQueue } from '../utils/requestQueue';

// Cache settings for timeseries - longer stale time since price data doesn't change frequently
const TIMESERIES_STALE_TIME = 1000 * 60 * 15; // 15 minutes
const TIMESERIES_GC_TIME = 1000 * 60 * 60; // 1 hour - keep in cache longer

/**
 * Hook for fetching timeseries data with:
 * - Request queue limiting (max 3 concurrent requests) - handled in fetchTimeseries
 * - Extended cache (15min stale, 1hr gc)
 */
export function useTimeseries(
  itemName: string,
  server: string,
  range: DateRangePreset,
  options?: Omit<UseQueryOptions<TimeseriesPoint[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['timeseries', itemName, server, range],
    queryFn: () => fetchTimeseries(itemName, server, range),
    staleTime: TIMESERIES_STALE_TIME,
    gcTime: TIMESERIES_GC_TIME,
    ...options,
  });
}

/**
 * Hook to cancel all pending timeseries requests for a group
 * Useful when changing pages/filters
 */
export function useCancelTimeseriesGroup() {
  return (groupId: string) => {
    timeseriesQueue.cancelGroup(groupId);
  };
}

/**
 * Cancel all pending timeseries requests
 */
export function cancelAllTimeseries() {
  timeseriesQueue.cancelAll();
}

/**
 * Hook to prefetch timeseries data (for hover states, etc.)
 */
export function usePrefetchTimeseries() {
  const queryClient = useQueryClient();
  
  return (itemName: string, server: string, range: DateRangePreset) => {
    // Only prefetch if not already in cache
    const cached = queryClient.getQueryData(['timeseries', itemName, server, range]);
    if (!cached) {
      queryClient.prefetchQuery({
        queryKey: ['timeseries', itemName, server, range],
        queryFn: () => fetchTimeseries(itemName, server, range),
        staleTime: TIMESERIES_STALE_TIME,
        gcTime: TIMESERIES_GC_TIME,
      });
    }
  };
}
