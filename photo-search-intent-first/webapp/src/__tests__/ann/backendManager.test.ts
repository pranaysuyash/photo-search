/**
 * Tests for Backend Manager system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackendManager } from '../../services/ann/BackendManager';
import { ResourceMonitor } from '../../services/ann/ResourceMonitor';
import { HealthMonitor } from '../../services/ann/HealthMonitor';
import { BackendRegistry } from '../../services/ann/BackendRegistry';
import { BaseBackend } from '../../services/ann/BackendInterface';

// Mock backend for testing
class MockBackend extends BaseBackend {
  readonly id = 'mock-backend';
  readonly name = 'Mock Backend';
  readonly version = '1.0.0';
  readonly capabilities = [];
  readonly resourceRequirements = {
    memory: { min: 100, max: 200, optimal: 150 },
    cpu: { min: 10, max: 30, optimal: 20 }
  };
  readonly performanceProfile = {
    inferenceTime: 100,
    memoryUsage: 50,
    throughput: 10
  };

  private initialized = false;

  async initialize(): Promise<boolean> {
    this.initialized = true;
    return true;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  isAvailable(): boolean {
    return this.initialized;
  }

  getHealth() {
    return {
      status: 'healthy' as const,
      lastCheck: Date.now(),
      uptime: Date.now(),
      errorRate: 0,
      responseTime: 100,
      activeConnections: 0,
      resourceUsage: {
        memory: 50,
        cpu: 20,
        storage: 0
      }
    };
  }

  async loadModel(modelId: string): Promise<any> {
    return { id: modelId, loaded: true };
  }

  async unloadModel(modelId: string): Promise<void> {
    // Mock implementation
  }

  async listModels(): Promise<string[]> {
    return ['model1', 'model2'];
  }

  async runInference(modelId: string, input: any): Promise<any> {
    return { result: `inference-${modelId}`, processingTime: 100 };
  }

  async runBatchInference(modelId: string, inputs: any[]): Promise<any[]> {
    return inputs.map(input => ({ result: `batch-${modelId}`, processingTime: 100 }));
  }

  async optimizeForTask(taskType: string): Promise<void> {
    // Mock implementation
  }

  getPerformanceMetrics() {
    return this.performanceProfile;
  }
}

describe('BackendManager', () => {
  let backendManager: BackendManager;
  let mockBackend: MockBackend;

  beforeEach(() => {
    // Create fresh instances for each test
    backendManager = BackendManager.getInstance();
    mockBackend = new MockBackend();
  });

  afterEach(async () => {
    // Cleanup after each test
    await backendManager.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await backendManager.initialize();
      expect(result).toBe(true);
    });

    it('should not initialize twice', async () => {
      await backendManager.initialize();
      const result = await backendManager.initialize();
      expect(result).toBe(true); // Should still return true
    });
  });

  describe('Backend Registration', () => {
    it('should register a backend successfully', async () => {
      await backendManager.initialize();
      const result = await backendManager.registerBackend('mock', mockBackend);
      expect(result).toBe(true);
    });

    it('should get registered backend', async () => {
      await backendManager.initialize();
      await backendManager.registerBackend('mock', mockBackend);

      const backend = backendManager.getBackend('mock');
      expect(backend).toBe(mockBackend);
    });

    it('should list available backends', async () => {
      await backendManager.initialize();
      await backendManager.registerBackend('mock', mockBackend);

      const backends = backendManager.getAvailableBackends();
      expect(backends).toContain('mock');
    });
  });

  describe('Task Execution', () => {
    it('should execute a task successfully', async () => {
      await backendManager.initialize();
      await backendManager.registerBackend('mock', mockBackend);

      const task = {
        id: 'test-task',
        type: 'face_detection' as const,
        modelId: 'model1',
        input: { data: 'test', format: { type: 'tensor', dtype: 'float32' } },
        priority: 'normal' as const,
        resourceRequirements: {
          memory: { min: 50, max: 100, optimal: 75 },
          cpu: { min: 5, max: 15, optimal: 10 },
          storage: { min: 10, max: 50, optimal: 25 }
        }
      };

      const result = await backendManager.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.backend).toBe('mock');
      expect(result.taskId).toBe('test-task');
    });

    it('should handle task execution errors', async () => {
      await backendManager.initialize();

      // Create a failing backend
      const failingBackend = new MockBackend();
      vi.spyOn(failingBackend, 'runInference').mockRejectedValue(new Error('Backend error'));

      await backendManager.registerBackend('failing', failingBackend);

      const task = {
        id: 'test-task',
        type: 'face_detection' as const,
        modelId: 'model1',
        input: { data: 'test', format: { type: 'tensor', dtype: 'float32' } },
        priority: 'normal' as const,
        resourceRequirements: {
          memory: { min: 50, max: 100, optimal: 75 },
          cpu: { min: 5, max: 15, optimal: 10 },
          storage: { min: 10, max: 50, optimal: 25 }
        }
      };

      const result = await backendManager.executeTask(task);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Backend Selection', () => {
    it('should select optimal backend for task', async () => {
      await backendManager.initialize();
      await backendManager.registerBackend('mock', mockBackend);

      const task = {
        id: 'test-task',
        type: 'face_detection' as const,
        modelId: 'model1',
        input: { data: 'test', format: { type: 'tensor', dtype: 'float32' } },
        priority: 'normal' as const,
        resourceRequirements: {
          memory: { min: 50, max: 100, optimal: 75 },
          cpu: { min: 5, max: 15, optimal: 10 },
          storage: { min: 10, max: 50, optimal: 25 }
        }
      };

      const selection = await backendManager.selectBackend(task);

      expect(selection.backend).toBe('mock');
      expect(selection.confidence).toBeGreaterThan(0);
      expect(selection.fallbacks).toBeDefined();
    });
  });

  describe('Resource Management', () => {
    it('should allocate resources successfully', async () => {
      await backendManager.initialize();

      const requirements = {
        memory: { min: 50, max: 100, optimal: 75 },
        cpu: { min: 5, max: 15, optimal: 10 },
        storage: { min: 10, max: 50, optimal: 25 }
      };

      const allocation = await backendManager.allocateResources('mock', requirements);

      expect(allocation.backendId).toBe('mock');
      expect(allocation.memory).toBeGreaterThan(0);
      expect(allocation.cpu).toBeGreaterThan(0);
      expect(allocation.status).toBe('active');
    });

    it('should release resources successfully', async () => {
      await backendManager.initialize();

      const requirements = {
        memory: { min: 50, max: 100, optimal: 75 },
        cpu: { min: 5, max: 15, optimal: 10 },
        storage: { min: 10, max: 50, optimal: 25 }
      };

      const allocation = await backendManager.allocateResources('mock', requirements);
      await backendManager.releaseResources(allocation.id);

      expect(allocation.status).toBe('released');
      expect(allocation.endTime).toBeDefined();
    });
  });

  describe('System Resources', () => {
    it('should provide system resource information', async () => {
      await backendManager.initialize();

      const resources = backendManager.getSystemResources();

      expect(resources.totalMemory).toBeGreaterThan(0);
      expect(resources.availableMemory).toBeGreaterThanOrEqual(0);
      expect(resources.totalCPU).toBeGreaterThan(0);
      expect(resources.availableCPU).toBeGreaterThanOrEqual(0);
    });

    it('should provide backend health information', async () => {
      await backendManager.initialize();
      await backendManager.registerBackend('mock', mockBackend);

      const healthStatuses = backendManager.getBackendStatuses();

      expect(healthStatuses['mock']).toBeDefined();
      expect(healthStatuses['mock'].status).toBe('healthy');
    });
  });

  describe('Cleanup', () => {
    it('should shutdown cleanly', async () => {
      await backendManager.initialize();
      await backendManager.registerBackend('mock', mockBackend);

      await backendManager.shutdown();

      const resources = backendManager.getSystemResources();
      const backends = backendManager.getAvailableBackends();

      expect(backends.length).toBe(0);
    });
  });
});

describe('ResourceMonitor', () => {
  let resourceMonitor: ResourceMonitor;

  beforeEach(() => {
    resourceMonitor = new ResourceMonitor({
      interval: 100, // Faster for testing
      alertThresholds: {
        memory: 90,
        cpu: 85,
        storage: 95
      }
    });
  });

  afterEach(async () => {
    await resourceMonitor.stop();
  });

  it('should initialize successfully', async () => {
    const result = await resourceMonitor.initialize();
    expect(result).toBe(true);
  });

  it('should start and stop monitoring', async () => {
    await resourceMonitor.initialize();

    resourceMonitor.start();
    expect(resourceMonitor['isMonitoring']).toBe(true);

    resourceMonitor.stop();
    expect(resourceMonitor['isMonitoring']).toBe(false);
  });

  it('should provide current resources', async () => {
    await resourceMonitor.initialize();

    const resources = resourceMonitor.getCurrentResources();

    expect(resources.totalMemory).toBeGreaterThan(0);
    expect(resources.availableMemory).toBeGreaterThanOrEqual(0);
    expect(resources.totalCPU).toBeGreaterThan(0);
    expect(resources.availableCPU).toBeGreaterThanOrEqual(0);
  });
});

describe('HealthMonitor', () => {
  let healthMonitor: any; // Using any to avoid type issues with test setup
  let mockBackend: MockBackend;

  beforeEach(() => {
    // Import dynamically to avoid issues
    const { HealthMonitor } = require('../../services/ann/HealthMonitor');
    healthMonitor = new HealthMonitor({
      interval: 100, // Faster for testing
      failureThreshold: 2,
      recoveryThreshold: 1
    });

    mockBackend = new MockBackend();
  });

  afterEach(async () => {
    await healthMonitor.stop();
  });

  it('should initialize successfully', async () => {
    const result = await healthMonitor.initialize();
    expect(result).toBe(true);
  });

  it('should monitor backend health', async () => {
    await healthMonitor.initialize();

    healthMonitor.monitorBackend('mock', mockBackend);
    const health = healthMonitor.getBackendHealth('mock');

    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
  });

  it('should perform health checks', async () => {
    await healthMonitor.initialize();
    healthMonitor.monitorBackend('mock', mockBackend);

    const check = await healthMonitor.performHealthCheck('mock');

    expect(check.backendId).toBe('mock');
    expect(check.status).toBe('success');
    expect(check.responseTime).toBeGreaterThan(0);
  });
});

describe('BackendRegistry', () => {
  let registry: BackendRegistry;
  let mockBackend: MockBackend;

  beforeEach(() => {
    registry = BackendRegistry.getInstance();
    mockBackend = new MockBackend();
  });

  afterEach(() => {
    // Clean up registry
    registry.unregisterBackend('mock');
  });

  it('should register backend successfully', () => {
    registry.registerBackend('mock', mockBackend);

    const backendInfo = registry.getBackend('mock');
    expect(backendInfo).toBeDefined();
    expect(backendInfo.id).toBe('mock');
    expect(backendInfo.name).toBe('Mock Backend');
  });

  it('should list active backends', () => {
    registry.registerBackend('mock', mockBackend);

    const backends = registry.getActiveBackends();
    expect(backends.length).toBe(1);
    expect(backends[0].id).toBe('mock');
  });

  it('should find optimal backend', () => {
    registry.registerBackend('mock', mockBackend);

    const optimal = registry.findOptimalBackend('inference', 'tensorflow');
    expect(optimal).toBeDefined();
    expect(optimal!.id).toBe('mock');
  });

  it('should validate backend configuration', () => {
    registry.registerBackend('mock', mockBackend);

    const backendInfo = registry.getBackend('mock')!;
    const errors = registry.validateBackendConfiguration(backendInfo);

    expect(errors.length).toBe(0);
  });

  it('should update backend health', () => {
    registry.registerBackend('mock', mockBackend);

    const health = {
      status: 'healthy' as const,
      lastCheck: Date.now(),
      uptime: Date.now(),
      errorRate: 0,
      responseTime: 100,
      activeConnections: 0,
      resourceUsage: {
        memory: 50,
        cpu: 20,
        storage: 0
      }
    };

    registry.updateBackendHealth('mock', health);

    const updatedBackend = registry.getBackend('mock');
    expect(updatedBackend!.health.status).toBe('healthy');
  });
});