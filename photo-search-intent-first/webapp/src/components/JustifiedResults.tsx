import { motion } from "framer-motion";
import { Download, Heart, Play, Share2 } from "lucide-react";
import type React from "react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { apiMetadataDetail, thumbUrl } from "../api";
import { imageLoadingService } from "../services/ImageLoadingService";
import { VideoService } from "../services/VideoService";
import { ProgressiveLoader } from "../utils/loading";
import LazyImage from "./LazyImage";

type Item = { path: string; score?: number };

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  isLongPress: boolean;
  longPressTimer: number | null;
}

interface JustifiedResultsProps {
  dir: string;
  engine: string;
  items: Item[];
  gap?: number;
  targetRowHeight?: number;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  selected: Set<string>;
  onToggleSelect: (path: string) => void;
  onOpen: (path: string) => void;
  focusIndex?: number | null;
  onLayout?: (rows: number[][]) => void;
  ratingMap?: Record<string, number>;
  showInfoOverlay?: boolean;
}

const JustifiedResults = memo(
  ({
    dir,
    engine,
    items,
    gap = 8,
    targetRowHeight = 196,
    scrollContainerRef,
    selected,
    onToggleSelect,
    onOpen,
    focusIndex = null,
    onLayout,
    ratingMap,
    showInfoOverlay,
  }: JustifiedResultsProps) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState<number>(0);
    const [ratios, setRatios] = useState<Record<string, number>>({});
    const [showTouchOverlay, setShowTouchOverlay] = useState<string | null>(
      null
    );
    const [touchState, setTouchState] = useState<Record<string, TouchState>>(
      {}
    );
    const defaultRatio = 4 / 3;
    const [metaCache, setMetaCache] = useState<
      Record<string, import("../models/PhotoMeta").PhotoMeta>
    >({});

    // Animation variants for micro-interactions
    const photoVariants = {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      hover: { scale: 1.02 },
      tap: { scale: 0.98 },
    };

    const overlayVariants = {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 10 },
    }; // Observe container width
    useEffect(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => setWidth(el.clientWidth));
      ro.observe(el);
      setWidth(el.clientWidth);
      return () => ro.disconnect();
    }, [scrollContainerRef]);

    // Preload naturalWidth/Height lazily
    useEffect(() => {
      let cancelled = false;
      const toLoad = items.slice(0, 200); // load first 200 for ratios
      toLoad.forEach(({ path }) => {
        if (ratios[path]) return;
        const img = new Image();
        img.onload = () => {
          if (!cancelled && img.naturalWidth && img.naturalHeight) {
            setRatios((m) => ({
              ...m,
              [path]: img.naturalWidth / img.naturalHeight,
            }));
          }
        };
        img.src = thumbUrl(dir, engine, path, 256);
      });
      return () => {
        cancelled = true;
      };
    }, [items, dir, engine, ratios]);

    // Build justified rows
    const rows = useMemo(() => {
      if (!width || items.length === 0)
        return [] as { items: Item[]; height: number }[];
      const rows: { items: Item[]; height: number }[] = [];
      let row: Item[] = [];
      let sumRatios = 0;
      const innerWidth = Math.max(0, width - 2 * 16); // account for page padding if unknown
      const maxW = innerWidth;
      items.forEach((it, _idx) => {
        const r = ratios[it.path] || defaultRatio;
        row.push(it);
        sumRatios += r;
        const rowW = sumRatios * targetRowHeight + gap * (row.length - 1);
        if (rowW >= maxW) {
          const h = Math.max(
            120,
            Math.floor((maxW - gap * (row.length - 1)) / sumRatios)
          );
          rows.push({ items: row, height: h });
          row = [];
          sumRatios = 0;
        }
      });
      if (row.length > 0) {
        const h = Math.min(
          targetRowHeight,
          Math.floor((maxW - gap * (row.length - 1)) / Math.max(1, sumRatios))
        );
        rows.push({ items: row, height: h });
      }
      return rows;
    }, [items, ratios, width, gap, targetRowHeight]);

    // Build index rows (global indices for each row) for keyboard navigation
    const rowIndices = useMemo(() => {
      const out: number[][] = [];
      if (!items.length || rows.length === 0) return out;
      let i = 0;
      for (const r of rows) {
        const arr: number[] = [];
        for (let j = 0; j < r.items.length; j++) arr.push(i++);
        out.push(arr);
      }
      return out;
    }, [rows, items.length]);

    useEffect(() => {
      if (onLayout) onLayout(rowIndices);
    }, [rowIndices, onLayout]);

    // Touch gesture handlers for mobile-friendly interactions
    const handleTouchStart = (path: string, e: React.TouchEvent) => {
      const touch = e.touches[0];
      const now = Date.now();

      // Clear unknown existing timer for this item
      if (touchState[path]?.longPressTimer) {
        clearTimeout(touchState[path].longPressTimer);
      }

      // Set up new touch state
      const newTouchState: TouchState = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: now,
        isLongPress: false,
        longPressTimer: window.setTimeout(() => {
          setTouchState((prev) => ({
            ...prev,
            [path]: { ...prev[path], isLongPress: true },
          }));
          setShowTouchOverlay(path);
        }, 500), // 500ms for long press
      };

      setTouchState((prev) => ({ ...prev, [path]: newTouchState }));
    };

    const handleTouchMove = (path: string, e: React.TouchEvent) => {
      const touch = e.touches[0];
      const state = touchState[path];
      if (!state) return;

      const deltaX = Math.abs(touch.clientX - state.startX);
      const deltaY = Math.abs(touch.clientY - state.startY);

      // If moved too much, cancel long press
      if (deltaX > 10 || deltaY > 10) {
        if (state.longPressTimer) {
          clearTimeout(state.longPressTimer);
          setTouchState((prev) => ({
            ...prev,
            [path]: { ...prev[path], longPressTimer: null },
          }));
        }
      }
    };

    const handleTouchEnd = (path: string, _e: React.TouchEvent) => {
      const state = touchState[path];
      if (!state) return;

      // Clear long press timer
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
      }

      const endTime = Date.now();
      const duration = endTime - state.startTime;

      // Handle different touch gestures
      if (state.isLongPress) {
        // Long press - keep overlay open
        return;
      } else if (duration < 200) {
        // Quick tap - toggle selection
        onToggleSelect(path);
      }

      // Clean up touch state
      setTimeout(() => {
        setTouchState((prev) => {
          const newState = { ...prev };
          delete newState[path];
          return newState;
        });
      }, 100);
    };

    const handleTouchOverlayAction = (
      path: string,
      action: "open" | "favorite" | "share" | "download"
    ) => {
      setShowTouchOverlay(null);

      switch (action) {
        case "open":
          onOpen(path);
          break;
        case "favorite":
          // This would need to be passed as a prop from parent
          console.log("Favorite:", path);
          break;
        case "share":
          // This would need to be passed as a prop from parent
          console.log("Share:", path);
          break;
        case "download":
          // This would need to be passed as a prop from parent
          console.log("Download:", path);
          break;
      }
    };

    // Virtualize rows based on scroll position
    const [scrollTop, setScrollTop] = useState(0);
    const viewportH = scrollContainerRef.current?.clientHeight || 0;
    useEffect(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const onScroll = () => setScrollTop(el.scrollTop);
      el.addEventListener("scroll", onScroll, { passive: true });
      setScrollTop(el.scrollTop);
      return () => el.removeEventListener("scroll", onScroll);
    }, [scrollContainerRef]);

    const { totalH, offsets } = useMemo(() => {
      let y = 0;
      const offs: number[] = [];
      for (const r of rows) {
        offs.push(y);
        y += r.height + gap;
      }
      return { totalH: y, offsets: offs };
    }, [rows, gap]);

    const overscan = 600;
    const start = useMemo(() => {
      const y = Math.max(0, scrollTop - overscan);
      let i = 0;
      while (i < offsets.length && offsets[i] + rows[i].height < y) i++;
      return i;
    }, [offsets, rows, scrollTop]);
    const end = useMemo(() => {
      const y = scrollTop + viewportH + overscan;
      let i = start;
      while (i < offsets.length && offsets[i] < y) i++;
      return Math.min(i + 5, rows.length);
    }, [offsets, rows, scrollTop, viewportH, start]);

    // Preload images for next rows for better UX
    useEffect(() => {
      const nextRowsItems = rows
        .slice(end, end + 3)
        .flatMap((row) =>
          row.items.map((item) => thumbUrl(dir, engine, item.path, 256))
        );
      if (nextRowsItems.length > 0) {
        imageLoadingService.preloadImages(nextRowsItems, "low");
      }
    }, [end, rows, dir, engine]);

    // Fetch EXIF metadata for visible items when overlay is enabled
    useEffect(() => {
      if (!showInfoOverlay) return;
      const visible: string[] = [];
      rows.slice(start, end).forEach((row, _localIdx) => {
        row.items.forEach((it) => {
          visible.push(it.path);
        });
      });
      const missing = visible.filter((p) => !metaCache[p]);
      if (missing.length === 0) return;
      const toFetch = missing.slice(0, 16); // cap concurrent fetches
      let cancelled = false;
      Promise.all(
        toFetch.map(async (p) => {
          try {
            const r = await apiMetadataDetail(dir, p);
            if (!cancelled && r && r.meta) {
              setMetaCache((m) =>
                m[p]
                  ? m
                  : {
                      ...m,
                      [p]: r.meta as Partial<
                        import("../models/PhotoMeta").PhotoMeta
                      >,
                    }
              );
            }
          } catch {
            // ignore
          }
        })
      );
      return () => {
        cancelled = true;
      };
    }, [showInfoOverlay, rows, start, end, dir, metaCache]);

    // Initial batch prefetch for overlay chips
    useEffect(() => {
      if (!showInfoOverlay) return;
      const first = items
        .slice(0, 48)
        .map((it) => it.path)
        .filter((p) => !metaCache[p]);
      if (first.length === 0) return;
      let cancelled = false;
      Promise.all(
        first.slice(0, 24).map(async (p) => {
          try {
            const r = await apiMetadataDetail(dir, p);
            if (!cancelled && r && r.meta)
              setMetaCache((m) =>
                m[p]
                  ? m
                  : {
                      ...m,
                      [p]: r.meta as Partial<
                        import("../models/PhotoMeta").PhotoMeta
                      >,
                    }
              );
          } catch {
            /* noop */
          }
        })
      );
      return () => {
        cancelled = true;
      };
    }, [showInfoOverlay, items, dir, metaCache]);

    // const activeId = focusIndex !== null ? `photo-${focusIndex}` : undefined;
    return (
      <div
        id="modern-results-grid"
        ref={contentRef}
        className="relative"
        style={{ height: totalH }}
      >
        <ProgressiveLoader
          items={rows.slice(start, end)}
          renderItem={(row: unknown, localIdx: number) => {
            const typedRow = row as (typeof rows)[0];
            const rowIndex = start + localIdx;
            const top = offsets[rowIndex];
            const innerWidth = Math.max(0, width - 2 * 16);
            const sumR = typedRow.items.reduce(
              (s: number, it: (typeof typedRow.items)[0]) =>
                s + (ratios[it.path] || defaultRatio),
              0
            );
            // recompute height for current ratios to minimize gaps
            const h = Math.max(
              120,
              Math.floor(
                (innerWidth - gap * (typedRow.items.length - 1)) /
                  Math.max(0.01, sumR)
              )
            );
            return (
              <div
                key={rowIndex}
                className="absolute left-0 right-0"
                style={{ top }}
              >
                <div className="flex" style={{ gap }}>
                  {typedRow.items.map(
                    (it: (typeof typedRow.items)[0], j: number) => {
                      const globalIdx = rowIndices[rowIndex]?.[j];
                      const r = ratios[it.path] || defaultRatio;
                      const w = Math.floor(h * r);
                      const isSel = selected.has(it.path);
                      const isFocus =
                        focusIndex !== null && globalIdx === focusIndex;
                      const base = it.path.split("/").pop() || it.path;
                      return (
                        <motion.div
                          key={it.path}
                          variants={photoVariants}
                          initial="initial"
                          animate="animate"
                          whileHover="hover"
                          whileTap="tap"
                          transition={{
                            duration: 0.3,
                            delay: globalIdx * 0.02,
                          }}
                          className={`relative group rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg ${
                            isSel ? "ring-2 ring-blue-500 ring-offset-2" : ""
                          } ${
                            isFocus
                              ? "outline outline-2 outline-indigo-500 outline-offset-2"
                              : ""
                          } ${touchState[it.path] ? "scale-95" : ""}`}
                          style={{ width: w, height: h }}
                          title={it.path}
                        >
                          <LazyImage
                            src={thumbUrl(dir, engine, it.path, 256)}
                            alt={base}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {/* Cover interaction button to avoid nesting interactive controls */}
                          <motion.button
                            type="button"
                            className="absolute inset-0 w-full h-full text-left"
                            onClick={() => onToggleSelect(it.path)}
                            onDoubleClick={() => onOpen(it.path)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (e.key === "Enter") {
                                  onOpen(it.path);
                                } else {
                                  onToggleSelect(it.path);
                                }
                              }
                            }}
                            onTouchStart={(e) => handleTouchStart(it.path, e)}
                            onTouchMove={(e) => handleTouchMove(it.path, e)}
                            onTouchEnd={(e) => handleTouchEnd(it.path, e)}
                            data-photo-idx={globalIdx}
                            id={`photo-${globalIdx}`}
                            tabIndex={isFocus ? 0 : -1}
                            aria-label={base}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ duration: 0.15 }}
                          />
                          {/* Video indicator */}
                          {VideoService.isVideoFile(it.path) && (
                            <motion.div
                              variants={overlayVariants}
                              initial="initial"
                              animate="animate"
                              className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors duration-300"
                            >
                              <motion.div
                                className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Play className="w-6 h-6 text-white ml-1" />
                              </motion.div>
                            </motion.div>
                          )}
                          {showInfoOverlay && (
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent text-white px-1.5 py-1 text-[10px] flex items-center justify-between">
                              <span className="truncate mr-2" title={base}>
                                {base}
                              </span>
                              <div className="flex items-center gap-1">
                                {(() => {
                                  const meta = metaCache[it.path];
                                  const chips: string[] = [];
                                  if (meta) {
                                    if (meta.camera)
                                      chips.push(String(meta.camera));
                                    if (typeof meta.fnumber === "number")
                                      chips.push(`f/${meta.fnumber}`);
                                    if (typeof meta.iso === "number")
                                      chips.push(`ISO ${meta.iso}`);
                                  }
                                  if (typeof it.score === "number")
                                    chips.push(it.score.toFixed(2));
                                  return chips.slice(0, 3).map((c, _idx) => (
                                    <span
                                      key={`item-${String(c)}`}
                                      className="bg-white/20 rounded px-1 whitespace-nowrap"
                                    >
                                      {c}
                                    </span>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}
                          {/* Rating overlay */}
                          {ratingMap &&
                            typeof ratingMap[it.path] === "number" &&
                            ratingMap[it.path] > 0 && (
                              <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/50 text-yellow-300 text-[10px] flex items-center gap-0.5">
                                <svg
                                  aria-label="Rating star"
                                  width="10"
                                  height="10"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  aria-hidden
                                >
                                  <title>Rating star</title>
                                  <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.787 1.401 8.168L12 18.896l-7.335 3.87 1.401-8.168L.132 9.211l8.2-1.193z" />
                                </svg>
                                <span>{ratingMap[it.path]}</span>
                              </div>
                            )}
                          {/* score chip handled in bottom overlay when showInfoOverlay is enabled */}
                          {isSel && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg
                                aria-label="Selected"
                                className="w-4 h-4 text-white"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <title>Selected</title>
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                          {/* Touch overlay for mobile interactions */}
                          {showTouchOverlay === it.path && (
                            <div
                              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3"
                              onClick={() => setShowTouchOverlay(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setShowTouchOverlay(null);
                                }
                              }}
                              role="dialog"
                              aria-modal="true"
                              aria-labelledby={`quick-actions-title-${globalIdx}`}
                              tabIndex={0}
                            >
                              <h3
                                id={`quick-actions-title-${globalIdx}`}
                                className="text-white text-sm font-medium mb-2"
                              >
                                Quick Actions
                              </h3>
                              <div className="flex gap-3">
                                {[
                                  {
                                    title: "Open",
                                    color: "bg-blue-500 hover:bg-blue-600",
                                    onAction: () =>
                                      handleTouchOverlayAction(it.path, "open"),
                                    icon: <Play className="w-5 h-5 ml-0.5" />,
                                  },
                                  {
                                    title: "Favorite",
                                    color: "bg-pink-500 hover:bg-pink-600",
                                    onAction: () =>
                                      handleTouchOverlayAction(
                                        it.path,
                                        "favorite"
                                      ),
                                    icon: <Heart className="w-5 h-5" />,
                                  },
                                  {
                                    title: "Share",
                                    color: "bg-green-500 hover:bg-green-600",
                                    onAction: () =>
                                      handleTouchOverlayAction(
                                        it.path,
                                        "share"
                                      ),
                                    icon: <Share2 className="w-5 h-5" />,
                                  },
                                  {
                                    title: "Download",
                                    color: "bg-purple-500 hover:bg-purple-600",
                                    onAction: () =>
                                      handleTouchOverlayAction(
                                        it.path,
                                        "download"
                                      ),
                                    icon: <Download className="w-5 h-5" />,
                                  },
                                ].map(({ title, color, onAction, icon }) => (
                                  <button
                                    key={title}
                                    type="button"
                                    title={title}
                                    aria-label={title}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAction();
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onAction();
                                      }
                                    }}
                                    className={`w-12 h-12 ${color} rounded-full flex items-center justify-center text-white transition-colors`}
                                  >
                                    {icon}
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                aria-label="Close quick actions"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowTouchOverlay(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowTouchOverlay(null);
                                  }
                                }}
                                className="mt-4 text-white/70 hover:text-white text-xs"
                              >
                                Tap anywhere to close
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    }
                  )}
                </div>
              </div>
            );
          }}
          batchSize={5}
          delay={100}
        />
      </div>
    );
  }
);

JustifiedResults.displayName = "JustifiedResults";

export default JustifiedResults;
