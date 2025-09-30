# Developer API: Performance Components and Hooks

## Overview

This document provides comprehensive API documentation for the performance optimization components and hooks introduced in Phase 2. These tools are designed to help developers build efficient, scalable applications for large photo collections.

## Core Hooks

### 1. useInfiniteLibraryScroll

**File**: `webapp/src/hooks/useInfiniteLibraryScroll.ts`

**Purpose**: Manages infinite scroll behavior with memory management for large photo collections.

#### Type Definitions

```typescript
interface InfiniteScrollOptions {
  initialBatchSize?: number;     // Initial batch size (default: 500)
  batchSize?: number;            // Subsequent batch size (default: 1000)
  threshold?: number;            // Scroll threshold for loading (default: 500)
  maxMemoryMB?: number;          // Memory limit in MB (default: 300)
  enablePreload?: boolean;       // Enable predictive preloading (default: true)
  preloadDistance?: number;      // Items to preload ahead (default: 10)
  enableMemoryManagement?: boolean; // Enable memory cleanup (default: true)
  onError?: (error: string) => void; // Error callback
  onLoadComplete?: () => void;  // Loading complete callback
}

interface InfiniteScrollResult {
  items: string[];              // Currently loaded items
  loading: boolean;             // Loading state
  hasMore: boolean;             // Whether more items available
  error: string | null;         // Error message if any
  loadMore: () => Promise<void>; // Function to load more items
  reset: () => void;           // Reset to initial state
  totalItems: number;          // Total items in collection
  loadedItems: number;         // Number of items loaded
  memoryUsage: number;         // Current memory usage in MB
  loadingProgress: number;      // Loading progress (0-1)
  isPreloading: boolean;       // Currently preloading
  preloadQueue: string[];      // Items in preload queue
}
```

#### Usage

```typescript
import { useInfiniteLibraryScroll } from '../hooks/useInfiniteLibraryScroll';

function MyComponent() {
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
  } = useInfiniteLibraryScroll('/path/to/photos', 'local', {
    initialBatchSize: 500,
    batchSize: 1000,
    threshold: 500,
    maxMemoryMB: 300,
    enablePreload: true,
    preloadDistance: 10,
    onError: (error) => console.error('Load error:', error),
    onLoadComplete: () => console.log('Loading complete')
  });

  return (
    <div>
      <div>Total: {totalItems}, Loaded: {loadedItems}</div>
      <div>Memory: {memoryUsage}MB</div>

      {items.map(item => (
        <img key={item} src={item} alt="photo" />
      ))}

      {loading && <div>Loading...</div>}
      {hasMore && !loading && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

#### Advanced Usage

```typescript
// Custom configuration for very large collections
const config = {
  initialBatchSize: 300,      // Smaller initial batch for faster load
  batchSize: 800,             // Moderate batch size
  maxMemoryMB: 200,           // Conservative memory limit
  enablePreload: true,        // Keep preloading for smooth UX
  preloadDistance: 5          // Reduce preload distance
};

const scrollResult = useInfiniteLibraryScroll(dir, engine, config);

// Manual memory management
useEffect(() => {
  if (scrollResult.memoryUsage > 180) {
    // Trigger cleanup when approaching limit
    scrollResult.cleanup();
  }
}, [scrollResult.memoryUsage]);
```

#### Events and Callbacks

```typescript
// Error handling
const handleError = (error: string) => {
  console.error('Loading error:', error);
  // Show user-friendly error message
  setErrorToast(error);
};

// Load completion
const handleLoadComplete = () => {
  console.log('All photos loaded');
  // Perform post-load actions
  setLoadedState(true);
};

// Usage with callbacks
const result = useInfiniteLibraryScroll(dir, engine, {
  onError: handleError,
  onLoadComplete: handleLoadComplete
});
```

### 2. useMemoryManager

**File**: `webapp/src/hooks/useMemoryManager.ts`

**Purpose**: Comprehensive memory management system for large applications.

#### Type Definitions

```typescript
interface MemoryManagerOptions {
  maxMemoryMB?: number;                    // Memory limit in MB (default: 300)
  cleanupThreshold?: number;               // Cleanup threshold 0-1 (default: 0.8)
  monitoringInterval?: number;            // Monitoring interval in ms (default: 10000)
  enableGarbageCollection?: boolean;       // Enable GC triggering (default: true)
  aggressiveCleanup?: boolean;            // Aggressive cleanup mode (default: false)
  onMemoryWarning?: (usageMB: number) => void;   // Memory warning callback
  onMemoryCritical?: (usageMB: number) => void;  // Critical memory callback
  onCleanup?: (cleanedItems: number) => void;    // Cleanup completion callback
}

interface MemoryStats {
  usedJSHeapSize: number;        // Used heap size in bytes
  totalJSHeapSize: number;       // Total heap size in bytes
  jsHeapSizeLimit: number;      // Heap size limit in bytes
  usageMB: number;               // Usage in MB
  usagePercent: number;          // Usage percentage
  availableMB: number;          // Available memory in MB
  pressure: 'low' | 'medium' | 'high'; // Memory pressure level
}

interface MemoryManagerResult {
  memoryStats: MemoryStats | null;    // Current memory statistics
  cleanupCount: number;               // Number of cleanups performed
  isMonitoring: boolean;              // Monitoring state
  updateMemoryStats: () => void;       // Force memory stats update
  cacheImage: (key: string, data: any, size?: number) => boolean; // Cache image
  getCachedImage: (key: string) => any;  // Get cached image
  clearCache: () => void;             // Clear all cached items
  registerCleanup: (callback: () => void) => () => void; // Register cleanup callback
  unregisterCleanup: (callback: () => void) => void; // Unregister cleanup callback
  forceCleanup: () => number;         // Force cleanup, return items cleaned
  setMemoryLimit: (limitMB: number) => void; // Set new memory limit
  getCacheSize: () => number;         // Get cache size in bytes
}
```

#### Usage

```typescript
import { useMemoryManager } from '../hooks/useMemoryManager';

function MyComponent() {
  const {
    memoryStats,
    cleanupCount,
    isMonitoring,
    updateMemoryStats,
    cacheImage,
    getCachedImage,
    registerCleanup,
    forceCleanup
  } = useMemoryManager({
    maxMemoryMB: 300,
    cleanupThreshold: 0.8,
    monitoringInterval: 10000,
    enableGarbageCollection: true,
    onMemoryWarning: (usageMB) => {
      console.warn(`Memory warning: ${usageMB}MB`);
      setShowMemoryWarning(true);
    },
    onMemoryCritical: (usageMB) => {
      console.error(`Memory critical: ${usageMB}MB`);
      setShowMemoryCritical(true);
    }
  });

  // Register cleanup callback
  useEffect(() => {
    const cleanup = registerCleanup(() => {
      // Custom cleanup logic
      clearTemporaryData();
    });

    return cleanup;
  }, [registerCleanup]);

  // Cache image data
  const handleImageLoad = (key: string, data: any) => {
    if (!cacheImage(key, data)) {
      console.warn('Failed to cache image, memory limit reached');
    }
  };

  return (
    <div>
      <div>Memory: {memoryStats?.usageMB}MB ({memoryStats?.usagePercent}%)</div>
      <div>Cleanups: {cleanupCount}</div>
      <div>Monitoring: {isMonitoring ? 'Active' : 'Inactive'}</div>
    </div>
  );
}
```

#### Advanced Usage

```typescript
// Advanced memory management
const memoryManager = useMemoryManager({
  maxMemoryMB: 500,
  cleanupThreshold: 0.75,
  aggressiveCleanup: true,
  onCleanup: (cleanedItems) => {
    console.log(`Cleaned up ${cleanedItems} items`);
    // Update UI to show cleanup result
    setLastCleanupCount(cleanedItems);
  }
});

// Manual memory management
const handleManualCleanup = () => {
  const cleanedItems = memoryManager.forceCleanup();
  console.log(`Manual cleanup removed ${cleanedItems} items`);
};

// Dynamic memory limit adjustment
const handleMemoryPressure = () => {
  if (memoryManager.memoryStats?.usagePercent > 90) {
    memoryManager.setMemoryLimit(200); // Reduce limit
  }
};

// Smart caching with size estimation
const cacheImageWithSize = (key: string, data: any) => {
  // Estimate size (rough calculation)
  const estimatedSize = JSON.stringify(data).length * 2; // Bytes

  // Only cache if under limit
  if (memoryManager.memoryStats?.usageMB < 250) {
    return memoryManager.cacheImage(key, data, estimatedSize);
  }
  return false;
};
```

### 3. usePredictivePreloading

**File**: `webapp/src/hooks/useInfiniteLibraryScroll.ts` (integrated)

**Purpose**: Predictive preloading for smooth scrolling experience.

#### Type Definitions

```typescript
interface PredictivePreloadingResult {
  isPreloaded: (item: string) => boolean;     // Check if item is preloaded
  preloadQueue: string[];                      // Current preload queue
  isPreloading: boolean;                      // Currently preloading
  preloadProgress: number;                    // Preload progress (0-1)
  getPreloadItems: (currentIndex: number, count: number) => string[]; // Get items to preload
}

// Usage integrated with useInfiniteLibraryScroll
const { isPreloaded, preloadQueue } = usePredictivePreloading(items, currentIndex, 10);
```

#### Usage

```typescript
function VirtualizedGrid() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { items } = useInfiniteLibraryScroll(dir, engine);

  const { isPreloaded, preloadQueue } = usePredictivePreloading(
    items,
    currentIndex,
    10 // Preload 10 items ahead
  );

  const handleScroll = (scrollIndex: number) => {
    setCurrentIndex(scrollIndex);
  };

  return (
    <div>
      {items.map((item, index) => (
        <img
          key={item}
          src={item}
          alt={`Photo ${index}`}
          className={isPreloaded(item) ? 'preloaded' : 'loading'}
        />
      ))}
      <div>Preloading: {preloadQueue.length} items</div>
    </div>
  );
}
```

## Components

### 1. VirtualizedPhotoGrid

**File**: `webapp/src/components/VirtualizedPhotoGrid.tsx`

**Purpose**: Virtualized photo grid component for large collections.

#### Props

```typescript
interface VirtualizedPhotoGridProps {
  dir: string;                              // Directory path
  engine: string;                           // Search engine
  onItemClick?: (path: string) => void;     // Item click handler
  className?: string;                       // Additional CSS classes
  imageQuality?: 'low' | 'medium' | 'high'; // Image quality
  showMetrics?: boolean;                    // Show performance metrics
  enablePreload?: boolean;                 // Enable predictive preloading
  virtualizationThreshold?: number;        // Threshold for virtualization
  itemSize?: number;                        // Item size in pixels
  gap?: number;                            // Gap between items
  columns?: number;                        // Number of columns (optional)
}
```

#### Usage

```typescript
import { VirtualizedPhotoGrid } from '../components/VirtualizedPhotoGrid';

function PhotoLibrary() {
  const handlePhotoClick = (path: string) => {
    console.log('Photo clicked:', path);
    // Open photo detail view
  };

  return (
    <div className="photo-library">
      <VirtualizedPhotoGrid
        dir="/path/to/photos"
        engine="local"
        onItemClick={handlePhotoClick}
        imageQuality="medium"
        showMetrics={true}
        enablePreload={true}
        virtualizationThreshold={1000}
        itemSize={200}
        gap={8}
        className="custom-grid"
      />
    </div>
  );
}
```

#### Advanced Usage

```typescript
// Advanced configuration
const advancedConfig = {
  dir: largePhotoDirectory,
  engine: "advanced",
  imageQuality: "high" as const,
  showMetrics: process.env.NODE_ENV === 'development',
  enablePreload: true,
  virtualizationThreshold: 500, // Lower threshold for better performance
  itemSize: 250,
  gap: 12,
  onItemClick: (path) => {
    // Custom click handling
    navigateToPhoto(path);
  }
};

<VirtualizedPhotoGrid {...advancedConfig} />
```

#### Custom Rendering

```typescript
// Custom item rendering (if needed)
const CustomGridItem = ({ item, index, style }) => (
  <div style={style} className="custom-item">
    <img src={item} alt={`Photo ${index}`} />
    <div className="overlay">
      <span>Index: {index}</span>
    </div>
  </div>
);

// Usage with custom renderer
<VirtualizedPhotoGrid
  dir="/path/to/photos"
  engine="local"
  renderItem={CustomGridItem}
/>
```

### 2. PerformanceDashboard

**File**: `webapp/src/components/PerformanceDashboard.tsx`

**Purpose**: Real-time performance monitoring dashboard.

#### Props

```typescript
interface PerformanceDashboardProps {
  visible?: boolean;           // Dashboard visibility
  onClose?: () => void;        // Close callback
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'; // Position
  theme?: 'light' | 'dark';   // Theme
  showAdvanced?: boolean;      // Show advanced metrics
  autoHide?: boolean;          // Auto-hide when not needed
  refreshInterval?: number;    // Refresh interval in ms
}
```

#### Usage

```typescript
import { PerformanceDashboard } from '../components/PerformanceDashboard';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div className="app">
      <button onClick={() => setShowDashboard(!showDashboard)}>
        Toggle Performance Dashboard
      </button>

      <PerformanceDashboard
        visible={showDashboard}
        onClose={() => setShowDashboard(false)}
        position="bottom-right"
        theme="light"
        showAdvanced={true}
        autoHide={false}
        refreshInterval={1000}
      />
    </div>
  );
}
```

#### Advanced Usage

```typescript
// Advanced dashboard configuration
const advancedDashboard = {
  visible: showPerformanceDashboard,
  onClose: () => setShowPerformanceDashboard(false),
  position: "bottom-right" as const,
  theme: "dark" as const,
  showAdvanced: true,
  autoHide: false,
  refreshInterval: 500, // Faster refresh for debugging
};

<PerformanceDashboard {...advancedDashboard} />
```

### 3. LazyImage

**File**: `webapp/src/components/LazyImage.tsx` (integrated with VirtualizedPhotoGrid)

**Purpose**: Lazy loading image component with placeholder support.

#### Props

```typescript
interface LazyImageProps {
  src: string;                           // Image source
  alt: string;                           // Alt text
  className?: string;                    // CSS classes
  placeholder?: React.ReactNode;         // Placeholder element
  quality?: 'low' | 'medium' | 'high';  // Image quality
  loading?: 'lazy' | 'eager';           // Loading strategy
  onLoad?: () => void;                  // Load callback
  onError?: () => void;                  // Error callback
  threshold?: number;                    // Intersection threshold
}
```

#### Usage

```typescript
import { LazyImage } from '../components/LazyImage';

function PhotoItem({ photo }) {
  const handleImageLoad = () => {
    console.log('Image loaded:', photo.path);
  };

  const handleImageError = () => {
    console.error('Image failed to load:', photo.path);
  };

  return (
    <LazyImage
      src={photo.path}
      alt={photo.name}
      className="photo-item"
      placeholder={
        <div className="photo-placeholder">
          <div className="loading-spinner" />
          <span>Loading...</span>
        </div>
      }
      quality="medium"
      loading="lazy"
      onLoad={handleImageLoad}
      onError={handleImageError}
      threshold={0.1}
    />
  );
}
```

## Services

### 1. PerformanceMonitor

**File**: `webapp/src/services/PerformanceMonitor.ts`

**Purpose**: Singleton service for performance monitoring and metrics collection.

#### Type Definitions

```typescript
interface PerformanceMetrics {
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usageMB: number;
    usagePercent: number;
  };
  timing: {
    pageLoad: number;
    firstContentfulPaint: number;
    domInteractive: number;
  };
  library: {
    totalItems: number;
    loadedItems: number;
    loadingTime: number;
    averageLoadTime: number;
  };
  rendering: {
    gridRenderTime: number;
    virtualizationEnabled: boolean;
    visibleItems: number;
    totalRenderedItems: number;
  };
}

interface PerformanceAlert {
  type: 'warning' | 'critical';
  message: string;
  timestamp: number;
  metrics: Partial<PerformanceMetrics>;
}
```

#### Usage

```typescript
import { PerformanceMonitor } from '../services/PerformanceMonitor';

// Get instance
const monitor = PerformanceMonitor.getInstance();

// Update metrics
monitor.updateLibraryMetrics({
  totalItems: 50000,
  loadedItems: 2500,
  loadingTime: 5000,
  virtualizationEnabled: true,
  visibleItems: 100,
  totalRenderedItems: 2500
});

// Record grid render time
const renderStart = performance.now();
// ... render grid ...
const renderEnd = performance.now();
monitor.recordGridRenderTime(renderEnd - renderStart);

// Get current metrics
const metrics = monitor.getMetrics();

// Subscribe to metric updates
const unsubscribe = monitor.subscribe((newMetrics) => {
  console.log('Metrics updated:', newMetrics);
});

// Handle alerts
const alertUnsubscribe = monitor.onAlert((alert) => {
  console.log('Performance alert:', alert);
  // Show alert to user
  showAlert(alert.message, alert.type);
});

// Generate performance report
const report = monitor.generateReport();
console.log(report);
```

#### Advanced Usage

```typescript
// Advanced monitoring setup
const monitor = PerformanceMonitor.getInstance();

// Custom alert handling
const setupCustomAlerts = () => {
  monitor.onAlert((alert) => {
    switch (alert.type) {
      case 'critical':
        showCriticalAlert(alert.message);
        break;
      case 'warning':
        showWarningAlert(alert.message);
        break;
    }

    // Log to analytics
    logPerformanceAlert(alert);
  });
};

// Custom metric tracking
const trackCustomMetrics = () => {
  // Track user interactions
  const interactionStart = performance.now();
  // ... user interaction ...
  const interactionEnd = performance.now();

  // Custom metrics (could be extended)
  monitor.updateCustomMetrics({
    userInteractions: {
      count: getInteractionCount(),
      averageTime: getAverageInteractionTime()
    }
  });
};

// Performance baselines
const setPerformanceBaselines = () => {
  monitor.setBaselines({
    memoryUsage: { warning: 200, critical: 280 },
    renderTime: { warning: 100, critical: 200 },
    loadTime: { warning: 5000, critical: 10000 }
  });
};
```

## Integration Patterns

### 1. Component Integration

```typescript
// Comprehensive component integration
function OptimizedPhotoLibrary() {
  // Infinite scroll with memory management
  const scrollResult = useInfiniteLibraryScroll(dir, engine, {
    maxMemoryMB: 300,
    enablePreload: true,
    onError: handleError
  });

  // Memory management
  const memoryManager = useMemoryManager({
    maxMemoryMB: 300,
    onMemoryWarning: handleMemoryWarning
  });

  // Performance monitoring
  const monitor = usePerformanceMonitor();

  // Combined effects
  useEffect(() => {
    // Update performance metrics
    monitor.updateLibraryMetrics({
      totalItems: scrollResult.totalItems,
      loadedItems: scrollResult.loadedItems,
      virtualizationEnabled: true
    });
  }, [scrollResult.totalItems, scrollResult.loadedItems, monitor]);

  return (
    <div>
      <VirtualizedPhotoGrid
        dir={dir}
        engine={engine}
        onItemClick={handlePhotoClick}
        showMetrics={showMetrics}
      />

      <PerformanceDashboard
        visible={showDashboard}
        onClose={() => setShowDashboard(false)}
      />
    </div>
  );
}
```

### 2. Application Integration

```typescript
// App-level integration
function App() {
  // Global performance monitoring
  const monitor = PerformanceMonitor.getInstance();

  // Global memory management
  const memoryManager = useMemoryManager({
    maxMemoryMB: 300,
    onMemoryWarning: (usageMB) => {
      // Global memory warning handling
      setShowMemoryWarning(true);
    }
  });

  // Set up global performance tracking
  useEffect(() => {
    const unsubscribe = monitor.subscribe((metrics) => {
      // Update global state
      setGlobalMetrics(metrics);

      // Log to analytics
      logPerformanceMetrics(metrics);
    });

    return unsubscribe;
  }, [monitor]);

  return (
    <PerformanceProvider>
      <MemoryProvider>
        <Router>
          <Routes>
            <Route path="/" element={<PhotoLibrary />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </Router>
      </MemoryProvider>
    </PerformanceProvider>
  );
}
```

### 3. Testing Integration

```typescript
// Testing utilities
const createPerformanceTest = (testName: string, testFunction: () => Promise<void>) => {
  return async () => {
    const monitor = PerformanceMonitor.getInstance();
    const memoryManager = useMemoryManager();

    const startTime = performance.now();
    const startMemory = memoryManager.memoryStats?.usageMB || 0;

    try {
      await testFunction();

      const endTime = performance.now();
      const endMemory = memoryManager.memoryStats?.usageMB || 0;

      console.log(`${testName} completed:`);
      console.log(`  - Time: ${endTime - startTime}ms`);
      console.log(`  - Memory: ${endMemory - startMemory}MB`);

    } catch (error) {
      console.error(`${testName} failed:`, error);
    }
  };
};
```

## Best Practices

### 1. Memory Management

```typescript
// Proper memory cleanup
function MyComponent() {
  const memoryManager = useMemoryManager();

  useEffect(() => {
    // Register cleanup callbacks
    const cleanup1 = registerCleanup(cleanupFunction1);
    const cleanup2 = registerCleanup(cleanupFunction2);

    return () => {
      // Cleanup on unmount
      cleanup1();
      cleanup2();
    };
  }, [memoryManager]);

  // Efficient caching
  const cacheData = (key: string, data: any) => {
    if (memoryManager.memoryStats?.usageMB < 250) {
      return memoryManager.cacheImage(key, data);
    }
    return false;
  };
}
```

### 2. Performance Optimization

```typescript
// Optimized component rendering
const OptimizedComponent = React.memo(({ items }) => {
  const monitor = usePerformanceMonitor();

  const renderStart = performance.now();

  const content = items.map(item => (
    <MemoizedItem key={item.id} item={item} />
  ));

  const renderEnd = performance.now();
  monitor.recordGridRenderTime(renderEnd - renderStart);

  return content;
});
```

### 3. Error Handling

```typescript
// Comprehensive error handling
function RobustComponent() {
  const {
    items,
    loading,
    error,
    loadMore,
    reset
  } = useInfiniteLibraryScroll(dir, engine, {
    onError: (error) => {
      console.error('Load error:', error);
      setErrorState(error);
      // Retry logic
      setTimeout(() => loadMore(), 2000);
    }
  });

  if (error) {
    return (
      <ErrorView
        error={error}
        onRetry={loadMore}
        onReset={reset}
      />
    );
  }

  // ... normal rendering
}
```

## Troubleshooting

### Common Issues

#### 1. Memory Leaks
```typescript
// Proper cleanup
function ComponentWithMemory() {
  const memoryManager = useMemoryManager();

  useEffect(() => {
    const cleanup = registerCleanup(() => {
      // Cleanup resources
    });

    return cleanup; // This is crucial!
  }, []);
}
```

#### 2. Performance Issues
```typescript
// Performance monitoring
function PerformanceAwareComponent() {
  const monitor = usePerformanceMonitor();

  useEffect(() => {
    const unsubscribe = monitor.subscribe((metrics) => {
      if (metrics.memoryUsage.usagePercent > 90) {
        console.warn('High memory usage detected');
        // Take action
      }
    });

    return unsubscribe;
  }, [monitor]);
}
```

#### 3. Infinite Scroll Issues
```typescript
// Robust infinite scroll
function RobustInfiniteScroll() {
  const {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    reset
  } = useInfiniteLibraryScroll(dir, engine, {
    onError: (error) => {
      // Handle network errors
      if (error.includes('network')) {
        setTimeout(() => loadMore(), 5000);
      }
    }
  });

  // Debounced scroll handling
  const debouncedLoadMore = useCallback(
    debounce(loadMore, 300),
    [loadMore]
  );
}
```

## Conclusion

This API documentation provides comprehensive guidance for using the performance optimization components and hooks. The tools are designed to be:

- **Easy to use**: Simple APIs with sensible defaults
- **Highly configurable**: Extensive customization options
- **Performance focused**: Optimized for large collections
- **Developer friendly**: Comprehensive TypeScript support
- **Production ready**: Thoroughly tested and documented

By following these patterns and best practices, you can build highly efficient, scalable applications for managing large photo collections with excellent user experience.