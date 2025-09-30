/**
 * Tests for Performance Profiler system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceProfiler } from '../../services/ann/PerformanceProfiler';
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
    throughput: 10,
    accuracy: 0.85
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

describe('PerformanceProfiler', () => {
  let performanceProfiler: PerformanceProfiler;
  let mockBackend: MockBackend;

  beforeEach(async () => {
    performanceProfiler = new PerformanceProfiler({ profileInterval: 100 });
    mockBackend = new MockBackend();
    await mockBackend.initialize();
  });

  afterEach(async () => {
    await mockBackend.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await performanceProfiler.initialize();
      expect(result).toBe(true);
    });
  });

  describe('Backend Profiling', () => {
    it('should profile backend successfully', async () => {
      const profile = await performanceProfiler.profileBackend(
        mockBackend,
        'face_detection',
        'model1',
        3 // Fewer iterations for faster testing
      );

      expect(profile.backendId).toBe('mock-backend');
      expect(profile.taskType).toBe('face_detection');
      expect(profile.modelId).toBe('model1');
      expect(profile.metrics).toBeDefined();
      expect(profile.resourceUsage).toBeDefined();
      expect(profile.sampleSize).toBeGreaterThan(0);
      expect(profile.timestamp).toBeDefined();
    });

    it('should create resource profile', async () => {
      const profile = await performanceProfiler.createResourceProfile(mockBackend);

      expect(profile.backendId).toBe('mock-backend');
      expect(profile.baseline).toBeDefined();
      expect(profile.scalingFactors).toBeDefined();
      expect(profile.overhead).toBeGreaterThanOrEqual(0);
      expect(profile.efficiency).toBeGreaterThanOrEqual(0);
      expect(profile.patterns).toBeDefined();
    });
  });

  describe('Profile Management', () => {
    it('should retrieve performance profile', async () => {
      // First create a profile
      await performanceProfiler.profileBackend(mockBackend, 'face_detection', 'model1', 1);

      // Then retrieve it
      const profile = performanceProfiler.getPerformanceProfile('mock-backend', 'face_detection', 'model1');

      expect(profile).toBeDefined();
      expect(profile?.backendId).toBe('mock-backend');
      expect(profile?.taskType).toBe('face_detection');
      expect(profile?.modelId).toBe('model1');
    });

    it('should return null for non-existent profile', () => {
      const profile = performanceProfiler.getPerformanceProfile('non-existent', 'face_detection', 'model1');
      expect(profile).toBeNull();
    });

    it('should retrieve resource profile', async () => {
      // First create a profile
      await performanceProfiler.createResourceProfile(mockBackend);

      // Then retrieve it
      const profile = performanceProfiler.getResourceProfile('mock-backend');

      expect(profile).toBeDefined();
      expect(profile?.backendId).toBe('mock-backend');
    });

    it('should return null for non-existent resource profile', () => {
      const profile = performanceProfiler.getResourceProfile('non-existent');
      expect(profile).toBeNull();
    });
  });

  describe('Backend Comparison', () => {
    it('should compare backends successfully', async () => {
      // Create profiles for both backends
      await performanceProfiler.profileBackend(mockBackend, 'face_detection', 'model1', 1);

      const comparison = performanceProfiler.compareBackends(['mock-backend'], 'face_detection', 'model1');

      expect(comparison.comparison).toBeDefined();
      expect(comparison.comparison.length).toBe(1);
      expect(comparison.comparison[0].backendId).toBe('mock-backend');
      expect(comparison.winner).toBe('mock-backend');
    });

    it('should handle empty backend list', () => {
      const comparison = performanceProfiler.compareBackends([], 'face_detection', 'model1');

      expect(comparison.comparison).toHaveLength(0);
      expect(comparison.winner).toBeNull();
    });

    it('should handle backends without profiles', async () => {
      const comparison = performanceProfiler.compareBackends(['non-existent'], 'face_detection', 'model1');

      expect(comparison.comparison).toHaveLength(1);
      expect(comparison.comparison[0].backendId).toBe('non-existent');
      expect(comparison.comparison[0].performance).toBeNull();
    });
  });

  describe('Optimization Recommendations', () => {
    it('should generate optimization recommendations', async () => {
      // Create a profile with poor performance to trigger recommendations
      await performanceProfiler.profileBackend(mockBackend, 'face_detection', 'model1', 1);

      const recommendations = performanceProfiler.generateOptimizationRecommendations('mock-backend');

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle backend without recommendations', () => {
      const recommendations = performanceProfiler.generateOptimizationRecommendations('non-existent');
      expect(recommendations).toHaveLength(0);
    });

    it('should prioritize recommendations correctly', async () => {
      // Create a profile that would generate multiple recommendations
      const poorBackend = new MockBackend();
      poorBackend.id = 'poor-backend';
      poorBackend.performanceProfile = {
        inferenceTime: 1000, // High inference time
        memoryUsage: 300, // High memory usage
        throughput: 1, // Low throughput
        accuracy: 0.6 // Low accuracy
      };

      await poorBackend.initialize();
      await performanceProfiler.profileBackend(poorBackend, 'face_detection', 'model1', 1);

      const recommendations = performanceProfiler.generateOptimizationRecommendations('poor-backend');

      // Check that recommendations are sorted by priority
      if (recommendations.length > 1) {
        for (let i = 0; i < recommendations.length - 1; i++) {
          const currentPriority = recommendations[i].priority;
          const nextPriority = recommendations[i + 1].priority;
          const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
          expect(priorityOrder[currentPriority]).toBeGreaterThanOrEqual(priorityOrder[nextPriority]);
        }
      }

      await poorBackend.shutdown();
    });
  });

  describe('Performance Summary', () => {
    it('should generate performance summary', async () => {
      // Create a profile first
      await performanceProfiler.profileBackend(mockBackend, 'face_detection', 'model1', 1);

      const summary = performanceProfiler.getPerformanceSummary('mock-backend');

      expect(summary).toBeDefined();
      expect(summary.totalProfiles).toBeGreaterThan(0);
      expect(summary.averageMetrics).toBeDefined();
      expect(summary.averageMetrics.inferenceTime).toBeGreaterThanOrEqual(0);
      expect(summary.averageMetrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(summary.averageMetrics.throughput).toBeGreaterThanOrEqual(0);
      expect(summary.averageMetrics.accuracy).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty summary', () => {
      const summary = performanceProfiler.getPerformanceSummary('non-existent');

      expect(summary).toBeDefined();
      expect(summary.totalProfiles).toBe(0);
      expect(summary.averageMetrics.inferenceTime).toBe(0);
      expect(summary.averageMetrics.memoryUsage).toBe(0);
      expect(summary.averageMetrics.throughput).toBe(0);
      expect(summary.averageMetrics.accuracy).toBe(0);
    });

    it('should generate summary for all backends', async () => {
      // Create a profile first
      await performanceProfiler.profileBackend(mockBackend, 'face_detection', 'model1', 1);

      const summary = performanceProfiler.getPerformanceSummary();

      expect(summary).toBeDefined();
      expect(summary.totalProfiles).toBeGreaterThan(0);
      expect(summary.topPerforming).toBeDefined();
      expect(summary.mostEfficient).toBeDefined();
      expect(summary.trends).toBeDefined();
    });
  });

  describe('Profile Import/Export', () => {
    it('should export profiles', async () => {
      // Create a profile first
      await performanceProfiler.profileBackend(mockBackend, 'face_detection', 'model1', 1);

      const exportedData = performanceProfiler.exportProfiles();

      expect(typeof exportedData).toBe('string');
      expect(exportedData.length).toBeGreaterThan(0);

      // Should be valid JSON
      expect(() => JSON.parse(exportedData)).not.toThrow();
    });

    it('should import profiles', async () => {
      // Create a profile first
      await performanceProfiler.profileBackend(mockBackend, 'face_detection', 'model1', 1);

      // Export profiles
      const exportedData = performanceProfiler.exportProfiles();

      // Create a new profiler instance
      const newProfiler = new PerformanceProfiler();
      await newProfiler.initialize();

      // Import profiles
      const result = newProfiler.importProfiles(exportedData);

      expect(result).toBe(true);

      // Verify import worked
      const profile = newProfiler.getPerformanceProfile('mock-backend', 'face_detection', 'model1');
      expect(profile).toBeDefined();
    });

    it('should handle invalid import data', () => {
      const invalidData = 'invalid json';
      const result = performanceProfiler.importProfiles(invalidData);

      expect(result).toBe(false);
    });

    it('should handle empty import data', () => {
      const result = performanceProfiler.importProfiles('{}');
      expect(result).toBe(true); // Should succeed but import nothing
    });
  });

  describe('Performance Calculations', () => {
    it('should calculate performance scores correctly', async () => {
      // Create a profile first
      const profile = await performanceProfiler.profileBackend(mockBackend, 'face_detection', 'model1', 1);

      // Test score calculation through private method
      const scores = (performanceProfiler as any).calculatePerformanceScores(profile);

      expect(scores).toBeDefined();
      expect(scores.speed).toBeGreaterThanOrEqual(0);
      expect(scores.efficiency).toBeGreaterThanOrEqual(0);
      expect(scores.reliability).toBeGreaterThanOrEqual(0);
      expect(scores.overall).toBeGreaterThanOrEqual(0);
    });

    it('should analyze performance trends', async () => {
      // Create multiple profiles to analyze trends
      await performanceProfiler.profileBackend(mockBackend, 'face_detection', 'model1', 1);

      const trends = (performanceProfiler as any).analyzePerformanceTrends('mock-backend');

      expect(trends).toBeDefined();
      expect(['improving', 'stable', 'degrading']).toContain(trends.trend);
      expect(typeof trends.slope).toBe('number');
    });
  });
});