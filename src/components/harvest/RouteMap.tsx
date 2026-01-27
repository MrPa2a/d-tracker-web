import React, { useMemo, useState, useEffect } from 'react';
import { Loader2, MapIcon, ChevronDown, ChevronUp, Move } from 'lucide-react';
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
  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Collapse state - collapsed by default on mobile
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  useEffect(() => {
    setIsCollapsed(isMobile);
  }, [isMobile]);

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

  // 4. Calculate cell size dynamically - smaller on mobile
  const cellSize = useMemo(() => {
    if (isMobile) {
      // On mobile, target smaller cells
      const maxContainerWidth = 320;
      const cellByWidth = Math.floor(maxContainerWidth / bounds.width);
      return Math.min(45, Math.max(25, cellByWidth));
    }
    const maxContainerWidth = 700;
    const maxContainerHeight = 400;
    const cellByWidth = Math.floor(maxContainerWidth / bounds.width);
    const cellByHeight = Math.floor(maxContainerHeight / bounds.height);
    return Math.min(60, Math.max(30, cellByWidth, cellByHeight));
  }, [bounds, isMobile]);

  // Check if start position is on the route
  const startKey = `${startPosition.x},${startPosition.y}`;
  const startOnRoute = routePositions.has(startKey);

  return (
    <div className="bg-[#1a1b1e] rounded-xl border border-white/5 overflow-hidden">
      {/* Header - cliquable pour collapse */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="relative z-20 w-full px-4 py-3 flex items-center justify-between bg-[#25262b] hover:bg-[#2c2d32] transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 pointer-events-none">
          <MapIcon className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-white">Carte du parcours</span>
          <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
            {bounds.width}×{bounds.height}
          </span>
        </div>
        <div className="flex items-center gap-2 pointer-events-none">
          <span className="text-[10px] text-gray-500 hidden sm:inline">
            {isCollapsed ? 'Afficher' : 'Masquer'}
          </span>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Contenu collapsable */}
      {!isCollapsed && (
        <div className="p-3 md:p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              <span className="ml-2 text-sm text-gray-400">Chargement...</span>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-24 text-red-400 text-sm">
              Erreur de chargement de la carte
            </div>
          ) : (
            <>
              {/* Mobile scroll hint */}
              {isMobile && (
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-2 py-1 bg-white/5 rounded">
                  <Move className="w-3.5 h-3.5" />
                  <span>Glisser pour naviguer</span>
                </div>
              )}

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

              {/* Legend - simplified on mobile */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-3 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-emerald-500/40 border border-emerald-400 flex items-center justify-center text-[10px] text-white font-bold">
                    1
                  </div>
                  <span className="hidden sm:inline">Étape du parcours</span>
                  <span className="sm:hidden">Étape</span>
                </div>
                {!startOnRoute && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-green-500/20 border border-green-400 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                    <span>Départ</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-[#25262b]" />
                  <span className="hidden sm:inline">Hors map</span>
                  <span className="sm:hidden">Vide</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Collapsed preview */}
      {isCollapsed && (
        <div className="px-4 py-2 text-xs text-gray-500 border-t border-white/5">
          {steps.length} étapes • Cliquez pour afficher la carte
        </div>
      )}
    </div>
  );
};
