/**
 * Backend health monitoring service
 */

import type { BaseBackend } from "./BackendInterface";
import type { BackendHealth, PerformanceMetrics } from "./types";

export interface HealthMonitorConfig {
	interval: number;
	checkTimeout: number;
	failureThreshold: number;
	recoveryThreshold: number;
	enableMetricsCollection: boolean;
	enableAutoRecovery: boolean;
	alertThresholds: {
		responseTime: number; // ms
		errorRate: number; // 0-1
		memoryUsage: number; // MB
		cpuUsage: number; // percentage
	};
}

export interface HealthCheck {
	backendId: string;
	timestamp: number;
	status: "success" | "failure";
	responseTime: number;
	metrics?: PerformanceMetrics;
	error?: string;
}

export interface BackendHealthHistory {
	backendId: string;
	checks: HealthCheck[];
	currentStatus: BackendHealth;
	uptime: number;
	downtime: number;
	totalChecks: number;
	successfulChecks: number;
	failedChecks: number;
	averageResponseTime: number;
	lastFailure?: number;
	lastRecovery?: number;
}

export class HealthMonitor {
	private config: HealthMonitorConfig;
	private monitoringBackends: Map<string, BaseBackend> = new Map();
	private healthHistory: Map<string, BackendHealthHistory> = new Map();
	private intervalId: NodeJS.Timeout | null = null;
	private isMonitoring = false;
	private listeners: Map<string, Function[]> = new Map();

	constructor(config: Partial<HealthMonitorConfig> = {}) {
		this.config = {
			interval: 10000, // 10 seconds
			checkTimeout: 5000, // 5 seconds
			failureThreshold: 3, // 3 consecutive failures
			recoveryThreshold: 2, // 2 consecutive successes
			enableMetricsCollection: true,
			enableAutoRecovery: true,
			alertThresholds: {
				responseTime: 5000, // 5 seconds
				errorRate: 0.1, // 10%
				memoryUsage: 500, // 500MB
				cpuUsage: 80, // 80%
			},
			...config,
		};
	}

	async initialize(): Promise<boolean> {
		try {
			console.log("[HealthMonitor] Initializing health monitoring system...");

			// Initialize health history for existing backends
			for (const [backendId, backend] of this.monitoringBackends) {
				this.initializeHealthHistory(backendId, backend);
			}

			console.log(
				"[HealthMonitor] Health monitoring system initialized successfully",
			);
			return true;
		} catch (error) {
			console.error("[HealthMonitor] Failed to initialize:", error);
			return false;
		}
	}

	start(): void {
		if (this.isMonitoring) {
			return;
		}

		console.log("[HealthMonitor] Starting health monitoring...");
		this.isMonitoring = true;

		// Start monitoring interval
		this.intervalId = setInterval(async () => {
			try {
				await this.performHealthChecks();
			} catch (error) {
				console.error("[HealthMonitor] Error performing health checks:", error);
			}
		}, this.config.interval);

		// Emit start event
		this.emitEvent("monitoringStarted", { timestamp: Date.now() });
	}

	stop(): void {
		if (!this.isMonitoring) {
			return;
		}

		console.log("[HealthMonitor] Stopping health monitoring...");

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		this.isMonitoring = false;

		// Emit stop event
		this.emitEvent("monitoringStopped", { timestamp: Date.now() });
	}

	monitorBackend(backendId: string, backend: BaseBackend): void {
		this.monitoringBackends.set(backendId, backend);
		this.initializeHealthHistory(backendId, backend);

		console.log(`[HealthMonitor] Now monitoring backend: ${backendId}`);
	}

	unmonitorBackend(backendId: string): void {
		this.monitoringBackends.delete(backendId);
		this.healthHistory.delete(backendId);

		console.log(`[HealthMonitor] Stopped monitoring backend: ${backendId}`);
	}

	getBackendHealth(backendId: string): BackendHealth | undefined {
		const history = this.healthHistory.get(backendId);
		return history?.currentStatus;
	}

	getHealthHistory(backendId: string, limit: number = 100): HealthCheck[] {
		const history = this.healthHistory.get(backendId);
		return history ? history.checks.slice(-limit) : [];
	}

	getAllBackendHealth(): Record<string, BackendHealth> {
		const health: Record<string, BackendHealth> = {};
		for (const [backendId, history] of this.healthHistory) {
			health[backendId] = history.currentStatus;
		}
		return health;
	}

	getHealthSummary(): {
		totalBackends: number;
		healthyBackends: number;
		degradedBackends: number;
		unhealthyBackends: number;
		unknownBackends: number;
		averageUptime: number;
		averageResponseTime: number;
	} {
		const histories = Array.from(this.healthHistory.values());
		const totalBackends = histories.length;

		const healthyBackends = histories.filter(
			(h) => h.currentStatus.status === "healthy",
		).length;
		const degradedBackends = histories.filter(
			(h) => h.currentStatus.status === "degraded",
		).length;
		const unhealthyBackends = histories.filter(
			(h) => h.currentStatus.status === "unhealthy",
		).length;
		const unknownBackends = histories.filter(
			(h) => h.currentStatus.status === "unknown",
		).length;

		const totalUptime = histories.reduce((sum, h) => sum + h.uptime, 0);
		const averageUptime = totalBackends > 0 ? totalUptime / totalBackends : 0;

		const totalResponseTime = histories.reduce(
			(sum, h) => sum + h.averageResponseTime,
			0,
		);
		const averageResponseTime =
			totalBackends > 0 ? totalResponseTime / totalBackends : 0;

		return {
			totalBackends,
			healthyBackends,
			degradedBackends,
			unhealthyBackends,
			unknownBackends,
			averageUptime,
			averageResponseTime,
		};
	}

	async performHealthCheck(backendId: string): Promise<HealthCheck> {
		const backend = this.monitoringBackends.get(backendId);
		if (!backend) {
			throw new Error(`Backend ${backendId} not found`);
		}

		const startTime = performance.now();
		const check: HealthCheck = {
			backendId,
			timestamp: Date.now(),
			status: "failure",
			responseTime: 0,
		};

		try {
			// Check if backend is available
			const isAvailable = backend.isAvailable();
			if (!isAvailable) {
				check.error = "Backend not available";
				check.responseTime = performance.now() - startTime;
				return check;
			}

			// Get backend health
			const health = backend.getHealth();

			// Get performance metrics if enabled
			let metrics: PerformanceMetrics | undefined;
			if (this.config.enableMetricsCollection) {
				try {
					metrics = backend.getPerformanceMetrics();
				} catch (error) {
					console.warn(
						`[HealthMonitor] Error getting metrics for ${backendId}:`,
						error,
					);
				}
			}

			// Test basic functionality with a simple operation
			const models = await backend.listModels();
			const modelCheckSuccess = Array.isArray(models);

			// Determine health status
			const isHealthy = health.status === "healthy" && modelCheckSuccess;

			check.status = isHealthy ? "success" : "failure";
			check.responseTime = performance.now() - startTime;
			check.metrics = metrics;

			if (!isHealthy) {
				check.error =
					health.status === "unhealthy"
						? "Backend reports unhealthy status"
						: "Backend functionality test failed";
			}
		} catch (error) {
			check.status = "failure";
			check.responseTime = performance.now() - startTime;
			check.error = (error as Error).message;
		}

		return check;
	}

	async forceHealthCheck(backendId: string): Promise<HealthCheck> {
		const check = await this.performHealthCheck(backendId);
		await this.processHealthCheck(check);
		return check;
	}

	async attemptRecovery(backendId: string): Promise<boolean> {
		const backend = this.monitoringBackends.get(backendId);
		if (!backend) {
			return false;
		}

		console.log(
			`[HealthMonitor] Attempting recovery for backend: ${backendId}`,
		);

		try {
			// Try to reinitialize the backend
			const initialized = await backend.initialize();
			if (!initialized) {
				console.error(
					`[HealthMonitor] Failed to reinitialize backend ${backendId}`,
				);
				return false;
			}

			// Perform a health check after recovery
			const check = await this.performHealthCheck(backendId);
			const recoverySuccessful = check.status === "success";

			if (recoverySuccessful) {
				console.log(
					`[HealthMonitor] Recovery successful for backend: ${backendId}`,
				);
				this.emitEvent("backendRecovered", {
					backendId,
					check,
					timestamp: Date.now(),
				});
			} else {
				console.error(
					`[HealthMonitor] Recovery failed for backend: ${backendId}`,
				);
			}

			return recoverySuccessful;
		} catch (error) {
			console.error(
				`[HealthMonitor] Error during recovery for ${backendId}:`,
				error,
			);
			return false;
		}
	}

	// Private methods
	private async performHealthChecks(): Promise<void> {
		const checkPromises = Array.from(this.monitoringBackends.keys()).map(
			async (backendId) => {
				try {
					const check = await this.performHealthCheck(backendId);
					await this.processHealthCheck(check);
				} catch (error) {
					console.error(
						`[HealthMonitor] Health check failed for ${backendId}:`,
						error,
					);
				}
			},
		);

		await Promise.allSettled(checkPromises);
	}

	private async processHealthCheck(check: HealthCheck): Promise<void> {
		const history = this.healthHistory.get(check.backendId);
		if (!history) {
			return;
		}

		// Add check to history
		history.checks.push(check);
		history.totalChecks++;

		// Limit history size
		if (history.checks.length > 1000) {
			history.checks = history.checks.slice(-500);
		}

		// Update statistics
		if (check.status === "success") {
			history.successfulChecks++;
			history.uptime += this.config.interval / 1000; // Convert to seconds
		} else {
			history.failedChecks++;
			history.downtime += this.config.interval / 1000;
			history.lastFailure = check.timestamp;
		}

		// Calculate average response time
		const recentChecks = history.checks.slice(-50); // Last 50 checks
		history.averageResponseTime =
			recentChecks.reduce((sum, c) => sum + c.responseTime, 0) /
			recentChecks.length;

		// Determine backend health status
		const oldStatus = history.currentStatus.status;
		const newStatus = this.determineHealthStatus(history);

		// Update health status
		history.currentStatus = {
			status: newStatus,
			lastCheck: check.timestamp,
			uptime: history.uptime,
			errorRate: history.failedChecks / history.totalChecks,
			responseTime: history.averageResponseTime,
			activeConnections: history.currentStatus.activeConnections,
			resourceUsage: check.metrics
				? {
						memory: check.metrics.memoryUsage,
						cpu: check.metrics.cpuUsage || 0,
						gpu: check.metrics.gpuUsage,
						storage: 0,
					}
				: history.currentStatus.resourceUsage,
		};

		// Emit events for status changes
		if (oldStatus !== newStatus) {
			if (newStatus === "healthy" && oldStatus !== "healthy") {
				history.lastRecovery = check.timestamp;
				this.emitEvent("backendHealthy", {
					backendId: check.backendId,
					check,
					timestamp: Date.now(),
				});

				// Attempt auto-recovery if enabled and transitioning to healthy
				if (this.config.enableAutoRecovery && oldStatus === "unhealthy") {
					await this.attemptRecovery(check.backendId);
				}
			} else if (newStatus === "unhealthy") {
				this.emitEvent("backendUnhealthy", {
					backendId: check.backendId,
					check,
					timestamp: Date.now(),
				});
			} else if (newStatus === "degraded") {
				this.emitEvent("backendDegraded", {
					backendId: check.backendId,
					check,
					timestamp: Date.now(),
				});
			}
		}

		// Check for alert conditions
		this.checkAlertConditions(check, history);

		// Emit health check completed event
		this.emitEvent("healthCheckCompleted", {
			check,
			history,
			timestamp: Date.now(),
		});
	}

	private determineHealthStatus(
		history: BackendHealthHistory,
	): BackendHealth["status"] {
		const recentChecks = history.checks.slice(-10); // Last 10 checks
		const recentFailures = recentChecks.filter(
			(c) => c.status === "failure",
		).length;
		const recentSuccesses = recentChecks.filter(
			(c) => c.status === "success",
		).length;

		// If we have enough recent failures, mark as unhealthy
		if (recentFailures >= this.config.failureThreshold) {
			return "unhealthy";
		}

		// If we have recent successes but some failures, mark as degraded
		if (
			recentSuccesses >= this.config.recoveryThreshold &&
			recentFailures > 0
		) {
			return "degraded";
		}

		// If mostly successful, mark as healthy
		if (recentSuccesses >= Math.ceil(recentChecks.length * 0.8)) {
			return "healthy";
		}

		// Default to unknown if insufficient data
		return "unknown";
	}

	private checkAlertConditions(
		check: HealthCheck,
		history: BackendHealthHistory,
	): void {
		const thresholds = this.config.alertThresholds;

		// Response time alert
		if (check.responseTime > thresholds.responseTime) {
			this.emitEvent("healthAlert", {
				backendId: check.backendId,
				type: "response_time",
				severity: "warning",
				message: `High response time: ${check.responseTime}ms`,
				value: check.responseTime,
				threshold: thresholds.responseTime,
				timestamp: Date.now(),
			});
		}

		// Error rate alert
		if (history.currentStatus.errorRate > thresholds.errorRate) {
			this.emitEvent("healthAlert", {
				backendId: check.backendId,
				type: "error_rate",
				severity: "warning",
				message: `High error rate: ${(history.currentStatus.errorRate * 100).toFixed(1)}%`,
				value: history.currentStatus.errorRate,
				threshold: thresholds.errorRate,
				timestamp: Date.now(),
			});
		}

		// Memory usage alert
		if (check.metrics && check.metrics.memoryUsage > thresholds.memoryUsage) {
			this.emitEvent("healthAlert", {
				backendId: check.backendId,
				type: "memory_usage",
				severity: "warning",
				message: `High memory usage: ${check.metrics.memoryUsage}MB`,
				value: check.metrics.memoryUsage,
				threshold: thresholds.memoryUsage,
				timestamp: Date.now(),
			});
		}

		// CPU usage alert
		if (
			check.metrics &&
			check.metrics.cpuUsage &&
			check.metrics.cpuUsage > thresholds.cpuUsage
		) {
			this.emitEvent("healthAlert", {
				backendId: check.backendId,
				type: "cpu_usage",
				severity: "warning",
				message: `High CPU usage: ${check.metrics.cpuUsage}%`,
				value: check.metrics.cpuUsage,
				threshold: thresholds.cpuUsage,
				timestamp: Date.now(),
			});
		}
	}

	private initializeHealthHistory(
		backendId: string,
		backend: BaseBackend,
	): void {
		const initialHealth = backend.getHealth();

		this.healthHistory.set(backendId, {
			backendId,
			checks: [],
			currentStatus: initialHealth,
			uptime: 0,
			downtime: 0,
			totalChecks: 0,
			successfulChecks: 0,
			failedChecks: 0,
			averageResponseTime: 0,
		});
	}

	// Event system
	on(event: string, listener: Function): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event)!.push(listener);
	}

	off(event: string, listener: Function): void {
		const listeners = this.listeners.get(event);
		if (listeners) {
			const index = listeners.indexOf(listener);
			if (index > -1) {
				listeners.splice(index, 1);
			}
		}
	}

	private emitEvent(event: string, data: any): void {
		const listeners = this.listeners.get(event);
		if (listeners) {
			listeners.forEach((listener) => {
				try {
					listener(data);
				} catch (error) {
					console.error(
						`[HealthMonitor] Error in event listener for ${event}:`,
						error,
					);
				}
			});
		}
	}
}
