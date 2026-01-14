import React from 'react';
import { Link } from 'react-router-dom';
import type { Category, DateRangePreset, Profile } from '../types';
import { Coins, Loader2, Hammer } from 'lucide-react';
import { useBank, useBankProgression, useBankSummary } from '../hooks/useBank';
import { useQueries } from '@tanstack/react-query';
import { fetchTimeseries } from '../api';
import type { BankItem, TimeseriesPoint } from '../types';
import { BankSummaryCards } from '../components/bank/BankSummaryCards';
import { SellOpportunitiesBlock } from '../components/bank/SellOpportunitiesBlock';
import { LowPriorityBlock } from '../components/bank/LowPriorityBlock';
import { BankItemsTable } from '../components/bank/BankItemsTable';

function avgFromTimeseries(ts: TimeseriesPoint[] | null | undefined): number | null {
  if (!ts || ts.length === 0) return null;
  const sum = ts.reduce((s, p) => s + (p.avg_price || 0), 0);
  const avg = sum / ts.length;
  return Number.isFinite(avg) && avg > 0 ? avg : null;
}

function ratioPct(currentPrice: number | null | undefined, avgPrice: number | null): number | null {
  if (currentPrice === null || currentPrice === undefined) return null;
  if (!avgPrice) return null;
  return ((currentPrice - avgPrice) / avgPrice) * 100;
}

function totalValue(item: BankItem): number {
  return (item.last_price || 0) * item.quantity;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

interface BankPageProps {
  server: string | null;
  currentProfile: Profile | null;
  dateRange: DateRangePreset;
  categories: Category[];
  minPrice: string;
  maxPrice: string;
  onlyFavorites: boolean;
  favorites: Set<string>;
}

const BankPage: React.FC<BankPageProps> = ({ 
  server, 
  currentProfile, 
  dateRange, 
  categories,
  minPrice,
  maxPrice,
  onlyFavorites,
  favorites 
}) => {
  if (!server) {
    return (
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6 space-y-6">
        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-6">
          <h1 className="text-xl font-bold text-text-primary">Banque</h1>
          <p className="mt-2 text-text-muted">Sélectionnez un serveur pour afficher la banque.</p>
        </div>
      </div>
    );
  }

  const { data: bank, isLoading, error } = useBank(server, currentProfile?.id || null);
  const items = bank?.items ?? [];

  const lastScrapedAt = React.useMemo(() => {
    if (!items || items.length === 0) return null;
    let best: string | null = null;
    let bestTs = -Infinity;
    for (const it of items) {
      const ts = Date.parse(it.captured_at);
      if (!Number.isNaN(ts) && ts > bestTs) {
        bestTs = ts;
        best = it.captured_at;
      }
    }
    return best;
  }, [items]);

  // Appliquer les filtres globaux (prix, favoris)
  const filteredItems = React.useMemo(() => {
    let result = items;

    // Filtre favoris
    if (onlyFavorites) {
      result = result.filter((it) => favorites.has(it.item_name));
    }

    // Filtre prix min
    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        result = result.filter((it) => (it.last_price ?? 0) >= min);
      }
    }

    // Filtre prix max
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter((it) => (it.last_price ?? 0) <= max);
      }
    }

    return result;
  }, [items, onlyFavorites, favorites, minPrice, maxPrice]);

  const progressionQuery = useBankProgression(filteredItems, server, dateRange, 30);
  const summary = useBankSummary(bank, progressionQuery.data?.pct ?? null);

  // Ne pas prendre en compte les items sans prix.
  const pricedItems = React.useMemo(() => {
    return filteredItems.filter((it) => it.last_price !== null && it.last_price !== undefined && it.last_price > 0);
  }, [filteredItems]);

  // Limite de candidats pour éviter des centaines de timeseries.
  const candidates = React.useMemo(() => {
    const sorted = [...pricedItems].sort((a, b) => totalValue(b) - totalValue(a));
    return sorted.slice(0, 80);
  }, [pricedItems]);

  const tsQueries = useQueries({
    queries: candidates.map((it) => ({
      queryKey: ['timeseries', it.item_name, server, dateRange],
      queryFn: () => fetchTimeseries(it.item_name, server, dateRange),
      enabled: !!server,
      staleTime: 1000 * 60 * 10,
    })),
  });

  const enriched = React.useMemo(() => {
    return candidates
      .map((it, idx) => {
        const ts = (tsQueries[idx]?.data as TimeseriesPoint[] | undefined) ?? null;
        const avg = avgFromTimeseries(ts);
        const ratio = ratioPct(it.last_price, avg);
        return { item: it, avgPrice: avg, ratioPct: ratio, sparkline: ts };
      })
      .filter((r) => r.item.last_price !== null && r.item.last_price !== undefined);
  }, [candidates, tsQueries]);

  const sellRows = React.useMemo(() => {
    return [...enriched]
      .filter((r) => r.ratioPct !== null)
      .sort((a, b) => {
        const ra = a.ratioPct ?? -Infinity;
        const rb = b.ratioPct ?? -Infinity;
        if (rb !== ra) return rb - ra;
        return totalValue(b.item) - totalValue(a.item);
      })
      .slice(0, 20);
  }, [enriched]);

  const lowRows = React.useMemo(() => {
    return [...enriched]
      .filter((r) => r.ratioPct !== null)
      .sort((a, b) => {
        const ra = a.ratioPct ?? Infinity;
        const rb = b.ratioPct ?? Infinity;
        if (ra !== rb) return ra - rb;
        return totalValue(b.item) - totalValue(a.item);
      })
      .slice(0, 20);
  }, [enriched]);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6 space-y-6">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <Coins className="w-6 h-6 md:w-8 md:h-8 text-accent-primary" />
            Banque
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            {server} • {currentProfile ? currentProfile.name : 'Tous profils'}
            {lastScrapedAt ? ` • Dernier scan : ${formatDateTime(lastScrapedAt)}` : ''}
          </p>
        </div>
        <Link
          to="/bank/crafts"
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Hammer size={16} />
          <span className="hidden md:inline">Opportunités de Craft</span>
          <span className="md:hidden">Crafts</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-text-muted">
          <Loader2 size={18} className="animate-spin" />
          Chargement de la banque...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-200">
          {(error instanceof Error ? error.message : String(error))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-6">
          <div className="text-text-primary font-semibold">Banque vide</div>
          <p className="mt-2 text-text-muted">
            Ouvrez votre banque en jeu pour capturer le contenu, puis réessayez.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-6">
          <div className="text-text-primary font-semibold">Aucun résultat</div>
          <p className="mt-2 text-text-muted">
            Aucun item ne correspond aux filtres actuels. Essayez de modifier les critères de prix ou de favoris.
          </p>
        </div>
      ) : (
        <>
          <BankSummaryCards summary={summary} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SellOpportunitiesBlock server={server} rows={sellRows} />
            <LowPriorityBlock server={server} rows={lowRows} />
          </div>

          <BankItemsTable items={filteredItems} server={server} dateRange={dateRange} categories={categories} />
        </>
      )}
    </div>
  );
};

export default BankPage;
