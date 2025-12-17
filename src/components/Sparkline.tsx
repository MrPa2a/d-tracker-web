import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
} from 'recharts';
import type { TimeseriesPoint } from '../types';
import kamaIcon from '../assets/kama.png';

// Tooltip custom for sparklines
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SmallSparklineTooltip: React.FC<{ active?: boolean; payload?: any[]; coordinate?: { x: number; y: number }; containerNode?: HTMLDivElement | null }> = ({ active, payload, coordinate, containerNode }) => {
  if (!active || !payload || payload.length === 0 || !coordinate || !containerNode) return null;

  const point = payload[0];
  const price = point.value as number;
  const date = point.payload.date;

  let formattedDate = date;
  try {
    // Support ISO string or YYYY-MM-DD
    const d = new Date(date);
    if (isNaN(d.getTime())) {
       const d2 = new Date(date + 'T00:00:00Z');
       if (!isNaN(d2.getTime())) {
         formattedDate = d2.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
         });
       }
    } else {
      formattedDate = d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch {
    // keep raw date
  }

  const rect = containerNode.getBoundingClientRect();
  const x = rect.left + coordinate.x;
  const y = rect.top + coordinate.y;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y - 10,
    transform: 'translate(-50%, -100%)',
    zIndex: 9999,
    pointerEvents: 'none',
  };

  return createPortal(
    <div style={style} className="bg-[#1a1b1e]/90 backdrop-blur-md border border-white/10 p-2 rounded shadow-lg text-xs whitespace-nowrap z-9999">
      <div className="font-bold text-gray-200 mb-0.5 flex items-center justify-center">
        {Math.round(price).toLocaleString('fr-FR')} <img src={kamaIcon} alt="kamas" style={{width: '10px', height: '10px', verticalAlign: 'middle', marginLeft: '5px'}} />
      </div>
      <div className="text-gray-400 text-center">{formattedDate}</div>
    </div>,
    document.body
  );
};

export const SmallSparkline: React.FC<{ data: TimeseriesPoint[] | null }> = ({ data }) => {
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerNode) return;

    const updateSize = () => {
      // Only update if dimensions actually changed to avoid loops
      if (containerNode.clientWidth !== dimensions.width || containerNode.clientHeight !== dimensions.height) {
        setDimensions({
          width: containerNode.clientWidth,
          height: containerNode.clientHeight
        });
      }
    };

    // Initial check
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerNode);

    return () => observer.disconnect();
  }, [containerNode, dimensions.width, dimensions.height]);

  if (!data || data.length === 0) return <div className="text-center text-gray-500 text-xs leading-10">—</div>;
  
  return (
    <div className="w-full h-full relative overflow-hidden [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_*]:focus:outline-none outline-none" ref={setContainerNode}>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <LineChart width={dimensions.width} height={dimensions.height} data={data}>
          <XAxis dataKey="date" hide />
          <Tooltip
            content={<SmallSparklineTooltip containerNode={containerNode} />}
            cursor={{ strokeDasharray: '3 3' }}
            isAnimationActive={false}
          />
          <Line type="monotone" dataKey="avg_price" stroke="#60a5fa" dot={false} strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      )}
    </div>
  );
};
