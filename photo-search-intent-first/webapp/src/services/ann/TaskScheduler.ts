/**
 * Task Scheduler and Load Balancer
 * Manages task execution across multiple backends with intelligent load balancing
 */

import { BackendRegistry } from "./BackendRegistry";
import { BackendSelector } from "./BackendSelector";
import { HealthMonitor } from "./HealthMonitor";
import { ModelRegistry } from "./ModelRegistry";
import { ResourceMonitor } from "./ResourceMonitor";
import type {
	AITask,
	BackendHealth,
	PerformanceMetrics,
	ResourceRequirements,
	TaskPriority,
	TaskResult,
} from "./types";

export interface QueuedTask {
	id: string;
	task: AITask;
	priority: TaskPriority;
	createdAt: number;
	estimatedDuration: number;
	retryCount: number;
	maxRetries: number;
	timeout: number;
	status: "queued" | "processing" | "completed" | "failed" | "cancelled";
	assignedBackend?: string;
	assignedModel?: string;
	startTime?: number;
	endTime?: number;
	result?: TaskResult;
	error?: string;
	progress?: number;
	metadata?: Record<string, any>;
}

export interface SchedulerConfig {
	maxConcurrentTasks: number;
	maxQueueSize: number;
	taskTimeout: number;
	retryAttempts: number;
	loadBalancingStrategy:
		| "round-robin"
		| "least-loaded"
		| "performance-based"
		| "resource-aware";
	priorityMode: "strict" | "weighted" | "fair-share";
	healthCheckInterval: number;
	autoScaling: boolean;
	scalingThresholds: {
		cpuThreshold: number;
		memoryThreshold: number;
		queueLengthThreshold: number;
	};
}

export interface LoadBalancingMetrics {
	totalTasks: number;
	completedTasks: number;
	failedTasks: number;
	averageProcessingTime: number;
	throughput: number;
	backendUtilization: Record<string, number>;
	queueLengths: Record<TaskPriority, number>;
	resourceUtilization: {
		cpu: number;
		memory: number;
		gpu: number;
	};
	errorRate: number;
}

export interface ScalingDecision {
	shouldScale: boolean;
	scaleDirection: "up" | "down";
	reason: string;
	currentLoad: number;
	targetLoad: number;
	recommendedActions: string[];
}

export class TaskScheduler {
	private static instance: TaskScheduler;
	private config: SchedulerConfig;
	private taskQueue: QueuedTask[] = [];
	private activeTasks: Map<string, QueuedTask> = new Map();
	private completedTasks: Map<string, QueuedTask> = new Map();
	private backendLoads: Map<string, number> = new Map();
	private taskHistory: QueuedTask[] = [];
	private isRunning = false;
	private processingInterval?: NodeJS.Timeout;
	private healthCheckInterval?: NodeJS.Timeout;

	private constructor(config?: Partial<SchedulerConfig>) {
		this.config = {
			maxConcurrentTasks: 10,
			maxQueueSize: 1000,
			taskTimeout: 30000, // 30 seconds
			retryAttempts: 3,
			loadBalancingStrategy: "resource-aware",
			priorityMode: "weighted",
			healthCheckInterval: 5000, // 5 seconds
			autoScaling: true,
			scalingThresholds: {
				cpuThreshold: 80,
				memoryThreshold: 85,
				queueLengthThreshold: 50,
			},
			...config,
		};
	}

	static getInstance(config?: Partial<SchedulerConfig>): TaskScheduler {
		if (!TaskScheduler.instance) {
			TaskScheduler.instance = new TaskScheduler(config);
		}
		return TaskScheduler.instance;
	}

	/**
	 * Start the task scheduler
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			console.warn("[TaskScheduler] Scheduler is already running");
			return;
		}

		this.isRunning = true;
		console.log("[TaskScheduler] Starting task scheduler...");

		// Start processing tasks
		this.processingInterval = setInterval(() => {
			this.processTaskQueue();
		}, 100); // Process queue every 100ms

		// Start health monitoring
		this.healthCheckInterval = setInterval(() => {
			this.performHealthChecks();
		}, this.config.healthCheckInterval);

		console.log("[TaskScheduler] Task scheduler started successfully");
	}

	/**
	 * Stop the task scheduler
	 */
	async stop(): Promise<void> {
		if (!this.isRunning) {
			console.warn("[TaskScheduler] Scheduler is not running");
			return;
		}

		this.isRunning = false;
		console.log("[TaskScheduler] Stopping task scheduler...");

		// Clear intervals
		if (this.processingInterval) {
			clearInterval(this.processingInterval);
			this.processingInterval = undefined;
		}

		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = undefined;
		}

		// Cancel active tasks
		await this.cancelAllTasks();

		console.log("[TaskScheduler] Task scheduler stopped");
	}

	/**
	 * Submit a new task for execution
	 */
	async submitTask(
		task: AITask,
		options?: {
			priority?: TaskPriority;
			timeout?: number;
			maxRetries?: number;
			metadata?: Record<string, any>;
		},
	): Promise<string> {
		const taskId = this.generateTaskId();
		const queuedTask: QueuedTask = {
			id: taskId,
			task,
			priority: options?.priority || "normal",
			createdAt: Date.now(),
			estimatedDuration: this.estimateTaskDuration(task),
			retryCount: 0,
			maxRetries: options?.maxRetries || this.config.retryAttempts,
			timeout: options?.timeout || this.config.taskTimeout,
			status: "queued",
			metadata: options?.metadata,
		};

		// Check queue capacity
		if (this.taskQueue.length >= this.config.maxQueueSize) {
			throw new Error("Task queue is full");
		}

		// Add to queue
		this.taskQueue.push(queuedTask);
		this.sortTaskQueue();

		console.log(
			`[TaskScheduler] Task ${taskId} submitted (${task.type}, priority: ${queuedTask.priority})`,
		);
		return taskId;
	}

	/**
	 * Submit multiple tasks
	 */
	async submitTasks(
		tasks: AITask[],
		options?: {
			priority?: TaskPriority;
			timeout?: number;
			maxRetries?: number;
			metadata?: Record<string, any>;
		},
	): Promise<string[]> {
		const taskIds: string[] = [];

		for (const task of tasks) {
			try {
				const taskId = await this.submitTask(task, options);
				taskIds.push(taskId);
			} catch (error) {
				console.error(`[TaskScheduler] Failed to submit task:`, error);
			}
		}

		return taskIds;
	}

	/**
	 * Cancel a task
	 */
	async cancelTask(taskId: string): Promise<boolean> {
		// Check if task is in queue
		const queueIndex = this.taskQueue.findIndex((task) => task.id === taskId);
		if (queueIndex !== -1) {
			const task = this.taskQueue[queueIndex];
			task.status = "cancelled";
			task.endTime = Date.now();
			this.taskQueue.splice(queueIndex, 1);
			this.completedTasks.set(taskId, task);
			console.log(`[TaskScheduler] Task ${taskId} cancelled (queued)`);
			return true;
		}

		// Check if task is active
		const activeTask = this.activeTasks.get(taskId);
		if (activeTask) {
			// Note: Actual task cancellation depends on backend implementation
			activeTask.status = "cancelled";
			activeTask.endTime = Date.now();
			this.activeTasks.delete(taskId);
			this.completedTasks.set(taskId, activeTask);
			console.log(`[TaskScheduler] Task ${taskId} cancelled (active)`);
			return true;
		}

		return false;
	}

	/**
	 * Get task status
	 */
	getTaskStatus(taskId: string): QueuedTask | null {
		// Check active tasks
		const activeTask = this.activeTasks.get(taskId);
		if (activeTask) return activeTask;

		// Check completed tasks
		const completedTask = this.completedTasks.get(taskId);
		if (completedTask) return completedTask;

		// Check queued tasks
		const queuedTask = this.taskQueue.find((task) => task.id === taskId);
		if (queuedTask) return queuedTask;

		return null;
	}

	/**
	 * Get task result
	 */
	getTaskResult(taskId: string): TaskResult | null {
		const task = this.completedTasks.get(taskId);
		return task?.result || null;
	}

	/**
	 * Get scheduler metrics
	 */
	getMetrics(): LoadBalancingMetrics {
		const totalTasks = this.completedTasks.size + this.activeTasks.size;
		const completedTasks = Array.from(this.completedTasks.values()).filter(
			(t) => t.status === "completed",
		).length;
		const failedTasks = Array.from(this.completedTasks.values()).filter(
			(t) => t.status === "failed",
		).length;

		const completedHistory = Array.from(this.completedTasks.values()).filter(
			(t) => t.status === "completed",
		);
		const averageProcessingTime =
			completedHistory.length > 0
				? completedHistory.reduce(
						(sum, task) => sum + (task.endTime! - task.startTime!),
						0,
					) / completedHistory.length
				: 0;

		const throughput = this.calculateThroughput();
		const errorRate = totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0;

		const queueLengths = this.calculateQueueLengths();
		const resourceUtilization = this.getResourceUtilization();

		return {
			totalTasks,
			completedTasks,
			failedTasks,
			averageProcessingTime,
			throughput,
			backendUtilization: Object.fromEntries(this.backendLoads),
			queueLengths,
			resourceUtilization,
			errorRate,
		};
	}

	/**
	 * Get current queue status
	 */
	getQueueStatus(): {
		total: number;
		byPriority: Record<TaskPriority, number>;
		oldestTaskAge: number;
		estimatedProcessingTime: number;
	} {
		const byPriority: Record<TaskPriority, number> = {
			low: 0,
			normal: 0,
			high: 0,
			critical: 0,
		};

		this.taskQueue.forEach((task) => {
			byPriority[task.priority]++;
		});

		const oldestTaskAge =
			this.taskQueue.length > 0 ? Date.now() - this.taskQueue[0].createdAt : 0;

		const estimatedProcessingTime = this.taskQueue.reduce(
			(sum, task) => sum + task.estimatedDuration,
			0,
		);

		return {
			total: this.taskQueue.length,
			byPriority,
			oldestTaskAge,
			estimatedProcessingTime,
		};
	}

	/**
	 * Get backend load distribution
	 */
	getBackendLoadDistribution(): Array<{
		backendId: string;
		load: number;
		activeTasks: number;
		health: BackendHealth;
	}> {
		const backendRegistry = BackendRegistry.getInstance();
		const backends = backendRegistry.getAvailableBackends();

		return backends.map((backend) => ({
			backendId: backend.id,
			load: this.backendLoads.get(backend.id) || 0,
			activeTasks: Array.from(this.activeTasks.values()).filter(
				(task) => task.assignedBackend === backend.id,
			).length,
			health: backend.getHealth(),
		}));
	}

	/**
	 * Update scheduler configuration
	 */
	updateConfig(config: Partial<SchedulerConfig>): void {
		this.config = { ...this.config, ...config };
		console.log("[TaskScheduler] Configuration updated");
	}

	/**
	 * Check if auto-scaling is needed
	 */
	checkAutoScaling(): ScalingDecision {
		const metrics = this.getMetrics();
		const resourceMonitor = ResourceMonitor.getInstance();
		const currentResources = resourceMonitor.getCurrentResources();

		const currentLoad = Math.max(
			metrics.resourceUtilization.cpu,
			metrics.resourceUtilization.memory,
			(this.taskQueue.length / this.config.maxQueueSize) * 100,
		);

		let shouldScale = false;
		let scaleDirection: "up" | "down" = "up";
		const reasons: string[] = [];
		const recommendedActions: string[] = [];

		// Check scaling thresholds
		if (
			metrics.resourceUtilization.cpu >
			this.config.scalingThresholds.cpuThreshold
		) {
			shouldScale = true;
			scaleDirection = "up";
			reasons.push(
				`CPU usage (${metrics.resourceUtilization.cpu.toFixed(1)}%) exceeds threshold (${this.config.scalingThresholds.cpuThreshold}%)`,
			);
			recommendedActions.push("Increase maxConcurrentTasks");
		}

		if (
			metrics.resourceUtilization.memory >
			this.config.scalingThresholds.memoryThreshold
		) {
			shouldScale = true;
			scaleDirection = "up";
			reasons.push(
				`Memory usage (${metrics.resourceUtilization.memory.toFixed(1)}%) exceeds threshold (${this.config.scalingThresholds.memoryThreshold}%)`,
			);
			recommendedActions.push(
				"Increase available memory or reduce task concurrency",
			);
		}

		if (
			this.taskQueue.length > this.config.scalingThresholds.queueLengthThreshold
		) {
			shouldScale = true;
			scaleDirection = "up";
			reasons.push(
				`Queue length (${this.taskQueue.length}) exceeds threshold (${this.config.scalingThresholds.queueLengthThreshold})`,
			);
			recommendedActions.push(
				"Increase maxConcurrentTasks or add more backends",
			);
		}

		// Check for downscaling
		if (currentLoad < 30 && this.config.maxConcurrentTasks > 5) {
			shouldScale = true;
			scaleDirection = "down";
			reasons.push("Low resource utilization detected");
			recommendedActions.push("Decrease maxConcurrentTasks to reduce overhead");
		}

		return {
			shouldScale,
			scaleDirection,
			reason: reasons.join(", ") || "No scaling needed",
			currentLoad,
			targetLoad:
				scaleDirection === "up"
					? Math.min(currentLoad * 0.7, 70)
					: Math.max(currentLoad * 1.3, 40),
			recommendedActions,
		};
	}

	/**
	 * Process the task queue
	 */
	private async processTaskQueue(): Promise<void> {
		if (
			!this.isRunning ||
			this.activeTasks.size >= this.config.maxConcurrentTasks
		) {
			return;
		}

		// Find next task to execute
		const taskToExecute = this.findNextTask();
		if (!taskToExecute) {
			return;
		}

		// Select backend for task
		const backendSelection = await this.selectBackendForTask(
			taskToExecute.task,
		);
		if (!backendSelection) {
			taskToExecute.status = "failed";
			taskToExecute.error = "No suitable backend available";
			taskToExecute.endTime = Date.now();
			this.completedTasks.set(taskToExecute.id, taskToExecute);
			this.taskQueue = this.taskQueue.filter(
				(task) => task.id !== taskToExecute.id,
			);
			return;
		}

		// Execute task
		this.executeTask(
			taskToExecute,
			backendSelection.backend,
			backendSelection.model,
		);
	}

	/**
	 * Find the next task to execute based on priority and scheduling strategy
	 */
	private findNextTask(): QueuedTask | null {
		if (this.taskQueue.length === 0) return null;

		switch (this.config.priorityMode) {
			case "strict":
				// Always execute highest priority first
				return this.taskQueue[0];
			case "fair-share":
				// Implement fair sharing across priorities
				return this.findFairShareTask();
			case "weighted":
			default:
				// Use weighted priority with aging
				return this.findWeightedPriorityTask();
		}
	}

	/**
	 * Find task using fair-share scheduling
	 */
	private findFairShareTask(): QueuedTask | null {
		const priorityCounts = this.calculatePriorityCounts();
		const totalActive = this.activeTasks.size;

		// Find priority with least share relative to queue distribution
		let bestTask: QueuedTask | null = null;
		let bestScore = Infinity;

		for (const task of this.taskQueue) {
			const activeCount = priorityCounts[task.priority] || 0;
			const queueCount = this.taskQueue.filter(
				(t) => t.priority === task.priority,
			).length;
			const share = activeCount / Math.max(queueCount, 1);
			const age = Date.now() - task.createdAt;

			// Score based on share and age (lower share and higher age = better score)
			const score = share - age / 10000; // Age bonus

			if (score < bestScore) {
				bestScore = score;
				bestTask = task;
			}
		}

		return bestTask;
	}

	/**
	 * Find task using weighted priority with aging
	 */
	private findWeightedPriorityTask(): QueuedTask | null {
		let bestTask: QueuedTask | null = null;
		let bestScore = -1;

		for (const task of this.taskQueue) {
			const age = Date.now() - task.createdAt;
			const ageBonus = Math.min(age / 10000, 5); // Max 5 point age bonus

			const priorityWeights = {
				critical: 100,
				high: 75,
				normal: 50,
				low: 25,
			};

			const score = priorityWeights[task.priority] + ageBonus;

			if (score > bestScore) {
				bestScore = score;
				bestTask = task;
			}
		}

		return bestTask;
	}

	/**
	 * Select backend for task execution
	 */
	private async selectBackendForTask(
		task: AITask,
	): Promise<{ backend: string; model: string } | null> {
		const backendSelector = BackendSelector.getInstance();
		const modelRegistry = ModelRegistry.getInstance();

		try {
			// Use backend selector to find optimal backend
			const selection = await backendSelector.selectBackend(task);
			if (!selection) return null;

			// Find suitable model for the task
			const recommendedModels = modelRegistry.getRecommendedModels(task.type, {
				maxMemoryMB: task.resourceRequirements.memory.max,
				maxInferenceTime: task.timeout || this.config.taskTimeout,
				preferredBackend: selection.backend,
			});

			if (recommendedModels.length === 0) return null;

			// Load the model
			const modelId = recommendedModels[0].id;
			const instanceId = await modelRegistry.loadModel(modelId);

			return {
				backend: selection.backend,
				model: instanceId,
			};
		} catch (error) {
			console.error("[TaskScheduler] Backend selection failed:", error);
			return null;
		}
	}

	/**
	 * Execute a task
	 */
	private async executeTask(
		task: QueuedTask,
		backendId: string,
		modelId: string,
	): Promise<void> {
		// Update task status
		task.status = "processing";
		task.assignedBackend = backendId;
		task.assignedModel = modelId;
		task.startTime = Date.now();

		// Move to active tasks
		this.activeTasks.set(task.id, task);
		this.taskQueue = this.taskQueue.filter((t) => t.id !== task.id);

		// Update backend load
		this.updateBackendLoad(backendId, 1);

		try {
			// Execute task via backend
			const backendRegistry = BackendRegistry.getInstance();
			const backend = backendRegistry.getBackend(backendId);

			if (!backend) {
				throw new Error(`Backend ${backendId} not found`);
			}

			// Set timeout
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error("Task timeout")), task.timeout);
			});

			// Execute task
			const result = await Promise.race([
				backend.executeTask(task.task),
				timeoutPromise,
			]);

			// Update task with result
			task.result = result;
			task.status = "completed";
			task.endTime = Date.now();

			console.log(
				`[TaskScheduler] Task ${task.id} completed successfully (${(task.endTime - task.startTime!).toFixed(2)}ms)`,
			);
		} catch (error) {
			task.status = "failed";
			task.error = error instanceof Error ? error.message : String(error);
			task.endTime = Date.now();

			// Retry logic
			if (task.retryCount < task.maxRetries) {
				task.retryCount++;
				task.status = "queued";
				task.startTime = undefined;
				task.endTime = undefined;
				task.assignedBackend = undefined;
				task.assignedModel = undefined;
				task.error = undefined;

				// Re-queue for retry
				this.taskQueue.push(task);
				this.sortTaskQueue();

				console.log(
					`[TaskScheduler] Task ${task.id} failed, retrying (${task.retryCount}/${task.maxRetries})`,
				);
			} else {
				console.error(
					`[TaskScheduler] Task ${task.id} failed permanently:`,
					error,
				);
			}
		} finally {
			// Update backend load
			this.updateBackendLoad(backendId, -1);

			// Move from active to completed
			this.activeTasks.delete(task.id);
			this.completedTasks.set(task.id, task);

			// Add to history
			this.taskHistory.push(task);
			if (this.taskHistory.length > 1000) {
				this.taskHistory = this.taskHistory.slice(-1000); // Keep last 1000 tasks
			}
		}
	}

	/**
	 * Perform health checks on backends
	 */
	private async performHealthChecks(): Promise<void> {
		const backendRegistry = BackendRegistry.getInstance();
		const backends = backendRegistry.getAvailableBackends();

		for (const backend of backends) {
			const health = backend.getHealth();

			// Remove load from unhealthy backends
			if (health.status === "unhealthy") {
				const currentLoad = this.backendLoads.get(backend.id) || 0;
				if (currentLoad > 0) {
					this.backendLoads.set(backend.id, 0);
					console.warn(
						`[TaskScheduler] Removed load from unhealthy backend: ${backend.id}`,
					);
				}
			}
		}

		// Check auto-scaling
		if (this.config.autoScaling) {
			const scalingDecision = this.checkAutoScaling();
			if (scalingDecision.shouldScale) {
				this.applyScalingDecision(scalingDecision);
			}
		}
	}

	/**
	 * Apply auto-scaling decision
	 */
	private applyScalingDecision(decision: ScalingDecision): void {
		console.log(
			`[TaskScheduler] Auto-scaling decision: ${decision.scaleDirection} - ${decision.reason}`,
		);

		if (decision.scaleDirection === "up") {
			// Scale up
			this.config.maxConcurrentTasks = Math.min(
				this.config.maxConcurrentTasks + 2,
				50,
			);
		} else {
			// Scale down
			this.config.maxConcurrentTasks = Math.max(
				this.config.maxConcurrentTasks - 1,
				2,
			);
		}

		console.log(
			`[TaskScheduler] Updated maxConcurrentTasks to ${this.config.maxConcurrentTasks}`,
		);
	}

	// Helper methods
	private generateTaskId(): string {
		return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private estimateTaskDuration(task: AITask): number {
		// Estimate based on task type and resource requirements
		const baseDurations: Record<string, number> = {
			face_detection: 100,
			face_recognition: 200,
			object_detection: 300,
			scene_classification: 150,
			image_embedding: 80,
			text_embedding: 50,
			query_understanding: 120,
			ocr_processing: 400,
			feature_extraction: 100,
			semantic_search: 200,
		};

		const baseDuration = baseDurations[task.type] || 200;
		const complexityFactor =
			(task.resourceRequirements.memory.optimal / 256) *
			(task.resourceRequirements.cpu.optimal / 20);

		return baseDuration * complexityFactor;
	}

	private sortTaskQueue(): void {
		const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
		this.taskQueue.sort((a, b) => {
			const priorityDiff =
				priorityOrder[b.priority] - priorityOrder[a.priority];
			if (priorityDiff !== 0) return priorityDiff;
			return a.createdAt - b.createdAt; // FIFO for same priority
		});
	}

	private updateBackendLoad(backendId: string, delta: number): void {
		const currentLoad = this.backendLoads.get(backendId) || 0;
		const newLoad = Math.max(0, currentLoad + delta);
		this.backendLoads.set(backendId, newLoad);
	}

	private calculateThroughput(): number {
		const now = Date.now();
		const oneHourAgo = now - 3600000; // 1 hour ago
		const recentTasks = Array.from(this.completedTasks.values()).filter(
			(task) => task.status === "completed" && task.endTime! > oneHourAgo,
		);

		return recentTasks.length; // Tasks per hour
	}

	private calculateQueueLengths(): Record<TaskPriority, number> {
		const lengths: Record<TaskPriority, number> = {
			low: 0,
			normal: 0,
			high: 0,
			critical: 0,
		};

		this.taskQueue.forEach((task) => {
			lengths[task.priority]++;
		});

		return lengths;
	}

	private getResourceUtilization(): {
		cpu: number;
		memory: number;
		gpu: number;
	} {
		const resourceMonitor = ResourceMonitor.getInstance();
		const resources = resourceMonitor.getCurrentResources();

		return {
			cpu:
				((resources.totalCPU - resources.availableCPU) / resources.totalCPU) *
				100,
			memory:
				((resources.totalMemory - resources.availableMemory) /
					resources.totalMemory) *
				100,
			gpu: resources.totalGPU
				? ((resources.totalGPU - resources.availableGPU!) /
						resources.totalGPU) *
					100
				: 0,
		};
	}

	private calculatePriorityCounts(): Record<TaskPriority, number> {
		const counts: Record<TaskPriority, number> = {
			low: 0,
			normal: 0,
			high: 0,
			critical: 0,
		};

		this.activeTasks.forEach((task) => {
			counts[task.priority]++;
		});

		return counts;
	}

	private async cancelAllTasks(): Promise<void> {
		const cancelPromises = Array.from(this.activeTasks.keys()).map((taskId) =>
			this.cancelTask(taskId),
		);

		await Promise.all(cancelPromises);

		// Clear queue
		this.taskQueue.forEach((task) => {
			task.status = "cancelled";
			task.endTime = Date.now();
			this.completedTasks.set(task.id, task);
		});
		this.taskQueue = [];
	}
}
