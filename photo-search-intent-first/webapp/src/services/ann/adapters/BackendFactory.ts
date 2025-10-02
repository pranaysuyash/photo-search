/**
 * Backend Factory
 * Factory pattern for creating and managing backend adapters
 */

import type { BaseBackend } from "../BackendInterface";
import type { BackendConfig, BackendType } from "../types";
import { ONNXBackend } from "./ONNXBackend";
import { PyTorchBackend } from "./PyTorchBackend";
import { TensorFlowJSBackend } from "./TensorFlowJSBackend";

export class BackendFactory {
	private static instance: BackendFactory;
	private backends: Map<string, BaseBackend> = new Map();
	private backendTypes: Map<string, BackendType> = new Map();
	private backendConfigs: Map<string, BackendConfig> = new Map();

	private constructor() {
		// Private constructor for singleton pattern
	}

	static getInstance(): BackendFactory {
		if (!BackendFactory.instance) {
			BackendFactory.instance = new BackendFactory();
		}
		return BackendFactory.instance;
	}

	/**
	 * Register a new backend configuration
	 */
	registerBackend(type: BackendType, config: BackendConfig): void {
		this.backendConfigs.set(type, config);
		console.log(
			`[BackendFactory] Registered backend configuration for: ${type}`,
		);
	}

	/**
	 * Create a new backend instance
	 */
	async createBackend(
		type: BackendType,
		config?: Partial<BackendConfig>,
	): Promise<BaseBackend> {
		const fullConfig = {
			...this.backendConfigs.get(type),
			...config,
		} as BackendConfig;

		if (!fullConfig) {
			throw new Error(`No configuration found for backend type: ${type}`);
		}

		let backend: BaseBackend;

		switch (type) {
			case "tensorflowjs":
				backend = new TensorFlowJSBackend(fullConfig.id);
				break;
			case "pytorch":
				backend = new PyTorchBackend(fullConfig.id);
				break;
			case "onnx":
				backend = new ONNXBackend(fullConfig.id);
				break;
			default:
				throw new Error(`Unsupported backend type: ${type}`);
		}

		// Store backend reference and type
		this.backends.set(fullConfig.id || type, backend);
		this.backendTypes.set(fullConfig.id || type, type);

		// Initialize the backend
		const initialized = await backend.initialize();
		if (!initialized) {
			this.backends.delete(fullConfig.id || type);
			throw new Error(`Failed to initialize backend: ${type}`);
		}

		console.log(`[BackendFactory] Created and initialized backend: ${type}`);
		return backend;
	}

	/**
	 * Get an existing backend instance
	 */
	getBackend(id: string): BaseBackend | null {
		return this.backends.get(id) || null;
	}

	/**
	 * Get all registered backends
	 */
	getAllBackends(): BaseBackend[] {
		return Array.from(this.backends.values());
	}

	/**
	 * Get all available backend types
	 */
	getAvailableBackendTypes(): BackendType[] {
		return Array.from(this.backendConfigs.keys()) as BackendType[];
	}

	/**
	 * Check if a backend type is supported
	 */
	isBackendSupported(type: BackendType): boolean {
		return this.backendConfigs.has(type);
	}

	/**
	 * Get backend configuration
	 */
	getBackendConfig(type: BackendType): BackendConfig | null {
		return this.backendConfigs.get(type) || null;
	}

	/**
	 * Update backend configuration
	 */
	updateBackendConfig(type: BackendType, config: Partial<BackendConfig>): void {
		const existingConfig = this.backendConfigs.get(type);
		if (existingConfig) {
			this.backendConfigs.set(type, { ...existingConfig, ...config });
			console.log(
				`[BackendFactory] Updated configuration for backend: ${type}`,
			);
		}
	}

	/**
	 * Create multiple backends with configurations
	 */
	async createBackends(
		configs: Array<{
			type: BackendType;
			config?: Partial<BackendConfig>;
		}>,
	): Promise<BaseBackend[]> {
		const backends: BaseBackend[] = [];

		for (const { type, config } of configs) {
			try {
				const backend = await this.createBackend(type, config);
				backends.push(backend);
			} catch (error) {
				console.error(
					`[BackendFactory] Failed to create backend ${type}:`,
					error,
				);
				// Continue with other backends
			}
		}

		return backends;
	}

	/**
	 * Shutdown and remove a backend
	 */
	async shutdownBackend(id: string): Promise<void> {
		const backend = this.backends.get(id);
		if (backend) {
			await backend.shutdown();
			this.backends.delete(id);
			this.backendTypes.delete(id);
			console.log(`[BackendFactory] Shutdown backend: ${id}`);
		}
	}

	/**
	 * Shutdown all backends
	 */
	async shutdownAll(): Promise<void> {
		const shutdownPromises = Array.from(this.backends.entries()).map(
			async ([id, backend]) => {
				try {
					await backend.shutdown();
					console.log(`[BackendFactory] Shutdown backend: ${id}`);
				} catch (error) {
					console.error(
						`[BackendFactory] Error shutting down backend ${id}:`,
						error,
					);
				}
			},
		);

		await Promise.all(shutdownPromises);
		this.backends.clear();
		this.backendTypes.clear();
		console.log("[BackendFactory] All backends shutdown");
	}

	/**
	 * Get backend health status for all backends
	 */
	getAllBackendHealth(): Array<{
		id: string;
		type: BackendType;
		health: any;
		available: boolean;
	}> {
		return Array.from(this.backends.entries()).map(([id, backend]) => ({
			id,
			type: this.getBackendTypeById(id) || "unknown",
			health: backend.getHealth(),
			available: backend.isAvailable(),
		}));
	}

	/**
	 * Get backend type by ID
	 */
	private getBackendTypeById(id: string): BackendType | null {
		// First check the stored type mapping
		const storedType = this.backendTypes.get(id);
		if (storedType) {
			return storedType;
		}

		// Fallback to config lookup for backwards compatibility
		for (const [type, config] of this.backendConfigs.entries()) {
			if (config.id === id) {
				return type as BackendType;
			}
		}
		return null;
	}

	/**
	 * Auto-detect available backends based on environment
	 */
	async detectAvailableBackends(): Promise<BackendType[]> {
		const available: BackendType[] = [];

		// Check for TensorFlow.js
		try {
			// Try to detect TensorFlow.js availability
			if (typeof window !== "undefined") {
				// Check for WebGL support (required for TF.js)
				const canvas = document.createElement("canvas");
				const gl =
					canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
				if (gl) {
					available.push("tensorflowjs");
				}
			}
		} catch (error) {
			console.log("[BackendFactory] TensorFlow.js not available:", error);
		}

		// Check for ONNX Runtime
		try {
			// Try to detect ONNX Runtime availability
			if (typeof WebAssembly !== "undefined") {
				available.push("onnx");
			}
		} catch (error) {
			console.log("[BackendFactory] ONNX Runtime not available:", error);
		}

		// Check for PyTorch (WebAssembly)
		try {
			if (typeof WebAssembly !== "undefined") {
				available.push("pytorch");
			}
		} catch (error) {
			console.log("[BackendFactory] PyTorch not available:", error);
		}

		console.log("[BackendFactory] Detected available backends:", available);
		return available;
	}

	/**
	 * Initialize default backend configurations
	 */
	initializeDefaultConfigs(): void {
		const defaultConfigs: Record<BackendType, BackendConfig> = {
			tensorflowjs: {
				id: "tensorflowjs",
				name: "TensorFlow.js Backend",
				description: "JavaScript-based deep learning framework",
				version: "1.0.0",
				enabled: true,
				priority: 1,
				resourceLimits: {
					maxMemoryMB: 2048,
					maxCPUPercent: 80,
					maxGPUCount: 1,
				},
				optimization: {
					enableQuantization: true,
					enablePruning: false,
					enableCaching: true,
				},
				settings: {
					webglEnabled: true,
					wasmEnabled: true,
					threads: navigator.hardwareConcurrency || 4,
				},
			},
			pytorch: {
				id: "pytorch",
				name: "PyTorch Backend",
				description: "Python-based deep learning framework via WebAssembly",
				version: "1.0.0",
				enabled: true,
				priority: 2,
				resourceLimits: {
					maxMemoryMB: 4096,
					maxCPUPercent: 100,
					maxGPUCount: 1,
				},
				optimization: {
					enableQuantization: true,
					enablePruning: false,
					enableCaching: true,
				},
				settings: {
					wasmEnabled: true,
					threads: navigator.hardwareConcurrency || 4,
					memoryEfficient: true,
				},
			},
			onnx: {
				id: "onnx",
				name: "ONNX Runtime Backend",
				description: "Cross-platform inference engine",
				version: "1.0.0",
				enabled: true,
				priority: 3,
				resourceLimits: {
					maxMemoryMB: 1024,
					maxCPUPercent: 60,
					maxGPUCount: 1,
				},
				optimization: {
					enableQuantization: true,
					enablePruning: true,
					enableCaching: true,
				},
				settings: {
					executionProviders: ["cpu", "webgl"],
					graphOptimization: "all",
					threads: navigator.hardwareConcurrency || 4,
				},
			},
		};

		// Register all default configurations
		for (const [type, config] of Object.entries(defaultConfigs)) {
			this.registerBackend(type as BackendType, config);
		}

		console.log("[BackendFactory] Initialized default backend configurations");
	}

	/**
	 * Get recommended backend for specific task
	 */
	getRecommendedBackend(taskType: string): BackendType | null {
		const recommendations: Record<string, BackendType[]> = {
			face_detection: ["tensorflowjs", "onnx", "pytorch"],
			image_embedding: ["onnx", "tensorflowjs", "pytorch"],
			object_detection: ["tensorflowjs", "onnx", "pytorch"],
			image_classification: ["tensorflowjs", "onnx", "pytorch"],
			nlp: ["pytorch", "onnx", "tensorflowjs"],
			audio: ["onnx", "tensorflowjs", "pytorch"],
			default: ["tensorflowjs", "onnx", "pytorch"],
		};

		const taskRecommendations =
			recommendations[taskType] || recommendations.default;

		// Return first available and supported backend
		for (const backendType of taskRecommendations) {
			if (this.isBackendSupported(backendType)) {
				return backendType;
			}
		}

		return null;
	}

	/**
	 * Export backend configurations
	 */
	exportConfigs(): Record<string, BackendConfig> {
		const configs: Record<string, BackendConfig> = {};
		for (const [type, config] of this.backendConfigs.entries()) {
			configs[type] = config;
		}
		return configs;
	}

	/**
	 * Import backend configurations
	 */
	importConfigs(configs: Record<string, BackendConfig>): void {
		for (const [type, config] of Object.entries(configs)) {
			this.registerBackend(type as BackendType, config);
		}
		console.log("[BackendFactory] Imported backend configurations");
	}
}
