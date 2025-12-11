import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { fetchTimeseries } from '../api';
import type { DateRangePreset, TimeseriesPoint } from '../types';

export function useTimeseries(
  itemName: string,
  server: string,
  range: DateRangePreset,
  options?: Omit<UseQueryOptions<TimeseriesPoint[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['timeseries', itemName, server, range],
    queryFn: () => fetchTimeseries(itemName, server, range),
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
}
