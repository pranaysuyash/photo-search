import React, { useCallback, useState } from "react";
import {
	apiBatchAddToCollection,
	apiBatchDelete,
	apiBatchTag,
	apiExport,
	apiGetCollections,
} from "../api";
import { LoadingSpinner } from "./LoadingSpinner";
import { handleError } from "../utils/errors";

interface BatchOperationsProps {
	selectedPaths: string[];
	currentDir: string;
	onSelectionClear: () => void;
	onOperationComplete: () => void;
}

export function BatchOperations({
	selectedPaths,
	currentDir,
	onSelectionClear,
	onOperationComplete,
}: BatchOperationsProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Tag operation state
	const [tagOperation, setTagOperation] = useState<
		"add" | "remove" | "replace"
	>("add");
	const [newTags, setNewTags] = useState("");

	// Collection operation state
	const [newCollectionName, setNewCollectionName] = useState("");
	const [collections, setCollections] = useState<string[]>([]);
	const [showCollections, setShowCollections] = useState(false);

	// Export operation state
	const [exportDest, setExportDest] = useState("");
	const [exportPreset, setExportPreset] = useState<
		"web" | "email" | "print" | "custom"
	>("web");
	const [stripExif, setStripExif] = useState(false);
	const [showExport, setShowExport] = useState(false);

	// Edit operation state
	const [showEdit, setShowEdit] = useState(false);
	const [editOperation, setEditOperation] = useState<
		"rotate" | "flip-h" | "flip-v"
	>("rotate");
	const [rotateAngle, setRotateAngle] = useState(90);

	const loadCollections = useCallback(async () => {
		try {
			const result = await apiGetCollections(currentDir);
			setCollections(Object.keys(result.collections));
		} catch (err) {
			console.error("Failed to load collections:", err);
		}
	}, [currentDir]);

	React.useEffect(() => {
		if (showCollections && collections.length === 0) {
			loadCollections();
		}
	}, [showCollections, collections.length, loadCollections]);

	const handleBatchDelete = async (useOsTrash = false) => {
		if (
			!confirm(
				`Are you sure you want to delete ${selectedPaths.length} selected items?`,
			)
		) {
			return;
		}

		try {
			setLoading(true);
			setError(null);
			const result = await apiBatchDelete(
				currentDir,
				selectedPaths,
				useOsTrash,
			);
			setSuccess(
				`Successfully deleted ${result.moved} items. ${
					result.undoable ? "Operation can be undone." : ""
				}`,
			);
			onSelectionClear();
			onOperationComplete();
    } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete items");
        handleError(err, { logToServer: true, context: { action: "batch_delete", component: "BatchOperations", dir: currentDir } });
    } finally {
        setLoading(false);
    }
	};

	const handleBatchTag = async () => {
		if (!newTags.trim()) {
			setError("Please enter tags");
			return;
		}

		const tags = newTags
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);
		if (tags.length === 0) {
			setError("Please enter valid tags");
			return;
		}

		try {
			setLoading(true);
			setError(null);
			const result = await apiBatchTag(
				currentDir,
				selectedPaths,
				tags,
				tagOperation,
			);
			setSuccess(
				`Successfully ${
					tagOperation === "add"
						? "added tags to"
						: tagOperation === "remove"
							? "removed tags from"
							: "replaced tags on"
				} ${result.updated} items`,
			);
			setNewTags("");
			onOperationComplete();
    } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update tags");
        handleError(err, { logToServer: true, context: { action: "batch_tag", component: "BatchOperations", dir: currentDir } });
    } finally {
        setLoading(false);
    }
	};

	const handleAddToCollection = async (collectionName: string) => {
		try {
			setLoading(true);
			setError(null);
			const result = await apiBatchAddToCollection(
				currentDir,
				selectedPaths,
				collectionName,
			);
			setSuccess(
				`Added ${result.added} new items to collection "${collectionName}"`,
			);
			onOperationComplete();
    } catch (err) {
        setError(
            err instanceof Error ? err.message : "Failed to add to collection",
        );
        handleError(err, { logToServer: true, context: { action: "batch_add_to_collection", component: "BatchOperations", dir: currentDir } });
    } finally {
        setLoading(false);
    }
	};

	const handleExport = async () => {
		if (!exportDest.trim()) {
			setError("Please enter a destination folder");
			return;
		}

		try {
			setLoading(true);
			setError(null);
			const result = await apiExport(
				currentDir,
				selectedPaths,
				exportDest.trim(),
				"copy",
				stripExif,
				false,
				{
					preset: exportPreset,
				},
			);
			setSuccess(`Exported ${result.copied} files to ${result.dest}`);
			setExportDest("");
			onOperationComplete();
    } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to export files");
        handleError(err, { logToServer: true, context: { action: "batch_export", component: "BatchOperations", dir: currentDir } });
    } finally {
        setLoading(false);
    }
	};

	const handleBatchEdit = async () => {
		// In a full implementation, this would call the appropriate API endpoints
		// For now, we'll just show a message since the backend doesn't support batch editing yet
		alert(
			`In a full implementation, this would apply ${editOperation} to ${selectedPaths.length} selected photos.`,
		);
		setShowEdit(false);
	};

	const clearMessages = () => {
		setError(null);
		setSuccess(null);
	};

	if (selectedPaths.length === 0) {
		return null;
	}

	return (
		<div className="bg-white border rounded-lg shadow-sm p-4 space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">
					Batch Operations ({selectedPaths.length} selected)
				</h3>
				<button
					type="button"
					onClick={onSelectionClear}
					className="text-gray-500 hover:text-gray-700"
				>
					Clear Selection
				</button>
			</div>

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
					{error}
					<button
						type="button"
						onClick={clearMessages}
						className="absolute top-2 right-2 text-red-700 hover:text-red-900"
					>
						×
					</button>
				</div>
			)}

			{success && (
				<div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
					{success}
					<button
						type="button"
						onClick={clearMessages}
						className="absolute top-2 right-2 text-green-700 hover:text-green-900"
					>
						×
					</button>
				</div>
			)}

			{loading && (
				<div className="flex items-center justify-center py-4">
					<LoadingSpinner />
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
				{/* Delete Operations */}
				<div className="space-y-3">
					<h4 className="font-medium text-red-600">Delete</h4>
					<div className="space-y-2">
						<button
							type="button"
							onClick={() => handleBatchDelete(false)}
							disabled={loading}
							className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
						>
							Move to App Trash
						</button>
						<button
							type="button"
							onClick={() => handleBatchDelete(true)}
							disabled={loading}
							className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm"
						>
							Move to OS Trash
						</button>
					</div>
				</div>

				{/* Tag Operations */}
				<div className="space-y-3">
					<h4 className="font-medium text-blue-600">Tags</h4>
					<div className="space-y-2">
						<select
							value={tagOperation}
							onChange={(e) =>
								setTagOperation(e.target.value as "add" | "remove" | "replace")
							}
							className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
						>
							<option value="add">Add Tags</option>
							<option value="remove">Remove Tags</option>
							<option value="replace">Replace Tags</option>
						</select>
						<input
							type="text"
							value={newTags}
							onChange={(e) => setNewTags(e.target.value)}
							placeholder="Enter tags separated by commas"
							className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
						/>
						<button
							type="button"
							onClick={handleBatchTag}
							disabled={loading || !newTags.trim()}
							className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
						>
							Apply Tags
						</button>
					</div>
				</div>

				{/* Collection Operations */}
				<div className="space-y-3">
					<h4 className="font-medium text-green-600">Collections</h4>
					<div className="space-y-2">
						<button
							type="button"
							onClick={() => setShowCollections(!showCollections)}
							className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
						>
							{showCollections ? "Hide Collections" : "Show Collections"}
						</button>

						{showCollections && (
							<div className="space-y-2">
								{collections.length > 0 && (
									<div className="max-h-32 overflow-y-auto space-y-1">
										{collections.map((collection) => (
											<button
												type="button"
												key={collection}
												onClick={() => handleAddToCollection(collection)}
												disabled={loading}
												className="w-full px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 text-sm text-left"
											>
												Add to "{collection}"
											</button>
										))}
									</div>
								)}

								<div className="flex gap-2">
									<input
										type="text"
										value={newCollectionName}
										onChange={(e) => setNewCollectionName(e.target.value)}
										placeholder="New collection name"
										className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
									/>
									<button
										type="button"
										onClick={() => handleAddToCollection(newCollectionName)}
										disabled={loading || !newCollectionName.trim()}
										className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
									>
										Add
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Export Operations */}
				<div className="space-y-3">
					<h4 className="font-medium text-purple-600">Export</h4>
					<div className="space-y-2">
						<button
							type="button"
							onClick={() => setShowExport(!showExport)}
							className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
						>
							{showExport ? "Hide Export" : "Show Export"}
						</button>

						{showExport && (
							<div className="space-y-2">
								<input
									type="text"
									value={exportDest}
									onChange={(e) => setExportDest(e.target.value)}
									placeholder="Destination folder path"
									className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
								/>
								<select
									value={exportPreset}
									onChange={(e) =>
										setExportPreset(
											e.target.value as "web" | "email" | "print" | "custom",
										)
									}
									className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
								>
									<option value="web">Web (optimized)</option>
									<option value="email">Email (smaller)</option>
									<option value="print">Print (high quality)</option>
									<option value="custom">Custom</option>
								</select>
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={stripExif}
										onChange={(e) => setStripExif(e.target.checked)}
										className="rounded"
									/>
									Remove EXIF data
								</label>
								<button
									type="button"
									onClick={handleExport}
									disabled={loading || !exportDest.trim()}
									className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
								>
									Export Selected
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Edit Operations */}
				<div className="space-y-3">
					<h4 className="font-medium text-yellow-600">Edit</h4>
					<div className="space-y-2">
						<button
							type="button"
							onClick={() => setShowEdit(!showEdit)}
							className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
						>
							{showEdit ? "Hide Edit" : "Show Edit"}
						</button>

						{showEdit && (
							<div className="space-y-2">
								<select
									value={editOperation}
									onChange={(e) =>
										setEditOperation(
											e.target.value as "rotate" | "flip-h" | "flip-v",
										)
									}
									className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
								>
									<option value="rotate">Rotate</option>
									<option value="flip-h">Flip Horizontal</option>
									<option value="flip-v">Flip Vertical</option>
								</select>

								{editOperation === "rotate" && (
									<select
										value={rotateAngle}
										onChange={(e) => setRotateAngle(Number(e.target.value))}
										className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
									>
										<option value={90}>90° Clockwise</option>
										<option value={180}>180°</option>
										<option value={270}>90° Counter-clockwise</option>
									</select>
								)}

								<button
									type="button"
									onClick={handleBatchEdit}
									disabled={loading}
									className="w-full px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 text-sm"
								>
									Apply to {selectedPaths.length} photos
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
