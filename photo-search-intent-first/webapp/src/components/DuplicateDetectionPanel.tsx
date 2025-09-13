import { useCallback, useEffect, useState } from "react";
import {
	type DuplicateDetectionResult,
	DuplicateDetectionService,
} from "../services/DuplicateDetectionService";
import { getAPI } from "../services/PhotoVaultAPI";
import LazyImage from "./LazyImage";

interface DuplicateDetectionPanelProps {
	photos: Array<{ path: string; embedding?: number[] }>;
	onDelete: (paths: string[]) => Promise<void>;
	onClose: () => void;
}

export function DuplicateDetectionPanel({
	photos,
	onDelete,
	onClose,
}: DuplicateDetectionPanelProps) {
	const [scanning, setScanning] = useState(false);
	const [progress, setProgress] = useState(0);
	const [result, setResult] = useState<DuplicateDetectionResult | null>(null);
	const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
	const [deleteStrategy, setDeleteStrategy] = useState<
		"best" | "newest" | "largest"
	>("best");
	const [safeMode, setSafeMode] = useState(true);
	const [deleting, setDeleting] = useState(false);

	const api = getAPI();

	const startScan = useCallback(async () => {
		setScanning(true);
		setProgress(0);

		try {
			const detectionResult = await DuplicateDetectionService.detectDuplicates(
				photos,
				(prog) => setProgress(prog),
			);
			setResult(detectionResult);

			// Auto-select exact duplicates in safe mode
			if (safeMode) {
				const exactGroups = detectionResult.groups
					.filter((g) => g.type === "exact")
					.map((g) => g.id);
				setSelectedGroups(new Set(exactGroups));
			}
		} catch (error) {
			console.error("Duplicate detection failed:", error);
		} finally {
			setScanning(false);
		}
	}, [photos, safeMode]);

	const handleDelete = async () => {
		if (!result || selectedGroups.size === 0) return;

		setDeleting(true);

		try {
			const groupsToDelete = result.groups.filter((g) =>
				selectedGroups.has(g.id),
			);
			const deleteResult =
				await DuplicateDetectionService.batchDeleteDuplicates(
					groupsToDelete,
					onDelete,
					{
						keepStrategy: deleteStrategy,
						safeMode,
						dryRun: false,
					},
				);

			alert(
				`Deleted ${deleteResult.deleted} duplicates, freed ${formatBytes(deleteResult.freed)}`,
			);

			// Refresh the scan
			await startScan();
		} catch (error) {
			console.error("Deletion failed:", error);
			alert("Failed to delete duplicates");
		} finally {
			setDeleting(false);
		}
	};

	const toggleGroup = (groupId: string) => {
		const newSelected = new Set(selectedGroups);
		if (newSelected.has(groupId)) {
			newSelected.delete(groupId);
		} else {
			newSelected.add(groupId);
		}
		setSelectedGroups(newSelected);
	};

	const toggleExpanded = (groupId: string) => {
		const newExpanded = new Set(expandedGroups);
		if (newExpanded.has(groupId)) {
			newExpanded.delete(groupId);
		} else {
			newExpanded.add(groupId);
		}
		setExpandedGroups(newExpanded);
	};

	const formatBytes = (bytes: number): string => {
		const units = ["B", "KB", "MB", "GB"];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${size.toFixed(2)} ${units[unitIndex]}`;
	};

	const getTypeColor = (type: "exact" | "near" | "similar"): string => {
		switch (type) {
			case "exact":
				return "text-red-600";
			case "near":
				return "text-orange-600";
			case "similar":
				return "text-yellow-600";
		}
	};

	const getTypeLabel = (type: "exact" | "near" | "similar"): string => {
		switch (type) {
			case "exact":
				return "Exact Duplicate";
			case "near":
				return "Near Duplicate";
			case "similar":
				return "Similar Photo";
		}
	};

	useEffect(() => {
		startScan();
	}, [startScan]);

	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="px-6 py-4 border-b flex items-center justify-between">
					<div>
						<h2 className="text-xl font-semibold">Duplicate Detection</h2>
						{result && (
							<p className="text-sm text-gray-600 mt-1">
								Found {result.totalDuplicates} duplicates in{" "}
								{result.groups.length} groups • Can free up{" "}
								{formatBytes(result.potentialSavings)}
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700"
					>
						✕
					</button>
				</div>

				{/* Progress bar */}
				{scanning && (
					<div className="px-6 py-3 border-b">
						<div className="flex items-center gap-3">
							<div className="flex-1 bg-gray-200 rounded-full h-2">
								<div
									className="bg-blue-500 h-2 rounded-full transition-all"
									style={{ width: `${progress}%` }}
								/>
							</div>
							<span className="text-sm text-gray-600">
								{Math.round(progress)}%
							</span>
						</div>
					</div>
				)}

				{/* Controls */}
				{result && !scanning && (
					<div className="px-6 py-3 border-b bg-gray-50">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-4">
								<select
									value={deleteStrategy}
									onChange={(e) =>
										setDeleteStrategy(
											e.target.value as "best" | "newest" | "largest",
										)
									}
									className="px-3 py-1.5 border rounded text-sm"
								>
									<option value="best">Keep Best Quality</option>
									<option value="newest">Keep Newest</option>
									<option value="largest">Keep Largest</option>
								</select>

								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={safeMode}
										onChange={(e) => setSafeMode(e.target.checked)}
									/>
									Safe mode (only exact duplicates)
								</label>

								<span className="text-sm text-gray-600">
									{selectedGroups.size} groups selected
								</span>
							</div>

							<div className="flex gap-2">
								<button
									type="button"
									onClick={() =>
										setSelectedGroups(new Set(result.groups.map((g) => g.id)))
									}
									className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
								>
									Select All
								</button>
								<button
									type="button"
									onClick={() => setSelectedGroups(new Set())}
									className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
								>
									Clear
								</button>
								<button
									type="button"
									onClick={handleDelete}
									disabled={selectedGroups.size === 0 || deleting}
									className="px-4 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
								>
									{deleting
										? "Deleting..."
										: `Delete Selected (${selectedGroups.size})`}
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Recommendations */}
				{result && result.recommendations.length > 0 && (
					<div className="px-6 py-3 bg-blue-50 border-b">
						<div className="space-y-1">
							{result.recommendations.map((rec) => (
								<p
									key={`rec-${rec.slice(0, 50)}`}
									className="text-sm text-blue-800"
								>
									• {rec}
								</p>
							))}
						</div>
					</div>
				)}

				{/* Duplicate groups */}
				<div className="flex-1 overflow-y-auto px-6 py-4">
					{scanning ? (
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
							<p className="mt-3 text-gray-600">
								Analyzing photos for duplicates...
							</p>
						</div>
					) : result ? (
						<div className="space-y-4">
							{result.groups.map((group) => (
								<div
									key={group.id}
									className={`border rounded-lg overflow-hidden ${
										selectedGroups.has(group.id)
											? "border-blue-500 bg-blue-50"
											: "border-gray-200"
									}`}
								>
									<button
										type="button"
										className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 w-full text-left"
										onClick={() => toggleExpanded(group.id)}
										aria-expanded={expandedGroups.has(group.id)}
										aria-label={`Toggle ${group.type} duplicate group with ${group.photos.length} photos`}
									>
										<div className="flex items-center gap-4">
											<input
												type="checkbox"
												checked={selectedGroups.has(group.id)}
												onChange={() => toggleGroup(group.id)}
												onClick={(e) => e.stopPropagation()}
												className="w-4 h-4"
											/>
											<div>
												<div className="flex items-center gap-2">
													<span
														className={`font-medium ${getTypeColor(group.type)}`}
													>
														{getTypeLabel(group.type)}
													</span>
													<span className="text-sm text-gray-500">
														({group.photos.length} photos)
													</span>
												</div>
												<p className="text-sm text-gray-600 mt-1">
													Similarity: {(group.similarity * 100).toFixed(1)}% •
													Can save: {formatBytes(group.sizeReduction)}
												</p>
											</div>
										</div>
										<span className="text-gray-400">
											{expandedGroups.has(group.id) ? "▼" : "▶"}
										</span>
									</button>

									{expandedGroups.has(group.id) && (
										<div className="border-t bg-gray-50 p-4">
											<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
												{group.photos.map((photo) => (
													<div
														key={photo.path}
														className={`relative p-2 bg-white rounded border ${
															photo === group.bestPhoto
																? "border-green-500"
																: "border-gray-200"
														}`}
													>
														<div className="aspect-square bg-gray-200 rounded mb-2 overflow-hidden">
															<LazyImage
																src={api.getThumbnailUrl(photo.path)}
																alt={
																	photo.path.split("/").pop() ||
																	"Duplicate candidate"
																}
																className="w-full h-full object-cover"
															/>
														</div>
														<p className="text-xs truncate" title={photo.path}>
															{photo.path.split("/").pop()}
														</p>
														<div className="text-xs text-gray-500 mt-1">
															{formatBytes(photo.fileSize)}
															{photo === group.bestPhoto && (
																<span className="ml-1 text-green-600 font-medium">
																	✓ Best
																</span>
															)}
														</div>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-12 text-gray-500">
							No duplicates found
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
