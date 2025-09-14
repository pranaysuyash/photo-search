import React from "react";
import { EnhancedEmptyState } from "../components/EnhancedEmptyState";
import { humanizeSeconds } from "../utils/time";

export interface LibraryViewProps {
  dir: string;
  library: string[] | null;
  isIndexing: boolean;
  progressPct?: number;
  etaSeconds?: number;
  onSelectLibrary: () => void;
  onRunDemo: () => Promise<void>;
  onOpenHelp: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  dir,
  library,
  isIndexing,
  progressPct,
  etaSeconds,
  onSelectLibrary,
  onRunDemo,
  onOpenHelp,
}) => {
  // Empty dir state
  if (!dir) {
    return (
      <div className="p-4">
        <EnhancedEmptyState
          type="no-directory"
          onAction={onSelectLibrary}
          onDemoAction={onRunDemo}
          onOpenHelp={onOpenHelp}
          onStartTour={onOpenHelp}
          sampleQueries={["beach sunset", "birthday cake", "mountain hike", "red car"]}
          onRunSample={() => {}}
        />
      </div>
    );
  }

  if ((library?.length || 0) === 0 && isIndexing) {
    return (
      <div className="p-4">
        <EnhancedEmptyState
          type="indexing"
          indexingProgress={Math.round((progressPct || 0) * 100)}
          estimatedTime={
            typeof etaSeconds === "number" && Number.isFinite(etaSeconds)
              ? `~${humanizeSeconds(etaSeconds || 0)}`
              : undefined
          }
        />
      </div>
    );
  }

  // Default: basic skeleton (actual library browser remains in App for now)
  return <div className="p-4">{/* Library content is shown by App layout */}</div>;
};

export default LibraryView;
