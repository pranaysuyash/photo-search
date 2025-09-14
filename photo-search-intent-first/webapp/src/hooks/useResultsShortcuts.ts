import { MutableRefObject, useEffect } from "react";
import { apiSetFavorite } from "../api";

interface UseResultsShortcutsParams {
  // Enablement/guards
  enabled: boolean; // selectedView === 'results'
  anyOverlayOpen: boolean; // showShortcuts || showFilters || anyModalOpen

  // Data
  results: Array<{ path: string }>;
  dir: string;
  fav: string[];

  // Focus and detail navigation
  focusIdx: number | null;
  setFocusIdx: (i: number | null) => void;
  layoutRowsRef: MutableRefObject<number[][]>;
  detailIdx: number | null;
  setDetailIdx: (i: number | null) => void;
  navDetail: (delta: number) => void;

  // Actions
  toggleSelect: (path: string) => void;
  loadFav: () => Promise<void> | void;
}

export function useResultsShortcuts({
  enabled,
  anyOverlayOpen,
  results,
  dir,
  fav,
  focusIdx,
  setFocusIdx,
  layoutRowsRef,
  detailIdx,
  setDetailIdx,
  navDetail,
  toggleSelect,
  loadFav,
}: UseResultsShortcutsParams) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!enabled) return;
      if (anyOverlayOpen) return;
      const hasResults = (results?.length || 0) > 0;
      if (!hasResults) return;

      if (e.key === "Escape") {
        setDetailIdx(null);
        return;
      }
      if (detailIdx !== null) {
        if (e.key === "ArrowLeft" || e.key === "k") {
          e.preventDefault();
          navDetail(-1);
        }
        if (e.key === "ArrowRight" || e.key === "j") {
          e.preventDefault();
          navDetail(1);
        }
        if (e.key.toLowerCase() === "f") {
          e.preventDefault();
          const p = results?.[detailIdx]?.path;
          if (!p) return;
          apiSetFavorite(dir, p, !fav.includes(p))
            .then(() => loadFav())
            .catch(() => {});
        }
        return;
      }

      // Grid context
      if (e.key.toLowerCase() === "a") {
        e.preventDefault();
        // select all
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _ = results.map((r) => r.path); // no-op to hint intent
        // handled by caller via toggleSelect in loops
        return;
      }
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        // clear all
        // handled by caller state setter; keep as no-op here
        return;
      }
      if (e.key.toLowerCase() === "f" && focusIdx !== null) {
        e.preventDefault();
        const p = results?.[focusIdx]?.path;
        if (!p) return;
        apiSetFavorite(dir, p, !fav.includes(p))
          .then(() => loadFav())
          .catch(() => {});
        return;
      }
      if (e.key === "Enter" && focusIdx !== null) {
        e.preventDefault();
        setDetailIdx(focusIdx);
        return;
      }
      if (e.key === " " && focusIdx !== null) {
        e.preventDefault();
        const p = results?.[focusIdx]?.path;
        if (!p) return;
        toggleSelect(p);
        return;
      }

      // Navigation across grid
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (focusIdx !== null) setFocusIdx(Math.max(0, focusIdx - 1));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (focusIdx !== null) setFocusIdx(Math.min((results?.length ?? 1) - 1, focusIdx + 1));
        return;
      }
      if (e.key === "ArrowUp" && focusIdx !== null) {
        e.preventDefault();
        const currentLayout = layoutRowsRef.current;
        const rowIdx = currentLayout.findIndex((r) => r.includes(focusIdx));
        if (rowIdx > 0) {
          const col = currentLayout[rowIdx].indexOf(focusIdx);
          const prevRow = currentLayout[rowIdx - 1];
          const target = prevRow[Math.min(col, prevRow.length - 1)];
          if (typeof target === "number") setFocusIdx(target);
        }
        return;
      }
      if (e.key === "ArrowDown" && focusIdx !== null) {
        e.preventDefault();
        const currentLayout = layoutRowsRef.current;
        const rowIdx = currentLayout.findIndex((r) => r.includes(focusIdx));
        if (rowIdx >= 0 && rowIdx < currentLayout.length - 1) {
          const col = currentLayout[rowIdx].indexOf(focusIdx);
          const nextRow = currentLayout[rowIdx + 1];
          const target = nextRow[Math.min(col, nextRow.length - 1)];
          if (typeof target === "number") setFocusIdx(target);
        }
        return;
      }

      // Home/End jump
      if (e.key === "Home") {
        e.preventDefault();
        setFocusIdx(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setFocusIdx(results.length - 1);
        return;
      }

      // PageUp/PageDown jumps by ~3 rows preserving column when possible
      if ((e.key === "PageUp" || e.key === "PageDown") && focusIdx !== null) {
        e.preventDefault();
        const jump = 3;
        const currentLayout = layoutRowsRef.current;
        const rowIdx = currentLayout.findIndex((r) => r.includes(focusIdx));
        if (rowIdx >= 0) {
          const col = currentLayout[rowIdx].indexOf(focusIdx);
          const targetRow = e.key === "PageUp" ? Math.max(0, rowIdx - jump) : Math.min(currentLayout.length - 1, rowIdx + jump);
          const row = currentLayout[targetRow];
          const target = row[Math.min(col, row.length - 1)];
          if (typeof target === "number") setFocusIdx(target);
        }
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, anyOverlayOpen, results, dir, fav, focusIdx, setFocusIdx, layoutRowsRef, detailIdx, setDetailIdx, navDetail, toggleSelect, loadFav]);
}

export default useResultsShortcuts;

