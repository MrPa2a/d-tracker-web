import { useQuery, type UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { fetchTimeseries } from '../api';
import type { DateRangePreset, TimeseriesPoint } from '../types';
import { timeseriesQueue } from '../utils/requestQueue';

// Cache settings for timeseries - longer stale time since price data doesn't change frequently
const TIMESERIES_STALE_TIME = 1000 * 60 * 15; // 15 minutes
const TIMESERIES_GC_TIME = 1000 * 60 * 60; // 1 hour - keep in cache longer

// Maximum cache entries to keep (approximate LRU behavior via gcTime)
// React Query doesn't have a built-in LRU but we can limit memory via gcTime

/**
 * Hook for fetching timeseries data with:
 * - Request queue limiting (max 3 concurrent requests)
 * - Extended cache (15min stale, 1hr gc)
 * - Automatic cancellation when component unmounts
 */
export function useTimeseries(
  itemName: string,
  server: string,
  range: DateRangePreset,
  options?: Omit<UseQueryOptions<TimeseriesPoint[]>, 'queryKey' | 'queryFn'> & {
    groupId?: string;
  }
) {
  const { groupId, ...queryOptions } = options || {};
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return useQuery({
    queryKey: ['timeseries', itemName, server, range],
    queryFn: async ({ signal }) => {
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Use the queue to limit concurrent requests
      const requestId = `timeseries-${itemName}-${server}-${range}`;
      
      return timeseriesQueue.enqueue(
        requestId,
        async (queueSignal) => {
          // Combine both signals (React Query's and our queue's)
          const combinedController = new AbortController();
          
          const abortHandler = () => combinedController.abort();
          signal.addEventListener('abort', abortHandler);
          queueSignal.addEventListener('abort', abortHandler);
          
          try {
            return await fetchTimeseries(itemName, server, range);
          } finally {
            signal.removeEventListener('abort', abortHandler);
            queueSignal.removeEventListener('abort', abortHandler);
          }
        },
        groupId
      );
    },
    staleTime: TIMESERIES_STALE_TIME,
    gcTime: TIMESERIES_GC_TIME,
    ...queryOptions,
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
