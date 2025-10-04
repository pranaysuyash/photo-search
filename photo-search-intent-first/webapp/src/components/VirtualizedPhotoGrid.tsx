/**
 * Virtualized photo grid component for fast rendering of large photo collections
 * Uses react-window for efficient rendering of thumbnails
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CellComponentProps } from "react-window";
import { Grid } from "react-window";
import { useOfflineFirstMetadata } from "../hooks/useOfflineFirst";
import type { PhotoMeta } from "../models/PhotoMeta";
import { Badge, NoPhotosEmpty, Skeleton } from "./ui";
import { resolveThumbUrl } from "../services/ThumbnailResolver";
import { ImageOff } from "lucide-react";

// Types
interface PhotoItem {
  path: string;
  id: string;
  metadata?: PhotoMeta;
  thumbnail?: string;
}

interface VirtualizedPhotoGridProps {
  photos: PhotoItem[];
  thumbnailSize?: number;
  columns?: number;
  gap?: number;
  selectedPhotos?: Set<string>;
  onPhotoClick?: (photo: PhotoItem) => void;
  onPhotoSelect?: (photo: PhotoItem) => void;
}

type GridCellContext = {
  photos: PhotoItem[];
  columns: number;
  onPhotoClick?: (photo: PhotoItem) => void;
  onPhotoSelect?: (photo: PhotoItem) => void;
  selectedPhotos?: Set<string>;
  gap: number;
};

// Photo grid cell component
const PhotoGridCell = memo(function PhotoGridCell({
  columnIndex,
  rowIndex,
  style,
  photos,
  columns,
  onPhotoClick,
  onPhotoSelect,
  selectedPhotos,
}: CellComponentProps<GridCellContext>) {
  const index = rowIndex * columns + columnIndex;
  const photo = photos[index];

  // Get metadata for this photo (offline-first) - must be called unconditionally
  const { metadata } = useOfflineFirstMetadata(photo?.path || "");
  const [thumbSrc, setThumbSrc] = useState<string | undefined>(photo?.thumbnail);
  const objectUrlRef = useRef<string | null>(null);

  // Handle photo click - must be called unconditionally
  const handleClick = useCallback(() => {
    if (photo) {
      onPhotoClick?.(photo);
    }
  }, [onPhotoClick, photo]);

  // Handle photo double click - must be called unconditionally
  const handleDoubleClick = useCallback(() => {
    if (photo) {
      onPhotoSelect?.(photo);
    }
  }, [onPhotoSelect, photo]);

  // Format file size for display - must be called unconditionally
  const formatFileSize = useCallback((size: number | undefined) => {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024)
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }, []);

  // Get photo dimensions from metadata - must be called unconditionally
  const dimensions = useMemo(() => {
    if (metadata?.width && metadata?.height) {
      return `${metadata.width}×${metadata.height}`;
    }
    return "";
  }, [metadata?.width, metadata?.height]);

  // Get file size from metadata - must be called unconditionally
  const fileSize = useMemo(() => {
    return formatFileSize(metadata?.size_bytes);
  }, [metadata?.size_bytes, formatFileSize]);

  // Early return if no photo at this index
  if (!photo) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return <div className="p-1 box-border" style={{ ...style }} />;
  }

  // Determine if photo is selected
  const isSelected = selectedPhotos?.has(photo.path) || false;

  useEffect(() => {
    if (!photo) {
      return;
    }

    let cancelled = false;

    const inlineThumb = photo.thumbnail;
    if (inlineThumb) {
      setThumbSrc(inlineThumb);
      return () => {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
      };
    }

    async function loadThumb() {
      try {
        const url = await resolveThumbUrl({ path: photo.path, thumbnail: photo.thumbnail });
        if (cancelled) {
          if (url?.startsWith("blob:")) {
            URL.revokeObjectURL(url);
          }
          return;
        }

        if (objectUrlRef.current && objectUrlRef.current !== url) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }

        if (url?.startsWith("blob:")) {
          objectUrlRef.current = url;
        }

        setThumbSrc(url);
      } catch (error) {
        console.warn("[VirtualizedPhotoGrid] Failed to resolve thumbnail", error);
        if (!cancelled) {
          setThumbSrc(undefined);
        }
      }
    }

    setThumbSrc(undefined);
    loadThumb();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [photo]);

  return (
    <div className="p-1 box-border" style={{ ...style }}>
      <figure
        className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer border rounded-lg bg-card ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick();
          }
        }}
      >
        {/* Thumbnail image */}
        <div
          className="relative bg-muted h-36"
        >
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt={photo.path.split("/").pop() || photo.path.split("\\").pop()}
              className="w-full h-full object-cover"
              onError={() => setThumbSrc(undefined)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
              <ImageOff className="h-6 w-6" aria-hidden="true" />
              <span className="text-xs font-medium">No preview</span>
            </div>
          )}

          {/* Loading skeleton */}
          {!metadata && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Skeleton className="w-5 h-5 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Photo info */}
        <figcaption className="p-2 h-10 overflow-hidden">
          <div className="space-y-1">
            <div
              className="font-semibold text-xs truncate"
              title={
                photo.path.split("/").pop() || photo.path.split("\\").pop()
              }
            >
              {photo.path.split("/").pop() || photo.path.split("\\").pop()}
            </div>

            <div className="flex justify-between text-xs text-muted-foreground truncate">
              <span title={dimensions}>{dimensions}</span>
              <span title={fileSize}>{fileSize}</span>
            </div>
          </div>
        </figcaption>

        {/* Selection indicator */}
        {isSelected && (
          <Badge className="absolute top-2 right-2 w-5 h-5 p-0 flex items-center justify-center text-xs">
            ✓
          </Badge>
        )}
      </figure>
    </div>
  );
});

// Virtualized photo grid component
export function VirtualizedPhotoGrid({
  photos,
  thumbnailSize = 200,
  columns = 4,
  gap = 8,
  selectedPhotos,
  onPhotoClick,
  onPhotoSelect,
}: VirtualizedPhotoGridProps) {
  const rows = useMemo(() => {
    return Math.ceil(photos.length / columns);
  }, [photos.length, columns]);

  // Memoize grid data
  const cellProps = useMemo<GridCellContext>(
    () => ({
      photos,
      columns,
      onPhotoClick,
      onPhotoSelect,
      selectedPhotos,
      thumbnailSize,
      gap,
    }),
    [
      photos,
      columns,
      onPhotoClick,
      onPhotoSelect,
      selectedPhotos,
      thumbnailSize,
      gap,
    ]
  );

  // Render empty state
  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <NoPhotosEmpty />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <Grid
        columnCount={columns}
        columnWidth={thumbnailSize + gap}
        rowCount={rows}
        rowHeight={thumbnailSize + gap}
        overscanCount={2}
        cellComponent={PhotoGridCell}
        cellProps={cellProps}
        className="w-full h-full"
      />
    </div>
  );
}

// Export memoized version for performance
export const MemoizedVirtualizedPhotoGrid = memo(VirtualizedPhotoGrid);
