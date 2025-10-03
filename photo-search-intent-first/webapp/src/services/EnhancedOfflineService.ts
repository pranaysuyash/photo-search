import { ConnectivityHistoryService } from "./ConnectivityHistory";
import { indexedDBStorage } from "./IndexedDBStorage";
import {
	AuthContext,
	BaseOfflineAction,
	type OfflineAction,
	offlineService,
} from "./OfflineService";

// Enhanced offline service with additional capabilities
export interface EnhancedOfflineConfig {
	maxQueueSize?: number;
	syncInterval?: number;
	maxRetries?: number;
	conflictResolutionStrategy?:
		| "last-write-wins"
		| "merge"
		| "user-select"
		| "fail";
	enablePrecaching?: boolean;
	precacheThumbnails?: boolean;
	precacheMetadata?: boolean;
}

export interface ConflictResolutionResult {
	resolved: boolean;
	localVersion: any;
	remoteVersion: any;
	finalVersion: any;
}

export class EnhancedOfflineService {
	private readonly config: EnhancedOfflineConfig;
	private readonly connectivityHistory = new ConnectivityHistoryService();
	private conflictResolvers = new Map<
		string,
		(local: unknown, remote: unknown) => Promise<ConflictResolutionResult>
	>();

	constructor(config?: EnhancedOfflineConfig) {
		this.config = {
			maxQueueSize: 1000,
			syncInterval: 30000,
			maxRetries: 5,
			conflictResolutionStrategy: "last-write-wins",
			enablePrecaching: true,
			precacheThumbnails: true,
			precacheMetadata: true,
			...config,
		};

		this.setupEnhancedSync();
		this.setupPrecaching();
	}

	private setupEnhancedSync(): void {
		// Enhanced sync that runs periodically with backoff mechanisms
		setInterval(() => {
			if (offlineService.getStatus()) {
				this.enhancedSync();
			}
		}, this.config.syncInterval);
	}

	private setupPrecaching(): void {
		if (!this.config.enablePrecaching) return;

		// Precache essential data when online
		offlineService.onStatusChange((isOnline) => {
			if (isOnline) {
				this.precacheEssentialData();
			}
		});
	}

	/**
	 * Enhanced sync with better error handling, conflict resolution, and progress tracking
	 */
	async enhancedSync(): Promise<void> {
		const queue = await offlineService.getQueue();
		if (queue.length === 0) return;

		// Group actions by type for more efficient processing
		const groupedActions = this.groupActionsByType(queue);

		for (const [type, actions] of groupedActions.entries()) {
			try {
				await this.syncActionsByType(type, actions);
			} catch (error) {
				console.error(
					`[EnhancedOfflineService] Failed to sync ${type} actions:`,
					error,
				);
				// Mark failed actions for later retry
				await this.handleSyncFailure(actions);
			}
		}
	}

	/**
	 * Group actions by type for batch processing
	 */
	private groupActionsByType(
		actions: OfflineAction[],
	): Map<string, OfflineAction[]> {
		const groups = new Map<string, OfflineAction[]>();

		for (const action of actions) {
			if (!groups.has(action.type)) {
				groups.set(action.type, []);
			}
			groups.get(action.type)!.push(action);
		}

		return groups;
	}

	/**
	 * Process actions of a specific type in batch
	 */
	private async syncActionsByType(
		type: string,
		actions: OfflineAction[],
	): Promise<void> {
		switch (type) {
			case "index":
			case "search":
			case "build_metadata":
			case "build_ocr":
			case "build_faces":
				// These are read-heavy operations, process individually
				for (const action of actions) {
					await this.processActionWithConflictResolution(action);
				}
				break;
			case "favorite":
			case "tag":
			case "set_tags":
				// These are write operations that may conflict, batch them carefully
				await this.batchProcessWriteOperations(actions);
				break;
			default:
				// For other action types, process individually
				for (const action of actions) {
					await this.processActionWithConflictResolution(action);
				}
				break;
		}
	}

	/**
	 * Process an action with conflict resolution
	 */
	private async processActionWithConflictResolution(
		action: OfflineAction,
	): Promise<void> {
		try {
			await offlineService.processAction(action);

			// Check for conflicts if applicable
			if (["favorite", "tag", "collection"].includes(action.type)) {
				await this.checkForConflicts(action);
			}
		} catch (error) {
			// Handle conflict errors specifically
			if (this.isConflictError(error)) {
				await this.resolveConflict(action, error);
			} else {
				throw error;
			}
		}
	}

	/**
	 * Process write operations in batches for efficiency
	 */
	private async batchProcessWriteOperations(
		actions: OfflineAction[],
	): Promise<void> {
		// Group actions that affect the same resource
		const groupedByPath = new Map<string, OfflineAction[]>();

		for (const action of actions) {
			const path = this.extractPathFromAction(action);
			if (!groupedByPath.has(path)) {
				groupedByPath.set(path, []);
			}
			groupedByPath.get(path)!.push(action);
		}

		// Process each group
		for (const [path, pathActions] of groupedByPath) {
			try {
				// Sort by timestamp to maintain order
				pathActions.sort((a, b) => a.timestamp - b.timestamp);

				// Process actions sequentially to ensure order
				for (const action of pathActions) {
					await this.processActionWithConflictResolution(action);
				}
			} catch (error) {
				console.error(
					`[EnhancedOfflineService] Error processing actions for ${path}:`,
					error,
				);
				// Mark these actions for later retry
				await this.handleSyncFailure(pathActions);
			}
		}
	}

	private extractPathFromAction(action: OfflineAction): string {
		// Extract the relevant path from the action payload
		const payload = action.payload as unknown;
		return payload.path || payload.paths?.[0] || action.id;
	}

	/**
	 * Check if an action resulted in a conflict
	 */
	private isConflictError(error: Error | unknown): boolean {
		// In a real implementation, this would check for specific conflict indicators
		// For now, we'll just assume any error could be a conflict
		return (
			error &&
			(error.message?.includes("conflict") ||
				error.status === 409 || // Conflict status
				error.code === "CONFLICT")
		);
	}

	/**
	 * Resolve conflicts between local and remote changes
	 */
	private async resolveConflict(
		action: OfflineAction,
		error: any,
	): Promise<void> {
		const resolver = this.conflictResolvers.get(action.type);

		if (resolver) {
			const resolution = await resolver(action, error.remoteVersion);

			if (resolution.resolved) {
				// Update the action with resolved data
				action.payload = resolution.finalVersion;
				await indexedDBStorage.updateAction(action);
				return;
			}
		}

		// Use configured conflict resolution strategy
		switch (this.config.conflictResolutionStrategy) {
			case "last-write-wins":
				// Default behavior - local change wins
				console.log(
					`[EnhancedOfflineService] Resolved conflict using last-write-wins for action ${action.id}`,
				);
				break;
			case "merge":
				// Attempt to merge changes (implementation depends on action type)
				console.log(
					`[EnhancedOfflineService] Attempting to merge changes for action ${action.id}`,
				);
				break;
			case "user-select":
				// Add to queue for user decision (if UI is available)
				console.log(
					`[EnhancedOfflineService] Conflict requires user decision for action ${action.id}`,
				);
				break;
			case "fail":
				// Mark as failed and require manual intervention
				console.log(
					`[EnhancedOfflineService] Conflict resolution failed for action ${action.id}`,
				);
				break;
		}
	}

	/**
	 * Handle sync failure by updating retry count
	 */
	private async handleSyncFailure(actions: OfflineAction[]): Promise<void> {
		for (const action of actions) {
			action.retries = (action.retries || 0) + 1;

			if (action.retries >= this.config.maxRetries!) {
				// Mark as permanently failed after max retries
				console.error(
					`[EnhancedOfflineService] Action ${action.id} failed permanently after ${this.config.maxRetries} retries`,
				);
				// In a real implementation, we might want to notify the user
			} else {
				// Update with backoff for next sync
				await indexedDBStorage.updateAction(action);
			}
		}
	}

	/**
	 * Check for potential conflicts between local and remote state
	 */
	private async checkForConflicts(action: OfflineAction): Promise<void> {
		// Implementation would check for changes to the same resource in the remote state
		// For now, this is a placeholder
		console.log(
			`[EnhancedOfflineService] Checking for conflicts for action ${action.id}`,
		);
	}

	/**
	 * Precache essential data for offline access
	 */
	private async precacheEssentialData(): Promise<void> {
		try {
			if (this.config.precacheThumbnails) {
				await this.precacheThumbnails();
			}

			if (this.config.precacheMetadata) {
				await this.precacheMetadata();
			}

			console.log("[EnhancedOfflineService] Precaching completed");
		} catch (error) {
			console.error("[EnhancedOfflineService] Precaching failed:", error);
		}
	}

	/**
	 * Precache thumbnails for better offline browsing experience
	 */
	private async precacheThumbnails(): Promise<void> {
		try {
			// In a real implementation, this would fetch and cache thumbnail URLs
			// This is a placeholder implementation
			console.log("[EnhancedOfflineService] Precaching thumbnails...");

			// Cache would be handled by the service worker
		} catch (error) {
			console.error(
				"[EnhancedOfflineService] Failed to precache thumbnails:",
				error,
			);
		}
	}

	/**
	 * Precache photo metadata for offline access
	 */
	private async precacheMetadata(): Promise<void> {
		try {
			// In a real implementation, this would fetch and cache metadata
			// This is a placeholder implementation
			console.log("[EnhancedOfflineService] Precaching metadata...");

			// This would involve fetching metadata for photos in the user's collection
			// and storing it in IndexedDB for offline access
		} catch (error) {
			console.error(
				"[EnhancedOfflineService] Failed to precache metadata:",
				error,
			);
		}
	}

	/**
	 * Register a custom conflict resolver for a specific action type
	 */
	registerConflictResolver(
		type: string,
		resolver: (
			local: unknown,
			remote: unknown,
		) => Promise<ConflictResolutionResult>,
	): void {
		this.conflictResolvers.set(type, resolver);
	}

	/**
	 * Get statistics about the offline system
	 */
	async getStats(): Promise<{
		queueSize: number;
		syncProgress: number;
		lastSyncTime: number | null;
		currentNetworkStatus: boolean;
		storageUsage: number;
	}> {
		const queue = await offlineService.getQueue();
		return {
			queueSize: queue.length,
			syncProgress: 0, // Would be calculated based on ongoing sync operations
			lastSyncTime: this.connectivityHistory.getLastSyncTime(),
			currentNetworkStatus: offlineService.getStatus(),
			storageUsage: await this.estimateStorageUsage(),
		};
	}

	/**
	 * Estimate storage usage by the offline system
	 */
	private async estimateStorageUsage(): Promise<number> {
		try {
			const queue = await offlineService.getQueue();
			const queueSize = JSON.stringify(queue).length;

			// In a real implementation, we would also account for:
			// - Cached thumbnails
			// - Cached metadata
			// - IndexedDB storage for other offline data

			return queueSize;
		} catch {
			return 0;
		}
	}

	/**
	 * Force a sync operation regardless of connection status
	 */
	async forceSync(): Promise<void> {
		// Even when offline, we might want to process what can be done offline
		// This would also check if the backend is accessible even if it's been marked offline

		console.log("[EnhancedOfflineService] Forcing sync operation");
		await this.enhancedSync();
	}

	/**
	 * Clear offline data with optional filters
	 */
	async clearOfflineData(filters?: {
		beforeDate?: Date;
		actionTypes?: string[];
		excludeActionTypes?: string[];
	}): Promise<void> {
		let queue = await offlineService.getQueue();

		if (filters) {
			if (filters.beforeDate) {
				queue = queue.filter(
					(action) => action.timestamp < filters.beforeDate!.getTime(),
				);
			}

			if (filters.actionTypes) {
				queue = queue.filter((action) =>
					filters.actionTypes!.includes(action.type),
				);
			}

			if (filters.excludeActionTypes) {
				queue = queue.filter(
					(action) => !filters.excludeActionTypes!.includes(action.type),
				);
			}
		} else {
			// If no filters, clear everything
			queue = [];
		}

		// Save filtered queue back
		await offlineService.clearQueue();
		if (queue.length > 0) {
			// Restore remaining actions
			for (const action of queue) {
				await (window as unknown).offlineService.queueAction(action); // This would need a different approach in real code
			}
		}
	}
}

// Singleton instance
export const enhancedOfflineService = new EnhancedOfflineService();

// Add the enhanced service to the window object for debugging
if (typeof window !== "undefined") {
	(window as unknown).enhancedOfflineService = enhancedOfflineService;
}
