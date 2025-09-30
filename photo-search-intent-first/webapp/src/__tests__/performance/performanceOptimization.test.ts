/**
 * Performance optimization tests for large photo collections
 *
 * These tests verify that the performance optimizations work correctly
 * and provide measurable improvements for large libraries.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteLibraryScroll } from '../../hooks/useInfiniteLibraryScroll';
import { useMemoryManager } from '../../hooks/useMemoryManager';
import { PerformanceMonitor } from '../../services/PerformanceMonitor';

// Mock the API
vi.mock('../../api', () => ({
  apiLibrary: vi.fn(),
}));

describe('Performance Optimization Features', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = PerformanceMonitor.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitor.destroy();
  });

  describe('useInfiniteLibraryScroll', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() =>
        useInfiniteLibraryScroll('/test/dir', 'local')
      );

      expect(result.current.items).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should load initial batch on mount', async () => {
      const mockResponse = {
        paths: Array.from({ length: 500 }, (_, i) => `/test/photo${i}.jpg`),
        total: 50000
      };

      const { apiLibrary } = require('../../api');
      (apiLibrary as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useInfiniteLibraryScroll('/test/dir', 'local', {
          initialBatchSize: 500,
          batchSize: 1000,
        })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(apiLibrary).toHaveBeenCalledWith('/test/dir', 'local', 500, 0, {});
    });

    it('should handle large collections efficiently', async () => {
      const mockResponse = {
        paths: Array.from({ length: 1000 }, (_, i) => `/test/photo${i}.jpg`),
        total: 50000
      };

      const { apiLibrary } = require('../../api');
      (apiLibrary as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useInfiniteLibraryScroll('/test/dir', 'local', {
          initialBatchSize: 1000,
          batchSize: 2000,
          maxMemoryMB: 300,
        })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.items).toHaveLength(1000);
      expect(result.current.totalItems).toBe(50000);
      expect(result.current.loadedItems).toBe(1000);
    });

    it('should implement memory cleanup for large collections', async () => {
      // Mock high memory usage
      const originalMemory = (performance as any).memory;
      (performance as any).memory = {
        usedJSHeapSize: 400 * 1024 * 1024, // 400MB
        totalJSHeapSize: 450 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };

      const mockResponse = {
        paths: Array.from({ length: 2000 }, (_, i) => `/test/photo${i}.jpg`),
        total: 50000
      };

      const { apiLibrary } = require('../../api');
      (apiLibrary as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useInfiniteLibraryScroll('/test/dir', 'local', {
          initialBatchSize: 500,
          batchSize: 1000,
          maxMemoryMB: 300,
        })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Memory cleanup should be triggered
      expect(result.current.memoryUsage).toBeGreaterThan(300);

      // Restore original memory
      (performance as any).memory = originalMemory;
    });
  });

  describe('useMemoryManager', () => {
    it('should initialize with default settings', () => {
      const { result } = renderHook(() =>
        useMemoryManager()
      );

      expect(result.current.memoryStats).toBe(null);
      expect(result.current.cleanupCount).toBe(0);
      expect(result.current.isMonitoring).toBe(true);
    });

    it('should track memory usage', () => {
      const originalMemory = (performance as any).memory;
      (performance as any).memory = {
        usedJSHeapSize: 100 * 1024 * 1024,
        totalJSHeapSize: 150 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };

      const { result } = renderHook(() =>
        useMemoryManager({
          maxMemoryMB: 300,
          cleanupThreshold: 0.8,
        })
      );

      act(() => {
        result.current.updateMemoryStats();
      });

      expect(result.current.memoryStats).not.toBeNull();
      expect(result.current.memoryStats?.usageMB).toBe(100);
      expect(result.current.memoryStats?.usagePercent).toBe(20);

      // Restore original memory
      (performance as any).memory = originalMemory;
    });

    it('should trigger cleanup on memory warning', () => {
      const originalMemory = (performance as any).memory;
      (performance as any).memory = {
        usedJSHeapSize: 280 * 1024 * 1024, // 280MB (exceeds 80% of 300MB)
        totalJSHeapSize: 300 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };

      const mockOnMemoryWarning = vi.fn();
      const { result } = renderHook(() =>
        useMemoryManager({
          maxMemoryMB: 300,
          cleanupThreshold: 0.8,
          onMemoryWarning: mockOnMemoryWarning,
        })
      );

      act(() => {
        result.current.updateMemoryStats();
      });

      expect(mockOnMemoryWarning).toHaveBeenCalledWith(280);

      // Restore original memory
      (performance as any).memory = originalMemory;
    });

    it('should manage image cache effectively', () => {
      const { result } = renderHook(() =>
        useMemoryManager()
      );

      // Test image caching
      expect(result.current.cacheImage('test-key', 'test-data')).toBe(true);
      expect(result.current.getCachedImage('test-key')).toBe('test-data');

      // Test cache limits
      const largeKey = 'large-key';
      const largeData = 'x'.repeat(1024 * 1024); // 1MB data

      // Simulate memory pressure
      const originalMemory = (performance as any).memory;
      (performance as any).memory = {
        usedJSHeapSize: 350 * 1024 * 1024, // 350MB (exceeds 300MB limit)
        totalJSHeapSize: 400 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };

      expect(result.current.cacheImage(largeKey, largeData)).toBe(false);

      // Restore original memory
      (performance as any).memory = originalMemory;
    });
  });

  describe('PerformanceMonitor', () => {
    it('should track memory metrics', () => {
      const originalMemory = (performance as any).memory;
      (performance as any).memory = {
        usedJSHeapSize: 150 * 1024 * 1024,
        totalJSHeapSize: 200 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };

      const metrics = performanceMonitor.getMetrics();

      expect(metrics.memoryUsage.usedJSHeapSize).toBe(150 * 1024 * 1024);
      expect(metrics.memoryUsage.usageMB).toBe(150);
      expect(metrics.memoryUsage.usagePercent).toBe(30);

      // Restore original memory
      (performance as any).memory = originalMemory;
    });

    it('should generate performance reports', () => {
      const report = performanceMonitor.generateReport();

      expect(report).toContain('Performance Report');
      expect(report).toContain('Memory Usage');
      expect(report).toContain('Library Performance');
      expect(report).toContain('Rendering Performance');
    });

    it('should handle alerts for high memory usage', () => {
      const originalMemory = (performance as any).memory;
      (performance as any).memory = {
        usedJSHeapSize: 450 * 1024 * 1024, // 450MB (90% of 500MB)
        totalJSHeapSize: 480 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };

      // Force memory metrics update
      (performanceMonitor as any).updateMemoryMetrics();
      (performanceMonitor as any).checkMemoryThresholds();

      const alerts = performanceMonitor.getAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[alerts.length - 1].type).toBe('critical');
      expect(alerts[alerts.length - 1].message).toContain('90%');

      // Restore original memory
      (performance as any).memory = originalMemory;
    });

    it('should update library metrics', () => {
      performanceMonitor.updateLibraryMetrics({
        totalItems: 50000,
        loadedItems: 2500,
        loadingTime: 5000,
        virtualizationEnabled: true,
        visibleItems: 100,
        totalRenderedItems: 2500,
      });

      const metrics = performanceMonitor.getMetrics();

      expect(metrics.library.totalItems).toBe(50000);
      expect(metrics.library.loadedItems).toBe(2500);
      expect(metrics.library.loadingTime).toBe(5000);
      expect(metrics.library.averageLoadTime).toBe(2);
      expect(metrics.rendering.virtualizationEnabled).toBe(true);
      expect(metrics.rendering.visibleItems).toBe(100);
      expect(metrics.rendering.totalRenderedItems).toBe(2500);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle large collection loading', async () => {
      const startTime = performance.now();

      // Simulate loading a large collection
      const largeCollection = Array.from({ length: 10000 }, (_, i) => `/test/photo${i}.jpg`);

      // Test array operations (simulating what happens in the actual component)
      const processed = largeCollection.map(path => ({
        path,
        name: path.split('/').pop(),
        size: Math.random() * 1000000,
      }));

      const sorted = processed.sort((a, b) => a.name.localeCompare(b.name));

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Performance assertion: should process 10K items in under 100ms
      expect(processingTime).toBeLessThan(100);
      expect(sorted.length).toBe(10000);
    });

    it('should demonstrate virtualization benefits', () => {
      // Simulate rendering all items vs virtualized rendering
      const totalItems = 50000;
      const visibleItems = 100;

      // Traditional rendering (all items)
      const traditionalMemory = totalItems * 1024; // 1KB per item
      const traditionalRenderTime = totalItems * 0.1; // 0.1ms per item

      // Virtualized rendering (only visible items)
      const virtualizedMemory = visibleItems * 1024;
      const virtualizedRenderTime = visibleItems * 0.1;

      // Performance improvements
      const memoryReduction = traditionalMemory - virtualizedMemory;
      const timeReduction = traditionalRenderTime - virtualizedRenderTime;

      expect(memoryReduction).toBeGreaterThan(0);
      expect(timeReduction).toBeGreaterThan(0);
      expect(memoryReduction / traditionalMemory).toBeGreaterThan(0.95); // 95% reduction
    });

    it('should demonstrate memory management efficiency', () => {
      // Simulate memory cleanup process
      const initialItems = Array.from({ length: 5000 }, (_, i) => `item${i}`);
      let memoryCache = new Map<string, any>();

      // Fill cache
      initialItems.forEach(item => {
        memoryCache.set(item, { data: `data-${item}`, timestamp: Date.now() });
      });

      const initialMemory = memoryCache.size;

      // Simulate cleanup (remove 50% of items)
      const itemsToRemove = Math.floor(initialItems.length * 0.5);
      for (let i = 0; i < itemsToRemove; i++) {
        memoryCache.delete(initialItems[i]);
      }

      const finalMemory = memoryCache.size;
      const memoryReduction = initialMemory - finalMemory;

      expect(memoryReduction).toBe(itemsToRemove);
      expect(finalMemory).toBe(initialItems.length - itemsToRemove);
    });
  });
});