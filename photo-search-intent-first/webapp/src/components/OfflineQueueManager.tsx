import { AlertCircle, RefreshCw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
	BatchAddToCollectionActionPayload,
	BuildFacesActionPayload,
	BuildMetadataActionPayload,
	BuildOCRAActionPayload,
	CollectionActionPayload,
	DeleteActionPayload,
	DeleteCollectionActionPayload,
	DeleteSavedSearchActionPayload,
	DeleteSmartCollectionActionPayload,
	FavoriteActionPayload,
	IndexActionPayload,
	OfflineAction,
	SavedSearchActionPayload,
	SearchActionPayload,
	SetTagsActionPayload,
	SmartCollectionActionPayload,
	TagActionPayload,
} from "../services/OfflineService";
import { offlineService } from "../services/OfflineService";

type QueueItem = OfflineAction;

export function OfflineQueueManager() {
	const [isOpen, setIsOpen] = useState(false);
	const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
	const [isSyncing, setIsSyncing] = useState(false);
	const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
	const modalRef = useRef<HTMLDivElement>(null);
	const closeBtnRef = useRef<HTMLButtonElement>(null);

	// Load queue items
	const loadQueueItems = useCallback(() => {
		offlineService
			.getQueue()
			.then((items) => setQueueItems(items))
			.catch((error) => {
				console.error("Failed to load queue items:", error);
				setQueueItems([]);
			});
	}, []);

	// Refresh queue items
	useEffect(() => {
		loadQueueItems();
		const interval = setInterval(loadQueueItems, 5000);
		return () => clearInterval(interval);
	}, [loadQueueItems]);

	// Close manager
	const closeManager = useCallback(() => {
		setIsOpen(false);
		setSelectedItems(new Set());
	}, []);

	// Handle keyboard events
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Close modal with Escape key
			if (e.key === "Escape" && isOpen && modalRef.current) {
				closeManager();
			}
		};

		if (isOpen) {
			window.addEventListener("keydown", handleKeyDown);
			// Focus the close button when modal opens
			setTimeout(() => {
				if (closeBtnRef.current) {
					closeBtnRef.current.focus();
				}
			}, 100);
		}

		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, closeManager]);

	// Toggle manager visibility
	const toggleManager = useCallback(() => {
		setIsOpen(!isOpen);
	}, [isOpen]);

	// Select/deselect item
	const toggleItemSelection = useCallback((id: string) => {
		setSelectedItems((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	}, []);

	// Select all items
	const selectAll = useCallback(() => {
		const allIds = new Set(queueItems.map((item) => item.id));
		setSelectedItems(allIds);
	}, [queueItems]);

	// Clear selection
	const clearSelection = useCallback(() => {
		setSelectedItems(new Set());
	}, []);

	// Remove selected items
	const removeSelected = useCallback(() => {
		// Get IDs of items to remove
		const idsToRemove = Array.from(selectedItems);

		// Remove from queue using OfflineService
		offlineService
			.cancelActions(idsToRemove)
			.then(() => {
				// Update local state
				const newQueue = queueItems.filter(
					(item) => !selectedItems.has(item.id),
				);
				setQueueItems(newQueue);
				setSelectedItems(new Set());
			})
			.catch((error) => {
				console.error("Failed to remove selected items:", error);
			});
	}, [queueItems, selectedItems]);

	// Retry selected items
	const retrySelected = useCallback(async () => {
		// This would trigger retry logic for selected items
		// For now, we'll just trigger a full sync
		setIsSyncing(true);
		try {
			await offlineService.syncQueue();
		} finally {
			setIsSyncing(false);
			loadQueueItems();
		}
	}, [loadQueueItems]);

	// Clear entire queue
	const clearQueue = useCallback(() => {
		offlineService
			.clearQueue()
			.then(() => {
				setQueueItems([]);
				setSelectedItems(new Set());
			})
			.catch((error) => {
				console.error("Failed to clear queue:", error);
			});
	}, []);

	// Format timestamp
	const formatTimestamp = useCallback((timestamp: number) => {
		return new Date(timestamp).toLocaleString();
	}, []);

	// Get item description
	const getItemDescription = useCallback((item: QueueItem) => {
		const type = item.type as string;
		const payload = item.payload;

		// Helper functions for different operation categories
		const getSearchDescription = (payload: SearchActionPayload) =>
			`Search: ${String(payload.query || "")}`;

		const getCollectionDescription = (
			payload: CollectionActionPayload,
			prefix: string,
		) => `${prefix} collection: ${String(payload.name || "")}`;

		const getDeleteCollectionDescription = (
			payload: DeleteCollectionActionPayload,
			prefix: string,
		) => `${prefix} collection: ${String(payload.name || "")}`;

		const getSmartCollectionDescription = (
			payload: SmartCollectionActionPayload,
			prefix: string,
		) => `${prefix} smart collection: ${String(payload.name || "")}`;

		const getDeleteSmartCollectionDescription = (
			payload: DeleteSmartCollectionActionPayload,
			prefix: string,
		) => `${prefix} smart collection: ${String(payload.name || "")}`;

		const getPathCountDescription = (
			payload: TagActionPayload | DeleteActionPayload,
			action: string,
		) => {
			const paths = Array.isArray(payload.paths) ? payload.paths : [];
			return `${action} ${paths.length} items`;
		};

		const getSinglePathDescription = (
			payload: SetTagsActionPayload | FavoriteActionPayload,
			action: string,
		) => `${action}: ${String(payload.path || "")}`;

		const getBuildDescription = (
			payload:
				| IndexActionPayload
				| BuildMetadataActionPayload
				| BuildOCRAActionPayload
				| BuildFacesActionPayload,
			buildType: string,
		) => `Build ${buildType} for ${String(payload.dir || "")}`;

		switch (type) {
			case "search":
				return getSearchDescription(payload as SearchActionPayload);
			case "collection":
				return getCollectionDescription(
					payload as CollectionActionPayload,
					"Update",
				);
			case "delete_collection":
				return getDeleteCollectionDescription(
					payload as DeleteCollectionActionPayload,
					"Delete",
				);
			case "smart_collection":
				return getSmartCollectionDescription(
					payload as SmartCollectionActionPayload,
					"Update",
				);
			case "delete_smart_collection":
				return getDeleteSmartCollectionDescription(
					payload as DeleteSmartCollectionActionPayload,
					"Delete",
				);
			case "tag":
				return getPathCountDescription(payload as TagActionPayload, "Tag");
			case "delete":
				return getPathCountDescription(
					payload as DeleteActionPayload,
					"Delete",
				);
			case "set_tags":
				return getSinglePathDescription(
					payload as SetTagsActionPayload,
					"Set tags on",
				);
			case "favorite":
				return getSinglePathDescription(
					payload as FavoriteActionPayload,
					"Favorite",
				);
			case "saved_search":
				return `Save search: ${String(
					(payload as SavedSearchActionPayload).name || "",
				)}`;
			case "delete_saved_search":
				return `Delete saved search: ${String(
					(payload as DeleteSavedSearchActionPayload).name || "",
				)}`;
			case "batch_add_to_collection": {
				const batchPayload = payload as BatchAddToCollectionActionPayload;
				const paths = Array.isArray(batchPayload.paths)
					? batchPayload.paths
					: [];
				return `Add ${paths.length} items to ${String(
					batchPayload.collectionName || "",
				)}`;
			}
			case "index":
				return getBuildDescription(payload as IndexActionPayload, "index");
			case "build_metadata":
				return getBuildDescription(
					payload as BuildMetadataActionPayload,
					"metadata",
				);
			case "build_ocr":
				return getBuildDescription(payload as BuildOCRAActionPayload, "OCR");
			case "build_faces":
				return getBuildDescription(payload as BuildFacesActionPayload, "faces");
			default:
				return `${type} operation`;
		}
	}, []);

	// Get item status
	const getItemStatus = useCallback((item: QueueItem) => {
		if (item.retries > 0) {
			return `Retried ${item.retries} time${item.retries === 1 ? "" : "s"}`;
		}
		return "Queued";
	}, []);

	return (
		<>
			{/* Floating button to open queue manager */}
			{queueItems.length > 0 && (
				<button
					type="button"
					onClick={toggleManager}
					aria-label={`Manage offline queue (${queueItems.length} items)`}
					className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
				>
					<AlertCircle className="w-4 h-4" aria-hidden="true" />
					<span className="text-sm font-medium">{queueItems.length}</span>
				</button>
			)}

			{/* Queue Manager Modal */}
			{isOpen && (
				<div
					role="dialog"
					aria-label="Offline Action Queue Manager"
					aria-modal="true"
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
				>
					<div
						ref={modalRef}
						className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col focus:outline-none"
						role="document"
						tabIndex={-1}
					>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
							<h2 className="text-lg font-semibold">
								Offline Queue ({queueItems.length} items)
							</h2>
							<button
								type="button"
								onClick={closeManager}
								ref={closeBtnRef}
								className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
								aria-label="Close queue manager"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Toolbar */}
						{queueItems.length > 0 && (
							<div className="flex items-center justify-between p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={selectAll}
										className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
									>
										Select All
									</button>
									<button
										type="button"
										onClick={clearSelection}
										className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
									>
										Clear Selection
									</button>
								</div>
								<div className="flex items-center gap-2">
									{selectedItems.size > 0 && (
										<>
											<button
												type="button"
												onClick={removeSelected}
												className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded focus:outline-none focus:ring-2 focus:ring-red-300"
											>
												<Trash2 className="w-4 h-4" />
												Remove
											</button>
											<button
												type="button"
												onClick={retrySelected}
												disabled={isSyncing}
												className="flex items-center gap-1 px-3 py-1 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/50 rounded disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-300 disabled:focus:ring-0"
											>
												<RefreshCw
													className={`w-4 h-4 ${
														isSyncing ? "animate-spin" : ""
													}`}
												/>
												Retry
											</button>
										</>
									)}
									<button
										type="button"
										onClick={clearQueue}
										className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded focus:outline-none focus:ring-2 focus:ring-red-300"
									>
										<Trash2 className="w-4 h-4" />
										Clear All
									</button>
								</div>
							</div>
						)}

						{/* Queue Items List */}
						<div className="flex-1 overflow-y-auto p-4">
							{queueItems.length === 0 ? (
								<div className="text-center py-12">
									<AlertCircle className="w-12 h-12 mx-auto text-gray-400" />
									<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
										No offline actions queued
									</h3>
									<p className="mt-1 text-gray-500 dark:text-gray-400">
										Your offline actions will appear here when you're
										disconnected
									</p>
								</div>
							) : (
								<ul className="space-y-3">
									{queueItems.map((item) => (
										<li
											key={item.id}
											className={`p-4 rounded-lg border ${
												selectedItems.has(item.id)
													? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700"
													: "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
											}`}
										>
											<div className="flex items-start gap-3">
												<input
													type="checkbox"
													checked={selectedItems.has(item.id)}
													onChange={() => toggleItemSelection(item.id)}
													className="mt-1 rounded focus:ring-blue-500"
													aria-label={`Select ${getItemDescription(item)}`}
												/>
												<div className="flex-1 min-w-0">
													<div className="flex items-center justify-between">
														<h3 className="font-medium text-gray-900 dark:text-white capitalize">
															{item.type.replace(/_/g, " ")}
														</h3>
														<span className="text-xs text-gray-500 dark:text-gray-400">
															{formatTimestamp(item.timestamp)}
														</span>
													</div>
													<p className="mt-1 text-sm text-gray-600 dark:text-gray-300 truncate">
														{getItemDescription(item)}
													</p>
													<div className="mt-2 flex items-center justify-between">
														<span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
															{getItemStatus(item)}
														</span>
														{item.authContext && (
															<span className="text-xs text-gray-500 dark:text-gray-400">
																Auth captured
															</span>
														)}
													</div>
												</div>
											</div>
										</li>
									))}
								</ul>
							)}
						</div>

						{/* Footer */}
						<div className="p-4 border-t dark:border-gray-700 flex justify-between items-center">
							<div className="text-sm text-gray-500 dark:text-gray-400">
								{selectedItems.size > 0 ? (
									<span>
										{selectedItems.size} of {queueItems.length} selected
									</span>
								) : (
									<span>Select items to manage them</span>
								)}
							</div>
							<button
								type="button"
								onClick={closeManager}
								className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
