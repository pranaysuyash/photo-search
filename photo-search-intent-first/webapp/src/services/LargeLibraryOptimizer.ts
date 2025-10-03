/**
 * Large Library Optimization Service
 * Automatically detects and optimizes performance for large photo libraries
 * by enabling ANN indexing, adaptive loading, and other performance optimizations
 */

interface LibraryMetrics {
	totalPhotos: number;
	totalFolders: number;
	librarySize: number; // in MB
	averagePhotoSize: number;
	indexingTime: number;
	searchPerformance: {
		averageSearchTime: number;
		slowSearches: number; // searches > 2 seconds
		totalSearches: number;
	};
	memoryUsage: {
		currentUsage: number;
		peakUsage: number;
		cacheSize: number;
	};
}

interface OptimizationThresholds {
	photoCount: number; // Threshold for photo count
	librarySize: number; // Threshold in MB
	searchTime: number; // Threshold in ms
	memoryUsage: number; // Threshold in MB
}

interface OptimizationSettings {
	annEnabled: boolean;
	annIndexSize: number;
	virtualScrollingEnabled: boolean;
	batchSize: number;
	cacheSize: number;
	lazyLoadingEnabled: boolean;
	progressiveLoadingEnabled: boolean;
	compressionEnabled: boolean;
	backgroundIndexing: boolean;
}

interface OptimizationRecommendation {
	type:
		| "ann"
		| "virtual-scrolling"
		| "caching"
		| "batching"
		| "compression"
		| "lazy-loading";
	priority: "critical" | "high" | "medium" | "low";
	impact: string;
	description: string;
	estimatedImprovement: number; // percentage
	implementation: string;
}

class LargeLibraryOptimizer {
	private static instance: LargeLibraryOptimizer;
	private metrics: LibraryMetrics | null = null;
	private settings: OptimizationSettings;
	private thresholds: OptimizationThresholds;
	private observers: Set<
		(
			metrics: LibraryMetrics,
			recommendations: OptimizationRecommendation[],
		) => void
	> = new Set();
	private isOptimizing = false;

	private constructor() {
		this.settings = this.getDefaultSettings();
		this.thresholds = this.getDefaultThresholds();
		this.initializeMetrics();
	}

	public static getInstance(): LargeLibraryOptimizer {
		if (!LargeLibraryOptimizer.instance) {
			LargeLibraryOptimizer.instance = new LargeLibraryOptimizer();
		}
		return LargeLibraryOptimizer.instance;
	}

	private getDefaultSettings(): OptimizationSettings {
		return {
			annEnabled: false,
			annIndexSize: 1000,
			virtualScrollingEnabled: false,
			batchSize: 50,
			cacheSize: 100,
			lazyLoadingEnabled: true,
			progressiveLoadingEnabled: false,
			compressionEnabled: false,
			backgroundIndexing: false,
		};
	}

	private getDefaultThresholds(): OptimizationThresholds {
		return {
			photoCount: 10000, // Enable optimizations for > 10k photos
			librarySize: 5000, // 5GB library
			searchTime: 1000, // 1 second search time
			memoryUsage: 512, // 512MB memory usage
		};
	}

	private async initializeMetrics(): Promise<void> {
		// Initialize with default values - will be updated by real data
		this.metrics = {
			totalPhotos: 0,
			totalFolders: 0,
			librarySize: 0,
			averagePhotoSize: 0,
			indexingTime: 0,
			searchPerformance: {
				averageSearchTime: 0,
				slowSearches: 0,
				totalSearches: 0,
			},
			memoryUsage: {
				currentUsage: 0,
				peakUsage: 0,
				cacheSize: 0,
			},
		};
	}

	/**
	 * Update library metrics from real data
	 */
	public updateMetrics(newMetrics: Partial<LibraryMetrics>): void {
		if (!this.metrics) return;

		this.metrics = {
			...this.metrics,
			...newMetrics,
		};

		// Check if optimization is needed
		this.checkOptimizationNeeds();
	}

	/**
	 * Update search performance metrics
	 */
	public recordSearchPerformance(searchTime: number): void {
		if (!this.metrics) return;

		this.metrics.searchPerformance.totalSearches++;
		this.metrics.searchPerformance.averageSearchTime =
			(this.metrics.searchPerformance.averageSearchTime *
				(this.metrics.searchPerformance.totalSearches - 1) +
				searchTime) /
			this.metrics.searchPerformance.totalSearches;

		if (searchTime > this.thresholds.searchTime) {
			this.metrics.searchPerformance.slowSearches++;
		}

		// Check if performance optimization is needed
		if (this.shouldOptimizeForPerformance()) {
			this.triggerOptimization();
		}
	}

	/**
	 * Update memory usage metrics
	 */
	public updateMemoryUsage(usage: number, cacheSize: number): void {
		if (!this.metrics) return;

		this.metrics.memoryUsage.currentUsage = usage;
		this.metrics.memoryUsage.cacheSize = cacheSize;
		this.metrics.memoryUsage.peakUsage = Math.max(
			this.metrics.memoryUsage.peakUsage,
			usage,
		);

		// Check if memory optimization is needed
		if (this.shouldOptimizeForMemory()) {
			this.triggerOptimization();
		}
	}

	/**
	 * Check if optimizations should be applied based on current metrics
	 */
	private checkOptimizationNeeds(): void {
		if (!this.metrics) return;

		const recommendations = this.generateRecommendations();

		if (recommendations.length > 0) {
			this.notifyObservers(recommendations);
		}
	}

	/**
	 * Generate optimization recommendations based on current metrics
	 */
	public generateRecommendations(): OptimizationRecommendation[] {
		if (!this.metrics) return [];

		const recommendations: OptimizationRecommendation[] = [];

		// ANN recommendation for large libraries
		if (
			this.metrics.totalPhotos > this.thresholds.photoCount &&
			!this.settings.annEnabled
		) {
			recommendations.push({
				type: "ann",
				priority: "critical",
				impact: "Search performance for large libraries",
				description: `Enable Approximate Nearest Neighbor indexing for ${this.metrics.totalPhotos.toLocaleString()} photos`,
				estimatedImprovement: 80,
				implementation: "Auto-enable ANN with optimized index size",
			});
		}

		// Virtual scrolling for large result sets
		if (
			this.metrics.totalPhotos > 5000 &&
			!this.settings.virtualScrollingEnabled
		) {
			recommendations.push({
				type: "virtual-scrolling",
				priority: "high",
				impact: "UI rendering performance",
				description: "Enable virtual scrolling for large photo grids",
				estimatedImprovement: 60,
				implementation: "Replace standard grid with virtualized components",
			});
		}

		// Caching improvements for slow searches
		if (
			this.metrics.searchPerformance.slowSearches >
			this.metrics.searchPerformance.totalSearches * 0.1
		) {
			recommendations.push({
				type: "caching",
				priority: "high",
				impact: "Search response times",
				description: `${this.metrics.searchPerformance.slowSearches} slow searches detected. Increase cache size.`,
				estimatedImprovement: 70,
				implementation:
					"Expand search cache and implement smarter caching strategies",
			});
		}

		// Batch size optimization
		if (
			this.metrics.searchPerformance.averageSearchTime > 500 &&
			this.settings.batchSize < 100
		) {
			recommendations.push({
				type: "batching",
				priority: "medium",
				impact: "Memory usage and search throughput",
				description: "Optimize batch processing for better throughput",
				estimatedImprovement: 40,
				implementation: "Adjust batch sizes based on library size",
			});
		}

		// Lazy loading for memory optimization
		if (
			this.metrics.memoryUsage.currentUsage > this.thresholds.memoryUsage &&
			!this.settings.lazyLoadingEnabled
		) {
			recommendations.push({
				type: "lazy-loading",
				priority: "high",
				impact: "Memory usage",
				description: `High memory usage (${this.metrics.memoryUsage.currentUsage.toFixed(0)}MB). Enable lazy loading.`,
				estimatedImprovement: 50,
				implementation: "Load photos and metadata on demand",
			});
		}

		// Compression for large libraries
		if (this.metrics.librarySize > 10000 && !this.settings.compressionEnabled) {
			// 10GB
			recommendations.push({
				type: "compression",
				priority: "medium",
				impact: "Storage and memory efficiency",
				description: "Enable compression for thumbnails and metadata",
				estimatedImprovement: 30,
				implementation: "Compress cached images and optimize metadata storage",
			});
		}

		// Progressive loading for better UX
		if (
			this.metrics.searchPerformance.averageSearchTime > 1000 &&
			!this.settings.progressiveLoadingEnabled
		) {
			recommendations.push({
				type: "lazy-loading",
				priority: "medium",
				impact: "User experience",
				description: "Enable progressive loading for search results",
				estimatedImprovement: 45,
				implementation: "Show results as they become available",
			});
		}

		// Background indexing for large libraries
		if (this.metrics.totalPhotos > 20000 && !this.settings.backgroundIndexing) {
			recommendations.push({
				type: "ann",
				priority: "low",
				impact: "Indexing performance",
				description: "Enable background indexing for large libraries",
				estimatedImprovement: 25,
				implementation: "Index photos in background processes",
			});
		}

		return recommendations.sort((a, b) => {
			const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
			return priorityOrder[a.priority] - priorityOrder[b.priority];
		});
	}

	/**
	 * Check if performance optimization is needed
	 */
	private shouldOptimizeForPerformance(): boolean {
		if (!this.metrics) return false;

		return (
			this.metrics.searchPerformance.averageSearchTime >
				this.thresholds.searchTime ||
			this.metrics.searchPerformance.slowSearches >
				this.metrics.searchPerformance.totalSearches * 0.05
		);
	}

	/**
	 * Check if memory optimization is needed
	 */
	private shouldOptimizeForMemory(): boolean {
		if (!this.metrics) return false;

		return this.metrics.memoryUsage.currentUsage > this.thresholds.memoryUsage;
	}

	/**
	 * Trigger automatic optimization
	 */
	private async triggerOptimization(): Promise<void> {
		if (this.isOptimizing) return;

		this.isOptimizing = true;

		try {
			const recommendations = this.generateRecommendations();
			const criticalRecommendations = recommendations.filter(
				(r) => r.priority === "critical",
			);

			// Auto-apply critical optimizations
			for (const recommendation of criticalRecommendations) {
				await this.applyOptimization(recommendation);
			}

			// Notify observers of all recommendations
			this.notifyObservers(recommendations);
		} finally {
			this.isOptimizing = false;
		}
	}

	/**
	 * Apply a specific optimization
	 */
	private async applyOptimization(
		recommendation: OptimizationRecommendation,
	): Promise<void> {
		console.log(
			`Applying optimization: ${recommendation.type} - ${recommendation.description}`,
		);

		switch (recommendation.type) {
			case "ann":
				await this.enableANN();
				break;
			case "virtual-scrolling":
				this.settings.virtualScrollingEnabled = true;
				break;
			case "caching":
				await this.optimizeCaching();
				break;
			case "batching":
				this.settings.batchSize = Math.min(this.settings.batchSize * 2, 200);
				break;
			case "compression":
				this.settings.compressionEnabled = true;
				break;
			case "lazy-loading":
				this.settings.lazyLoadingEnabled = true;
				break;
		}

		// Save settings to localStorage
		this.saveSettings();
	}

	/**
	 * Enable ANN indexing for large libraries
	 */
	private async enableANN(): Promise<void> {
		if (!this.metrics) return;

		// Calculate optimal ANN index size based on library size
		const optimalIndexSize = Math.min(
			Math.max(Math.floor(this.metrics.totalPhotos * 0.1), 1000),
			10000,
		);

		this.settings.annEnabled = true;
		this.settings.annIndexSize = optimalIndexSize;
		this.settings.backgroundIndexing = this.metrics.totalPhotos > 20000;

		console.log(`ANN enabled with index size: ${optimalIndexSize}`);

		// In a real implementation, this would trigger the ANN indexing process
		// For now, we'll just simulate it
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	/**
	 * Optimize caching strategies
	 */
	private async optimizeCaching(): Promise<void> {
		if (!this.metrics) return;

		// Increase cache size based on library size
		const optimalCacheSize = Math.min(
			Math.max(Math.floor(this.metrics.totalPhotos * 0.05), 200),
			1000,
		);

		this.settings.cacheSize = optimalCacheSize;

		console.log(`Cache optimized with size: ${optimalCacheSize}`);

		// Clear existing cache to force re-indexing with new settings
		if (typeof window !== "undefined" && "caches" in window) {
			try {
				const cacheNames = await caches.keys();
				await Promise.all(cacheNames.map((name) => caches.delete(name)));
			} catch (error) {
				console.warn("Failed to clear caches:", error);
			}
		}
	}

	/**
	 * Subscribe to optimization notifications
	 */
	public subscribe(
		callback: (
			metrics: LibraryMetrics,
			recommendations: OptimizationRecommendation[],
		) => void,
	): () => void {
		this.observers.add(callback);
		return () => this.observers.delete(callback);
	}

	/**
	 * Notify all observers of new recommendations
	 */
	private notifyObservers(recommendations: OptimizationRecommendation[]): void {
		if (!this.metrics) return;

		this.observers.forEach((callback) => {
			try {
				callback(this.metrics, recommendations);
			} catch (error) {
				console.error("Error in optimization observer:", error);
			}
		});
	}

	/**
	 * Get current optimization settings
	 */
	public getSettings(): OptimizationSettings {
		return { ...this.settings };
	}

	/**
	 * Get current metrics
	 */
	public getMetrics(): LibraryMetrics | null {
		return this.metrics ? { ...this.metrics } : null;
	}

	/**
	 * Get optimization thresholds
	 */
	public getThresholds(): OptimizationThresholds {
		return { ...this.thresholds };
	}

	/**
	 * Update optimization thresholds
	 */
	public updateThresholds(
		newThresholds: Partial<OptimizationThresholds>,
	): void {
		this.thresholds = { ...this.thresholds, ...newThresholds };
		this.saveSettings();
	}

	/**
	 * Manually apply optimization
	 */
	public async applyOptimizationManually(
		recommendation: OptimizationRecommendation,
	): Promise<void> {
		await this.applyOptimization(recommendation);
	}

	/**
	 * Check if library is considered "large"
	 */
	public isLargeLibrary(): boolean {
		if (!this.metrics) return false;

		return (
			this.metrics.totalPhotos > this.thresholds.photoCount ||
			this.metrics.librarySize > this.thresholds.librarySize
		);
	}

	/**
	 * Get optimization status
	 */
	public getOptimizationStatus(): {
		isOptimized: boolean;
		optimizationsApplied: string[];
		pendingOptimizations: OptimizationRecommendation[];
		performanceScore: number;
	} {
		if (!this.metrics) {
			return {
				isOptimized: false,
				optimizationsApplied: [],
				pendingOptimizations: [],
				performanceScore: 0,
			};
		}

		const recommendations = this.generateRecommendations();
		const appliedOptimizations: string[] = [];

		if (this.settings.annEnabled) appliedOptimizations.push("ANN Indexing");
		if (this.settings.virtualScrollingEnabled)
			appliedOptimizations.push("Virtual Scrolling");
		if (this.settings.compressionEnabled)
			appliedOptimizations.push("Compression");
		if (this.settings.backgroundIndexing)
			appliedOptimizations.push("Background Indexing");
		if (this.settings.lazyLoadingEnabled)
			appliedOptimizations.push("Lazy Loading");

		// Calculate performance score (0-100)
		const criticalCount = recommendations.filter(
			(r) => r.priority === "critical",
		).length;
		const highCount = recommendations.filter(
			(r) => r.priority === "high",
		).length;
		const performanceScore = Math.max(
			0,
			100 - criticalCount * 30 - highCount * 15,
		);

		return {
			isOptimized: recommendations.length === 0,
			optimizationsApplied: appliedOptimizations,
			pendingOptimizations: recommendations,
			performanceScore,
		};
	}

	/**
	 * Save settings to localStorage
	 */
	private saveSettings(): void {
		if (typeof window !== "undefined") {
			try {
				localStorage.setItem(
					"largeLibraryOptimizer",
					JSON.stringify({
						settings: this.settings,
						thresholds: this.thresholds,
					}),
				);
			} catch (error) {
				console.warn("Failed to save optimizer settings:", error);
			}
		}
	}

	/**
	 * Load settings from localStorage
	 */
	public loadSettings(): void {
		if (typeof window !== "undefined") {
			try {
				const saved = localStorage.getItem("largeLibraryOptimizer");
				if (saved) {
					const parsed = JSON.parse(saved);
					this.settings = { ...this.settings, ...parsed.settings };
					this.thresholds = { ...this.thresholds, ...parsed.thresholds };
				}
			} catch (error) {
				console.warn("Failed to load optimizer settings:", error);
			}
		}
	}

	/**
	 * Reset all settings to defaults
	 */
	public resetSettings(): void {
		this.settings = this.getDefaultSettings();
		this.thresholds = this.getDefaultThresholds();
		this.saveSettings();
	}
}

// Export singleton instance
export const largeLibraryOptimizer = LargeLibraryOptimizer.getInstance();

// Export types for use in components
export type {
	LibraryMetrics,
	OptimizationSettings,
	OptimizationThresholds,
	OptimizationRecommendation,
};
