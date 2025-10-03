import {
	AlertCircle,
	CheckCircle,
	Clock,
	Edit2,
	Image,
	Loader2,
	Merge,
	Plus,
	RefreshCw,
	Scissors,
	Search,
	Settings,
	Star,
	Trash2,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import {
	enhancedFaceRecognitionService,
	type FaceCluster,
	type FaceQualityStats,
} from "../services/EnhancedFaceRecognitionService";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";

interface EnhancedFaceRecognitionProps {
	className?: string;
	directory: string;
	onFaceSelected?: (photoPath: string, faceIdx: number) => void;
}

interface IndexingProgress {
	phase: string;
	progress: number;
	message: string;
}

export default function EnhancedFaceRecognition({
	className,
	directory,
	onFaceSelected,
}: EnhancedFaceRecognitionProps) {
	const [clusters, setClusters] = useState<FaceCluster[]>([]);
	const [qualityStats, setQualityStats] = useState<FaceQualityStats | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [isIndexing, setIsIndexing] = useState(false);
	const [indexingProgress, setIndexingProgress] =
		useState<IndexingProgress | null>(null);
	const [selectedCluster, setSelectedCluster] = useState<FaceCluster | null>(
		null,
	);
	const [editingClusterId, setEditingClusterId] = useState<string | null>(null);
	const [clusterName, setClusterName] = useState("");
	const [showSettings, setShowSettings] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterMode, setFilterMode] = useState<
		"all" | "named" | "unnamed" | "large"
	>("all");
	const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
	const [indexingSettings, setIndexingSettings] = useState({
		clustering_method: "hdbscan",
		min_cluster_size: 3,
		similarity_threshold: 0.6,
		quality_threshold: 0.3,
	});

	useEffect(() => {
		loadData();
	}, [directory]);

	const loadData = async () => {
		setIsLoading(true);
		try {
			const [clustersData, qualityData] = await Promise.all([
				enhancedFaceRecognitionService.getFaceClusters(directory),
				enhancedFaceRecognitionService.getFaceQualityStats(directory),
			]);
			setClusters(clustersData);
			setQualityStats(qualityData);
		} catch (error) {
			console.error("Failed to load face data:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleBuildIndex = async () => {
		setIsIndexing(true);
		setIndexingProgress({
			phase: "detecting",
			progress: 0,
			message: "Starting face detection...",
		});

		try {
			// Simulate progress updates
			const progressInterval = setInterval(() => {
				setIndexingProgress((prev) => {
					if (!prev) return null;

					if (prev.phase === "detecting" && prev.progress < 40) {
						return {
							...prev,
							progress: Math.min(prev.progress + 5, 40),
							message: "Detecting faces...",
						};
					} else if (prev.phase === "detecting" && prev.progress >= 40) {
						return {
							phase: "embedding",
							progress: 0,
							message: "Extracting face embeddings...",
						};
					} else if (prev.phase === "embedding" && prev.progress < 80) {
						return {
							...prev,
							progress: Math.min(prev.progress + 8, 80),
							message: "Creating embeddings...",
						};
					} else if (prev.phase === "embedding" && prev.progress >= 80) {
						return {
							phase: "clustering",
							progress: 0,
							message: "Clustering faces...",
						};
					} else if (prev.phase === "clustering" && prev.progress < 100) {
						return {
							...prev,
							progress: Math.min(prev.progress + 10, 100),
							message: "Organizing into clusters...",
						};
					}
					return prev;
				});
			}, 200);

			const result = await enhancedFaceRecognitionService.buildFaceIndex({
				dir: directory,
				...indexingSettings,
			});

			clearInterval(progressInterval);

			setIndexingProgress({
				phase: "complete",
				progress: 100,
				message: `Indexing complete! Found ${result.faces} faces in ${result.clusters} clusters`,
			});

			setTimeout(() => {
				setIsIndexing(false);
				setIndexingProgress(null);
				loadData();
			}, 2000);
		} catch (error) {
			console.error("Failed to build face index:", error);
			setIndexingProgress({
				phase: "error",
				progress: 0,
				message: "Indexing failed. Please try again.",
			});
			setTimeout(() => {
				setIsIndexing(false);
				setIndexingProgress(null);
			}, 3000);
		}
	};

	const handleMergeClusters = async (sourceId: string, targetId: string) => {
		try {
			await enhancedFaceRecognitionService.mergeFaceClusters({
				dir: directory,
				source_cluster_id: sourceId,
				target_cluster_id: targetId,
			});
			await loadData();
		} catch (error) {
			console.error("Failed to merge clusters:", error);
		}
	};

	const handleSplitCluster = async (
		clusterId: string,
		photoPaths: string[],
	) => {
		try {
			await enhancedFaceRecognitionService.splitFaceCluster({
				dir: directory,
				cluster_id: clusterId,
				photo_paths: photoPaths,
			});
			await loadData();
		} catch (error) {
			console.error("Failed to split cluster:", error);
		}
	};

	const handleSetClusterName = async (clusterId: string, name: string) => {
		try {
			await enhancedFaceRecognitionService.setClusterName(
				directory,
				clusterId,
				name,
			);
			await loadData();
			setEditingClusterId(null);
			setClusterName("");
		} catch (error) {
			console.error("Failed to set cluster name:", error);
		}
	};

	const handleClusterSelection = (clusterId: string) => {
		setSelectedClusters((prev) =>
			prev.includes(clusterId)
				? prev.filter((id) => id !== clusterId)
				: [...prev, clusterId],
		);
	};

	const getFilteredClusters = () => {
		let filtered = clusters;

		if (searchQuery) {
			filtered = filtered.filter((cluster) =>
				cluster.name.toLowerCase().includes(searchQuery.toLowerCase()),
			);
		}

		switch (filterMode) {
			case "named":
				filtered = filtered.filter(
					(cluster) => cluster.name && cluster.name.trim() !== "",
				);
				break;
			case "unnamed":
				filtered = filtered.filter(
					(cluster) => !cluster.name || cluster.name.trim() === "",
				);
				break;
			case "large":
				filtered = filtered.filter((cluster) => cluster.size >= 10);
				break;
		}

		return filtered;
	};

	const performance =
		enhancedFaceRecognitionService.analyzeClusteringPerformance(clusters);
	const quality = enhancedFaceRecognitionService.assessClusterQuality(clusters);
	const filteredClusters = getFilteredClusters();

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Header with Indexing Controls */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-600 rounded-lg">
								<Users className="w-6 h-6 text-white" />
							</div>
							<div>
								<CardTitle className="text-lg">
									Enhanced Face Recognition
								</CardTitle>
								<p className="text-sm text-gray-600">
									Advanced face clustering and recognition system
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowSettings(!showSettings)}
							>
								<Settings className="w-4 h-4 mr-2" />
								Settings
							</Button>
							<Button
								onClick={handleBuildIndex}
								disabled={isIndexing || isLoading}
								className="bg-blue-600 hover:bg-blue-700"
							>
								{isIndexing ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<RefreshCw className="w-4 h-4 mr-2" />
								)}
								{isIndexing ? "Indexing..." : "Build Index"}
							</Button>
						</div>
					</div>
				</CardHeader>

				{/* Indexing Progress */}
				{isIndexing && indexingProgress && (
					<CardContent className="border-t">
						<div className="space-y-3">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">{indexingProgress.message}</span>
								<span className="text-gray-600">
									{indexingProgress.progress}%
								</span>
							</div>
							<Progress value={indexingProgress.progress} className="h-2" />
						</div>
					</CardContent>
				)}

				{/* Settings Panel */}
				{showSettings && (
					<CardContent className="border-t">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<div>
								<Label htmlFor="clustering_method">Clustering Method</Label>
								<Select
									value={indexingSettings.clustering_method}
									onValueChange={(value) =>
										setIndexingSettings((prev) => ({
											...prev,
											clustering_method: value,
										}))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="hdbscan">
											HDBSCAN (Recommended)
										</SelectItem>
										<SelectItem value="dbscan">DBSCAN</SelectItem>
										<SelectItem value="agglomerative">Agglomerative</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="min_cluster_size">Min Cluster Size</Label>
								<Input
									id="min_cluster_size"
									type="number"
									min="2"
									max="20"
									value={indexingSettings.min_cluster_size}
									onChange={(e) =>
										setIndexingSettings((prev) => ({
											...prev,
											min_cluster_size: parseInt(e.target.value) || 3,
										}))
									}
								/>
							</div>
							<div>
								<Label htmlFor="similarity_threshold">
									Similarity Threshold
								</Label>
								<Input
									id="similarity_threshold"
									type="number"
									min="0.1"
									max="1.0"
									step="0.1"
									value={indexingSettings.similarity_threshold}
									onChange={(e) =>
										setIndexingSettings((prev) => ({
											...prev,
											similarity_threshold: parseFloat(e.target.value) || 0.6,
										}))
									}
								/>
							</div>
							<div>
								<Label htmlFor="quality_threshold">Quality Threshold</Label>
								<Input
									id="quality_threshold"
									type="number"
									min="0.1"
									max="1.0"
									step="0.1"
									value={indexingSettings.quality_threshold}
									onChange={(e) =>
										setIndexingSettings((prev) => ({
											...prev,
											quality_threshold: parseFloat(e.target.value) || 0.3,
										}))
									}
								/>
							</div>
						</div>
					</CardContent>
				)}
			</Card>

			{/* Statistics Overview */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-100 rounded-lg">
								<Users className="w-5 h-5 text-blue-600" />
							</div>
							<div>
								<div className="text-lg font-bold text-blue-600">
									{clusters.length}
								</div>
								<div className="text-xs text-gray-600">Face Clusters</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-green-100 rounded-lg">
								<CheckCircle className="w-5 h-5 text-green-600" />
							</div>
							<div>
								<div className="text-lg font-bold text-green-600">
									{performance.namedClusters}
								</div>
								<div className="text-xs text-gray-600">Named Clusters</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-purple-100 rounded-lg">
								<Star className="w-5 h-5 text-purple-600" />
							</div>
							<div>
								<div className="text-lg font-bold text-purple-600">
									{qualityStats?.average_quality.toFixed(1) || "0.0"}
								</div>
								<div className="text-xs text-gray-600">Avg Quality</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-orange-100 rounded-lg">
								<Image className="w-5 h-5 text-orange-600" />
							</div>
							<div>
								<div className="text-lg font-bold text-orange-600">
									{performance.largestClusterSize}
								</div>
								<div className="text-xs text-gray-600">Largest Cluster</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Recommendations */}
			{quality.recommendations.length > 0 && (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						<div className="space-y-1">
							<strong>Recommendations:</strong>
							<ul className="list-disc list-inside text-sm">
								{quality.recommendations.slice(0, 3).map((rec, idx) => (
									<li key={idx}>{rec}</li>
								))}
							</ul>
						</div>
					</AlertDescription>
				</Alert>
			)}

			{/* Main Content */}
			<Tabs defaultValue="clusters" className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="clusters">Face Clusters</TabsTrigger>
					<TabsTrigger value="quality">Quality Analysis</TabsTrigger>
					<TabsTrigger value="tools">Management Tools</TabsTrigger>
				</TabsList>

				<TabsContent value="clusters" className="space-y-4">
					{/* Search and Filter */}
					<Card>
						<CardContent className="p-4">
							<div className="flex flex-col md:flex-row gap-4">
								<div className="flex-1">
									<Input
										placeholder="Search face clusters..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="w-full"
									/>
								</div>
								<div className="flex items-center gap-2">
									<Select
										value={filterMode}
										onValueChange={(value: string | number) =>
											setFilterMode(value)
										}
									>
										<SelectTrigger className="w-40">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Clusters</SelectItem>
											<SelectItem value="named">Named Only</SelectItem>
											<SelectItem value="unnamed">Unnamed Only</SelectItem>
											<SelectItem value="large">Large (10+)</SelectItem>
										</SelectContent>
									</Select>
									{selectedClusters.length > 0 && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => setSelectedClusters([])}
										>
											Clear Selection ({selectedClusters.length})
										</Button>
									)}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Clusters Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{filteredClusters.map((cluster) => (
							<Card
								key={cluster.id}
								className={`cursor-pointer transition-all hover:shadow-lg ${
									selectedClusters.includes(cluster.id)
										? "ring-2 ring-blue-500 border-blue-200"
										: ""
								} ${selectedCluster?.id === cluster.id ? "ring-2 ring-green-500" : ""}`}
								onClick={() => setSelectedCluster(cluster)}
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-2">
											<Switch
												checked={selectedClusters.includes(cluster.id)}
												onCheckedChange={() =>
													handleClusterSelection(cluster.id)
												}
												onClick={(e) => e.stopPropagation()}
											/>
											{editingClusterId === cluster.id ? (
												<Input
													value={clusterName}
													onChange={(e) => setClusterName(e.target.value)}
													onBlur={() => {
														handleSetClusterName(cluster.id, clusterName);
														setEditingClusterId(null);
													}}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															handleSetClusterName(cluster.id, clusterName);
															setEditingClusterId(null);
														}
													}}
													onClick={(e) => e.stopPropagation()}
													className="h-8 w-32 text-sm"
													placeholder="Enter name..."
													autoFocus
												/>
											) : (
												<div
													className="flex items-center gap-2 cursor-pointer"
													onClick={(e) => {
														e.stopPropagation();
														setEditingClusterId(cluster.id);
														setClusterName(cluster.name);
													}}
													role="button"
													tabIndex={0}
												>
													<h3 className="font-semibold text-sm">
														{cluster.name || `Cluster ${cluster.id}`}
													</h3>
													<Edit2 className="w-3 h-3 text-gray-400 hover:text-gray-600" />
												</div>
											)}
										</div>
										<div className="flex items-center gap-1">
											<Badge
												variant={
													quality.highQualityClusters.includes(cluster.id)
														? "default"
														: "secondary"
												}
												className="text-xs"
											>
												{cluster.size} faces
											</Badge>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										{/* Example Photos */}
										<div className="grid grid-cols-2 gap-2">
											{cluster.examples.slice(0, 4).map((example, idx) => (
												<div
													key={idx}
													className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200"
													onClick={(e) => {
														e.stopPropagation();
														onFaceSelected?.(
															example.photo_path,
															example.face_idx,
														);
													}}
													role="button"
													tabIndex={0}
												>
													<Image className="w-6 h-6 text-gray-400" />
												</div>
											))}
										</div>

										{/* Cluster Stats */}
										<div className="flex items-center justify-between text-xs text-gray-600">
											<span>
												Confidence: {(cluster.confidence * 100).toFixed(0)}%
											</span>
											<div className="flex items-center gap-1">
												<Clock className="w-3 h-3" />
												<span>Recent</span>
											</div>
										</div>

										{/* Quick Actions */}
										<div className="flex items-center gap-1 pt-2 border-t">
											<Button
												variant="ghost"
												size="sm"
												className="flex-1 h-8 text-xs"
												onClick={(e) => {
													e.stopPropagation();
													onFaceSelected?.(
														cluster.examples[0]?.photo_path,
														cluster.examples[0]?.face_idx,
													);
												}}
											>
												<Search className="w-3 h-3 mr-1" />
												View
											</Button>
											{selectedClusters.length === 2 &&
												selectedClusters.includes(cluster.id) && (
													<Button
														variant="ghost"
														size="sm"
														className="flex-1 h-8 text-xs"
														onClick={(e) => {
															e.stopPropagation();
															const [source, target] = selectedClusters;
															handleMergeClusters(source, target);
															setSelectedClusters([]);
														}}
													>
														<Merge className="w-3 h-3 mr-1" />
														Merge
													</Button>
												)}
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{filteredClusters.length === 0 && !isLoading && (
						<Card>
							<CardContent className="p-8 text-center">
								<Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
								<h3 className="text-lg font-semibold text-gray-900 mb-2">
									No Face Clusters Found
								</h3>
								<p className="text-sm text-gray-600 mb-4">
									{searchQuery || filterMode !== "all"
										? "Try adjusting your search or filters"
										: "Build the face index to get started"}
								</p>
								{!isIndexing && !searchQuery && filterMode === "all" && (
									<Button
										onClick={handleBuildIndex}
										className="bg-blue-600 hover:bg-blue-700"
									>
										<RefreshCw className="w-4 h-4 mr-2" />
										Build Face Index
									</Button>
								)}
							</CardContent>
						</Card>
					)}
				</TabsContent>

				<TabsContent value="quality" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Quality Statistics</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{qualityStats && (
									<>
										<div className="flex justify-between">
											<span className="text-sm text-gray-600">
												Total Faces:
											</span>
											<span className="font-medium">
												{qualityStats.total_faces}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-sm text-gray-600">
												High Quality:
											</span>
											<span className="font-medium">
												{qualityStats.high_quality_faces}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-sm text-gray-600">
												Average Quality:
											</span>
											<span className="font-medium">
												{(qualityStats.average_quality * 100).toFixed(1)}%
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-sm text-gray-600">
												High Quality Ratio:
											</span>
											<span className="font-medium">
												{(qualityStats.high_quality_ratio * 100).toFixed(1)}%
											</span>
										</div>
									</>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									Clustering Performance
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex justify-between">
									<span className="text-sm text-gray-600">Total Clusters:</span>
									<span className="font-medium">
										{performance.totalClusters}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-600">Named Clusters:</span>
									<span className="font-medium">
										{performance.namedClusters}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-600">Average Size:</span>
									<span className="font-medium">
										{performance.averageClusterSize.toFixed(1)} faces
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-600">
										Largest Cluster:
									</span>
									<span className="font-medium">
										{performance.largestClusterSize} faces
									</span>
								</div>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Quality Assessment</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<h4 className="font-medium text-green-600 mb-2">
										High Quality Clusters
									</h4>
									<p className="text-sm text-gray-600 mb-2">
										{quality.highQualityClusters.length} clusters with high
										confidence and good size
									</p>
									<div className="flex flex-wrap gap-1">
										{quality.highQualityClusters.slice(0, 5).map((id) => (
											<Badge key={id} variant="outline" className="text-xs">
												{id}
											</Badge>
										))}
										{quality.highQualityClusters.length > 5 && (
											<Badge variant="outline" className="text-xs">
												+{quality.highQualityClusters.length - 5} more
											</Badge>
										)}
									</div>
								</div>

								<div>
									<h4 className="font-medium text-yellow-600 mb-2">
										Medium Quality Clusters
									</h4>
									<p className="text-sm text-gray-600 mb-2">
										{quality.mediumQualityClusters.length} clusters that may
										need review
									</p>
									<div className="flex flex-wrap gap-1">
										{quality.mediumQualityClusters.slice(0, 5).map((id) => (
											<Badge key={id} variant="outline" className="text-xs">
												{id}
											</Badge>
										))}
										{quality.mediumQualityClusters.length > 5 && (
											<Badge variant="outline" className="text-xs">
												+{quality.mediumQualityClusters.length - 5} more
											</Badge>
										)}
									</div>
								</div>

								<div>
									<h4 className="font-medium text-red-600 mb-2">
										Low Quality Clusters
									</h4>
									<p className="text-sm text-gray-600 mb-2">
										{quality.lowQualityClusters.length} clusters that need
										attention
									</p>
									<div className="flex flex-wrap gap-1">
										{quality.lowQualityClusters.slice(0, 5).map((id) => (
											<Badge key={id} variant="outline" className="text-xs">
												{id}
											</Badge>
										))}
										{quality.lowQualityClusters.length > 5 && (
											<Badge variant="outline" className="text-xs">
												+{quality.lowQualityClusters.length - 5} more
											</Badge>
										)}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="tools" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Batch Operations</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<Button
									variant="outline"
									className="justify-start"
									disabled={selectedClusters.length !== 2}
								>
									<Merge className="w-4 h-4 mr-2" />
									Merge Selected Clusters (2 required)
								</Button>
								<Button
									variant="outline"
									className="justify-start"
									disabled={selectedClusters.length !== 1}
								>
									<Scissors className="w-4 h-4 mr-2" />
									Split Selected Cluster
								</Button>
								<Button
									variant="outline"
									className="justify-start"
									disabled={selectedClusters.length === 0}
								>
									<Edit2 className="w-4 h-4 mr-2" />
									Batch Rename ({selectedClusters.length})
								</Button>
								<Button
									variant="outline"
									className="justify-start text-red-600"
									disabled={selectedClusters.length === 0}
								>
									<Trash2 className="w-4 h-4 mr-2" />
									Delete Selected ({selectedClusters.length})
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Advanced Tools</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<Button variant="outline" className="justify-start">
									<Search className="w-4 h-4 mr-2" />
									Find Similar Faces
								</Button>
								<Button variant="outline" className="justify-start">
									<Star className="w-4 h-4 mr-2" />
									Improve Quality Threshold
								</Button>
								<Button variant="outline" className="justify-start">
									<RefreshCw className="w-4 h-4 mr-2" />
									Rebuild with Different Settings
								</Button>
								<Button variant="outline" className="justify-start">
									<Plus className="w-4 h-4 mr-2" />
									Import Face Names
								</Button>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}

function Badge({
	children,
	variant,
	className,
}: {
	children: React.ReactNode;
	variant?: "default" | "secondary" | "outline";
	className?: string;
}) {
	const baseClasses =
		"inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
	const variantClasses = {
		default: "bg-blue-100 text-blue-800",
		secondary: "bg-gray-100 text-gray-800",
		outline: "border border-gray-300 text-gray-700",
	};

	return (
		<span
			className={`${baseClasses} ${variantClasses[variant || "default"]} ${className || ""}`}
		>
			{children}
		</span>
	);
}
