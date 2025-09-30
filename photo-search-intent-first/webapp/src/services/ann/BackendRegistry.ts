/**
 * Backend registration and discovery system
 */

import { BaseBackend } from './BackendInterface';
import {
  BackendCapability,
  ResourceRequirements,
  PerformanceMetrics,
  Model,
  ModelType,
  BackendHealth
} from './types';

export interface BackendInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: BackendCapability[];
  resourceRequirements: ResourceRequirements;
  performanceProfile: PerformanceMetrics;
  health: BackendHealth;
  models: string[];
  lastActivity: number;
  status: 'active' | 'inactive' | 'error';
  metadata: Record<string, any>;
}

export class BackendRegistry {
  private static instance: BackendRegistry;
  private backends: Map<string, BackendInfo> = new Map();
  private backendInstances: Map<string, BaseBackend> = new Map(); // backendId -> actual backend instance
  private capabilities: Map<string, string[]> = new Map(); // capability -> backendIds
  private models: Map<string, string[]> = new Map(); // modelId -> backendIds
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): BackendRegistry {
    if (!BackendRegistry.instance) {
      BackendRegistry.instance = new BackendRegistry();
    }
    return BackendRegistry.instance;
  }

  registerBackend(backendId: string, backend: BaseBackend): void {
    const backendInfo: BackendInfo = {
      id: backend.id,
      name: backend.name,
      version: backend.version,
      description: `${backend.name} v${backend.version}`,
      capabilities: backend.capabilities,
      resourceRequirements: backend.resourceRequirements,
      performanceProfile: backend.performanceProfile,
      health: backend.getHealth(),
      models: [],
      lastActivity: Date.now(),
      status: 'active',
      metadata: {
        framework: this.extractFramework(backend),
        initialized: true,
        registeredAt: Date.now()
      }
    };

    this.backends.set(backendId, backendInfo);
    this.backendInstances.set(backendId, backend);

    // Update capability index
    this.updateCapabilityIndex(backendId, backend.capabilities);

    // Update model index
    this.updateModelIndex(backendId, []);

    // Emit event
    this.emitEvent('backendRegistered', { backendId, backendInfo });

    console.log(`[BackendRegistry] Backend ${backendId} registered successfully`);
  }

  unregisterBackend(backendId: string): void {
    const backendInfo = this.backends.get(backendId);
    if (!backendInfo) {
      return;
    }

    // Remove from indexes
    this.removeFromIndexes(backendId);

    // Remove from registry
    this.backends.delete(backendId);
    this.backendInstances.delete(backendId);

    // Emit event
    this.emitEvent('backendUnregistered', { backendId, backendInfo });

    console.log(`[BackendRegistry] Backend ${backendId} unregistered successfully`);
  }

  /**
   * Clear all registered backends (useful for testing)
   */
  clearAllBackends(): void {
    this.backends.clear();
    this.backendInstances.clear();
    this.capabilities.clear();
    this.models.clear();
    console.log('[BackendRegistry] All backends cleared');
  }

  getBackend(backendId: string): BackendInfo | undefined {
    return this.backends.get(backendId);
  }

  getBackendInstance(backendId: string): BaseBackend | undefined {
    return this.backendInstances.get(backendId);
  }

  getAvailableBackends(): BackendInfo[] {
    return Array.from(this.backends.values()).filter(backend =>
      backend.status === 'active' &&
      (backend.health.status === 'healthy' || backend.health.status === 'degraded')
    );
  }

  getAllBackends(): BackendInfo[] {
    return Array.from(this.backends.values());
  }

  getActiveBackends(): BackendInfo[] {
    return Array.from(this.backends.values()).filter(backend => backend.status === 'active');
  }

  getBackendsByCapability(capabilityType: string, modelType?: string): BackendInfo[] {
    const backendIds = this.capabilities.get(capabilityType) || [];
    return backendIds
      .map(id => this.backends.get(id))
      .filter((backend): backend is BackendInfo =>
        backend !== undefined &&
        (modelType ? this.hasModelType(backend, modelType) : true)
      );
  }

  getBackendsByModel(modelId: string): BackendInfo[] {
    const backendIds = this.models.get(modelId) || [];
    return backendIds
      .map(id => this.backends.get(id))
      .filter((backend): backend is BackendInfo => backend !== undefined);
  }

  updateBackendHealth(backendId: string, health: BackendHealth): void {
    const backendInfo = this.backends.get(backendId);
    if (backendInfo) {
      backendInfo.health = health;
      backendInfo.lastActivity = Date.now();

      // Update status based on health
      if (health.status === 'unhealthy') {
        backendInfo.status = 'error';
      } else if (health.status === 'healthy') {
        backendInfo.status = 'active';
      }

      this.emitEvent('backendHealthUpdated', { backendId, health });
    }
  }

  updateBackendModels(backendId: string, models: string[]): void {
    const backendInfo = this.backends.get(backendId);
    if (backendInfo) {
      const oldModels = backendInfo.models;
      backendInfo.models = models;
      backendInfo.lastActivity = Date.now();

      // Update model index
      this.updateModelIndex(backendId, models, oldModels);

      this.emitEvent('backendModelsUpdated', { backendId, models });
    }
  }

  updateBackendPerformance(backendId: string, metrics: PerformanceMetrics): void {
    const backendInfo = this.backends.get(backendId);
    if (backendInfo) {
      backendInfo.performanceProfile = metrics;
      backendInfo.lastActivity = Date.now();

      this.emitEvent('backendPerformanceUpdated', { backendId, metrics });
    }
  }

  findOptimalBackend(
    taskType: string,
    modelType: string,
    constraints?: {
      maxMemory?: number;
      requireGPU?: boolean;
      preferredFrameworks?: string[];
    }
  ): BackendInfo | null {
    const candidates = this.getBackendsByCapability('inference', modelType)
      .filter(backend => {
        // Check if backend supports the specific task type
        return backend.capabilities.some(cap =>
          cap.type === 'inference' &&
          cap.modelTypes.some(model => model.framework === modelType)
        );
      });

    if (candidates.length === 0) {
      return null;
    }

    // Score candidates based on constraints
    const scoredCandidates = candidates.map(backend => {
      let score = 0;

      // Performance score (40%)
      const perfMetrics = backend.performanceProfile;
      const perfScore = this.calculatePerformanceScore(perfMetrics);
      score += perfScore * 0.4;

      // Resource score (30%)
      const resourceScore = this.calculateResourceScore(backend, constraints);
      score += resourceScore * 0.3;

      // Health score (20%)
      const healthScore = backend.health.status === 'healthy' ? 1 :
                         backend.health.status === 'degraded' ? 0.5 : 0;
      score += healthScore * 0.2;

      // Activity score (10%)
      const activityScore = this.calculateActivityScore(backend);
      score += activityScore * 0.1;

      return { backend, score };
    });

    // Sort by score and return best
    scoredCandidates.sort((a, b) => b.score - a.score);
    return scoredCandidates[0].backend;
  }

  getBackendStatistics(): {
    totalBackends: number;
    activeBackends: number;
    totalModels: number;
    averagePerformance: PerformanceMetrics;
    capabilityDistribution: Record<string, number>;
  } {
    const backends = Array.from(this.backends.values());
    const activeBackends = backends.filter(b => b.status === 'active');

    const totalModels = new Set<string>();
    backends.forEach(backend => {
      backend.models.forEach(model => totalModels.add(model));
    });

    const perfMetrics = backends.map(b => b.performanceProfile);
    const averagePerformance: PerformanceMetrics = {
      inferenceTime: this.average(perfMetrics.map(m => m.inferenceTime)),
      memoryUsage: this.average(perfMetrics.map(m => m.memoryUsage)),
      cpuUsage: this.average(perfMetrics.map(m => m.cpuUsage || 0)),
      gpuUsage: this.average(perfMetrics.map(m => m.gpuUsage || 0)),
      throughput: this.average(perfMetrics.map(m => m.throughput || 0))
    };

    const capabilityDistribution: Record<string, number> = {};
    backends.forEach(backend => {
      backend.capabilities.forEach(cap => {
        capabilityDistribution[cap.type] = (capabilityDistribution[cap.type] || 0) + 1;
      });
    });

    return {
      totalBackends: backends.length,
      activeBackends: activeBackends.length,
      totalModels: totalModels.size,
      averagePerformance,
      capabilityDistribution
    };
  }

  validateBackendConfiguration(backendInfo: BackendInfo): string[] {
    const errors: string[] = [];

    // Required fields
    if (!backendInfo.id) errors.push('Backend ID is required');
    if (!backendInfo.name) errors.push('Backend name is required');
    if (!backendInfo.version) errors.push('Backend version is required');
    if (!backendInfo.capabilities || backendInfo.capabilities.length === 0) {
      errors.push('At least one capability is required');
    }

    // Capability validation
    backendInfo.capabilities.forEach((cap, index) => {
      if (!cap.type) errors.push(`Capability ${index} type is required`);
      if (!cap.modelTypes || cap.modelTypes.length === 0) {
        errors.push(`Capability ${index} must have at least one model type`);
      }
    });

    // Resource requirements validation
    const reqs = backendInfo.resourceRequirements;
    if (!reqs.memory || reqs.memory.min <= 0) errors.push('Memory requirements must be positive');
    if (!reqs.cpu || reqs.cpu.min <= 0) errors.push('CPU requirements must be positive');

    // Performance metrics validation
    const perf = backendInfo.performanceProfile;
    if (!perf.inferenceTime || perf.inferenceTime <= 0) errors.push('Inference time must be positive');
    if (!perf.memoryUsage || perf.memoryUsage < 0) errors.push('Memory usage must be non-negative');

    return errors;
  }

  exportConfiguration(): {
    backends: BackendInfo[];
    capabilities: Record<string, string[]>;
    models: Record<string, string[]>;
    timestamp: number;
  } {
    return {
      backends: Array.from(this.backends.values()),
      capabilities: Object.fromEntries(this.capabilities),
      models: Object.fromEntries(this.models),
      timestamp: Date.now()
    };
  }

  importConfiguration(config: {
    backends: BackendInfo[];
    capabilities: Record<string, string[]>;
    models: Record<string, string[]>;
  }): void {
    // Clear existing data
    this.backends.clear();
    this.capabilities.clear();
    this.models.clear();

    // Import backends
    config.backends.forEach(backendInfo => {
      this.backends.set(backendInfo.id, backendInfo);
    });

    // Import indexes
    this.capabilities = new Map(Object.entries(config.capabilities));
    this.models = new Map(Object.entries(config.models));

    console.log(`[BackendRegistry] Imported configuration for ${config.backends.length} backends`);
  }

  // Event system
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[BackendRegistry] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Private helper methods
  private updateCapabilityIndex(backendId: string, capabilities: BackendCapability[]): void {
    capabilities.forEach(cap => {
      if (!this.capabilities.has(cap.type)) {
        this.capabilities.set(cap.type, []);
      }
      this.capabilities.get(cap.type)!.push(backendId);
    });
  }

  private updateModelIndex(backendId: string, models: string[], oldModels: string[] = []): void {
    // Remove old model associations
    oldModels.forEach(modelId => {
      const backendIds = this.models.get(modelId) || [];
      const index = backendIds.indexOf(backendId);
      if (index > -1) {
        backendIds.splice(index, 1);
      }
      if (backendIds.length === 0) {
        this.models.delete(modelId);
      }
    });

    // Add new model associations
    models.forEach(modelId => {
      if (!this.models.has(modelId)) {
        this.models.set(modelId, []);
      }
      this.models.get(modelId)!.push(backendId);
    });
  }

  private removeFromIndexes(backendId: string): void {
    // Remove from capability index
    for (const [capability, backendIds] of this.capabilities) {
      const index = backendIds.indexOf(backendId);
      if (index > -1) {
        backendIds.splice(index, 1);
      }
      if (backendIds.length === 0) {
        this.capabilities.delete(capability);
      }
    }

    // Remove from model index
    for (const [modelId, backendIds] of this.models) {
      const index = backendIds.indexOf(backendId);
      if (index > -1) {
        backendIds.splice(index, 1);
      }
      if (backendIds.length === 0) {
        this.models.delete(modelId);
      }
    }
  }

  private extractFramework(backend: BaseBackend): string {
    // Extract framework from backend class name or capabilities
    const className = backend.constructor.name.toLowerCase();

    if (className.includes('tensorflow')) return 'tensorflow';
    if (className.includes('pytorch')) return 'pytorch';
    if (className.includes('onnx')) return 'onnx';
    if (className.includes('transformer')) return 'transformer';
    if (className.includes('webgpu')) return 'webgpu';
    if (className.includes('webnn')) return 'webnn';

    return 'unknown';
  }

  private hasModelType(backend: BackendInfo, modelType: string): boolean {
    return backend.capabilities.some(cap =>
      cap.modelTypes.some(model => model.framework === modelType)
    );
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    // Normalize performance metrics (0-1 scale)
    const timeScore = Math.max(0, 1 - metrics.inferenceTime / 1000); // 1 second baseline
    const memoryScore = Math.max(0, 1 - metrics.memoryUsage / 100); // 100MB baseline
    const throughputScore = Math.min(1, metrics.throughput / 10); // 10 samples/second baseline

    return (timeScore + memoryScore + throughputScore) / 3;
  }

  private calculateResourceScore(backend: BackendInfo, constraints?: any): number {
    let score = 1;

    if (constraints?.maxMemory) {
      const memoryRatio = backend.resourceRequirements.memory.optimal / constraints.maxMemory;
      score *= Math.max(0, 1 - memoryRatio);
    }

    if (constraints?.requireGPU && !backend.resourceRequirements.gpu) {
      score *= 0.1; // Heavy penalty for missing GPU requirement
    }

    if (constraints?.preferredFrameworks) {
      const framework = this.extractFrameworkFromBackend(backend);
      if (constraints.preferredFrameworks.includes(framework)) {
        score *= 1.2; // Bonus for preferred framework
      }
    }

    return Math.min(1, score);
  }

  private calculateActivityScore(backend: BackendInfo): number {
    const timeSinceActivity = Date.now() - backend.lastActivity;
    const activityThreshold = 5 * 60 * 1000; // 5 minutes

    if (timeSinceActivity < activityThreshold) {
      return 1; // Recently active
    } else if (timeSinceActivity < activityThreshold * 2) {
      return 0.5; // Moderately active
    } else {
      return 0.1; // Inactive
    }
  }

  private extractFrameworkFromBackend(backend: BackendInfo): string {
    return backend.metadata?.framework || 'unknown';
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }
}