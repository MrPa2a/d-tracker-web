import React, { useState } from 'react';
import { MapPin, Footprints } from 'lucide-react';
import type { HarvestRouteStep } from '../../api';

interface RouteMapCellProps {
  posX: number;
  posY: number;
  mapId: number | null;
  step: HarvestRouteStep | null;
  isStart: boolean;
  size: number;
}

/**
 * Individual cell in the route map grid.
 * Displays the map sprite from DofusDB with overlays for route steps.
 */
export const RouteMapCell: React.FC<RouteMapCellProps> = ({
  posX,
  posY,
  mapId,
  step,
  isStart,
  size,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Use 0.25 zoom for small thumbnails
  const imgUrl = mapId && !imgError
    ? `https://api.dofusdb.fr/img/maps/0.25/${mapId}.jpg`
    : null;

  const showTooltip = isHovered && (step || isStart);

  return (
    <div
      className="relative group"
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cell content */}
      <div className="w-full h-full overflow-hidden">
        {/* Background: sprite or placeholder */}
        {imgUrl ? (
          <img
            src={imgUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-[#1a1b1e]" />
        )}

        {/* Overlay if part of route */}
        {step && (
          <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center border-2 border-emerald-400">
            <span className="text-white font-bold text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {step.order}
            </span>
          </div>
        )}

        {/* Start position marker (if not on route) */}
        {isStart && !step && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 border-2 border-green-400">
            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-lg" />
          </div>
        )}
      </div>

      {/* Rich Tooltip */}
      {showTooltip && (
        <div 
          className="absolute z-50 pointer-events-none"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 4,
          }}
        >
          <div className="bg-[#1a1b1e] border border-white/10 rounded-lg shadow-xl min-w-[160px] max-w-[220px] overflow-hidden">
            {/* Header */}
            <div className="bg-[#25262b] px-3 py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-white font-medium text-sm">
                  [{posX}, {posY}]
                </span>
                {step && (
                  <span className="ml-auto bg-emerald-600/30 text-emerald-400 text-xs px-1.5 py-0.5 rounded">
                    #{step.order}
                  </span>
                )}
                {isStart && !step && (
                  <span className="ml-auto bg-green-600/30 text-green-400 text-xs px-1.5 py-0.5 rounded">
                    Départ
                  </span>
                )}
              </div>
              {step?.subarea_name && (
                <div className="text-xs text-gray-400 mt-0.5 truncate">
                  {step.subarea_name}
                </div>
              )}
            </div>

            {/* Resources */}
            {step && step.resources.length > 0 && (
              <div className="p-2 space-y-1">
                {step.resources.map((res) => (
                  <div 
                    key={res.id} 
                    className="flex items-center gap-2 bg-[#25262b]/50 rounded px-2 py-1"
                  >
                    {res.icon_url ? (
                      <img 
                        src={res.icon_url} 
                        alt="" 
                        className="w-5 h-5 object-contain shrink-0" 
                      />
                    ) : (
                      <div className="w-5 h-5 bg-gray-700 rounded shrink-0" />
                    )}
                    <span className="text-xs text-gray-300 truncate flex-1">
                      {res.name}
                    </span>
                    <span className="text-xs text-emerald-400 font-medium shrink-0">
                      ×{res.count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Start position info */}
            {isStart && !step && (
              <div className="p-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Footprints className="w-4 h-4 text-green-400" />
                  <span>Point de départ du parcours</span>
                </div>
              </div>
            )}
          </div>

          {/* Arrow pointer */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              top: '100%',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #25262b',
            }}
          />
        </div>
      )}
    </div>
  );
};
