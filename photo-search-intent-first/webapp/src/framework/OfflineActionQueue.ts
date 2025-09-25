/**
 * OfflineActionQueue - Provides offline-first action queuing and sync capabilities
 * This system queues actions when offline and automatically syncs them when online.
 */
import { v4 as uuidv4 } from "uuid";
import type { AppError } from "./EnhancedErrorHandling";
import { errorFactory } from "./EnhancedErrorHandling";

// Offline action types
export type OfflineActionType =
	| "SEARCH"
	| "INDEX"
	| "TAG"
	| "RATE"
	| "EXPORT"
	| "DELETE"
	| "MOVE"
	| "COPY"
	| "CREATE_COLLECTION"
	| "DELETE_COLLECTION"
	| "ADD_TO_COLLECTION"
	| "REMOVE_FROM_COLLECTION"
	| "SETTINGS_UPDATE"
	| "METADATA_UPDATE"
	| "OCR_PROCESS"
	| "CAPTION_GENERATE"
	| "FACE_RECOGNIZE"
	| "CUSTOM";

// Offline action status
export type OfflineActionStatus =
	| "QUEUED" // Action is waiting to be processed
	| "PROCESSING" // Action is currently being processed
	| "SYNCED" // Action has been successfully synced
	| "FAILED" // Action failed to process
	| "CANCELLED"; // Action was cancelled

// Offline action priority
export type OfflineActionPriority =
	| "LOW" // Can wait, low impact
	| "NORMAL" // Standard processing
	| "HIGH" // Important, should process soon
	| "CRITICAL"; // Urgent, must process immediately

// Offline action interface
export interface OfflineAction {
	id: string;
	type: OfflineActionType;
	status: OfflineActionStatus;
	priority: OfflineActionPriority;
	payload: Record<string, unknown>;
	context?: {
		userId?: string;
		sessionId?: string;
		deviceId?: string;
		timestamp: number;
		correlationId?: string;
		userAgent?: string;
		ipAddress?: string;
	};
	metadata?: {
		createdAt: number;
		updatedAt: number;
		retryCount: number;
		maxRetries: number;
		lastError?: {
			message: string;
			code?: string;
			timestamp: number;
			stack?: string;
		};
		estimatedExecutionTime?: number;
		requiresNetwork: boolean;
		requiresUserInteraction: boolean;
		conflictResolutionStrategy:
			| "last-write-wins"
			| "merge"
			| "user-select"
			| "fail";
	};
	dependencies?: string[]; // IDs of actions this action depends on
	groupId?: string; // For grouping related actions
	tags?: string[]; // Custom tags for filtering and categorization
}

// Queue persistence interface
export interface QueuePersistence {
	save: (actions: OfflineAction[]) => Promise<void>;
	load: () => Promise<OfflineAction[]>;
	clear: () => Promise<void>;
}

// Conflict resolver interface
export interface ConflictResolver {
	resolve: (
		local: OfflineAction,
		remote: OfflineAction,
	) => Promise<OfflineAction>;
}

// Default conflict resolver
const defaultConflictResolver: ConflictResolver = {
	resolve: async (
		local: OfflineAction,
		remote: OfflineAction,
	): Promise<OfflineAction> => {
		// By default, use last-write-wins strategy
		if (local.metadata?.updatedAt && remote.metadata?.updatedAt) {
			return local.metadata.updatedAt > remote.metadata.updatedAt
				? local
				: remote;
		}
		return local;
	},
};

// Offline action queue manager
export class OfflineActionQueue {
	private actions: Map<string, OfflineAction> = new Map();
	private groups: Map<string, Set<string>> = new Map();
	private dependencies: Map<string, Set<string>> = new Map();
	private persistence?: QueuePersistence;
	private conflictResolver: ConflictResolver = defaultConflictResolver;
	private maxRetries: number = 3;
	private isProcessing: boolean = false;
	private isOnline: boolean = true;
	private networkChangeListeners: Array<(isOnline: boolean) => void> = [];
	private actionProcessors: Map<
		OfflineActionType,
		(action: OfflineAction) => Promise<void>
	> = new Map();
	private queueChangeListeners: Array<(actions: OfflineAction[]) => void> = [];
	private syncInProgress = false;
	private syncIntervalId: NodeJS.Timeout | null = null;
	private syncInterval: number = 30000; // 30 seconds
	private maxQueueSize: number = 1000;

	constructor(options?: {
		persistence?: QueuePersistence;
		conflictResolver?: ConflictResolver;
		maxRetries?: number;
		syncInterval?: number;
		maxQueueSize?: number;
	}) {
		this.persistence = options?.persistence;
		this.conflictResolver =
			options?.conflictResolver || defaultConflictResolver;
		this.maxRetries = options?.maxRetries || 3;
		this.syncInterval = options?.syncInterval || 30000;
		this.maxQueueSize = options?.maxQueueSize || 1000;

		// Initialize from persistence if available
		this.initializeFromPersistence();

		// Setup periodic sync
		this.setupPeriodicSync();

		// Monitor network status
		this.monitorNetworkStatus();
	}

	// Initialize from persistence
	private async initializeFromPersistence(): Promise<void> {
		if (!this.persistence) return;

		try {
			const persistedActions = await this.persistence.load();
			persistedActions.forEach((action) => {
				this.actions.set(action.id, action);

				// Rebuild groups
				if (action.groupId) {
					if (!this.groups.has(action.groupId)) {
						this.groups.set(action.groupId, new Set());
					}
					this.groups.get(action.groupId)!.add(action.id);
				}

				// Rebuild dependencies
				if (action.dependencies && action.dependencies.length > 0) {
					action.dependencies.forEach((depId) => {
						if (!this.dependencies.has(depId)) {
							this.dependencies.set(depId, new Set());
						}
						this.dependencies.get(depId)!.add(action.id);
					});
				}
			});

			this.notifyQueueChangeListeners();
		} catch (error) {
			console.warn("Failed to initialize from persistence:", error);
		}
	}

	// Setup periodic sync
	private setupPeriodicSync(): void {
		if (this.syncIntervalId) {
			clearInterval(this.syncIntervalId);
		}

		this.syncIntervalId = setInterval(() => {
			this.sync();
		}, this.syncInterval);
	}

	// Monitor network status
	private monitorNetworkStatus(): void {
		const updateOnlineStatus = () => {
			const wasOnline = this.isOnline;
			this.isOnline = navigator.onLine;

			if (wasOnline !== this.isOnline) {
				this.networkChangeListeners.forEach((listener) =>
					listener(this.isOnline),
				);

				// If we're back online, trigger sync
				if (this.isOnline) {
					this.sync();
				}
			}
		};

		window.addEventListener("online", updateOnlineStatus);
		window.addEventListener("offline", updateOnlineStatus);

		// Initial check
		updateOnlineStatus();
	}

	// Add a processor for a specific action type
	addProcessor(
		type: OfflineActionType,
		processor: (action: OfflineAction) => Promise<void>,
	): void {
		this.actionProcessors.set(type, processor);
	}

	// Remove a processor
	removeProcessor(type: OfflineActionType): void {
		this.actionProcessors.delete(type);
	}

	// Create and queue an action
	async createAction(
		type: OfflineActionType,
		payload: Record<string, unknown>,
		options?: {
			priority?: OfflineActionPriority;
			dependencies?: string[];
			groupId?: string;
			tags?: string[];
			requiresNetwork?: boolean;
			requiresUserInteraction?: boolean;
			conflictResolutionStrategy?:
				| "last-write-wins"
				| "merge"
				| "user-select"
				| "fail";
			maxRetries?: number;
		},
	): Promise<string> {
		// Check queue size limit
		if (this.actions.size >= this.maxQueueSize) {
			throw errorFactory.resourceLimitError(
				`Action queue is at capacity (${this.maxQueueSize}). Cannot add more actions.`,
				{ queueSize: this.actions.size },
			);
		}

		const now = Date.now();
		const action: OfflineAction = {
			id: uuidv4(),
			type,
			status: "QUEUED",
			priority: options?.priority || "NORMAL",
			payload,
			context: {
				userId: this.getUserId(),
				sessionId: this.getSessionId(),
				deviceId: this.getDeviceId(),
				timestamp: now,
				correlationId: this.getCorrelationId(),
				userAgent: navigator.userAgent,
				ipAddress: await this.getIpAddress(),
			},
			metadata: {
				createdAt: now,
				updatedAt: now,
				retryCount: 0,
				maxRetries: options?.maxRetries || this.maxRetries,
				requiresNetwork: options?.requiresNetwork ?? true,
				requiresUserInteraction: options?.requiresUserInteraction ?? false,
				conflictResolutionStrategy:
					options?.conflictResolutionStrategy || "last-write-wins",
			},
			dependencies: options?.dependencies,
			groupId: options?.groupId,
			tags: options?.tags,
		};

		// Add to queue
		this.actions.set(action.id, action);

		// Add to groups
		if (action.groupId) {
			if (!this.groups.has(action.groupId)) {
				this.groups.set(action.groupId, new Set());
			}
			this.groups.get(action.groupId)!.add(action.id);
		}

		// Add dependencies
		if (action.dependencies && action.dependencies.length > 0) {
			action.dependencies.forEach((depId) => {
				if (!this.dependencies.has(depId)) {
					this.dependencies.set(depId, new Set());
				}
				this.dependencies.get(depId)!.add(action.id);
			});
		}

		// Notify listeners
		this.notifyQueueChangeListeners();

		// Persist if persistence is available
		if (this.persistence) {
			try {
				await this.persistence.save(Array.from(this.actions.values()));
			} catch (error) {
				console.warn("Failed to persist action to storage:", error);
			}
		}

		// If online, process immediately
		if (this.isOnline) {
			this.processNextAction();
		}

		return action.id;
	}

	// Process the next action in the queue
	private async processNextAction(): Promise<void> {
		if (this.isProcessing || this.syncInProgress) {
			return;
		}

		this.isProcessing = true;

		try {
			// Get next action to process
			const nextAction = await this.getNextAction();
			if (!nextAction) {
				this.isProcessing = false;
				return;
			}

			// Update action status
			nextAction.status = "PROCESSING";
			nextAction.metadata!.updatedAt = Date.now();
			this.actions.set(nextAction.id, nextAction);
			this.notifyQueueChangeListeners();

			// Process the action
			await this.processAction(nextAction);

			// Mark as synced if successful
			nextAction.status = "SYNCED";
			nextAction.metadata!.updatedAt = Date.now();
			this.actions.set(nextAction.id, nextAction);
			this.notifyQueueChangeListeners();

			// Persist changes
			if (this.persistence) {
				try {
					await this.persistence.save(Array.from(this.actions.values()));
				} catch (error) {
					console.warn("Failed to persist action to storage:", error);
				}
			}
		} catch (error) {
			console.warn("Failed to process action:", error);
		} finally {
			this.isProcessing = false;
			this.processNextAction(); // Process next action
		}
	}

	// Get the next action to process
	private async getNextAction(): Promise<OfflineAction | null> {
		// Filter actions that are queued
		const queuedActions = Array.from(this.actions.values()).filter(
			(action) => action.status === "QUEUED",
		);

		if (queuedActions.length === 0) {
			return null;
		}

		// If offline, only process actions that don't require network
		if (!this.isOnline) {
			const offlineReadyActions = queuedActions.filter(
				(action) => !action.metadata?.requiresNetwork,
			);
			if (offlineReadyActions.length === 0) {
				return null;
			}
			queuedActions.splice(0, queuedActions.length, ...offlineReadyActions);
		}

		// Sort by priority and creation date
		queuedActions.sort((a, b) => {
			// Priority order: CRITICAL > HIGH > NORMAL > LOW
			const priorityOrder: Record<OfflineActionPriority, number> = {
				CRITICAL: 0,
				HIGH: 1,
				NORMAL: 2,
				LOW: 3,
			};

			const priorityDiff =
				priorityOrder[a.priority] - priorityOrder[b.priority];
			if (priorityDiff !== 0) return priorityDiff;

			return a.metadata!.createdAt - b.metadata!.createdAt;
		});

		// Check dependencies
		for (const action of queuedActions) {
			if (action.dependencies && action.dependencies.length > 0) {
				// Check if all dependencies are synced
				const allDependenciesSynced = action.dependencies.every((depId) => {
					const dep = this.actions.get(depId);
					return dep && dep.status === "SYNCED";
				});

				if (!allDependenciesSynced) {
					continue; // Skip actions with unsynced dependencies
				}
			}

			return action;
		}

		return null;
	}

	// Process a specific action
	private async processAction(action: OfflineAction): Promise<void> {
		const processor = this.actionProcessors.get(action.type);
		if (!processor) {
			throw errorFactory.unknownError(
				`No processor registered for action type: ${action.type}`,
				{ actionType: action.type },
			);
		}

		try {
			await processor(action);
		} catch (error) {
			// Handle retry logic
			if (action.metadata!.retryCount < action.metadata!.maxRetries) {
				action.metadata!.retryCount++;
				action.metadata!.updatedAt = Date.now();
				action.status = "QUEUED"; // Reset status to queued for retry
				this.actions.set(action.id, action);

				// Exponential backoff
				const backoffDelay = 2 ** action.metadata!.retryCount * 1000;
				await new Promise((resolve) => setTimeout(resolve, backoffDelay));

				throw error; // Re-throw to retry
			} else {
				// Max retries exceeded, mark as failed
				action.status = "FAILED";
				action.metadata!.updatedAt = Date.now();
				action.metadata!.lastError = {
					message: error instanceof Error ? error.message : String(error),
					code: (error as unknown).code || "UNKNOWN",
					timestamp: Date.now(),
					stack: error instanceof Error ? error.stack : undefined,
				};
				this.actions.set(action.id, action);
				throw error;
			}
		}
	}

	// Sync with remote server
	async sync(): Promise<void> {
		if (this.syncInProgress || !this.isOnline) {
			return;
		}

		this.syncInProgress = true;

		try {
			// Get all synced actions to send to server
			const syncedActions = Array.from(this.actions.values()).filter(
				(action) => action.status === "SYNCED",
			);

			if (syncedActions.length === 0) {
				return;
			}

			// Send to server (implementation would depend on your API)
			// await this.sendToServer(syncedActions);

			// Remove synced actions from queue after successful server sync
			syncedActions.forEach((action) => {
				this.actions.delete(action.id);

				// Remove from groups
				if (action.groupId) {
					const group = this.groups.get(action.groupId);
					if (group) {
						group.delete(action.id);
						if (group.size === 0) {
							this.groups.delete(action.groupId);
						}
					}
				}

				// Remove from dependencies
				if (action.dependencies && action.dependencies.length > 0) {
					action.dependencies.forEach((depId) => {
						const dependents = this.dependencies.get(depId);
						if (dependents) {
							dependents.delete(action.id);
							if (dependents.size === 0) {
								this.dependencies.delete(depId);
							}
						}
					});
				}
			});

			// Notify listeners
			this.notifyQueueChangeListeners();

			// Persist changes
			if (this.persistence) {
				try {
					await this.persistence.save(Array.from(this.actions.values()));
				} catch (error) {
					console.warn("Failed to persist queue to storage:", error);
				}
			}
		} catch (error) {
			console.warn("Failed to sync with server:", error);
			throw error;
		} finally {
			this.syncInProgress = false;
		}
	}

	// Get actions by various filters
	getActions(filters?: {
		type?: OfflineActionType | OfflineActionType[];
		status?: OfflineActionStatus | OfflineActionStatus[];
		priority?: OfflineActionPriority | OfflineActionPriority[];
		groupId?: string;
		tags?: string | string[];
		before?: Date;
		after?: Date;
	}): OfflineAction[] {
		let actions = Array.from(this.actions.values());

		if (filters) {
			if (filters.type) {
				const types = Array.isArray(filters.type)
					? filters.type
					: [filters.type];
				actions = actions.filter((action) => types.includes(action.type));
			}

			if (filters.status) {
				const statuses = Array.isArray(filters.status)
					? filters.status
					: [filters.status];
				actions = actions.filter((action) => statuses.includes(action.status));
			}

			if (filters.priority) {
				const priorities = Array.isArray(filters.priority)
					? filters.priority
					: [filters.priority];
				actions = actions.filter((action) =>
					priorities.includes(action.priority),
				);
			}

			if (filters.groupId) {
				actions = actions.filter(
					(action) => action.groupId === filters.groupId,
				);
			}

			if (filters.tags) {
				const tags = Array.isArray(filters.tags)
					? filters.tags
					: [filters.tags];
				actions = actions.filter(
					(action) =>
						action.tags && action.tags.some((tag) => tags.includes(tag)),
				);
			}

			if (filters.before) {
				actions = actions.filter(
					(action) =>
						action.metadata &&
						new Date(action.metadata.createdAt) < filters.before!,
				);
			}

			if (filters.after) {
				actions = actions.filter(
					(action) =>
						action.metadata &&
						new Date(action.metadata.createdAt) > filters.after!,
				);
			}
		}

		return actions;
	}

	// Get action by ID
	getActionById(id: string): OfflineAction | undefined {
		return this.actions.get(id);
	}

	// Update action status
	updateActionStatus(
		id: string,
		status: OfflineActionStatus,
		error?: AppError,
	): void {
		const action = this.actions.get(id);
		if (!action) return;

		action.status = status;
		action.metadata!.updatedAt = Date.now();

		if (error) {
			action.metadata!.lastError = {
				message: error.message,
				code: error.code,
				timestamp: Date.now(),
				stack: error.stack,
			};
		}

		this.actions.set(id, action);
		this.notifyQueueChangeListeners();

		// Persist if persistence is available
		if (this.persistence) {
			this.persistence
				.save(Array.from(this.actions.values()))
				.catch((error) => {
					console.warn("Failed to persist action status update:", error);
				});
		}
	}

	// Cancel action
	async cancelAction(id: string): Promise<void> {
		const action = this.actions.get(id);
		if (!action) return;

		action.status = "CANCELLED";
		action.metadata!.updatedAt = Date.now();
		this.actions.set(id, action);
		this.notifyQueueChangeListeners();

		// Persist if persistence is available
		if (this.persistence) {
			try {
				await this.persistence.save(Array.from(this.actions.values()));
			} catch (error) {
				console.warn("Failed to persist action cancellation:", error);
			}
		}
	}

	// Retry failed action
	async retryAction(id: string): Promise<void> {
		const action = this.actions.get(id);
		if (!action || action.status !== "FAILED") return;

		action.status = "QUEUED";
		action.metadata!.retryCount = 0;
		action.metadata!.lastError = undefined;
		action.metadata!.updatedAt = Date.now();
		this.actions.set(id, action);
		this.notifyQueueChangeListeners();

		// Persist if persistence is available
		if (this.persistence) {
			try {
				await this.persistence.save(Array.from(this.actions.values()));
			} catch (error) {
				console.warn("Failed to persist action retry:", error);
			}
		}

		// Process if online
		if (this.isOnline) {
			this.processNextAction();
		}
	}

	// Clear completed actions
	clearCompleted(before?: Date): void {
		const completedActions = Array.from(this.actions.values()).filter(
			(action) => action.status === "SYNCED" || action.status === "CANCELLED",
		);

		if (before) {
			completedActions
				.filter(
					(action) =>
						action.metadata && new Date(action.metadata.updatedAt) < before,
				)
				.forEach((action) => {
					this.actions.delete(action.id);

					// Remove from groups
					if (action.groupId) {
						const group = this.groups.get(action.groupId);
						if (group) {
							group.delete(action.id);
							if (group.size === 0) {
								this.groups.delete(action.groupId);
							}
						}
					}

					// Remove from dependencies
					if (action.dependencies && action.dependencies.length > 0) {
						action.dependencies.forEach((depId) => {
							const dependents = this.dependencies.get(depId);
							if (dependents) {
								dependents.delete(action.id);
								if (dependents.size === 0) {
									this.dependencies.delete(depId);
								}
							}
						});
					}
				});
		} else {
			completedActions.forEach((action) => {
				this.actions.delete(action.id);

				// Remove from groups
				if (action.groupId) {
					const group = this.groups.get(action.groupId);
					if (group) {
						group.delete(action.id);
						if (group.size === 0) {
							this.groups.delete(action.groupId);
						}
					}
				}

				// Remove from dependencies
				if (action.dependencies && action.dependencies.length > 0) {
					action.dependencies.forEach((depId) => {
						const dependents = this.dependencies.get(depId);
						if (dependents) {
							dependents.delete(action.id);
							if (dependents.size === 0) {
								this.dependencies.delete(depId);
							}
						}
					});
				}
			});
		}

		this.notifyQueueChangeListeners();

		// Persist if persistence is available
		if (this.persistence) {
			this.persistence
				.save(Array.from(this.actions.values()))
				.catch((error) => {
					console.warn(
						"Failed to persist queue after clearing completed actions:",
						error,
					);
				});
		}
	}

	// Clear failed actions
	clearFailed(before?: Date): void {
		const failedActions = Array.from(this.actions.values()).filter(
			(action) => action.status === "FAILED",
		);

		if (before) {
			failedActions
				.filter(
					(action) =>
						action.metadata && new Date(action.metadata.updatedAt) < before,
				)
				.forEach((action) => {
					this.actions.delete(action.id);

					// Remove from groups
					if (action.groupId) {
						const group = this.groups.get(action.groupId);
						if (group) {
							group.delete(action.id);
							if (group.size === 0) {
								this.groups.delete(action.groupId);
							}
						}
					}

					// Remove from dependencies
					if (action.dependencies && action.dependencies.length > 0) {
						action.dependencies.forEach((depId) => {
							const dependents = this.dependencies.get(depId);
							if (dependents) {
								dependents.delete(action.id);
								if (dependents.size === 0) {
									this.dependencies.delete(depId);
								}
							}
						});
					}
				});
		} else {
			failedActions.forEach((action) => {
				this.actions.delete(action.id);

				// Remove from groups
				if (action.groupId) {
					const group = this.groups.get(action.groupId);
					if (group) {
						group.delete(action.id);
						if (group.size === 0) {
							this.groups.delete(action.groupId);
						}
					}
				}

				// Remove from dependencies
				if (action.dependencies && action.dependencies.length > 0) {
					action.dependencies.forEach((depId) => {
						const dependents = this.dependencies.get(depId);
						if (dependents) {
							dependents.delete(action.id);
							if (dependents.size === 0) {
								this.dependencies.delete(depId);
							}
						}
					});
				}
			});
		}

		this.notifyQueueChangeListeners();

		// Persist if persistence is available
		if (this.persistence) {
			this.persistence
				.save(Array.from(this.actions.values()))
				.catch((error) => {
					console.warn(
						"Failed to persist queue after clearing failed actions:",
						error,
					);
				});
		}
	}

	// Get queue statistics
	getStatistics(): {
		total: number;
		queued: number;
		processing: number;
		synced: number;
		failed: number;
		cancelled: number;
		byType: Record<OfflineActionType, number>;
		byPriority: Record<OfflineActionPriority, number>;
		oldestQueued: number | null;
		newestQueued: number | null;
	} {
		const actions = Array.from(this.actions.values());

		const statistics = {
			total: actions.length,
			queued: actions.filter((a) => a.status === "QUEUED").length,
			processing: actions.filter((a) => a.status === "PROCESSING").length,
			synced: actions.filter((a) => a.status === "SYNCED").length,
			failed: actions.filter((a) => a.status === "FAILED").length,
			cancelled: actions.filter((a) => a.status === "CANCELLED").length,
			byType: {} as Record<OfflineActionType, number>,
			byPriority: {} as Record<OfflineActionPriority, number>,
			oldestQueued: null as number | null,
			newestQueued: null as number | null,
		};

		// Count by type
		actions.forEach((action) => {
			if (!statistics.byType[action.type]) {
				statistics.byType[action.type] = 0;
			}
			statistics.byType[action.type]++;

			// Count by priority
			if (!statistics.byPriority[action.priority]) {
				statistics.byPriority[action.priority] = 0;
			}
			statistics.byPriority[action.priority]++;
		});

		// Find oldest and newest queued actions
		const queuedActions = actions.filter((a) => a.status === "QUEUED");
		if (queuedActions.length > 0) {
			const timestamps = queuedActions.map((a) => a.metadata?.createdAt || 0);
			statistics.oldestQueued = Math.min(...timestamps);
			statistics.newestQueued = Math.max(...timestamps);
		}

		return statistics;
	}

	// Add network change listener
	addNetworkChangeListener(listener: (isOnline: boolean) => void): void {
		this.networkChangeListeners.push(listener);
	}

	// Remove network change listener
	removeNetworkChangeListener(listener: (isOnline: boolean) => void): void {
		const index = this.networkChangeListeners.indexOf(listener);
		if (index !== -1) {
			this.networkChangeListeners.splice(index, 1);
		}
	}

	// Add queue change listener
	addQueueChangeListener(listener: (actions: OfflineAction[]) => void): void {
		this.queueChangeListeners.push(listener);
	}

	// Remove queue change listener
	removeQueueChangeListener(
		listener: (actions: OfflineAction[]) => void,
	): void {
		const index = this.queueChangeListeners.indexOf(listener);
		if (index !== -1) {
			this.queueChangeListeners.splice(index, 1);
		}
	}

	// Notify queue change listeners
	private notifyQueueChangeListeners(): void {
		const actions = Array.from(this.actions.values());
		this.queueChangeListeners.forEach((listener) => {
			try {
				listener(actions);
			} catch (error) {
				console.warn("Queue change listener error:", error);
			}
		});
	}

	// Helper methods for getting context information
	private getUserId(): string | undefined {
		// Implementation would get user ID from authentication system
		return undefined;
	}

	private getSessionId(): string | undefined {
		// Implementation would get session ID from session management system
		return undefined;
	}

	private getDeviceId(): string | undefined {
		// Implementation would generate/get device ID
		return undefined;
	}

	private getCorrelationId(): string | undefined {
		// Implementation would generate correlation ID for tracing
		return undefined;
	}

	private async getIpAddress(): Promise<string | undefined> {
		// Implementation would get IP address (if needed and privacy compliant)
		return undefined;
	}

	// Cleanup method
	destroy(): void {
		if (this.syncIntervalId) {
			clearInterval(this.syncIntervalId);
			this.syncIntervalId = null;
		}

		// Remove event listeners
		this.networkChangeListeners = [];
		this.queueChangeListeners = [];
		this.actionProcessors.clear();
	}
}

// Singleton instance
let actionQueueInstance: OfflineActionQueue | undefined;

// Get singleton instance
export const getActionQueue = (options?: {
	persistence?: QueuePersistence;
	conflictResolver?: ConflictResolver;
	maxRetries?: number;
	syncInterval?: number;
	maxQueueSize?: number;
}): OfflineActionQueue => {
	if (!actionQueueInstance) {
		actionQueueInstance = new OfflineActionQueue(options);
	}
	return actionQueueInstance;
};

// Hook for using the action queue in React components
export const useActionQueue = (): OfflineActionQueue => {
	const [queue] = React.useState(() => getActionQueue());
	return queue;
};

// Hook for getting queue statistics
export const useQueueStatistics = (): ReturnType<
	OfflineActionQueue["getStatistics"]
> => {
	const queue = useActionQueue();
	const [statistics, setStatistics] = React.useState(queue.getStatistics());

	React.useEffect(() => {
		const updateStatistics = () => {
			setStatistics(queue.getStatistics());
		};

		queue.addQueueChangeListener(updateStatistics);

		return () => {
			queue.removeQueueChangeListener(updateStatistics);
		};
	}, [queue]);

	return statistics;
};

// Hook for monitoring offline status
export const useOnlineStatus = (): boolean => {
	const queue = useActionQueue();
	const [isOnline, setIsOnline] = React.useState(queue.isOnline);

	React.useEffect(() => {
		const updateOnlineStatus = (online: boolean) => {
			setIsOnline(online);
		};

		queue.addNetworkChangeListener(updateOnlineStatus);

		return () => {
			queue.removeNetworkChangeListener(updateOnlineStatus);
		};
	}, [queue]);

	return isOnline;
};

export default OfflineActionQueue;
