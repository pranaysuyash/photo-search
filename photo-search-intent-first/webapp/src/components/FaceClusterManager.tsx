import { useCallback, useEffect, useState } from "react";
import {
	apiFacesClusters,
	apiGetFacePhotos,
	apiMergeFaceClusters,
	apiSplitFaceCluster,
	thumbFaceUrl,
} from "../api";
import { LoadingSpinner } from "./LoadingSpinner";

interface FaceCluster {
	id: string;
	name?: string;
	size: number;
	examples: [string, number][]; // [path, embedding_index]
}

interface FaceClusterManagerProps {
	currentDir: string;
	provider: string;
}

export function FaceClusterManager({
	currentDir,
	provider,
}: FaceClusterManagerProps) {
	const [clusters, setClusters] = useState<FaceCluster[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedCluster, setSelectedCluster] = useState<FaceCluster | null>(
		null,
	);
	const [clusterPhotos, setClusterPhotos] = useState<string[]>([]);
	const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
	const [error, setError] = useState<string | null>(null);
	const [mergeMode, setMergeMode] = useState(false);
	const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(
		new Set(),
	);

	const loadClusters = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const result = await apiFacesClusters(currentDir);
			setClusters(result.clusters);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load face clusters",
			);
		} finally {
			setLoading(false);
		}
	}, [currentDir]);

	useEffect(() => {
		if (currentDir) {
			loadClusters();
		}
	}, [currentDir, loadClusters]);

	const selectCluster = async (cluster: FaceCluster) => {
		setSelectedCluster(cluster);
		setSelectedPhotos(new Set());

		try {
			const result = await apiGetFacePhotos(currentDir, cluster.id);
			setClusterPhotos(result.photos);
		} catch (err) {
			console.error("Failed to load cluster photos:", err);
			setClusterPhotos([]);
		}
	};

	const togglePhotoSelection = (photoPath: string) => {
		const newSelection = new Set(selectedPhotos);
		if (newSelection.has(photoPath)) {
			newSelection.delete(photoPath);
		} else {
			newSelection.add(photoPath);
		}
		setSelectedPhotos(newSelection);
	};

	const toggleMergeSelection = (clusterId: string) => {
		const newSelection = new Set(selectedForMerge);
		if (newSelection.has(clusterId)) {
			newSelection.delete(clusterId);
		} else {
			newSelection.add(clusterId);
		}
		setSelectedForMerge(newSelection);
	};

	const mergeClusters = async () => {
		const clusterIds = Array.from(selectedForMerge);
		if (clusterIds.length < 2) {
			setError("Please select at least 2 clusters to merge");
			return;
		}

		try {
			setLoading(true);
			const sourceIds = clusterIds.slice(1);
			const targetId = clusterIds[0];

			for (const sourceId of sourceIds) {
				await apiMergeFaceClusters(currentDir, sourceId, targetId);
			}

			setMergeMode(false);
			setSelectedForMerge(new Set());
			await loadClusters();
			alert(`Successfully merged ${clusterIds.length} clusters`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to merge clusters");
		} finally {
			setLoading(false);
		}
	};

	const splitCluster = async () => {
		if (!selectedCluster || selectedPhotos.size === 0) {
			setError("Please select photos to split");
			return;
		}

		try {
			setLoading(true);
			const photoPaths = Array.from(selectedPhotos);
			await apiSplitFaceCluster(currentDir, selectedCluster.id, photoPaths);

			setSelectedPhotos(new Set());
			await loadClusters();
			alert(
				`Successfully split ${photoPaths.length} photos into a new cluster`,
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to split cluster");
		} finally {
			setLoading(false);
		}
	};

	if (loading && clusters.length === 0) {
		return (
			<div className="flex items-center justify-center p-8">
				<LoadingSpinner />
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Face Cluster Manager</h2>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={() => setMergeMode(!mergeMode)}
						className={`px-4 py-2 rounded ${
							mergeMode
								? "bg-red-600 text-white hover:bg-red-700"
								: "bg-blue-600 text-white hover:bg-blue-700"
						}`}
					>
						{mergeMode ? "Cancel Merge" : "Merge Clusters"}
					</button>

					{mergeMode && selectedForMerge.size >= 2 && (
						<button
							type="button"
							onClick={mergeClusters}
							disabled={loading}
							className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
						>
							Merge Selected ({selectedForMerge.size})
						</button>
					)}

					<button
						type="button"
						onClick={loadClusters}
						disabled={loading}
						className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
					>
						Refresh
					</button>
				</div>
			</div>

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Clusters List */}
				<div className="space-y-4">
					<h3 className="text-lg font-semibold">
						Face Clusters ({clusters.length})
						{mergeMode && (
							<span className="text-sm text-blue-600 ml-2">
								(Select clusters to merge)
							</span>
						)}
					</h3>

					{clusters.length === 0 ? (
						<div className="text-center text-gray-500 py-8">
							No face clusters found. Run face detection first.
						</div>
					) : (
						<div className="space-y-3 max-h-96 overflow-y-auto">
							{clusters.map((cluster) => (
								<div
									key={cluster.id}
									className={`p-4 border rounded-lg cursor-pointer transition-colors ${
										selectedCluster?.id === cluster.id
											? "border-blue-500 bg-blue-50"
											: mergeMode && selectedForMerge.has(cluster.id)
												? "border-green-500 bg-green-50"
												: "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
									}`}
									onClick={() => {
										if (mergeMode) {
											toggleMergeSelection(cluster.id);
										} else {
											selectCluster(cluster);
										}
									}}
								>
									<div className="flex items-center gap-3">
										{/* Example faces */}
										<div className="flex -space-x-2">
											{cluster.examples
												.slice(0, 3)
												.map(([path, embIndex], idx) => (
													<img
														key={`item-${idx}`}
														src={thumbFaceUrl(
															currentDir,
															provider,
															path,
															embIndex,
															48,
														)}
														alt="Face example"
														className="w-12 h-12 rounded-full border-2 border-white object-cover"
														onError={(e) => {
															(e.target as HTMLImageElement).style.display =
																"none";
														}}
													/>
												))}
										</div>

										<div className="flex-1">
											<div className="font-medium">
												{cluster.name || `Cluster ${cluster.id}`}
											</div>
											<div className="text-sm text-gray-500">
												{cluster.size} faces
											</div>
										</div>

										{mergeMode && selectedForMerge.has(cluster.id) && (
											<div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
												<span className="text-white text-xs">✓</span>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Cluster Details */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold">Cluster Photos</h3>
						{selectedCluster && selectedPhotos.size > 0 && (
							<button
								type="button"
								onClick={splitCluster}
								disabled={loading}
								className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 text-sm"
							>
								Split Selected ({selectedPhotos.size})
							</button>
						)}
					</div>

					{selectedCluster ? (
						<div className="space-y-4">
							<div className="bg-gray-50 p-4 rounded">
								<div className="font-medium">
									{selectedCluster.name || `Cluster ${selectedCluster.id}`}
								</div>
								<div className="text-sm text-gray-600">
									{selectedCluster.size} total faces • {clusterPhotos.length}{" "}
									photos
								</div>
								{selectedPhotos.size > 0 && (
									<div className="text-sm text-blue-600 mt-1">
										{selectedPhotos.size} photos selected for splitting
									</div>
								)}
							</div>

							{clusterPhotos.length > 0 ? (
								<div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
									{clusterPhotos.map((photoPath, index) => (
										<div
											key={`photo-${photoPath}-${index}`}
											onClick={() => togglePhotoSelection(photoPath)}
											className={`relative aspect-square cursor-pointer rounded overflow-hidden ${
												selectedPhotos.has(photoPath)
													? "ring-2 ring-blue-500"
													: "hover:ring-2 hover:ring-gray-300"
											}`}
										>
											<img
												src={`/api/thumb?dir=${encodeURIComponent(currentDir)}&provider=${provider}&path=${encodeURIComponent(photoPath)}&size=128`}
												alt="Cluster photo"
												className="w-full h-full object-cover"
												onError={(e) => {
													(e.target as HTMLImageElement).src =
														"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNjM2MzYzIi8+Cjwvc3ZnPgo=";
												}}
											/>
											{selectedPhotos.has(photoPath) && (
												<div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
													<span className="text-white text-xs">✓</span>
												</div>
											)}
										</div>
									))}
								</div>
							) : (
								<div className="text-center text-gray-500 py-4">
									No photos found for this cluster
								</div>
							)}
						</div>
					) : (
						<div className="text-center text-gray-500 py-8">
							{mergeMode
								? "Select clusters from the left to merge them together"
								: "Select a cluster to view its photos"}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
