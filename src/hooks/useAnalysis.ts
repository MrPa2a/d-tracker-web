import { useQuery } from '@tanstack/react-query';
import { fetchScannerResults, fetchTrendResults } from '../api';
import type { ScannerFilters, TrendFilters } from '../types';

export function useScanner(filters: ScannerFilters) {
  return useQuery({
    queryKey: ['scanner', filters],
    queryFn: () => fetchScannerResults(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTrends(filters: TrendFilters) {
  return useQuery({
    queryKey: ['trends', filters],
    queryFn: () => fetchTrendResults(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
