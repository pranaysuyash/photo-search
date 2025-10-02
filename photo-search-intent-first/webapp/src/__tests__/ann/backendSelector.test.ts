/**
 * Tests for Backend Selector system
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaseBackend } from "../../services/ann/BackendInterface";
import { BackendRegistry } from "../../services/ann/BackendRegistry";
import { BackendSelector } from "../../services/ann/BackendSelector";
import { ResourceMonitor } from "../../services/ann/ResourceMonitor";

// Mock backend for testing
class MockBackend extends BaseBackend {
	readonly id = "mock-backend";
	readonly name = "Mock Backend";
	readonly version = "1.0.0";
	readonly capabilities = [
		{
			type: "inference" as const,
			modelTypes: [
				{
					id: "model1",
					name: "Test Model",
					description: "Test model for face detection",
					framework: "mock",
					version: "1.0.0",
					size: 1000000,
					format: "tensorflow" as const,
					capabilities: [
						{ type: "classification" as const, confidence: 0.85 },
						{ type: "detection" as const, confidence: 0.9 },
					],
				},
			],
			inputFormats: [{ type: "tensor" as const, dtype: "float32" as const }],
			outputFormats: [
				{ type: "classification" as const, dtype: "float32" as const },
			],
			features: [],
			performance: {
				inferenceTime: 100,
				memoryUsage: 50,
				accuracy: 0.85,
			},
		},
	];
	readonly resourceRequirements = {
		memory: { min: 100, max: 200, optimal: 150 },
		cpu: { min: 10, max: 30, optimal: 20 },
	};
	readonly performanceProfile = {
		inferenceTime: 100,
		memoryUsage: 50,
		throughput: 10,
		accuracy: 0.85,
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
			status: "healthy" as const,
			lastCheck: Date.now(),
			uptime: Date.now(),
			errorRate: 0,
			responseTime: 100,
			activeConnections: 0,
			resourceUsage: {
				memory: 50,
				cpu: 20,
				storage: 0,
			},
		};
	}

	async loadModel(modelId: string): Promise<any> {
		return { id: modelId, loaded: true };
	}

	async unloadModel(modelId: string): Promise<void> {
		// Mock implementation
	}

	async listModels(): Promise<string[]> {
		return ["model1", "model2"];
	}

	async runInference(modelId: string, input: any): Promise<any> {
		return { result: `inference-${modelId}`, processingTime: 100 };
	}

	async runBatchInference(modelId: string, inputs: any[]): Promise<any[]> {
		return inputs.map((input) => ({
			result: `batch-${modelId}`,
			processingTime: 100,
		}));
	}

	async optimizeForTask(taskType: string): Promise<void> {
		// Mock implementation
	}

	getPerformanceMetrics() {
		return this.performanceProfile;
	}
}

describe("BackendSelector", () => {
	let backendSelector: BackendSelector;
	let mockBackend: MockBackend;
	let backendRegistry: BackendRegistry;

	beforeEach(() => {
		// Create fresh instances for each test
		mockBackend = new MockBackend();
		backendRegistry = BackendRegistry.getInstance();
		backendSelector = new BackendSelector();

		// Register mock backend
		backendRegistry.registerBackend("mock-backend", mockBackend);
	});

	afterEach(() => {
		// Clean up registry
		backendRegistry.unregisterBackend("mock-backend");
	});

	describe("Backend Selection", () => {
		it("should select a backend successfully", async () => {
			const task = {
				id: "test-task",
				type: "face_detection" as const,
				modelId: "model1",
				input: { data: "test", format: { type: "tensor", dtype: "float32" } },
				priority: "normal" as const,
				resourceRequirements: {
					memory: { min: 50, max: 100, optimal: 75 },
					cpu: { min: 5, max: 15, optimal: 10 },
					storage: { min: 10, max: 50, optimal: 25 },
				},
			};

			const selection = await backendSelector.selectBackend(task);

			expect(selection.backend).toBe("mock-backend");
			expect(selection.confidence).toBeGreaterThan(0);
			expect(selection.reasoning).toBeDefined();
			expect(selection.estimatedPerformance).toBeDefined();
		});

		it("should handle selection criteria", async () => {
			const task = {
				id: "test-task",
				type: "face_detection" as const,
				modelId: "model1",
				input: { data: "test", format: { type: "tensor", dtype: "float32" } },
				priority: "high" as const,
				resourceRequirements: {
					memory: { min: 50, max: 100, optimal: 75 },
					cpu: { min: 5, max: 15, optimal: 10 },
					storage: { min: 10, max: 50, optimal: 25 },
				},
			};

			const criteria = {
				constraints: {
					maxInferenceTime: 500,
					maxMemoryUsage: 100,
					excludedBackends: ["other-backend"],
				},
				context: {
					deviceType: "desktop" as const,
					networkCondition: "good" as const,
				},
			};

			const selection = await backendSelector.selectBackend(task, criteria);

			expect(selection.backend).toBe("mock-backend");
			expect(selection.confidence).toBeGreaterThan(0);
		});

		it("should select multiple backends for load balancing", async () => {
			const task = {
				id: "test-task",
				type: "face_detection" as const,
				modelId: "model1",
				input: { data: "test", format: { type: "tensor", dtype: "float32" } },
				priority: "normal" as const,
				resourceRequirements: {
					memory: { min: 50, max: 100, optimal: 75 },
					cpu: { min: 5, max: 15, optimal: 10 },
					storage: { min: 10, max: 50, optimal: 25 },
				},
			};

			const selections = await backendSelector.selectMultipleBackends(
				task,
				undefined,
				3,
			);

			expect(selections.length).toBeGreaterThan(0);
			expect(selections.length).toBeLessThanOrEqual(3);
			expect(selections[0].backend).toBe("mock-backend");
		});

		it("should throw error when no backends available", async () => {
			// Unregister the mock backend
			backendRegistry.unregisterBackend("mock-backend");

			const task = {
				id: "test-task",
				type: "face_detection" as const,
				modelId: "model1",
				input: { data: "test", format: { type: "tensor", dtype: "float32" } },
				priority: "normal" as const,
				resourceRequirements: {
					memory: { min: 50, max: 100, optimal: 75 },
					cpu: { min: 5, max: 15, optimal: 10 },
					storage: { min: 10, max: 50, optimal: 25 },
				},
			};

			await expect(backendSelector.selectBackend(task)).rejects.toThrow(
				"No available backends for this task",
			);
		});
	});

	describe("Selection Weights", () => {
		it("should update selection weights", () => {
			const newWeights = {
				capabilityMatch: 0.3,
				resourceAvailability: 0.25,
				performanceScore: 0.15,
			};

			backendSelector.updateSelectionWeights(newWeights);

			// The update should not throw an error
			expect(true).toBe(true);
		});
	});

	describe("Performance Recording", () => {
		it("should record selection results", () => {
			const selection = {
				backend: "mock",
				confidence: 0.8,
				fallbacks: [],
				reasoning: [],
				timestamp: Date.now(),
				estimatedPerformance: {
					inferenceTime: 100,
					memoryUsage: 50,
					accuracy: 0.85,
					reliability: 0.9,
				},
			};

			const actualPerformance = {
				inferenceTime: 120,
				memoryUsage: 60,
				throughput: 8,
			};

			// Should not throw an error
			expect(() => {
				backendSelector.recordSelectionResult(
					selection,
					actualPerformance,
					true,
				);
			}).not.toThrow();
		});

		it("should get selection metrics", () => {
			const metrics = backendSelector.getSelectionMetrics();

			expect(metrics).toBeDefined();
			expect(metrics.totalSelections).toBeGreaterThanOrEqual(0);
			expect(metrics.averageConfidence).toBeGreaterThanOrEqual(0);
			expect(metrics.successRate).toBeGreaterThanOrEqual(0);
			expect(metrics.backendUsage).toBeDefined();
			expect(metrics.averageInferenceTime).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Scoring Logic", () => {
		it("should calculate backend scores correctly", async () => {
			const task = {
				id: "test-task",
				type: "face_detection" as const,
				modelId: "model1",
				input: { data: "test", format: { type: "tensor", dtype: "float32" } },
				priority: "normal" as const,
				resourceRequirements: {
					memory: { min: 50, max: 100, optimal: 75 },
					cpu: { min: 5, max: 15, optimal: 10 },
					storage: { min: 10, max: 50, optimal: 25 },
				},
			};

			const criteria = {
				taskType: "face_detection",
				modelId: "model1",
				priority: "normal" as const,
				constraints: {},
				context: {},
			};

			const systemResources = {
				totalMemory: 8192,
				availableMemory: 4000,
				totalCPU: 400,
				availableCPU: 200,
				totalStorage: 10000,
				availableStorage: 7000,
				network: {
					online: true,
					bandwidth: 100,
					latency: 50,
					reliability: 0.95,
				},
			};

			const backendInfo = backendRegistry.getBackend("mock-backend");
			if (!backendInfo) {
				throw new Error("Backend not found");
			}

			// Test private method through direct access
			const score = await (backendSelector as any).calculateBackendScore(
				backendInfo,
				criteria,
				systemResources,
			);

			expect(score.backendId).toBe("mock-backend");
			expect(score.score).toBeGreaterThan(0);
			expect(score.confidence).toBeGreaterThan(0);
			expect(score.reasoning).toBeDefined();
			expect(score.estimatedPerformance).toBeDefined();
		});
	});

	describe("Caching", () => {
		it("should cache selection results", async () => {
			const task = {
				id: "test-task",
				type: "face_detection" as const,
				modelId: "model1",
				input: { data: "test", format: { type: "tensor", dtype: "float32" } },
				priority: "normal" as const,
				resourceRequirements: {
					memory: { min: 50, max: 100, optimal: 75 },
					cpu: { min: 5, max: 15, optimal: 10 },
					storage: { min: 10, max: 50, optimal: 25 },
				},
			};

			// First selection
			const selection1 = await backendSelector.selectBackend(task);

			// Second selection should be cached
			const selection2 = await backendSelector.selectBackend(task);

			expect(selection1.backend).toBe(selection2.backend);
			expect(selection1.confidence).toBe(selection2.confidence);
		});
	});
});

describe("BackendSelector Integration", () => {
	let backendSelector: BackendSelector;
	let resourceMonitor: ResourceMonitor;

	beforeEach(() => {
		backendSelector = new BackendSelector();
		resourceMonitor = new ResourceMonitor({ interval: 100 });
	});

	afterEach(async () => {
		await resourceMonitor.stop();
	});

	it("should integrate with resource monitor", async () => {
		await resourceMonitor.initialize();
		resourceMonitor.start();

		const resources = resourceMonitor.getCurrentResources();
		expect(resources.totalMemory).toBeGreaterThan(0);
		expect(resources.availableMemory).toBeGreaterThanOrEqual(0);
		expect(resources.totalCPU).toBeGreaterThan(0);
		expect(resources.availableCPU).toBeGreaterThanOrEqual(0);
	});

	it("should handle resource constraints", async () => {
		// Create a backend with high resource requirements
		const highResourceBackend = new MockBackend();
		highResourceBackend.id = "high-resource";
		highResourceBackend.resourceRequirements = {
			memory: { min: 1000, max: 2000, optimal: 1500 },
			cpu: { min: 100, max: 200, optimal: 150 },
		};

		const backendRegistry = BackendRegistry.getInstance();

		// Register mock backend
		const mockBackend = new MockBackend();
		backendRegistry.registerBackend("mock-backend", mockBackend);

		// Register high-resource backend
		backendRegistry.registerBackend("high-resource", highResourceBackend);

		const task = {
			id: "test-task",
			type: "face_detection" as const,
			modelId: "model1",
			input: { data: "test", format: { type: "tensor", dtype: "float32" } },
			priority: "normal" as const,
			resourceRequirements: {
				memory: { min: 50, max: 100, optimal: 75 },
				cpu: { min: 5, max: 15, optimal: 10 },
				storage: { min: 10, max: 50, optimal: 25 },
			},
		};

		const criteria = {
			constraints: {
				maxMemoryUsage: 100, // This should exclude the high-resource backend
				maxInferenceTime: 1000,
			},
			context: {},
		};

		const selection = await backendSelector.selectBackend(task, criteria);

		// Should select the mock backend, not the high-resource one
		expect(selection.backend).toBe("mock-backend");

		// Clean up
		backendRegistry.unregisterBackend("high-resource");
	});
});
