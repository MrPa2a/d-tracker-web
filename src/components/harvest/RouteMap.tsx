import React, { useMemo } from 'react';
import { Loader2, MapIcon } from 'lucide-react';
import { useRouteMapGrid } from '../../hooks/useHarvest';
import { RouteMapCell } from './RouteMapCell';
import type { HarvestRouteStep, GridMapPosition } from '../../api';

interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

interface RouteMapProps {
  steps: HarvestRouteStep[];
  startPosition: { x: number; y: number };
}

/**
 * Compute bounding box from route steps with padding
 */
function computeBoundingBox(
  steps: HarvestRouteStep[],
  startPosition: { x: number; y: number },
  padding = 1
): BoundingBox {
  const xs = steps.map((s) => s.pos_x);
  const ys = steps.map((s) => s.pos_y);

  // Include start position in bounds
  xs.push(startPosition.x);
  ys.push(startPosition.y);

  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Visual map component showing the route on a grid of map sprites
 */
export const RouteMap: React.FC<RouteMapProps> = ({ steps, startPosition }) => {
  // 1. Compute bounding box
  const bounds = useMemo(
    () => computeBoundingBox(steps, startPosition, 1),
    [steps, startPosition]
  );

  // 2. Fetch map grid data
  const { data: gridData, isLoading, isError } = useRouteMapGrid(bounds);

  // 3. Create lookup maps for O(1) access
  const routePositions = useMemo(() => {
    const map = new Map<string, HarvestRouteStep>();
    steps.forEach((step) => {
      map.set(`${step.pos_x},${step.pos_y}`, step);
    });
    return map;
  }, [steps]);

  const gridMaps = useMemo(() => {
    const map = new Map<string, GridMapPosition>();
    gridData?.maps.forEach((m) => {
      map.set(`${m.pos_x},${m.pos_y}`, m);
    });
    return map;
  }, [gridData]);

  // 4. Calculate cell size dynamically
  const cellSize = useMemo(() => {
    const maxContainerWidth = 700;
    const maxContainerHeight = 400;
    const cellByWidth = Math.floor(maxContainerWidth / bounds.width);
    const cellByHeight = Math.floor(maxContainerHeight / bounds.height);
    return Math.min(60, Math.max(30, cellByWidth, cellByHeight));
  }, [bounds]);

  // Check if start position is on the route
  const startKey = `${startPosition.x},${startPosition.y}`;
  const startOnRoute = routePositions.has(startKey);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 bg-[#1a1b1e] rounded-lg">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <span className="ml-2 text-gray-400">Chargement de la carte...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-32 bg-[#1a1b1e] rounded-lg text-red-400">
        Erreur de chargement de la carte
      </div>
    );
  }

  return (
    <div className="bg-[#25262b] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <MapIcon className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-medium text-white">Carte du parcours</h3>
        <span className="text-xs text-gray-500">
          ({bounds.width}×{bounds.height} cases)
        </span>
      </div>

      {/* Grid container - padding top for tooltip overflow */}
      <div className="pt-32 -mt-32 overflow-x-auto overflow-y-visible max-w-full">
        <div
          className="grid gap-px bg-gray-800 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${bounds.width}, ${cellSize}px)`,
            width: 'fit-content',
          }}
        >
          {/* Render grid row by row (Y axis), column by column (X axis) */}
          {Array.from({ length: bounds.height }, (_, rowIdx) => {
            const y = bounds.minY + rowIdx;
            return Array.from({ length: bounds.width }, (_, colIdx) => {
              const x = bounds.minX + colIdx;
              const key = `${x},${y}`;
              const gridMap = gridMaps.get(key);
              const step = routePositions.get(key) || null;
              const isStart = !startOnRoute && x === startPosition.x && y === startPosition.y;

              return (
                <RouteMapCell
                  key={key}
                  posX={x}
                  posY={y}
                  mapId={gridMap?.map_id ?? null}
                  step={step}
                  isStart={isStart}
                  size={cellSize}
                />
              );
            });
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-emerald-500/40 border border-emerald-400 flex items-center justify-center text-[10px] text-white font-bold">
            1
          </div>
          <span>Étape du parcours</span>
        </div>
        {!startOnRoute && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-green-500/20 border border-green-400 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <span>Point de départ</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-[#1a1b1e]" />
          <span>Hors map</span>
        </div>
      </div>
    </div>
  );
};
