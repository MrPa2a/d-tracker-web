import { useMemo } from 'react';
import type { BankItem, BankOpportunity } from '../types';

function computeScore(it: BankItem): number {
  return (it.last_price || 0) * it.quantity;
}

export function useSellOpportunities(items: BankItem[] | undefined): BankOpportunity[] {
  return useMemo(() => {
    const list = items ?? [];
    return list
      .map((it) => ({ item: it, score: computeScore(it) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [items]);
}

export function useLowPriorityItems(items: BankItem[] | undefined): BankOpportunity[] {
  return useMemo(() => {
    const list = items ?? [];
    return list
      .map((it) => ({ item: it, score: computeScore(it) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 20);
  }, [items]);
}
