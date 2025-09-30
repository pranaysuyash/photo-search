/**
 * TensorFlow.js Backend Adapter
 * Implements the BaseBackend interface for TensorFlow.js models
 */

import { BaseBackend } from '../BackendInterface';
import type {
  Model,
  ModelConfig,
  InferenceInput,
  InferenceOutput,
  PerformanceMetrics,
  ResourceRequirements,
  BackendHealth,
  BackendCapability
} from './types';

export class TensorFlowJSBackend extends BaseBackend {
  readonly id: string;
  readonly name = 'TensorFlow.js Backend';
  readonly version = '1.0.0';

  constructor(id?: string) {
    super();
    this.id = id || 'tensorflowjs';
  }
  readonly capabilities: BackendCapability[] = [
    {
      type: 'inference',
      modelTypes: ['tensorflow', 'keras', 'tfjs'],
      inputFormats: ['tensor', 'image', 'array'],
      outputFormats: ['tensor', 'array'],
      maxInputSize: 1024 * 1024 * 10, // 10MB
      classes: ['image-classification', 'object-detection', 'face-detection', 'embedding'],
      performance: { throughput: 50, latency: 100 },
      confidence: 0.85
    },
    {
      type: 'training',
      modelTypes: ['tensorflow', 'keras'],
      inputFormats: ['tensor', 'array'],
      outputFormats: ['model'],
      classes: ['transfer-learning', 'fine-tuning'],
      performance: { throughput: 5, latency: 5000 },
      confidence: 0.75
    }
  ];
  readonly resourceRequirements: ResourceRequirements = {
    memory: { min: 256, max: 2048, optimal: 512 },
    cpu: { min: 10, max: 80, optimal: 30 },
    gpu: { min: 0, max: 4096, optimal: 1024 }
  };
  readonly performanceProfile: PerformanceMetrics = {
    inferenceTime: 150,
    memoryUsage: 300,
    throughput: 30,
    accuracy: 0.88
  };

  private tf: any = null;
  private models: Map<string, any> = new Map();
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      // Dynamically import TensorFlow.js
      this.tf = await import('@tensorflow/tfjs');

      // Check for WebGL backend
      if (this.tf.engine()) {
        console.log('[TensorFlowJS] WebGL backend detected');
      } else {
        console.log('[TensorFlowJS] Using CPU backend');
      }

      this.isInitialized = true;
      this.health.status = 'healthy';
      this.health.lastCheck = Date.now();
      console.log('[TensorFlowJS] Backend initialized successfully');
      return true;
    } catch (error) {
      console.error('[TensorFlowJS] Failed to initialize:', error);
      this.health.status = 'unhealthy';
      this.health.error = error instanceof Error ? error.message : String(error);

      // If TensorFlow.js is not available, we can still proceed in a limited mode
      if (error instanceof Error && error.message.includes('Cannot resolve module')) {
        console.warn('[TensorFlowJS] TensorFlow.js not installed - backend will run in simulation mode');
        this.isInitialized = true;
        this.health.status = 'degraded';
        return true; // Allow initialization in simulation mode
      }

      return false;
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Dispose all models
      for (const [modelId, model] of this.models) {
        if (model && model.dispose) {
          model.dispose();
        }
      }
      this.models.clear();

      // Dispose TensorFlow.js engine
      if (this.tf && this.tf.engine) {
        this.tf.engine().dispose();
      }

      this.isInitialized = false;
      this.health.status = 'shutdown';
      console.log('[TensorFlowJS] Backend shutdown successfully');
    } catch (error) {
      console.error('[TensorFlowJS] Error during shutdown:', error);
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.health.status === 'healthy';
  }

  getHealth(): BackendHealth {
    const currentHealth = { ...this.health };
    currentHealth.lastCheck = Date.now();

    // Update health based on TensorFlow.js status
    if (this.isInitialized && this.tf) {
      try {
        const engine = this.tf.engine();
        currentHealth.activeConnections = this.models.size;
        currentHealth.resourceUsage = {
          memory: engine.memory ? engine.memory.numBytes / 1024 / 1024 : 0,
          cpu: 0,
          storage: 0
        };
      } catch (error) {
        currentHealth.status = 'degraded';
        currentHealth.error = error instanceof Error ? error.message : String(error);
      }
    }

    return currentHealth;
  }

  async loadModel(modelId: string, modelConfig: ModelConfig): Promise<Model> {
    if (!this.isInitialized) {
      throw new Error('TensorFlow.js backend not initialized');
    }

    try {
      let model: any;

      switch (modelConfig.format) {
        case 'tfjs':
          // Load TensorFlow.js model
          const modelUrl = modelConfig.modelUrl || `/models/${modelId}/model.json`;
          model = await this.tf.loadLayersModel(modelUrl);
          break;

        case 'keras':
          // Convert and load Keras model
          // Note: This would require additional conversion logic
          throw new Error('Keras model loading not yet implemented');

        case 'graph':
          // Load TensorFlow Graph model
          const graphUrl = modelConfig.modelUrl || `/models/${modelId}/model.json`;
          model = await this.tf.loadGraphModel(graphUrl);
          break;

        default:
          throw new Error(`Unsupported model format: ${modelConfig.format}`);
      }

      // Warm up the model
      const inputShape = modelConfig.inputShape || [1, 224, 224, 3];
      const warmupInput = this.tf.zeros(inputShape);
      await model.predict(warmupInput);
      warmupInput.dispose();

      this.models.set(modelId, model);

      const modelInfo: Model = {
        id: modelId,
        name: modelConfig.name || modelId,
        version: modelConfig.version || '1.0.0',
        format: modelConfig.format,
        inputShape: modelConfig.inputShape || inputShape,
        outputShape: modelConfig.outputShape,
        size: modelConfig.size || 0,
        parameters: modelConfig.parameters || 0,
        loaded: true,
        metadata: {
          ...modelConfig.metadata,
          backend: 'tensorflowjs',
          loadedAt: Date.now()
        }
      };

      console.log(`[TensorFlowJS] Model ${modelId} loaded successfully`);
      return modelInfo;
    } catch (error) {
      console.error(`[TensorFlowJS] Failed to load model ${modelId}:`, error);
      throw error;
    }
  }

  async unloadModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (model) {
      if (model.dispose) {
        model.dispose();
      }
      this.models.delete(modelId);
      console.log(`[TensorFlowJS] Model ${modelId} unloaded`);
    }
  }

  async listModels(): Promise<string[]> {
    return Array.from(this.models.keys());
  }

  async runInference(modelId: string, input: InferenceInput): Promise<InferenceOutput> {
    if (!this.models.has(modelId)) {
      throw new Error(`Model ${modelId} not loaded`);
    }

    const model = this.models.get(modelId);
    const startTime = performance.now();

    try {
      let tfInput: any;

      // Convert input to TensorFlow.js tensor
      switch (input.format.type) {
        case 'tensor':
          tfInput = this.tf.tensor(input.data, input.format.shape);
          break;
        case 'image':
          // Convert image to tensor
          const imageData = await this.preprocessImage(input.data);
          tfInput = imageData;
          break;
        case 'array':
          tfInput = this.tf.tensor(input.data);
          break;
        default:
          throw new Error(`Unsupported input format: ${input.format.type}`);
      }

      // Run inference
      const predictions = model.predict(tfInput);

      // Convert predictions to output format
      let outputData: any;
      if (Array.isArray(predictions)) {
        outputData = await Promise.all(predictions.map((pred: any) => pred.data()));
      } else {
        outputData = await predictions.data();
      }

      // Clean up tensors
      tfInput.dispose();
      if (Array.isArray(predictions)) {
        predictions.forEach((pred: any) => pred.dispose());
      } else {
        predictions.dispose();
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      return {
        data: outputData,
        format: {
          type: 'tensor',
          dtype: 'float32',
          shape: Array.isArray(outputData) ? outputData.map((d: any) => d.length) : [outputData.length]
        },
        processingTime,
        confidence: this.calculateConfidence(outputData),
        metadata: {
          backend: 'tensorflowjs',
          modelId,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error(`[TensorFlowJS] Inference failed for model ${modelId}:`, error);
      throw error;
    }
  }

  async runBatchInference(modelId: string, inputs: InferenceInput[]): Promise<InferenceOutput[]> {
    if (!this.models.has(modelId)) {
      throw new Error(`Model ${modelId} not loaded`);
    }

    const model = this.models.get(modelId);
    const startTime = performance.now();

    try {
      // Prepare batch input
      const batchInputs: any[] = [];
      for (const input of inputs) {
        let tfInput: any;

        switch (input.format.type) {
          case 'tensor':
            tfInput = this.tf.tensor(input.data, input.format.shape);
            break;
          case 'image':
            const imageData = await this.preprocessImage(input.data);
            tfInput = imageData;
            break;
          case 'array':
            tfInput = this.tf.tensor(input.data);
            break;
          default:
            throw new Error(`Unsupported input format: ${input.format.type}`);
        }

        batchInputs.push(tfInput);
      }

      // Stack inputs for batch processing
      const batchTensor = this.tf.stack(batchInputs);

      // Run batch inference
      const batchPredictions = model.predict(batchTensor);

      // Process batch outputs
      const outputs: InferenceOutput[] = [];
      const batchSize = inputs.length;

      if (Array.isArray(batchPredictions)) {
        // Handle multi-output models
        for (let i = 0; i < batchSize; i++) {
          const outputData: any[] = [];
          for (const pred of batchPredictions) {
            const slice = pred.slice([i], [1]);
            outputData.push(await slice.data());
            slice.dispose();
          }

          outputs.push({
            data: outputData,
            format: {
              type: 'tensor',
              dtype: 'float32',
              shape: outputData.map((d: any) => d.length)
            },
            processingTime: (performance.now() - startTime) / batchSize,
            confidence: this.calculateConfidence(outputData),
            metadata: {
              backend: 'tensorflowjs',
              modelId,
              batchIndex: i,
              timestamp: Date.now()
            }
          });
        }
      } else {
        // Handle single-output models
        const outputData = await batchPredictions.data();
        const outputShape = batchPredictions.shape;
        const outputSize = outputShape.reduce((a: number, b: number) => a * b, 1) / batchSize;

        for (let i = 0; i < batchSize; i++) {
          const startIndex = i * outputSize;
          const endIndex = startIndex + outputSize;
          const individualOutput = outputData.slice(startIndex, endIndex);

          outputs.push({
            data: individualOutput,
            format: {
              type: 'tensor',
              dtype: 'float32',
              shape: [outputSize]
            },
            processingTime: (performance.now() - startTime) / batchSize,
            confidence: this.calculateConfidence(individualOutput),
            metadata: {
              backend: 'tensorflowjs',
              modelId,
              batchIndex: i,
              timestamp: Date.now()
            }
          });
        }
      }

      // Clean up tensors
      batchInputs.forEach(input => input.dispose());
      batchTensor.dispose();
      if (Array.isArray(batchPredictions)) {
        batchPredictions.forEach((pred: any) => pred.dispose());
      } else {
        batchPredictions.dispose();
      }

      return outputs;
    } catch (error) {
      console.error(`[TensorFlowJS] Batch inference failed for model ${modelId}:`, error);
      throw error;
    }
  }

  async optimizeForTask(taskType: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('TensorFlow.js backend not initialized');
    }

    try {
      switch (taskType) {
        case 'face_detection':
          // Optimize for face detection tasks
          await this.optimizeForFaceDetection();
          break;
        case 'image_embedding':
          // Optimize for embedding generation
          await this.optimizeForEmbedding();
          break;
        case 'object_detection':
          // Optimize for object detection
          await this.optimizeForObjectDetection();
          break;
        default:
          console.log(`[TensorFlowJS] No specific optimization for task: ${taskType}`);
      }
    } catch (error) {
      console.error(`[TensorFlowJS] Optimization failed for task ${taskType}:`, error);
      throw error;
    }
  }

  getPerformanceMetrics(): PerformanceMetrics {
    if (!this.isInitialized || !this.tf) {
      return this.performanceProfile;
    }

    try {
      const engine = this.tf.engine();
      const memory = engine.memory;

      return {
        ...this.performanceProfile,
        memoryUsage: memory ? memory.numBytes / 1024 / 1024 : this.performanceProfile.memoryUsage,
        timestamp: Date.now()
      };
    } catch (error) {
      return this.performanceProfile;
    }
  }

  private async preprocessImage(imageData: any): Promise<any> {
    // Convert image data to tensor and preprocess
    let imageTensor: any;

    if (typeof imageData === 'string') {
      // Assume it's a data URL or image path
      imageTensor = await this.tf.browser.fromPixels(imageData);
    } else if (imageData instanceof HTMLImageElement || imageData instanceof HTMLCanvasElement) {
      imageTensor = this.tf.browser.fromPixels(imageData);
    } else {
      // Assume it's already tensor data
      imageTensor = this.tf.tensor(imageData);
    }

    // Normalize to [0, 1] and add batch dimension
    const normalized = imageTensor.toFloat().div(255.0);
    const batched = normalized.expandDims(0);

    return batched;
  }

  private calculateConfidence(data: any): number {
    // Simple confidence calculation based on max probability
    if (Array.isArray(data)) {
      const max = Math.max(...data);
      return Math.min(max, 1.0);
    }
    return 0.5; // Default confidence
  }

  private async optimizeForFaceDetection(): Promise<void> {
    // Optimize models for face detection
    console.log('[TensorFlowJS] Optimizing for face detection');

    // Set TensorFlow.js environment for face detection
    this.tf.env().set('WEBGL_FORCE_FLOAT32', true);
    this.tf.env().set('WEBGL_SIZE_UPLOAD_THRESHOLD', 512);
  }

  private async optimizeForEmbedding(): Promise<void> {
    // Optimize models for embedding generation
    console.log('[TensorFlowJS] Optimizing for embedding generation');

    // Set TensorFlow.js environment for embedding
    this.tf.env().set('WEBGL_PACK', true);
    this.tf.env().set('WEBGL_CONV_IM2COL', true);
  }

  private async optimizeForObjectDetection(): Promise<void> {
    // Optimize models for object detection
    console.log('[TensorFlowJS] Optimizing for object detection');

    // Set TensorFlow.js environment for object detection
    this.tf.env().set('WEBGL_FORCE_FLOAT32', true);
    this.tf.env().set('WEBGL_PACK_BINARY_OPERATIONS', true);
  }
}