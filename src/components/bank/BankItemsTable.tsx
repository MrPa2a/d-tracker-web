import React, { useMemo, useState } from 'react';
import type { BankItem, BankTableSort, BankTableSortColumn, Category, DateRangePreset } from '../../types';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import kamaIcon from '../../assets/kama.png';
import { useTimeseries } from '../../hooks/useTimeseries';
import { SmallSparkline } from '../Sparkline';
import { Link } from 'react-router-dom';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return Math.round(value).toLocaleString('fr-FR');
}

function formatDate(value: string | undefined): string {
  if (!value) return '-';
  try {
    const d = new Date(value);
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '-';
  }
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toggleSort(current: BankTableSort, column: BankTableSortColumn): BankTableSort {
  if (current.column !== column) return { column, direction: 'desc' };
  return { column, direction: current.direction === 'desc' ? 'asc' : 'desc' };
}

const TableRow: React.FC<{
  item: BankItem;
  server: string;
  dateRange: DateRangePreset;
  categoryName: string | null;
}> = ({ item, server, dateRange, categoryName }) => {
  const { data: ts, isLoading } = useTimeseries(item.item_name, server, dateRange);

  const evolution = React.useMemo(() => {
    if (!ts || ts.length < 2) return null;
    const first = ts[0].avg_price;
    const last = ts[ts.length - 1].avg_price;
    if (!first) return 0;
    return ((last - first) / first) * 100;
  }, [ts]);

  const avgPrice = React.useMemo(() => {
    if (!ts || ts.length === 0) return null;
    const sum = ts.reduce((s, p) => s + (p.avg_price || 0), 0);
    return sum / ts.length;
  }, [ts]);

  const lastUpdate = ts && ts.length > 0 ? ts[ts.length - 1].date : item.captured_at;

  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="px-4 py-3 text-sm text-text-primary font-medium">{item.quantity.toLocaleString('fr-FR')}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
            {item.icon_url ? (
              <img
                src={item.icon_url}
                alt={item.item_name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <span className="text-xs text-gray-500 font-bold">{item.item_name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <Link
            to={`/item/${server}/${encodeURIComponent(item.item_name)}`}
            className="text-sm text-text-primary truncate hover:underline"
            title={item.item_name}
          >
            {item.item_name}
          </Link>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-text-muted">{categoryName || '-'}</td>
      <td className="px-4 py-3">
        <div className="w-24 h-8">
          {isLoading ? <div className="h-8 bg-white/5 rounded" /> : <SmallSparkline data={ts || null} />}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        {evolution === null ? (
          <span className="text-text-muted">-</span>
        ) : (
          <span className={evolution > 0 ? 'text-green-400 font-medium' : evolution < 0 ? 'text-red-400 font-medium' : 'text-gray-400'}>
            {evolution > 0 ? '+' : ''}{evolution.toFixed(2)}%
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-text-primary">
          <img src={kamaIcon} alt="kamas" className="w-3.5 h-3.5" />
          {formatPrice(item.last_price ?? null)}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-text-primary">
          <img src={kamaIcon} alt="kamas" className="w-3.5 h-3.5" />
          {avgPrice === null ? '-' : formatPrice(avgPrice)}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-text-muted">{formatDate(lastUpdate)}</td>
    </tr>
  );
};

export const BankItemsTable: React.FC<{
  items: BankItem[];
  server: string;
  dateRange: DateRangePreset;
  categories: Category[];
}> = ({ items, server, dateRange, categories }) => {
  const queryClient = useQueryClient();
  const timeseriesFetching = useIsFetching({ queryKey: ['timeseries'] });

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  const [sort, setSort] = useState<BankTableSort>({ column: 'total_value', direction: 'desc' });
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    if (!q) return items;

    return items.filter((it) => {
      const name = normalizeSearch(it.item_name);
      if (name.includes(q)) return true;
      const categoryName = it.category_id ? (categoryMap.get(it.category_id) || '') : '';
      if (categoryName && normalizeSearch(categoryName).includes(q)) return true;
      return false;
    });
  }, [items, searchQuery, categoryMap]);

  const sorted = useMemo(() => {
    const dir = sort.direction === 'desc' ? -1 : 1;
    const arr = [...filteredItems];

    const getTimeseries = (it: BankItem) => {
      return queryClient.getQueryData(['timeseries', it.item_name, server, dateRange]) as unknown as (null | { avg_price: number; date: string }[] | undefined);
    };

    const getEvolutionPct = (it: BankItem): number => {
      const ts = getTimeseries(it);
      if (ts && ts.length >= 2) {
        const first = ts[0]!.avg_price;
        const last = ts[ts.length - 1]!.avg_price;
        if (!first) return 0;
        return ((last - first) / first) * 100;
      }
      return 0;
    };

    const getAvgPrice = (it: BankItem): number => {
      const ts = getTimeseries(it);
      if (ts && ts.length > 0) {
        const sum = ts.reduce((s, p) => s + (p.avg_price || 0), 0);
        const avg = sum / ts.length;
        return Number.isFinite(avg) ? avg : 0;
      }
      return it.last_price || 0;
    };

    const getLastUpdateTs = (it: BankItem): number => {
      const ts = getTimeseries(it);
      const d = ts && ts.length > 0 ? ts[ts.length - 1]!.date : it.captured_at;
      const t = Date.parse(d);
      return Number.isNaN(t) ? 0 : t;
    };

    arr.sort((a, b) => {
      if (sort.column === 'quantity') {
        return (a.quantity - b.quantity) * dir;
      }
      if (sort.column === 'name') {
        return a.item_name.localeCompare(b.item_name, 'fr', { sensitivity: 'base' }) * dir;
      }
      if (sort.column === 'category') {
        const ca = a.category_id ? (categoryMap.get(a.category_id) || '') : '';
        const cb = b.category_id ? (categoryMap.get(b.category_id) || '') : '';
        return ca.localeCompare(cb, 'fr', { sensitivity: 'base' }) * dir;
      }
      if (sort.column === 'trend') {
        return (getEvolutionPct(a) - getEvolutionPct(b)) * dir;
      }
      if (sort.column === 'evolution') {
        return (getEvolutionPct(a) - getEvolutionPct(b)) * dir;
      }
      if (sort.column === 'current_price') {
        return (((a.last_price || 0) - (b.last_price || 0)) * dir);
      }
      if (sort.column === 'avg_price') {
        return (getAvgPrice(a) - getAvgPrice(b)) * dir;
      }
      if (sort.column === 'last_update') {
        return (getLastUpdateTs(a) - getLastUpdateTs(b)) * dir;
      }
      // total_value
      const va = (a.last_price || 0) * a.quantity;
      const vb = (b.last_price || 0) * b.quantity;
      return (va - vb) * dir;
    });

    return arr;
  }, [filteredItems, sort, categoryMap, queryClient, server, dateRange, timeseriesFetching]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(() => {
    const start = pageIndex * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageIndex, pageSize]);

  const SortHeader: React.FC<{ label: string; column: BankTableSortColumn }> = ({ label, column }) => {
    const active = sort.column === column;
    return (
      <button
        onClick={() => {
          setSort(s => toggleSort(s, column));
          setPageIndex(0);
        }}
        className={`flex items-center gap-1 hover:text-text-primary ${active ? 'text-text-primary' : 'text-text-muted'}`}
      >
        <span>{label}</span>
        {active ? (sort.direction === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />) : null}
      </button>
    );
  };

  return (
    <div className="bg-[#1a1b1e] border border-white/5 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Tableau complet</h2>
            <div className="text-xs text-text-muted">
              {sorted.length.toLocaleString('fr-FR')}
              {searchQuery.trim() ? <span> / {items.length.toLocaleString('fr-FR')}</span> : null}
              <span> items</span>
            </div>
          </div>

          <div className="flex items-center justify-start md:justify-center">
            <div className="relative w-full md:max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPageIndex(0);
                }}
                placeholder="Rechercher (nom / catégorie)…"
                className="w-full bg-bg-tertiary/50 border border-border-normal rounded-full py-1.5 pl-10 pr-10 text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 transition-all"
              />
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPageIndex(0);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  tabIndex={-1}
                  title="Effacer la recherche"
                >
                  <X size={16} />
                </button>
              ) : null}
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            </div>
          </div>

          <div className="flex items-center justify-start md:justify-end gap-2">
            <div className="text-xs text-text-muted">Par page</div>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(0);
                }}
                className="appearance-none px-3 py-2 pr-8 bg-bg-tertiary/50 border border-border-normal rounded-lg text-sm text-text-primary hover:bg-bg-tertiary transition-colors outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-white/0">
            <tr className="text-left text-xs tracking-wider text-text-muted border-b border-white/5">
              <th className="px-4 py-3"><SortHeader label="Quantité" column="quantity" /></th>
              <th className="px-4 py-3"><SortHeader label="Nom" column="name" /></th>
              <th className="px-4 py-3"><SortHeader label="Catégorie" column="category" /></th>
              <th className="px-4 py-3"><SortHeader label="Tendance" column="trend" /></th>
              <th className="px-4 py-3"><SortHeader label="Evolution" column="evolution" /></th>
              <th className="px-4 py-3"><SortHeader label="Prix Actuel" column="current_price" /></th>
              <th className="px-4 py-3"><SortHeader label="Prix Moyen" column="avg_price" /></th>
              <th className="px-4 py-3"><SortHeader label="Dernière MAJ" column="last_update" /></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((it) => (
              <TableRow
                key={it.id}
                item={it}
                server={server}
                dateRange={dateRange}
                categoryName={it.category_id ? (categoryMap.get(it.category_id) || null) : null}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between p-4 border-t border-white/5 text-sm text-text-muted">
        <div>
          Page <span className="text-text-primary font-medium">{pageIndex + 1}</span> / {pageCount}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageIndex(p => Math.max(0, p - 1))}
            disabled={pageIndex === 0}
            className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          <button
            onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))}
            disabled={pageIndex >= pageCount - 1}
            className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
};
