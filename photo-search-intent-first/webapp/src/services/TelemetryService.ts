/**
 * TelemetryService - Provides telemetry and observability for application actions
 * This service collects metrics, tracks performance, and enables debugging capabilities.
 */
import type { SearchResult } from "../api";

// Action telemetry interface
export interface ActionTelemetry {
	id: string;
	name: string;
	category: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	status: "started" | "completed" | "failed" | "cancelled";
	userId?: string;
	sessionId?: string;
	deviceId?: string;
	userAgent?: string;
	ipAddress?: string;
	metadata?: Record<string, unknown>;
	error?: {
		code: string;
		message: string;
		stack?: string;
		context?: Record<string, unknown>;
	};
	performance?: {
		memoryImpact?: number;
		cpuImpact?: number;
		networkUsage?: {
			bytesSent: number;
			bytesReceived: number;
			requests: number;
		};
		cacheHit?: boolean;
	};
	accessibility?: {
		announced: boolean;
		announcementText?: string;
		screenReaderUsed?: boolean;
	};
}

// Performance metrics interface
export interface PerformanceMetrics {
	actionDuration: number;
	memoryUsage: number;
	cpuUsage: number;
	networkLatency: number;
	cacheHitRate: number;
	errorRate: number;
	successRate: number;
	throughput: number;
}

// Telemetry service interface
export interface TelemetryService {
	// Action tracking
	trackActionStart: (
		action: Omit<ActionTelemetry, "endTime" | "duration" | "status">,
	) => string;
	trackActionEnd: (
		actionId: string,
		status: "completed" | "failed" | "cancelled",
		error?: Error,
	) => void;

	// Performance tracking
	trackPerformance: (metrics: PerformanceMetrics) => void;
	getPerformanceSummary: () => PerformanceMetrics;

	// Error tracking
	trackError: (error: Error, context?: Record<string, unknown>) => void;
	getErrorSummary: () => Array<{
		error: string;
		count: number;
		lastSeen: number;
	}>;

	// Usage tracking
	trackUsage: (feature: string, userId?: string) => void;
	getUsageStats: () => Record<string, { count: number; lastUsed: number }>;

	// Accessibility tracking
	trackAccessibilityEvent: (
		event: string,
		details?: Record<string, unknown>,
	) => void;
	getAccessibilityStats: () => Record<
		string,
		{ count: number; lastEvent: number }
	>;

	// Export and reporting
	exportTelemetry: () => Promise<Blob>;
	clearTelemetry: () => void;
	isEnabled: () => boolean;
	setEnabled: (enabled: boolean) => void;
}

// Create a singleton telemetry service
class TelemetryServiceImpl implements TelemetryService {
	private actions: Map<string, ActionTelemetry> = new Map();
	private performanceMetrics: PerformanceMetrics[] = [];
	private errors: Array<{ error: string; count: number; lastSeen: number }> =
		[];
	private usageStats: Record<string, { count: number; lastUsed: number }> = {};
	private accessibilityStats: Record<
		string,
		{ count: number; lastEvent: number }
	> = {};
	private enabled: boolean = true;

	// Action tracking
	trackActionStart(
		action: Omit<ActionTelemetry, "endTime" | "duration" | "status">,
	): string {
		if (!this.enabled) return action.id;

		const actionTelemetry: ActionTelemetry = {
			...action,
			status: "started",
		};

		this.actions.set(action.id, actionTelemetry);
		return action.id;
	}

	trackActionEnd(
		actionId: string,
		status: "completed" | "failed" | "cancelled",
		error?: Error,
	): void {
		if (!this.enabled) return;

		const action = this.actions.get(actionId);
		if (!action) return;

		const endTime = Date.now();
		const duration = endTime - action.startTime;

		const updatedAction: ActionTelemetry = {
			...action,
			endTime,
			duration,
			status,
			error: error
				? {
						code: (error as unknown).code || "UNKNOWN_ERROR",
						message: error.message,
						stack: error.stack,
						context: (error as unknown).context,
					}
				: undefined,
		};

		this.actions.set(actionId, updatedAction);

		// Update performance metrics
		if (status === "completed" && duration) {
			this.performanceMetrics.push({
				actionDuration: duration,
				memoryUsage: 0, // Would be populated by actual metrics
				cpuUsage: 0, // Would be populated by actual metrics
				networkLatency: 0, // Would be populated by actual metrics
				cacheHitRate: 0, // Would be populated by actual metrics
				errorRate: 0, // Would be calculated
				successRate: 1, // Would be calculated
				throughput: 1000 / duration, // Actions per second
			});
		}

		// Track errors
		if (status === "failed" && error) {
			const errorKey = error.message || "UNKNOWN_ERROR";
			const existing = this.errors.find((e) => e.error === errorKey);
			if (existing) {
				existing.count++;
				existing.lastSeen = endTime;
			} else {
				this.errors.push({
					error: errorKey,
					count: 1,
					lastSeen: endTime,
				});
			}
		}
	}

	// Performance tracking
	trackPerformance(metrics: PerformanceMetrics): void {
		if (!this.enabled) return;
		this.performanceMetrics.push(metrics);
	}

	getPerformanceSummary(): PerformanceMetrics {
		if (this.performanceMetrics.length === 0) {
			return {
				actionDuration: 0,
				memoryUsage: 0,
				cpuUsage: 0,
				networkLatency: 0,
				cacheHitRate: 0,
				errorRate: 0,
				successRate: 0,
				throughput: 0,
			};
		}

		const sum = this.performanceMetrics.reduce(
			(acc, metric) => ({
				actionDuration: acc.actionDuration + metric.actionDuration,
				memoryUsage: acc.memoryUsage + metric.memoryUsage,
				cpuUsage: acc.cpuUsage + metric.cpuUsage,
				networkLatency: acc.networkLatency + metric.networkLatency,
				cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
				errorRate: acc.errorRate + metric.errorRate,
				successRate: acc.successRate + metric.successRate,
				throughput: acc.throughput + metric.throughput,
			}),
			{
				actionDuration: 0,
				memoryUsage: 0,
				cpuUsage: 0,
				networkLatency: 0,
				cacheHitRate: 0,
				errorRate: 0,
				successRate: 0,
				throughput: 0,
			},
		);

		const count = this.performanceMetrics.length;
		return {
			actionDuration: sum.actionDuration / count,
			memoryUsage: sum.memoryUsage / count,
			cpuUsage: sum.cpuUsage / count,
			networkLatency: sum.networkLatency / count,
			cacheHitRate: sum.cacheHitRate / count,
			errorRate: sum.errorRate / count,
			successRate: sum.successRate / count,
			throughput: sum.throughput / count,
		};
	}

	// Error tracking
	trackError(error: Error, context?: Record<string, unknown>): void {
		if (!this.enabled) return;

		const errorKey = error.message || "UNKNOWN_ERROR";
		const existing = this.errors.find((e) => e.error === errorKey);
		const timestamp = Date.now();

		if (existing) {
			existing.count++;
			existing.lastSeen = timestamp;
		} else {
			this.errors.push({
				error: errorKey,
				count: 1,
				lastSeen: timestamp,
			});
		}

		// Log to console in development
		if (process.env.NODE_ENV === "development") {
			console.error("Tracked error:", error, context);
		}
	}

	getErrorSummary(): Array<{ error: string; count: number; lastSeen: number }> {
		return [...this.errors].sort((a, b) => b.lastSeen - a.lastSeen);
	}

	// Usage tracking
	trackUsage(feature: string, userId?: string): void {
		if (!this.enabled) return;

		const key = userId ? `${userId}:${feature}` : feature;
		const timestamp = Date.now();

		if (this.usageStats[key]) {
			this.usageStats[key].count++;
			this.usageStats[key].lastUsed = timestamp;
		} else {
			this.usageStats[key] = {
				count: 1,
				lastUsed: timestamp,
			};
		}
	}

	getUsageStats(): Record<string, { count: number; lastUsed: number }> {
		return { ...this.usageStats };
	}

	// Accessibility tracking
	trackAccessibilityEvent(
		event: string,
		details?: Record<string, unknown>,
	): void {
		if (!this.enabled) return;

		const timestamp = Date.now();

		if (this.accessibilityStats[event]) {
			this.accessibilityStats[event].count++;
			this.accessibilityStats[event].lastEvent = timestamp;
		} else {
			this.accessibilityStats[event] = {
				count: 1,
				lastEvent: timestamp,
			};
		}
	}

	getAccessibilityStats(): Record<
		string,
		{ count: number; lastEvent: number }
	> {
		return { ...this.accessibilityStats };
	}

	// Export and reporting
	async exportTelemetry(): Promise<Blob> {
		const data = {
			actions: Array.from(this.actions.values()),
			performance: this.performanceMetrics,
			errors: this.errors,
			usage: this.usageStats,
			accessibility: this.accessibilityStats,
			timestamp: new Date().toISOString(),
		};

		return new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
	}

	clearTelemetry(): void {
		this.actions.clear();
		this.performanceMetrics = [];
		this.errors = [];
		this.usageStats = {};
		this.accessibilityStats = {};
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}
}

// Export singleton instance
export const telemetryService = new TelemetryServiceImpl();
