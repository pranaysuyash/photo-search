/**
 * Enhanced Offline Photo Service for Mobile PWA
 * Manages photo caching, offline viewing, and sync operations
 */

import React from "react";
import { API_BASE } from "../api";

export interface PhotoCacheEntry {
	path: string;
	thumbnailUrl: string;
	fullUrl: string;
	metadata: any;
	cachedAt: number;
	size: number;
	priority: "high" | "medium" | "low";
}

export interface OfflinePhotoConfig {
	maxCacheSizeMB?: number;
	maxCacheEntries?: number;
	cacheExpirationDays?: number;
	enableSmartCaching?: boolean;
	enablePrecaching?: boolean;
}

const DEFAULT_CONFIG: OfflinePhotoConfig = {
	maxCacheSizeMB: 500,
	maxCacheEntries: 1000,
	cacheExpirationDays: 30,
	enableSmartCaching: true,
	enablePrecaching: true,
};

export class OfflinePhotoService {
	private config: OfflinePhotoConfig;
	private cacheName = "photovault-photos-v1";
	private metadataCacheName = "photovault-metadata-v1";
	private dbName = "PhotoVaultOfflineDB";
	private dbVersion = 1;
	private db: IDBDatabase | null = null;
	private syncQueue: Array<() => Promise<void>> = [];

	constructor(config: OfflinePhotoConfig = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.initializeDatabase();
	}

	// Initialize IndexedDB for metadata and cache management
	private async initializeDatabase() {
		return new Promise<void>((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.dbVersion);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				// Photo cache store
				if (!db.objectStoreNames.contains("photoCache")) {
					const photoStore = db.createObjectStore("photoCache", {
						keyPath: "path",
					});
					photoStore.createIndex("cachedAt", "cachedAt", { unique: false });
					photoStore.createIndex("priority", "priority", { unique: false });
					photoStore.createIndex("size", "size", { unique: false });
				}

				// Sync queue store
				if (!db.objectStoreNames.contains("syncQueue")) {
					db.createObjectStore("syncQueue", {
						keyPath: "id",
						autoIncrement: true,
					});
				}

				// Offline actions store
				if (!db.objectStoreNames.contains("offlineActions")) {
					db.createObjectStore("offlineActions", {
						keyPath: "id",
						autoIncrement: true,
					});
				}
			};
		});
	}

	// Cache photo with different sizes
	async cachePhoto(
		path: string,
		priority: "high" | "medium" | "low" = "medium",
	) {
		try {
			// Check if already cached
			if (await this.isPhotoCached(path)) {
				return;
			}

			// Get photo URLs
			const thumbnailUrl = `${API_BASE}/api/thumb/${encodeURIComponent(
				path,
			)}?size=400`;
			const fullUrl = `${API_BASE}/api/media/${encodeURIComponent(path)}`;

			// Cache thumbnail
			const thumbnailCache = await caches.open(this.cacheName);
			await thumbnailCache.add(thumbnailUrl);

			// Cache full image if high priority or space allows
			if (priority === "high" || (await this.hasCacheSpace())) {
				await thumbnailCache.add(fullUrl);
			}

			// Store metadata in IndexedDB
			const entry: PhotoCacheEntry = {
				path,
				thumbnailUrl,
				fullUrl,
				metadata: {}, // Will be populated separately
				cachedAt: Date.now(),
				size: 0, // Will be calculated from cache storage
				priority,
			};

			await this.storeCacheEntry(entry);

			console.log(`[OfflinePhotoService] Cached photo: ${path}`);
		} catch (error) {
			console.error(
				`[OfflinePhotoService] Failed to cache photo: ${path}`,
				error,
			);
		}
	}

	// Cache multiple photos efficiently
	async cachePhotos(
		photos: Array<{ path: string; priority?: "high" | "medium" | "low" }>,
	) {
		const cachePromises = photos.map((photo) =>
			this.cachePhoto(photo.path, photo.priority || "medium"),
		);

		// Batch process to avoid overwhelming the cache
		const batchSize = 5;
		for (let i = 0; i < cachePromises.length; i += batchSize) {
			const batch = cachePromises.slice(i, i + batchSize);
			await Promise.all(batch);

			// Small delay between batches
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	// Get cached photo URL (returns blob URL for offline access)
	async getCachedPhotoUrl(
		path: string,
		size: "thumbnail" | "full" = "thumbnail",
	): Promise<string | null> {
		try {
			const cache = await caches.open(this.cacheName);
			const url =
				size === "thumbnail"
					? `${API_BASE}/api/thumb/${encodeURIComponent(path)}?size=400`
					: `${API_BASE}/api/media/${encodeURIComponent(path)}`;

			const response = await cache.match(url);
			if (response) {
				const blob = await response.blob();
				return URL.createObjectURL(blob);
			}
		} catch (error) {
			console.error(
				`[OfflinePhotoService] Failed to get cached photo: ${path}`,
				error,
			);
		}
		return null;
	}

	// Check if photo is cached
	async isPhotoCached(path: string): Promise<boolean> {
		try {
			const db = this.db;
			if (!db) return false;

			const transaction = db.transaction(["photoCache"], "readonly");
			const store = transaction.objectStore("photoCache");
			const request = store.get(path);

			return new Promise((resolve) => {
				request.onsuccess = () => resolve(!!request.result);
				request.onerror = () => resolve(false);
			});
		} catch {
			return false;
		}
	}

	// Store cache entry in IndexedDB
	private async storeCacheEntry(entry: PhotoCacheEntry) {
		const db = this.db;
		if (!db) return;

		const transaction = db.transaction(["photoCache"], "readwrite");
		const store = transaction.objectStore("photoCache");
		store.put(entry);
	}

	// Check if there's space in cache
	private async hasCacheSpace(): Promise<boolean> {
		try {
			const db = this.db;
			if (!db) return false;

			const transaction = db.transaction(["photoCache"], "readonly");
			const store = transaction.objectStore("photoCache");
			const request = store.getAll();

			return new Promise((resolve) => {
				request.onsuccess = () => {
					const entries = request.result as PhotoCacheEntry[];
					const totalSize = entries.reduce(
						(sum, entry) => sum + (entry.size || 0),
						0,
					);
					const maxSizeBytes = this.config.maxCacheSizeMB! * 1024 * 1024;
					resolve(
						totalSize < maxSizeBytes &&
							entries.length < this.config.maxCacheEntries!,
					);
				};
				request.onerror = () => resolve(false);
			});
		} catch {
			return false;
		}
	}

	// Clean up old cache entries
	async cleanupCache() {
		try {
			const db = this.db;
			if (!db) return;

			const transaction = db.transaction(["photoCache"], "readwrite");
			const store = transaction.objectStore("photoCache");
			const request = store.getAll();

			return new Promise<void>((resolve) => {
				request.onsuccess = async () => {
					const entries = request.result as PhotoCacheEntry[];
					const now = Date.now();
					const expirationTime =
						this.config.cacheExpirationDays! * 24 * 60 * 60 * 1000;

					const cache = await caches.open(this.cacheName);

					for (const entry of entries) {
						if (now - entry.cachedAt > expirationTime) {
							// Remove from cache storage
							await cache.delete(entry.thumbnailUrl);
							await cache.delete(entry.fullUrl);

							// Remove from IndexedDB
							store.delete(entry.path);
						}
					}

					resolve();
				};
				request.onerror = () => resolve();
			});
		} catch (error) {
			console.error("[OfflinePhotoService] Cache cleanup failed:", error);
		}
	}

	// Get offline photo metadata
	async getOfflineMetadata(path: string): Promise<any | null> {
		try {
			const db = this.db;
			if (!db) return null;

			const transaction = db.transaction(["photoCache"], "readonly");
			const store = transaction.objectStore("photoCache");
			const request = store.get(path);

			return new Promise((resolve) => {
				request.onsuccess = () => {
					const entry = request.result as PhotoCacheEntry;
					resolve(entry?.metadata || null);
				};
				request.onerror = () => resolve(null);
			});
		} catch {
			return null;
		}
	}

	// Store offline action for sync when online
	async queueOfflineAction(action: any) {
		try {
			const db = this.db;
			if (!db) return;

			const transaction = db.transaction(["offlineActions"], "readwrite");
			const store = transaction.objectStore("offlineActions");
			store.put({
				...action,
				timestamp: Date.now(),
			});
		} catch (error) {
			console.error(
				"[OfflinePhotoService] Failed to queue offline action:",
				error,
			);
		}
	}

	// Sync offline actions when back online
	async syncOfflineActions(): Promise<number> {
		try {
			const db = this.db;
			if (!db) return 0;

			const transaction = db.transaction(["offlineActions"], "readonly");
			const store = transaction.objectStore("offlineActions");
			const request = store.getAll();

			return new Promise(async (resolve) => {
				request.onsuccess = async () => {
					const actions = request.result;
					let syncedCount = 0;

					for (const action of actions) {
						try {
							// Process each action
							await this.processOfflineAction(action);
							syncedCount++;

							// Remove from queue
							const deleteTransaction = db.transaction(
								["offlineActions"],
								"readwrite",
							);
							const deleteStore =
								deleteTransaction.objectStore("offlineActions");
							deleteStore.delete(action.id);
						} catch (error) {
							console.error(
								"[OfflinePhotoService] Failed to sync action:",
								error,
							);
						}
					}

					resolve(syncedCount);
				};
				request.onerror = () => resolve(0);
			});
		} catch {
			return 0;
		}
	}

	private async processOfflineAction(action: any) {
		// Process different types of offline actions
		switch (action.type) {
			case "favorite":
				// Handle offline favorite action
				break;
			case "tag":
				// Handle offline tag action
				break;
			case "rating":
				// Handle offline rating action
				break;
			default:
				console.warn(
					"[OfflinePhotoService] Unknown offline action type:",
					action.type,
				);
		}
	}

	// Get cache statistics
	async getCacheStats(): Promise<{
		totalPhotos: number;
		totalSizeMB: number;
		cacheHitRate: number;
		oldestEntry: number;
		newestEntry: number;
	}> {
		try {
			const db = this.db;
			if (!db) {
				return {
					totalPhotos: 0,
					totalSizeMB: 0,
					cacheHitRate: 0,
					oldestEntry: 0,
					newestEntry: 0,
				};
			}

			const transaction = db.transaction(["photoCache"], "readonly");
			const store = transaction.objectStore("photoCache");
			const request = store.getAll();

			return new Promise((resolve) => {
				request.onsuccess = () => {
					const entries = request.result as PhotoCacheEntry[];

					if (entries.length === 0) {
						resolve({
							totalPhotos: 0,
							totalSizeMB: 0,
							cacheHitRate: 0,
							oldestEntry: 0,
							newestEntry: 0,
						});
						return;
					}

					const totalSize = entries.reduce(
						(sum, entry) => sum + (entry.size || 0),
						0,
					);
					const cachedAts = entries.map((e) => e.cachedAt);

					resolve({
						totalPhotos: entries.length,
						totalSizeMB: totalSize / (1024 * 1024),
						cacheHitRate: 0, // Would need to track hits
						oldestEntry: Math.min(...cachedAts),
						newestEntry: Math.max(...cachedAts),
					});
				};
				request.onerror = () => {
					resolve({
						totalPhotos: 0,
						totalSizeMB: 0,
						cacheHitRate: 0,
						oldestEntry: 0,
						newestEntry: 0,
					});
				};
			});
		} catch {
			return {
				totalPhotos: 0,
				totalSizeMB: 0,
				cacheHitRate: 0,
				oldestEntry: 0,
				newestEntry: 0,
			};
		}
	}
}

// React hook for easy integration
export function useOfflinePhotos() {
	const [offlineService] = React.useState(() => new OfflinePhotoService());
	const [isOnline, setIsOnline] = React.useState(navigator.onLine);
	const [cacheStats, setCacheStats] = React.useState<any>(null);

	React.useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			// Sync offline actions when back online
			offlineService.syncOfflineActions();
		};

		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		// Get initial cache stats
		offlineService.getCacheStats().then(setCacheStats);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [offlineService]);

	return {
		offlineService,
		isOnline,
		cacheStats,
	};
}

export const offlinePhotoService = new OfflinePhotoService();
