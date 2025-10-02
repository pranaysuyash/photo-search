/**
 * Tests for Decision Engine system
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaseBackend } from "../../services/ann/BackendInterface";
import { BackendRegistry } from "../../services/ann/BackendRegistry";
import { DecisionEngine } from "../../services/ann/DecisionEngine";

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
					id: "model1-tensorflow",
					name: "TensorFlow Model",
					description: "Mock TensorFlow model",
					framework: "tensorflow" as const,
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
		storage: { min: 10, max: 50, optimal: 25 },
	};
	readonly performanceProfile = {
		inferenceTime: 100,
		memoryUsage: 50,
		cpuUsage: 20,
		gpuUsage: 0,
		accuracy: 0.85,
		throughput: 10,
		reliability: 0.9,
		timestamp: Date.now(),
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

describe("DecisionEngine", () => {
	let decisionEngine: DecisionEngine;
	let mockBackend: MockBackend;
	let backendRegistry: BackendRegistry;

	beforeEach(async () => {
		// Get registry instance and clear it for clean testing
		backendRegistry = BackendRegistry.getInstance();
		backendRegistry.clearAllBackends();

		// Create and register mock backend
		mockBackend = new MockBackend();
		await mockBackend.initialize();
		backendRegistry.registerBackend("mock-backend", mockBackend);

		// Update the backend's models in the registry
		const models = await mockBackend.listModels();
		backendRegistry.updateBackendModels("mock-backend", models);

		decisionEngine = new DecisionEngine();
		await decisionEngine.initialize();
	});

	afterEach(async () => {
		// Clean up if needed
	});

	describe("Initialization", () => {
		it("should initialize successfully", async () => {
			const engine = new DecisionEngine();
			const result = await engine.initialize();
			expect(result).toBe(true);
		});

		it("should initialize with custom weights", async () => {
			const customWeights = {
				performance: 0.4,
				reliability: 0.3,
				efficiency: 0.2,
			};

			const engine = new DecisionEngine({ weights: customWeights });
			await engine.initialize();

			const analytics = engine.getDecisionAnalytics();
			expect(analytics).toBeDefined();
		});
	});

	describe("Decision Making", () => {
		it("should make a decision successfully", async () => {
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

			const decision = await decisionEngine.makeDecision(task);

			expect(decision).toBeDefined();
			expect(decision.backend).toBeDefined();
			expect(decision.confidence).toBeGreaterThan(0);
			expect(decision.fallbacks).toBeDefined();
			expect(decision.reasoning).toBeDefined();
			expect(decision.estimatedPerformance).toBeDefined();
			expect(decision.timestamp).toBeDefined();
		});

		it("should make batch decisions successfully", async () => {
			const tasks = [
				{
					id: "task-1",
					type: "face_detection" as const,
					modelId: "model1",
					input: { data: "test", format: { type: "tensor", dtype: "float32" } },
					priority: "normal" as const,
					resourceRequirements: {
						memory: { min: 50, max: 100, optimal: 75 },
						cpu: { min: 5, max: 15, optimal: 10 },
						storage: { min: 10, max: 50, optimal: 25 },
					},
				},
				{
					id: "task-2",
					type: "image_embedding" as const,
					modelId: "model1",
					input: { data: "test", format: { type: "tensor", dtype: "float32" } },
					priority: "normal" as const,
					resourceRequirements: {
						memory: { min: 50, max: 100, optimal: 75 },
						cpu: { min: 5, max: 15, optimal: 10 },
						storage: { min: 10, max: 50, optimal: 25 },
					},
				},
			];

			const decisions = await decisionEngine.makeBatchDecisions(tasks);

			expect(decisions).toHaveLength(2);
			expect(decisions[0].backend).toBeDefined();
			expect(decisions[1].backend).toBeDefined();
		});

		it("should record task results", () => {
			const taskId = "test-task";
			const backendId = "mock-backend";
			const result = {
				taskId,
				output: {
					data: "result",
					format: { type: "tensor", dtype: "float32" },
					processingTime: 100,
				},
				backend: backendId,
				processingTime: 100,
				memoryUsage: 50,
				success: true,
			};

			expect(() => {
				decisionEngine.recordTaskResult(taskId, backendId, result);
			}).not.toThrow();
		});

		it("should record task results with user feedback", () => {
			const taskId = "test-task";
			const backendId = "mock-backend";
			const result = {
				taskId,
				output: {
					data: "result",
					format: { type: "tensor", dtype: "float32" },
					processingTime: 100,
				},
				backend: backendId,
				processingTime: 100,
				memoryUsage: 50,
				success: true,
			};

			const feedback = {
				satisfaction: 0.9,
				comments: "Excellent performance",
				timestamp: Date.now(),
			};

			expect(() => {
				decisionEngine.recordTaskResult(taskId, backendId, result, feedback);
			}).not.toThrow();
		});
	});

	describe("Weight Optimization", () => {
		it("should optimize weights for speed", async () => {
			await decisionEngine.optimizeWeights("speed");

			const analytics = decisionEngine.getDecisionAnalytics();
			expect(analytics).toBeDefined();
		});

		it("should optimize weights for efficiency", async () => {
			await decisionEngine.optimizeWeights("efficiency");

			const analytics = decisionEngine.getDecisionAnalytics();
			expect(analytics).toBeDefined();
		});

		it("should optimize weights for balance", async () => {
			await decisionEngine.optimizeWeights("balance");

			const analytics = decisionEngine.getDecisionAnalytics();
			expect(analytics).toBeDefined();
		});
	});

	describe("Analytics", () => {
		it("should provide decision analytics", () => {
			const analytics = decisionEngine.getDecisionAnalytics();

			expect(analytics).toBeDefined();
			expect(analytics.totalDecisions).toBeGreaterThanOrEqual(0);
			expect(analytics.averageConfidence).toBeGreaterThanOrEqual(0);
			expect(analytics.successRate).toBeGreaterThanOrEqual(0);
			expect(analytics.backendDistribution).toBeDefined();
			expect(analytics.weightEvolution).toBeDefined();
			expect(analytics.fairnessMetrics).toBeDefined();
			expect(analytics.learningProgress).toBeDefined();
		});

		it("should calculate fairness metrics correctly", () => {
			const analytics = decisionEngine.getDecisionAnalytics();
			const fairness = analytics.fairnessMetrics;

			expect(fairness).toBeDefined();
			expect(fairness.maxDisparity).toBeGreaterThanOrEqual(0);
			expect(fairness.backendUsage).toBeDefined();
			expect(fairness.fairnessScore).toBeGreaterThanOrEqual(0);
		});

		it("should calculate learning progress correctly", () => {
			const analytics = decisionEngine.getDecisionAnalytics();
			const progress = analytics.learningProgress;

			expect(progress).toBeDefined();
			expect(progress.totalLearningIterations).toBeGreaterThanOrEqual(0);
			expect(progress.accuracyTrend).toBeDefined();
			expect(progress.convergenceRate).toBeGreaterThanOrEqual(0);
			expect(progress.modelStability).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Model Import/Export", () => {
		it("should export model successfully", async () => {
			const exportedModel = await decisionEngine.exportModel();

			expect(typeof exportedModel).toBe("string");
			expect(exportedModel.length).toBeGreaterThan(0);

			// Should be valid JSON
			expect(() => JSON.parse(exportedModel)).not.toThrow();
		});

		it("should import model successfully", async () => {
			// First export
			const exportedModel = await decisionEngine.exportModel();

			// Create new engine
			const newEngine = new DecisionEngine();
			await newEngine.initialize();

			// Import model
			const result = await newEngine.importModel(exportedModel);

			expect(result).toBe(true);
		});

		it("should handle invalid import data", async () => {
			const invalidData = "invalid json";
			const result = await decisionEngine.importModel(invalidData);

			expect(result).toBe(false);
		});

		it("should handle empty import data", async () => {
			const emptyData = "{}";
			const result = await decisionEngine.importModel(emptyData);

			expect(result).toBe(true);
		});
	});

	describe("Scoring Logic", () => {
		it("should calculate candidate scores correctly", async () => {
			const candidates = [{ backendId: "mock-backend", confidence: 0.8 }];

			const context = {
				task: {
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
				},
				systemResources: {
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
				},
				backendHealth: {
					"mock-backend": {
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
					},
				},
				historicalPerformance: new Map(),
				userPreferences: new Map(),
				currentLoad: new Map(),
				timeOfDay: 12,
				dayOfWeek: 1,
			};

			const scoredCandidates = await (decisionEngine as any).scoreCandidates(
				candidates,
				context,
			);

			expect(scoredCandidates).toHaveLength(1);
			expect(scoredCandidates[0].backendId).toBe("mock-backend");
			expect(scoredCandidates[0].score).toBeGreaterThan(0);
			expect(scoredCandidates[0].details).toBeDefined();
		});

		it("should calculate performance score correctly", () => {
			const backendId = "mock-backend";
			const context = {
				task: {
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
				},
				systemResources: {
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
				},
				backendHealth: {},
				historicalPerformance: new Map(),
				userPreferences: new Map(),
				currentLoad: new Map(),
				timeOfDay: 12,
				dayOfWeek: 1,
			};

			const performanceScore = (
				decisionEngine as any
			).calculatePerformanceScore(backendId, context);

			expect(performanceScore).toBeGreaterThanOrEqual(0);
			expect(performanceScore).toBeLessThanOrEqual(1);
		});

		it("should calculate reliability score correctly", () => {
			const backendHealth = {
				status: "healthy" as const,
				lastCheck: Date.now(),
				uptime: 24 * 60 * 60 * 1000, // 24 hours
				errorRate: 0,
				responseTime: 100,
				activeConnections: 0,
				resourceUsage: {
					memory: 50,
					cpu: 20,
					storage: 0,
				},
			};

			const reliabilityScore = (
				decisionEngine as any
			).calculateReliabilityScore(backendHealth);

			expect(reliabilityScore).toBeGreaterThan(0.5);
			expect(reliabilityScore).toBeLessThanOrEqual(1);
		});

		it("should calculate efficiency score correctly", () => {
			const backendId = "mock-backend";
			const context = {
				task: {
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
				},
				systemResources: {
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
				},
				backendHealth: {},
				historicalPerformance: new Map(),
				userPreferences: new Map(),
				currentLoad: new Map([["mock-backend", 30]]), // 30% load
				timeOfDay: 12,
				dayOfWeek: 1,
			};

			const efficiencyScore = (decisionEngine as any).calculateEfficiencyScore(
				backendId,
				context,
			);

			expect(efficiencyScore).toBeGreaterThanOrEqual(0);
			expect(efficiencyScore).toBeLessThanOrEqual(1);
		});
	});

	describe("Fairness Constraints", () => {
		it("should apply fairness constraints", async () => {
			const selected = {
				backend: "mock-backend",
				confidence: 0.8,
				fallbacks: ["fallback-backend"],
				reasoning: [],
				estimatedPerformance: {
					inferenceTime: 100,
					memoryUsage: 50,
					accuracy: 0.85,
				},
				timestamp: Date.now(),
			};

			const candidates = [
				{ backendId: "mock-backend", score: 0.8, details: {} },
				{ backendId: "underutilized-backend", score: 0.6, details: {} },
			];

			const context = {
				task: {
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
				},
				systemResources: {
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
				},
				backendHealth: {},
				historicalPerformance: new Map(),
				userPreferences: new Map(),
				currentLoad: new Map(),
				timeOfDay: 12,
				dayOfWeek: 1,
			};

			const fairSelection = (decisionEngine as any).applyFairnessConstraints(
				selected,
				candidates,
				context,
			);

			expect(fairSelection).toBeDefined();
			expect(fairSelection.backend).toBeDefined();
		});
	});

	describe("Weight Perturbation", () => {
		it("should perturb weights correctly", () => {
			const originalWeights = decisionEngine["weights"];
			const perturbedWeights = (decisionEngine as any).perturbWeights(
				originalWeights,
			);

			expect(perturbedWeights).toBeDefined();
			expect(perturbedWeights).not.toBe(originalWeights);

			// Check that all weights are still valid (0-1 range)
			Object.values(perturbedWeights).forEach((value: number) => {
				expect(value).toBeGreaterThanOrEqual(0);
				expect(value).toBeLessThanOrEqual(1);
			});
		});
	});

	describe("Learning Progress", () => {
		it("should calculate learning progress correctly", () => {
			const progress = (decisionEngine as any).calculateLearningProgress();

			expect(progress).toBeDefined();
			expect(progress.totalLearningIterations).toBeGreaterThanOrEqual(0);
			expect(progress.accuracyTrend).toBeDefined();
			expect(progress.convergenceRate).toBeGreaterThanOrEqual(0);
			expect(progress.modelStability).toBeGreaterThanOrEqual(0);
		});

		it("should calculate model stability correctly", () => {
			const stability = (decisionEngine as any).calculateModelStability();

			expect(stability).toBeGreaterThanOrEqual(0);
			expect(stability).toBeLessThanOrEqual(1);
		});
	});
});
