/**
 * Performance monitoring service for tracking application metrics
 * and optimizing user experience with large photo collections.
 */

export interface PerformanceMetrics {
	memoryUsage: {
		usedJSHeapSize: number;
		totalJSHeapSize: number;
		jsHeapSizeLimit: number;
		usageMB: number;
		usagePercent: number;
	};
	timing: {
		pageLoad: number;
		firstContentfulPaint: number;
		domInteractive: number;
	};
	library: {
		totalItems: number;
		loadedItems: number;
		loadingTime: number;
		averageLoadTime: number;
	};
	rendering: {
		gridRenderTime: number;
		virtualizationEnabled: boolean;
		visibleItems: number;
		totalRenderedItems: number;
	};
}

export interface PerformanceAlert {
	type: "warning" | "critical";
	message: string;
	timestamp: number;
	metrics: Partial<PerformanceMetrics>;
}

export class PerformanceMonitor {
	private static instance: PerformanceMonitor;
	private metrics: PerformanceMetrics;
	private alerts: PerformanceAlert[] = [];
	private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();
	private alertHandlers: Set<(alert: PerformanceAlert) => void> = new Set();
	private measurementIntervals: Set<NodeJS.Timeout> = new Set();

	private constructor() {
		this.metrics = this.initializeMetrics();
		this.startMonitoring();
	}

	static getInstance(): PerformanceMonitor {
		if (!PerformanceMonitor.instance) {
			PerformanceMonitor.instance = new PerformanceMonitor();
		}
		return PerformanceMonitor.instance;
	}

	private initializeMetrics(): PerformanceMetrics {
		return {
			memoryUsage: {
				usedJSHeapSize: 0,
				totalJSHeapSize: 0,
				jsHeapSizeLimit: 0,
				usageMB: 0,
				usagePercent: 0,
			},
			timing: {
				pageLoad: 0,
				firstContentfulPaint: 0,
				domInteractive: 0,
			},
			library: {
				totalItems: 0,
				loadedItems: 0,
				loadingTime: 0,
				averageLoadTime: 0,
			},
			rendering: {
				gridRenderTime: 0,
				virtualizationEnabled: false,
				visibleItems: 0,
				totalRenderedItems: 0,
			},
		};
	}

	private startMonitoring(): void {
		// Monitor memory usage every 10 seconds
		const memoryInterval = setInterval(() => {
			this.updateMemoryMetrics();
			this.checkMemoryThresholds();
		}, 10000);
		this.measurementIntervals.add(memoryInterval);

		// Monitor page timing metrics
		if (typeof window !== "undefined" && "performance" in window) {
			this.updateTimingMetrics();
		}

		// Monitor library performance
		const libraryInterval = setInterval(() => {
			this.updateLibraryMetricsInternal();
		}, 5000);
		this.measurementIntervals.add(libraryInterval);
	}

	private updateMemoryMetrics(): void {
		if ("memory" in performance) {
			const memory = (performance as unknown).memory;
			const usedJSHeapSize = memory.usedJSHeapSize;
			const totalJSHeapSize = memory.totalJSHeapSize;
			const jsHeapSizeLimit = memory.jsHeapSizeLimit;
			const usageMB = Math.round(usedJSHeapSize / (1024 * 1024));
			const usagePercent = Math.round((usedJSHeapSize / jsHeapSizeLimit) * 100);

			this.metrics.memoryUsage = {
				usedJSHeapSize,
				totalJSHeapSize,
				jsHeapSizeLimit,
				usageMB,
				usagePercent,
			};

			this.notifyObservers();
		}
	}

	private updateTimingMetrics(): void {
		if ("performance" in window) {
			const nav = performance.getEntriesByType(
				"navigation",
			)[0] as PerformanceNavigationTiming;
			if (nav) {
				this.metrics.timing = {
					pageLoad: nav.loadEventEnd - nav.loadEventStart,
					firstContentfulPaint: nav.responseEnd - nav.fetchStart,
					domInteractive: nav.domInteractive - nav.fetchStart,
				};
			}
		}
	}

	private updateLibraryMetricsInternal(): void {
		// This will be updated by the library components
		this.notifyObservers();
	}

	private checkMemoryThresholds(): void {
		const { usageMB, usagePercent } = this.metrics.memoryUsage;

		if (usagePercent > 90) {
			this.createAlert(
				"critical",
				`Critical memory usage: ${usagePercent}% (${usageMB}MB)`,
				{
					memoryUsage: this.metrics.memoryUsage,
				},
			);
		} else if (usagePercent > 75) {
			this.createAlert(
				"warning",
				`High memory usage: ${usagePercent}% (${usageMB}MB)`,
				{
					memoryUsage: this.metrics.memoryUsage,
				},
			);
		}
	}

	private createAlert(
		type: "warning" | "critical",
		message: string,
		metrics: Partial<PerformanceMetrics>,
	): void {
		const alert: PerformanceAlert = {
			type,
			message,
			timestamp: Date.now(),
			metrics,
		};

		this.alerts.push(alert);

		// Keep only last 50 alerts
		if (this.alerts.length > 50) {
			this.alerts = this.alerts.slice(-50);
		}

		this.notifyAlertHandlers(alert);
	}

	public updateLibraryMetrics(data: {
		totalItems?: number;
		loadedItems?: number;
		loadingTime?: number;
		virtualizationEnabled?: boolean;
		visibleItems?: number;
		totalRenderedItems?: number;
	}): void {
		if (data.totalItems !== undefined) {
			this.metrics.library.totalItems = data.totalItems;
		}
		if (data.loadedItems !== undefined) {
			this.metrics.library.loadedItems = data.loadedItems;
		}
		if (data.loadingTime !== undefined) {
			this.metrics.library.loadingTime = data.loadingTime;
			this.metrics.library.averageLoadTime =
				this.metrics.library.loadedItems > 0
					? this.metrics.library.loadingTime / this.metrics.library.loadedItems
					: 0;
		}
		if (data.virtualizationEnabled !== undefined) {
			this.metrics.rendering.virtualizationEnabled = data.virtualizationEnabled;
		}
		if (data.visibleItems !== undefined) {
			this.metrics.rendering.visibleItems = data.visibleItems;
		}
		if (data.totalRenderedItems !== undefined) {
			this.metrics.rendering.totalRenderedItems = data.totalRenderedItems;
		}

		this.notifyObservers();
	}

	public recordGridRenderTime(renderTime: number): void {
		this.metrics.rendering.gridRenderTime = renderTime;
		this.notifyObservers();
	}

	public getMetrics(): PerformanceMetrics {
		return { ...this.metrics };
	}

	public getAlerts(): PerformanceAlert[] {
		return [...this.alerts];
	}

	public clearAlerts(): void {
		this.alerts = [];
	}

	public subscribe(
		callback: (metrics: PerformanceMetrics) => void,
	): () => void {
		this.observers.add(callback);
		return () => this.observers.delete(callback);
	}

	public onAlert(callback: (alert: PerformanceAlert) => void): () => void {
		this.alertHandlers.add(callback);
		return () => this.alertHandlers.delete(callback);
	}

	private notifyObservers(): void {
		this.observers.forEach((callback) => callback(this.getMetrics()));
	}

	private notifyAlertHandlers(alert: PerformanceAlert): void {
		this.alertHandlers.forEach((callback) => callback(alert));
	}

	public generateReport(): string {
		const metrics = this.getMetrics();
		const alerts = this.getAlerts();

		let report = `=== Performance Report ===\n`;
		report += `Generated: ${new Date().toISOString()}\n\n`;

		report += `Memory Usage:\n`;
		report += `  - Used: ${metrics.memoryUsage.usageMB}MB (${metrics.memoryUsage.usagePercent}%)\n`;
		report += `  - Total: ${Math.round(metrics.memoryUsage.totalJSHeapSize / 1024 / 1024)}MB\n`;
		report += `  - Limit: ${Math.round(metrics.memoryUsage.jsHeapSizeLimit / 1024 / 1024)}MB\n\n`;

		report += `Library Performance:\n`;
		report += `  - Total Items: ${metrics.library.totalItems}\n`;
		report += `  - Loaded Items: ${metrics.library.loadedItems}\n`;
		report += `  - Loading Time: ${metrics.library.loadingTime}ms\n`;
		report += `  - Average Load Time: ${metrics.library.averageLoadTime.toFixed(2)}ms\n\n`;

		report += `Rendering Performance:\n`;
		report += `  - Virtualization Enabled: ${metrics.rendering.virtualizationEnabled}\n`;
		report += `  - Grid Render Time: ${metrics.rendering.gridRenderTime}ms\n`;
		report += `  - Visible Items: ${metrics.rendering.visibleItems}\n`;
		report += `  - Total Rendered Items: ${metrics.rendering.totalRenderedItems}\n\n`;

		if (alerts.length > 0) {
			report += `Recent Alerts (${alerts.length}):\n`;
			alerts.slice(-5).forEach((alert) => {
				report += `  - [${alert.type.toUpperCase()}] ${alert.message}\n`;
			});
		}

		return report;
	}

	public destroy(): void {
		this.measurementIntervals.forEach((interval) => clearInterval(interval));
		this.measurementIntervals.clear();
		this.observers.clear();
		this.alertHandlers.clear();
		this.alerts = [];
	}
}

// Hook for React components to use performance monitoring
export function usePerformanceMonitor() {
	const monitor = PerformanceMonitor.getInstance();

	return {
		metrics: monitor.getMetrics(),
		alerts: monitor.getAlerts(),
		updateLibraryMetrics: (data: unknown) => monitor.updateLibraryMetrics(data),
		recordGridRenderTime: (time: number) => monitor.recordGridRenderTime(time),
		subscribe: monitor.subscribe.bind(monitor),
		onAlert: monitor.onAlert.bind(monitor),
		generateReport: monitor.generateReport.bind(monitor),
		clearAlerts: monitor.clearAlerts.bind(monitor),
	};
}
