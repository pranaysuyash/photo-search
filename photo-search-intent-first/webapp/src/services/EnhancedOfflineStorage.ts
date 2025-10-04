import type { PhotoMeta } from "../models/PhotoMeta";

/**
 * Enhanced offline storage system for photo search application
 * Provides local storage for photos, metadata, and search indices
 */
export interface OfflinePhotoStorage {
	id: string;
	path: string;
	thumbnail?: string;
	metadata?: PhotoMeta;
	embedding?: number[]; // CLIP embedding vector
	cachedAt: number;
	lastAccessed: number;
}

export interface SearchIndexEntry {
	id: string;
	embedding: number[]; // CLIP embedding vector
	photoId: string;
	text: string; // Search text used to generate this index
	cachedAt: number;
}

export interface OfflineStorageConfig {
	maxStorageSize?: number; // in bytes
	maxPhotos?: number;
	maxSearchIndices?: number;
	ttl?: number; // time-to-live in milliseconds
	enableEmbeddingCache?: boolean;
}

export class EnhancedOfflineStorage {
	private readonly config: OfflineStorageConfig;
	public static readonly CACHE_SCHEMA_VERSION = "2024-10-offline-cache-v1";
	private readonly DB_NAME = "PhotoVaultOfflineEnhanced";
	private readonly DB_VERSION = 2;
	private readonly PHOTO_STORE = "photos";
	private readonly EMBEDDING_STORE = "embeddings";
	private readonly INDEX_STORE = "search_indices";
	private readonly METADATA_STORE = "metadata";
	private readonly VERSION_KEY = "photo-vault-offline-cache-version";

	private db: IDBDatabase | null = null;
	private isInitialized = false;

	constructor(config?: OfflineStorageConfig) {
		this.config = {
			maxStorageSize: 500 * 1024 * 1024, // 500MB
			maxPhotos: 10000,
			maxSearchIndices: 5000,
			ttl: 7 * 24 * 60 * 60 * 1000, // 1 week
			enableEmbeddingCache: true,
			...config,
		};
	}

	/**
	 * Initialize the IndexedDB database
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

			request.onerror = () => {
				console.error(
					"[EnhancedOfflineStorage] Failed to open database:",
					request.error,
				);
				reject(request.error);
			};

			request.onsuccess = () => {
				this.db = request.result;
				this.isInitialized = true;
				this.ensureSchemaVersion()
					.then(resolve)
					.catch((error) => {
						console.error(
							"[EnhancedOfflineStorage] Failed to ensure schema version:",
							error,
						);
						reject(error);
					});
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				// Create object store for photos
				if (!db.objectStoreNames.contains(this.PHOTO_STORE)) {
					const photoStore = db.createObjectStore(this.PHOTO_STORE, {
						keyPath: "id",
					});
					photoStore.createIndex("path", "path", { unique: true });
					photoStore.createIndex("cachedAt", "cachedAt", { unique: false });
					photoStore.createIndex("lastAccessed", "lastAccessed", {
						unique: false,
					});
				}

				// Create object store for embeddings
				if (!db.objectStoreNames.contains(this.EMBEDDING_STORE)) {
					const embeddingStore = db.createObjectStore(this.EMBEDDING_STORE, {
						keyPath: "id",
					});
					embeddingStore.createIndex("photoId", "photoId", { unique: true });
					embeddingStore.createIndex("cachedAt", "cachedAt", { unique: false });
				}

				// Create object store for search indices
				if (!db.objectStoreNames.contains(this.INDEX_STORE)) {
					const indexStore = db.createObjectStore(this.INDEX_STORE, {
						keyPath: "id",
					});
					indexStore.createIndex("photoId", "photoId", { unique: false });
					indexStore.createIndex("cachedAt", "cachedAt", { unique: false });
				}

				// Create object store for metadata
				if (!db.objectStoreNames.contains(this.METADATA_STORE)) {
					const metadataStore = db.createObjectStore(this.METADATA_STORE, {
						keyPath: "id",
					});
					metadataStore.createIndex("photoId", "photoId", { unique: true });
					metadataStore.createIndex("cachedAt", "cachedAt", { unique: false });
				}
			};
		});
	}

	private async ensureSchemaVersion(): Promise<void> {
		if (typeof window === "undefined") {
			return;
		}
		try {
			const storedVersion = window.localStorage.getItem(this.VERSION_KEY);
			if (storedVersion === EnhancedOfflineStorage.CACHE_SCHEMA_VERSION) {
				return;
			}
			await this.clearAllStores();
			window.localStorage.setItem(
				this.VERSION_KEY,
				EnhancedOfflineStorage.CACHE_SCHEMA_VERSION,
			);
		} catch (error) {
			console.error(
				"[EnhancedOfflineStorage] Failed to ensure schema version:",
				error,
			);
			throw error;
		}
	}

	/**
	 * Store a photo's data offline
	 */
	async storePhoto(photo: OfflinePhotoStorage): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const tx = this.db!.transaction([this.PHOTO_STORE], "readwrite");
			const store = tx.objectStore(this.PHOTO_STORE);

			// Update last accessed time
			photo.lastAccessed = Date.now();

			const request = store.put(photo);

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error(
					"[EnhancedOfflineStorage] Failed to store photo:",
					request.error,
				);
				reject(request.error);
			};
		});
	}

	private async clearAllStores(): Promise<void> {
		if (!this.db) {
			return;
		}
		await Promise.all(
			[
				this.PHOTO_STORE,
				this.EMBEDDING_STORE,
				this.INDEX_STORE,
				this.METADATA_STORE,
			].map(
				(storeName) =>
					new Promise<void>((resolve, reject) => {
						const tx = this.db!.transaction([storeName], "readwrite");
						const store = tx.objectStore(storeName);
						const request = store.clear();
						request.onsuccess = () => resolve();
						request.onerror = () => reject(request.error);
					}),
				),
			);
	}

	/**
	 * Public helper to wipe all cached data
	 */
	async clearAll(): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}
		await this.clearAllStores();
		if (typeof window !== "undefined") {
			window.localStorage.removeItem(this.VERSION_KEY);
		}
	}

	/**
	 * Retrieve a photo's data from offline storage
	 */
	async getPhoto(id: string): Promise<OfflinePhotoStorage | undefined> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const tx = this.db!.transaction([this.PHOTO_STORE], "readonly");
			const store = tx.objectStore(this.PHOTO_STORE);
			const request = store.get(id);

			request.onsuccess = () => {
				const result = request.result as OfflinePhotoStorage;
				if (result) {
					// Update last accessed time
					result.lastAccessed = Date.now();
					this.updatePhotoLastAccessed(result.id, result.lastAccessed).catch(
						(err) => {
							console.error(
								"[EnhancedOfflineStorage] Failed to update last accessed:",
								err,
							);
						},
					);
				}
				resolve(result);
			};

			request.onerror = () => {
				console.error(
					"[EnhancedOfflineStorage] Failed to get photo:",
					request.error,
				);
				reject(request.error);
			};
		});
	}

	/**
	 * Update the last accessed time for a photo
	 */
	private async updatePhotoLastAccessed(
		id: string,
		timestamp: number,
	): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const tx = this.db!.transaction([this.PHOTO_STORE], "readwrite");
			const store = tx.objectStore(this.PHOTO_STORE);
			const request = store.get(id);

			request.onsuccess = () => {
				const photo = request.result as OfflinePhotoStorage;
				if (photo) {
					photo.lastAccessed = timestamp;
					const updateRequest = store.put(photo);
					updateRequest.onsuccess = () => resolve();
					updateRequest.onerror = () => reject(updateRequest.error);
				} else {
					resolve(); // Photo not found, resolve anyway
				}
			};

			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get all photos from offline storage
	 */
	async getAllPhotos(): Promise<OfflinePhotoStorage[]> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const tx = this.db!.transaction([this.PHOTO_STORE], "readonly");
			const store = tx.objectStore(this.PHOTO_STORE);
			const request = store.getAll();

			request.onsuccess = () => {
				const results = request.result as OfflinePhotoStorage[];
				resolve(results || []);
			};

			request.onerror = () => {
				console.error(
					"[EnhancedOfflineStorage] Failed to get all photos:",
					request.error,
				);
				reject(request.error);
			};
		});
	}

	/**
	 * Store a photo's embedding offline
	 */
	async storeEmbedding(photoId: string, embedding: number[]): Promise<void> {
		if (!this.config.enableEmbeddingCache) {
			return;
		}

		if (!this.db) {
			await this.initialize();
		}

		const embeddingData = {
			id: `emb_${photoId}`,
			photoId,
			embedding,
			cachedAt: Date.now(),
		};

		return new Promise((resolve, reject) => {
			const tx = this.db!.transaction([this.EMBEDDING_STORE], "readwrite");
			const store = tx.objectStore(this.EMBEDDING_STORE);
			const request = store.put(embeddingData);

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error(
					"[EnhancedOfflineStorage] Failed to store embedding:",
					request.error,
				);
				reject(request.error);
			};
		});
	}

	/**
	 * Retrieve a photo's embedding from offline storage
	 */
	async getEmbedding(photoId: string): Promise<number[] | undefined> {
		if (!this.config.enableEmbeddingCache) {
			return undefined;
		}

		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const tx = this.db!.transaction([this.EMBEDDING_STORE], "readonly");
			const store = tx.objectStore(this.EMBEDDING_STORE);
			const request = store.get(`emb_${photoId}`);

			request.onsuccess = () => {
				const result = request.result as { embedding: number[] } | undefined;
				resolve(result?.embedding);
			};

			request.onerror = () => {
				console.error(
					"[EnhancedOfflineStorage] Failed to get embedding:",
					request.error,
				);
				reject(request.error);
			};
		});
	}

	/**
	 * Store a search index entry
	 */
	async storeSearchIndex(entry: SearchIndexEntry): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const tx = this.db!.transaction([this.INDEX_STORE], "readwrite");
			const store = tx.objectStore(this.INDEX_STORE);
			const request = store.put(entry);

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error(
					"[EnhancedOfflineStorage] Failed to store search index:",
					request.error,
				);
				reject(request.error);
			};
		});
	}

	/**
	 * Retrieve search index entries by photo ID
	 */
	async getSearchIndicesByPhotoId(
		photoId: string,
	): Promise<SearchIndexEntry[]> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const tx = this.db!.transaction([this.INDEX_STORE], "readonly");
			const store = tx.objectStore(this.INDEX_STORE);
			const index = store.index("photoId");
			const request = index.getAll(photoId);

			request.onsuccess = () => {
				resolve(request.result as SearchIndexEntry[]);
			};

			request.onerror = () => {
				console.error(
					"[EnhancedOfflineStorage] Failed to get search indices:",
					request.error,
				);
				reject(request.error);
			};
		});
	}

	/**
	 * Store metadata for a photo
	 */
	async storeMetadata(photoId: string, metadata: PhotoMeta): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		const metadataEntry = {
			id: `meta_${photoId}`,
			photoId,
			metadata,
			cachedAt: Date.now(),
		};

		return new Promise((resolve, reject) => {
			const tx = this.db!.transaction([this.METADATA_STORE], "readwrite");
			const store = tx.objectStore(this.METADATA_STORE);
			const request = store.put(metadataEntry);

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error(
					"[EnhancedOfflineStorage] Failed to store metadata:",
					request.error,
				);
				reject(request.error);
			};
		});
	}

	/**
	 * Retrieve metadata for a photo
	 */
	async getMetadata(photoId: string): Promise<PhotoMeta | undefined> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const tx = this.db!.transaction([this.METADATA_STORE], "readonly");
			const store = tx.objectStore(this.METADATA_STORE);
			const request = store.get(`meta_${photoId}`);

			request.onsuccess = () => {
				const result = request.result as { metadata: PhotoMeta } | undefined;
				resolve(result?.metadata);
			};

			request.onerror = () => {
				console.error(
					"[EnhancedOfflineStorage] Failed to get metadata:",
					request.error,
				);
				reject(request.error);
			};
		});
	}

	/**
	 * Remove expired entries based on TTL
	 */
	async cleanupExpired(): Promise<void> {
		if (!this.db || !this.config.ttl) {
			return;
		}

		const cutoffTime = Date.now() - this.config.ttl;

		await Promise.all([
			this.cleanupStoreByTime(this.PHOTO_STORE, "cachedAt", cutoffTime),
			this.cleanupStoreByTime(this.EMBEDDING_STORE, "cachedAt", cutoffTime),
			this.cleanupStoreByTime(this.INDEX_STORE, "cachedAt", cutoffTime),
			this.cleanupStoreByTime(this.METADATA_STORE, "cachedAt", cutoffTime),
		]);
	}

	/**
	 * Remove entries from a store that are older than the specified time
	 */
	private async cleanupStoreByTime(
		storeName: string,
		indexName: string,
		cutoffTime: number,
	): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const tx = this.db!.transaction([storeName], "readwrite");
			const store = tx.objectStore(storeName);
			const index = store.index(indexName);
			const range = IDBKeyRange.upperBound(cutoffTime);
			const request = index.openCursor(range);

			request.onsuccess = () => {
				const cursor = request.result;
				if (cursor) {
					cursor.delete(); // Delete the entry
					cursor.continue();
				} else {
					resolve(); // Finished cleanup
				}
			};

			request.onerror = () => {
				console.error(
					"[EnhancedOfflineStorage] Failed to cleanup expired entries:",
					request.error,
				);
				reject(request.error);
			};
		});
	}

	/**
	 * Get the current storage usage
	 */
	async getStorageUsage(): Promise<number> {
		if (!this.db) {
			await this.initialize();
		}

		// In a simplified approach, we'll estimate the size
		// In a real implementation, we would calculate the actual size
		return new Promise((resolve) => {
			// This is an estimation approach since IndexedDB doesn't expose actual storage usage directly
			resolve(this.estimateStorageUsage());
		});
	}

	/**
	 * Estimate storage usage
	 */
	private estimateStorageUsage(): number {
		// This is a simplified estimation; in a real implementation
		// we would need to iterate through all records and calculate sizes
		return 0;
	}

	/**
	 * Clear all offline storage
	 */
	async clearAll(): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		const stores = [
			this.PHOTO_STORE,
			this.EMBEDDING_STORE,
			this.INDEX_STORE,
			this.METADATA_STORE,
		];

		for (const storeName of stores) {
			await new Promise((resolve, reject) => {
				const tx = this.db!.transaction([storeName], "readwrite");
				const store = tx.objectStore(storeName);
				const request = store.clear();

				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
		}
	}

	/**
	 * Check if offline storage is supported
	 */
	static isSupported(): boolean {
		return "indexedDB" in window;
	}

	/**
	 * Close the database connection
	 */
	close(): void {
		if (this.db) {
			this.db.close();
			this.db = null;
			this.isInitialized = false;
		}
	}
}

// Singleton instance
export const enhancedOfflineStorage = new EnhancedOfflineStorage();
