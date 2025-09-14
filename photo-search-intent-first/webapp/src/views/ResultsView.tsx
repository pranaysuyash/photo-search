import React from "react";
import JustifiedResults from "../components/JustifiedResults";
import TimelineResults from "../components/TimelineResults";
import { EnhancedEmptyState } from "../components/EnhancedEmptyState";
import { useResultsConfig } from "../contexts/ResultsConfigContext";
import { SectionErrorBoundary } from "../components/ErrorBoundary";
import { useResultsUI } from "../contexts/ResultsUIContext";

export interface ResultsViewProps {
  // Data
  dir: string;
  engine: string;
  results: Array<{ path: string; score?: number }>;
  searchText: string;
  altSearch?: { active: boolean; applied: string; original: string } | null;
  ratingMap?: Record<string, number>;
  showInfoOverlay?: boolean;
  // Openers
  openDetailByPath: (path: string) => void;
  // Layout refs
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  setSearchText: (t: string) => void;
  onSearchNow: (t: string) => void;
  onLayout?: (rows: number[][]) => void;
  // View settings provided by ResultsConfig context
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  dir,
  engine,
  results,
  searchText,
  altSearch,
  ratingMap,
  showInfoOverlay,
  openDetailByPath,
  scrollContainerRef,
  setSearchText,
  onSearchNow,
  onLayout,
}) => {
  const { selected, toggleSelect, focusIdx } = useResultsUI();
  const { resultView, timelineBucket } = useResultsConfig();
  const hasResults = (results?.length || 0) > 0;
  return (
    <SectionErrorBoundary sectionName="Search Results">
      <div className="p-4">
        {/* Context toolbar */}
        {hasResults && (searchText || "").trim() && (
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm text-gray-600">{results.length} results</div>
            {altSearch?.active && (
              <div className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-800 border border-yellow-200" aria-live="polite">
                Showing results for "{altSearch.applied}" (from "{altSearch.original}")
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => {
                    setSearchText(altSearch.original);
                    onSearchNow(altSearch.original);
                  }}
                >
                  Search original
                </button>
              </div>
            )}
          </div>
        )}

        {!hasResults ? (
          <div className="p-2">
            <EnhancedEmptyState
              type="no-results"
              suggestions={(searchText || "").trim() ? [
                "golden hour",
                "family dinner",
                "mountain hike",
              ] : []}
              onRunSample={(q) => onSearchNow(q)}
            />
          </div>
        ) : resultView === "grid" ? (
          <JustifiedResults
            dir={dir}
            engine={engine}
            items={(results || []).map((r) => ({ path: r.path, score: r.score }))}
            selected={selected}
            onToggleSelect={toggleSelect}
            onOpen={(p) => openDetailByPath(p)}
            scrollContainerRef={scrollContainerRef}
            focusIndex={focusIdx ?? undefined}
            onLayout={onLayout}
            ratingMap={ratingMap}
            showInfoOverlay={showInfoOverlay}
          />
        ) : (
          <TimelineResults
            dir={dir}
            engine={engine}
            items={(results || []).map((r) => ({ path: r.path, score: r.score }))}
            selected={selected}
            onToggleSelect={toggleSelect}
            onOpen={(p) => openDetailByPath(p)}
            showInfoOverlay={showInfoOverlay}
            bucket={timelineBucket}
          />
        )}
      </div>
    </SectionErrorBoundary>
  );
};

export default ResultsView;
