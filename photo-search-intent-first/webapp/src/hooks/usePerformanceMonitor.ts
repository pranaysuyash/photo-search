import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
  memoryUsage?: PerformanceMemory;
}

/**
 * Hook to monitor component performance and render metrics
 */
export function usePerformanceMonitor(componentName: string, logMetrics = false) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
  });
  
  const renderTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Start timing the render
    startTimeRef.current = performance.now();
    
    return () => {
      // Measure render time
      const renderTime = performance.now() - startTimeRef.current;
      renderTimesRef.current.push(renderTime);
      
      // Keep only last 100 render times to prevent memory bloat
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current = renderTimesRef.current.slice(-50);
      }
      
      const renderTimes = renderTimesRef.current;
      const newMetrics: PerformanceMetrics = {
        renderCount: renderTimes.length,
        lastRenderTime: renderTime,
        averageRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
        maxRenderTime: Math.max(...renderTimes),
        memoryUsage: (performance as any).memory,
      };
      
      setMetrics(newMetrics);
      
      if (logMetrics && renderTimes.length % 10 === 0) {
        console.group(`🔍 Performance Metrics: ${componentName}`);
        console.log(`Renders: ${newMetrics.renderCount}`);
        console.log(`Last render: ${newMetrics.lastRenderTime.toFixed(2)}ms`);
        console.log(`Avg render: ${newMetrics.averageRenderTime.toFixed(2)}ms`);
        console.log(`Max render: ${newMetrics.maxRenderTime.toFixed(2)}ms`);
        if (newMetrics.memoryUsage) {
          console.log(`Memory: ${(newMetrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        }
        console.groupEnd();
      }
    };
  });

  return metrics;
}

/**
 * Hook to measure specific operations
 */
export function useOperationTimer() {
  const startTimer = (operation: string) => {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      console.log(`⏱️ ${operation}: ${(endTime - startTime).toFixed(2)}ms`);
    };
  };

  return { startTimer };
}

/**
 * Hook to monitor scroll performance
 */
export function useScrollPerformance(containerRef: React.RefObject<HTMLElement>) {
  const [scrollMetrics, setScrollMetrics] = useState({
    scrollCount: 0,
    averageScrollTime: 0,
    maxScrollTime: 0,
  });

  const scrollTimesRef = useRef<number[]>([]);
  const scrollStartRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;
    
    const handleScrollStart = () => {
      scrollStartRef.current = performance.now();
      
      // Cancel previous RAF if it exists
      if (rafId) cancelAnimationFrame(rafId);
      
      // Measure scroll end on next frame
      rafId = requestAnimationFrame(() => {
        const scrollTime = performance.now() - scrollStartRef.current;
        scrollTimesRef.current.push(scrollTime);
        
        if (scrollTimesRef.current.length > 50) {
          scrollTimesRef.current = scrollTimesRef.current.slice(-25);
        }
        
        const times = scrollTimesRef.current;
        setScrollMetrics({
          scrollCount: times.length,
          averageScrollTime: times.reduce((a, b) => a + b, 0) / times.length,
          maxScrollTime: Math.max(...times),
        });
      });
    };

    container.addEventListener('scroll', handleScrollStart, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScrollStart);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [containerRef]);

  return scrollMetrics;
}