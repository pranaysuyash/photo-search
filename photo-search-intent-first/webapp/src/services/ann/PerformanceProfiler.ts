/**
 * Performance profiling and analysis system for ANN backends
 */

import type { BaseBackend } from "./BackendInterface";
import { BackendRegistry } from "./BackendRegistry";
import { ResourceMonitor } from "./ResourceMonitor";
import {
	BackendProfile,
	ModelConfig,
	type PerformanceMetrics,
	type ResourceUsage,
	SystemResources,
	type TaskType,
} from "./types";

export interface PerformanceProfile {
	backendId: string;
	taskType: TaskType;
	modelId: string;
	metrics: PerformanceMetrics;
	resourceUsage: ResourceUsage;
	sampleSize: number;
	timestamp: number;
	metadata: {
		inputSize: number;
		inputShape?: number[];
		preprocessingTime: number;
		postprocessingTime: number;
		queueTime: number;
	};
}

export interface PerformanceBenchmark {
	backendId: string;
	taskType: TaskType;
	modelId: string;
	benchmarks: PerformanceProfile[];
	averages: {
		inferenceTime: number;
		memoryUsage: number;
		throughput: number;
		accuracy: number;
		reliability: number;
	};
	percentiles: {
		p50: number;
		p90: number;
		p95: number;
		p99: number;
	};
	trends: {
		performanceTrend: "improving" | "stable" | "degrading";
		trendSlope: number;
		lastUpdated: number;
	};
}

export interface ResourceProfile {
	backendId: string;
	baseline: ResourceUsage;
	scalingFactors: {
		memory: number;
		cpu: number;
		gpu?: number;
	};
	overhead: number;
	efficiency: number;
	patterns: {
		peakTimes: number[];
		usagePatterns: "consistent" | "bursty" | "gradual";
		resourceCorrelation: number;
	};
}

export interface OptimizationRecommendation {
	type: "model" | "backend" | "resource" | "configuration";
	priority: "low" | "medium" | "high" | "critical";
	title: string;
	description: string;
	impact: {
		performance: number; // percentage improvement
		resource: number; // percentage reduction
		reliability: number; // percentage improvement
	};
	implementation: {
		steps: string[];
		complexity: "simple" | "moderate" | "complex";
		estimatedTime: string;
	};
	risks: string[];
}

export interface ExecutionRecordOptions {
	resourceUsage?: Partial<ResourceUsage>;
	metadata?: Partial<PerformanceProfile["metadata"]>;
}

export class PerformanceProfiler {
	private profiles: Map<string, PerformanceProfile[]> = new Map();
	private benchmarks: Map<string, PerformanceBenchmark> = new Map();
	private resourceProfiles: Map<string, ResourceProfile> = new Map();
	private resourceMonitor: ResourceMonitor;
	private backendRegistry: BackendRegistry;
	private isProfiling = false;
	private profilingIntervalId: ReturnType<typeof setInterval> | null = null;
	private profileInterval: number = 60000; // 1 minute

	constructor(config: { profileInterval?: number } = {}) {
		this.resourceMonitor = ResourceMonitor.getInstance();
		this.backendRegistry = BackendRegistry.getInstance();
		this.profileInterval = config.profileInterval || 60000;
	}

	async initialize(): Promise<boolean> {
		try {
			console.log("[PerformanceProfiler] Initializing performance profiler...");

			// Load existing profiles from storage
			await this.loadProfiles();

			// Start automatic profiling
			this.startProfiling();

			console.log(
				"[PerformanceProfiler] Performance profiler initialized successfully",
			);
			return true;
		} catch (error) {
			console.error("[PerformanceProfiler] Failed to initialize:", error);
			return false;
		}
	}

	async stop(): Promise<void> {
		this.isProfiling = false;

		if (this.profilingIntervalId) {
			clearInterval(this.profilingIntervalId);
			this.profilingIntervalId = null;
		}
	}

	async recordExecution(
		backendId: string,
		taskType: TaskType,
		modelId: string,
		metrics: PerformanceMetrics,
		options: ExecutionRecordOptions = {},
	): Promise<void> {
		const normalizedMetrics = this.normalizeMetrics(metrics);
		const profileKey = `${backendId}_${taskType}_${modelId}`;
		const profiles = this.profiles.get(profileKey) || [];

		const resourceUsage = this.deriveResourceUsage(
			normalizedMetrics,
			options.resourceUsage,
		);
		const metadata = this.buildProfileMetadata(taskType, options.metadata);
		const timestamp = normalizedMetrics.timestamp ?? Date.now();

		const profile: PerformanceProfile = {
			backendId,
			taskType,
			modelId,
			metrics: normalizedMetrics,
			resourceUsage,
			sampleSize: 1,
			timestamp,
			metadata,
		};

		profiles.push(profile);
		this.profiles.set(profileKey, profiles);

		await this.updateBenchmark(backendId, taskType, modelId);
	}

	async profileBackend(
		backend: BaseBackend,
		taskType: TaskType,
		modelId: string,
		iterations: number = 10,
	): Promise<PerformanceProfile> {
		console.log(
			`[PerformanceProfiler] Profiling backend ${backend.id} for ${taskType}...`,
		);

		const profileKey = `${backend.id}_${taskType}_${modelId}`;
		const profiles = this.profiles.get(profileKey) || [];

		// Run multiple iterations to get accurate measurements
		const measurements: PerformanceMetrics[] = [];
		const resourceMeasurements: ResourceUsage[] = [];

		for (let i = 0; i < iterations; i++) {
			try {
				// Measure inference performance
				const result = await this.measureInferencePerformance(
					backend,
					taskType,
					modelId,
				);
				measurements.push(result.metrics);

				// Measure resource usage
				const resourceUsage = await this.measureResourceUsage(
					backend,
					taskType,
				);
				resourceMeasurements.push(resourceUsage);

				// Small delay between measurements
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				console.warn(
					`[PerformanceProfiler] Measurement ${i + 1} failed:`,
					error,
				);
			}
		}

		// Calculate averages and create profile
		const avgMetrics = this.calculateAverageMetrics(measurements);
		const avgResourceUsage =
			this.calculateAverageResourceUsage(resourceMeasurements);

		const profile: PerformanceProfile = {
			backendId: backend.id,
			taskType,
			modelId,
			metrics: avgMetrics,
			resourceUsage: avgResourceUsage,
			sampleSize: measurements.length,
			timestamp: Date.now(),
			metadata: {
				inputSize: this.estimateInputSize(taskType),
				preprocessingTime: 0, // Will be measured separately
				postprocessingTime: 0, // Will be measured separately
				queueTime: 0, // Will be measured separately
			},
		};

		// Store profile
		profiles.push(profile);
		this.profiles.set(profileKey, profiles);

		// Update benchmark
		await this.updateBenchmark(backend.id, taskType, modelId);

		console.log(
			`[PerformanceProfiler] Profile created for ${backend.id}:`,
			profile,
		);
		return profile;
	}

	getProfile(
		backendId: string,
		taskType: TaskType,
		modelId: string,
	): PerformanceProfile {
		const profileKey = `${backendId}_${taskType}_${modelId}`;
		const profiles = this.profiles.get(profileKey) || [];

		if (profiles.length === 0) {
			return {
				backendId,
				taskType,
				modelId,
				metrics: {
					inferenceTime: 0,
					memoryUsage: 0,
					throughput: 0,
					accuracy: 0,
					reliability: 0,
				},
				resourceUsage: {
					memory: 0,
					cpu: 0,
					storage: 0,
					timestamp: Date.now(),
				},
				sampleSize: 0,
				timestamp: Date.now(),
				metadata: this.buildProfileMetadata(taskType),
			};
		}

		const aggregatedMetrics = this.calculateAverageMetrics(
			profiles.map((p) => p.metrics),
		);
		const aggregatedResourceUsage = this.calculateAverageResourceUsage(
			profiles.map((p) => p.resourceUsage),
		);
		const sampleSize = profiles.reduce(
			(sum, profile) => sum + profile.sampleSize,
			0,
		);
		const latestProfile = profiles[profiles.length - 1];

		return {
			backendId,
			taskType,
			modelId,
			metrics: aggregatedMetrics,
			resourceUsage: aggregatedResourceUsage,
			sampleSize,
			timestamp: latestProfile.timestamp,
			metadata: latestProfile.metadata,
		};
	}

	async createResourceProfile(backend: BaseBackend): Promise<ResourceProfile> {
		console.log(
			`[PerformanceProfiler] Creating resource profile for ${backend.id}...`,
		);

		const baseline = await this.measureBaselineResourceUsage(backend);
		const scalingFactors = await this.measureScalingFactors(backend);
		const patterns = await this.analyzeResourcePatterns(backend.id);

		const profile: ResourceProfile = {
			backendId: backend.id,
			baseline,
			scalingFactors,
			overhead: this.calculateOverhead(baseline, scalingFactors),
			efficiency: this.calculateEfficiency(baseline, scalingFactors),
			patterns,
		};

		this.resourceProfiles.set(backend.id, profile);

		console.log(
			`[PerformanceProfiler] Resource profile created for ${backend.id}`,
		);
		return profile;
	}

	getPerformanceProfile(
		backendId: string,
		taskType: TaskType,
		modelId: string,
	): PerformanceProfile | null {
		const profileKey = `${backendId}_${taskType}_${modelId}`;
		const profiles = this.profiles.get(profileKey) || [];
		return profiles.length > 0 ? profiles[profiles.length - 1] : null;
	}

	getBenchmark(
		backendId: string,
		taskType: TaskType,
		modelId: string,
	): PerformanceBenchmark | null {
		const benchmarkKey = `${backendId}_${taskType}_${modelId}`;
		return this.benchmarks.get(benchmarkKey) || null;
	}

	getResourceProfile(backendId: string): ResourceProfile | null {
		return this.resourceProfiles.get(backendId) || null;
	}

	getAvailableBackends() {
		return this.backendRegistry.getAvailableBackends();
	}

	compareBackends(
		backendIds: string[] | null,
		taskType: TaskType,
		modelId: string,
	): {
		comparison: Array<{
			backendId: string;
			performance: PerformanceProfile | null;
			rank: number;
			scores: {
				speed: number;
				efficiency: number;
				reliability: number;
				overall: number;
			};
		}>;
		winner: string | null;
	} {
		// If no backend IDs provided, get all available backends
		const idsToCompare =
			backendIds || this.getAvailableBackends().map((b) => b.id);

		const comparison = idsToCompare.map((backendId) => {
			const profile = this.getPerformanceProfile(backendId, taskType, modelId);
			const scores = profile
				? this.calculatePerformanceScores(profile)
				: {
						speed: 0,
						efficiency: 0,
						reliability: 0,
						overall: 0,
					};

			return {
				backendId,
				performance: profile,
				rank: 0, // Will be calculated after sorting
				scores,
			};
		});

		// Sort by overall score
		comparison.sort((a, b) => b.scores.overall - a.scores.overall);

		// Assign ranks
		comparison.forEach((item, index) => {
			item.rank = index + 1;
		});

		return {
			comparison,
			winner: comparison.length > 0 ? comparison[0].backendId : null,
		};
	}

	generateOptimizationRecommendations(
		backendId: string,
	): OptimizationRecommendation[] {
		const recommendations: OptimizationRecommendation[] = [];

		// Analyze performance profiles
		const profiles = Array.from(this.profiles.values())
			.flat()
			.filter((p) => p.backendId === backendId);
		const resourceProfile = this.resourceProfiles.get(backendId);

		if (profiles.length === 0) {
			return recommendations;
		}

		// Check for high inference times
		const avgInferenceTime =
			profiles.reduce((sum, p) => sum + p.metrics.inferenceTime, 0) /
			profiles.length;
		if (avgInferenceTime > 500) {
			// 500ms threshold
			recommendations.push({
				type: "model",
				priority: "high",
				title: "High Inference Time Detected",
				description: `Average inference time of ${avgInferenceTime.toFixed(2)}ms exceeds recommended threshold`,
				impact: {
					performance: 30,
					resource: 15,
					reliability: 10,
				},
				implementation: {
					steps: [
						"Consider model quantization",
						"Implement model pruning",
						"Use model distillation",
						"Optimize input preprocessing",
					],
					complexity: "moderate",
					estimatedTime: "2-3 days",
				},
				risks: [
					"Potential accuracy loss",
					"Increased development time",
					"Compatibility issues",
				],
			});
		}

		// Check for high memory usage
		const avgMemoryUsage =
			profiles.reduce((sum, p) => sum + p.metrics.memoryUsage, 0) /
			profiles.length;
		if (avgMemoryUsage > 200) {
			// 200MB threshold
			recommendations.push({
				type: "resource",
				priority: "medium",
				title: "High Memory Usage",
				description: `Average memory usage of ${avgMemoryUsage.toFixed(2)}MB could be optimized`,
				impact: {
					performance: 20,
					resource: 40,
					reliability: 5,
				},
				implementation: {
					steps: [
						"Implement memory pooling",
						"Use gradient checkpointing",
						"Optimize model architecture",
						"Implement memory-efficient data loading",
					],
					complexity: "simple",
					estimatedTime: "1-2 days",
				},
				risks: ["Slight performance overhead", "Increased complexity"],
			});
		}

		// Check resource efficiency
		if (resourceProfile && resourceProfile.efficiency < 0.7) {
			recommendations.push({
				type: "backend",
				priority: "medium",
				title: "Low Resource Efficiency",
				description: `Backend resource efficiency is ${(resourceProfile.efficiency * 100).toFixed(1)}%, below optimal level`,
				impact: {
					performance: 15,
					resource: 35,
					reliability: 10,
				},
				implementation: {
					steps: [
						"Optimize backend configuration",
						"Implement better resource scheduling",
						"Use hardware acceleration",
						"Optimize memory allocation",
					],
					complexity: "moderate",
					estimatedTime: "3-4 days",
				},
				risks: ["Configuration complexity", "Hardware compatibility issues"],
			});
		}

		// Check for performance degradation
		const trends = this.analyzePerformanceTrends(backendId);
		if (trends.trend === "degrading") {
			recommendations.push({
				type: "configuration",
				priority: "high",
				title: "Performance Degradation Detected",
				description: `Performance is degrading over time with trend slope of ${trends.slope.toFixed(3)}`,
				impact: {
					performance: 25,
					resource: 10,
					reliability: 20,
				},
				implementation: {
					steps: [
						"Investigate performance bottlenecks",
						"Monitor system resources",
						"Check for memory leaks",
						"Optimize data pipelines",
					],
					complexity: "complex",
					estimatedTime: "1-2 weeks",
				},
				risks: [
					"Extended investigation time",
					"Complex debugging required",
					"Potential system instability during investigation",
				],
			});
		}

		return recommendations.sort((a, b) => {
			const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
			return priorityOrder[b.priority] - priorityOrder[a.priority];
		});
	}

	getPerformanceSummary(backendId?: string): {
		totalProfiles: number;
		averageMetrics: {
			inferenceTime: number;
			memoryUsage: number;
			throughput: number;
			accuracy: number;
		};
		topPerforming: string;
		mostEfficient: string;
		trends: Array<{
			backendId: string;
			trend: "improving" | "stable" | "degrading";
			slope: number;
		}>;
	} {
		const allProfiles = backendId
			? Array.from(this.profiles.values())
					.flat()
					.filter((p) => p.backendId === backendId)
			: Array.from(this.profiles.values()).flat();

		if (allProfiles.length === 0) {
			return {
				totalProfiles: 0,
				averageMetrics: {
					inferenceTime: 0,
					memoryUsage: 0,
					throughput: 0,
					accuracy: 0,
				},
				topPerforming: "",
				mostEfficient: "",
				trends: [],
			};
		}

		const avgMetrics = {
			inferenceTime:
				allProfiles.reduce((sum, p) => sum + p.metrics.inferenceTime, 0) /
				allProfiles.length,
			memoryUsage:
				allProfiles.reduce((sum, p) => sum + p.metrics.memoryUsage, 0) /
				allProfiles.length,
			throughput:
				allProfiles.reduce((sum, p) => sum + (p.metrics.throughput || 0), 0) /
				allProfiles.length,
			accuracy:
				allProfiles.reduce((sum, p) => sum + (p.metrics.accuracy || 0), 0) /
				allProfiles.filter((p) => p.metrics.accuracy).length,
		};

		const backendGroups = allProfiles.reduce(
			(groups, profile) => {
				if (!groups[profile.backendId]) groups[profile.backendId] = [];
				groups[profile.backendId].push(profile);
				return groups;
			},
			{} as Record<string, PerformanceProfile[]>,
		);

		const backendScores = Object.entries(backendGroups).map(
			([id, profiles]) => {
				const avgInferenceTime =
					profiles.reduce((sum, p) => sum + p.metrics.inferenceTime, 0) /
					profiles.length;
				const avgMemoryUsage =
					profiles.reduce((sum, p) => sum + p.metrics.memoryUsage, 0) /
					profiles.length;
				return {
					backendId: id,
					performanceScore: 1 / (1 + avgInferenceTime / 1000), // Lower is better
					efficiencyScore: 1 / (1 + avgMemoryUsage / 100), // Lower is better
					profiles,
				};
			},
		);

		const topPerforming = backendScores.reduce((best, current) =>
			current.performanceScore > best.performanceScore ? current : best,
		).backendId;

		const mostEfficient = backendScores.reduce((best, current) =>
			current.efficiencyScore > best.efficiencyScore ? current : best,
		).backendId;

		const trends = backendScores.map(({ backendId }) => {
			const trend = this.analyzePerformanceTrends(backendId);
			return {
				backendId,
				trend: trend.trend,
				slope: trend.slope,
			};
		});

		return {
			totalProfiles: allProfiles.length,
			averageMetrics: avgMetrics,
			topPerforming,
			mostEfficient,
			trends,
		};
	}

	exportProfiles(): string {
		const data = {
			profiles: Object.fromEntries(this.profiles),
			benchmarks: Object.fromEntries(this.benchmarks),
			resourceProfiles: Object.fromEntries(this.resourceProfiles),
			exportedAt: Date.now(),
		};

		return JSON.stringify(data, null, 2);
	}

	importProfiles(jsonData: string): boolean {
		try {
			const data = JSON.parse(jsonData);

			if (data.profiles) {
				this.profiles = new Map(Object.entries(data.profiles));
			}

			if (data.benchmarks) {
				this.benchmarks = new Map(Object.entries(data.benchmarks));
			}

			if (data.resourceProfiles) {
				this.resourceProfiles = new Map(Object.entries(data.resourceProfiles));
			}

			console.log("[PerformanceProfiler] Profiles imported successfully");
			return true;
		} catch (error) {
			console.error("[PerformanceProfiler] Failed to import profiles:", error);
			return false;
		}
	}

	// Private methods
	private async measureInferencePerformance(
		backend: BaseBackend,
		taskType: TaskType,
		modelId: string,
	): Promise<{ metrics: PerformanceMetrics; resourceUsage: ResourceUsage }> {
		const startTime = performance.now();
		const startMemory = this.getCurrentMemoryUsage();

		// Create test input based on task type
		const testInput = this.createTestInput(taskType);

		try {
			// Run inference
			const output = await backend.runInference(modelId, testInput);

			const endTime = performance.now();
			const endMemory = this.getCurrentMemoryUsage();

			const metrics: PerformanceMetrics = {
				inferenceTime: endTime - startTime,
				memoryUsage: endMemory - startMemory,
				throughput: 1000 / (endTime - startTime), // requests per second
				accuracy: this.estimateAccuracy(taskType, output),
				reliability: 1.0, // Will be updated based on multiple measurements
			};

			const resourceUsage: ResourceUsage = {
				memory: metrics.memoryUsage,
				cpu: await this.getCurrentCPUUsage(),
				storage: 0,
				timestamp: Date.now(),
			};

			return { metrics, resourceUsage };
		} catch (error) {
			console.error(
				`[PerformanceProfiler] Inference measurement failed:`,
				error,
			);
			throw error;
		}
	}

	private async measureResourceUsage(
		backend: BaseBackend,
		taskType: TaskType,
	): Promise<ResourceUsage> {
		// Measure resource usage during a typical task
		const beforeResources = this.resourceMonitor.getCurrentResources();

		// Run a quick measurement task
		try {
			await this.measureInferencePerformance(backend, taskType, "model1"); // Use default model
			const afterResources = this.resourceMonitor.getCurrentResources();

			return {
				memory: beforeResources.totalMemory - afterResources.availableMemory,
				cpu: beforeResources.totalCPU - afterResources.availableCPU,
				storage: 0,
				timestamp: Date.now(),
			};
		} catch (error) {
			// Return baseline if measurement fails
			return {
				memory: 50, // Default estimate
				cpu: 20, // Default estimate
				storage: 0,
				timestamp: Date.now(),
			};
		}
	}

	private async measureBaselineResourceUsage(
		backend: BaseBackend,
	): Promise<ResourceUsage> {
		// Measure baseline resource usage when idle
		const beforeResources = this.resourceMonitor.getCurrentResources();

		// Wait for a short period to measure idle usage
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const afterResources = this.resourceMonitor.getCurrentResources();

		return {
			memory: beforeResources.totalMemory - afterResources.availableMemory,
			cpu: beforeResources.totalCPU - afterResources.availableCPU,
			storage: 0,
			timestamp: Date.now(),
		};
	}

	private async measureScalingFactors(
		backend: BaseBackend,
	): Promise<{ memory: number; cpu: number; gpu?: number }> {
		// Measure how resource usage scales with load
		const scalingFactors = { memory: 1.2, cpu: 1.5 }; // Default scaling factors

		// In a real implementation, this would run multiple tests with different loads
		// For now, return reasonable defaults

		return scalingFactors;
	}

	private async analyzeResourcePatterns(backendId: string): Promise<{
		peakTimes: number[];
		usagePatterns: "consistent" | "bursty" | "gradual";
		resourceCorrelation: number;
	}> {
		// Analyze historical resource usage patterns
		const profiles = Array.from(this.profiles.values())
			.flat()
			.filter((p) => p.backendId === backendId);

		if (profiles.length < 10) {
			return {
				peakTimes: [],
				usagePatterns: "consistent",
				resourceCorrelation: 0.5,
			};
		}

		// Simple pattern analysis
		const usagePattern = this.detectUsagePattern(profiles);
		const correlation = this.calculateResourceCorrelation(profiles);

		return {
			peakTimes: this.findPeakTimes(profiles),
			usagePatterns: usagePattern,
			resourceCorrelation: correlation,
		};
	}

	private normalizeMetrics(metrics: PerformanceMetrics): PerformanceMetrics {
		const timestamp = metrics.timestamp ?? Date.now();
		const accuracy =
			typeof metrics.accuracy === "number"
				? Math.max(0, Math.min(1, metrics.accuracy))
				: undefined;
		const reliability =
			typeof metrics.reliability === "number"
				? Math.max(0, Math.min(1, metrics.reliability))
				: accuracy;

		return {
			inferenceTime: metrics.inferenceTime,
			memoryUsage: metrics.memoryUsage,
			cpuUsage: metrics.cpuUsage,
			gpuUsage: metrics.gpuUsage,
			accuracy,
			throughput: metrics.throughput,
			reliability,
			timestamp,
		};
	}

	private deriveResourceUsage(
		metrics: PerformanceMetrics,
		overrides: Partial<ResourceUsage> = {},
	): ResourceUsage {
		const currentResources = this.resourceMonitor.getCurrentResources();

		const totalCPU = currentResources.totalCPU ?? 0;
		const availableCPU = currentResources.availableCPU ?? totalCPU;
		const totalStorage = currentResources.totalStorage ?? 0;
		const availableStorage = currentResources.availableStorage ?? totalStorage;

		const usage: ResourceUsage = {
			memory: overrides.memory ?? metrics.memoryUsage,
			cpu:
				overrides.cpu ??
				metrics.cpuUsage ??
				Math.max(0, totalCPU - availableCPU),
			storage:
				overrides.storage ?? Math.max(0, totalStorage - availableStorage),
			timestamp: Date.now(),
		};

		if (overrides.gpu !== undefined) {
			usage.gpu = overrides.gpu;
		} else if (metrics.gpuUsage !== undefined) {
			usage.gpu = metrics.gpuUsage;
		}

		if (overrides.network) {
			usage.network = overrides.network;
		}

		return usage;
	}

	private buildProfileMetadata(
		taskType: TaskType,
		overrides: Partial<PerformanceProfile["metadata"]> = {},
	): PerformanceProfile["metadata"] {
		return {
			inputSize: overrides.inputSize ?? this.estimateInputSize(taskType),
			inputShape: overrides.inputShape,
			preprocessingTime: overrides.preprocessingTime ?? 0,
			postprocessingTime: overrides.postprocessingTime ?? 0,
			queueTime: overrides.queueTime ?? 0,
		};
	}

	private calculateAverageMetrics(
		metrics: PerformanceMetrics[],
	): PerformanceMetrics {
		if (metrics.length === 0) {
			return {
				inferenceTime: 0,
				memoryUsage: 0,
				throughput: 0,
				accuracy: 0,
			};
		}

		return {
			inferenceTime:
				metrics.reduce((sum, m) => sum + m.inferenceTime, 0) / metrics.length,
			memoryUsage:
				metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length,
			throughput:
				metrics.reduce((sum, m) => sum + (m.throughput || 0), 0) /
				metrics.length,
			accuracy: (() => {
				const accuracyValues = metrics
					.map((m) => m.accuracy)
					.filter((value): value is number => typeof value === "number");
				if (accuracyValues.length === 0) {
					return 0;
				}
				return (
					accuracyValues.reduce((sum, value) => sum + value, 0) /
					accuracyValues.length
				);
			})(),
			reliability: (() => {
				const reliabilityValues = metrics
					.map((m) => m.reliability)
					.filter((value): value is number => typeof value === "number");
				if (reliabilityValues.length === 0) {
					return undefined;
				}
				return (
					reliabilityValues.reduce((sum, value) => sum + value, 0) /
					reliabilityValues.length
				);
			})(),
		};
	}

	private calculateAverageResourceUsage(
		usages: ResourceUsage[],
	): ResourceUsage {
		if (usages.length === 0) {
			return { memory: 0, cpu: 0, storage: 0, timestamp: Date.now() };
		}

		return {
			memory: usages.reduce((sum, u) => sum + u.memory, 0) / usages.length,
			cpu: usages.reduce((sum, u) => sum + u.cpu, 0) / usages.length,
			storage: usages.reduce((sum, u) => sum + u.storage, 0) / usages.length,
			timestamp: Date.now(),
		};
	}

	private async updateBenchmark(
		backendId: string,
		taskType: TaskType,
		modelId: string,
	): Promise<void> {
		const benchmarkKey = `${backendId}_${taskType}_${modelId}`;
		const profiles = this.profiles.get(benchmarkKey) || [];

		if (profiles.length < 2) return;

		const averages = this.calculateAverageMetrics(
			profiles.map((p) => p.metrics),
		);
		const percentiles = this.calculatePercentiles(
			profiles.map((p) => p.metrics.inferenceTime),
		);
		const trends = this.analyzePerformanceTrends(backendId);

		const benchmark: PerformanceBenchmark = {
			backendId,
			taskType,
			modelId,
			benchmarks: profiles,
			averages: {
				inferenceTime: averages.inferenceTime,
				memoryUsage: averages.memoryUsage,
				throughput: averages.throughput,
				accuracy: averages.accuracy,
				reliability: 1.0, // Will be calculated based on success rate
			},
			percentiles,
			trends,
		};

		this.benchmarks.set(benchmarkKey, benchmark);
	}

	private calculatePercentiles(values: number[]): {
		p50: number;
		p90: number;
		p95: number;
		p99: number;
	} {
		if (values.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0 };

		const sorted = [...values].sort((a, b) => a - b);
		const getPercentile = (p: number) => {
			const index = Math.ceil((p / 100) * sorted.length) - 1;
			return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
		};

		return {
			p50: getPercentile(50),
			p90: getPercentile(90),
			p95: getPercentile(95),
			p99: getPercentile(99),
		};
	}

	private calculatePerformanceScores(profile: PerformanceProfile): {
		speed: number;
		efficiency: number;
		reliability: number;
		overall: number;
	} {
		const speed = Math.max(
			0,
			Math.min(1, 1000 / profile.metrics.inferenceTime),
		); // Normalize to 1 second
		const efficiency = Math.max(
			0,
			Math.min(1, 100 / profile.metrics.memoryUsage),
		); // Normalize to 100MB
		const reliability = profile.metrics.accuracy || 0.8; // Use accuracy as reliability proxy

		const overall = (speed + efficiency + reliability) / 3;

		return { speed, efficiency, reliability, overall };
	}

	private analyzePerformanceTrends(backendId: string): {
		trend: "improving" | "stable" | "degrading";
		slope: number;
	} {
		const profiles = Array.from(this.profiles.values())
			.flat()
			.filter((p) => p.backendId === backendId)
			.sort((a, b) => a.timestamp - b.timestamp);

		if (profiles.length < 5) {
			return { trend: "stable", slope: 0 };
		}

		// Simple linear regression to detect trends
		const x = profiles.map((_, i) => i);
		const y = profiles.map((p) => p.metrics.inferenceTime);

		const xMean = x.reduce((sum, val) => sum + val, 0) / x.length;
		const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;

		const numerator = x.reduce(
			(sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean),
			0,
		);
		const denominator = x.reduce((sum, xi) => sum + (xi - xMean) ** 2, 0);

		const slope = denominator !== 0 ? numerator / denominator : 0;

		let trend: "improving" | "stable" | "degrading";
		if (Math.abs(slope) < 0.1) {
			trend = "stable";
		} else if (slope < 0) {
			trend = "improving";
		} else {
			trend = "degrading";
		}

		return { trend, slope };
	}

	private calculateOverhead(
		baseline: ResourceUsage,
		scalingFactors: { memory: number; cpu: number },
	): number {
		// Calculate overhead as percentage of baseline
		const totalBaseline = baseline.memory + baseline.cpu;
		const totalScaling = scalingFactors.memory + scalingFactors.cpu;
		return Math.max(0, (totalScaling - totalBaseline) / totalBaseline);
	}

	private calculateEfficiency(
		baseline: ResourceUsage,
		scalingFactors: { memory: number; cpu: number },
	): number {
		// Calculate efficiency as inverse of overhead
		const overhead = this.calculateOverhead(baseline, scalingFactors);
		return Math.max(0, Math.min(1, 1 - overhead));
	}

	private detectUsagePattern(
		profiles: PerformanceProfile[],
	): "consistent" | "bursty" | "gradual" {
		if (profiles.length < 5) return "consistent";

		const values = profiles.map((p) => p.metrics.inferenceTime);
		const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
		const variance =
			values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
		const stdDev = Math.sqrt(variance);
		const cv = stdDev / mean; // Coefficient of variation

		if (cv < 0.1) return "consistent";
		if (cv < 0.3) return "gradual";
		return "bursty";
	}

	private calculateResourceCorrelation(profiles: PerformanceProfile[]): number {
		if (profiles.length < 2) return 0;

		const memoryValues = profiles.map((p) => p.resourceUsage.memory);
		const cpuValues = profiles.map((p) => p.resourceUsage.cpu);

		const memoryMean =
			memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length;
		const cpuMean = cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length;

		let numerator = 0;
		let memoryDenominator = 0;
		let cpuDenominator = 0;

		for (let i = 0; i < profiles.length; i++) {
			const memoryDiff = memoryValues[i] - memoryMean;
			const cpuDiff = cpuValues[i] - cpuMean;

			numerator += memoryDiff * cpuDiff;
			memoryDenominator += memoryDiff ** 2;
			cpuDenominator += cpuDiff ** 2;
		}

		const denominator = Math.sqrt(memoryDenominator * cpuDenominator);
		return denominator !== 0 ? numerator / denominator : 0;
	}

	private findPeakTimes(profiles: PerformanceProfile[]): number[] {
		// Simple peak detection based on inference time
		const times = profiles.map((p) => p.timestamp);
		const values = profiles.map((p) => p.metrics.inferenceTime);

		const peaks: number[] = [];
		const threshold =
			(values.reduce((sum, v) => sum + v, 0) / values.length) * 1.5; // 1.5x mean

		for (let i = 1; i < values.length - 1; i++) {
			if (
				values[i] > threshold &&
				values[i] > values[i - 1] &&
				values[i] > values[i + 1]
			) {
				peaks.push(times[i]);
			}
		}

		return peaks;
	}

	private createTestInput(taskType: TaskType): any {
		// Create appropriate test input based on task type
		switch (taskType) {
			case "face_detection":
				return {
					data: new Float32Array(224 * 224 * 3),
					format: { type: "image", shape: [224, 224, 3], dtype: "float32" },
				};
			case "image_embedding":
				return {
					data: new Float32Array(299 * 299 * 3),
					format: { type: "image", shape: [299, 299, 3], dtype: "float32" },
				};
			case "text_embedding":
				return {
					data: ["test text"],
					format: { type: "text", dtype: "string" },
				};
			default:
				return {
					data: new Float32Array(100),
					format: { type: "tensor", shape: [100], dtype: "float32" },
				};
		}
	}

	private estimateInputSize(taskType: TaskType): number {
		// Estimate input size in bytes
		switch (taskType) {
			case "face_detection":
				return 224 * 224 * 3 * 4; // 224x224 RGB image as float32
			case "image_embedding":
				return 299 * 299 * 3 * 4; // 299x299 RGB image as float32
			case "text_embedding":
				return 100; // Small text input
			default:
				return 1000; // Default estimate
		}
	}

	private estimateAccuracy(taskType: TaskType, output: any): number {
		// Estimate accuracy based on task type and output
		// This is a simplified estimation - in practice, you'd need ground truth data
		switch (taskType) {
			case "face_detection":
				return 0.85;
			case "image_embedding":
				return 0.9;
			case "text_embedding":
				return 0.88;
			default:
				return 0.8;
		}
	}

	private getCurrentMemoryUsage(): number {
		// Simple memory usage estimation
		if ("memory" in performance) {
			const memory = (performance as unknown).memory;
			return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
		}
		return 50; // Default estimate
	}

	private async getCurrentCPUUsage(): Promise<number> {
		// Simple CPU usage estimation
		return 20; // Default estimate
	}

	private startProfiling(): void {
		this.isProfiling = true;

		if (this.profilingIntervalId) {
			clearInterval(this.profilingIntervalId);
		}

		// Set up periodic profiling
		this.profilingIntervalId = setInterval(async () => {
			if (this.isProfiling) {
				await this.runPeriodicProfiling();
			}
		}, this.profileInterval);
	}

	private async runPeriodicProfiling(): Promise<void> {
		// Run periodic profiling tasks
		// This would include checking for new backends, updating profiles, etc.
		console.log("[PerformanceProfiler] Running periodic profiling...");
	}

	private async loadProfiles(): Promise<void> {
		// Load profiles from persistent storage
		// In a real implementation, this would load from localStorage, IndexedDB, or a server
		console.log("[PerformanceProfiler] Loading existing profiles...");
	}
}
