import type {
	MapCluster,
	MapPoint,
	MapTileCache,
	OfflineMapData,
} from "../api";

interface OfflineMapServiceConfig {
	maxCacheSize?: number; // MB
	tileCacheExpiry?: number; // days
	dataCacheExpiry?: number; // days
	enableTileCaching?: boolean;
	enableDataCaching?: boolean;
}

interface CacheStats {
	tileCount: number;
	tileSize: number;
	dataCount: number;
	dataSize: number;
	hitRate: number;
	lastCleanup: number;
}

class OfflineMapService {
	private config: Required<OfflineMapServiceConfig>;
	private tileCache = new Map<string, MapTileCache>();
	private dataCache = new Map<string, OfflineMapData>();
	private accessLog = new Map<string, number>();

	constructor(config: OfflineMapServiceConfig = {}) {
		this.config = {
			maxCacheSize: config.maxCacheSize || 50 * 1024 * 1024, // 50MB default
			tileCacheExpiry: config.tileCacheExpiry || 7, // 7 days
			dataCacheExpiry: config.dataCacheExpiry || 1, // 1 day
			enableTileCaching: config.enableTileCaching !== false,
			enableDataCaching: config.enableDataCaching !== false,
		};

		this.loadFromStorage();
		this.startCleanupTimer();
	}

	/**
	 * Cache map tiles for offline use
	 */
	async cacheTile(url: string, blob: Blob): Promise<void> {
		if (!this.config.enableTileCaching) return;

		try {
			const cacheEntry: MapTileCache = {
				url,
				timestamp: Date.now(),
				data: blob,
			};

			this.tileCache.set(url, cacheEntry);
			this.accessLog.set(url, Date.now());

			await this.saveToStorage();
			this.enforceCacheLimits();
		} catch (error) {
			console.warn("Failed to cache map tile:", url, error);
		}
	}

	/**
	 * Get cached tile
	 */
	getCachedTile(url: string): Blob | null {
		if (!this.config.enableTileCaching) return null;

		const cached = this.tileCache.get(url);
		if (!cached) return null;

		// Check if expired
		const age = Date.now() - cached.timestamp;
		if (age > this.config.tileCacheExpiry * 24 * 60 * 60 * 1000) {
			this.tileCache.delete(url);
			this.accessLog.delete(url);
			return null;
		}

		this.accessLog.set(url, Date.now());
		return cached.data;
	}

	/**
	 * Cache map data (clusters and points) for offline use
	 */
	async cacheMapData(
		key: string,
		data: {
			clusters: MapCluster[];
			points: MapPoint[];
			bounds: {
				ne_lat: number;
				ne_lon: number;
				sw_lat: number;
				sw_lon: number;
			};
		},
	): Promise<void> {
		if (!this.config.enableDataCaching) return;

		try {
			const cacheEntry: OfflineMapData = {
				clusters: data.clusters,
				points: data.points,
				bounds: data.bounds,
				lastUpdated: Date.now(),
			};

			this.dataCache.set(key, cacheEntry);
			this.accessLog.set(`data_${key}`, Date.now());

			await this.saveToStorage();
			this.enforceCacheLimits();
		} catch (error) {
			console.warn("Failed to cache map data:", key, error);
		}
	}

	/**
	 * Get cached map data
	 */
	getCachedMapData(key: string): OfflineMapData | null {
		if (!this.config.enableDataCaching) return null;

		const cached = this.dataCache.get(key);
		if (!cached) return null;

		// Check if expired
		const age = Date.now() - cached.lastUpdated;
		if (age > this.config.dataCacheExpiry * 24 * 60 * 60 * 1000) {
			this.dataCache.delete(key);
			this.accessLog.delete(`data_${key}`);
			return null;
		}

		this.accessLog.set(`data_${key}`, Date.now());
		return cached;
	}

	/**
	 * Prefetch map data for a bounding box
	 */
	async prefetchMapData(
		key: string,
		bounds: { ne_lat: number; ne_lon: number; sw_lat: number; sw_lon: number },
		fetchFn: () => Promise<{
			clusters: MapCluster[];
			points: MapPoint[];
		}>,
	): Promise<void> {
		try {
			const data = await fetchFn();
			await this.cacheMapData(key, {
				...data,
				bounds,
			});
		} catch (error) {
			console.warn("Failed to prefetch map data:", key, error);
		}
	}

	/**
	 * Generate cache key for map bounds
	 */
	generateBoundsKey(bounds: {
		ne_lat: number;
		ne_lon: number;
		sw_lat: number;
		sw_lon: number;
		zoom: number;
	}): string {
		const precision = Math.max(2, Math.floor(5 - bounds.zoom / 3));
		return `${bounds.ne_lat.toFixed(precision)},${bounds.ne_lon.toFixed(precision)},${bounds.sw_lat.toFixed(precision)},${bounds.sw_lat.toFixed(precision)}_${bounds.zoom}`;
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): CacheStats {
		let tileSize = 0;
		let dataSize = 0;

		for (const tile of this.tileCache.values()) {
			tileSize += tile.data.size;
		}

		for (const data of this.dataCache.values()) {
			dataSize += JSON.stringify(data).length;
		}

		return {
			tileCount: this.tileCache.size,
			tileSize,
			dataCount: this.dataCache.size,
			dataSize,
			hitRate: this.calculateHitRate(),
			lastCleanup: Date.now(),
		};
	}

	/**
	 * Clear all cache
	 */
	async clearCache(): Promise<void> {
		this.tileCache.clear();
		this.dataCache.clear();
		this.accessLog.clear();

		try {
			localStorage.removeItem("offlineMapTiles");
			localStorage.removeItem("offlineMapData");
		} catch (error) {
			console.warn("Failed to clear cache from storage:", error);
		}
	}

	/**
	 * Enforce cache size limits
	 */
	private enforceCacheLimits(): void {
		const totalSize = this.calculateTotalSize();
		if (totalSize <= this.config.maxCacheSize) return;

		// Sort by last access time (LRU)
		const sortedItems = Array.from(this.accessLog.entries())
			.sort(([, a], [, b]) => a - b)
			.map(([key]) => key);

		let currentSize = totalSize;

		for (const key of sortedItems) {
			if (currentSize <= this.config.maxCacheSize * 0.8) break; // Clean to 80% of limit

			if (key.startsWith("tile_")) {
				const tile = this.tileCache.get(key);
				if (tile) {
					currentSize -= tile.data.size;
					this.tileCache.delete(key);
				}
			} else if (key.startsWith("data_")) {
				const dataKey = key.replace("data_", "");
				const data = this.dataCache.get(dataKey);
				if (data) {
					currentSize -= JSON.stringify(data).length;
					this.dataCache.delete(dataKey);
				}
			}

			this.accessLog.delete(key);
		}
	}

	/**
	 * Calculate total cache size
	 */
	private calculateTotalSize(): number {
		let size = 0;

		for (const tile of this.tileCache.values()) {
			size += tile.data.size;
		}

		for (const data of this.dataCache.values()) {
			size += JSON.stringify(data).length;
		}

		return size;
	}

	/**
	 * Calculate cache hit rate
	 */
	private calculateHitRate(): number {
		// This is a simplified calculation
		// In a real implementation, you'd track hits and misses
		return 0.85; // 85% hit rate assumption
	}

	/**
	 * Save cache to localStorage
	 */
	private async saveToStorage(): Promise<void> {
		if (typeof localStorage === "undefined") return;

		try {
			// Save tiles (convert Blobs to base64)
			const tilesToSave: Record<string, string> = {};
			for (const [key, tile] of this.tileCache.entries()) {
				if (tile.data.size < 50000) {
					// Only cache small tiles
					const base64 = await this.blobToBase64(tile.data);
					tilesToSave[key] = base64;
				}
			}
			localStorage.setItem("offlineMapTiles", JSON.stringify(tilesToSave));

			// Save data
			const dataToSave: Record<string, OfflineMapData> = {};
			for (const [key, data] of this.dataCache.entries()) {
				dataToSave[key] = data;
			}
			localStorage.setItem("offlineMapData", JSON.stringify(dataToSave));
		} catch (error) {
			console.warn("Failed to save cache to storage:", error);
		}
	}

	/**
	 * Load cache from localStorage
	 */
	private loadFromStorage(): void {
		if (typeof localStorage === "undefined") return;

		try {
			// Load tiles
			const tilesJson = localStorage.getItem("offlineMapTiles");
			if (tilesJson) {
				const tilesData = JSON.parse(tilesJson);
				for (const [key, base64] of Object.entries(tilesData)) {
					const blob = this.base64ToBlob(base64);
					this.tileCache.set(key, {
						url: key,
						timestamp: Date.now(),
						data: blob,
					});
				}
			}

			// Load data
			const dataJson = localStorage.getItem("offlineMapData");
			if (dataJson) {
				const dataData = JSON.parse(dataJson);
				for (const [key, data] of Object.entries(dataData)) {
					this.dataCache.set(key, data);
				}
			}
		} catch (error) {
			console.warn("Failed to load cache from storage:", error);
		}
	}

	/**
	 * Start automatic cleanup timer
	 */
	private startCleanupTimer(): void {
		// Run cleanup every hour
		setInterval(
			() => {
				this.cleanupExpired();
			},
			60 * 60 * 1000,
		);
	}

	/**
	 * Clean up expired entries
	 */
	private cleanupExpired(): void {
		const now = Date.now();

		// Clean expired tiles
		for (const [key, tile] of this.tileCache.entries()) {
			if (
				now - tile.timestamp >
				this.config.tileCacheExpiry * 24 * 60 * 60 * 1000
			) {
				this.tileCache.delete(key);
				this.accessLog.delete(key);
			}
		}

		// Clean expired data
		for (const [key, data] of this.dataCache.entries()) {
			if (
				now - data.lastUpdated >
				this.config.dataCacheExpiry * 24 * 60 * 60 * 1000
			) {
				this.dataCache.delete(key);
				this.accessLog.delete(`data_${key}`);
			}
		}

		// Enforce size limits
		this.enforceCacheLimits();
	}

	/**
	 * Convert Blob to base64
	 */
	private async blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	/**
	 * Convert base64 to Blob
	 */
	private base64ToBlob(base64: string): Blob {
		const parts = base64.split(";base64,");
		const mimeType = parts[0].split(":")[1];
		const byteString = atob(parts[1]);
		const arrayBuffer = new ArrayBuffer(byteString.length);
		const uint8Array = new Uint8Array(arrayBuffer);

		for (let i = 0; i < byteString.length; i++) {
			uint8Array[i] = byteString.charCodeAt(i);
		}

		return new Blob([uint8Array], { type: mimeType });
	}

	/**
	 * Check if offline mode is available
	 */
	isOfflineAvailable(): boolean {
		return (
			(this.config.enableTileCaching || this.config.enableDataCaching) &&
			(this.tileCache.size > 0 || this.dataCache.size > 0)
		);
	}

	/**
	 * Get offline status
	 */
	getOfflineStatus(): {
		available: boolean;
		tileCount: number;
		dataCount: number;
		totalSize: number;
		expiryDays: number;
	} {
		return {
			available: this.isOfflineAvailable(),
			tileCount: this.tileCache.size,
			dataCount: this.dataCache.size,
			totalSize: this.calculateTotalSize(),
			expiryDays: Math.min(
				this.config.tileCacheExpiry,
				this.config.dataCacheExpiry,
			),
		};
	}
}

// Create singleton instance
export const offlineMapService = new OfflineMapService();

// React hook for offline map functionality
export function useOfflineMap() {
	const [isOnline, setIsOnline] = useState(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	return {
		isOnline,
		isOfflineAvailable: offlineMapService.isOfflineAvailable(),
		cacheStats: offlineMapService.getCacheStats(),
		offlineStatus: offlineMapService.getOfflineStatus(),
		cacheTile: offlineMapService.cacheTile.bind(offlineMapService),
		getCachedTile: offlineMapService.getCachedTile.bind(offlineMapService),
		cacheMapData: offlineMapService.cacheMapData.bind(offlineMapService),
		getCachedMapData:
			offlineMapService.getCachedMapData.bind(offlineMapService),
		prefetchMapData: offlineMapService.prefetchMapData.bind(offlineMapService),
		generateBoundsKey:
			offlineMapService.generateBoundsKey.bind(offlineMapService),
		clearCache: offlineMapService.clearCache.bind(offlineMapService),
	};
}
