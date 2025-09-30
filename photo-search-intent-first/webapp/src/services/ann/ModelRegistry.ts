/**
 * Model Registry and Management System
 * Centralized system for managing AI models across all backends
 */

import type {
  Model,
  ModelConfig,
  ModelType,
  ModelCapability,
  PerformanceMetrics,
  BackendHealth
} from './types';
import { BackendRegistry } from './BackendRegistry';
import { ResourceMonitor } from './ResourceMonitor';
import { BackendFactory } from './adapters/BackendFactory';

export interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  format: 'tensorflow' | 'pytorch' | 'onnx' | 'transformer' | 'webgpu' | 'webnn';
  size: number; // bytes
  parameters: number;
  hash: string;
  checksum: string;
  createdAt: number;
  updatedAt: number;
  author?: string;
  license?: string;
  tags: string[];
  categories: string[];
  backendRequirements: {
    tensorflowjs?: boolean;
    pytorch?: boolean;
    onnx?: boolean;
    webgpu?: boolean;
    webnn?: boolean;
  };
  systemRequirements: {
    minMemoryMB: number;
    minCPU: number;
    minGPU?: number;
    minWebGLVersion?: number;
  };
  performance: {
    inferenceTime: number;
    memoryUsage: number;
    throughput: number;
    accuracy: number;
  };
  capabilities: ModelCapability[];
  inputShape?: number[];
  outputShape?: number[];
  supportedTasks: string[];
  metadata: Record<string, any>;
}

export interface ModelVersion {
  version: string;
  modelPath: string;
  configPath?: string;
  weightsPath?: string;
  metadataPath?: string;
  checksum: string;
  size: number;
  performance?: PerformanceMetrics;
  createdAt: number;
  isDefault: boolean;
  changelog?: string;
}

export interface ModelInstance {
  id: string;
  modelId: string;
  version: string;
  backendId: string;
  loaded: boolean;
  loadTime: number;
  memoryUsage: number;
  lastUsed: number;
  usageCount: number;
  performance?: PerformanceMetrics;
  health: 'healthy' | 'degraded' | 'unhealthy';
  error?: string;
}

export interface ModelSearchCriteria {
  taskType?: string;
  format?: string | string[];
  backend?: string | string[];
  maxMemoryMB?: number;
  minAccuracy?: number;
  maxInferenceTime?: number;
  tags?: string[];
  categories?: string[];
  capabilities?: string[];
}

export interface ModelUsageStats {
  modelId: string;
  version: string;
  backendId: string;
  totalInferences: number;
  totalTime: number;
  averageTime: number;
  successRate: number;
  errorCount: number;
  lastUsed: number;
  dailyUsage: Array<{
    date: string;
    count: number;
    time: number;
  }>;
}

export class ModelRegistry {
  private static instance: ModelRegistry;
  private models: Map<string, ModelMetadata> = new Map();
  private modelVersions: Map<string, ModelVersion[]> = new Map();
  private instances: Map<string, ModelInstance> = new Map();
  private usageStats: Map<string, ModelUsageStats> = new Map();
  private loadedModels: Map<string, Map<string, string>> = new Map(); // backend -> modelId -> instanceId
  private loadingQueue: Array<{ modelId: string; version: string; backendId: string }> = [];
  private maxConcurrentLoads = 2;
  private currentLoads = 0;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  /**
   * Register a new model in the registry
   */
  async registerModel(metadata: ModelMetadata): Promise<void> {
    // Validate metadata
    if (!metadata.id || !metadata.version || !metadata.format) {
      throw new Error('Invalid model metadata: missing required fields');
    }

    // Check if model already exists
    if (this.models.has(metadata.id)) {
      throw new Error(`Model ${metadata.id} already exists`);
    }

    // Validate system requirements
    const resourceMonitor = ResourceMonitor.getInstance();
    const currentResources = resourceMonitor.getCurrentResources();

    if (currentResources.totalMemory < metadata.systemRequirements.minMemoryMB) {
      console.warn(`[ModelRegistry] System memory (${currentResources.totalMemory}MB) below requirement (${metadata.systemRequirements.minMemoryMB}MB) for model ${metadata.id}`);
    }

    // Add model to registry
    this.models.set(metadata.id, metadata);
    this.modelVersions.set(metadata.id, []);

    console.log(`[ModelRegistry] Registered model: ${metadata.id} v${metadata.version}`);
  }

  /**
   * Add a version to an existing model
   */
  async addModelVersion(modelId: string, version: ModelVersion): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Validate version
    if (version.version === model.version) {
      throw new Error(`Version ${version.version} already exists as default version`);
    }

    // Check if version already exists
    const versions = this.modelVersions.get(modelId) || [];
    if (versions.some(v => v.version === version.version)) {
      throw new Error(`Version ${version.version} already exists for model ${modelId}`);
    }

    // Add version
    versions.push(version);
    this.modelVersions.set(modelId, versions);

    // Update model metadata
    model.updatedAt = Date.now();

    console.log(`[ModelRegistry] Added version ${version.version} to model ${modelId}`);
  }

  /**
   * Load a model instance
   */
  async loadModel(modelId: string, version?: string, backendId?: string): Promise<string> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Get version
    const targetVersion = version || model.version;
    const modelVersions = this.modelVersions.get(modelId) || [];
    const versionInfo = modelVersions.find(v => v.version === targetVersion);
    if (!versionInfo && targetVersion !== model.version) {
      throw new Error(`Version ${targetVersion} not found for model ${modelId}`);
    }

    // Select backend
    const selectedBackend = await this.selectBackend(modelId, backendId);
    if (!selectedBackend) {
      throw new Error(`No suitable backend found for model ${modelId}`);
    }

    // Check if already loaded
    const backendInstances = this.loadedModels.get(selectedBackend) || new Map();
    const existingInstance = backendInstances.get(modelId);
    if (existingInstance) {
      const instance = this.instances.get(existingInstance);
      if (instance && instance.version === targetVersion) {
        // Update usage
        instance.lastUsed = Date.now();
        instance.usageCount++;
        this.updateUsageStats(instance);
        return existingInstance;
      }
    }

    // Add to loading queue
    return this.queueModelLoad(modelId, targetVersion, selectedBackend);
  }

  /**
   * Queue model loading to limit concurrency
   */
  private async queueModelLoad(modelId: string, version: string, backendId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.loadingQueue.push({ modelId, version, backendId });
      this.processLoadingQueue();

      // Poll for completion
      const checkCompletion = () => {
        const instanceId = this.findLoadedInstance(modelId, version, backendId);
        if (instanceId) {
          resolve(instanceId);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    });
  }

  /**
   * Process the loading queue
   */
  private async processLoadingQueue(): Promise<void> {
    if (this.currentLoads >= this.maxConcurrentLoads || this.loadingQueue.length === 0) {
      return;
    }

    const loadRequest = this.loadingQueue.shift();
    if (!loadRequest) return;

    this.currentLoads++;
    try {
      await this.performModelLoad(loadRequest.modelId, loadRequest.version, loadRequest.backendId);
    } catch (error) {
      console.error(`[ModelRegistry] Failed to load model ${loadRequest.modelId}:`, error);
    } finally {
      this.currentLoads--;
      this.processLoadingQueue(); // Process next in queue
    }
  }

  /**
   * Perform actual model loading
   */
  private async performModelLoad(modelId: string, version: string, backendId: string): Promise<void> {
    const startTime = performance.now();
    const instanceId = `${modelId}_${version}_${backendId}_${Date.now()}`;

    try {
      const model = this.models.get(modelId)!;
      const backendRegistry = BackendRegistry.getInstance();
      const backend = backendRegistry.getBackendInstance(backendId);

      if (!backend) {
        throw new Error(`Backend ${backendId} not found`);
      }

      // Prepare model config
      const modelConfig: ModelConfig = {
        format: model.format,
        modelUrl: this.getModelPath(modelId, version),
        name: model.name,
        version: version,
        inputShape: model.inputShape,
        outputShape: model.outputShape,
        size: model.size,
        parameters: model.parameters,
        metadata: {
          ...model.metadata,
          registry: {
            instanceId,
            modelId,
            version,
            backendId
          }
        }
      };

      // Load model via backend
      const loadedModel = await backend.loadModel(modelId, modelConfig);

      // Create instance record
      const instance: ModelInstance = {
        id: instanceId,
        modelId,
        version,
        backendId,
        loaded: true,
        loadTime: performance.now() - startTime,
        memoryUsage: loadedModel.size || model.size,
        lastUsed: Date.now(),
        usageCount: 1,
        performance: loadedModel.metadata?.performance,
        health: 'healthy'
      };

      // Store instance
      this.instances.set(instanceId, instance);

      // Update backend instances mapping
      const backendInstances = this.loadedModels.get(backendId) || new Map();
      backendInstances.set(modelId, instanceId);
      this.loadedModels.set(backendId, backendInstances);

      // Initialize usage stats
      this.initUsageStats(instance);

      console.log(`[ModelRegistry] Loaded model ${modelId} v${version} on backend ${backendId} (${instance.loadTime.toFixed(2)}ms)`);
    } catch (error) {
      // Create failed instance record
      const instance: ModelInstance = {
        id: instanceId,
        modelId,
        version,
        backendId,
        loaded: false,
        loadTime: performance.now() - startTime,
        memoryUsage: 0,
        lastUsed: Date.now(),
        usageCount: 0,
        health: 'unhealthy',
        error: error instanceof Error ? error.message : String(error)
      };

      this.instances.set(instanceId, instance);
      throw error;
    }
  }

  /**
   * Unload a model instance
   */
  async unloadModel(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Model instance ${instanceId} not found`);
    }

    try {
      const backendRegistry = BackendRegistry.getInstance();
      const backend = backendRegistry.getBackendInstance(instance.backendId);

      if (backend) {
        await backend.unloadModel(instance.modelId);
      }

      // Remove from instances
      this.instances.delete(instanceId);

      // Remove from backend mapping
      const backendInstances = this.loadedModels.get(instance.backendId);
      if (backendInstances) {
        backendInstances.delete(instance.modelId);
        if (backendInstances.size === 0) {
          this.loadedModels.delete(instance.backendId);
        }
      }

      console.log(`[ModelRegistry] Unloaded model instance ${instanceId}`);
    } catch (error) {
      console.error(`[ModelRegistry] Error unloading model instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Search for models based on criteria
   */
  searchModels(criteria: ModelSearchCriteria): ModelMetadata[] {
    const results: ModelMetadata[] = [];

    for (const model of this.models.values()) {
      let matches = true;

      // Check task type
      if (criteria.taskType && !model.supportedTasks.includes(criteria.taskType)) {
        matches = false;
      }

      // Check format
      if (criteria.format) {
        const formats = Array.isArray(criteria.format) ? criteria.format : [criteria.format];
        if (!formats.includes(model.format)) {
          matches = false;
        }
      }

      // Check backend compatibility
      if (criteria.backend) {
        const backends = Array.isArray(criteria.backend) ? criteria.backend : [criteria.backend];
        const hasCompatibleBackend = backends.some(backend =>
          model.backendRequirements[backend as keyof typeof model.backendRequirements]
        );
        if (!hasCompatibleBackend) {
          matches = false;
        }
      }

      // Check memory requirements
      if (criteria.maxMemoryMB && model.systemRequirements.minMemoryMB > criteria.maxMemoryMB) {
        matches = false;
      }

      // Check accuracy requirements
      if (criteria.minAccuracy && model.performance.accuracy < criteria.minAccuracy) {
        matches = false;
      }

      // Check inference time requirements
      if (criteria.maxInferenceTime && model.performance.inferenceTime > criteria.maxInferenceTime) {
        matches = false;
      }

      // Check tags
      if (criteria.tags && !criteria.tags.some(tag => model.tags.includes(tag))) {
        matches = false;
      }

      // Check categories
      if (criteria.categories && !criteria.categories.some(category => model.categories.includes(category))) {
        matches = false;
      }

      // Check capabilities
      if (criteria.capabilities) {
        const hasCapability = criteria.capabilities.some(capability =>
          model.capabilities.some(cap => cap.type === capability)
        );
        if (!hasCapability) {
          matches = false;
        }
      }

      if (matches) {
        results.push(model);
      }
    }

    // Sort by relevance (could implement more sophisticated ranking)
    return results.sort((a, b) => {
      // Prefer more accurate models
      if (a.performance.accuracy !== b.performance.accuracy) {
        return b.performance.accuracy - a.performance.accuracy;
      }
      // Then prefer faster models
      if (a.performance.inferenceTime !== b.performance.inferenceTime) {
        return a.performance.inferenceTime - b.performance.inferenceTime;
      }
      // Then prefer smaller models
      return a.size - b.size;
    });
  }

  /**
   * Get model information
   */
  getModel(modelId: string): ModelMetadata | null {
    return this.models.get(modelId) || null;
  }

  /**
   * Get all model versions
   */
  getModelVersions(modelId: string): ModelVersion[] {
    return this.modelVersions.get(modelId) || [];
  }

  /**
   * Get loaded instances
   */
  getLoadedInstances(): ModelInstance[] {
    return Array.from(this.instances.values()).filter(instance => instance.loaded);
  }

  /**
   * Get model usage statistics
   */
  getUsageStats(modelId?: string): ModelUsageStats[] {
    if (modelId) {
      const stats = Array.from(this.usageStats.values()).filter(stat => stat.modelId === modelId);
      return stats;
    }
    return Array.from(this.usageStats.values());
  }

  /**
   * Get model recommendations for task
   */
  getRecommendedModels(taskType: string, constraints?: {
    maxMemoryMB?: number;
    maxInferenceTime?: number;
    minAccuracy?: number;
    preferredBackend?: string;
  }): ModelMetadata[] {
    const criteria: ModelSearchCriteria = {
      taskType,
      maxMemoryMB: constraints?.maxMemoryMB,
      maxInferenceTime: constraints?.maxInferenceTime,
      minAccuracy: constraints?.minAccuracy,
      backend: constraints?.preferredBackend
    };

    const models = this.searchModels(criteria);

    // Apply additional ranking based on task-specific requirements
    return models.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Update usage statistics
   */
  updateUsageStats(instance: ModelInstance): void {
    let stats = this.usageStats.get(instance.id);
    if (!stats) {
      stats = this.initUsageStats(instance);
    }

    stats.lastUsed = Date.now();
    stats.totalInferences++;
    this.usageStats.set(instance.id, stats);
  }

  /**
   * Record inference performance
   */
  recordInference(instanceId: string, inferenceTime: number, success: boolean): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    let stats = this.usageStats.get(instanceId);
    if (!stats) {
      stats = this.initUsageStats(instance);
    }

    stats.totalInferences++;
    stats.totalTime += inferenceTime;
    stats.averageTime = stats.totalTime / stats.totalInferences;

    if (success) {
      // Update success rate
      const successCount = stats.totalInferences - stats.errorCount;
      stats.successRate = successCount / stats.totalInferences;
    } else {
      stats.errorCount++;
      stats.successRate = (stats.totalInferences - stats.errorCount) / stats.totalInferences;
    }

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    const dailyEntry = stats.dailyUsage.find(d => d.date === today);
    if (dailyEntry) {
      dailyEntry.count++;
      dailyEntry.time += inferenceTime;
    } else {
      stats.dailyUsage.push({ date: today, count: 1, time: inferenceTime });
    }

    this.usageStats.set(instanceId, stats);
  }

  /**
   * Get system resource usage by loaded models
   */
  getSystemResourceUsage(): {
    totalMemoryMB: number;
    totalInstances: number;
    backendDistribution: Record<string, number>;
    modelDistribution: Record<string, number>;
  } {
    const instances = this.getLoadedInstances();
    const totalMemoryMB = instances.reduce((sum, instance) => sum + instance.memoryUsage, 0);
    const totalInstances = instances.length;

    const backendDistribution: Record<string, number> = {};
    const modelDistribution: Record<string, number> = {};

    for (const instance of instances) {
      backendDistribution[instance.backendId] = (backendDistribution[instance.backendId] || 0) + 1;
      modelDistribution[instance.modelId] = (modelDistribution[instance.modelId] || 0) + 1;
    }

    return {
      totalMemoryMB,
      totalInstances,
      backendDistribution,
      modelDistribution
    };
  }

  /**
   * Optimize loaded models based on usage patterns
   */
  async optimizeLoadedModels(): Promise<void> {
    const instances = this.getLoadedInstances();
    const now = Date.now();
    const unusedThreshold = 30 * 60 * 1000; // 30 minutes

    // Unload unused models
    for (const instance of instances) {
      if (now - instance.lastUsed > unusedThreshold && instance.usageCount < 5) {
        console.log(`[ModelRegistry] Unloading unused model: ${instance.id}`);
        await this.unloadModel(instance.id);
      }
    }

    // Pre-load frequently used models
    const frequentModels = Array.from(this.usageStats.values())
      .filter(stats => stats.totalInferences > 100)
      .sort((a, b) => b.totalInferences - a.totalInferences)
      .slice(0, 3);

    for (const stats of frequentModels) {
      const instance = this.instances.get(stats.modelId);
      if (!instance) {
        try {
          await this.loadModel(stats.modelId);
          console.log(`[ModelRegistry] Pre-loaded frequent model: ${stats.modelId}`);
        } catch (error) {
          console.error(`[ModelRegistry] Failed to pre-load model ${stats.modelId}:`, error);
        }
      }
    }
  }

  /**
   * Export registry data
   */
  exportRegistry(): {
    models: ModelMetadata[];
    versions: Record<string, ModelVersion[]>;
    instances: ModelInstance[];
    usageStats: ModelUsageStats[];
  } {
    return {
      models: Array.from(this.models.values()),
      versions: Object.fromEntries(this.modelVersions),
      instances: Array.from(this.instances.values()),
      usageStats: Array.from(this.usageStats.values())
    };
  }

  /**
   * Import registry data
   */
  importRegistry(data: {
    models: ModelMetadata[];
    versions: Record<string, ModelVersion[]>;
    instances?: ModelInstance[];
    usageStats?: ModelUsageStats[];
  }): void {
    // Clear existing data
    this.models.clear();
    this.modelVersions.clear();
    this.instances.clear();
    this.usageStats.clear();
    this.loadedModels.clear();

    // Import models
    for (const model of data.models) {
      this.models.set(model.id, model);
    }

    // Import versions
    for (const [modelId, versions] of Object.entries(data.versions)) {
      this.modelVersions.set(modelId, versions);
    }

    // Import instances if provided
    if (data.instances) {
      for (const instance of data.instances) {
        this.instances.set(instance.id, instance);
        if (instance.loaded) {
          const backendInstances = this.loadedModels.get(instance.backendId) || new Map();
          backendInstances.set(instance.modelId, instance.id);
          this.loadedModels.set(instance.backendId, backendInstances);
        }
      }
    }

    // Import usage stats if provided
    if (data.usageStats) {
      for (const stats of data.usageStats) {
        this.usageStats.set(stats.modelId, stats);
      }
    }

    console.log(`[ModelRegistry] Imported ${data.models.length} models`);
  }

  // Helper methods
  private async selectBackend(modelId: string, preferredBackend?: string): Promise<string | null> {
    const model = this.models.get(modelId)!;
    const backendRegistry = BackendRegistry.getInstance();

    // If preferred backend is specified and compatible, use it
    if (preferredBackend) {
      const backend = backendRegistry.getBackend(preferredBackend);
      if (backend && backend.status === 'active' && backend.health.status !== 'unhealthy') {
        return preferredBackend;
      }
    }

    // Find optimal backend based on model requirements and system resources
    const availableBackends = backendRegistry.getAvailableBackends();
    const resourceMonitor = ResourceMonitor.getInstance();
    const currentResources = resourceMonitor.getCurrentResources();

    // Score backends based on compatibility and performance
    const scoredBackends = availableBackends
      .filter(backend => {
        const requirementKey = this.getRequirementKeyForBackend(backend.id);
        if (!requirementKey) {
          return true;
        }
        return model.backendRequirements[requirementKey] ?? false;
      })
      .map(backend => {
        const health = backend.health;
        let score = 0;

        // Health score
        if (health.status === 'healthy') {
          score += 100;
        } else if (health.status === 'degraded') {
          score += 70;
        } else {
          score += 30;
        }

        score += Math.max(0, 100 - health.errorRate * 10);

        // Resource availability
        const memoryBaseline = model.systemRequirements.minMemoryMB || 1;
        const resourceScore = Math.min(100, (currentResources.availableMemory / memoryBaseline) * 50);
        score += resourceScore;

        return { backend, score };
      })
      .sort((a, b) => b.score - a.score);

    return scoredBackends[0]?.backend.id || null;
  }

  private getModelPath(modelId: string, version: string): string {
    // In a real implementation, this would return the actual model file path
    return `/models/${modelId}/${version}/model`;
  }

  private getRequirementKeyForBackend(backendId: string): keyof ModelMetadata['backendRequirements'] | null {
    const normalizedId = backendId.toLowerCase();

    if (normalizedId.includes('tensorflow')) {
      return 'tensorflowjs';
    }
    if (normalizedId.includes('pytorch')) {
      return 'pytorch';
    }
    if (normalizedId.includes('onnx')) {
      return 'onnx';
    }
    if (normalizedId.includes('webgpu')) {
      return 'webgpu';
    }
    if (normalizedId.includes('webnn')) {
      return 'webnn';
    }

    return null;
  }

  private findLoadedInstance(modelId: string, version: string, backendId: string): string | null {
    const backendInstances = this.loadedModels.get(backendId);
    if (!backendInstances) return null;

    const instanceId = backendInstances.get(modelId);
    if (!instanceId) return null;

    const instance = this.instances.get(instanceId);
    if (instance && instance.version === version && instance.loaded) {
      return instanceId;
    }

    return null;
  }

  private initUsageStats(instance: ModelInstance): ModelUsageStats {
    const stats: ModelUsageStats = {
      modelId: instance.modelId,
      version: instance.version,
      backendId: instance.backendId,
      totalInferences: 0,
      totalTime: 0,
      averageTime: 0,
      successRate: 1.0,
      errorCount: 0,
      lastUsed: Date.now(),
      dailyUsage: []
    };

    this.usageStats.set(instance.id, stats);
    return stats;
  }
}
