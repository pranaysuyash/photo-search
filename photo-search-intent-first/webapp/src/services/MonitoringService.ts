// Monitoring and Observability Service
// Handles error tracking, performance monitoring, and analytics

import { API_BASE } from "../api";
import { getLoggingConfig, shouldLogErrorsToServer } from "../config/logging";

interface ErrorReport {
	message: string;
	stack?: string;
	context?: Record<string, unknown>;
	severity: "low" | "medium" | "high" | "critical";
	timestamp: number;
	userAgent: string;
	url: string;
}

interface PerformanceMetric {
	name: string;
	value: number;
	unit: "ms" | "bytes" | "count";
	tags?: Record<string, string>;
	timestamp: number;
}

interface UserEvent {
	action: string;
	category: string;
	label?: string;
	value?: number;
	metadata?: Record<string, unknown>;
	timestamp: number;
}

class MonitoringService {
	private errorQueue: ErrorReport[] = [];
	private metricsQueue: PerformanceMetric[] = [];
	private eventsQueue: UserEvent[] = [];
	private flushInterval: number = 30000; // 30 seconds
	private maxQueueSize: number = 100;
	private sessionId: string;
	private userId?: string;

	constructor() {
		this.sessionId = this.generateSessionId();
		// Respect logging gate: avoid noisy global handlers in test unless explicitly allowed
		const cfg = getLoggingConfig();
		const enableGlobalHandlers = cfg.mode !== "test" || cfg.envGate === "all";
		if (enableGlobalHandlers) {
			this.setupErrorHandling();
		}
		this.setupPerformanceObserver();
		this.startFlushInterval();
	}

	private generateSessionId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private setupErrorHandling() {
		// Global error handler
		window.addEventListener("error", (event) => {
			this.logError({
				message: event.message,
				stack: event.error?.stack,
				context: {
					filename: event.filename,
					lineno: event.lineno,
					colno: event.colno,
				},
				severity: "high",
			});
		});

		// Unhandled promise rejections
		window.addEventListener("unhandledrejection", (event) => {
			this.logError({
				message: `Unhandled Promise Rejection: ${event.reason}`,
				stack: event.reason?.stack,
				severity: "high",
			});
		});
	}

	private setupPerformanceObserver() {
		if (!("PerformanceObserver" in window)) return;

		// Observe navigation timing
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.entryType === "navigation") {
					const nav = entry as PerformanceNavigationTiming;
					this.trackMetric("page_load", nav.loadEventEnd - nav.fetchStart);
					this.trackMetric(
						"dom_content_loaded",
						nav.domContentLoadedEventEnd - nav.fetchStart,
					);
					this.trackMetric("first_byte", nav.responseStart - nav.fetchStart);
				} else if (entry.entryType === "largest-contentful-paint") {
					this.trackMetric("lcp", entry.startTime);
				} else if (entry.entryType === "first-input") {
					const fid = entry as PerformanceEventTiming;
					this.trackMetric("fid", fid.processingStart - fid.startTime);
				} else if (entry.entryType === "layout-shift") {
					const cls = entry as unknown;
					if (!cls?.hadRecentInput) {
						this.trackMetric("cls", Number(cls?.value) || 0, "count");
					}
				}
			}
		});

		// Observe various performance metrics
		try {
			observer.observe({
				entryTypes: [
					"navigation",
					"largest-contentful-paint",
					"first-input",
					"layout-shift",
				],
			});
		} catch (e) {
			// Some entry types might not be supported
			console.warn("Performance observer setup failed:", e);
		}
	}

	private startFlushInterval() {
		setInterval(() => {
			this.flush();
		}, this.flushInterval);

		// Flush on page unload
		window.addEventListener("beforeunload", () => {
			this.flush(true);
		});
	}

	// Public API

	public setUser(userId: string) {
		this.userId = userId;
	}

	public logError(error: Partial<ErrorReport>) {
		const report: ErrorReport = {
			message: error.message || "Unknown error",
			stack: error.stack,
			context: error.context,
			severity: error.severity || "medium",
			timestamp: Date.now(),
			userAgent: navigator.userAgent,
			url: window.location.href,
		};

		this.errorQueue.push(report);

		// Immediate flush for critical errors
		if (report.severity === "critical") {
			this.flush();
		} else if (this.errorQueue.length >= this.maxQueueSize) {
			this.flush();
		}

		// Log to console conditionally:
		// - in dev normally
		// - in test only if envGate is set to "all"
		const cfg = getLoggingConfig();
		const isDev = Boolean((import.meta as unknown).env?.DEV);
		const allowInTest = cfg.mode === "test" && cfg.envGate === "all";
		if ((isDev && cfg.mode !== "test") || allowInTest) {
			console.error("[Monitoring]", report);
		}
	}

	public trackMetric(
		name: string,
		value: number,
		unit: "ms" | "bytes" | "count" = "ms",
		tags?: Record<string, string>,
	) {
		const metric: PerformanceMetric = {
			name,
			value,
			unit,
			tags,
			timestamp: Date.now(),
		};

		this.metricsQueue.push(metric);

		if (this.metricsQueue.length >= this.maxQueueSize) {
			this.flush();
		}

		// Log to console conditionally (same gate as errors)
		const cfg = getLoggingConfig();
		const isDev = Boolean((import.meta as unknown).env?.DEV);
		const allowInTest = cfg.mode === "test" && cfg.envGate === "all";
		if ((isDev && cfg.mode !== "test") || allowInTest) {
			console.log("[Metric]", metric);
		}
	}

	public trackEvent(
		action: string,
		category: string,
		label?: string,
		value?: number,
		metadata?: Record<string, unknown>,
	) {
		const event: UserEvent = {
			action,
			category,
			label,
			value,
			metadata,
			timestamp: Date.now(),
		};

		this.eventsQueue.push(event);

		if (this.eventsQueue.length >= this.maxQueueSize) {
			this.flush();
		}

		// Send to Google Analytics if configured
		if (
			typeof (window as unknown).gtag !== "undefined" &&
			import.meta.env.VITE_GA_MEASUREMENT_ID
		) {
			(window as unknown).gtag("event", action, {
				event_category: category,
				event_label: label,
				value: value,
				...metadata,
			});
		}
	}

	public trackPageView(path: string, title?: string) {
		this.trackEvent("page_view", "navigation", path, undefined, { title });

		// Send to Google Analytics
		if (
			typeof (window as unknown).gtag !== "undefined" &&
			import.meta.env.VITE_GA_MEASUREMENT_ID
		) {
			(window as unknown).gtag(
				"config",
				import.meta.env.VITE_GA_MEASUREMENT_ID,
				{
					page_path: path,
					page_title: title,
				},
			);
		}
	}

	public startTimer(name: string): () => void {
		const startTime = performance.now();

		return () => {
			const duration = performance.now() - startTime;
			this.trackMetric(name, duration);
		};
	}

	public measureApiCall(endpoint: string, method: string): () => void {
		return this.startTimer(
			`api_${method.toLowerCase()}_${endpoint.replace(/\//g, "_")}`,
		);
	}

	private async flush(immediate = false) {
		// Short-circuit if nothing is enabled
		if (
			!import.meta.env.VITE_ENABLE_ERROR_REPORTING &&
			!import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING &&
			!import.meta.env.VITE_ENABLE_ANALYTICS
		) {
			return;
		}

		const payload = {
			sessionId: this.sessionId,
			userId: this.userId,
			// Respect server logging gate for error shipment
			errors: shouldLogErrorsToServer() ? [...this.errorQueue] : [],
			metrics: [...this.metricsQueue],
			events: [...this.eventsQueue],
		};

		// Clear queues
		this.errorQueue = [];
		this.metricsQueue = [];
		this.eventsQueue = [];

		// Don't send empty payloads
		if (
			payload.errors.length === 0 &&
			payload.metrics.length === 0 &&
			payload.events.length === 0
		) {
			return;
		}

		try {
			// Send to monitoring endpoint; default to the local API when unset.
			const rawEndpoint = import.meta.env.VITE_MONITORING_ENDPOINT;
			const endpoint = rawEndpoint
				? rawEndpoint.startsWith("http")
					? rawEndpoint
					: `${API_BASE}${rawEndpoint.startsWith("/") ? "" : "/"}${rawEndpoint}`
				: `${API_BASE}/monitoring`;

			if (immediate) {
				// Use sendBeacon for page unload
				const blob = new Blob([JSON.stringify(payload)], {
					type: "application/json",
				});
				navigator.sendBeacon(endpoint, blob);
			} else {
				// Regular fetch
				await fetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				});
			}
		} catch (error) {
			// Monitoring should never break the app
			console.warn("Failed to send monitoring data:", error);
		}
	}

	// Web Vitals tracking
	public trackWebVitals() {
		// Track Core Web Vitals
		const webVital = (window as unknown)["web-vital"];
		if (webVital?.onCLS) {
			const { onCLS, onFID, onLCP, onFCP, onTTFB } = webVital;
			onCLS((metric: any) =>
				this.trackMetric("cls", Number(metric?.value) || 0, "count"),
			);
			onFID((metric: any) =>
				this.trackMetric("fid", Number(metric?.value) || 0),
			);
			onLCP((metric: any) =>
				this.trackMetric("lcp", Number(metric?.value) || 0),
			);
			onFCP((metric: any) =>
				this.trackMetric("fcp", Number(metric?.value) || 0),
			);
			onTTFB((metric: any) =>
				this.trackMetric("ttfb", Number(metric?.value) || 0),
			);
		}
	}

	// Custom business metrics
	public trackSearch(query: string, resultCount: number, duration: number) {
		this.trackEvent("search", "interaction", query, resultCount, {
			duration,
			hasResults: resultCount > 0,
		});
		this.trackMetric("search_duration", duration);
		this.trackMetric("search_results", resultCount, "count");
	}

	public trackPhotoView(photoId: string, source: string) {
		this.trackEvent("photo_view", "interaction", source, undefined, {
			photoId,
		});
	}

	public trackCollection(
		action: "create" | "delete" | "add_to" | "remove_from",
		collectionName: string,
		itemCount?: number,
	) {
		this.trackEvent(
			`collection_${action}`,
			"collection",
			collectionName,
			itemCount,
		);
	}

	public trackExport(format: string, count: number, size: number) {
		this.trackEvent("export", "interaction", format, count, {
			totalSize: size,
			averageSize: size / count,
		});
		this.trackMetric("export_size", size, "bytes");
	}
}

// Singleton instance
export const monitoringService = new MonitoringService();

// React Error Boundary integration
export function logErrorToService(error: Error, errorInfo: unknown) {
	monitoringService.logError({
		message: error.message,
		stack: error.stack,
		context: errorInfo as unknown as Record<string, unknown>,
		severity: "high",
	});
}
