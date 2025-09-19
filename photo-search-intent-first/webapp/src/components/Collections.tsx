import {
	Download,
	FolderPlus,
	GripVertical,
	Plus,
	Share2,
	Trash2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { apiCreateShare, apiExport, apiSetCollection, thumbUrl } from "../api";
import { announce } from "../utils/accessibility";
import { handleError } from "../utils/errors";
import { EnhancedEmptyState } from "./EnhancedEmptyState";

interface CollectionsProps {
	dir: string;
	engine: string;
	collections: Record<string, string[]>;
	onLoadCollections: () => void;
	onOpen: (name: string) => void;
	onDelete?: (name: string) => void;
	onShare?: (name: string, paths: string[]) => void;
	onExport?: (name: string, paths: string[]) => void;
	selectedPhotos?: string[]; // Photos to add to collection
	onCollectionUpdate?: (collections: Record<string, string[]>) => void;
}

type DragItem = {
	type: "collection" | "photo";
	data: string | string[];
	name?: string;
};

export default function Collections({
	dir,
	engine,
	collections,
	onLoadCollections,
	onOpen,
	onDelete,
	onShare,
	onExport,
	selectedPhotos = [],
	onCollectionUpdate,
}: CollectionsProps) {
	const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
	const [dragOverCollection, setDragOverCollection] = useState<string | null>(
		null,
	);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newCollectionName, setNewCollectionName] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [expandedActions, _setExpandedActions] = useState<string | null>(null);

	const dragCounter = useRef(0);

	// Handle creating new collection
	const handleCreateCollection = useCallback(async () => {
		if (!newCollectionName.trim() || isCreating) return;

		setIsCreating(true);
		try {
			await apiSetCollection(dir, newCollectionName.trim(), selectedPhotos);
			setNewCollectionName("");
			setShowCreateForm(false);
			onLoadCollections();
			if (onCollectionUpdate) {
				const updated = {
					...collections,
					[newCollectionName.trim()]: selectedPhotos,
				};
				onCollectionUpdate(updated);
			}
		} catch (error) {
			console.error("Failed to create collection:", error);
			alert(
				error instanceof Error ? error.message : "Failed to create collection",
			);
		} finally {
			setIsCreating(false);
		}
	}, [
		newCollectionName,
		selectedPhotos,
		dir,
		onLoadCollections,
		collections,
		onCollectionUpdate,
		isCreating,
	]);

	// Handle drag start for collections (reordering)
	const handleCollectionDragStart = useCallback(
		(e: React.DragEvent, collectionName: string) => {
			const item: DragItem = {
				type: "collection",
				data: collectionName,
				name: collectionName,
			};
			setDraggedItem(item);
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", JSON.stringify(item));
		},
		[],
	);

	// Handle drag over collection (to add photos)
	const handleDragOver = useCallback(
		(e: React.DragEvent, collectionName: string) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = "copy";
			setDragOverCollection(collectionName);
		},
		[],
	);

	const handleDragEnter = useCallback(
		(e: React.DragEvent, collectionName: string) => {
			e.preventDefault();
			dragCounter.current++;
			setDragOverCollection(collectionName);
		},
		[],
	);

	const handleDragLeave = useCallback((_e: React.DragEvent) => {
		dragCounter.current--;
		if (dragCounter.current === 0) {
			setDragOverCollection(null);
		}
	}, []);

	// Handle drop on collection
	const handleDrop = useCallback(
		async (e: React.DragEvent, targetCollection: string) => {
			e.preventDefault();
			dragCounter.current = 0;
			setDragOverCollection(null);

			try {
				const dataTransfer = e.dataTransfer.getData("text/plain");
				let dragData: DragItem;

				if (dataTransfer) {
					dragData = JSON.parse(dataTransfer);
				} else {
					// Fallback to state
					if (!draggedItem) return;
					dragData = draggedItem;
				}

				if (dragData.type === "photo") {
					// Adding photos to collection
					const photoPaths = Array.isArray(dragData.data)
						? dragData.data
						: [dragData.data as string];
					const existingPaths = collections[targetCollection] || [];
					const newPaths = Array.from(
						new Set([...existingPaths, ...photoPaths]),
					);

					await apiSetCollection(dir, targetCollection, newPaths);
					onLoadCollections();

					if (onCollectionUpdate) {
						const updated = { ...collections, [targetCollection]: newPaths };
						onCollectionUpdate(updated);
					}
				}
			} catch (error) {
				console.error("Failed to update collection:", error);
				alert("Failed to update collection");
				handleError(error, {
					logToServer: true,
					context: {
						action: "collection_update",
						component: "Collections.handleDrop",
						dir,
					},
				});
			} finally {
				setDraggedItem(null);
			}
		},
		[collections, dir, onLoadCollections, onCollectionUpdate, draggedItem],
	);

	// Handle sharing collection
	const handleShare = useCallback(
		async (collectionName: string) => {
			if (onShare) {
				onShare(collectionName, collections[collectionName] || []);
			} else {
				// Default sharing implementation
				try {
					const paths = collections[collectionName] || [];
					if (paths.length === 0) {
						alert("Collection is empty");
						return;
					}

					const result = await apiCreateShare(dir, engine, paths, {
						expiryHours: 24,
						viewOnly: true,
					});

					await navigator.clipboard.writeText(
						window.location.origin + result.url,
					);
					alert("Share link copied to clipboard!");
					announce("Share link copied to clipboard", "polite");
				} catch (error) {
					console.error("Failed to share collection:", error);
					alert(
						error instanceof Error
							? error.message
							: "Failed to share collection",
					);
					handleError(error, {
						logToServer: true,
						context: {
							action: "share_collection",
							component: "Collections.handleShare",
							dir,
						},
					});
				}
			}
		},
		[onShare, collections, dir, engine],
	);

	// Handle exporting collection
	const handleExport = useCallback(
		async (collectionName: string) => {
			if (onExport) {
				onExport(collectionName, collections[collectionName] || []);
			} else {
				// Default export implementation
				const folderName = prompt(
					`Export collection "${collectionName}" to folder:`,
					collectionName,
				);
				if (!folderName) return;

				try {
					const paths = collections[collectionName] || [];
					if (paths.length === 0) {
						alert("Collection is empty");
						return;
					}

					await apiExport(dir, paths, folderName, "copy", false, false);
					alert(`Exported ${paths.length} photos to ${folderName}`);
					announce(`Exported ${paths.length} photos`, "polite");
				} catch (error) {
					console.error("Failed to export collection:", error);
					alert(
						error instanceof Error
							? error.message
							: "Failed to export collection",
					);
					handleError(error, {
						logToServer: true,
						context: {
							action: "export_collection",
							component: "Collections.handleExport",
							dir,
						},
					});
				}
			}
		},
		[onExport, collections, dir],
	);
	return (
		<div className="glass-panel p-3">
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<h2 className="font-semibold">Collections</h2>
					{selectedPhotos.length > 0 && (
						<span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
							{selectedPhotos.length} selected
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{selectedPhotos.length > 0 && (
						<button
							type="button"
							onClick={() => setShowCreateForm(true)}
							className="bg-green-600 text-white rounded px-3 py-1 text-sm hover:bg-green-700 flex items-center gap-1"
						>
							<Plus className="w-3 h-3" />
							New
						</button>
					)}
					<button
						type="button"
						onClick={onLoadCollections}
						className="bg-gray-200 rounded px-3 py-1 text-sm hover:bg-gray-300"
					>
						Refresh
					</button>
				</div>
			</div>

			{/* Create new collection form */}
			{showCreateForm && (
				<div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
					<div className="flex items-center gap-2">
						<FolderPlus className="w-4 h-4 text-blue-600" />
						<input
							type="text"
							placeholder="Collection name"
							value={newCollectionName}
							onChange={(e) => setNewCollectionName(e.target.value)}
							className="flex-1 border rounded px-2 py-1 text-sm"
							onKeyDown={(e) => {
								if (e.key === "Enter") handleCreateCollection();
								if (e.key === "Escape") setShowCreateForm(false);
							}}
						/>
						<button
							type="button"
							onClick={handleCreateCollection}
							disabled={!newCollectionName.trim() || isCreating}
							className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700 disabled:opacity-50"
						>
							{isCreating ? "Creating..." : "Create"}
						</button>
						<button
							type="button"
							onClick={() => setShowCreateForm(false)}
							className="text-gray-500 hover:text-gray-700 px-2 py-1 text-sm"
						>
							Cancel
						</button>
					</div>
					{selectedPhotos.length > 0 && (
						<div className="text-xs text-blue-600 mt-1">
							Will add {selectedPhotos.length} selected photo
							{selectedPhotos.length !== 1 ? "s" : ""}
						</div>
					)}
				</div>
			)}

			{/* Collections list */}
			{Object.keys(collections || {}).length === 0 ? (
				<div className="mt-4">
					<EnhancedEmptyState
						type="no-directory"
						onAction={() => setShowCreateForm(true)}
						onOpenHelp={() => {
							/* TODO: Open help */
						}}
						sampleQueries={[
							"Vacation photos",
							"Family portraits",
							"Work events",
							"Nature shots",
						]}
						onRunSample={(name) => {
							setNewCollectionName(name);
							setShowCreateForm(true);
						}}
					/>
				</div>
			) : (
				<ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
					{Object.keys(collections).map((name) => {
						const isDropTarget = dragOverCollection === name;
						const collectionPaths = collections[name] || [];

						return (
							<li
								key={name}
								draggable
								onDragStart={(e) => handleCollectionDragStart(e, name)}
								onDragOver={(e) => handleDragOver(e, name)}
								onDragEnter={(e) => handleDragEnter(e, name)}
								onDragLeave={handleDragLeave}
								onDrop={(e) => handleDrop(e, name)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										_setExpandedActions(expandedActions === name ? null : name);
									}
								}}
								aria-label={`Collection ${name} with ${collectionPaths.length} photos`}
								className={`border rounded-lg p-3 transition-all cursor-move ${
									isDropTarget
										? "border-blue-500 bg-blue-50 shadow-md"
										: "border-gray-200 hover:border-gray-300 hover:shadow-sm"
								} ${expandedActions === name ? "ring-2 ring-blue-200" : ""}`}
							>
								{/* Collection header with drag handle */}
								<div className="flex items-start gap-2 mb-2">
									<GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
									<div className="flex-1 min-w-0">
										<div className="font-medium truncate" title={name}>
											{name}
										</div>
										<div className="text-xs text-gray-600">
											{collectionPaths.length} item
											{collectionPaths.length !== 1 ? "s" : ""}
											{isDropTarget && (
												<span className="ml-2 text-blue-600 font-medium">
													Drop here to add
												</span>
											)}
										</div>
									</div>
								</div>

								{/* Thumbnail preview */}
								<div className="flex gap-1 mb-3 overflow-hidden">
									{collectionPaths.slice(0, 4).map((p, _i) => (
										<img
											key={p}
											src={thumbUrl(dir, engine, p, 96)}
											alt={p.split("/").pop() || p}
											className={`object-cover rounded ${
												collectionPaths.length === 1
													? "w-full h-20"
													: collectionPaths.length === 2
														? "w-1/2 h-16"
														: "w-1/4 h-12"
											}`}
										/>
									))}
									{collectionPaths.length > 4 && (
										<div className="w-1/4 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
											+{collectionPaths.length - 4}
										</div>
									)}
									{collectionPaths.length === 0 && (
										<div className="w-full h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
											Empty collection
										</div>
									)}
								</div>

								{/* Action buttons */}
								<div className="flex items-center justify-between">
									<button
										type="button"
										onClick={() => onOpen(name)}
										className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
									>
										Open
									</button>

									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => handleShare(name)}
											className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-blue-600"
											title="Share collection"
											disabled={collectionPaths.length === 0}
										>
											<Share2 className="w-3 h-3" />
										</button>
										<button
											type="button"
											onClick={() => handleExport(name)}
											className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-green-600"
											title="Export collection"
											disabled={collectionPaths.length === 0}
										>
											<Download className="w-3 h-3" />
										</button>
										{onDelete && (
											<button
												type="button"
												onClick={() => onDelete(name)}
												className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-red-600"
												title="Delete collection"
											>
												<Trash2 className="w-3 h-3" />
											</button>
										)}
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			)}

			{/* Drop zone hint */}
			{selectedPhotos.length > 0 &&
				Object.keys(collections || {}).length > 0 && (
					<div className="mt-3 text-xs text-center text-gray-500 border-t pt-2">
						💡 Drag photos onto collections to add them, or create a new
						collection above
					</div>
				)}
		</div>
	);
}
