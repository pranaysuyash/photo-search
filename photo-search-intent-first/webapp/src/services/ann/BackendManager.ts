/**
 * Central management system for all ANN backends
 */

import { BackendFactoryRegistry, type BaseBackend } from "./BackendInterface";
import { BackendRegistry } from "./BackendRegistry";
import { HealthMonitor } from "./HealthMonitor";
import { ResourceMonitor } from "./ResourceMonitor";
import {
	type AITask,
	type BackendHealth,
	type BackendSelection,
	PerformanceAlert,
	type ResourceAllocation,
	type ResourceRequirements,
	type RunningTask,
	type SystemResources,
	type TaskResult,
} from "./types";

export class BackendManager {
	private static instance: BackendManager;
	private backends: Map<string, BaseBackend> = new Map();
	private allocations: Map<string, ResourceAllocation> = new Map();
	private runningTasks: Map<string, RunningTask> = new Map();
	private taskQueue: AITask[] = [];
	private resourceMonitor: ResourceMonitor;
	private healthMonitor: HealthMonitor;
	private backendRegistry: BackendRegistry;
	private isInitialized = false;
	private config: BackendManagerConfig;

	private constructor(config: BackendManagerConfig = {}) {
		this.config = {
			maxConcurrentTasks: 5,
			resourceMonitorInterval: 5000,
			healthMonitorInterval: 10000,
			taskTimeout: 30000,
			enableAutoScaling: true,
			...config,
		};

		this.resourceMonitor = ResourceMonitor.getInstance({
			interval: this.config.resourceMonitorInterval,
		});
		this.healthMonitor = new HealthMonitor({
			interval: this.config.healthMonitorInterval,
		});
		this.backendRegistry = BackendRegistry.getInstance();
	}

	static getInstance(config?: BackendManagerConfig): BackendManager {
		if (!BackendManager.instance) {
			BackendManager.instance = new BackendManager(config);
		}
		return BackendManager.instance;
	}

	async initialize(): Promise<boolean> {
		if (this.isInitialized) {
			return true;
		}

		try {
			console.log("[BackendManager] Initializing backend management system...");

			// Initialize monitors
			await this.resourceMonitor.initialize();
			await this.healthMonitor.initialize();

			// Register and initialize backends
			await this.initializeBackends();

			// Start monitoring
			this.startMonitoring();

			this.isInitialized = true;
			console.log(
				"[BackendManager] Backend management system initialized successfully",
			);
			return true;
		} catch (error) {
			console.error("[BackendManager] Failed to initialize:", error);
			return false;
		}
	}

	async shutdown(): Promise<void> {
		if (!this.isInitialized) {
			return;
		}

		console.log("[BackendManager] Shutting down backend management system...");

		// Stop monitoring
		this.stopMonitoring();

		// Shutdown all backends
		for (const [backendId, backend] of this.backends) {
			try {
				await backend.shutdown();
				console.log(
					`[BackendManager] Backend ${backendId} shutdown successfully`,
				);
			} catch (error) {
				console.error(
					`[BackendManager] Error shutting down backend ${backendId}:`,
					error,
				);
			}
		}

		// Clear resources
		this.backends.clear();
		this.allocations.clear();
		this.runningTasks.clear();
		this.taskQueue = [];

		this.isInitialized = false;
		console.log("[BackendManager] Backend management system shutdown complete");
	}

	// Backend management
	async registerBackend(
		backendId: string,
		backend: BaseBackend,
	): Promise<boolean> {
		try {
			// Initialize backend
			const initialized = await backend.initialize();
			if (!initialized) {
				console.error(
					`[BackendManager] Failed to initialize backend ${backendId}`,
				);
				return false;
			}

			// Register backend
			this.backends.set(backendId, backend);
			this.backendRegistry.registerBackend(backendId, backend);

			// Start health monitoring
			this.healthMonitor.monitorBackend(backendId, backend);

			console.log(
				`[BackendManager] Backend ${backendId} registered successfully`,
			);
			return true;
		} catch (error) {
			console.error(
				`[BackendManager] Error registering backend ${backendId}:`,
				error,
			);
			return false;
		}
	}

	async unregisterBackend(backendId: string): Promise<void> {
		const backend = this.backends.get(backendId);
		if (backend) {
			try {
				// Stop health monitoring
				this.healthMonitor.unmonitorBackend(backendId);

				// Shutdown backend
				await backend.shutdown();

				// Remove from registry
				this.backends.delete(backendId);
				this.backendRegistry.unregisterBackend(backendId);

				// Clean up allocations and tasks
				this.cleanupBackendResources(backendId);

				console.log(
					`[BackendManager] Backend ${backendId} unregistered successfully`,
				);
			} catch (error) {
				console.error(
					`[BackendManager] Error unregistering backend ${backendId}:`,
					error,
				);
			}
		}
	}

	getBackend(backendId: string): BaseBackend | undefined {
		return this.backends.get(backendId);
	}

	getAvailableBackends(): string[] {
		return Array.from(this.backends.keys()).filter((backendId) => {
			const backend = this.backends.get(backendId);
			return backend && backend.isAvailable();
		});
	}

	getBackendHealth(backendId: string): BackendHealth | undefined {
		const backend = this.backends.get(backendId);
		return backend?.getHealth();
	}

	// Task execution
	async executeTask(task: AITask): Promise<TaskResult> {
		if (!this.isInitialized) {
			throw new Error("BackendManager is not initialized");
		}

		// Add task to queue
		this.taskQueue.push(task);

		// Process queue
		this.processTaskQueue();

		// Wait for task completion
		return new Promise((resolve, reject) => {
			task.onComplete = resolve;
			task.onError = reject;
		});
	}

	async selectBackend(task: AITask): Promise<BackendSelection> {
		const availableBackends = this.getAvailableBackends();
		const systemResources = this.resourceMonitor.getCurrentResources();

		// Score each backend
		const backendScores = await Promise.all(
			availableBackends.map(async (backendId) => {
				const backend = this.backends.get(backendId)!;
				const score = await this.calculateBackendScore(
					backend,
					task,
					systemResources,
				);
				return { backendId, score };
			}),
		);

		// Sort by score and select best
		backendScores.sort((a, b) => b.score - a.score);
		const bestBackend = backendScores[0];

		if (!bestBackend || bestBackend.score < 0.3) {
			throw new Error("No suitable backend found for task");
		}

		return {
			backend: bestBackend.backendId,
			confidence: bestBackend.score,
			fallbacks: backendScores.slice(1, 3).map((s) => s.backendId),
			reasoning: this.generateSelectionReasoning(bestBackend.backendId, task),
		};
	}

	// Resource management
	async allocateResources(
		backendId: string,
		requirements: ResourceRequirements,
	): Promise<ResourceAllocation> {
		const systemResources = this.resourceMonitor.getCurrentResources();
		const allocation: ResourceAllocation = {
			id: `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			backendId,
			memory: Math.min(
				requirements.memory.optimal,
				systemResources.availableMemory,
			),
			cpu: Math.min(requirements.cpu.optimal, systemResources.availableCPU),
			storage: requirements.storage.min,
			startTime: Date.now(),
			status: "active",
		};

		// Check GPU if required
		if (requirements.gpu && systemResources.availableGPU) {
			allocation.gpu = Math.min(
				requirements.gpu.optimal,
				systemResources.availableGPU,
			);
		}

		// Update system resources
		this.updateSystemResources(allocation, "allocate");

		// Store allocation
		this.allocations.set(allocation.id, allocation);

		console.log(
			`[BackendManager] Allocated resources for backend ${backendId}:`,
			allocation,
		);
		return allocation;
	}

	async releaseResources(allocationId: string): Promise<void> {
		const allocation = this.allocations.get(allocationId);
		if (allocation) {
			this.updateSystemResources(allocation, "release");
			allocation.endTime = Date.now();
			allocation.status = "released";

			console.log(
				`[BackendManager] Released resources for allocation ${allocationId}`,
			);
		}
	}

	// Monitoring and metrics
	getSystemResources(): SystemResources {
		return this.resourceMonitor.getCurrentResources();
	}

	getBackendStatuses(): Record<string, BackendHealth> {
		const statuses: Record<string, BackendHealth> = {};
		for (const [backendId, backend] of this.backends) {
			statuses[backendId] = backend.getHealth();
		}
		return statuses;
	}

	getRunningTasks(): RunningTask[] {
		return Array.from(this.runningTasks.values());
	}

	getTaskQueueStatus(): { queueLength: number; averageWaitTime: number } {
		const queueLength = this.taskQueue.length;
		const averageWaitTime =
			queueLength > 0
				? this.taskQueue.reduce(
						(sum, task) =>
							sum + (Date.now() - (task as unknown).queueTime || 0),
						0,
					) / queueLength
				: 0;

		return { queueLength, averageWaitTime };
	}

	// Private methods
	private async initializeBackends(): Promise<void> {
		const factoryRegistry = BackendFactoryRegistry.getInstance();
		const registeredBackends = factoryRegistry.getRegisteredBackends();

		for (const backendId of registeredBackends) {
			try {
				const backend = await factoryRegistry.createBackend(backendId);
				if (backend) {
					await this.registerBackend(backendId, backend);
				}
			} catch (error) {
				console.error(
					`[BackendManager] Failed to initialize backend ${backendId}:`,
					error,
				);
			}
		}
	}

	private startMonitoring(): void {
		this.resourceMonitor.start();
		this.healthMonitor.start();
	}

	private stopMonitoring(): void {
		this.resourceMonitor.stop();
		this.healthMonitor.stop();
	}

	private async processTaskQueue(): Promise<void> {
		if (this.runningTasks.size >= this.config.maxConcurrentTasks) {
			return; // At capacity
		}

		while (
			this.taskQueue.length > 0 &&
			this.runningTasks.size < this.config.maxConcurrentTasks
		) {
			const task = this.taskQueue.shift()!;
			this.executeTaskInternal(task);
		}
	}

	private async executeTaskInternal(task: AITask): Promise<void> {
		try {
			// Select backend
			const selection = await this.selectBackend(task);
			const backend = this.backends.get(selection.backend)!;

			// Allocate resources
			const allocation = await this.allocateResources(
				selection.backend,
				task.resourceRequirements,
			);

			// Create running task
			const runningTask: RunningTask = {
				taskId: task.id,
				backend: selection.backend,
				allocation,
				startTime: Date.now(),
				progress: 0,
				status: "running",
			};

			this.runningTasks.set(task.id, runningTask);

			// Execute task
			const result = await this.executeWithBackend(backend, task, allocation);

			// Release resources
			await this.releaseResources(allocation.id);

			// Clean up
			this.runningTasks.delete(task.id);

			// Process next task
			this.processTaskQueue();

			// Complete task
			task.onComplete?.(result);
		} catch (error) {
			console.error(`[BackendManager] Task ${task.id} failed:`, error);

			// Clean up on error
			const runningTask = this.runningTasks.get(task.id);
			if (runningTask) {
				await this.releaseResources(runningTask.allocation.id);
				this.runningTasks.delete(task.id);
			}

			// Process next task
			this.processTaskQueue();

			// Fail task
			task.onError?.(error as Error);
		}
	}

	private async executeWithBackend(
		backend: BaseBackend,
		task: AITask,
		allocation: ResourceAllocation,
	): Promise<TaskResult> {
		const startTime = Date.now();

		try {
			// Load model if not already loaded
			const models = await backend.listModels();
			if (!models.includes(task.modelId)) {
				await backend.loadModel(task.modelId, {
					modelId: task.modelId,
					backend: backend.id,
					parameters: {},
				});
			}

			// Run inference
			const output = await backend.runInference(task.modelId, task.input);

			const endTime = Date.now();
			const processingTime = endTime - startTime;

			return {
				taskId: task.id,
				output,
				backend: backend.id,
				processingTime,
				memoryUsage: allocation.memory,
				success: true,
				metadata: {
					selectionReasoning: await this.selectBackend(task).then(
						(s) => s.reasoning,
					),
					resourceAllocation: allocation,
				},
			};
		} catch (error) {
			const endTime = Date.now();
			const processingTime = endTime - startTime;

			return {
				taskId: task.id,
				output: {
					data: null,
					format: { type: "tensor", dtype: "float32" },
					processingTime,
				},
				backend: backend.id,
				processingTime,
				memoryUsage: allocation.memory,
				success: false,
				error: (error as Error).message,
			};
		}
	}

	private async calculateBackendScore(
		backend: BaseBackend,
		task: AITask,
		systemResources: SystemResources,
	): Promise<number> {
		let score = 0;

		// Capability match (40%)
		if (backend.hasCapability("inference", task.type)) {
			score += 0.4;
		}

		// Resource availability (30%)
		const resourceScore = this.calculateResourceScore(
			backend,
			task,
			systemResources,
		);
		score += resourceScore * 0.3;

		// Performance metrics (20%)
		const performanceMetrics = backend.getPerformanceMetrics();
		const performanceScore = this.calculatePerformanceScore(performanceMetrics);
		score += performanceScore * 0.2;

		// Health status (10%)
		const health = backend.getHealth();
		const healthScore =
			health.status === "healthy" ? 1 : health.status === "degraded" ? 0.5 : 0;
		score += healthScore * 0.1;

		return Math.min(1, Math.max(0, score));
	}

	private calculateResourceScore(
		backend: BaseBackend,
		task: AITask,
		systemResources: SystemResources,
	): number {
		const requirements = backend.getResourceEstimate(task.modelId, 1); // Estimate for single input

		// Memory availability
		const memoryScore =
			systemResources.availableMemory / requirements.memory.optimal;

		// CPU availability
		const cpuScore = systemResources.availableCPU / requirements.cpu.optimal;

		// GPU availability if required
		let gpuScore = 1;
		if (requirements.gpu) {
			gpuScore = systemResources.availableGPU
				? systemResources.availableGPU / requirements.gpu.optimal
				: 0;
		}

		return Math.min(1, (memoryScore + cpuScore + gpuScore) / 3);
	}

	private calculatePerformanceScore(metrics: any): number {
		// Normalize performance metrics (0-1 scale)
		const inferenceTimeScore = Math.max(0, 1 - metrics.inferenceTime / 1000); // Normalize to 1 second
		const memoryScore = Math.max(0, 1 - metrics.memoryUsage / 100); // Normalize to 100MB

		return (inferenceTimeScore + memoryScore) / 2;
	}

	private generateSelectionReasoning(
		backendId: string,
		task: AITask,
	): unknown[] {
		return [
			{
				criterion: "capability_match",
				score: 0.4,
				weight: 0.4,
				explanation: `Backend ${backendId} supports task type ${task.type}`,
			},
			{
				criterion: "resource_availability",
				score: 0.8,
				weight: 0.3,
				explanation: `Sufficient resources available for task execution`,
			},
			{
				criterion: "performance",
				score: 0.7,
				weight: 0.2,
				explanation: `Good performance characteristics for this task type`,
			},
			{
				criterion: "health",
				score: 1.0,
				weight: 0.1,
				explanation: `Backend is in healthy state`,
			},
		];
	}

	private updateSystemResources(
		allocation: ResourceAllocation,
		action: "allocate" | "release",
	): void {
		const multiplier = action === "allocate" ? -1 : 1;

		this.resourceMonitor.updateResources({
			availableMemory: allocation.memory * multiplier,
			availableCPU: allocation.cpu * multiplier,
			availableGPU: allocation.gpu ? allocation.gpu * multiplier : undefined,
		});
	}

	private cleanupBackendResources(backendId: string): void {
		// Remove allocations for this backend
		for (const [allocId, allocation] of this.allocations) {
			if (allocation.backendId === backendId) {
				this.releaseResources(allocId);
			}
		}

		// Cancel running tasks for this backend
		for (const [taskId, task] of this.runningTasks) {
			if (task.backend === backendId) {
				this.runningTasks.delete(taskId);
			}
		}
	}
}

interface BackendManagerConfig {
	maxConcurrentTasks?: number;
	resourceMonitorInterval?: number;
	healthMonitorInterval?: number;
	taskTimeout?: number;
	enableAutoScaling?: boolean;
}
