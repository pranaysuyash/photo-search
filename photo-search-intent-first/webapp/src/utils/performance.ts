// Performance monitoring utilities for tracking component performance

type PerformanceMetric = {
	name: string;
	duration: number;
	timestamp: number;
	metadata?: Record<string, unknown>;
};

class PerformanceMonitor {
	private metrics: PerformanceMetric[] = [];
	private observers: ((metric: PerformanceMetric) => void)[] = [];

	// Start timing an operation
	start(name: string): () => void {
		const startTime = performance.now();
		
		return () => {
			const endTime = performance.now();
			const duration = endTime - startTime;
			const metric: PerformanceMetric = {
				name,
				duration,
				timestamp: Date.now()
			};
			
			this.metrics.push(metric);
			this.notifyObservers(metric);
		};
	}

	// Record a custom metric
	record(name: string, duration: number, metadata?: Record<string, unknown>): void {
		const metric: PerformanceMetric = {
			name,
			duration,
			timestamp: Date.now(),
			metadata
		};
		
		this.metrics.push(metric);
		this.notifyObservers(metric);
	}

	// Get recent metrics
	getRecentMetrics(minutes: number = 5): PerformanceMetric[] {
		const cutoffTime = Date.now() - (minutes * 60 * 1000);
		return this.metrics.filter(metric => metric.timestamp > cutoffTime);
	}

	// Get average duration for a specific metric
	getAverageDuration(name: string): number {
		const metrics = this.metrics.filter(metric => metric.name === name);
		if (metrics.length === 0) return 0;
		
		const total = metrics.reduce((sum, metric) => sum + metric.duration, 0);
		return total / metrics.length;
	}

	// Add observer for real-time monitoring
	addObserver(observer: (metric: PerformanceMetric) => void): void {
		this.observers.push(observer);
	}

	// Remove observer
	removeObserver(observer: (metric: PerformanceMetric) => void): void {
		const index = this.observers.indexOf(observer);
		if (index !== -1) {
			this.observers.splice(index, 1);
		}
	}

	// Notify all observers
	private notifyObservers(metric: PerformanceMetric): void {
		this.observers.forEach(observer => observer(metric));
	}

	// Clear old metrics to prevent memory leaks
	clearOldMetrics(hours: number = 24): void {
		const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
		this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
	}

	// Export metrics for analysis
	exportMetrics(): PerformanceMetric[] {
		return [...this.metrics];
	}
}

// Create a singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Hook for React components to easily monitor performance
export const usePerformanceMonitor = () => {
	const start = (name: string) => {
		return performanceMonitor.start(name);
	};

	return { start };
};

// Utility function to measure component render time
export const measureRenderTime = (componentName: string) => {
	return performanceMonitor.start(`${componentName}_render`);
};

// Utility function to measure API call time
export const measureAPICall = (apiName: string) => {
	return performanceMonitor.start(`${apiName}_api_call`);
};