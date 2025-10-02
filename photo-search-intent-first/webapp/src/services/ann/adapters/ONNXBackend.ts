/**
 * ONNX Runtime Backend Adapter
 * Implements the BaseBackend interface for ONNX models
 */

import { BaseBackend } from "../BackendInterface";
import type {
	BackendCapability,
	BackendHealth,
	InferenceInput,
	InferenceOutput,
	Model,
	ModelConfig,
	PerformanceMetrics,
	ResourceRequirements,
} from "./types";

export class ONNXBackend extends BaseBackend {
	readonly id: string;
	readonly name = "ONNX Runtime Backend";
	readonly version = "1.0.0";

	constructor(id?: string) {
		super();
		this.id = id || "onnx";
	}
	readonly capabilities: BackendCapability[] = [
		{
			type: "inference",
			modelTypes: ["onnx", "ort"],
			inputFormats: ["tensor", "image", "array"],
			outputFormats: ["tensor", "array"],
			maxInputSize: 1024 * 1024 * 20, // 20MB
			classes: [
				"image-classification",
				"object-detection",
				"face-detection",
				"embedding",
				"audio",
				"nlp",
			],
			performance: { throughput: 60, latency: 80 },
			confidence: 0.92,
		},
		{
			type: "quantization",
			modelTypes: ["onnx"],
			inputFormats: ["tensor", "model"],
			outputFormats: ["model", "tensor"],
			classes: ["model-quantization", "model-optimization"],
			performance: { throughput: 10, latency: 1000 },
			confidence: 0.85,
		},
	];
	readonly resourceRequirements: ResourceRequirements = {
		memory: { min: 128, max: 1024, optimal: 256 },
		cpu: { min: 5, max: 60, optimal: 20 },
		gpu: { min: 0, max: 2048, optimal: 512 },
	};
	readonly performanceProfile: PerformanceMetrics = {
		inferenceTime: 100,
		memoryUsage: 200,
		throughput: 45,
		accuracy: 0.91,
	};

	private ort: any = null;
	private models: Map<string, any> = new Map();
	private sessions: Map<string, any> = new Map();
	private isInitialized = false;

	async initialize(): Promise<boolean> {
		try {
			// Dynamically import ONNX Runtime Web
			this.ort = await import("onnxruntime-web");

			// Configure ONNX Runtime
			this.ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
			this.ort.env.wasm.simd = true;
			this.ort.env.wasm.proxy = false;
			this.ort.env.debug = false;

			// Check if WebAssembly is available
			if (!WebAssembly) {
				throw new Error("WebAssembly is not supported in this browser");
			}

			// Initialize WebGL if available
			if (this.ort.env.webgl) {
				console.log("[ONNX] WebGL backend available");
			} else {
				console.log("[ONNX] Using CPU backend");
			}

			this.isInitialized = true;
			this.health.status = "healthy";
			this.health.lastCheck = Date.now();
			console.log("[ONNX] Backend initialized successfully");
			return true;
		} catch (error) {
			console.error("[ONNX] Failed to initialize:", error);
			this.health.status = "unhealthy";
			this.health.error =
				error instanceof Error ? error.message : String(error);
			return false;
		}
	}

	async shutdown(): Promise<void> {
		try {
			// Dispose all inference sessions
			for (const [modelId, session] of this.sessions) {
				if (session && session.dispose) {
					await session.dispose();
				}
			}
			this.sessions.clear();

			// Clear models
			this.models.clear();

			this.isInitialized = false;
			this.health.status = "shutdown";
			console.log("[ONNX] Backend shutdown successfully");
		} catch (error) {
			console.error("[ONNX] Error during shutdown:", error);
		}
	}

	isAvailable(): boolean {
		return (
			this.isInitialized &&
			this.health.status === "healthy" &&
			this.ort !== null
		);
	}

	getHealth(): BackendHealth {
		const currentHealth = { ...this.health };
		currentHealth.lastCheck = Date.now();

		// Update health based on ONNX Runtime status
		if (this.isInitialized && this.ort) {
			try {
				currentHealth.activeConnections = this.sessions.size;
				currentHealth.resourceUsage = {
					memory: this.estimateMemoryUsage(),
					cpu: this.estimateCPUUsage(),
					storage: 0,
				};
			} catch (error) {
				currentHealth.status = "degraded";
				currentHealth.error =
					error instanceof Error ? error.message : String(error);
			}
		}

		return currentHealth;
	}

	async loadModel(modelId: string, modelConfig: ModelConfig): Promise<Model> {
		if (!this.isInitialized) {
			throw new Error("ONNX backend not initialized");
		}

		try {
			const modelUrl = modelConfig.modelUrl || `/models/${modelId}/model.onnx`;

			// Create inference session
			const session = await this.ort.InferenceSession.create(modelUrl, {
				executionProviders: this.getExecutionProviders(),
				graphOptimizationLevel: "all",
				enableProfiling: false,
			});

			// Store session
			this.sessions.set(modelId, session);

			// Get model information
			const inputNames = session.inputNames;
			const outputNames = session.outputNames;
			const inputShapes = this.getInputShapes(session);
			const outputShapes = this.getOutputShapes(session);

			const modelInfo: Model = {
				id: modelId,
				name: modelConfig.name || modelId,
				version: modelConfig.version || "1.0.0",
				format: modelConfig.format,
				inputShape: inputShapes[0] || modelConfig.inputShape,
				outputShape: outputShapes[0] || modelConfig.outputShape,
				size: modelConfig.size || 0,
				parameters: modelConfig.parameters || 0,
				loaded: true,
				metadata: {
					...modelConfig.metadata,
					backend: "onnx",
					loadedAt: Date.now(),
					inputNames,
					outputNames,
					inputShapes,
					outputShapes,
					executionProviders: session.executionProviders,
				},
			};

			this.models.set(modelId, modelInfo);
			console.log(`[ONNX] Model ${modelId} loaded successfully`);
			return modelInfo;
		} catch (error) {
			console.error(`[ONNX] Failed to load model ${modelId}:`, error);
			throw error;
		}
	}

	async unloadModel(modelId: string): Promise<void> {
		const session = this.sessions.get(modelId);
		if (session) {
			await session.dispose();
			this.sessions.delete(modelId);
		}
		this.models.delete(modelId);
		console.log(`[ONNX] Model ${modelId} unloaded`);
	}

	async listModels(): Promise<string[]> {
		return Array.from(this.models.keys());
	}

	async runInference(
		modelId: string,
		input: InferenceInput,
	): Promise<InferenceOutput> {
		if (!this.sessions.has(modelId)) {
			throw new Error(`Model ${modelId} not loaded`);
		}

		const session = this.sessions.get(modelId);
		const model = this.models.get(modelId);
		const startTime = performance.now();

		try {
			// Prepare input tensor
			const inputTensor = await this.prepareInputTensor(input, model);

			// Create input feeds
			const feeds: Record<string, any> = {};
			const inputNames = session.inputNames;
			feeds[inputNames[0]] = inputTensor;

			// Run inference
			const results = await session.run(feeds);

			// Process outputs
			const outputData = await this.processOutput(results, model);

			const endTime = performance.now();
			const processingTime = endTime - startTime;

			return {
				data: outputData.data,
				format: {
					type: "tensor",
					dtype: outputData.dtype,
					shape: outputData.shape,
				},
				processingTime,
				confidence: this.calculateConfidence(outputData.data),
				metadata: {
					backend: "onnx",
					modelId,
					timestamp: Date.now(),
					executionProviders: session.executionProviders,
					memoryUsed: session.memoryUsage || 0,
				},
			};
		} catch (error) {
			console.error(`[ONNX] Inference failed for model ${modelId}:`, error);
			throw error;
		}
	}

	async runBatchInference(
		modelId: string,
		inputs: InferenceInput[],
	): Promise<InferenceOutput[]> {
		if (!this.sessions.has(modelId)) {
			throw new Error(`Model ${modelId} not loaded`);
		}

		const session = this.sessions.get(modelId);
		const model = this.models.get(modelId);
		const startTime = performance.now();

		try {
			// Prepare batch input tensors
			const inputTensors = await Promise.all(
				inputs.map((input) => this.prepareInputTensor(input, model)),
			);

			// Run batch inference
			const outputs = [];
			for (let i = 0; i < inputs.length; i++) {
				const feeds: Record<string, any> = {};
				const inputNames = session.inputNames;
				feeds[inputNames[0]] = inputTensors[i];

				const results = await session.run(feeds);
				const outputData = await this.processOutput(results, model);

				outputs.push({
					data: outputData.data,
					format: {
						type: "tensor",
						dtype: outputData.dtype,
						shape: outputData.shape,
					},
					processingTime: (performance.now() - startTime) / inputs.length,
					confidence: this.calculateConfidence(outputData.data),
					metadata: {
						backend: "onnx",
						modelId,
						batchIndex: i,
						timestamp: Date.now(),
						executionProviders: session.executionProviders,
					},
				});
			}

			// Clean up tensors
			inputTensors.forEach((tensor) => {
				if (tensor && tensor.dispose) {
					tensor.dispose();
				}
			});

			return outputs;
		} catch (error) {
			console.error(
				`[ONNX] Batch inference failed for model ${modelId}:`,
				error,
			);
			throw error;
		}
	}

	async optimizeForTask(taskType: string): Promise<void> {
		if (!this.isInitialized) {
			throw new Error("ONNX backend not initialized");
		}

		try {
			switch (taskType) {
				case "face_detection":
					await this.optimizeForFaceDetection();
					break;
				case "image_embedding":
					await this.optimizeForEmbedding();
					break;
				case "object_detection":
					await this.optimizeForObjectDetection();
					break;
				case "model_quantization":
					await this.enableQuantization();
					break;
				default:
					console.log(`[ONNX] No specific optimization for task: ${taskType}`);
			}
		} catch (error) {
			console.error(`[ONNX] Optimization failed for task ${taskType}:`, error);
			throw error;
		}
	}

	getPerformanceMetrics(): PerformanceMetrics {
		if (!this.isInitialized) {
			return this.performanceProfile;
		}

		try {
			const memoryUsage = this.estimateMemoryUsage();
			const cpuUsage = this.estimateCPUUsage();

			return {
				...this.performanceProfile,
				memoryUsage,
				throughput: this.calculateThroughput(memoryUsage, cpuUsage),
				timestamp: Date.now(),
			};
		} catch (error) {
			return this.performanceProfile;
		}
	}

	private getExecutionProviders(): string[] {
		const providers: string[] = ["cpu"];

		// Add WebGL if available
		if (this.ort.env.webgl) {
			providers.push("webgl");
		}

		// Add WebGPU if available
		if (this.ort.env.webgpu) {
			providers.push("webgpu");
		}

		return providers;
	}

	private getInputShapes(session: any): number[][] {
		const inputNames = session.inputNames;
		return inputNames.map((name: string) => {
			const tensor = session.inputNames[name];
			return tensor ? tensor.dims : [];
		});
	}

	private getOutputShapes(session: any): number[][] {
		const outputNames = session.outputNames;
		return outputNames.map((name: string) => {
			const tensor = session.outputNames[name];
			return tensor ? tensor.dims : [];
		});
	}

	private async prepareInputTensor(
		input: InferenceInput,
		model: Model,
	): Promise<any> {
		const { data, format } = input;

		switch (format.type) {
			case "tensor":
				return new this.ort.Tensor(
					this.mapDtype(format.dtype),
					new Float32Array(data),
					format.shape || model.inputShape,
				);
			case "image":
				return await this.prepareImageTensor(data, model);
			case "array":
				return new this.ort.Tensor("float32", new Float32Array(data), [
					1,
					...this.calculateArrayShape(data),
				]);
			default:
				throw new Error(`Unsupported input format: ${format.type}`);
		}
	}

	private async prepareImageTensor(imageData: any, model: Model): Promise<any> {
		// Convert image to tensor
		let tensorData: Float32Array;
		let shape: number[];

		if (typeof imageData === "string") {
			// Assume data URL - in real implementation, would decode image
			tensorData = new Float32Array(224 * 224 * 3); // Placeholder
			shape = [1, 3, 224, 224];
		} else if (
			imageData instanceof HTMLImageElement ||
			imageData instanceof HTMLCanvasElement
		) {
			// Create tensor from image element
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("Canvas context not available");

			canvas.width = 224;
			canvas.height = 224;
			ctx.drawImage(imageData, 0, 0, 224, 224);

			const imageData = ctx.getImageData(0, 0, 224, 224);
			const pixels = imageData.data;

			// Convert RGBA to RGB and normalize
			tensorData = new Float32Array(3 * 224 * 224);
			for (let i = 0; i < pixels.length; i += 4) {
				const pixelIndex = (i / 4) * 3;
				tensorData[pixelIndex] = pixels[i] / 255.0; // R
				tensorData[pixelIndex + 1] = pixels[i + 1] / 255.0; // G
				tensorData[pixelIndex + 2] = pixels[i + 2] / 255.0; // B
			}
			shape = [1, 3, 224, 224];
		} else {
			// Assume it's already tensor data
			tensorData = new Float32Array(imageData);
			shape = model.inputShape || [1, 3, 224, 224];
		}

		return new this.ort.Tensor("float32", tensorData, shape);
	}

	private mapDtype(dtype: string): string {
		const dtypeMap: Record<string, string> = {
			float32: "float32",
			float16: "float16",
			int32: "int32",
			int64: "int64",
			uint8: "uint8",
			bool: "bool",
		};
		return dtypeMap[dtype] || "float32";
	}

	private calculateArrayShape(data: unknown): number[] {
		if (Array.isArray(data)) {
			if (data.length === 0) return [0];
			return [data.length, ...this.calculateArrayShape(data[0])];
		}
		return [];
	}

	private async processOutput(
		results: any,
		model: Model,
	): Promise<{
		data: any;
		dtype: string;
		shape: number[];
	}> {
		const outputNames = Object.keys(results);
		if (outputNames.length === 0) {
			throw new Error("No outputs found in inference results");
		}

		// Get first output
		const output = results[outputNames[0]];

		return {
			data: Array.from(output.data),
			dtype: output.type,
			shape: output.dims,
		};
	}

	private calculateConfidence(data: unknown): number {
		if (Array.isArray(data)) {
			if (data.every((x) => typeof x === "number")) {
				const max = Math.max(...data);
				return Math.min(max, 1.0);
			}
		}
		return 0.5;
	}

	private estimateMemoryUsage(): number {
		// Estimate memory usage based on loaded models and sessions
		let totalMemory = 0;
		for (const [modelId, model] of this.models) {
			// Estimate based on model size and parameters
			const modelSize = model.size || 0;
			const params = model.parameters || 0;
			totalMemory += (modelSize + params * 4) / 1024 / 1024; // Convert to MB
		}
		return totalMemory;
	}

	private estimateCPUUsage(): number {
		// Estimate CPU usage based on active sessions
		const baseUsage = 5;
		const sessionOverhead = this.sessions.size * 3;
		return Math.min(baseUsage + sessionOverhead, 100);
	}

	private calculateThroughput(memoryUsage: number, cpuUsage: number): number {
		const memoryFactor = Math.max(0.1, 1 - memoryUsage / 1024);
		const cpuFactor = Math.max(0.1, 1 - cpuUsage / 100);
		return this.performanceProfile.throughput * memoryFactor * cpuFactor;
	}

	private async optimizeForFaceDetection(): Promise<void> {
		console.log("[ONNX] Optimizing for face detection");
		// ONNX Runtime optimizations for face detection
		this.ort.env.wasm.numThreads = Math.min(
			navigator.hardwareConcurrency || 4,
			2,
		);
	}

	private async optimizeForEmbedding(): Promise<void> {
		console.log("[ONNX] Optimizing for embedding generation");
		// ONNX Runtime optimizations for embeddings
		this.ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
	}

	private async optimizeForObjectDetection(): Promise<void> {
		console.log("[ONNX] Optimizing for object detection");
		// ONNX Runtime optimizations for object detection
		this.ort.env.wasm.numThreads = Math.min(
			navigator.hardwareConcurrency || 4,
			3,
		);
	}

	private async enableQuantization(): Promise<void> {
		console.log("[ONNX] Enabling quantization optimizations");
		// Enable quantization-aware execution
		if (this.ort.env.wasm) {
			this.ort.env.wasm.quantize = true;
		}
	}
}
