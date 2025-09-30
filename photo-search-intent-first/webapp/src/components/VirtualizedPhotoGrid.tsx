import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useInfiniteLibraryScroll, usePredictivePreloading } from '../hooks/useInfiniteLibraryScroll';
import { LazyImage } from './LazyImage';
import { Card } from './ui/card';
import { Button } from './ui/shadcn/Button';
import { Badge } from './ui/badge';
import { usePerformanceMonitor } from '../services/PerformanceMonitor';

interface VirtualizedPhotoGridProps {
  dir: string;
  engine: string;
  onItemClick?: (path: string) => void;
  className?: string;
  imageQuality?: 'low' | 'medium' | 'high';
  showMetrics?: boolean;
}

interface GridItemData {
  items: string[];
  onItemClick?: (path: string) => void;
  imageQuality: string;
  isPreloaded: (item: string) => boolean;
}

const GridItem: React.FC<{
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: GridItemData;
}> = ({ columnIndex, rowIndex, style, data }) => {
  const { items, onItemClick, imageQuality, isPreloaded } = data;
  const index = rowIndex * Math.floor(window.innerWidth / 200) + columnIndex; // Approximate columns
  const item = items[index];

  if (!item) {
    return (
      <div style={style} className="flex items-center justify-center bg-gray-100 rounded">
        <div className="text-gray-400 text-sm">Empty</div>
      </div>
    );
  }

  const fileName = item.split('/').pop() || 'Unknown';
  const preloaded = isPreloaded(item);

  return (
    <div style={style} className="p-1">
      <Card
        className={`relative group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg ${
          preloaded ? 'ring-2 ring-blue-200' : ''
        }`}
        onClick={() => onItemClick?.(item)}
      >
        <div className="aspect-square relative">
          <LazyImage
            src={item}
            alt={fileName}
            className="w-full h-full object-cover"
            placeholder={
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
                <div className="text-gray-400 text-xs text-center px-2">
                  {fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName}
                </div>
              </div>
            }
            quality={imageQuality}
            loading="lazy"
          />

          {/* Overlay with file info */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-end">
            <div className="p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="text-xs truncate">{fileName}</div>
              {preloaded && (
                <Badge variant="secondary" className="text-xs mt-1">
                  Preloaded
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export function VirtualizedPhotoGrid({
  dir,
  engine,
  onItemClick,
  className = '',
  imageQuality = 'medium',
  showMetrics = false
}: VirtualizedPhotoGridProps) {
  const [currentScrollIndex, setCurrentScrollIndex] = useState(0);
  const gridRef = useRef<any>(null);
  const performanceMonitor = usePerformanceMonitor();

  // Use infinite scroll hook
  const {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    totalItems,
    loadedItems,
    memoryUsage
  } = useInfiniteLibraryScroll(dir, engine, {
    initialBatchSize: 500,
    batchSize: 1000,
    threshold: 500,
    maxMemoryMB: 300,
    enablePreload: true
  });

  // Use predictive preloading
  const { isPreloaded } = usePredictivePreloading(items, currentScrollIndex, 10);

  // Calculate grid dimensions
  const getGridDimensions = useCallback((width: number) => {
    const minItemWidth = 180;
    const gap = 8;
    const columns = Math.max(1, Math.floor((width - gap) / (minItemWidth + gap)));
    const itemWidth = (width - gap * (columns + 1)) / columns;
    const itemHeight = itemWidth; // Square items

    return {
      columns,
      itemWidth: itemWidth + gap,
      itemHeight: itemHeight + gap,
      rowHeight: itemHeight + gap
    };
  }, []);

  // Handle scroll events for predictive preloading
  const handleScroll = useCallback(({ scrollTop }: { scrollTop: number }) => {
    if (gridRef.current) {
      const { itemHeight } = getGridDimensions(window.innerWidth);
      const newIndex = Math.floor(scrollTop / itemHeight);
      setCurrentScrollIndex(newIndex);
    }
  }, [getGridDimensions]);

  // Track performance metrics
  useEffect(() => {
    const renderStart = performance.now();

    // Update performance metrics
    performanceMonitor.updateLibraryMetrics({
      totalItems,
      loadedItems,
      virtualizationEnabled: true,
      visibleItems: Math.min(items.length, 100), // Approximate visible items
      totalRenderedItems: items.length
    });

    // Record grid render time
    const renderEnd = performance.now();
    performanceMonitor.recordGridRenderTime(renderEnd - renderStart);
  }, [items.length, totalItems, loadedItems, performanceMonitor]);

  // Memoize grid item data
  const gridItemData = useMemo<GridItemData>(() => ({
    items,
    onItemClick,
    imageQuality,
    isPreloaded
  }), [items, onItemClick, imageQuality, isPreloaded]);

  // Calculate total rows needed
  const getTotalRows = useCallback((width: number) => {
    const { columns } = getGridDimensions(width);
    return Math.ceil(items.length / columns);
  }, [items.length, getGridDimensions]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    if (!showMetrics) return null;

    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border z-50">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total Items:</span>
            <span className="font-mono">{totalItems.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Loaded:</span>
            <span className="font-mono">{loadedItems.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Memory:</span>
            <span className={`font-mono ${memoryUsage > 250 ? 'text-red-600' : 'text-green-600'}`}>
              {memoryUsage}MB
            </span>
          </div>
          <div className="flex justify-between">
            <span>Loading:</span>
            <span className="font-mono">{loading ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    );
  }, [showMetrics, totalItems, loadedItems, memoryUsage, loading]);

  // Sentinel element for infinite scroll
  const Sentinel = () => (
    <div
      ref={(el) => {
        if (el && hasMore && !loading) {
          // This element will be observed by the intersection observer
          el.setAttribute('data-sentinel', 'true');
        }
      }}
      className="flex justify-center items-center py-8"
    >
      {loading && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading more photos...</p>
        </div>
      )}
      {error && (
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading photos</p>
          <Button onClick={loadMore} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <div className="text-center text-gray-500">
          <p>All photos loaded</p>
          <p className="text-sm">Showing {items.length} of {totalItems} photos</p>
        </div>
      )}
    </div>
  );

  if (error && items.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Library</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={reset} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {showMetrics && performanceMetrics}

      {items.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Photos Found</h3>
            <p className="text-gray-600">Check your directory and try again.</p>
          </div>
        </div>
      ) : (
        <div className="h-full">
          <AutoSizer>
            {({ width, height }) => {
              const { columns, itemWidth, rowHeight } = getGridDimensions(width);
              const totalRows = getTotalRows(width);

              return (
                <div className="relative" style={{ height }}>
                  <Grid
                    ref={gridRef}
                    columnCount={columns}
                    columnWidth={itemWidth}
                    height={height - 100} // Leave space for sentinel
                    rowCount={totalRows}
                    rowHeight={rowHeight}
                    itemData={gridItemData}
                    onScroll={handleScroll}
                  >
                    {GridItem}
                  </Grid>

                  {/* Sentinel for infinite scroll */}
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{ height: 100 }}
                  >
                    <Sentinel />
                  </div>
                </div>
              );
            }}
          </AutoSizer>
        </div>
      )}
    </div>
  );
}