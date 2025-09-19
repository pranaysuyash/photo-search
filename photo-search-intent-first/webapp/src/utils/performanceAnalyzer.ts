/**
 * Performance analysis utilities for identifying bottlenecks
 */
export interface PerformanceSnapshot {
	timestamp: number;
	memoryUsage: number;
	renderCount: number;
	apiCallCount: number;
	largestRenderTime: number;
	slowestApiCall: number;
}

export class PerformanceAnalyzer {
	private snapshots: PerformanceSnapshot[] = [];
	private renderTimes: number[] = [];
	private apiCallTimes: number[] = [];

	recordRenderTime(duration: number): void {
		this.renderTimes.push(duration);
		// Keep only last 100 measurements
		if (this.renderTimes.length > 100) {
			this.renderTimes = this.renderTimes.slice(-100);
		}
	}

	recordApiCallTime(duration: number): void {
		this.apiCallTimes.push(duration);
		// Keep only last 50 measurements
		if (this.apiCallTimes.length > 50) {
			this.apiCallTimes = this.apiCallTimes.slice(-50);
		}
	}

	takeSnapshot(memoryUsage: number): void {
		const snapshot: PerformanceSnapshot = {
			timestamp: Date.now(),
			memoryUsage,
			renderCount: this.renderTimes.length,
			apiCallCount: this.apiCallTimes.length,
			largestRenderTime: Math.max(...this.renderTimes, 0),
			slowestApiCall: Math.max(...this.apiCallTimes, 0),
		};

		this.snapshots.push(snapshot);
		// Keep only last 20 snapshots
		if (this.snapshots.length > 20) {
			this.snapshots = this.snapshots.slice(-20);
		}
	}

	getAnalysis(): {
		averageRenderTime: number;
		averageApiTime: number;
		memoryTrend: "stable" | "increasing" | "decreasing";
		performanceScore: number;
		recommendations: string[];
	} {
		const recommendations: string[] = [];

		// Calculate averages
		const averageRenderTime =
			this.renderTimes.length > 0
				? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
				: 0;

		const averageApiTime =
			this.apiCallTimes.length > 0
				? this.apiCallTimes.reduce((a, b) => a + b, 0) /
					this.apiCallTimes.length
				: 0;

		// Analyze memory trend
		let memoryTrend: "stable" | "increasing" | "decreasing" = "stable";
		if (this.snapshots.length >= 3) {
			const recent = this.snapshots.slice(-3);
			const first = recent[0].memoryUsage;
			const last = recent[recent.length - 1].memoryUsage;
			const diff = last - first;

			if (diff > 5) memoryTrend = "increasing";
			else if (diff < -5) memoryTrend = "decreasing";
		}

		// Calculate performance score (0-100, higher is better)
		let performanceScore = 100;

		// Penalize slow renders
		if (averageRenderTime > 16) {
			performanceScore -= Math.min(30, (averageRenderTime - 16) * 2);
			recommendations.push(
				"Consider optimizing component re-renders and reducing DOM updates",
			);
		}

		// Penalize slow API calls
		if (averageApiTime > 500) {
			performanceScore -= Math.min(25, (averageApiTime - 500) / 20);
			recommendations.push(
				"API calls are slow - consider caching or batching requests",
			);
		}

		// Penalize memory growth
		if (memoryTrend === "increasing") {
			performanceScore -= 15;
			recommendations.push(
				"Memory usage is increasing - check for memory leaks",
			);
		}

		// Penalize high render frequency
		if (this.renderTimes.length > 50) {
			performanceScore -= 10;
			recommendations.push(
				"High render frequency detected - consider debouncing updates",
			);
		}

		performanceScore = Math.max(0, Math.min(100, performanceScore));

		// Add positive recommendations
		if (performanceScore > 80) {
			recommendations.push(
				"Performance looks good! Keep monitoring for regressions.",
			);
		}

		return {
			averageRenderTime,
			averageApiTime,
			memoryTrend,
			performanceScore,
			recommendations,
		};
	}

	getSlowestComponents(): Array<{ component: string; renderTime: number }> {
		// This would need to be populated by the React Profiler
		// For now, return empty array
		return [];
	}

	reset(): void {
		this.snapshots = [];
		this.renderTimes = [];
		this.apiCallTimes = [];
	}
}

// Global performance analyzer instance
export const performanceAnalyzer = new PerformanceAnalyzer();
