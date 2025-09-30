import { useCallback, useEffect, useRef, useState } from 'react';

interface MemoryManagerOptions {
  maxMemoryMB?: number;
  cleanupThreshold?: number;
  monitoringInterval?: number;
  enableGarbageCollection?: boolean;
  onMemoryWarning?: (usageMB: number) => void;
  onMemoryCritical?: (usageMB: number) => void;
}

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usageMB: number;
  usagePercent: number;
  isCritical: boolean;
  isWarning: boolean;
}

export function useMemoryManager(options: MemoryManagerOptions = {}) {
  const {
    maxMemoryMB = 300,
    cleanupThreshold = 0.8, // 80% of max
    monitoringInterval = 10000, // 10 seconds
    enableGarbageCollection = true,
    onMemoryWarning,
    onMemoryCritical
  } = options;

  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [cleanupCount, setCleanupCount] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(true);

  const cleanupCallbacks = useRef<Set<() => void>>(new Set());
  const imageCache = useRef<Map<string, any>>(new Map());
  const componentCache = useRef<Map<string, any>>(new Map());

  // Get current memory statistics
  const getMemoryStats = useCallback((): MemoryStats | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedJSHeapSize = memory.usedJSHeapSize;
      const totalJSHeapSize = memory.totalJSHeapSize;
      const jsHeapSizeLimit = memory.jsHeapSizeLimit;
      const usageMB = Math.round(usedJSHeapSize / (1024 * 1024));
      const usagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;
      const isWarning = usageMB > maxMemoryMB * cleanupThreshold;
      const isCritical = usageMB > maxMemoryMB;

      return {
        usedJSHeapSize,
        totalJSHeapSize,
        jsHeapSizeLimit,
        usageMB,
        usagePercent,
        isWarning,
        isCritical
      };
    }
    return null;
  }, [maxMemoryMB, cleanupThreshold]);

  // Update memory statistics
  const updateMemoryStats = useCallback(() => {
    const stats = getMemoryStats();
    setMemoryStats(stats);

    if (stats) {
      // Trigger callbacks based on memory status
      if (stats.isCritical && onMemoryCritical) {
        onMemoryCritical(stats.usageMB);
      } else if (stats.isWarning && onMemoryWarning) {
        onMemoryWarning(stats.usageMB);
      }
    }

    return stats;
  }, [getMemoryStats, onMemoryWarning, onMemoryCritical]);

  // Aggressive cleanup for critical memory situations
  const performAggressiveCleanup = useCallback(() => {
    console.log('🧹 Performing aggressive memory cleanup...');

    // Clear image cache (remove oldest 50%)
    if (imageCache.current.size > 0) {
      const entries = Array.from(imageCache.current.entries());
      const toRemove = Math.floor(entries.length * 0.5);
      for (let i = 0; i < toRemove; i++) {
        imageCache.current.delete(entries[i][0]);
      }
      console.log(`🗑️ Cleared ${toRemove} cached images`);
    }

    // Clear component cache
    if (componentCache.current.size > 0) {
      const size = componentCache.current.size;
      componentCache.current.clear();
      console.log(`🗑️ Cleared ${size} cached components`);
    }

    // Trigger all registered cleanup callbacks
    cleanupCallbacks.current.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in cleanup callback:', error);
      }
    });

    // Request garbage collection if available
    if (enableGarbageCollection && 'gc' in window) {
      try {
        (window as any).gc();
        console.log('🗑️ Manually triggered garbage collection');
      } catch (error) {
        console.log('Garbage collection not available');
      }
    }

    // Force cleanup of event listeners and intervals
    if (typeof window !== 'undefined') {
      // Clear any lingering timers
      const originalSetTimeout = window.setTimeout;
      const originalSetInterval = window.setInterval;

      // This helps clear any memory leaks from timers
      window.setTimeout = function(callback, delay, ...args) {
        const id = originalSetTimeout.call(window, callback, delay, ...args);
        return {
          id,
          unref: () => {},
          ref: () => {}
        } as any;
      };

      window.setInterval = function(callback, delay, ...args) {
        const id = originalSetInterval.call(window, callback, delay, ...args);
        return {
          id,
          unref: () => {},
          ref: () => {}
        } as any;
      };
    }

    setCleanupCount(prev => prev + 1);
  }, [enableGarbageCollection]);

  // Moderate cleanup for warning situations
  const performModerateCleanup = useCallback(() => {
    console.log('🧹 Performing moderate memory cleanup...');

    // Clear oldest 25% of image cache
    if (imageCache.current.size > 100) {
      const entries = Array.from(imageCache.current.entries());
      const toRemove = Math.floor(entries.length * 0.25);
      for (let i = 0; i < toRemove; i++) {
        imageCache.current.delete(entries[i][0]);
      }
      console.log(`🗑️ Cleared ${toRemove} cached images`);
    }

    setCleanupCount(prev => prev + 1);
  }, []);

  // Register cleanup callback
  const registerCleanup = useCallback((callback: () => void) => {
    cleanupCallbacks.current.add(callback);
    return () => {
      cleanupCallbacks.current.delete(callback);
    };
  }, []);

  // Cache management functions
  const cacheImage = useCallback((key: string, data: any) => {
    if (memoryStats?.isCritical) return false;

    const stats = getMemoryStats();
    if (stats && stats.isCritical) {
      performAggressiveCleanup();
      return false;
    }

    imageCache.current.set(key, data);
    return true;
  }, [memoryStats, getMemoryStats, performAggressiveCleanup]);

  const getCachedImage = useCallback((key: string) => {
    return imageCache.current.get(key);
  }, []);

  const cacheComponent = useCallback((key: string, data: any) => {
    if (memoryStats?.isCritical) return false;

    componentCache.current.set(key, data);
    return true;
  }, [memoryStats]);

  const getCachedComponent = useCallback((key: string) => {
    return componentCache.current.get(key);
  }, []);

  // Effect for memory monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const stats = updateMemoryStats();

      if (stats) {
        if (stats.isCritical) {
          performAggressiveCleanup();
        } else if (stats.isWarning) {
          performModerateCleanup();
        }
      }
    }, monitoringInterval);

    return () => clearInterval(interval);
  }, [isMonitoring, monitoringInterval, updateMemoryStats, performAggressiveCleanup, performModerateCleanup]);

  // Effect for memory pressure events
  useEffect(() => {
    const handleMemoryPressure = (event: any) => {
      console.log('💾 Memory pressure event:', event);
      performAggressiveCleanup();
    };

    if ('memory' in performance && 'addEventListener' in window) {
      window.addEventListener('memorypressure', handleMemoryPressure);
    }

    return () => {
      if ('removeEventListener' in window) {
        window.removeEventListener('memorypressure', handleMemoryPressure);
      }
    };
  }, [performAggressiveCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      performAggressiveCleanup();
    };
  }, [performAggressiveCleanup]);

  return {
    memoryStats,
    cleanupCount,
    isMonitoring,
    registerCleanup,
    cacheImage,
    getCachedImage,
    cacheComponent,
    getCachedComponent,
    performAggressiveCleanup,
    performModerateCleanup,
    updateMemoryStats,
    setIsMonitoring,
    // Cache statistics
    imageCacheSize: imageCache.current.size,
    componentCacheSize: componentCache.current.size,
    // Utility functions
    formatMemoryBytes: (bytes: number) => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },
    getCacheInfo: () => ({
      images: imageCache.current.size,
      components: componentCache.current.size,
      totalCallbacks: cleanupCallbacks.current.size,
      cleanupOperations: cleanupCount
    })
  };
}

// Hook for optimizing component rendering with memory management
export function useOptimizedRendering<T>(
  items: T[],
  options: {
    keyGenerator?: (item: T) => string;
    cacheKey?: string;
    enabled?: boolean;
  } = {}
) {
  const { keyGenerator = (item: T, index: number) => index.toString(), cacheKey, enabled = true } = options;
  const memoryManager = useMemoryManager();

  const [renderedItems, setRenderedItems] = useState<Set<string>>(new Set());
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

  // Cache rendered items
  const cacheRenderedItem = useCallback((key: string, item: T) => {
    if (!enabled) return false;

    return memoryManager.cacheComponent(`${cacheKey}_${key}`, {
      item,
      timestamp: Date.now()
    });
  }, [memoryManager, cacheKey, enabled]);

  const getCachedRenderedItem = useCallback((key: string) => {
    if (!enabled) return null;

    const cached = memoryManager.getCachedComponent(`${cacheKey}_${key}`);
    return cached?.item || null;
  }, [memoryManager, cacheKey, enabled]);

  // Track visible items for optimization
  const markItemVisible = useCallback((key: string) => {
    setVisibleItems(prev => new Set(prev).add(key));
  }, []);

  const markItemHidden = useCallback((key: string) => {
    setVisibleItems(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // Cleanup invisible items periodically
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const invisibleItems = new Set(renderedItems);
      visibleItems.forEach(item => invisibleItems.delete(item));

      if (invisibleItems.size > 50) { // Cleanup if more than 50 invisible items
        invisibleItems.forEach(item => {
          memoryManager.cacheComponent.delete(`${cacheKey}_${item}`);
        });
        setRenderedItems(prev => {
          const next = new Set(prev);
          invisibleItems.forEach(item => next.delete(item));
          return next;
        });
        console.log(`🧹 Cleaned up ${invisibleItems.size} invisible items`);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [enabled, renderedItems, visibleItems, cacheKey, memoryManager]);

  return {
    cacheRenderedItem,
    getCachedRenderedItem,
    markItemVisible,
    markItemHidden,
    visibleItems: Array.from(visibleItems),
    cacheInfo: memoryManager.getCacheInfo()
  };
}