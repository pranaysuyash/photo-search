import { useCallback, useMemo, useRef, useState } from "react";
import type { PlaceLocation, PlacePoint } from "@/services/api";
import { useResizeObserver } from "@/hooks/useResizeObserver";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PlacesMapProps {
  locations: Array<PlaceLocation & { previewUrl?: string | null }>;
  points: PlacePoint[];
  selectedId?: string | null;
  onSelectLocation?: (locationId: string) => void;
  className?: string;
}

const VIEWBOX_WIDTH = 360;
const VIEWBOX_HEIGHT = 180;
const LAT_LINES = [-60, -30, 0, 30, 60];
const LON_LINES = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];

function project(lat: number, lon: number) {
  const x = (lon + 180) * (VIEWBOX_WIDTH / 360);
  const y = (90 - lat) * (VIEWBOX_HEIGHT / 180);
  return { x, y };
}

export function PlacesMap({
  locations,
  points,
  selectedId,
  onSelectLocation,
  className,
}: PlacesMapProps) {
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewport, setViewport] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  const [isPanning, setIsPanning] = useState(false);
  const panOrigin = useRef({
    x: 0,
    y: 0,
    translateX: 0,
    translateY: 0,
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === selectedId) ?? null,
    [locations, selectedId]
  );

  const hoveredLocation = useMemo(
    () => locations.find((loc) => loc.id === hoveredId) ?? null,
    [locations, hoveredId]
  );

  const displayedInfo = hoveredLocation ?? selectedLocation;

  const maxCount = useMemo(
    () => locations.reduce((acc, loc) => Math.max(acc, loc.count), 0),
    [locations]
  );

  const positions = useMemo(() => {
    return locations.map((location) => {
      const { x, y } = project(
        location.center.lat,
        location.center.lon
      );
      const intensity = maxCount > 0 ? location.count / maxCount : 0;
      const baseRadius = 6 + Math.sqrt(location.count) * 1.2;
      const fillHue = 200 - intensity * 140;
      const fill = `hsl(${fillHue}, 70%, ${35 + intensity * 20}%)`;
      return {
        location,
        x,
        y,
        fill,
        radius: baseRadius,
      };
    });
  }, [locations, maxCount]);

  const pointPositions = useMemo(() => {
    if (viewport.scale < 2) return [] as Array<{ x: number; y: number }>;
    return points
      .map((point) => project(point.lat, point.lon))
      .filter(({ x, y }) => Number.isFinite(x) && Number.isFinite(y));
  }, [points, viewport.scale]);

  const convertClientDeltaToViewbox = useCallback(
    (deltaX: number, deltaY: number) => {
      const width = size.width || 1;
      const height = size.height || 1;
      const scaleX = VIEWBOX_WIDTH / width;
      const scaleY = VIEWBOX_HEIGHT / height;
      return { dx: deltaX * scaleX, dy: deltaY * scaleY };
    },
    [size.height, size.width]
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault();
      const { deltaY } = event.nativeEvent;
      const scaleDirection = deltaY > 0 ? -0.15 : 0.15;
      const nextScale = Math.min(
        8,
        Math.max(1, viewport.scale * (1 + scaleDirection))
      );

      if (!svgRef.current) {
        setViewport((prev) => ({ ...prev, scale: nextScale }));
        return;
      }

      const rect = svgRef.current.getBoundingClientRect();
      const pointerX = ((event.clientX - rect.left) / rect.width) * VIEWBOX_WIDTH;
      const pointerY = ((event.clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT;

      const scaleFactor = nextScale / viewport.scale;
      const translateX =
        pointerX - scaleFactor * (pointerX - viewport.translateX);
      const translateY =
        pointerY - scaleFactor * (pointerY - viewport.translateY);

      setViewport({ scale: nextScale, translateX, translateY });
    },
    [viewport.scale, viewport.translateX, viewport.translateY]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      setIsPanning(true);
      panOrigin.current = {
        x: event.clientX,
        y: event.clientY,
        translateX: viewport.translateX,
        translateY: viewport.translateY,
      };
      svgRef.current.setPointerCapture(event.pointerId);
    },
    [viewport.translateX, viewport.translateY]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!isPanning) return;
      const deltaX = event.clientX - panOrigin.current.x;
      const deltaY = event.clientY - panOrigin.current.y;
      const { dx, dy } = convertClientDeltaToViewbox(deltaX, deltaY);

      setViewport((prev) => ({
        ...prev,
        translateX: panOrigin.current.translateX + dx,
        translateY: panOrigin.current.translateY + dy,
      }));
    },
    [convertClientDeltaToViewbox, isPanning]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!isPanning) return;
      setIsPanning(false);
      if (svgRef.current?.hasPointerCapture(event.pointerId)) {
        svgRef.current.releasePointerCapture(event.pointerId);
      }
    },
    [isPanning]
  );

  const resetView = useCallback(() => {
    setViewport({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full h-full min-h-[320px] rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden",
        className
      )}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="w-full h-full touch-none"
        role="application"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseLeave={() => setHoveredId(null)}
      >
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.45)" />
            <stop offset="100%" stopColor="rgba(30, 41, 59, 0.1)" />
          </radialGradient>
        </defs>

        <rect
          x={0}
          y={0}
          width={VIEWBOX_WIDTH}
          height={VIEWBOX_HEIGHT}
          fill="url(#mapGlow)"
        />

        <g
          transform={`translate(${viewport.translateX} ${viewport.translateY}) scale(${viewport.scale})`}
          className="transition-transform duration-75 ease-out"
        >
          {/* Longitude lines */}
          {LON_LINES.map((lon) => {
            const { x } = project(0, lon);
            return (
              <line
                key={`lon-${lon}`}
                x1={x}
                y1={0}
                x2={x}
                y2={VIEWBOX_HEIGHT}
                stroke="rgba(148, 163, 184, 0.2)"
                strokeWidth={0.35}
              />
            );
          })}

          {/* Latitude lines */}
          {LAT_LINES.map((lat) => {
            const { y } = project(lat, 0);
            return (
              <line
                key={`lat-${lat}`}
                x1={0}
                y1={y}
                x2={VIEWBOX_WIDTH}
                y2={y}
                stroke="rgba(148, 163, 184, 0.2)"
                strokeWidth={0.35}
              />
            );
          })}

          {/* Raw points for zoomed-in view */}
          {pointPositions.map(({ x, y }, index) => (
            <circle
              key={`pt-${index}`}
              cx={x}
              cy={y}
              r={0.8 / viewport.scale}
              fill="rgba(148, 163, 184, 0.35)"
            />
          ))}

          {/* Location clusters */}
          {positions.map(({ location, x, y, fill, radius }) => {
            const isSelected = selectedId === location.id;
            const isHovered = hoveredId === location.id;
            const strokeWidth = isSelected || isHovered ? 2.5 : 1.5;
            return (
              <g
                key={location.id}
                transform={`translate(${x} ${y})`}
                className="cursor-pointer"
                onClick={() => onSelectLocation?.(location.id)}
                onMouseEnter={() => setHoveredId(location.id)}
              >
                <circle
                  r={(radius + (isSelected ? 4 : 0)) / viewport.scale}
                  fill={fill}
                  opacity={0.9}
                  stroke={isSelected ? "#93c5fd" : "rgba(15, 23, 42, 0.65)"}
                  strokeWidth={strokeWidth / viewport.scale}
                  className="drop-shadow-lg transition-transform duration-150"
                />
                <text
                  textAnchor="middle"
                  dy={4 / viewport.scale}
                  fontSize={`${Math.max(6, 11 + Math.min(location.count / 50, 10)) / viewport.scale}`}
                  fill="white"
                  pointerEvents="none"
                  fontWeight={600}
                >
                  {location.count}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={resetView}
          className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/70 text-slate-600 dark:text-slate-200 text-xs font-medium shadow-sm hover:bg-white active:scale-[0.98] transition"
        >
          Reset view
        </button>
        {pointPositions.length > 0 && (
          <Badge className="bg-blue-500/80 text-white border-none">Detailed mode</Badge>
        )}
      </div>

      {displayedInfo ? (
        <div className="absolute bottom-4 left-4 max-w-sm rounded-2xl bg-slate-900/85 text-slate-100 shadow-2xl backdrop-blur px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                {hoveredLocation ? "Hover" : "Selected"}
              </p>
              <h3 className="text-lg font-semibold">
                {displayedInfo.name}
              </h3>
              <p className="text-sm text-slate-300">
                {displayedInfo.count.toLocaleString()} photos ·
                <span className="ml-1 text-slate-400">
                  ~{Math.max(0.1, displayedInfo.approximate_radius_km).toFixed(1)} km span
                </span>
              </p>
            </div>
            {displayedInfo.previewUrl ? (
              <img
                src={displayedInfo.previewUrl}
                alt={displayedInfo.name}
                className="w-16 h-16 rounded-xl object-cover border border-white/30 shadow-inner"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PlacesMap;
