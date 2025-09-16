# Performance Monitoring Documentation

This document provides an overview of the performance monitoring utilities implemented in the Photo Search application.

## Overview

The performance monitoring system provides tools to track, measure, and analyze the performance of various operations within the application. This helps identify bottlenecks and optimize the user experience.

## Core Utilities

### PerformanceMonitor Class

The `PerformanceMonitor` class is the core of the performance monitoring system. It provides methods to:

- Start and end timing operations
- Record custom metrics
- Retrieve recent metrics
- Calculate average durations
- Export metrics for analysis

```typescript
import { performanceMonitor } from "../utils/performance";

// Start timing an operation
const endTiming = performanceMonitor.start("api_call");
// ... perform operation ...
endTiming();

// Record a custom metric
performanceMonitor.record("custom_operation", 125.5, { userId: "123" });

// Get recent metrics
const recentMetrics = performanceMonitor.getRecentMetrics(5); // Last 5 minutes

// Get average duration
const avgDuration = performanceMonitor.getAverageDuration("api_call");
```

### React Hook

The `usePerformanceMonitor` hook provides an easy way to monitor performance in React components:

```typescript
import { usePerformanceMonitor } from "../utils/performance";

const MyComponent = () => {
  const { start } = usePerformanceMonitor();
  
  const handleOperation = () => {
    const endTiming = start("my_operation");
    // ... perform operation ...
    endTiming();
  };
  
  return <button onClick={handleOperation}>Perform Operation</button>;
};
```

### Utility Functions

Several utility functions are provided for common performance monitoring scenarios:

```typescript
import { measureRenderTime, measureAPICall } from "../utils/performance";

// Measure component render time
const endRenderTiming = measureRenderTime("MyComponent");

// Measure API call time
const endAPITiming = measureAPICall("searchPhotos");
```

## Implementation in Components

### SearchHistoryPanel

Performance monitoring has been added to the SearchHistoryPanel:

- Loading activities: `search_history_load`
- Filtering and sorting: `search_history_filter_sort`

### RecentActivityPanel

Performance monitoring has been added to the RecentActivityPanel:

- Loading activities: `recent_activity_load`
- Filtering and sorting: `recent_activity_filter_sort`

## PerformanceMetrics Component

The `PerformanceMetrics` component provides a real-time display of performance metrics. It can be toggled on/off and shows:

- Operation names
- Call counts
- Average durations

To use it, simply include it in your application:

```tsx
import { PerformanceMetrics } from "../components/PerformanceMetrics";

function App() {
  return (
    <div>
      {/* Your application components */}
      <PerformanceMetrics visible={process.env.NODE_ENV === 'development'} />
    </div>
  );
}
```

## Virtualization

To improve performance with large datasets, virtualization has been implemented in:

- SearchHistoryPanel using react-window
- RecentActivityPanel using react-window

This ensures that only visible items are rendered, significantly improving performance with large lists.

## Best Practices

1. **Use specific operation names**: Use descriptive names for operations to make metrics easy to understand.

2. **Monitor critical paths**: Focus on monitoring operations that directly impact user experience.

3. **Avoid excessive monitoring**: Too much monitoring can impact performance itself.

4. **Clear old metrics**: Regularly clear old metrics to prevent memory leaks.

5. **Use in development**: Enable performance monitoring in development to catch issues early.

## Future Improvements

1. **Persistent storage**: Store metrics persistently for analysis across sessions.

2. **Threshold alerts**: Implement alerts when performance degrades beyond thresholds.

3. **Detailed tracing**: Add more detailed tracing for complex operations.

4. **Integration with monitoring services**: Integrate with external monitoring services for production environments.