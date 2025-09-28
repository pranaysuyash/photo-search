/**
 * IndexedDBPersistence - IndexedDB implementation for offline action queue persistence
 * This persistence layer stores offline actions in the browser's IndexedDB.
 */
export class IndexedDBPersistence implements QueuePersistence {
	private readonly DB_NAME = "ActionQueue";
	private readonly STORE_NAME = "actions";
	private readonly VERSION = 1;
	private db: IDBDatabase | null = null;

	constructor(private readonly dbName: string = "ActionQueue") {
		this.DB_NAME = dbName;
	}

	// Initialize the database
	private async init(): Promise<IDBDatabase> {
		if (this.db) return this.db;

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.DB_NAME, this.VERSION);

			request.onerror = () => {
				reject(new Error(`Failed to open database: ${request.error?.message}`));
			};

			request.onsuccess = () => {
				this.db = request.result;
				resolve(this.db);
			};

			request.onupgradeneeded = (_event) => {
				const db = request.result;

				// Create object store for actions
				if (!db.objectStoreNames.contains(this.STORE_NAME)) {
					const store = db.createObjectStore(this.STORE_NAME, {
						keyPath: "id",
					});
					store.createIndex("status", "status", { unique: false });
					store.createIndex("groupId", "groupId", { unique: false });
					store.createIndex("createdAt", "metadata.createdAt", {
						unique: false,
					});
				}
			};
		});
	}

	// Save actions to database
	async save(actions: OfflineAction[]): Promise<void> {
		if (actions.length === 0) {
			return;
		}

		try {
			const db = await this.init();
			const transaction = db.transaction([this.STORE_NAME], "readwrite");
			const store = transaction.objectStore(this.STORE_NAME);

			// Clear existing actions
			store.clear();

			// Add new actions
			actions.forEach((action) => {
				store.put(action);
			});

			// Wait for transaction to complete
			return new Promise((resolve, reject) => {
				transaction.onerror = () => {
					reject(
						new Error(`Transaction failed: ${transaction.error?.message}`),
					);
				};

				transaction.oncomplete = () => {
					resolve();
				};
			});
		} catch (error) {
			console.warn("Failed to save to IndexedDB:", error);
			throw error;
		}
	}

	// Load actions from database
	async load(): Promise<OfflineAction[]> {
		try {
			const db = await this.init();
			const transaction = db.transaction([this.STORE_NAME], "readonly");
			const store = transaction.objectStore(this.STORE_NAME);
			const request = store.getAll();

			return new Promise((resolve, reject) => {
				request.onerror = () => {
					reject(
						new Error(
							`Failed to load from database: ${request.error?.message}`,
						),
					);
				};

				request.onsuccess = () => {
					resolve(request.result.map((item) => this.deserializeAction(item)));
				};
			});
		} catch (error) {
			console.warn("Failed to load from IndexedDB:", error);
			return []; // Return empty array on failure
		}
	}

	// Clear database
	async clear(): Promise<void> {
		try {
			const db = await this.init();
			const transaction = db.transaction([this.STORE_NAME], "readwrite");
			const store = transaction.objectStore(this.STORE_NAME);
			const request = store.clear();

			return new Promise((resolve, reject) => {
				request.onerror = () => {
					reject(
						new Error(`Failed to clear database: ${request.error?.message}`),
					);
				};

				request.onsuccess = () => {
					resolve();
				};
			});
		} catch (error) {
			console.warn("Failed to clear IndexedDB:", error);
			throw error;
		}
	}

	// Serialize action for storage
	private serializeAction(action: OfflineAction): any {
		return {
			...action,
			metadata: {
				...action.metadata,
				createdAt: action.metadata?.createdAt,
				updatedAt: action.metadata?.updatedAt,
				lastError: action.metadata?.lastError,
			},
		};
	}

	// Deserialize action from storage
	private deserializeAction(item: unknown): OfflineAction {
		return {
			...item,
			metadata: {
				...item.metadata,
				createdAt: item.metadata?.createdAt,
				updatedAt: item.metadata?.updatedAt,
				lastError: item.metadata?.lastError,
			},
		};
	}

	// Close database connection
	async close(): Promise<void> {
		if (this.db) {
			this.db.close();
			this.db = null;
		}
	}
}

// LocalStoragePersistence - Fallback persistence using localStorage
export class LocalStoragePersistence implements QueuePersistence {
	constructor(private readonly storageKey: string = "offline_actions_queue") {}

	// Save actions to localStorage
	async save(actions: OfflineAction[]): Promise<void> {
		try {
			const serialized = actions.map((action) =>
				JSON.stringify(this.serializeAction(action)),
			);
			localStorage.setItem(this.storageKey, JSON.stringify(serialized));
		} catch (error) {
			console.warn("Failed to save to localStorage:", error);
			throw error;
		}
	}

	// Load actions from localStorage
	async load(): Promise<OfflineAction[]> {
		try {
			const serialized = localStorage.getItem(this.storageKey);
			if (!serialized) return [];

			const parsed = JSON.parse(serialized);
			if (!Array.isArray(parsed)) return [];

			return parsed.map((item) => this.deserializeAction(JSON.parse(item)));
		} catch (error) {
			console.warn("Failed to load from localStorage:", error);
			return []; // Return empty array on failure
		}
	}

	// Clear localStorage
	async clear(): Promise<void> {
		try {
			localStorage.removeItem(this.storageKey);
		} catch (error) {
			console.warn("Failed to clear localStorage:", error);
			throw error;
		}
	}

	// Serialize action for storage
	private serializeAction(action: OfflineAction): any {
		return {
			...action,
			metadata: {
				...action.metadata,
				createdAt: action.metadata?.createdAt,
				updatedAt: action.metadata?.updatedAt,
				lastError: action.metadata?.lastError,
			},
		};
	}

	// Deserialize action from storage
	private deserializeAction(item: unknown): OfflineAction {
		return {
			...item,
			metadata: {
				...item.metadata,
				createdAt: item.metadata?.createdAt,
				updatedAt: item.metadata?.updatedAt,
				lastError: item.metadata?.lastError,
			},
		};
	}
}

// HybridPersistence - Combines IndexedDB and localStorage with fallback
export class HybridPersistence implements QueuePersistence {
	private primaryPersistence: QueuePersistence;
	private fallbackPersistence: QueuePersistence;
	private useFallback: boolean = false;

	constructor(
		private readonly dbName: string = "ActionQueue",
		private readonly storageKey: string = "offline_actions_queue",
	) {
		this.primaryPersistence = new IndexedDBPersistence(dbName);
		this.fallbackPersistence = new LocalStoragePersistence(storageKey);

		// Test IndexedDB availability
		this.testIndexedDB();
	}

	// Test if IndexedDB is available
	private async testIndexedDB(): Promise<void> {
		try {
			const openRequest = indexedDB.open("__test_db", 1);

			openRequest.onerror = () => {
				this.useFallback = true;
			};

			openRequest.onsuccess = () => {
				const db = openRequest.result;
				db.close();
				indexedDB.deleteDatabase("__test_db");
			};
		} catch (_error) {
			this.useFallback = true;
		}
	}

	// Save actions
	async save(actions: OfflineAction[]): Promise<void> {
		try {
			const persistence = this.useFallback
				? this.fallbackPersistence
				: this.primaryPersistence;
			await persistence.save(actions);
		} catch (error) {
			// If primary persistence fails, try fallback
			if (!this.useFallback) {
				this.useFallback = true;
				try {
					await this.fallbackPersistence.save(actions);
				} catch (fallbackError) {
					console.warn(
						"Both primary and fallback persistence failed:",
						error,
						fallbackError,
					);
					throw fallbackError;
				}
			} else {
				throw error;
			}
		}
	}

	// Load actions
	async load(): Promise<OfflineAction[]> {
		try {
			const persistence = this.useFallback
				? this.fallbackPersistence
				: this.primaryPersistence;
			return await persistence.load();
		} catch (error) {
			// If primary persistence fails, try fallback
			if (!this.useFallback) {
				this.useFallback = true;
				try {
					return await this.fallbackPersistence.load();
				} catch (fallbackError) {
					console.warn(
						"Both primary and fallback persistence failed:",
						error,
						fallbackError,
					);
					return []; // Return empty array on failure
				}
			} else {
				throw error;
			}
		}
	}

	// Clear persistence
	async clear(): Promise<void> {
		try {
			const persistence = this.useFallback
				? this.fallbackPersistence
				: this.primaryPersistence;
			await persistence.clear();
		} catch (error) {
			// If primary persistence fails, try fallback
			if (!this.useFallback) {
				this.useFallback = true;
				try {
					await this.fallbackPersistence.clear();
				} catch (fallbackError) {
					console.warn(
						"Both primary and fallback persistence failed:",
						error,
						fallbackError,
					);
					throw fallbackError;
				}
			} else {
				throw error;
			}
		}
	}
}

export default HybridPersistence;
