/**
 * useOfflineActionQueue - React hook for managing offline actions
 * This hook provides a convenient way to interact with the offline action queue
 * from React components.
 */
import React from "react";
import type {
	OfflineAction,
	OfflineActionStatus,
	OfflineActionType,
} from "./OfflineActionQueue";
import {
	getActionQueue,
	type OfflineActionQueue,
	useOnlineStatus,
	useQueueStatistics,
} from "./OfflineActionQueue";
import { HybridPersistence } from "./QueuePersistence";

// Hook return type
interface UseOfflineActionQueueReturn {
	// Queue instance
	queue: OfflineActionQueue;

	// Online status
	isOnline: boolean;

	// Queue statistics
	statistics: ReturnType<OfflineActionQueue["getStatistics"]>;

	// Action management
	createAction: (
		type: OfflineActionType,
		payload: Record<string, unknown>,
		options?: {
			priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
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
	) => Promise<string>;

	// Action retrieval
	getActions: (filters?: {
		type?: OfflineActionType | OfflineActionType[];
		status?: OfflineActionStatus | OfflineActionStatus[];
		priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
		groupId?: string;
		tags?: string | string[];
		before?: Date;
		after?: Date;
	}) => OfflineAction[];

	getActionById: (id: string) => OfflineAction | undefined;

	// Action status management
	updateActionStatus: (
		id: string,
		status: OfflineActionStatus,
		error?: Error,
	) => void;
	cancelAction: (id: string) => Promise<void>;
	retryAction: (id: string) => Promise<void>;

	// Queue management
	clearCompleted: (before?: Date) => void;
	clearFailed: (before?: Date) => void;
	sync: () => Promise<void>;

	// Queue processors
	addProcessor: (
		type: OfflineActionType,
		processor: (action: OfflineAction) => Promise<void>,
	) => void;
	removeProcessor: (type: OfflineActionType) => void;

	// Event listeners
	addNetworkChangeListener: (listener: (isOnline: boolean) => void) => void;
	removeNetworkChangeListener: (listener: (isOnline: boolean) => void) => void;
	addQueueChangeListener: (
		listener: (actions: OfflineAction[]) => void,
	) => void;
	removeQueueChangeListener: (
		listener: (actions: OfflineAction[]) => void,
	) => void;
}

// Global queue instance
let globalQueue: OfflineActionQueue | undefined;

// Get global queue instance
const getGlobalQueue = (): OfflineActionQueue => {
	if (!globalQueue) {
		const persistence = new HybridPersistence(
			"PhotoSearchActionQueue",
			"photo_search_actions",
		);
		globalQueue = getActionQueue({ persistence });
	}
	return globalQueue;
};

// Hook for offline action queue
export const useOfflineActionQueue = (): UseOfflineActionQueueReturn => {
	const [queue] = React.useState<OfflineActionQueue>(() => getGlobalQueue());
	const statistics = useQueueStatistics();
	const isOnline = useOnlineStatus();

	// Create action
	const createAction = React.useCallback(
		(
			type: OfflineActionType,
			payload: Record<string, unknown>,
			options?: {
				priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
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
		) => {
			return queue.createAction(type, payload, options);
		},
		[queue],
	);

	// Get actions with filters
	const getActions = React.useCallback(
		(filters?: {
			type?: OfflineActionType | OfflineActionType[];
			status?: OfflineActionStatus | OfflineActionStatus[];
			priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
			groupId?: string;
			tags?: string | string[];
			before?: Date;
			after?: Date;
		}) => {
			return queue.getActions(filters);
		},
		[queue],
	);

	// Get action by ID
	const getActionById = React.useCallback(
		(id: string) => {
			return queue.getActionById(id);
		},
		[queue],
	);

	// Update action status
	const updateActionStatus = React.useCallback(
		(id: string, status: OfflineActionStatus, error?: Error) => {
			queue.updateActionStatus(id, status, error);
		},
		[queue],
	);

	// Cancel action
	const cancelAction = React.useCallback(
		async (id: string) => {
			return await queue.cancelAction(id);
		},
		[queue],
	);

	// Retry action
	const retryAction = React.useCallback(
		async (id: string) => {
			return await queue.retryAction(id);
		},
		[queue],
	);

	// Clear completed actions
	const clearCompleted = React.useCallback(
		(before?: Date) => {
			queue.clearCompleted(before);
		},
		[queue],
	);

	// Clear failed actions
	const clearFailed = React.useCallback(
		(before?: Date) => {
			queue.clearFailed(before);
		},
		[queue],
	);

	// Sync with server
	const sync = React.useCallback(async () => {
		return await queue.sync();
	}, [queue]);

	// Add processor
	const addProcessor = React.useCallback(
		(
			type: OfflineActionType,
			processor: (action: OfflineAction) => Promise<void>,
		) => {
			queue.addProcessor(type, processor);
		},
		[queue],
	);

	// Remove processor
	const removeProcessor = React.useCallback(
		(type: OfflineActionType) => {
			queue.removeProcessor(type);
		},
		[queue],
	);

	// Add network change listener
	const addNetworkChangeListener = React.useCallback(
		(listener: (isOnline: boolean) => void) => {
			queue.addNetworkChangeListener(listener);
		},
		[queue],
	);

	// Remove network change listener
	const removeNetworkChangeListener = React.useCallback(
		(listener: (isOnline: boolean) => void) => {
			queue.removeNetworkChangeListener(listener);
		},
		[queue],
	);

	// Add queue change listener
	const addQueueChangeListener = React.useCallback(
		(listener: (actions: OfflineAction[]) => void) => {
			queue.addQueueChangeListener(listener);
		},
		[queue],
	);

	// Remove queue change listener
	const removeQueueChangeListener = React.useCallback(
		(listener: (actions: OfflineAction[]) => void) => {
			queue.removeQueueChangeListener(listener);
		},
		[queue],
	);

	return {
		queue,
		isOnline,
		statistics,
		createAction,
		getActions,
		getActionById,
		updateActionStatus,
		cancelAction,
		retryAction,
		clearCompleted,
		clearFailed,
		sync,
		addProcessor,
		removeProcessor,
		addNetworkChangeListener,
		removeNetworkChangeListener,
		addQueueChangeListener,
		removeQueueChangeListener,
	};
};

// Hook for monitoring specific action types
export const useActionMonitor = (
	actionTypes: OfflineActionType[],
	statuses?: OfflineActionStatus[],
): OfflineAction[] => {
	const { getActions, addQueueChangeListener, removeQueueChangeListener } =
		useOfflineActionQueue();
	const [actions, setActions] = React.useState<OfflineAction[]>([]);

	React.useEffect(() => {
		const updateActions = () => {
			const filteredActions = getActions({
				type: actionTypes,
				status: statuses,
			});
			setActions(filteredActions);
		};

		// Initial load
		updateActions();

		// Listen for queue changes
		addQueueChangeListener(updateActions);

		return () => {
			removeQueueChangeListener(updateActions);
		};
	}, [
		getActions,
		addQueueChangeListener,
		removeQueueChangeListener,
		actionTypes,
		statuses,
	]);

	return actions;
};

// Hook for monitoring queue size
export const useQueueSize = (): number => {
	const { statistics } = useOfflineActionQueue();
	return statistics.total;
};

// Hook for monitoring specific action status
export const useActionStatus = (
	actionId: string,
): OfflineActionStatus | undefined => {
	const { getActionById, addQueueChangeListener, removeQueueChangeListener } =
		useOfflineActionQueue();
	const [status, setStatus] = React.useState<OfflineActionStatus | undefined>();

	React.useEffect(() => {
		const updateStatus = () => {
			const action = getActionById(actionId);
			if (action) {
				setStatus(action.status);
			}
		};

		// Initial load
		updateStatus();

		// Listen for queue changes
		addQueueChangeListener(updateStatus);

		return () => {
			removeQueueChangeListener(updateStatus);
		};
	}, [
		getActionById,
		addQueueChangeListener,
		removeQueueChangeListener,
		actionId,
	]);

	return status;
};

// Hook for monitoring action progress
export const useActionProgress = (
	actionId: string,
): { progress: number; total: number } | undefined => {
	const { getActionById, addQueueChangeListener, removeQueueChangeListener } =
		useOfflineActionQueue();
	const [progress, setProgress] = React.useState<
		{ progress: number; total: number } | undefined
	>();

	React.useEffect(() => {
		const updateProgress = () => {
			const action = getActionById(actionId);
			if (
				action &&
				action.payload &&
				"progress" in action.payload &&
				"total" in action.payload
			) {
				setProgress({
					progress: action.payload.progress as number,
					total: action.payload.total as number,
				});
			} else if (action) {
				// For synced actions, assume 100% progress
				if (action.status === "SYNCED") {
					setProgress({ progress: 100, total: 100 });
				} else if (action.status === "FAILED") {
					setProgress({ progress: 0, total: 100 });
				}
			}
		};

		// Initial load
		updateProgress();

		// Listen for queue changes
		addQueueChangeListener(updateProgress);

		return () => {
			removeQueueChangeListener(updateProgress);
		};
	}, [
		getActionById,
		addQueueChangeListener,
		removeQueueChangeListener,
		actionId,
	]);

	return progress;
};

// Hook for monitoring action errors
export const useActionError = (actionId: string): string | undefined => {
	const { getActionById, addQueueChangeListener, removeQueueChangeListener } =
		useOfflineActionQueue();
	const [error, setError] = React.useState<string | undefined>();

	React.useEffect(() => {
		const updateError = () => {
			const action = getActionById(actionId);
			if (action && action.metadata?.lastError) {
				setError(action.metadata.lastError.message);
			} else {
				setError(undefined);
			}
		};

		// Initial load
		updateError();

		// Listen for queue changes
		addQueueChangeListener(updateError);

		return () => {
			removeQueueChangeListener(updateError);
		};
	}, [
		getActionById,
		addQueueChangeListener,
		removeQueueChangeListener,
		actionId,
	]);

	return error;
};

export default useOfflineActionQueue;
