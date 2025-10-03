/**
 * Virtualized photo grid component for fast rendering of large photo collections
 * Uses react-window for efficient rendering of thumbnails
 */

import { memo, useCallback, useMemo } from "react";
import type { CellComponentProps } from "react-window";
import { Grid } from "react-window";
import { useOfflineFirstMetadata } from "../hooks/useOfflineFirst";
import type { PhotoMeta } from "../models/PhotoMeta";
import { Badge, Card, CardContent, NoPhotosEmpty, Skeleton } from "./ui";

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
  showSelection?: boolean;
  className?: string;
}

type GridCellContext = {
  photos: PhotoItem[];
  columns: number;
  onPhotoClick?: (photo: PhotoItem) => void;
  onPhotoSelect?: (photo: PhotoItem) => void;
  selectedPhotos?: Set<string>;
  thumbnailSize: number;
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
  thumbnailSize,
}: CellComponentProps<GridCellContext>) {
  const index = rowIndex * columns + columnIndex;
  const photo = photos[index];

  // Get metadata for this photo (offline-first) - must be called unconditionally
  const { metadata } = useOfflineFirstMetadata(photo?.path || "");

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
    return <div className="p-1 box-border" style={{ ...style }} />;
  }

  // Determine if photo is selected
  const isSelected = selectedPhotos?.has(photo.path) || false;

  return (
    <div className="p-1 box-border" style={{ ...style }}>
      <Card
        className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick();
          }
        }}
        tabIndex={0}
      >
        {/* Thumbnail image */}
        <div
          className="relative bg-muted"
          style={{ height: thumbnailSize - 40 }}
        >
          <img
            src={photo.thumbnail || `file://${photo.path}`}
            alt={photo.path.split("/").pop() || photo.path.split("\\").pop()}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to file URL if thumbnail fails, or show placeholder
              const img = e.target as HTMLImageElement;
              if (img.src !== `file://${photo.path}` && !photo.thumbnail) {
                img.src = `file://${photo.path}`;
              } else {
                // Show a placeholder if no thumbnail available
                img.style.display = "none";
                const parent = img.parentElement;
                if (parent) {
                  parent.innerHTML = `
										<div class="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
											<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
											</svg>
										</div>
									`;
                }
              }
            }}
          />

          {/* Loading skeleton */}
          {!metadata && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Skeleton className="w-5 h-5 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Photo info */}
        <CardContent className="p-2 h-10 overflow-hidden">
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
        </CardContent>

        {/* Selection indicator */}
        {isSelected && (
          <Badge className="absolute top-2 right-2 w-5 h-5 p-0 flex items-center justify-center text-xs">
            ✓
          </Badge>
        )}
      </Card>
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
  showSelection,
  className,
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
