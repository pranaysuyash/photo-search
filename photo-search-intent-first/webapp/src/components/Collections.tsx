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
	onOpenHelp?: () => void;
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
	onOpenHelp,
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
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div>
						<h2 className="text-xl font-bold text-gray-900">Collections</h2>
						<p className="text-sm text-gray-600 mt-1">
							Organize your photos into beautiful collections
						</p>
					</div>
					{selectedPhotos.length > 0 && (
						<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
							{selectedPhotos.length} selected
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{selectedPhotos.length > 0 && (
						<button
							type="button"
							onClick={() => setShowCreateForm(true)}
							className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 shadow-sm"
						>
							<Plus className="w-4 h-4" />
							Create Collection
						</button>
					)}
					<button
						type="button"
						onClick={onLoadCollections}
						className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2"
					>
						Refresh
					</button>
				</div>
			</div>

			{/* Create new collection form */}
			{showCreateForm && (
				<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
					<div className="flex items-center gap-3 mb-3">
						<FolderPlus className="w-5 h-5 text-blue-600" />
						<div className="flex-1">
							<input
								type="text"
								placeholder="Enter collection name..."
								value={newCollectionName}
								onChange={(e) => setNewCollectionName(e.target.value)}
								className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								onKeyDown={(e) => {
									if (e.key === "Enter") handleCreateCollection();
									if (e.key === "Escape") setShowCreateForm(false);
								}}
							/>
						</div>
					</div>
					<div className="flex items-center justify-between">
						{selectedPhotos.length > 0 && (
							<div className="text-sm text-blue-700">
								Will add{" "}
								<span className="font-medium">
									{selectedPhotos.length} selected photo
									{selectedPhotos.length !== 1 ? "s" : ""}
								</span>
							</div>
						)}
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setShowCreateForm(false)}
								className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleCreateCollection}
								disabled={!newCollectionName.trim() || isCreating}
								className="bg-blue-600 text-white px-4 py-1.5 text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
							>
								{isCreating ? "Creating..." : "Create Collection"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Collections list */}
			{Object.keys(collections || {}).length === 0 ? (
				<div className="mt-4">
					<EnhancedEmptyState
						type="no-directory"
						onAction={() => setShowCreateForm(true)}
						onOpenHelp={onOpenHelp}
						sampleQueries={[
							"Vacation & Travel",
							"Family & Friends",
							"Nature & Landscapes",
							"Work Projects",
						]}
						onRunSample={(name) => {
							setNewCollectionName(name);
							setShowCreateForm(true);
						}}
						context="collections"
					/>
				</div>
			) : (
				<ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-sm">
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
								className={`bg-white border rounded-xl p-4 transition-all cursor-move shadow-sm hover:shadow-lg ${
									isDropTarget
										? "border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200"
										: "border-gray-200 hover:border-gray-300"
								} ${expandedActions === name ? "ring-2 ring-blue-200 shadow-md" : ""}`}
							>
								{/* Collection header with drag handle */}
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center gap-2 min-w-0 flex-1">
										<GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
										<div className="min-w-0">
											<div
												className="font-semibold text-gray-900 truncate"
												title={name}
											>
												{name}
											</div>
											<div className="text-xs text-gray-600 flex items-center gap-1">
												<span>
													{collectionPaths.length} photo
													{collectionPaths.length !== 1 ? "s" : ""}
												</span>
												{isDropTarget && (
													<span className="text-blue-600 font-medium">
														• Drop here to add
													</span>
												)}
											</div>
										</div>
									</div>
								</div>

								{/* Prominent cover thumbnail */}
								<div className="relative mb-3 group">
									{collectionPaths.length > 0 ? (
										<>
											<img
												src={thumbUrl(dir, engine, collectionPaths[0], 200)}
												alt={`${name} collection cover`}
												className="w-full h-32 object-cover rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
											/>
											{/* Multiple photos indicator */}
											{collectionPaths.length > 1 && (
												<div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
													<Plus className="w-3 h-3" />
													{collectionPaths.length - 1}
												</div>
											)}
											{/* Gradient overlay for better text readability */}
											<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg" />
										</>
									) : (
										<div className="w-full h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200">
											<FolderPlus className="w-8 h-8 mb-2" />
											<span className="text-sm">Empty collection</span>
										</div>
									)}
								</div>

								{/* Action buttons */}
								<div className="flex items-center justify-between pt-2 border-t border-gray-100">
									<button
										type="button"
										onClick={() => onOpen(name)}
										className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium transition-colors duration-200 flex items-center gap-1"
									>
										View Collection
									</button>

									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => handleShare(name)}
											className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors duration-200"
											title="Share collection"
											disabled={collectionPaths.length === 0}
										>
											<Share2 className="w-4 h-4" />
										</button>
										<button
											type="button"
											onClick={() => handleExport(name)}
											className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-green-600 transition-colors duration-200"
											title="Export collection"
											disabled={collectionPaths.length === 0}
										>
											<Download className="w-4 h-4" />
										</button>
										{onDelete && (
											<button
												type="button"
												onClick={() => onDelete(name)}
												className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors duration-200"
												title="Delete collection"
											>
												<Trash2 className="w-4 h-4" />
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
					<div className="mt-6 text-sm text-center text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
						💡 <strong>Tip:</strong> Drag selected photos onto any collection
						above to add them, or create a new collection with your selection
					</div>
				)}
		</div>
	);
}
