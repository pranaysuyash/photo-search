/**
 * Grid Components Index
 *
 * Modern grid layouts for Day 2 visual showcase:
 * - Masonry: Recency-weighted dynamic grid
 * - Film Strip: Horizontal scrolling cinema view
 * - Timeline: Chronological date grouping
 * - Virtualized Grid: High-performance virtualized grid with react-window
 * - View Switcher: Toggle between all grid modes
 */

export { PhotoGridMasonry } from "./PhotoGridMasonry";
export { PhotoGridFilmStrip } from "./PhotoGridFilmStrip";
export { PhotoGridTimeline } from "./PhotoGridTimeline";
export { VirtualizedPhotoGrid, type VirtualizedPhoto } from "./VirtualizedPhotoGrid";
export { GridViewSwitcher, type ViewMode } from "./GridViewSwitcher";
export type { default as Photo } from "./types";
