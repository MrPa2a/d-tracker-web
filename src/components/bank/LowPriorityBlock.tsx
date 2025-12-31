import React from 'react';
import type { BankItem, TimeseriesPoint } from '../../types';
import { OpportunityItemRow } from './OpportunityItemRow';

export const LowPriorityBlock: React.FC<{
  server: string;
  rows: { item: BankItem; avgPrice: number | null; ratioPct: number | null; sparkline: TimeseriesPoint[] | null }[];
}> = ({ server, rows }) => {
  return (
    <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 min-w-0">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">⏸️ Moins intéressants</h2>
        <div className="text-xs text-text-muted">Top 20</div>
      </div>

      <div className="mt-3 max-h-[360px] overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <div className="text-sm text-text-muted py-6">Aucune donnée.</div>
        ) : (
          <div className="space-y-1">
            {rows.map((r) => (
              <OpportunityItemRow
                key={r.item.id}
                item={r.item}
                server={server}
                avgPrice={r.avgPrice}
                ratioPct={r.ratioPct}
                sparkline={r.sparkline}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
