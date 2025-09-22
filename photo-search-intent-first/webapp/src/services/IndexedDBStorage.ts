/**
 * IndexedDB Storage Helper for Offline Actions
 * Provides efficient storage and retrieval of offline actions
 */

const DB_NAME = "PhotoVaultOffline";
const DB_VERSION = 1;
const STORE_NAME = "offlineActions";

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
			const transaction = this.db!.transaction([STORE_NAME], "readwrite");
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
			const transaction = this.db!.transaction([STORE_NAME], "readonly");
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
			const transaction = this.db!.transaction([STORE_NAME], "readwrite");
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
			const transaction = this.db!.transaction([STORE_NAME], "readwrite");
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
			const transaction = this.db!.transaction([STORE_NAME], "readwrite");
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
			const transaction = this.db!.transaction([STORE_NAME], "readwrite");
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
			const transaction = this.db!.transaction([STORE_NAME], "readonly");
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
