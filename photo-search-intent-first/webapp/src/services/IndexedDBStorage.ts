/**
 * IndexedDB Storage Helper for Offline Actions
 * Provides efficient storage and retrieval of offline actions
 */

const DB_NAME = "PhotoVaultOffline";
const DB_VERSION = 2;
const STORE_NAME = "offlineActions";
const MANIFEST_STORE_NAME = "manifests";
const METADATA_STORE_NAME = "metadata";
const THUMBNAIL_STORE_NAME = "thumbnails";
const DIAGNOSTICS_STORE_NAME = "diagnostics";

export interface DiagnosticEventRecord {
	id?: number;
	type: string;
	timestamp: number;
	payload: unknown;
}

export class IndexedDBStorage {
	private db: IDBDatabase | null = null;
	private isInitialized = false;

	/**
	 * Initialize the IndexedDB database
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => {
				console.error("[IndexedDB] Failed to open database:", request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				this.db = request.result;
				this.isInitialized = true;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				// Create object store for offline actions
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
					store.createIndex("timestamp", "timestamp", { unique: false });
					store.createIndex("type", "type", { unique: false });
				}

				// Create object store for manifests
				if (!db.objectStoreNames.contains(MANIFEST_STORE_NAME)) {
					db.createObjectStore(MANIFEST_STORE_NAME);
				}

				// Create object store for metadata
				if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
					db.createObjectStore(METADATA_STORE_NAME);
				}

				// Create object store for thumbnails
				if (!db.objectStoreNames.contains(THUMBNAIL_STORE_NAME)) {
					db.createObjectStore(THUMBNAIL_STORE_NAME);
				}
			};
		});
	}

	/**
	 * Add an action to the database
	 */
	async addAction(action: any): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.add(action);

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error("[IndexedDB] Failed to add action:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Get all actions from the database
	 */
	async getActions(): Promise<any[]> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([STORE_NAME], "readonly");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.getAll();

			request.onsuccess = () => {
				resolve(request.result || []);
			};

			request.onerror = () => {
				console.error("[IndexedDB] Failed to get actions:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Update an action in the database
	 */
	async updateAction(action: any): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.put(action);

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error("[IndexedDB] Failed to update action:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Remove an action from the database
	 */
	async removeAction(id: string): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.delete(id);

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error("[IndexedDB] Failed to remove action:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Remove multiple actions from the database
	 */
	async removeActions(ids: string[]): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);

			let completed = 0;
			let hasError = false;

			ids.forEach((id) => {
				const request = store.delete(id);

				request.onsuccess = () => {
					completed++;
					if (completed === ids.length && !hasError) {
						resolve();
					}
				};

				request.onerror = () => {
					if (!hasError) {
						hasError = true;
						console.error(
							"[IndexedDB] Failed to remove actions:",
							request.error,
						);
						reject(request.error);
					}
				};
			});
		});
	}

	/**
	 * Clear all actions from the database
	 */
	async clearActions(): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.clear();

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error("[IndexedDB] Failed to clear actions:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Get the count of actions in the database
	 */
	async getActionCount(): Promise<number> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([STORE_NAME], "readonly");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.count();

			request.onsuccess = () => {
				resolve(request.result);
			};

			request.onerror = () => {
				console.error("[IndexedDB] Failed to count actions:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Store a manifest in the database
	 */
	async storeManifest(key: string, manifest: any[]): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([MANIFEST_STORE_NAME], "readwrite");
			if (!transaction) {
				reject(new Error("Failed to create transaction"));
				return;
			}
			const store = transaction.objectStore(MANIFEST_STORE_NAME);
			const request = store.put(manifest, key);

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error("[IndexedDB] Failed to store manifest:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Get a manifest from the database
	 */
	async getManifest(key: string): Promise<any[] | null> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([MANIFEST_STORE_NAME], "readonly");
			if (!transaction) {
				reject(new Error("Failed to create transaction"));
				return;
			}
			const store = transaction.objectStore(MANIFEST_STORE_NAME);
			const request = store.get(key);

			request.onsuccess = () => {
				resolve(request.result || null);
			};

			request.onerror = () => {
				console.error("[IndexedDB] Failed to get manifest:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Store metadata
	 */
	async storeMetadata(key: string, value: any): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([METADATA_STORE_NAME], "readwrite");
			if (!transaction) {
				reject(new Error("Failed to create transaction"));
				return;
			}
			const store = transaction.objectStore(METADATA_STORE_NAME);
			const request = store.put(value, key);

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error("[IndexedDB] Failed to store metadata:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Get metadata
	 */
	async getMetadata(key: string): Promise<any> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([METADATA_STORE_NAME], "readonly");
			if (!transaction) {
				reject(new Error("Failed to create transaction"));
				return;
			}
			const store = transaction.objectStore(METADATA_STORE_NAME);
			const request = store.get(key);

			request.onsuccess = () => {
				resolve(request.result);
			};

			request.onerror = () => {
				console.error("[IndexedDB] Failed to get metadata:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Store a thumbnail blob
	 */
	async storeThumbnail(path: string, blob: Blob): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([THUMBNAIL_STORE_NAME], "readwrite");
			if (!transaction) {
				reject(new Error("Failed to create transaction"));
				return;
			}
			const store = transaction.objectStore(THUMBNAIL_STORE_NAME);
			const request = store.put(blob, path);

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error("[IndexedDB] Failed to store thumbnail:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Get a thumbnail blob
	 */
	async getThumbnail(path: string): Promise<Blob | null> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction([THUMBNAIL_STORE_NAME], "readonly");
			if (!transaction) {
				reject(new Error("Failed to create transaction"));
				return;
			}
			const store = transaction.objectStore(THUMBNAIL_STORE_NAME);
			const request = store.get(path);

			request.onsuccess = () => {
				resolve(request.result || null);
			};

			request.onerror = () => {
				console.error("[IndexedDB] Failed to get thumbnail:", request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Check if IndexedDB is supported
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
export const indexedDBStorage = new IndexedDBStorage();
