/**
 * GridViewSwitcher.tsx
 *
 * INTENT: Unified view switcher component that allows users to toggle between
 * Masonry, Film Strip, and Timeline views with smooth transitions and state persistence.
 *
 * DESIGN PHILOSOPHY:
 * - Visual Clarity: Icons + labels for each view mode
 * - State Persistence: Remember user's preferred view
 * - Smooth Transitions: Animated view changes
 * - Keyboard Shortcuts: 1 (Masonry), 2 (Film), 3 (Timeline)
 * - Accessibility: Full keyboard navigation and screen reader support
 *
 * FEATURES:
 * - Three view modes with distinct icons
 * - Animated view transitions with Framer Motion
 * - LocalStorage persistence
 * - Keyboard shortcuts (1/2/3 keys)
 * - Tooltip hints on hover
 * - Compact/expanded toolbar modes
 */

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Grid3x3, Film, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PhotoGridMasonry from "./PhotoGridMasonry";
import PhotoGridFilmStrip from "./PhotoGridFilmStrip";
import PhotoGridTimeline from "./PhotoGridTimeline";
import "./GridViewSwitcher.css";

export type ViewMode = "masonry" | "filmstrip" | "timeline";

interface Photo {
  path: string;
  thumbnail?: string;
  metadata?: {
    timestamp?: number;
    title?: string;
    views?: number;
    lastViewed?: number;
  };
  score?: number;
}

interface GridViewSwitcherProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo, index: number) => void;
  /** Initial view mode */
  defaultView?: ViewMode;
  /** Persist view preference key (localStorage) */
  persistenceKey?: string;
  /** Show view labels alongside icons */
  showLabels?: boolean;
  /** Compact mode (smaller buttons) */
  compact?: boolean;
  className?: string;
}

const VIEW_CONFIG = {
  masonry: {
    id: "masonry" as const,
    label: "Masonry",
    icon: Grid3x3,
    shortcut: "1",
    description: "Dynamic grid with recency weighting",
  },
  filmstrip: {
    id: "filmstrip" as const,
    label: "Film Strip",
    icon: Film,
    shortcut: "2",
    description: "Horizontal scrolling film view",
  },
  timeline: {
    id: "timeline" as const,
    label: "Timeline",
    icon: Clock,
    shortcut: "3",
    description: "Chronological date grouping",
  },
};

/**
 * Grid View Switcher Component
 */
export const GridViewSwitcher: React.FC<GridViewSwitcherProps> = ({
  photos,
  onPhotoClick,
  defaultView = "masonry",
  persistenceKey = "photo-grid-view-mode",
  showLabels = true,
  compact = false,
  className,
}) => {
  // Load persisted view preference
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return defaultView;

    const stored = localStorage.getItem(persistenceKey);
    return (stored as ViewMode) || defaultView;
  });

  /**
   * Change view mode with persistence
   */
  const handleViewChange = useCallback(
    (view: ViewMode) => {
      setCurrentView(view);

      // Persist preference
      if (typeof window !== "undefined") {
        localStorage.setItem(persistenceKey, view);
      }
    },
    [persistenceKey]
  );

  /**
   * Keyboard shortcuts (1/2/3 for view modes)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "1":
          handleViewChange("masonry");
          break;
        case "2":
          handleViewChange("filmstrip");
          break;
        case "3":
          handleViewChange("timeline");
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleViewChange]);

  return (
    <div className={cn("grid-view-switcher", className)}>
      {/* View Mode Toolbar */}
      <div className={cn("view-toolbar", compact && "view-toolbar-compact")}>
        <TooltipProvider>
          {Object.values(VIEW_CONFIG).map((view) => {
            const Icon = view.icon;
            const isActive = currentView === view.id;

            return (
              <Tooltip key={view.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size={compact ? "sm" : "default"}
                    className={cn(
                      "view-button",
                      isActive && "view-button-active"
                    )}
                    onClick={() => handleViewChange(view.id)}
                    aria-label={`Switch to ${view.label} view`}
                    aria-pressed={isActive}
                  >
                    <Icon className="h-4 w-4" />
                    {showLabels && !compact && <span>{view.label}</span>}

                    {/* Keyboard Shortcut Badge */}
                    {!compact && (
                      <kbd className="view-shortcut">{view.shortcut}</kbd>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{view.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Press <kbd>{view.shortcut}</kbd>
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* View Content with Animated Transitions */}
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="view-content"
      >
        {currentView === "masonry" && (
          <PhotoGridMasonry
            photos={photos}
            onPhotoClick={onPhotoClick}
            enableSelection
            showMetadata
          />
        )}

        {currentView === "filmstrip" && (
          <PhotoGridFilmStrip
            photos={photos}
            onPhotoClick={onPhotoClick}
            showDates
            height={200}
          />
        )}

        {currentView === "timeline" && (
          <PhotoGridTimeline
            photos={photos}
            onPhotoClick={onPhotoClick}
            showYearHeaders
            densityThreshold={5}
          />
        )}
      </motion.div>
    </div>
  );
};

export default GridViewSwitcher;
