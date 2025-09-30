/**
 * Standardized interface for all ANN backends
 */

import {
  ANNBackend,
  ModelConfig,
  InferenceInput,
  InferenceOutput,
  BackendCapability,
  ResourceRequirements,
  PerformanceMetrics,
  BackendHealth,
  Model
} from './types';

export abstract class BaseBackend implements ANNBackend {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly version: string;
  public abstract readonly capabilities: BackendCapability[];
  public abstract readonly resourceRequirements: ResourceRequirements;
  public abstract readonly performanceProfile: PerformanceMetrics;

  protected models: Map<string, Model> = new Map();
  protected isInitialized = false;
  protected health: BackendHealth = {
    status: 'unknown',
    lastCheck: 0,
    uptime: 0,
    errorRate: 0,
    responseTime: 0,
    activeConnections: 0,
    resourceUsage: {
      memory: 0,
      cpu: 0,
      storage: 0
    }
  };

  // Lifecycle methods
  public abstract initialize(): Promise<boolean>;
  public abstract shutdown(): Promise<void>;
  public abstract isAvailable(): boolean;
  public abstract getHealth(): BackendHealth;

  // Model management
  public abstract loadModel(modelId: string, config: ModelConfig): Promise<Model>;
  public abstract unloadModel(modelId: string): Promise<void>;
  public abstract listModels(): Promise<string[]>;

  // Inference methods
  public abstract runInference(modelId: string, input: InferenceInput): Promise<InferenceOutput>;
  public abstract runBatchInference(modelId: string, inputs: InferenceInput[]): Promise<InferenceOutput[]>;

  // Performance optimization
  public abstract optimizeForTask(taskType: string): Promise<void>;
  public abstract getPerformanceMetrics(): PerformanceMetrics;

  // Utility methods
  public hasCapability(type: string, modelType: string): boolean {
    return this.capabilities.some(cap =>
      cap.type === type && cap.modelTypes.some(model => model.framework === modelType)
    );
  }

  public canHandleModel(model: Model): boolean {
    return this.capabilities.some(cap =>
      cap.modelTypes.some(supported => supported.framework === model.framework)
    );
  }

  public getResourceEstimate(modelId: string, inputSize: number): ResourceRequirements {
    const baseReqs = this.resourceRequirements;
    const scaling = Math.max(1, inputSize / 1000); // Scale per 1000 units

    return {
      memory: {
        min: baseReqs.memory.min * scaling,
        max: baseReqs.memory.max * scaling,
        optimal: baseReqs.memory.optimal * scaling
      },
      cpu: {
        min: baseReqs.cpu.min * scaling,
        max: baseReqs.cpu.max * scaling,
        optimal: baseReqs.cpu.optimal * scaling
      },
      gpu: baseReqs.gpu ? {
        min: baseReqs.gpu.min * scaling,
        max: baseReqs.gpu.max * scaling,
        optimal: baseReqs.gpu.optimal * scaling
      } : undefined,
      storage: baseReqs.storage,
      network: baseReqs.network
    };
  }

  protected updateHealth(status: BackendHealth['status'], errorRate?: number): void {
    this.health = {
      ...this.health,
      status,
      lastCheck: Date.now(),
      errorRate: errorRate || this.health.errorRate,
      uptime: status === 'healthy' ? Date.now() : this.health.uptime
    };
  }

  protected validateInput(input: InferenceInput, model: Model): boolean {
    // Basic validation - can be extended by specific backends
    if (!input || !input.data) {
      return false;
    }

    // Check if model supports the input format
    const supportedFormat = this.capabilities.some(cap =>
      cap.inputFormats.some(fmt => fmt.type === input.format.type)
    );

    return supportedFormat;
  }

  protected async measurePerformance<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    const startMemory = this.getCurrentMemoryUsage();
    const startCPU = this.getCurrentCPUUsage();

    try {
      const result = await operation();
      const endTime = performance.now();
      const endMemory = this.getCurrentMemoryUsage();
      const endCPU = this.getCurrentCPUUsage();

      const metrics: PerformanceMetrics = {
        inferenceTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        cpuUsage: endCPU - startCPU,
        throughput: 1000 / (endTime - startTime) // rough throughput estimate
      };

      this.logPerformance(operationName, metrics);
      return { result, metrics };
    } catch (error) {
      const endTime = performance.now();
      const endMemory = this.getCurrentMemoryUsage();
      const endCPU = this.getCurrentCPUUsage();

      const metrics: PerformanceMetrics = {
        inferenceTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        cpuUsage: endCPU - startCPU,
        throughput: 0
      };

      this.logPerformance(operationName, metrics, error);
      throw error;
    }
  }

  protected getCurrentMemoryUsage(): number {
    // Default implementation - should be overridden by specific backends
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 0;
  }

  protected getCurrentCPUUsage(): number {
    // Default implementation - should be overridden by specific backends
    return 0;
  }

  private logPerformance(operation: string, metrics: PerformanceMetrics, error?: any): void {
    const logLevel = error ? 'error' : 'info';
    const message = error ? `${operation} failed` : `${operation} completed`;

    console[logLevel](`[${this.name}] ${message}`, {
      operation,
      metrics,
      error: error?.message
    });

    // Update health based on performance
    if (metrics.inferenceTime > 5000) { // 5 seconds threshold
      this.updateHealth('degraded', this.health.errorRate + 0.1);
    }
  }
}

// Factory function for creating backend instances
export type BackendFactory = () => Promise<BaseBackend>;

// Registry for backend factories
export class BackendFactoryRegistry {
  private static instance: BackendFactoryRegistry;
  private factories: Map<string, BackendFactory> = new Map();

  static getInstance(): BackendFactoryRegistry {
    if (!BackendFactoryRegistry.instance) {
      BackendFactoryRegistry.instance = new BackendFactoryRegistry();
    }
    return BackendFactoryRegistry.instance;
  }

  register(backendId: string, factory: BackendFactory): void {
    this.factories.set(backendId, factory);
  }

  unregister(backendId: string): void {
    this.factories.delete(backendId);
  }

  getFactory(backendId: string): BackendFactory | undefined {
    return this.factories.get(backendId);
  }

  getRegisteredBackends(): string[] {
    return Array.from(this.factories.keys());
  }

  async createBackend(backendId: string): Promise<BaseBackend | null> {
    const factory = this.factories.get(backendId);
    if (!factory) {
      console.error(`No factory registered for backend: ${backendId}`);
      return null;
    }

    try {
      return await factory();
    } catch (error) {
      console.error(`Failed to create backend ${backendId}:`, error);
      return null;
    }
  }
}