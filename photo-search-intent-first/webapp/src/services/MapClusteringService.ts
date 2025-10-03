/**
 * Enhanced Map Clustering Service
 *
 * Provides client-side clustering capabilities as a fallback to server-side clustering,
 * with advanced features for performance optimization and large dataset handling.
 */

import type { MapCluster, MapPoint } from "../api";

// Configuration for clustering behavior
export interface ClusteringConfig {
	enabled: boolean;
	clusterSize: number; // Cluster radius in degrees
	minClusterSize: number; // Minimum photos to form a cluster
	maxClusterZoom: number; // Maximum zoom level to show clusters
	animationDuration: number; // Animation duration in ms
	cacheSize: number; // Maximum number of cached cluster results
	progressiveLoading: boolean; // Enable progressive cluster loading
	virtualizationThreshold: number; // Number of items to trigger virtualization
}

// Cluster with enhanced properties
export interface EnhancedCluster extends MapCluster {
	bounds: {
		north: number;
		south: number;
		east: number;
		west: number;
	};
	density: number; // Photos per square degree
	avgTimestamp?: number; // Average timestamp of photos in cluster
	photoTypes: {
		images: number;
		videos: number;
		others: number;
	};
}

// Performance metrics
export interface ClusteringMetrics {
	totalPoints: number;
	totalClusters: number;
	clusteringTime: number;
	memoryUsage: number;
	cacheHits: number;
	cacheMisses: number;
}

export class MapClusteringService {
	private config: ClusteringConfig;
	private cache: Map<
		string,
		{ clusters: EnhancedCluster[]; points: MapPoint[]; timestamp: number }
	> = new Map();
	private metrics: ClusteringMetrics = {
		totalPoints: 0,
		totalClusters: 0,
		clusteringTime: 0,
		memoryUsage: 0,
		cacheHits: 0,
		cacheMisses: 0,
	};

	constructor(config: Partial<ClusteringConfig> = {}) {
		this.config = {
			enabled: true,
			clusterSize: 0.01,
			minClusterSize: 2,
			maxClusterZoom: 14,
			animationDuration: 300,
			cacheSize: 50,
			progressiveLoading: true,
			virtualizationThreshold: 1000,
			...config,
		};
	}

	/**
	 * Cluster points using client-side algorithm (fallback)
	 */
	async clusterPoints(
		points: MapPoint[],
		bounds?: { north: number; south: number; east: number; west: number },
		zoom?: number,
	): Promise<{
		clusters: EnhancedCluster[];
		unclustered: MapPoint[];
		metrics: ClusteringMetrics;
	}> {
		const startTime = performance.now();

		// Filter points within bounds if provided
		const filteredPoints = bounds
			? points.filter(
					(point) =>
						point.lat >= bounds.south &&
						point.lat <= bounds.north &&
						point.lon >= bounds.west &&
						point.lon <= bounds.east,
				)
			: points;

		// Check cache first
		const cacheKey = this.getCacheKey(filteredPoints, bounds, zoom);
		if (this.cache.has(cacheKey)) {
			const cached = this.cache.get(cacheKey)!;
			if (Date.now() - cached.timestamp < 30000) {
				// 30 seconds cache TTL
				this.metrics.cacheHits++;
				return {
					clusters: cached.clusters,
					unclustered: cached.points,
					metrics: this.metrics,
				};
			}
		}

		this.metrics.cacheMisses++;

		// Determine if clustering should be used based on zoom and point count
		const shouldCluster =
			this.config.enabled &&
			(zoom === undefined || zoom <= this.config.maxClusterZoom) &&
			filteredPoints.length >= this.config.minClusterSize;

		if (!shouldCluster) {
			const result = {
				clusters: [] as EnhancedCluster[],
				unclustered: filteredPoints,
				metrics: this.updateMetrics(
					filteredPoints.length,
					0,
					performance.now() - startTime,
				),
			};
			this.cacheResult(cacheKey, result.clusters, result.unclustered);
			return result;
		}

		// Perform clustering
		const { clusters, unclustered } = this.performClustering(
			filteredPoints,
			zoom,
		);

		// Update metrics
		const clusteringTime = performance.now() - startTime;
		const result = {
			clusters,
			unclustered,
			metrics: this.updateMetrics(
				filteredPoints.length,
				clusters.length,
				clusteringTime,
			),
		};

		// Cache result
		this.cacheResult(cacheKey, result.clusters, result.unclustered);

		return result;
	}

	/**
	 * Perform the actual clustering using a grid-based approach
	 */
	private performClustering(
		points: MapPoint[],
		zoom?: number,
	): { clusters: EnhancedCluster[]; unclustered: MapPoint[] } {
		// Dynamic cluster size based on zoom
		const clusterSize =
			this.config.clusterSize * (zoom ? Math.max(1, 15 - zoom) : 1);

		// Create spatial grid
		const grid = new Map<string, MapPoint[]>();

		points.forEach((point) => {
			const gridKey = this.getGridKey(point, clusterSize);
			if (!grid.has(gridKey)) {
				grid.set(gridKey, []);
			}
			grid.get(gridKey)!.push(point);
		});

		const clusters: EnhancedCluster[] = [];
		const unclustered: MapPoint[] = [];

		// Process each grid cell
		grid.forEach((cellPoints, gridKey) => {
			if (cellPoints.length >= this.config.minClusterSize) {
				const cluster = this.createCluster(cellPoints, gridKey);
				clusters.push(cluster);
			} else {
				unclustered.push(...cellPoints);
			}
		});

		return { clusters, unclustered };
	}

	/**
	 * Create a cluster from a set of points
	 */
	private createCluster(points: MapPoint[], gridKey: string): EnhancedCluster {
		// Calculate cluster center (weighted average)
		const totalWeight = points.reduce((sum, point) => sum + 1, 0);
		const centerLat =
			points.reduce((sum, point) => sum + point.lat, 0) / points.length;
		const centerLon =
			points.reduce((sum, point) => sum + point.lon, 0) / points.length;

		// Calculate cluster bounds
		const lats = points.map((p) => p.lat);
		const lons = points.map((p) => p.lon);
		const bounds = {
			north: Math.max(...lats),
			south: Math.min(...lats),
			east: Math.max(...lons),
			west: Math.min(...lons),
		};

		// Calculate cluster area and density
		const area = (bounds.north - bounds.south) * (bounds.east - bounds.west);
		const density = area > 0 ? points.length / area : points.length;

		// Analyze photo types (simplified)
		const photoTypes = {
			images: points.filter((p) => !p.path?.match(/\.(mp4|mov|avi|webm|mkv)$/i))
				.length,
			videos: points.filter((p) => p.path?.match(/\.(mp4|mov|avi|webm|mkv)$/i))
				.length,
			others: 0,
		};

		// Generate cluster ID
		const clusterId = `cluster_${gridKey.replace(/[:.,]/g, "_")}_${Date.now()}`;

		// Calculate average timestamp (if available)
		const timestamps = points
			.map((p) => p.date)
			.filter((date): date is number => date !== undefined);
		const avgTimestamp =
			timestamps.length > 0
				? timestamps.reduce((sum, ts) => sum + ts, 0) / timestamps.length
				: undefined;

		return {
			id: clusterId,
			lat: centerLat,
			lon: centerLon,
			photoCount: points.length,
			radius:
				Math.max(bounds.north - bounds.south, bounds.east - bounds.west) / 2,
			place: this.inferPlaceName(points),
			bounds,
			density,
			avgTimestamp,
			photoTypes,
		};
	}

	/**
	 * Infer a place name from clustered points
	 */
	private inferPlaceName(points: MapPoint[]): string | undefined {
		// Use the most common place name or the first available
		const places = points
			.map((p) => p.place)
			.filter(
				(place): place is string => place !== undefined && place.trim() !== "",
			);

		if (places.length === 0) return undefined;

		// Simple frequency analysis
		const placeCounts = new Map<string, number>();
		places.forEach((place) => {
			placeCounts.set(place, (placeCounts.get(place) || 0) + 1);
		});

		// Return the most common place
		let mostCommonPlace = "";
		let maxCount = 0;
		placeCounts.forEach((count, place) => {
			if (count > maxCount) {
				maxCount = count;
				mostCommonPlace = place;
			}
		});

		return mostCommonPlace;
	}

	/**
	 * Generate cache key for given parameters
	 */
	private getCacheKey(
		points: MapPoint[],
		bounds?: { north: number; south: number; east: number; west: number },
		zoom?: number,
	): string {
		const boundsKey = bounds
			? `${bounds.north.toFixed(4)},${bounds.south.toFixed(4)},${bounds.east.toFixed(4)},${bounds.west.toFixed(4)}`
			: "global";
		const zoomKey = zoom?.toString() || "auto";
		const pointsHash =
			points.length > 1000
				? `${points.length}_${points[0].lat.toFixed(2)}_${points[0].lon.toFixed(2)}`
				: points.length.toString();

		return `${boundsKey}_${zoomKey}_${pointsHash}`;
	}

	/**
	 * Get grid key for clustering
	 */
	private getGridKey(point: MapPoint, clusterSize: number): string {
		const latGrid = Math.floor(point.lat / clusterSize);
		const lonGrid = Math.floor(point.lon / clusterSize);
		return `${latGrid}:${lonGrid}`;
	}

	/**
	 * Cache clustering result
	 */
	private cacheResult(
		key: string,
		clusters: EnhancedCluster[],
		unclustered: MapPoint[],
	): void {
		// Remove oldest entries if cache is full
		if (this.cache.size >= this.config.cacheSize) {
			const oldestKey = this.cache.keys().next().value;
			this.cache.delete(oldestKey);
		}

		this.cache.set(key, {
			clusters,
			points: unclustered,
			timestamp: Date.now(),
		});
	}

	/**
	 * Update performance metrics
	 */
	private updateMetrics(
		totalPoints: number,
		totalClusters: number,
		clusteringTime: number,
	): ClusteringMetrics {
		this.metrics.totalPoints = totalPoints;
		this.metrics.totalClusters = totalClusters;
		this.metrics.clusteringTime = clusteringTime;

		// Estimate memory usage (rough approximation)
		this.metrics.memoryUsage =
			totalPoints * 200 + // ~200 bytes per point
			totalClusters * 500 + // ~500 bytes per cluster
			this.cache.size * 1000; // ~1KB per cache entry

		return { ...this.metrics };
	}

	/**
	 * Clear cache and reset metrics
	 */
	clearCache(): void {
		this.cache.clear();
		this.metrics = {
			totalPoints: 0,
			totalClusters: 0,
			clusteringTime: 0,
			memoryUsage: 0,
			cacheHits: 0,
			cacheMisses: 0,
		};
	}

	/**
	 * Get current metrics
	 */
	getMetrics(): ClusteringMetrics {
		return { ...this.metrics };
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<ClusteringConfig>): void {
		this.config = { ...this.config, ...newConfig };
		this.clearCache(); // Clear cache when config changes
	}

	/**
	 * Get current configuration
	 */
	getConfig(): ClusteringConfig {
		return { ...this.config };
	}

	/**
	 * Estimate cluster performance for given dataset
	 */
	estimatePerformance(
		pointCount: number,
		zoom?: number,
	): {
		estimatedTime: number;
		estimatedClusters: number;
		recommendation: string;
	} {
		// Simple heuristic based on point count and zoom level
		const baseTime = pointCount * 0.1; // 0.1ms per point base
		const zoomFactor = zoom ? Math.max(0.1, 1 - zoom / 20) : 1; // Less clustering at high zoom
		const estimatedTime = baseTime * zoomFactor;

		const clusterSize =
			this.config.clusterSize * (zoom ? Math.max(1, 15 - zoom) : 1);
		const estimatedClusters = Math.floor(
			pointCount / Math.max(this.config.minClusterSize, clusterSize * 100),
		);

		let recommendation = "Client-side clustering recommended";
		if (pointCount > 10000) {
			recommendation = "Server-side clustering recommended for large datasets";
		} else if (estimatedTime > 100) {
			recommendation =
				"Consider increasing cluster size or using server-side clustering";
		} else if (pointCount < 100) {
			recommendation = "Clustering not necessary for small datasets";
		}

		return {
			estimatedTime,
			estimatedClusters,
			recommendation,
		};
	}
}

// Global singleton instance
export const mapClusteringService = new MapClusteringService();
