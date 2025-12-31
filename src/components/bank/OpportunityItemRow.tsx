import React from 'react';
import { Link } from 'react-router-dom';
import kamaIcon from '../../assets/kama.png';
import { SmallSparkline } from '../Sparkline';
import type { BankItem, TimeseriesPoint } from '../../types';

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return Math.round(value).toLocaleString('fr-FR');
}

export const OpportunityItemRow: React.FC<{
  item: BankItem;
  server: string;
  avgPrice: number | null;
  ratioPct: number | null;
  sparkline: TimeseriesPoint[] | null;
}> = ({ item, server, avgPrice, ratioPct, sparkline }) => {

  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
        {item.icon_url ? (
          <img
            src={item.icon_url}
            alt={item.item_name}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="text-sm text-gray-500 font-bold">{item.item_name.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Link
            to={`/item/${server}/${encodeURIComponent(item.item_name)}`}
            className="text-sm font-medium text-text-primary truncate hover:underline"
            title={item.item_name}
          >
            {item.item_name}
          </Link>
          <div className="text-xs text-text-muted shrink-0">x{item.quantity.toLocaleString('fr-FR')}</div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs bg-white/5 px-2 py-1 rounded text-gray-300">
              <img src={kamaIcon} alt="kamas" className="w-3 h-3" />
              {formatPrice(item.last_price ?? null)}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] bg-white/0 px-2 py-1 rounded border border-white/5 text-gray-400">
              <span className="text-[10px] text-gray-500">Moy.</span>
              <span className="opacity-80">
                {avgPrice === null ? '-' : formatPrice(avgPrice)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-20 h-8">
              <SmallSparkline data={sparkline} />
            </div>
            {ratioPct !== null && (
              <div
                className={
                  `text-[11px] font-semibold px-2 py-1 rounded ` +
                  (ratioPct > 0 ? 'bg-green-500/10 text-green-400' : ratioPct < 0 ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-gray-400')
                }
                title="Écart entre prix actuel et prix moyen (période)"
              >
                {ratioPct > 0 ? '+' : ''}{ratioPct.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
