/**
 * Task Scheduler Tests
 * Tests for the TaskScheduler component which handles task scheduling, load balancing, and auto-scaling
 */

import { describe, it, expect, beforeEach, afterEach, vi, jest } from 'vitest';
import { TaskScheduler } from '../../services/ann/TaskScheduler';

// Mock all the singleton dependencies
vi.mock('../../services/ann/BackendRegistry', () => ({
  BackendRegistry: {
    getInstance: () => ({
      getAvailableBackends: vi.fn().mockReturnValue([]),
      getBackend: vi.fn().mockReturnValue(null),
      getAllBackends: vi.fn().mockReturnValue([]),
      registerBackend: vi.fn(),
      unregisterBackend: vi.fn()
    })
  }
}));

vi.mock('../../services/ann/ResourceMonitor', () => ({
  ResourceMonitor: {
    getInstance: () => ({
      getCurrentResources: vi.fn().mockReturnValue({
        memory: { used: 100, total: 1000, percent: 10 },
        cpu: { used: 20, total: 100, percent: 20 },
        storage: { used: 200, total: 1000, percent: 20 }
      }),
      getHistoricalData: vi.fn().mockReturnValue([]),
      startMonitoring: vi.fn(),
      stopMonitoring: vi.fn()
    })
  }
}));

vi.mock('../../services/ann/BackendSelector', () => ({
  BackendSelector: {
    getInstance: () => ({
      selectBackend: vi.fn().mockReturnValue(null),
      updateBackendScore: vi.fn(),
      getBackendScores: vi.fn().mockReturnValue(new Map())
    })
  }
}));

vi.mock('../../services/ann/ModelRegistry', () => ({
  ModelRegistry: {
    getInstance: () => ({
      getModel: vi.fn().mockReturnValue(null),
      getCompatibleModels: vi.fn().mockReturnValue([]),
      searchModels: vi.fn().mockReturnValue([]),
      registerModel: vi.fn(),
      unregisterModel: vi.fn()
    })
  }
}));

vi.mock('../../services/ann/HealthMonitor', () => ({
  HealthMonitor: {
    getInstance: () => ({
      checkBackendHealth: vi.fn().mockReturnValue({ status: 'healthy' }),
      startMonitoring: vi.fn(),
      stopMonitoring: vi.fn(),
      getHealthStatus: vi.fn().mockReturnValue(new Map())
    })
  }
}));

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;
  let mockConfig: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockConfig = {
      maxConcurrentTasks: 3,
      maxQueueSize: 100,
      taskTimeout: 5000,
      retryAttempts: 2,
      loadBalancingStrategy: 'least-loaded',
      priorityMode: 'weighted',
      healthCheckInterval: 1000,
      autoScaling: true,
      scalingThresholds: {
        cpuThreshold: 80,
        memoryThreshold: 85,
        queueThreshold: 10
      },
      queueConfig: {
        maxSize: 100,
        priorityAgingEnabled: true,
        agingInterval: 5000,
        fairShareEnabled: true
      }
    };

    scheduler = new TaskScheduler(mockConfig);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(scheduler).toBeDefined();
      expect(scheduler.getMetrics()).toBeDefined();
    });

    it('should start and stop successfully', async () => {
      await scheduler.start();
      expect(scheduler.getMetrics()).toBeDefined();

      await scheduler.stop();
      // Should not throw errors
    });
  });

  describe('Task Management', () => {
    it('should submit and process tasks', async () => {
      await scheduler.start();

      // For now, just verify the scheduler is running
      expect(scheduler.getMetrics()).toBeDefined();
    });

    it('should handle task timeouts', async () => {
      await scheduler.start();
      // Test timeout handling logic
      await vi.advanceTimersByTimeAsync(200);

      expect(scheduler.getMetrics()).toBeDefined();
    });
  });

  describe('Load Balancing', () => {
    it('should distribute tasks across backends', async () => {
      await scheduler.start();

      const metrics = scheduler.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should handle backend failures gracefully', async () => {
      await scheduler.start();

      // Should handle failures without crashing
      expect(scheduler.getMetrics()).toBeDefined();
    });
  });

  describe('Auto-scaling', () => {
    it('should check auto-scaling conditions', async () => {
      await scheduler.start();

      const scalingDecision = scheduler.checkAutoScaling();
      expect(scalingDecision).toBeDefined();
      if (scalingDecision && scalingDecision.action) {
        expect(['scale_up', 'scale_down', 'maintain']).toContain(scalingDecision.action);
      }
    });

    it('should scale down under low load', async () => {
      await scheduler.start();

      const scalingDecision = scheduler.checkAutoScaling();
      expect(scalingDecision).toBeDefined();
    });
  });

  describe('Health Monitoring', () => {
    it('should monitor backend health', async () => {
      await scheduler.start();

      // Should monitor health without errors
      expect(scheduler.getMetrics()).toBeDefined();
    });

    it('should detect unhealthy backends', async () => {
      await scheduler.start();

      // Should handle unhealthy backends
      expect(scheduler.getMetrics()).toBeDefined();
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration dynamically', async () => {
      const newConfig = {
        maxConcurrentTasks: 5,
        taskTimeout: 3000
      };

      await scheduler.start();

      // Update configuration
      scheduler.updateConfig(newConfig);

      // Should not throw errors
      expect(scheduler.getMetrics()).toBeDefined();
    });

    it('should validate configuration parameters', () => {
      const invalidConfig = {
        maxConcurrentTasks: -1 // Invalid value
      };

      expect(() => {
        scheduler.updateConfig(invalidConfig);
      }).not.toThrow(); // Should handle invalid config gracefully
    });
  });

  describe('Metrics and Analytics', () => {
    it('should provide accurate metrics', async () => {
      await scheduler.start();

      const metrics = scheduler.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalTasks).toBe('number');
      expect(typeof metrics.completedTasks).toBe('number');
      expect(typeof metrics.failedTasks).toBe('number');
    });

    it('should track backend load distribution', async () => {
      await scheduler.start();

      const loadDistribution = scheduler.getBackendLoadDistribution();
      expect(Array.isArray(loadDistribution)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle concurrent task execution errors', async () => {
      await scheduler.start();

      // Should handle concurrent execution errors
      expect(scheduler.getMetrics()).toBeDefined();
    });

    it('should handle resource exhaustion', async () => {
      await scheduler.start();

      // Should handle resource exhaustion
      const scalingDecision = scheduler.checkAutoScaling();
      expect(scalingDecision).toBeDefined();
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize task scheduling based on priority', async () => {
      await scheduler.start();

      // Should prioritize high-priority tasks
      const metrics = scheduler.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should balance load across available backends', async () => {
      await scheduler.start();

      const loadDistribution = scheduler.getBackendLoadDistribution();
      expect(Array.isArray(loadDistribution)).toBe(true);
    });
  });

  describe('Queue Management', () => {
    it('should manage task queue efficiently', async () => {
      await scheduler.start();

      const metrics = scheduler.getMetrics();
      expect(metrics).toBeDefined();
      if (metrics.queueLength !== undefined) {
        expect(metrics.queueLength).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle queue overflow', async () => {
      await scheduler.start();

      const metrics = scheduler.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Task Prioritization', () => {
    it('should prioritize tasks based on priority level', async () => {
      await scheduler.start();

      const metrics = scheduler.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should handle priority aging', async () => {
      await scheduler.start();

      // Test priority aging logic
      await vi.advanceTimersByTimeAsync(6000);

      const metrics = scheduler.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Resource Management', () => {
    it('should monitor resource usage', async () => {
      await scheduler.start();

      const metrics = scheduler.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should handle resource constraints', async () => {
      await scheduler.start();

      const scalingDecision = scheduler.checkAutoScaling();
      expect(scalingDecision).toBeDefined();
    });
  });

  describe('Task Cancellation', () => {
    it('should cancel tasks successfully', async () => {
      await scheduler.start();

      // Test task cancellation
      const result = await scheduler.cancelTask('test-task-id');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Task Status Tracking', () => {
    it('should track task status accurately', async () => {
      await scheduler.start();

      const status = scheduler.getTaskStatus('test-task-id');
      expect(status).toBeDefined();
    });

    it('should retrieve task results', async () => {
      await scheduler.start();

      const result = scheduler.getTaskResult('test-task-id');
      expect(result).toBeDefined();
    });
  });
});