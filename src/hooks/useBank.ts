import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BankItem, BankResponse, BankSummary, DateRangePreset } from '../types';
import { fetchBankContent, fetchTimeseries } from '../api';

function sumBankValue(items: BankItem[]): number {
  return items.reduce((sum, it) => sum + (it.last_price || 0) * it.quantity, 0);
}

function sumBankQuantity(items: BankItem[]): number {
  return items.reduce((sum, it) => sum + it.quantity, 0);
}

export function useBank(server: string | null, profileId: string | null) {
  return useQuery<BankResponse>({
    queryKey: ['bank', server, profileId || 'all'],
    queryFn: () => fetchBankContent(server || '', profileId),
    enabled: !!server,
    staleTime: 1000 * 60 * 2,
  });
}

export function useBankSummary(
  bank: BankResponse | undefined,
  progressionPct: number | null
): BankSummary {
  return useMemo(() => {
    const items = bank?.items ?? [];
    const stats = bank?.stats;

    const totalValue = stats?.total_value ?? sumBankValue(items);
    const uniqueItems = stats?.unique_items ?? items.length;

    return {
      totalValue,
      uniqueItems,
      progressionPct,
    };
  }, [bank, progressionPct]);
}

/**
 * Estime la progression de valeur (en %) sur la période en utilisant un échantillon des items
 * les plus valorisés (pour éviter de lancer un fetch timeseries pour 1000+ items).
 */
export function useBankProgression(
  items: BankItem[] | undefined,
  server: string | null,
  range: DateRangePreset,
  sampleSize: number = 30
) {
  const sample = useMemo(() => {
    const all = items ?? [];
    const sorted = [...all].sort((a, b) => ((b.last_price || 0) * b.quantity) - ((a.last_price || 0) * a.quantity));
    return sorted.slice(0, sampleSize);
  }, [items, sampleSize]);

  return useQuery<{ pct: number | null; startValue: number; endValue: number }>({
    queryKey: ['bank-progression', server, range, sample.map(s => s.item_id), sample.map(s => s.quantity)],
    enabled: !!server && sample.length > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      let startValue = 0;
      let endValue = 0;

      await Promise.all(
        sample.map(async (it) => {
          const ts = await fetchTimeseries(it.item_name, server || '', range);
          if (!ts || ts.length < 2) return;

          const first = ts[0].avg_price;
          const last = ts[ts.length - 1].avg_price;

          startValue += (first || 0) * it.quantity;
          endValue += (last || 0) * it.quantity;
        })
      );

      const pct = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : null;
      return { pct, startValue, endValue };
    },
  });
}

export function useBankTotals(items: BankItem[] | undefined) {
  return useMemo(() => {
    const list = items ?? [];
    return {
      totalValue: sumBankValue(list),
      totalQuantity: sumBankQuantity(list),
      uniqueItems: list.length,
    };
  }, [items]);
}
