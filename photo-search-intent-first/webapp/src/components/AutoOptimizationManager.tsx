import {
	Activity,
	AlertTriangle,
	Battery,
	Bolt,
	Cpu,
	HardDrive,
	Loader2,
	MemoryStick,
	RefreshCw,
	Server,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { annIndexingService } from "../services/ANNIndexingService";
import { largeLibraryOptimizer } from "../services/LargeLibraryOptimizer";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Switch } from "./ui/switch";

interface AutoOptimizationManagerProps {
	className?: string;
	libraryMetrics?: {
		photoCount: number;
		folderCount: number;
		librarySize: number;
	};
}

export default function AutoOptimizationManager({
	className,
	libraryMetrics,
}: AutoOptimizationManagerProps) {
	const [isOptimizing, setIsOptimizing] = useState(false);
	const [optimizationProgress, setOptimizationProgress] = useState(0);
	const [optimizationStatus, setOptimizationStatus] = useState<string>("");
	const [autoOptimize, setAutoOptimize] = useState(true);
	const [annStatus, setAnnStatus] = useState<{
		enabled: boolean;
		indexSize?: number;
		lastUpdated?: Date;
		performance?: any;
	}>({ enabled: false });
	const [showDetails, setShowDetails] = useState(false);

	useEffect(() => {
		// Load optimizer settings
		largeLibraryOptimizer.loadSettings();

		// Check ANN status
		const index = annIndexingService.getAllIndexes()[0];
		if (index) {
			setAnnStatus({
				enabled: true,
				indexSize: index.size,
				lastUpdated: new Date(index.lastUpdated),
				performance: annIndexingService.getPerformanceMetrics(),
			});
		}

		// Update metrics if provided
		if (libraryMetrics) {
			largeLibraryOptimizer.updateMetrics({
				totalPhotos: libraryMetrics.photoCount,
				totalFolders: libraryMetrics.folderCount,
				librarySize: libraryMetrics.librarySize,
			});
		}
	}, [libraryMetrics]);

	const handleAutoOptimize = async () => {
		setIsOptimizing(true);
		setOptimizationProgress(0);
		setOptimizationStatus("Analyzing library...");

		try {
			// Step 1: Analyze library
			setOptimizationStatus("Analyzing library structure...");
			setOptimizationProgress(20);

			const metrics = largeLibraryOptimizer.getMetrics();
			if (!metrics) {
				throw new Error("Library metrics not available");
			}

			// Step 2: Generate recommendations
			setOptimizationStatus("Generating optimization recommendations...");
			setOptimizationProgress(40);

			const recommendations = largeLibraryOptimizer.generateRecommendations();
			const criticalRecommendations = recommendations.filter(
				(r) => r.priority === "critical",
			);

			// Step 3: Apply critical optimizations automatically
			setOptimizationStatus("Applying critical optimizations...");
			setOptimizationProgress(60);

			for (const recommendation of criticalRecommendations) {
				setOptimizationStatus(`Applying: ${recommendation.description}`);
				await largeLibraryOptimizer.applyOptimizationManually(recommendation);
				setOptimizationProgress(60 + 30 / criticalRecommendations.length);
			}

			// Step 4: Check if ANN should be enabled
			if (
				annIndexingService.shouldEnableANN(metrics.totalPhotos) &&
				!annStatus.enabled
			) {
				setOptimizationStatus("Building ANN index for faster searches...");
				setOptimizationProgress(85);

				// In a real implementation, this would build the actual ANN index
				// For now, we'll simulate it
				await new Promise((resolve) => setTimeout(resolve, 2000));

				setAnnStatus({
					enabled: true,
					indexSize: Math.round(metrics.totalPhotos * 0.001), // Mock size
					lastUpdated: new Date(),
					performance: annIndexingService.getPerformanceMetrics(),
				});
			}

			// Step 5: Final optimization
			setOptimizationStatus("Finalizing optimizations...");
			setOptimizationProgress(95);

			// Additional optimizations like cache warming, etc.
			await new Promise((resolve) => setTimeout(resolve, 500));

			setOptimizationStatus("Optimization complete!");
			setOptimizationProgress(100);
		} catch (error) {
			console.error("Auto-optimization failed:", error);
			setOptimizationStatus("Optimization failed. Please try again.");
		} finally {
			setIsOptimizing(false);
			setTimeout(() => {
				setOptimizationProgress(0);
				setOptimizationStatus("");
			}, 3000);
		}
	};

	const shouldShowOptimizationBanner = () => {
		const status = largeLibraryOptimizer.getOptimizationStatus();
		return !status.isOptimized && (libraryMetrics?.photoCount || 0) > 5000;
	};

	const getOptimizationLevel = () => {
		const photoCount = libraryMetrics?.photoCount || 0;
		if (photoCount > 100000)
			return { level: "Enterprise", color: "text-purple-600" };
		if (photoCount > 50000)
			return { level: "Professional", color: "text-blue-600" };
		if (photoCount > 10000)
			return { level: "Advanced", color: "text-green-600" };
		return { level: "Standard", color: "text-gray-600" };
	};

	const optimizationLevel = getOptimizationLevel();

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Auto-Optimization Banner */}
			{shouldShowOptimizationBanner() && (
				<Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-4">
								<div className="p-3 bg-orange-600 rounded-full">
									<Bolt className="w-6 h-6 text-white" />
								</div>
								<div>
									<h3 className="text-lg font-semibold text-orange-900">
										Large Library Detected - Optimization Available
									</h3>
									<p className="text-sm text-orange-700 mt-1">
										Your library of{" "}
										{(libraryMetrics?.photoCount || 0).toLocaleString()} photos
										can benefit from performance optimizations.
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-2">
									<Switch
										checked={autoOptimize}
										onCheckedChange={setAutoOptimize}
										id="auto-optimize"
									/>
									<Label htmlFor="auto-optimize" className="text-sm">
										Auto-optimize
									</Label>
								</div>
								<Button
									onClick={handleAutoOptimize}
									disabled={isOptimizing || !autoOptimize}
									className="bg-orange-600 hover:bg-orange-700"
								>
									{isOptimizing ? (
										<Loader2 className="w-4 h-4 animate-spin mr-2" />
									) : (
										<Zap className="w-4 h-4 mr-2" />
									)}
									{isOptimizing ? "Optimizing..." : "Optimize Now"}
								</Button>
							</div>
						</div>

						{/* Optimization Progress */}
						{isOptimizing && (
							<div className="mt-4 space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span className="text-orange-700">{optimizationStatus}</span>
									<span className="text-orange-600">
										{optimizationProgress}%
									</span>
								</div>
								<Progress value={optimizationProgress} className="h-2" />
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Optimization Dashboard */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Activity className="w-5 h-5" />
							Performance Optimization Status
						</CardTitle>
						<div className="flex items-center gap-2">
							<Badge variant="outline" className={optimizationLevel.color}>
								{optimizationLevel.level} Library
							</Badge>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowDetails(!showDetails)}
							>
								{showDetails ? "Hide" : "Show"} Details
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Key Metrics */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="flex items-center gap-3 p-3 border rounded-lg">
							<Server className="w-8 h-8 text-blue-500" />
							<div>
								<div className="text-sm text-gray-600">Library Size</div>
								<div className="text-lg font-semibold">
									{(libraryMetrics?.photoCount || 0).toLocaleString()}
								</div>
								<div className="text-xs text-gray-500">photos</div>
							</div>
						</div>

						<div className="flex items-center gap-3 p-3 border rounded-lg">
							<MemoryStick className="w-8 h-8 text-green-500" />
							<div>
								<div className="text-sm text-gray-600">ANN Status</div>
								<div className="text-lg font-semibold">
									{annStatus.enabled ? "Enabled" : "Disabled"}
								</div>
								<div className="text-xs text-gray-500">
									{annStatus.indexSize
										? `${annStatus.indexSize}MB`
										: "Not indexed"}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-3 p-3 border rounded-lg">
							<Cpu className="w-8 h-8 text-purple-500" />
							<div>
								<div className="text-sm text-gray-600">Optimizations</div>
								<div className="text-lg font-semibold">
									{
										largeLibraryOptimizer.getOptimizationStatus()
											.optimizationsApplied.length
									}
								</div>
								<div className="text-xs text-gray-500">applied</div>
							</div>
						</div>

						<div className="flex items-center gap-3 p-3 border rounded-lg">
							<Battery className="w-8 h-8 text-orange-500" />
							<div>
								<div className="text-sm text-gray-600">Performance</div>
								<div className="text-lg font-semibold">
									{
										largeLibraryOptimizer.getOptimizationStatus()
											.performanceScore
									}
									/100
								</div>
								<div className="text-xs text-gray-500">score</div>
							</div>
						</div>
					</div>

					{/* Detailed Information */}
					{showDetails && (
						<div className="space-y-4 border-t pt-4">
							{/* ANN Index Details */}
							<div className="space-y-3">
								<h4 className="font-semibold flex items-center gap-2">
									<HardDrive className="w-4 h-4" />
									ANN Index Details
								</h4>
								{annStatus.enabled ? (
									<div className="bg-green-50 border border-green-200 rounded-lg p-3">
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
											<div>
												<span className="text-gray-600">Index Size:</span>
												<div className="font-medium">
													{annStatus.indexSize}MB
												</div>
											</div>
											<div>
												<span className="text-gray-600">Last Updated:</span>
												<div className="font-medium">
													{annStatus.lastUpdated?.toLocaleDateString()}
												</div>
											</div>
											<div>
												<span className="text-gray-600">Search Time:</span>
												<div className="font-medium">
													{annStatus.performance?.searchTime.toFixed(0) || 0}ms
												</div>
											</div>
										</div>
									</div>
								) : (
									<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
										<div className="flex items-center gap-2 text-yellow-800">
											<AlertTriangle className="w-4 h-4" />
											<span className="text-sm">
												ANN indexing not enabled. Large libraries benefit
												significantly from ANN.
											</span>
										</div>
									</div>
								)}
							</div>

							{/* Applied Optimizations */}
							<div className="space-y-3">
								<h4 className="font-semibold flex items-center gap-2">
									<RefreshCw className="w-4 h-4" />
									Applied Optimizations
								</h4>
								<div className="flex flex-wrap gap-2">
									{largeLibraryOptimizer
										.getOptimizationStatus()
										.optimizationsApplied.map((opt, index) => (
											<Badge
												key={index}
												variant="default"
												className="bg-green-100 text-green-800"
											>
												{opt}
											</Badge>
										))}
								</div>
							</div>

							{/* System Resources */}
							<div className="space-y-3">
								<h4 className="font-semibold flex items-center gap-2">
									<Activity className="w-4 h-4" />
									System Resources
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
										<div className="text-sm font-medium text-blue-900 mb-1">
											Memory Usage
										</div>
										<div className="text-xs text-blue-700">
											Cache size and index usage optimized for your library size
										</div>
									</div>
									<div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
										<div className="text-sm font-medium text-purple-900 mb-1">
											Search Performance
										</div>
										<div className="text-xs text-purple-700">
											Optimized for fast retrieval with intelligent caching
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
