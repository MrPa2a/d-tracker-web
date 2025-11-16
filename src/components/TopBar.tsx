// src/components/TopBar.tsx
import React from 'react';
import type { DateRangePreset } from '../types';

interface TopBarProps {
  servers: string[];
  selectedServer: string | null;
  onSelectServer: (server: string | null) => void;
  dateRange: DateRangePreset;
  onChangeDateRange: (range: DateRangePreset) => void;
}

const RANGE_LABELS: Record<DateRangePreset, string> = {
  '7d': '7j',
  '30d': '30j',
  '90d': '90j',
  '365d': '1 an',
};

export const TopBar: React.FC<TopBarProps> = ({
  servers,
  selectedServer,
  onSelectServer,
  dateRange,
  onChangeDateRange,
}) => {
  return (
    <div className="topbar">
      <div className="topbar-section">
        <span className="topbar-label">Serveur</span>
        <select
          className="topbar-select"
          value={selectedServer ?? ''}
          onChange={(e) =>
            onSelectServer(e.target.value ? e.target.value : null)
          }
        >
          {servers.length === 0 && <option value="">—</option>}
          {servers.map((server) => (
            <option key={server} value={server}>
              {server}
            </option>
          ))}
        </select>
      </div>

      <div className="topbar-section">
        <span className="topbar-label">Période</span>
        <div className="topbar-range-group">
          {(Object.keys(RANGE_LABELS) as DateRangePreset[]).map((range) => (
            <button
              key={range}
              className={
                'topbar-range-btn' +
                (dateRange === range ? ' topbar-range-btn--active' : '')
              }
              onClick={() => onChangeDateRange(range)}
            >
              {RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
