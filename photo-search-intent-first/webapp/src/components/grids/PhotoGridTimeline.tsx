/**
 * PhotoGridTimeline.tsx
 *
 * INTENT: Create a vertical timeline view with date-based clustering
 * for browsing photos chronologically, inspired by Apple Photos and Google Photos.
 * Photos are grouped by date with smooth scroll-to-date functionality.
 *
 * DESIGN PHILOSOPHY:
 * - Chronological Story: Browse photos as a timeline of memories
 * - Smart Clustering: Group by day/month/year based on density
 * - Quick Navigation: Jump to any date with scroll indicators
 * - Visual Hierarchy: Year headers, month dividers, day clusters
 * - Infinite Scroll: Load more as user scrolls (virtual scrolling)
 *
 * FEATURES:
 * - Vertical timeline with date headers
 * - Smart date grouping (dense → daily, sparse → monthly)
 * - Scroll-to-date functionality
 * - Floating date indicator on scroll
 * - Keyboard shortcuts (PageUp/PageDown, Home/End)
 * - Smooth animations for date transitions
 */

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import "./PhotoGridTimeline.css";

interface Photo {
  path: string;
  thumbnail?: string;
  metadata?: {
    timestamp?: number;
    title?: string;
  };
  score?: number;
}

interface PhotoGridTimelineProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo, index: number) => void;
  className?: string;
  /** Density threshold for daily vs monthly clustering */
  densityThreshold?: number;
  /** Show year headers */
  showYearHeaders?: boolean;
}

interface DateGroup {
  year: number;
  month: number;
  day?: number;
  label: string;
  photos: Array<{ photo: Photo; index: number }>;
}

/**
 * Group photos by date with smart clustering
 * Dense periods → daily groups, Sparse periods → monthly groups
 */
function groupPhotosByDate(photos: Photo[], densityThreshold = 5): DateGroup[] {
  const groups: DateGroup[] = [];
  const photosByMonth: Record<
    string,
    Array<{ photo: Photo; index: number; date: Date }>
  > = {};

  // First, organize by month
  photos.forEach((photo, index) => {
    const timestamp = photo.metadata?.timestamp || 0;
    const date = new Date(timestamp);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

    if (!photosByMonth[monthKey]) {
      photosByMonth[monthKey] = [];
    }
    photosByMonth[monthKey].push({ photo, index, date });
  });

  // Then, decide on clustering strategy per month
  Object.entries(photosByMonth).forEach(([monthKey, monthPhotos]) => {
    const [year, month] = monthKey.split("-").map(Number);

    // Count photos per day in this month
    const photosByDay: Record<
      number,
      Array<{ photo: Photo; index: number }>
    > = {};
    monthPhotos.forEach(({ photo, index, date }) => {
      const day = date.getDate();
      if (!photosByDay[day]) {
        photosByDay[day] = [];
      }
      photosByDay[day].push({ photo, index });
    });

    const uniqueDays = Object.keys(photosByDay).length;
    const avgPhotosPerDay = monthPhotos.length / uniqueDays;

    // If dense (many photos per day), create daily groups
    // If sparse (few photos), create single monthly group
    if (avgPhotosPerDay >= densityThreshold) {
      // Daily grouping
      Object.entries(photosByDay)
        .sort(([dayA], [dayB]) => Number(dayB) - Number(dayA)) // Newest first
        .forEach(([day, dayPhotos]) => {
          const date = new Date(year, month, Number(day));
          groups.push({
            year,
            month,
            day: Number(day),
            label: date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            photos: dayPhotos.sort((a, b) => b.index - a.index), // Newest first within day
          });
        });
    } else {
      // Monthly grouping
      const date = new Date(year, month);
      groups.push({
        year,
        month,
        label: date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        }),
        photos: monthPhotos
          .map(({ photo, index }) => ({ photo, index }))
          .sort((a, b) => b.index - a.index), // Newest first
      });
    }
  });

  return groups.sort((a, b) => {
    // Sort by year DESC, month DESC, day DESC (newest first)
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    if (a.day !== undefined && b.day !== undefined) return b.day - a.day;
    return 0;
  });
}

/**
 * Timeline Component
 */
export const PhotoGridTimeline: React.FC<PhotoGridTimelineProps> = ({
  photos,
  onPhotoClick,
  className,
  densityThreshold = 5,
  showYearHeaders = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const dateGroups = useMemo(
    () => groupPhotosByDate(photos, densityThreshold),
    [photos, densityThreshold]
  );

  /**
   * Handle scroll to update current date indicator
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Show scroll-to-top button after scrolling 500px
      setShowScrollTop(container.scrollTop > 500);

      // Find visible date header
      const headers =
        container.querySelectorAll<HTMLElement>("[data-date-label]");
      let visibleHeader: HTMLElement | null = null;

      headers.forEach((header) => {
        const rect = header.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (rect.top <= containerRect.top + 100) {
          visibleHeader = header;
        }
      });

      if (visibleHeader && "dataset" in visibleHeader) {
        setCurrentDate((visibleHeader as HTMLElement).dataset.dateLabel || "");
      }
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initialize

    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * Scroll to top
   */
  const scrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  /**
   * Scroll to specific date group
   * TODO: Expose this for external date picker integration
   */
  const _scrollToDate = useCallback((groupIndex: number) => {
    const container = containerRef.current;
    if (!container) return;

    const target = container.querySelector(
      `[data-group-index="${groupIndex}"]`
    ) as HTMLElement;

    if (target) {
      container.scrollTo({
        top: target.offsetTop - 80, // Account for header
        behavior: "smooth",
      });
    }
  }, []);

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      switch (e.key) {
        case "PageUp":
          e.preventDefault();
          containerRef.current.scrollBy({
            top: -window.innerHeight,
            behavior: "smooth",
          });
          break;
        case "PageDown":
          e.preventDefault();
          containerRef.current.scrollBy({
            top: window.innerHeight,
            behavior: "smooth",
          });
          break;
        case "Home":
          e.preventDefault();
          scrollToTop();
          break;
        case "End":
          e.preventDefault();
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: "smooth",
          });
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [scrollToTop]);

  return (
    <section
      className={cn("timeline-container", className)}
      aria-label="Photo timeline"
    >
      {/* Floating Date Indicator */}
      <AnimatePresence>
        {currentDate && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="timeline-floating-date"
          >
            <Calendar className="h-4 w-4" />
            <span>{currentDate}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="timeline-scroll-top"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollToTop}
              aria-label="Scroll to top"
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline Content */}
      <div ref={containerRef} className="timeline-scroll">
        {dateGroups.map((group, groupIndex) => {
          const isNewYear =
            groupIndex === 0 || group.year !== dateGroups[groupIndex - 1].year;

          return (
            <div
              key={`${group.year}-${group.month}-${group.day || "month"}`}
              data-group-index={groupIndex}
              className="timeline-group"
            >
              {/* Year Header */}
              {isNewYear && showYearHeaders && (
                <div className="timeline-year">{group.year}</div>
              )}

              {/* Date Header */}
              <div
                className="timeline-date-header"
                data-date-label={group.label}
              >
                <Calendar className="h-5 w-5" />
                <h2>{group.label}</h2>
                <span className="timeline-photo-count">
                  {group.photos.length}{" "}
                  {group.photos.length === 1 ? "photo" : "photos"}
                </span>
              </div>

              {/* Photo Grid */}
              <div className="timeline-photos">
                {group.photos.map(({ photo, index }) => (
                  <motion.button
                    key={photo.path}
                    className="timeline-photo"
                    onClick={() => onPhotoClick?.(photo, index)}
                    whileHover={{ scale: 1.03, zIndex: 10 }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    type="button"
                    aria-label={photo.metadata?.title || `Photo ${index + 1}`}
                  >
                    <img
                      src={photo.thumbnail || photo.path}
                      alt={photo.metadata?.title || `Item ${index + 1}`}
                      className="timeline-image"
                      loading="lazy"
                    />

                    {photo.score && (
                      <div className="timeline-score">
                        {Math.round(photo.score * 100)}%
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {dateGroups.length === 0 && (
          <div className="timeline-empty">
            <Calendar className="h-12 w-12 text-muted-foreground" />
            <p>No photos to display</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default PhotoGridTimeline;
