import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import kamaIcon from '../../assets/kama.png';
import type { BankSummary } from '../../types';

function formatKamas(value: number): string {
  if (!Number.isFinite(value)) return '-';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString('fr-FR');
}

export const BankSummaryCards: React.FC<{ summary: BankSummary }> = ({ summary }) => {
  const progression = summary.progressionPct;
  const isPositive = progression !== null && progression > 0;
  const isNegative = progression !== null && progression < 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4">
        <div className="text-xs text-text-muted uppercase tracking-wider">Valeur totale</div>
        <div className="mt-2 flex items-center gap-2">
          <img src={kamaIcon} alt="kamas" className="w-5 h-5" />
          <div className="text-2xl md:text-3xl font-bold text-text-primary">
            {formatKamas(summary.totalValue)}
          </div>
        </div>
      </div>

      <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4">
        <div className="text-xs text-text-muted uppercase tracking-wider">Items uniques</div>
        <div className="mt-2 text-2xl md:text-3xl font-bold text-text-primary">
          {summary.uniqueItems.toLocaleString('fr-FR')}
        </div>
      </div>

      <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4">
        <div className="text-xs text-text-muted uppercase tracking-wider">Indice de progression</div>
        <div className="mt-2 flex items-center gap-2">
          {progression === null ? (
            <div className="text-2xl md:text-3xl font-bold text-text-primary">-</div>
          ) : (
            <>
              <div
                className={
                  `text-2xl md:text-3xl font-bold ` +
                  (isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400')
                }
              >
                {progression > 0 ? '+' : ''}{progression.toFixed(2)}%
              </div>
              {isPositive ? (
                <ArrowUpRight size={20} className="text-green-400" />
              ) : isNegative ? (
                <ArrowDownRight size={20} className="text-red-400" />
              ) : null}
            </>
          )}
        </div>
        <div className="mt-1 text-xs text-text-muted">
          Estimation sur la période (échantillon des items les plus valorisés)
        </div>
      </div>
    </div>
  );
};
