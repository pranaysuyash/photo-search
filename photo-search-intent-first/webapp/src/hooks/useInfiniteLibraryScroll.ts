import { useCallback, useEffect, useRef, useState } from 'react';
import { apiLibrary } from '../api';

interface InfiniteScrollOptions {
  initialBatchSize?: number;
  batchSize?: number;
  threshold?: number;
  maxMemoryMB?: number;
  enablePreload?: boolean;
}

interface InfiniteScrollResult {
  items: string[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  reset: () => void;
  totalItems: number;
  loadedItems: number;
  memoryUsage: number;
}

export function useInfiniteLibraryScroll(
  dir: string,
  engine: string,
  options: InfiniteScrollOptions = {}
): InfiniteScrollResult {
  const {
    initialBatchSize = 500,
    batchSize = 1000,
    threshold = 200,
    maxMemoryMB = 300,
    enablePreload = true
  } = options;

  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loadedItems, setLoadedItems] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);

  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Memory management
  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      setMemoryUsage(Math.round(usedMB));
      return usedMB;
    }
    return 0;
  }, []);

  const cleanupMemory = useCallback(() => {
    const usedMB = checkMemoryUsage();
    if (usedMB > maxMemoryMB) {
      // Remove oldest items to free memory
      const itemsToRemove = Math.floor(items.length * 0.3); // Remove 30%
      setItems(prev => prev.slice(itemsToRemove));
      console.log(`Memory cleanup: removed ${itemsToRemove} items to reduce memory usage`);
    }
  }, [items, maxMemoryMB, checkMemoryUsage]);

  const loadBatch = useCallback(async (loadOffset: number, append: boolean = false) => {
    if (loadingRef.current || !dir || !engine || !hasMore) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await apiLibrary(dir, engine, batchSize, loadOffset, {
        // Include any necessary API options
      });

      const newItems = response.paths || [];
      const total = typeof response.total === 'number' ? response.total : Infinity;
      const newHasMore = newItems.length === batchSize && loadOffset + newItems.length < total;

      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }

      setTotalItems(total);
      setLoadedItems(loadOffset + newItems.length);
      setHasMore(newHasMore);
      setOffset(loadOffset + newItems.length);

      // Check memory usage after loading
      checkMemoryUsage();

    } catch (err) {
      console.error('Error loading library batch:', err);
      setError(err instanceof Error ? err.message : 'Failed to load library');
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [dir, engine, batchSize, hasMore, checkMemoryUsage]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loadingRef.current) {
          loadBatch(offset, true);
        }
      },
      {
        rootMargin: `${threshold}px`,
        threshold: 0.1
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [offset, hasMore, loading, loadBatch, threshold]);

  // Initial load
  useEffect(() => {
    if (dir && engine && items.length === 0) {
      loadBatch(0, false);
    }
  }, [dir, engine, items.length, loadBatch]);

  // Memory cleanup interval
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupMemory();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [cleanupMemory]);

  // Manual load more function
  const loadMore = useCallback(async () => {
    await loadBatch(offset, true);
  }, [offset, loadBatch]);

  // Reset function
  const reset = useCallback(() => {
    setItems([]);
    setLoading(false);
    setHasMore(true);
    setError(null);
    setOffset(0);
    setTotalItems(0);
    setLoadedItems(0);
    loadingRef.current = false;
  }, []);

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    totalItems,
    loadedItems,
    memoryUsage
  };
}

// Hook for preloading nearby items based on scroll position
export function usePredictivePreloading(
  items: string[],
  currentIndex: number,
  preloadRadius: number = 5
) {
  const [preloadedItems, setPreloadedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (items.length === 0) return;

    const startIndex = Math.max(0, currentIndex - preloadRadius);
    const endIndex = Math.min(items.length - 1, currentIndex + preloadRadius);

    const itemsToPreload = items.slice(startIndex, endIndex + 1);
    const newPreloadedItems = new Set(itemsToPreload);

    setPreloadedItems(newPreloadedItems);

    // Here you would implement actual preloading logic
    // For example, prefetching thumbnails for nearby items
    itemsToPreload.forEach(item => {
      // Prefetch thumbnail logic would go here
      console.log(`Preloading: ${item}`);
    });

  }, [items, currentIndex, preloadRadius]);

  return { preloadedItems, isPreloaded: (item: string) => preloadedItems.has(item) };
}