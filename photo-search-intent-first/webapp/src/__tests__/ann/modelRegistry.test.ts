/**
 * Tests for Model Registry
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModelRegistry } from '../../services/ann/ModelRegistry';
import { BackendRegistry } from '../../services/ann/BackendRegistry';
import { ResourceMonitor } from '../../services/ann/ResourceMonitor';
import type {
  ModelMetadata,
  ModelVersion,
  ModelInstance,
  ModelSearchCriteria,
  ModelUsageStats
} from '../../services/ann/ModelRegistry';

// Mock backend registry
vi.mock('../../services/ann/BackendRegistry', () => ({
  BackendRegistry: {
    getInstance: vi.fn(() => ({
      getBackend: vi.fn(),
      getAvailableBackends: vi.fn()
    }))
  }
}));

// Mock resource monitor
vi.mock('../../services/ann/ResourceMonitor', () => ({
  ResourceMonitor: {
    getInstance: vi.fn(() => ({
      getCurrentResources: vi.fn(() => ({
        totalMemory: 8192,
        availableMemory: 4096,
        totalCPU: 400,
        availableCPU: 200,
        totalStorage: 10000,
        availableStorage: 7000,
        network: {
          online: true,
          bandwidth: 100,
          latency: 50,
          reliability: 0.95
        }
      }))
    }))
  }
}));

describe('ModelRegistry', () => {
  let modelRegistry: ModelRegistry;
  let mockBackendRegistry: any;
  let mockResourceMonitor: any;

  beforeEach(() => {
    modelRegistry = ModelRegistry.getInstance();
    mockBackendRegistry = BackendRegistry.getInstance();
    mockResourceMonitor = ResourceMonitor.getInstance();

    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock responses
    mockBackendRegistry.getAvailableBackends.mockReturnValue([]);
  });

  afterEach(async () => {
    // Clean up registry state
    const data = modelRegistry.exportRegistry();
    await modelRegistry.importRegistry({ models: [], versions: {} });
  });

  describe('Model Registration', () => {
    it('should register a new model successfully', async () => {
      const modelMetadata: ModelMetadata = {
        id: 'test-model',
        name: 'Test Model',
        description: 'A test model for testing',
        version: '1.0.0',
        format: 'tensorflow',
        size: 1024 * 1024 * 10, // 10MB
        parameters: 1000000,
        hash: 'test-hash',
        checksum: 'test-checksum',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['test', 'classification'],
        categories: ['image'],
        backendRequirements: {
          tensorflowjs: true
        },
        systemRequirements: {
          minMemoryMB: 256,
          minCPU: 10
        },
        performance: {
          inferenceTime: 100,
          memoryUsage: 300,
          throughput: 30,
          accuracy: 0.95
        },
        capabilities: [
          {
            type: 'classification',
            classes: ['cat', 'dog'],
            confidence: 0.95
          }
        ],
        supportedTasks: ['image_classification'],
        metadata: {}
      };

      await expect(modelRegistry.registerModel(modelMetadata)).resolves.not.toThrow();

      const retrievedModel = modelRegistry.getModel('test-model');
      expect(retrievedModel).toEqual(modelMetadata);
    });

    it('should throw error for invalid metadata', async () => {
      const invalidMetadata: ModelMetadata = {
        id: '',
        name: 'Invalid Model',
        description: 'Invalid metadata',
        version: '1.0.0',
        format: 'tensorflow',
        size: 0,
        parameters: 0,
        hash: '',
        checksum: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        categories: [],
        backendRequirements: {},
        systemRequirements: {
          minMemoryMB: 0,
          minCPU: 0
        },
        performance: {
          inferenceTime: 0,
          memoryUsage: 0,
          throughput: 0,
          accuracy: 0
        },
        capabilities: [],
        supportedTasks: [],
        metadata: {}
      };

      await expect(modelRegistry.registerModel(invalidMetadata))
        .rejects.toThrow('Invalid model metadata: missing required fields');
    });

    it('should throw error for duplicate model registration', async () => {
      const modelMetadata: ModelMetadata = {
        id: 'duplicate-model',
        name: 'Duplicate Model',
        description: 'A duplicate model',
        version: '1.0.0',
        format: 'tensorflow',
        size: 1024 * 1024,
        parameters: 100000,
        hash: 'hash1',
        checksum: 'checksum1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        categories: [],
        backendRequirements: { tensorflowjs: true },
        systemRequirements: { minMemoryMB: 128, minCPU: 5 },
        performance: { inferenceTime: 50, memoryUsage: 128, throughput: 50, accuracy: 0.9 },
        capabilities: [],
        supportedTasks: [],
        metadata: {}
      };

      await modelRegistry.registerModel(modelMetadata);
      await expect(modelRegistry.registerModel(modelMetadata))
        .rejects.toThrow('Model duplicate-model already exists');
    });
  });

  describe('Model Version Management', () => {
    beforeEach(async () => {
      const baseModel: ModelMetadata = {
        id: 'versioned-model',
        name: 'Versioned Model',
        description: 'A model with multiple versions',
        version: '1.0.0',
        format: 'tensorflow',
        size: 1024 * 1024,
        parameters: 100000,
        hash: 'base-hash',
        checksum: 'base-checksum',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        categories: [],
        backendRequirements: { tensorflowjs: true },
        systemRequirements: { minMemoryMB: 128, minCPU: 5 },
        performance: { inferenceTime: 50, memoryUsage: 128, throughput: 50, accuracy: 0.9 },
        capabilities: [],
        supportedTasks: [],
        metadata: {}
      };

      await modelRegistry.registerModel(baseModel);
    });

    it('should add a new version to existing model', async () => {
      const newVersion: ModelVersion = {
        version: '2.0.0',
        modelPath: '/models/versioned-model/2.0.0/model',
        checksum: 'version2-checksum',
        size: 1024 * 1024 * 2, // 2MB
        createdAt: Date.now(),
        isDefault: false,
        changelog: 'Improved accuracy and performance'
      };

      await expect(modelRegistry.addModelVersion('versioned-model', newVersion)).resolves.not.toThrow();

      const versions = modelRegistry.getModelVersions('versioned-model');
      expect(versions).toHaveLength(1);
      expect(versions[0]).toEqual(newVersion);
    });

    it('should throw error for duplicate version', async () => {
      const version: ModelVersion = {
        version: '1.0.0', // Same as default version
        modelPath: '/models/versioned-model/1.0.0/model',
        checksum: 'different-checksum',
        size: 1024 * 1024,
        createdAt: Date.now(),
        isDefault: false
      };

      await expect(modelRegistry.addModelVersion('versioned-model', version))
        .rejects.toThrow('Version 1.0.0 already exists as default version');
    });

    it('should throw error for non-existent model', async () => {
      const version: ModelVersion = {
        version: '1.0.0',
        modelPath: '/models/non-existent/model',
        checksum: 'checksum',
        size: 1024 * 1024,
        createdAt: Date.now(),
        isDefault: false
      };

      await expect(modelRegistry.addModelVersion('non-existent-model', version))
        .rejects.toThrow('Model non-existent-model not found');
    });
  });

  describe('Model Loading', () => {
    beforeEach(async () => {
      const modelMetadata: ModelMetadata = {
        id: 'loadable-model',
        name: 'Loadable Model',
        description: 'A model that can be loaded',
        version: '1.0.0',
        format: 'tensorflow',
        size: 1024 * 1024,
        parameters: 100000,
        hash: 'loadable-hash',
        checksum: 'loadable-checksum',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        categories: [],
        backendRequirements: { tensorflowjs: true },
        systemRequirements: { minMemoryMB: 128, minCPU: 5 },
        performance: { inferenceTime: 50, memoryUsage: 128, throughput: 50, accuracy: 0.9 },
        capabilities: [],
        supportedTasks: [],
        metadata: {}
      };

      await modelRegistry.registerModel(modelMetadata);

      // Setup mock backend
      const mockBackend = {
        id: 'mock-backend',
        isAvailable: vi.fn(() => true),
        getHealth: vi.fn(() => ({
          status: 'healthy',
          lastCheck: Date.now(),
          uptime: 1000,
          errorRate: 0,
          responseTime: 50,
          activeConnections: 0,
          resourceUsage: { memory: 100, cpu: 20, storage: 0 }
        })),
        loadModel: vi.fn().mockResolvedValue({
          id: 'loadable-model',
          loaded: true,
          size: 1024 * 1024,
          metadata: { performance: { inferenceTime: 50, memoryUsage: 128 } }
        }),
        unloadModel: vi.fn().mockResolvedValue()
      };

      mockBackendRegistry.getBackend.mockReturnValue(mockBackend);
      mockBackendRegistry.getAvailableBackends.mockReturnValue([mockBackend]);
    });

    it('should load a model successfully', async () => {
      const instanceId = await modelRegistry.loadModel('loadable-model');

      expect(instanceId).toBeDefined();
      expect(typeof instanceId).toBe('string');

      const instances = modelRegistry.getLoadedInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].modelId).toBe('loadable-model');
      expect(instances[0].loaded).toBe(true);
    });

    it('should throw error for non-existent model', async () => {
      await expect(modelRegistry.loadModel('non-existent-model'))
        .rejects.toThrow('Model non-existent-model not found');
    });

    it('should reuse already loaded model instance', async () => {
      const instanceId1 = await modelRegistry.loadModel('loadable-model');
      const instanceId2 = await modelRegistry.loadModel('loadable-model');

      expect(instanceId1).toBe(instanceId2);
    });

    it('should unload a model instance', async () => {
      const instanceId = await modelRegistry.loadModel('loadable-model');
      await expect(modelRegistry.unloadModel(instanceId)).resolves.not.toThrow();

      const instances = modelRegistry.getLoadedInstances();
      expect(instances).toHaveLength(0);
    });

    it('should throw error for unloading non-existent instance', async () => {
      await expect(modelRegistry.unloadModel('non-existent-instance'))
        .rejects.toThrow('Model instance non-existent-instance not found');
    });
  });

  describe('Model Search', () => {
    beforeEach(async () => {
      // Create test models
      const models: ModelMetadata[] = [
        {
          id: 'classification-model',
          name: 'Classification Model',
          description: 'Image classification model',
          version: '1.0.0',
          format: 'tensorflow',
          size: 1024 * 1024,
          parameters: 100000,
          hash: 'hash1',
          checksum: 'checksum1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['classification', 'image'],
          categories: ['image'],
          backendRequirements: { tensorflowjs: true },
          systemRequirements: { minMemoryMB: 128, minCPU: 5 },
          performance: { inferenceTime: 50, memoryUsage: 128, throughput: 50, accuracy: 0.95 },
          capabilities: [{ type: 'classification', classes: ['cat', 'dog'] }],
          supportedTasks: ['image_classification'],
          metadata: {}
        },
        {
          id: 'detection-model',
          name: 'Detection Model',
          description: 'Object detection model',
          version: '1.0.0',
          format: 'onnx',
          size: 2 * 1024 * 1024,
          parameters: 200000,
          hash: 'hash2',
          checksum: 'checksum2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['detection', 'image'],
          categories: ['image'],
          backendRequirements: { onnx: true },
          systemRequirements: { minMemoryMB: 256, minCPU: 10 },
          performance: { inferenceTime: 100, memoryUsage: 256, throughput: 25, accuracy: 0.9 },
          capabilities: [{ type: 'detection', classes: ['person', 'car'] }],
          supportedTasks: ['object_detection'],
          metadata: {}
        },
        {
          id: 'embedding-model',
          name: 'Embedding Model',
          description: 'Text embedding model',
          version: '1.0.0',
          format: 'pytorch',
          size: 512 * 1024,
          parameters: 50000,
          hash: 'hash3',
          checksum: 'checksum3',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['embedding', 'text'],
          categories: ['text'],
          backendRequirements: { pytorch: true },
          systemRequirements: { minMemoryMB: 64, minCPU: 2 },
          performance: { inferenceTime: 25, memoryUsage: 64, throughput: 100, accuracy: 0.85 },
          capabilities: [{ type: 'embedding' }],
          supportedTasks: ['text_embedding'],
          metadata: {}
        }
      ];

      for (const model of models) {
        await modelRegistry.registerModel(model);
      }
    });

    it('should search models by task type', () => {
      const criteria: ModelSearchCriteria = {
        taskType: 'image_classification'
      };

      const results = modelRegistry.searchModels(criteria);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('classification-model');
    });

    it('should search models by format', () => {
      const criteria: ModelSearchCriteria = {
        format: 'onnx'
      };

      const results = modelRegistry.searchModels(criteria);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('detection-model');
    });

    it('should search models by multiple formats', () => {
      const criteria: ModelSearchCriteria = {
        format: ['tensorflow', 'pytorch']
      };

      const results = modelRegistry.searchModels(criteria);

      expect(results).toHaveLength(2);
      const ids = results.map(r => r.id);
      expect(ids).toContain('classification-model');
      expect(ids).toContain('embedding-model');
    });

    it('should search models by memory constraints', () => {
      const criteria: ModelSearchCriteria = {
        maxMemoryMB: 100
      };

      const results = modelRegistry.searchModels(criteria);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('embedding-model');
    });

    it('should search models by accuracy requirements', () => {
      const criteria: ModelSearchCriteria = {
        minAccuracy: 0.92
      };

      const results = modelRegistry.searchModels(criteria);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('classification-model');
    });

    it('should search models by tags', () => {
      const criteria: ModelSearchCriteria = {
        tags: ['image']
      };

      const results = modelRegistry.searchModels(criteria);

      expect(results).toHaveLength(2);
      const ids = results.map(r => r.id);
      expect(ids).toContain('classification-model');
      expect(ids).toContain('detection-model');
    });

    it('should search models by capabilities', () => {
      const criteria: ModelSearchCriteria = {
        capabilities: ['embedding']
      };

      const results = modelRegistry.searchModels(criteria);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('embedding-model');
    });

    it('should return empty results for non-matching criteria', () => {
      const criteria: ModelSearchCriteria = {
        taskType: 'non_existent_task'
      };

      const results = modelRegistry.searchModels(criteria);

      expect(results).toHaveLength(0);
    });
  });

  describe('Usage Statistics', () => {
    beforeEach(async () => {
      const modelMetadata: ModelMetadata = {
        id: 'stats-model',
        name: 'Stats Model',
        description: 'Model for testing statistics',
        version: '1.0.0',
        format: 'tensorflow',
        size: 1024 * 1024,
        parameters: 100000,
        hash: 'stats-hash',
        checksum: 'stats-checksum',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        categories: [],
        backendRequirements: { tensorflowjs: true },
        systemRequirements: { minMemoryMB: 128, minCPU: 5 },
        performance: { inferenceTime: 50, memoryUsage: 128, throughput: 50, accuracy: 0.9 },
        capabilities: [],
        supportedTasks: [],
        metadata: {}
      };

      await modelRegistry.registerModel(modelMetadata);

      // Setup mock backend
      const mockBackend = {
        id: 'mock-backend',
        isAvailable: vi.fn(() => true),
        getHealth: vi.fn(() => ({
          status: 'healthy',
          lastCheck: Date.now(),
          uptime: 1000,
          errorRate: 0,
          responseTime: 50,
          activeConnections: 0,
          resourceUsage: { memory: 100, cpu: 20, storage: 0 }
        })),
        loadModel: vi.fn().mockResolvedValue({
          id: 'stats-model',
          loaded: true,
          size: 1024 * 1024
        }),
        unloadModel: vi.fn().mockResolvedValue()
      };

      mockBackendRegistry.getBackend.mockReturnValue(mockBackend);
      mockBackendRegistry.getAvailableBackends.mockReturnValue([mockBackend]);
    });

    it('should record inference statistics', async () => {
      const instanceId = await modelRegistry.loadModel('stats-model');

      // Record successful inference
      modelRegistry.recordInference(instanceId, 50, true);

      let stats = modelRegistry.getUsageStats('stats-model');
      expect(stats).toHaveLength(1);
      expect(stats[0].totalInferences).toBe(1);
      expect(stats[0].totalTime).toBe(50);
      expect(stats[0].averageTime).toBe(50);
      expect(stats[0].successRate).toBe(1.0);

      // Record failed inference
      modelRegistry.recordInference(instanceId, 75, false);

      stats = modelRegistry.getUsageStats('stats-model');
      expect(stats[0].totalInferences).toBe(2);
      expect(stats[0].totalTime).toBe(125);
      expect(stats[0].averageTime).toBe(62.5);
      expect(stats[0].successRate).toBe(0.5);
      expect(stats[0].errorCount).toBe(1);
    });

    it('should get system resource usage', async () => {
      await modelRegistry.loadModel('stats-model');

      const usage = modelRegistry.getSystemResourceUsage();

      expect(usage.totalMemoryMB).toBeGreaterThan(0);
      expect(usage.totalInstances).toBe(1);
      expect(usage.backendDistribution).toEqual({ 'mock-backend': 1 });
      expect(usage.modelDistribution).toEqual({ 'stats-model': 1 });
    });
  });

  describe('Model Recommendations', () => {
    beforeEach(async () => {
      const models: ModelMetadata[] = [
        {
          id: 'high-accuracy-model',
          name: 'High Accuracy Model',
          description: 'Very accurate but slow model',
          version: '1.0.0',
          format: 'tensorflow',
          size: 2 * 1024 * 1024,
          parameters: 200000,
          hash: 'hash1',
          checksum: 'checksum1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['high-accuracy'],
          categories: ['image'],
          backendRequirements: { tensorflowjs: true },
          systemRequirements: { minMemoryMB: 512, minCPU: 20 },
          performance: { inferenceTime: 200, memoryUsage: 512, throughput: 10, accuracy: 0.99 },
          capabilities: [{ type: 'classification' }],
          supportedTasks: ['image_classification'],
          metadata: {}
        },
        {
          id: 'fast-model',
          name: 'Fast Model',
          description: 'Fast but less accurate model',
          version: '1.0.0',
          format: 'onnx',
          size: 512 * 1024,
          parameters: 50000,
          hash: 'hash2',
          checksum: 'checksum2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['fast'],
          categories: ['image'],
          backendRequirements: { onnx: true },
          systemRequirements: { minMemoryMB: 64, minCPU: 5 },
          performance: { inferenceTime: 25, memoryUsage: 64, throughput: 100, accuracy: 0.85 },
          capabilities: [{ type: 'classification' }],
          supportedTasks: ['image_classification'],
          metadata: {}
        }
      ];

      for (const model of models) {
        await modelRegistry.registerModel(model);
      }
    });

    it('should recommend models based on task type', () => {
      const recommendations = modelRegistry.getRecommendedModels('image_classification');

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].performance.accuracy).toBeGreaterThan(recommendations[1].performance.accuracy);
    });

    it('should apply constraints to recommendations', () => {
      const recommendations = modelRegistry.getRecommendedModels('image_classification', {
        maxMemoryMB: 100
      });

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].id).toBe('fast-model');
    });

    it('should return empty recommendations for unsupported task', () => {
      const recommendations = modelRegistry.getRecommendedModels('unsupported_task');

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('Data Import/Export', () => {
    it('should export registry data', async () => {
      const modelMetadata: ModelMetadata = {
        id: 'export-model',
        name: 'Export Model',
        description: 'Model for testing export',
        version: '1.0.0',
        format: 'tensorflow',
        size: 1024 * 1024,
        parameters: 100000,
        hash: 'export-hash',
        checksum: 'export-checksum',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        categories: [],
        backendRequirements: { tensorflowjs: true },
        systemRequirements: { minMemoryMB: 128, minCPU: 5 },
        performance: { inferenceTime: 50, memoryUsage: 128, throughput: 50, accuracy: 0.9 },
        capabilities: [],
        supportedTasks: [],
        metadata: {}
      };

      await modelRegistry.registerModel(modelMetadata);

      const data = modelRegistry.exportRegistry();

      expect(data.models).toHaveLength(1);
      expect(data.models[0].id).toBe('export-model');
      expect(data.versions).toHaveProperty('export-model');
    });

    it('should import registry data', async () => {
      const importData = {
        models: [
          {
            id: 'imported-model',
            name: 'Imported Model',
            description: 'Model imported from data',
            version: '1.0.0',
            format: 'tensorflow',
            size: 1024 * 1024,
            parameters: 100000,
            hash: 'imported-hash',
            checksum: 'imported-checksum',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tags: [],
            categories: [],
            backendRequirements: { tensorflowjs: true },
            systemRequirements: { minMemoryMB: 128, minCPU: 5 },
            performance: { inferenceTime: 50, memoryUsage: 128, throughput: 50, accuracy: 0.9 },
            capabilities: [],
            supportedTasks: [],
            metadata: {}
          }
        ],
        versions: {
          'imported-model': [
            {
              version: '2.0.0',
              modelPath: '/models/imported-model/2.0.0/model',
              checksum: 'v2-checksum',
              size: 2 * 1024 * 1024,
              createdAt: Date.now(),
              isDefault: false
            }
          ]
        }
      };

      modelRegistry.importRegistry(importData);

      const model = modelRegistry.getModel('imported-model');
      expect(model).toBeDefined();
      expect(model?.id).toBe('imported-model');

      const versions = modelRegistry.getModelVersions('imported-model');
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe('2.0.0');
    });
  });
});