/**
 * Tests for TensorFlow.js Backend Adapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TensorFlowJSBackend } from '../../../services/ann/adapters/TensorFlowJSBackend';

// Mock TensorFlow.js
vi.mock('@tensorflow/tfjs', () => ({
  loadLayersModel: vi.fn(),
  loadGraphModel: vi.fn(),
  tensor: vi.fn(),
  zeros: vi.fn(),
  browser: {
    fromPixels: vi.fn()
  },
  env: vi.fn(() => ({
    set: vi.fn(),
    engine: vi.fn(() => ({
      memory: { numBytes: 1024 * 1024 * 100 },
      dispose: vi.fn()
    }))
  })),
  engine: vi.fn(() => ({
    memory: { numBytes: 1024 * 1024 * 100 },
    dispose: vi.fn()
  }))
}));

describe('TensorFlowJSBackend', () => {
  let backend: TensorFlowJSBackend;

  beforeEach(() => {
    backend = new TensorFlowJSBackend();
  });

  afterEach(async () => {
    if (backend.isAvailable()) {
      await backend.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with TensorFlow.js', async () => {
      const result = await backend.initialize();
      expect(result).toBe(true);
      expect(backend.isAvailable()).toBe(true);
    });

    it('should handle initialization failure', async () => {
      // Mock import failure
      const { loadLayersModel } = await import('@tensorflow/tfjs');
      vi.mocked(loadLayersModel).mockImplementationOnce(() => {
        throw new Error('Import failed');
      });

      const result = await backend.initialize();
      expect(result).toBe(false);
      expect(backend.isAvailable()).toBe(false);
    });
  });

  describe('Model Management', () => {
    beforeEach(async () => {
      await backend.initialize();
    });

    it('should load a TensorFlow.js model successfully', async () => {
      const mockModel = {
        predict: vi.fn().mockReturnValue({ data: vi.fn().mockResolvedValue([0.1, 0.9]) }),
        dispose: vi.fn()
      };

      const { loadLayersModel } = await import('@tensorflow/tfjs');
      vi.mocked(loadLayersModel).mockResolvedValue(mockModel);

      const modelConfig = {
        format: 'tfjs' as const,
        modelUrl: '/models/test/model.json',
        name: 'Test Model',
        version: '1.0.0',
        inputShape: [1, 224, 224, 3]
      };

      const model = await backend.loadModel('test-model', modelConfig);

      expect(model.id).toBe('test-model');
      expect(model.loaded).toBe(true);
      expect(model.format).toBe('tfjs');
    });

    it('should unload a model', async () => {
      // First load a model
      const mockModel = {
        predict: vi.fn(),
        dispose: vi.fn()
      };

      const { loadLayersModel } = await import('@tensorflow/tfjs');
      vi.mocked(loadLayersModel).mockResolvedValue(mockModel);

      await backend.loadModel('test-model', {
        format: 'tfjs' as const,
        modelUrl: '/models/test/model.json'
      });

      await backend.unloadModel('test-model');
      expect(mockModel.dispose).toHaveBeenCalled();
    });

    it('should list loaded models', async () => {
      // Load a model first
      const mockModel = {
        predict: vi.fn(),
        dispose: vi.fn()
      };

      const { loadLayersModel } = await import('@tensorflow/tfjs');
      vi.mocked(loadLayersModel).mockResolvedValue(mockModel);

      await backend.loadModel('test-model', {
        format: 'tfjs' as const,
        modelUrl: '/models/test/model.json'
      });

      const models = await backend.listModels();
      expect(models).toContain('test-model');
    });
  });

  describe('Inference', () => {
    beforeEach(async () => {
      await backend.initialize();
    });

    it('should run inference with tensor input', async () => {
      const mockModel = {
        predict: vi.fn().mockReturnValue({
          data: vi.fn().mockResolvedValue([0.1, 0.9, 0.8, 0.2]),
          dispose: vi.fn()
        })
      };

      const { loadLayersModel, tensor } = await import('@tensorflow/tfjs');
      vi.mocked(loadLayersModel).mockResolvedValue(mockModel);
      vi.mocked(tensor).mockReturnValue({
        dispose: vi.fn()
      });

      await backend.loadModel('test-model', {
        format: 'tfjs' as const,
        modelUrl: '/models/test/model.json'
      });

      const input = {
        data: [1, 2, 3, 4],
        format: {
          type: 'tensor' as const,
          dtype: 'float32',
          shape: [1, 2, 2]
        }
      };

      const result = await backend.runInference('test-model', input);

      expect(result.data).toEqual([0.1, 0.9, 0.8, 0.2]);
      expect(result.format.type).toBe('tensor');
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should run batch inference', async () => {
      const mockModel = {
        predict: vi.fn().mockReturnValue({
          data: vi.fn().mockResolvedValue([0.1, 0.9]),
          dispose: vi.fn()
        })
      };

      const { loadLayersModel, tensor, zeros } = await import('@tensorflow/tfjs');
      vi.mocked(loadLayersModel).mockResolvedValue(mockModel);
      vi.mocked(tensor).mockReturnValue({ dispose: vi.fn() });
      vi.mocked(zeros).mockReturnValue({ dispose: vi.fn() });

      await backend.loadModel('test-model', {
        format: 'tfjs' as const,
        modelUrl: '/models/test/model.json'
      });

      const inputs = [
        {
          data: [1, 2, 3, 4],
          format: {
            type: 'tensor' as const,
            dtype: 'float32',
            shape: [1, 2, 2]
          }
        },
        {
          data: [5, 6, 7, 8],
          format: {
            type: 'tensor' as const,
            dtype: 'float32',
            shape: [1, 2, 2]
          }
        }
      ];

      const results = await backend.runBatchInference('test-model', inputs);

      expect(results).toHaveLength(2);
      expect(results[0].data).toEqual([0.1, 0.9]);
      expect(results[1].data).toEqual([0.1, 0.9]);
    });

    it('should throw error for non-existent model', async () => {
      const input = {
        data: [1, 2, 3, 4],
        format: {
          type: 'tensor' as const,
          dtype: 'float32',
          shape: [1, 2, 2]
        }
      };

      await expect(backend.runInference('non-existent-model', input))
        .rejects.toThrow('Model non-existent-model not loaded');
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await backend.initialize();
    });

    it('should provide performance metrics', () => {
      const metrics = backend.getPerformanceMetrics();

      expect(metrics.inferenceTime).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(0);
      expect(metrics.accuracy).toBeGreaterThan(0);
    });

    it('should optimize for specific tasks', async () => {
      await expect(backend.optimizeForTask('face_detection')).resolves.not.toThrow();
      await expect(backend.optimizeForTask('image_embedding')).resolves.not.toThrow();
      await expect(backend.optimizeForTask('object_detection')).resolves.not.toThrow();
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await backend.initialize();
    });

    it('should report health status', () => {
      const health = backend.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.lastCheck).toBeGreaterThan(0);
      expect(health.activeConnections).toBeGreaterThanOrEqual(0);
      expect(health.resourceUsage).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle model loading errors', async () => {
      await backend.initialize();

      const { loadLayersModel } = await import('@tensorflow/tfjs');
      vi.mocked(loadLayersModel).mockRejectedValue(new Error('Model not found'));

      await expect(backend.loadModel('test-model', {
        format: 'tfjs' as const,
        modelUrl: '/invalid/path/model.json'
      })).rejects.toThrow();
    });

    it('should handle inference errors', async () => {
      await backend.initialize();

      const mockModel = {
        predict: vi.fn().mockRejectedValue(new Error('Inference failed')),
        dispose: vi.fn()
      };

      const { loadLayersModel } = await import('@tensorflow/tfjs');
      vi.mocked(loadLayersModel).mockResolvedValue(mockModel);

      await backend.loadModel('test-model', {
        format: 'tfjs' as const,
        modelUrl: '/models/test/model.json'
      });

      const input = {
        data: [1, 2, 3, 4],
        format: {
          type: 'tensor' as const,
          dtype: 'float32',
          shape: [1, 2, 2]
        }
      };

      await expect(backend.runInference('test-model', input))
        .rejects.toThrow('Inference failed');
    });
  });
});