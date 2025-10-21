/**
 * PhotoGridFilmStrip.tsx
 *
 * INTENT: Create a horizontal film strip layout with momentum scrolling
 * inspired by classic film negatives. Perfect for browsing chronological
 * photo sequences or search results in a linear, story-telling format.
 *
 * DESIGN PHILOSOPHY:
 * - Cinematic Feel: Film negative aesthetic with sprocket holes
 * - Momentum Scrolling: Touch/mouse drag with inertia
 * - Date Separators: Visual breaks between days/months
 * - Quick Browse: Horizontal timeline for rapid scanning
 * - Touch-First: Optimized for swipe gestures on mobile/tablet
 *
 * FEATURES:
 * - Horizontal scroll with smooth momentum (like iOS photos)
 * - Date separators with glassmorphism labels
 * - Snap-to-item for precise positioning
 * - Keyboard navigation (left/right arrows, home/end)
 * - Auto-scroll to selected item
 * - Touch/mouse drag support
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import "./PhotoGridFilmStrip.css";

interface Photo {
  path: string;
  thumbnail?: string;
  isVideo?: boolean;
  isImage?: boolean;
  metadata?: {
    timestamp?: number;
    title?: string;
  };
  score?: number;
}

interface PhotoGridFilmStripProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo, index: number) => void;
  className?: string;
  /** Show date separators */
  showDates?: boolean;
  /** Height of film strip in pixels */
  height?: number;
  /** Initially selected photo index */
  initialIndex?: number;
}

/**
 * Group photos by date for separators
 */
function groupPhotosByDate(
  photos: Photo[]
): Array<{ date: string; photos: Photo[]; startIndex: number }> {
  const groups: Array<{ date: string; photos: Photo[]; startIndex: number }> =
    [];
  let currentDate = "";
  let currentGroup: Photo[] = [];
  let startIndex = 0;

  photos.forEach((photo, index) => {
    const timestamp = photo.metadata?.timestamp || 0;
    const date = new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (date !== currentDate) {
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate, photos: currentGroup, startIndex });
      }
      currentDate = date;
      currentGroup = [photo];
      startIndex = index;
    } else {
      currentGroup.push(photo);
    }
  });

  if (currentGroup.length > 0) {
    groups.push({ date: currentDate, photos: currentGroup, startIndex });
  }

  return groups;
}

/**
 * Film Strip Component
 */
export const PhotoGridFilmStrip: React.FC<PhotoGridFilmStripProps> = ({
  photos,
  onPhotoClick,
  className,
  showDates = true,
  height = 200,
  initialIndex = 0,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);

  const photoGroups = showDates
    ? groupPhotosByDate(photos)
    : [{ date: "", photos, startIndex: 0 }];

  /**
   * Scroll to specific photo with smooth animation
   */
  const scrollToPhoto = useCallback((index: number) => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const item = container.querySelector(
      `[data-photo-index="${index}"]`
    ) as HTMLElement;

    if (item) {
      const containerRect = container.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const scrollLeft =
        item.offsetLeft - containerRect.width / 2 + itemRect.width / 2;

      container.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });
    }

    setSelectedIndex(index);
  }, []);

  /**
   * Handle photo selection
   */
  const handlePhotoClick = useCallback(
    (photo: Photo, index: number) => {
      scrollToPhoto(index);
      onPhotoClick?.(photo, index);
    },
    [scrollToPhoto, onPhotoClick]
  );

  /**
   * Navigate with arrow buttons
   */
  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      const newIndex =
        direction === "prev"
          ? Math.max(0, selectedIndex - 1)
          : Math.min(photos.length - 1, selectedIndex + 1);

      scrollToPhoto(newIndex);
      onPhotoClick?.(photos[newIndex], newIndex);
    },
    [selectedIndex, photos, scrollToPhoto, onPhotoClick]
  );

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handleNavigate("prev");
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNavigate("next");
          break;
        case "Home":
          e.preventDefault();
          scrollToPhoto(0);
          break;
        case "End":
          e.preventDefault();
          scrollToPhoto(photos.length - 1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleNavigate, scrollToPhoto, photos.length]);

  /**
   * Auto-scroll to initial index
   */
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < photos.length) {
      // Delay to allow DOM to render
      setTimeout(() => scrollToPhoto(initialIndex), 100);
    }
  }, [initialIndex, photos.length, scrollToPhoto]);

  return (
    <section
      className={cn("film-strip-container", className)}
      data-height={height}
      aria-label="Photo film strip"
    >
      {/* Navigation Buttons */}
      <Button
        variant="ghost"
        size="icon"
        className="film-strip-nav film-strip-nav-left"
        onClick={() => handleNavigate("prev")}
        disabled={selectedIndex === 0}
        aria-label="Previous photo"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="film-strip-nav film-strip-nav-right"
        onClick={() => handleNavigate("next")}
        disabled={selectedIndex === photos.length - 1}
        aria-label="Next photo"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Film Strip Scroll Container */}
      <div
        ref={scrollRef}
        className="film-strip-scroll"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
      >
        <div className="film-strip-track">
          {/* Sprocket Holes (decorative) */}
          <div className="film-strip-sprockets" aria-hidden="true">
            {Array.from({ length: Math.ceil(photos.length / 4) }).map(
              (_, i) => (
                <div key={`sprocket-top-${i}`} className="sprocket-hole" />
              )
            )}
          </div>

          {/* Photo Groups with Date Separators */}
          {photoGroups.map((group, groupIndex) => (
            <div
              key={`group-${group.date || groupIndex}`}
              className="film-strip-group"
            >
              {/* Date Separator */}
              {showDates && group.date && (
                <div className="film-strip-date">
                  <Calendar className="h-4 w-4" />
                  <span>{group.date}</span>
                </div>
              )}

              {/* Photos in Group */}
              <div className="film-strip-photos">
                {group.photos.map((photo, photoIndex) => {
                  const absoluteIndex = group.startIndex + photoIndex;
                  const isSelected = absoluteIndex === selectedIndex;

                  return (
                    <motion.button
                      key={photo.path}
                      data-photo-index={absoluteIndex}
                      className={cn(
                        "film-strip-item",
                        isSelected && "film-strip-item-selected",
                        isDragging && "film-strip-item-dragging"
                      )}
                      onClick={() => handlePhotoClick(photo, absoluteIndex)}
                      whileHover={{ scale: 1.05, zIndex: 10 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      aria-label={`Photo ${absoluteIndex + 1}`}
                    >
                      {/* Film Frame */}
                      <div className="film-frame">
                        <img
                          src={photo.thumbnail || photo.path}
                          alt={
                            photo.metadata?.title || `Item ${absoluteIndex + 1}`
                          }
                          className="film-image"
                          loading="lazy"
                        />

                        {/* Score Badge */}
                        {photo.score && (
                          <div className="film-score">
                            {Math.round(photo.score * 100)}%
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Bottom Sprockets */}
          <div
            className="film-strip-sprockets film-strip-sprockets-bottom"
            aria-hidden="true"
          >
            {Array.from({ length: Math.ceil(photos.length / 4) }).map(
              (_, i) => (
                <div key={`sprocket-bottom-${i}`} className="sprocket-hole" />
              )
            )}
          </div>
        </div>
      </div>

      {/* Photo Counter */}
      <div className="film-strip-counter">
        {selectedIndex + 1} / {photos.length}
      </div>
    </section>
  );
};

export default PhotoGridFilmStrip;
