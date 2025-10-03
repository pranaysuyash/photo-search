/**
 * Enhanced Map Clustering Hook
 *
 * Provides intelligent clustering that combines server-side and client-side approaches
 * with performance optimization, caching, and progressive loading capabilities.
 */

import type L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	apiClusterPhotos,
	apiMapClusters,
	type MapCluster,
	type MapPoint,
} from "../api";
import {
	type ClusteringConfig,
	type EnhancedCluster,
	mapClusteringService,
} from "../services/MapClusteringService";

interface UseMapClusteringOptions {
	dir: string;
	engine: string;
	enableServerClustering?: boolean;
	enableClientClustering?: boolean;
	clusteringConfig?: Partial<ClusteringConfig>;
	performanceMode?: "speed" | "quality" | "balanced";
	enableProgressiveLoading?: boolean;
	cacheTimeout?: number;
}

interface MapClusteringState {
	clusters: EnhancedCluster[];
	points: MapPoint[];
	loading: boolean;
	error: string | null;
	total: number;
	source: "server" | "client" | "hybrid";
	performance: {
		clusteringTime: number;
		cacheHitRate: number;
		memoryUsage: number;
		pointCount: number;
		clusterCount: number;
	};
}

interface ClusterPhotosState {
	photos: Map<string, any[]>;
	loading: Set<string>;
	error: Map<string, string>;
}

export function useMapClustering({
	dir,
	engine,
	enableServerClustering = true,
	enableClientClustering = true,
	clusteringConfig = {},
	performanceMode = "balanced",
	enableProgressiveLoading = true,
	cacheTimeout = 30000,
}: UseMapClusteringOptions) {
	const [state, setState] = useState<MapClusteringState>({
		clusters: [],
		points: [],
		loading: true,
		error: null,
		total: 0,
		source: "hybrid",
		performance: {
			clusteringTime: 0,
			cacheHitRate: 0,
			memoryUsage: 0,
			pointCount: 0,
			clusterCount: 0,
		},
	});

	const [clusterPhotos, setClusterPhotos] = useState<ClusterPhotosState>({
		photos: new Map(),
		loading: new Set(),
		error: new Map(),
	});

	const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(
		new Map(),
	);
	const abortControllerRef = useRef<AbortController | null>(null);
	const loadingRef = useRef<Set<string>>(new Set());

	// Configure clustering service based on performance mode
	useEffect(() => {
		const config: Partial<ClusteringConfig> = {
			...clusteringConfig,
			...getPerformanceConfig(performanceMode),
		};

		mapClusteringService.updateConfig(config);
	}, [clusteringConfig, performanceMode]);

	// Main clustering function
	const loadClusters = useCallback(
		async (bounds?: L.LatLngBounds, zoom?: number, forceRefresh = false) => {
			// Cancel any ongoing requests
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			abortControllerRef.current = new AbortController();
			const startTime = performance.now();

			setState((prev) => ({ ...prev, loading: true, error: null }));

			try {
				const cacheKey = generateCacheKey(bounds, zoom, dir);

				// Check cache first
				if (!forceRefresh) {
					const cached = cacheRef.current.get(cacheKey);
					if (cached && Date.now() - cached.timestamp < cacheTimeout) {
						setState((prev) => ({
							...prev,
							...cached.data,
							loading: false,
							source: "cache",
						}));
						return;
					}
				}

				// Decide clustering strategy
				const strategy = await determineClusteringStrategy(bounds, zoom);
				setState((prev) => ({ ...prev, source: strategy }));

				let result;

				switch (strategy) {
					case "server":
						result = await loadServerSideClusters(bounds, zoom);
						break;
					case "client":
						result = await loadClientSideClusters(bounds, zoom);
						break;
					case "hybrid":
						result = await loadHybridClusters(bounds, zoom);
						break;
					default:
						throw new Error("Unknown clustering strategy");
				}

				// Update cache
				cacheRef.current.set(cacheKey, {
					data: result,
					timestamp: Date.now(),
				});

				// Clean old cache entries
				cleanCache();

				setState((prev) => ({
					...prev,
					...result,
					loading: false,
					performance: {
						...prev.performance,
						clusteringTime: performance.now() - startTime,
						cacheHitRate: calculateCacheHitRate(),
					},
				}));
			} catch (error) {
				if (error.name !== "AbortError") {
					setState((prev) => ({
						...prev,
						loading: false,
						error:
							error instanceof Error
								? error.message
								: "Failed to load clusters",
					}));
				}
			}
		},
		[dir, enableServerClustering, enableClientClustering, cacheTimeout],
	);

	// Server-side clustering
	const loadServerSideClusters = async (
		bounds?: L.LatLngBounds,
		zoom?: number,
	) => {
		const boundsParams = bounds
			? {
					ne_lat: bounds.getNorthEast().lat,
					ne_lon: bounds.getNorthEast().lng,
					sw_lat: bounds.getSouthWest().lat,
					sw_lon: bounds.getSouthWest().lng,
				}
			: undefined;

		const data = await apiMapClusters(dir, {
			zoom,
			bounds: boundsParams,
			clusterSize: zoom && zoom < 10 ? 0.05 : 0.01,
			minPhotos: 1,
		});

		// Convert to enhanced clusters
		const enhancedClusters = data.clusters.map(enhanceCluster);

		return {
			clusters: enhancedClusters,
			points: data.points,
			total: data.total,
		};
	};

	// Client-side clustering
	const loadClientSideClusters = async (
		bounds?: L.LatLngBounds,
		zoom?: number,
	) => {
		// First, get raw points (this might need a different API endpoint)
		const rawPoints = await loadRawPoints(bounds);

		// Use clustering service
		const result = await mapClusteringService.clusterPoints(
			rawPoints,
			bounds
				? {
						north: bounds.getNorthEast().lat,
						south: bounds.getSouthWest().lat,
						east: bounds.getNorthEast().lng,
						west: bounds.getSouthWest().lng,
					}
				: undefined,
			zoom,
		);

		return {
			clusters: result.clusters,
			points: result.unclustered,
			total: rawPoints.length,
		};
	};

	// Hybrid clustering (use server for large areas, client for detailed views)
	const loadHybridClusters = async (bounds?: L.LatLngBounds, zoom?: number) => {
		// Use server clustering for large areas/low zoom
		if (!zoom || zoom < 12) {
			return await loadServerSideClusters(bounds, zoom);
		}

		// Use client clustering for detailed views
		try {
			// Try server first with smaller cluster size
			const serverResult = await apiMapClusters(dir, {
				zoom,
				bounds: bounds
					? {
							ne_lat: bounds.getNorthEast().lat,
							ne_lon: bounds.getNorthEast().lng,
							sw_lat: bounds.getSouthWest().lat,
							sw_lon: bounds.getSouthWest().lng,
						}
					: undefined,
				clusterSize: 0.005, // Smaller clusters for hybrid mode
				minPhotos: 2,
			});

			// If server returns too many individual points, fall back to client clustering
			if (serverResult.points.length > 500) {
				const allPoints = [
					...serverResult.clusters.flatMap((c) =>
						Array.from({ length: c.photoCount }, (_, i) => ({
							lat: c.lat + (Math.random() - 0.5) * c.radius * 0.01,
							lon: c.lon + (Math.random() - 0.5) * c.radius * 0.01,
							path: `cluster-${c.id}-${i}`,
							place: c.place,
						})),
					),
					...serverResult.points,
				];

				const clientResult = await mapClusteringService.clusterPoints(
					allPoints,
					bounds,
					zoom,
				);

				return {
					clusters: clientResult.clusters,
					points: clientResult.unclustered,
					total: allPoints.length,
				};
			}

			return {
				clusters: serverResult.clusters.map(enhanceCluster),
				points: serverResult.points,
				total: serverResult.total,
			};
		} catch (error) {
			// Fallback to client-side only
			console.warn(
				"Server clustering failed, falling back to client-side:",
				error,
			);
			return await loadClientSideClusters(bounds, zoom);
		}
	};

	// Load raw points for client-side clustering
	const loadRawPoints = async (
		bounds?: L.LatLngBounds,
	): Promise<MapPoint[]> => {
		// This would need to be implemented based on your API
		// For now, return empty array as placeholder
		console.warn(
			"loadRawPoints needs to be implemented with appropriate API endpoint",
		);
		return [];
	};

	// Determine best clustering strategy
	const determineClusteringStrategy = async (
		bounds?: L.LatLngBounds,
		zoom?: number,
	): Promise<"server" | "client" | "hybrid"> => {
		if (!enableServerClustering && !enableClientClustering) {
			throw new Error("No clustering method enabled");
		}

		if (!enableServerClustering) return "client";
		if (!enableClientClustering) return "server";

		// Estimate area size
		const area = bounds
			? (bounds.getNorthEast().lat - bounds.getSouthWest().lat) *
				(bounds.getNorthEast().lng - bounds.getSouthWest().lng)
			: Infinity;

		// Decision logic
		if (area > 10 || (zoom !== undefined && zoom < 10)) {
			return "server"; // Large area or low zoom = server clustering
		} else if (area < 0.1 && zoom !== undefined && zoom > 14) {
			return "client"; // Small area at high zoom = client clustering
		} else {
			return "hybrid"; // Medium area = hybrid approach
		}
	};

	// Load cluster photos with progressive loading
	const loadClusterPhotos = useCallback(
		async (
			clusterId: string,
			options: { limit?: number; offset?: number } = {},
		) => {
			if (clusterPhotos.photos.has(clusterId)) {
				return clusterPhotos.photos.get(clusterId)!;
			}

			if (clusterPhotos.loading.has(clusterId)) {
				return []; // Already loading
			}

			setClusterPhotos((prev) => ({
				...prev,
				loading: new Set([...prev.loading, clusterId]),
				error: new Map([...prev.error].filter(([k]) => k !== clusterId)),
			}));

			try {
				const data = await apiClusterPhotos(dir, clusterId, {
					limit: options.limit || (enableProgressiveLoading ? 9 : 50),
					offset: options.offset || 0,
				});

				setClusterPhotos((prev) => {
					const newPhotos = new Map(prev.photos);
					const existing = newPhotos.get(clusterId) || [];
					newPhotos.set(clusterId, [...existing, ...data.photos]);

					return {
						...prev,
						photos: newPhotos,
						loading: new Set(
							[...prev.loading].filter((id) => id !== clusterId),
						),
					};
				});

				return data.photos;
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to load cluster photos";

				setClusterPhotos((prev) => ({
					...prev,
					loading: new Set([...prev.loading].filter((id) => id !== clusterId)),
					error: new Map([...prev.error, [clusterId, errorMessage]]),
				}));

				throw error;
			}
		},
		[
			dir,
			enableProgressiveLoading,
			clusterPhotos.photos,
			clusterPhotos.loading,
			clusterPhotos.error,
		],
	);

	// Utility functions
	const generateCacheKey = (
		bounds?: L.LatLngBounds,
		zoom?: number,
		directory?: string,
	): string => {
		const boundsStr = bounds
			? `${bounds.getNorthEast().lat.toFixed(4)},${bounds.getNorthEast().lng.toFixed(4)},${bounds.getSouthWest().lat.toFixed(4)},${bounds.getSouthWest().lng.toFixed(4)}`
			: "global";
		return `${directory}:${boundsStr}:${zoom || "auto"}`;
	};

	const cleanCache = () => {
		const now = Date.now();
		for (const [key, value] of cacheRef.current.entries()) {
			if (now - value.timestamp > cacheTimeout * 2) {
				cacheRef.current.delete(key);
			}
		}
	};

	const calculateCacheHitRate = (): number => {
		const metrics = mapClusteringService.getMetrics();
		const total = metrics.cacheHits + metrics.cacheMisses;
		return total > 0 ? metrics.cacheHits / total : 0;
	};

	const getPerformanceConfig = (mode: string): Partial<ClusteringConfig> => {
		switch (mode) {
			case "speed":
				return {
					clusterSize: 0.02,
					minClusterSize: 3,
					maxClusterZoom: 12,
					cacheSize: 100,
				};
			case "quality":
				return {
					clusterSize: 0.005,
					minClusterSize: 1,
					maxClusterZoom: 16,
					cacheSize: 30,
				};
			default: // balanced
				return {
					clusterSize: 0.01,
					minClusterSize: 2,
					maxClusterZoom: 14,
					cacheSize: 50,
				};
		}
	};

	const enhanceCluster = (cluster: MapCluster): EnhancedCluster => ({
		...cluster,
		bounds: {
			north: cluster.lat + cluster.radius,
			south: cluster.lat - cluster.radius,
			east: cluster.lon + cluster.radius,
			west: cluster.lon - cluster.radius,
		},
		density: cluster.photoCount / (Math.PI * cluster.radius * cluster.radius),
		photoTypes: {
			images: cluster.photoCount, // Placeholder - would need actual data
			videos: 0,
			others: 0,
		},
	});

	// Initialize load
	useEffect(() => {
		loadClusters();
	}, [loadClusters]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, []);

	return {
		// State
		clusters: state.clusters,
		points: state.points,
		loading: state.loading,
		error: state.error,
		total: state.total,
		source: state.source,
		performance: state.performance,

		// Cluster photos
		clusterPhotos: clusterPhotos.photos,
		loadingCluster: (clusterId: string) => clusterPhotos.loading.has(clusterId),
		clusterError: (clusterId: string) => clusterPhotos.error.get(clusterId),

		// Actions
		loadClusters,
		loadClusterPhotos,
		refreshClusters: () => loadClusters(undefined, undefined, true),

		// Utilities
		clearCache: () => {
			cacheRef.current.clear();
			mapClusteringService.clearCache();
		},
		getMetrics: () => ({
			...mapClusteringService.getMetrics(),
			cacheSize: cacheRef.current.size,
		}),
	};
}

// Export types for external use
export type { UseMapClusteringOptions, MapClusteringState };
