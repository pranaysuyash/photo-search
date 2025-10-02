/**
 * Intelligent backend selection system with scoring algorithms
 */

import { BaseBackend } from "./BackendInterface";
import { BackendRegistry } from "./BackendRegistry";
import { ResourceMonitor } from "./ResourceMonitor";
import {
	type AITask,
	type BackendHealth,
	type BackendInfo,
	type BackendSelection,
	ModelConfig,
	type PerformanceMetrics,
	ResourceRequirements,
	type SelectionReason,
	type SystemResources,
} from "./types";

export interface SelectionWeights {
	capabilityMatch: number;
	resourceAvailability: number;
	performanceScore: number;
	healthStatus: number;
	latencyScore: number;
	costEfficiency: number;
	reliability: number;
	modelAvailability: number;
}

export interface SelectionCriteria {
	taskType: string;
	modelId: string;
	priority: "low" | "normal" | "high" | "critical";
	constraints: {
		maxInferenceTime?: number;
		maxMemoryUsage?: number;
		requireGPU?: boolean;
		maxAccuracyLoss?: number;
		preferredBackends?: string[];
		excludedBackends?: string[];
	};
	context: {
		userPreference?: string;
		deviceType?: "mobile" | "tablet" | "desktop" | "server";
		networkCondition?: "poor" | "fair" | "good" | "excellent";
		batteryLevel?: number; // 0-100
	};
}

export interface BackendScore {
	backendId: string;
	score: number;
	confidence: number;
	reasoning: SelectionReason[];
	estimatedPerformance: {
		inferenceTime: number;
		memoryUsage: number;
		accuracy: number;
		reliability: number;
	};
}

export class BackendSelector {
	private backendRegistry: BackendRegistry;
	private resourceMonitor: ResourceMonitor;
	private performanceHistory: Map<string, BackendPerformanceHistory> =
		new Map();
	private userPreferences: Map<string, Map<string, number>> = new Map(); // userId -> backendId -> preference
	private weights: SelectionWeights;
	private selectionCache: Map<string, BackendSelection> = new Map();
	private cacheTTL: number = 30000; // 30 seconds

	constructor(weights: Partial<SelectionWeights> = {}) {
		this.backendRegistry = BackendRegistry.getInstance();
		this.resourceMonitor = ResourceMonitor.getInstance();

		// Default weights for selection criteria
		this.weights = {
			capabilityMatch: 0.25,
			resourceAvailability: 0.2,
			performanceScore: 0.2,
			healthStatus: 0.15,
			latencyScore: 0.1,
			costEfficiency: 0.05,
			reliability: 0.03,
			modelAvailability: 0.02,
			...weights,
		};
	}

	async selectBackend(
		task: AITask,
		criteria?: Partial<SelectionCriteria>,
	): Promise<BackendSelection> {
		const cacheKey = this.generateCacheKey(task, criteria);
		const cached = this.selectionCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
			return cached;
		}

		const fullCriteria: SelectionCriteria = {
			taskType: task.type,
			modelId: task.modelId,
			priority: task.priority,
			constraints: criteria?.constraints || {},
			context: criteria?.context || {},
		};

		// Get available backends
		const availableBackends = this.getEligibleBackends(fullCriteria);

		if (availableBackends.length === 0) {
			throw new Error("No available backends for this task");
		}

		// Score each backend
		const scores = await this.scoreBackends(availableBackends, fullCriteria);

		// Sort by score and select best
		scores.sort((a, b) => b.score - a.score);
		const bestBackend = scores[0];

		// Create selection result
		const selection: BackendSelection = {
			backend: bestBackend.backendId,
			confidence: bestBackend.confidence,
			fallbacks: scores.slice(1, 4).map((s) => s.backendId),
			reasoning: bestBackend.reasoning,
			estimatedPerformance: bestBackend.estimatedPerformance,
			timestamp: Date.now(),
		};

		// Cache the result
		this.selectionCache.set(cacheKey, selection);

		// Update performance history for learning
		this.updatePerformanceHistory(selection, fullCriteria);

		return selection;
	}

	async selectMultipleBackends(
		task: AITask,
		criteria?: Partial<SelectionCriteria>,
		count: number = 3,
	): Promise<BackendSelection[]> {
		const selection = await this.selectBackend(task, criteria);
		const selections: BackendSelection[] = [selection];

		// Add additional selections for load balancing
		for (let i = 1; i < count && i < selection.fallbacks.length + 1; i++) {
			const backendId =
				i === 1 ? selection.backend : selection.fallbacks[i - 2];
			const fallbackSelection: BackendSelection = {
				...selection,
				backend: backendId,
				confidence: selection.confidence * (1 - i * 0.2), // Reduce confidence for fallbacks
				fallbacks: selection.fallbacks.filter((id) => id !== backendId),
			};
			selections.push(fallbackSelection);
		}

		return selections;
	}

	updateSelectionWeights(weights: Partial<SelectionWeights>): void {
		this.weights = { ...this.weights, ...weights };
		this.selectionCache.clear(); // Clear cache when weights change
	}

	recordSelectionResult(
		selection: BackendSelection,
		actualPerformance: PerformanceMetrics,
		success: boolean,
	): void {
		// Update performance history with actual results
		const history = this.performanceHistory.get(selection.backend) || {
			backendId: selection.backend,
			selections: [],
			averageInferenceTime: 0,
			averageAccuracy: 0,
			successRate: 0,
			lastUpdated: Date.now(),
		};

		history.selections.push({
			timestamp: Date.now(),
			confidence: selection.confidence,
			expectedPerformance: selection.estimatedPerformance!,
			actualPerformance,
			success,
		});

		// Update averages
		const recentSelections = history.selections.slice(-100); // Last 100 selections
		const successfulSelections = recentSelections.filter((s) => s.success);

		history.averageInferenceTime =
			recentSelections.reduce(
				(sum, s) => sum + s.actualPerformance.inferenceTime,
				0,
			) / recentSelections.length;
		history.averageAccuracy =
			successfulSelections.reduce(
				(sum, s) => sum + (s.actualPerformance.accuracy || 0),
				0,
			) / successfulSelections.length;
		history.successRate = successfulSelections.length / recentSelections.length;
		history.lastUpdated = Date.now();

		this.performanceHistory.set(selection.backend, history);

		// Adjust weights based on performance (learning)
		this.adjustWeightsBasedOnPerformance(selection, actualPerformance, success);
	}

	getSelectionMetrics(): {
		totalSelections: number;
		averageConfidence: number;
		successRate: number;
		backendUsage: Record<string, number>;
		averageInferenceTime: number;
	} {
		const allSelections = Array.from(this.performanceHistory.values()).flatMap(
			(h) => h.selections,
		);
		const totalSelections = allSelections.length;

		if (totalSelections === 0) {
			return {
				totalSelections: 0,
				averageConfidence: 0,
				successRate: 0,
				backendUsage: {},
				averageInferenceTime: 0,
			};
		}

		const successfulSelections = allSelections.filter((s) => s.success);
		const backendUsage: Record<string, number> = {};

		allSelections.forEach((selection) => {
			const backendId =
				this.performanceHistory.entries().next().value?.[0] || "unknown";
			backendUsage[backendId] = (backendUsage[backendId] || 0) + 1;
		});

		return {
			totalSelections,
			averageConfidence:
				allSelections.reduce((sum, s) => sum + s.confidence, 0) /
				totalSelections,
			successRate: successfulSelections.length / totalSelections,
			backendUsage,
			averageInferenceTime:
				allSelections.reduce(
					(sum, s) => sum + s.actualPerformance.inferenceTime,
					0,
				) / totalSelections,
		};
	}

	// Private methods
	private getEligibleBackends(criteria: SelectionCriteria): BackendInfo[] {
		const allBackends = this.backendRegistry.getActiveBackends();

		return allBackends.filter((backend) => {
			// Check if backend supports the required capability
			const hasCapability = backend.capabilities.some(
				(cap) =>
					// Check if backend supports the required task type through any model
					cap.type === "inference" &&
					cap.modelTypes?.some(
						(model) =>
							// Check if any model supports the required task type
							model.capabilities?.some(
								(taskCap: any) => taskCap.type === criteria.taskType,
							) ||
							// Fallback to model ID matching (for backwards compatibility)
							model.id
								.toLowerCase()
								.includes(criteria.modelId.toLowerCase().split("_")[0]),
					),
			);

			if (!hasCapability) return false;

			// Check excluded backends
			if (criteria.constraints.excludedBackends?.includes(backend.id)) {
				return false;
			}

			// Check GPU requirement
			if (
				criteria.constraints.requireGPU &&
				!backend.performanceProfile.gpuUsage
			) {
				return false;
			}

			// Check max inference time
			if (criteria.constraints.maxInferenceTime) {
				const estimatedTime = this.estimateInferenceTime(backend, criteria);
				if (estimatedTime > criteria.constraints.maxInferenceTime) {
					return false;
				}
			}

			// Check max memory usage
			if (criteria.constraints.maxMemoryUsage) {
				const estimatedMemory = this.estimateMemoryUsage(backend, criteria);
				if (estimatedMemory > criteria.constraints.maxMemoryUsage) {
					return false;
				}
			}

			return true;
		});
	}

	private async scoreBackends(
		backends: BackendInfo[],
		criteria: SelectionCriteria,
	): Promise<BackendScore[]> {
		const systemResources = this.resourceMonitor.getCurrentResources();

		return Promise.all(
			backends.map(async (backend) => {
				const score = await this.calculateBackendScore(
					backend,
					criteria,
					systemResources,
				);
				return score;
			}),
		);
	}

	private async calculateBackendScore(
		backend: BackendInfo,
		criteria: SelectionCriteria,
		systemResources: SystemResources,
	): Promise<BackendScore> {
		let totalScore = 0;
		const reasoning: SelectionReason[] = [];

		// 1. Capability Match Score
		const capabilityScore = this.calculateCapabilityScore(backend, criteria);
		reasoning.push({
			criterion: "capability_match",
			score: capabilityScore,
			weight: this.weights.capabilityMatch,
			explanation: `Backend supports required capabilities for ${criteria.taskType}`,
		});
		totalScore += capabilityScore * this.weights.capabilityMatch;

		// 2. Resource Availability Score
		const resourceScore = this.calculateResourceScore(backend, systemResources);
		reasoning.push({
			criterion: "resource_availability",
			score: resourceScore,
			weight: this.weights.resourceAvailability,
			explanation: `Sufficient resources available (${(resourceScore * 100).toFixed(1)}%)`,
		});
		totalScore += resourceScore * this.weights.resourceAvailability;

		// 3. Performance Score
		const performanceScore = this.calculatePerformanceScore(backend, criteria);
		reasoning.push({
			criterion: "performance",
			score: performanceScore,
			weight: this.weights.performanceScore,
			explanation: `Good performance characteristics for this task`,
		});
		totalScore += performanceScore * this.weights.performanceScore;

		// 4. Health Status Score
		const healthScore = this.calculateHealthScore(backend.health);
		reasoning.push({
			criterion: "health",
			score: healthScore,
			weight: this.weights.healthStatus,
			explanation: `Backend is ${backend.health.status}`,
		});
		totalScore += healthScore * this.weights.healthStatus;

		// 5. Latency Score
		const latencyScore = this.calculateLatencyScore(backend, criteria);
		reasoning.push({
			criterion: "latency",
			score: latencyScore,
			weight: this.weights.latencyScore,
			explanation: `Low latency connection to backend`,
		});
		totalScore += latencyScore * this.weights.latencyScore;

		// 6. Cost Efficiency Score
		const costScore = this.calculateCostScore(backend, criteria);
		reasoning.push({
			criterion: "cost_efficiency",
			score: costScore,
			weight: this.weights.costEfficiency,
			explanation: `Cost-effective for this task type`,
		});
		totalScore += costScore * this.weights.costEfficiency;

		// 7. Reliability Score
		const reliabilityScore = this.calculateReliabilityScore(backend);
		reasoning.push({
			criterion: "reliability",
			score: reliabilityScore,
			weight: this.weights.reliability,
			explanation: `High reliability based on historical performance`,
		});
		totalScore += reliabilityScore * this.weights.reliability;

		// 8. Model Availability Score
		const modelScore = this.calculateModelAvailabilityScore(backend, criteria);
		reasoning.push({
			criterion: "model_availability",
			score: modelScore,
			weight: this.weights.modelAvailability,
			explanation: `Required model is available and ready`,
		});
		totalScore += modelScore * this.weights.modelAvailability;

		// Calculate confidence based on score variance and historical accuracy
		const confidence = this.calculateConfidence(backend, totalScore, reasoning);

		return {
			backendId: backend.id,
			score: Math.min(1, Math.max(0, totalScore)),
			confidence,
			reasoning,
			estimatedPerformance: {
				inferenceTime: this.estimateInferenceTime(backend, criteria),
				memoryUsage: this.estimateMemoryUsage(backend, criteria),
				accuracy: this.estimateAccuracy(backend, criteria),
				reliability: reliabilityScore,
			},
		};
	}

	private calculateCapabilityScore(
		backend: BackendInfo,
		criteria: SelectionCriteria,
	): number {
		const requiredCapability = backend.capabilities.find(
			(cap) =>
				cap.type === "inference" &&
				cap.modelTypes?.some((model) =>
					model.id
						.toLowerCase()
						.includes(criteria.modelId.toLowerCase().split("_")[0]),
				),
		);

		if (!requiredCapability) return 0;

		let score = 0.5; // Base score for having the capability

		// Bonus for specialized capabilities
		if (requiredCapability.classes?.length > 0) score += 0.2;
		if (requiredCapability.confidence && requiredCapability.confidence > 0.8)
			score += 0.2;
		if (
			requiredCapability.performance?.throughput &&
			requiredCapability.performance.throughput > 10
		)
			score += 0.1;

		return Math.min(1, score);
	}

	private calculateResourceScore(
		backend: BackendInfo,
		systemResources: SystemResources,
	): number {
		const requirements = backend.resourceRequirements;

		// Memory availability
		const memoryScore = Math.min(
			1,
			systemResources.availableMemory / requirements.memory.optimal,
		);

		// CPU availability
		const cpuScore = Math.min(
			1,
			systemResources.availableCPU / requirements.cpu.optimal,
		);

		// GPU availability if required
		let gpuScore = 1;
		if (requirements.gpu && systemResources.availableGPU) {
			gpuScore = Math.min(
				1,
				systemResources.availableGPU / requirements.gpu.optimal,
			);
		}

		return (memoryScore + cpuScore + gpuScore) / 3;
	}

	private calculatePerformanceScore(
		backend: BackendInfo,
		criteria: SelectionCriteria,
	): number {
		const perf = backend.performanceProfile;

		// Normalize performance metrics (0-1 scale)
		const inferenceTimeScore = Math.max(0, 1 - perf.inferenceTime / 1000); // Normalize to 1 second
		const memoryScore = Math.max(0, 1 - perf.memoryUsage / 500); // Normalize to 500MB
		const throughputScore = Math.min(1, perf.throughput / 20); // Normalize to 20 requests/second

		return (inferenceTimeScore + memoryScore + throughputScore) / 3;
	}

	private calculateHealthScore(health: BackendHealth): number {
		switch (health.status) {
			case "healthy":
				return 1.0;
			case "degraded":
				return 0.6;
			case "unhealthy":
				return 0.2;
			default:
				return 0.5;
		}
	}

	private calculateLatencyScore(
		backend: BackendInfo,
		criteria: SelectionCriteria,
	): number {
		const latency = backend.health.responseTime;

		// Normalize latency (lower is better)
		if (latency < 100) return 1.0;
		if (latency < 500) return 0.8;
		if (latency < 1000) return 0.6;
		if (latency < 2000) return 0.4;
		return 0.2;
	}

	private calculateCostScore(
		backend: BackendInfo,
		criteria: SelectionCriteria,
	): number {
		// Simple cost estimation based on resource usage
		const resourceCost =
			backend.resourceRequirements.memory.optimal +
			backend.resourceRequirements.cpu.optimal;

		// Normalize cost (lower is better)
		if (resourceCost < 100) return 1.0;
		if (resourceCost < 300) return 0.8;
		if (resourceCost < 500) return 0.6;
		return 0.4;
	}

	private calculateReliabilityScore(backend: BackendInfo): number {
		const history = this.performanceHistory.get(backend.id);
		if (!history) return 0.7; // Default score for new backends

		// Calculate reliability based on success rate and consistency
		const reliability = history.successRate;
		const consistency =
			1 -
			Math.abs(
				history.averageInferenceTime - backend.performanceProfile.inferenceTime,
			) /
				backend.performanceProfile.inferenceTime;

		return (reliability + consistency) / 2;
	}

	private calculateModelAvailabilityScore(
		backend: BackendInfo,
		criteria: SelectionCriteria,
	): number {
		// Check if the model is already loaded or readily available
		const models = backend.models || [];
		const hasModel = models.includes(criteria.modelId);

		return hasModel ? 1.0 : 0.5; // Penalty for model loading time
	}

	private calculateConfidence(
		backend: BackendInfo,
		score: number,
		reasoning: SelectionReason[],
	): number {
		if (reasoning.length === 0) {
			return Math.max(0.4, Math.min(1, score));
		}

		const averageReasonScore =
			reasoning.reduce((sum, reason) => sum + reason.score, 0) /
			reasoning.length;
		const scoreVariance =
			reasoning.reduce((sum, reason) => {
				return sum + (reason.score - averageReasonScore) ** 2;
			}, 0) / reasoning.length;

		const history = this.performanceHistory.get(backend.id);
		const historicalAccuracy = history
			? Math.max(0.5, Math.min(1, history.successRate))
			: 0.8;

		const variancePenalty = Math.max(0.5, 1 - scoreVariance);
		const scoreContribution = Math.max(
			0.4,
			Math.min(1, (score + averageReasonScore) / 2),
		);

		const blendedConfidence = variancePenalty * 0.5 + scoreContribution * 0.5;

		return Math.min(1, blendedConfidence * historicalAccuracy);
	}

	private estimateInferenceTime(
		backend: BackendInfo,
		criteria: SelectionCriteria,
	): number {
		const baseTime = backend.performanceProfile.inferenceTime;

		// Adjust based on task complexity
		const complexityMultiplier = this.getTaskComplexityMultiplier(
			criteria.taskType,
		);

		// Adjust based on priority (higher priority might use more resources)
		const priorityMultiplier =
			criteria.priority === "critical"
				? 0.8
				: criteria.priority === "high"
					? 0.9
					: 1.0;

		return baseTime * complexityMultiplier * priorityMultiplier;
	}

	private estimateMemoryUsage(
		backend: BackendInfo,
		criteria: SelectionCriteria,
	): number {
		const baseMemory = backend.performanceProfile.memoryUsage;

		// Adjust based on task complexity
		const complexityMultiplier = this.getTaskComplexityMultiplier(
			criteria.taskType,
		);
		let memoryUsage = baseMemory * complexityMultiplier;

		// Device-specific adjustments (mobile devices often rely on quantization or pruning)
		if (criteria.context.deviceType === "mobile") {
			memoryUsage *= 0.7;
		} else if (criteria.context.deviceType === "tablet") {
			memoryUsage *= 0.85;
		}

		// Apply constraint-driven optimizations (e.g., toggling smaller models or aggressive caching)
		if (criteria.constraints.maxMemoryUsage) {
			const optimizationFactor =
				criteria.context.deviceType === "mobile" ? 0.9 : 0.95;
			const optimizedLimit =
				criteria.constraints.maxMemoryUsage * optimizationFactor;
			memoryUsage = Math.min(memoryUsage, optimizedLimit);
			memoryUsage = Math.min(memoryUsage, criteria.constraints.maxMemoryUsage);
		}

		return Math.max(0, memoryUsage);
	}

	private estimateAccuracy(
		backend: BackendInfo,
		criteria: SelectionCriteria,
	): number {
		const baseAccuracy = backend.capabilities[0]?.confidence || 0.8;

		// Adjust based on backend health
		const healthMultiplier =
			backend.health.status === "healthy"
				? 1.0
				: backend.health.status === "degraded"
					? 0.9
					: 0.7;

		return baseAccuracy * healthMultiplier;
	}

	private getTaskComplexityMultiplier(taskType: string): number {
		const complexityMap: Record<string, number> = {
			face_detection: 1.0,
			face_recognition: 1.2,
			object_detection: 1.5,
			scene_classification: 1.1,
			image_embedding: 1.3,
			text_embedding: 0.8,
			query_understanding: 1.0,
			ocr_processing: 1.4,
			feature_extraction: 1.1,
			semantic_search: 1.2,
		};

		return complexityMap[taskType] || 1.0;
	}

	private generateCacheKey(
		task: AITask,
		criteria?: Partial<SelectionCriteria>,
	): string {
		const keyData = {
			taskType: task.type,
			modelId: task.modelId,
			priority: task.priority,
			constraints: criteria?.constraints,
			context: criteria?.context,
			timestamp: Math.floor(Date.now() / this.cacheTTL), // Group by cache TTL windows
		};

		return btoa(JSON.stringify(keyData));
	}

	private updatePerformanceHistory(
		selection: BackendSelection,
		criteria: SelectionCriteria,
	): void {
		// This will be updated when actual performance is recorded
		if (!this.performanceHistory.has(selection.backend)) {
			this.performanceHistory.set(selection.backend, {
				backendId: selection.backend,
				selections: [],
				averageInferenceTime: 0,
				averageAccuracy: 0,
				successRate: 0,
				lastUpdated: Date.now(),
			});
		}
	}

	private adjustWeightsBasedOnPerformance(
		selection: BackendSelection,
		actualPerformance: PerformanceMetrics,
		success: boolean,
	): void {
		// Simple weight adjustment based on performance
		const expectedTime = selection.estimatedPerformance.inferenceTime;
		const timeDiff =
			Math.abs(actualPerformance.inferenceTime - expectedTime) / expectedTime;

		if (timeDiff > 0.2) {
			// 20% deviation
			// Adjust performance weight
			this.weights.performanceScore = Math.max(
				0.1,
				Math.min(0.4, this.weights.performanceScore * 0.95),
			);
		}

		// Adjust weights based on success rate
		if (!success) {
			// Reduce confidence in selection criteria
			this.weights.healthStatus = Math.max(
				0.1,
				this.weights.healthStatus * 0.9,
			);
		}
	}
}

interface BackendPerformanceHistory {
	backendId: string;
	selections: Array<{
		timestamp: number;
		confidence: number;
		expectedPerformance: {
			inferenceTime: number;
			memoryUsage: number;
			accuracy: number;
			reliability: number;
		};
		actualPerformance: PerformanceMetrics;
		success: boolean;
	}>;
	averageInferenceTime: number;
	averageAccuracy: number;
	successRate: number;
	lastUpdated: number;
}
