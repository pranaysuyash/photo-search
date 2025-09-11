// Offline Service for managing offline functionality and sync
export interface OfflineAction {
	id: string;
	type: "search" | "collection" | "tag" | "delete";
	payload: any;
	timestamp: number;
	retries: number;
}

class OfflineService {
	private readonly QUEUE_KEY = "offline_action_queue";
	private readonly MAX_RETRIES = 3;
	private isOnline: boolean;
	private syncInProgress: boolean = false;
	private listeners: Set<(online: boolean) => void> = new Set();

	constructor() {
		this.isOnline = navigator.onLine;
		this.setupEventListeners();
		this.checkConnection();
	}

	private setupEventListeners() {
		window.addEventListener("online", () => this.handleOnline());
		window.addEventListener("offline", () => this.handleOffline());

		// Periodic connection check
		setInterval(() => this.checkConnection(), 30000);
	}

	private async checkConnection() {
		try {
			const response = await fetch("/api/ping", {
				method: "HEAD",
				cache: "no-cache",
			});
			this.setOnlineStatus(response.ok);
		} catch {
			this.setOnlineStatus(false);
		}
	}

	private setOnlineStatus(online: boolean) {
		if (this.isOnline !== online) {
			this.isOnline = online;
			this.notifyListeners(online);

			if (online) {
				this.syncQueue();
			}
		}
	}

	private handleOnline() {
		console.log("[Offline Service] Connection restored");
		this.setOnlineStatus(true);
	}

	private handleOffline() {
		console.log("[Offline Service] Connection lost");
		this.setOnlineStatus(false);
	}

	private notifyListeners(online: boolean) {
		this.listeners.forEach((listener) => listener(online));
	}

	// Public API
	public onStatusChange(callback: (online: boolean) => void) {
		this.listeners.add(callback);
		return () => {
			this.listeners.delete(callback);
		};
	}

	public getStatus(): boolean {
		return this.isOnline;
	}

	public async queueAction(
		action: Omit<OfflineAction, "id" | "timestamp" | "retries">,
	) {
		const queuedAction: OfflineAction = {
			...action,
			id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			timestamp: Date.now(),
			retries: 0,
		};

		const queue = this.getQueue();
		queue.push(queuedAction);
		this.saveQueue(queue);

		// Try to sync immediately if online
		if (this.isOnline) {
			this.syncQueue();
		}

		return queuedAction.id;
	}

	private getQueue(): OfflineAction[] {
		try {
			const stored = localStorage.getItem(this.QUEUE_KEY);
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	}

	private saveQueue(queue: OfflineAction[]) {
		try {
			localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
		} catch (error) {
			console.error("[Offline Service] Failed to save queue:", error);
		}
	}

	public async syncQueue() {
		if (!this.isOnline || this.syncInProgress) {
			return;
		}

		this.syncInProgress = true;
		const queue = this.getQueue();
		const remaining: OfflineAction[] = [];

		for (const action of queue) {
			try {
				await this.processAction(action);
				console.log(`[Offline Service] Synced action: ${action.id}`);
			} catch (error) {
				console.error(
					`[Offline Service] Failed to sync action: ${action.id}`,
					error,
				);
				action.retries++;

				if (action.retries < this.MAX_RETRIES) {
					remaining.push(action);
				} else {
					console.error(
						`[Offline Service] Max retries reached for action: ${action.id}`,
					);
				}
			}
		}

		this.saveQueue(remaining);
		this.syncInProgress = false;

		if (remaining.length > 0) {
			// Retry failed actions after delay
			setTimeout(() => this.syncQueue(), 60000);
		}
	}

	private async processAction(action: OfflineAction): Promise<void> {
		const { apiSearch, apiSetCollection, apiBatchTag, apiBatchDelete } =
			await import("../api");

		switch (action.type) {
			case "search":
				await apiSearch(
					action.payload.dir,
					action.payload.query,
					action.payload.topK,
				);
				break;

			case "collection":
				await apiSetCollection(
					action.payload.dir,
					action.payload.name,
					action.payload.paths,
				);
				break;

			case "tag":
				await apiBatchTag(
					action.payload.dir,
					action.payload.paths,
					action.payload.tags,
					action.payload.operation,
				);
				break;

			case "delete":
				await apiBatchDelete(
					action.payload.dir,
					action.payload.paths,
					action.payload.useOsTrash,
				);
				break;

			default:
				throw new Error(`Unknown action type: ${action.type}`);
		}
	}

	// Cache management
	public async precacheImages(urls: string[]) {
		if (!("caches" in window)) {
			return;
		}

		try {
			const cache = await caches.open("photovault-images");
			await cache.addAll(urls);
		} catch (error) {
			console.error("[Offline Service] Failed to precache images:", error);
		}
	}

	public async getCachedImage(url: string): Promise<Response | null> {
		if (!("caches" in window)) {
			return null;
		}

		try {
			const cache = await caches.open("photovault-images");
			const response = await cache.match(url);
			return response || null;
		} catch {
			return null;
		}
	}

	// Background sync registration
	public async registerBackgroundSync(tag: string) {
		if (
			!("serviceWorker" in navigator) ||
			!("sync" in ServiceWorkerRegistration.prototype)
		) {
			return;
		}

		try {
			const registration = await navigator.serviceWorker.ready;
			await (registration as any).sync.register(tag);
			console.log(`[Offline Service] Background sync registered: ${tag}`);
		} catch (error) {
			console.error(
				"[Offline Service] Failed to register background sync:",
				error,
			);
		}
	}

	// Clear all offline data
	public async clearOfflineData() {
		// Clear queue
		localStorage.removeItem(this.QUEUE_KEY);

		// Clear caches
		if ("caches" in window) {
			const cacheNames = await caches.keys();
			await Promise.all(
				cacheNames
					.filter((name) => name.startsWith("photovault-"))
					.map((name) => caches.delete(name)),
			);
		}

		console.log("[Offline Service] Offline data cleared");
	}
}

export const offlineService = new OfflineService();
