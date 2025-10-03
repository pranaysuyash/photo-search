import {
	AlertCircle,
	Camera,
	Filter,
	Image,
	Loader2,
	Plus,
	RefreshCw,
	Search,
	Settings,
	Star,
	TrendingUp,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import {
	type ObjectCategory,
	type ObjectSearchResult,
	objectDetectionService,
} from "../services/ObjectDetectionService";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface ObjectDetectionSearchProps {
	className?: string;
	directory?: string;
	onObjectSelected?: (photoPath: string, objects: unknown[]) => void;
}

interface SearchState {
	isSearching: boolean;
	searchProgress: number;
	searchMessage: string;
}

export default function ObjectDetectionSearch({
	className,
	directory,
	onObjectSelected,
}: ObjectDetectionSearchProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<ObjectSearchResult[]>([]);
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [searchState, setSearchState] = useState<SearchState>({
		isSearching: false,
		searchProgress: 0,
		searchMessage: "",
	});
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [objectStats, setObjectStats] = useState<unknown>(null);
	const [searchHistory, setSearchHistory] = useState<string[]>([]);
	const [recommendedCategories, setRecommendedCategories] = useState<
		ObjectCategory[]
	>([]);
	const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

	const [advancedFilters, setAdvancedFilters] = useState({
		minConfidence: 0.5,
		maxResults: 50,
		sceneTypes: [] as string[],
		excludeCategories: [] as string[],
	});

	useEffect(() => {
		loadInitialData();
	}, [directory]);

	const loadInitialData = async () => {
		try {
			if (directory) {
				const stats =
					await objectDetectionService.getObjectDetectionStats(directory);
				setObjectStats(stats);
			}

			const categories = objectDetectionService.getObjectCategories();
			setRecommendedCategories(categories.slice(0, 4));

			const suggestions = objectDetectionService.getObjectRecommendations(
				[],
				{},
			);
			setSearchSuggestions(suggestions.searchSuggestions);
		} catch (error) {
			console.error("Failed to load initial data:", error);
		}
	};

	const handleSearch = async () => {
		if (!searchQuery.trim() && selectedCategories.length === 0) return;

		setSearchState({
			isSearching: true,
			searchProgress: 0,
			searchMessage: "Starting object search...",
		});

		try {
			// Simulate progress
			const progressInterval = setInterval(() => {
				setSearchState((prev) => ({
					...prev,
					progress: Math.min(prev.progress + 10, 90),
					searchMessage: `Analyzing image content... ${prev.progress + 10}%`,
				}));
			}, 100);

			const parsedQuery = objectDetectionService.parseObjectQuery(searchQuery);
			const searchParams = {
				...parsedQuery,
				object_classes:
					selectedCategories.length > 0
						? selectedCategories
						: parsedQuery.object_classes,
				min_confidence: advancedFilters.minConfidence,
				scene_types:
					advancedFilters.sceneTypes.length > 0
						? advancedFilters.sceneTypes
						: undefined,
			};

			const results = await objectDetectionService.searchByObjects(
				searchParams,
				directory,
			);

			clearInterval(progressInterval);

			setSearchState({
				isSearching: false,
				searchProgress: 100,
				searchMessage: `Found ${results.length} matching photos`,
			});

			setSearchResults(results);

			// Update search history
			if (searchQuery.trim() && !searchHistory.includes(searchQuery)) {
				setSearchHistory((prev) => [searchQuery, ...prev.slice(0, 9)]);
			}

			// Clear progress message after delay
			setTimeout(() => {
				setSearchState((prev) => ({ ...prev, searchMessage: "" }));
			}, 2000);
		} catch (error) {
			console.error("Search failed:", error);
			setSearchState({
				isSearching: false,
				searchProgress: 0,
				searchMessage: "Search failed. Please try again.",
			});
		}
	};

	const handleCategoryToggle = (categoryName: string) => {
		setSelectedCategories((prev) =>
			prev.includes(categoryName)
				? prev.filter((c) => c !== categoryName)
				: [...prev, categoryName],
		);
	};

	const handleResultClick = (result: ObjectSearchResult) => {
		onObjectSelected?.(result.photo_path, result.matching_objects);
	};

	const categories = objectDetectionService.getObjectCategories();

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Search Header */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="p-2 bg-green-600 rounded-lg">
							<Camera className="w-6 h-6 text-white" />
						</div>
						<div className="flex-1">
							<CardTitle className="text-lg">Object Detection Search</CardTitle>
							<p className="text-sm text-gray-600">
								Search photos by objects, scenes, and visual content
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowAdvanced(!showAdvanced)}
						>
							<Settings className="w-4 h-4 mr-2" />
							{showAdvanced ? "Simple" : "Advanced"}
						</Button>
					</div>
				</CardHeader>

				<CardContent className="space-y-4">
					{/* Main Search Input */}
					<div className="flex gap-2">
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
							<Input
								placeholder="Search for objects (e.g., 'red cars', 'people smiling', 'dogs playing')..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSearch()}
								className="pl-10"
							/>
							{searchQuery && (
								<Button
									variant="ghost"
									size="sm"
									className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
									onClick={() => setSearchQuery("")}
								>
									<X className="w-3 h-3" />
								</Button>
							)}
						</div>
						<Button
							onClick={handleSearch}
							disabled={
								searchState.isSearching ||
								(!searchQuery.trim() && selectedCategories.length === 0)
							}
							className="bg-green-600 hover:bg-green-700"
						>
							{searchState.isSearching ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<Search className="w-4 h-4 mr-2" />
							)}
							Search
						</Button>
					</div>

					{/* Search Progress */}
					{searchState.isSearching && (
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-gray-600">
									{searchState.searchMessage}
								</span>
								<span className="text-gray-600">
									{searchState.searchProgress}%
								</span>
							</div>
							<Progress value={searchState.searchProgress} className="h-2" />
						</div>
					)}

					{/* Category Quick Filters */}
					<div className="space-y-2">
						<Label className="text-sm font-medium">Quick Categories</Label>
						<div className="flex flex-wrap gap-2">
							{categories.map((category) => (
								<Badge
									key={category.name}
									variant={
										selectedCategories.includes(category.name)
											? "default"
											: "outline"
									}
									className="cursor-pointer hover:bg-gray-100"
									onClick={() => handleCategoryToggle(category.name)}
								>
									{category.display_name}
								</Badge>
							))}
						</div>
					</div>

					{/* Advanced Filters */}
					{showAdvanced && (
						<div className="space-y-4 border-t pt-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<Label htmlFor="min_confidence">Min Confidence</Label>
									<Select
										value={advancedFilters.minConfidence.toString()}
										onValueChange={(value) =>
											setAdvancedFilters((prev) => ({
												...prev,
												minConfidence: parseFloat(value),
											}))
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="0.3">30% (More results)</SelectItem>
											<SelectItem value="0.5">50% (Balanced)</SelectItem>
											<SelectItem value="0.7">70% (High quality)</SelectItem>
											<SelectItem value="0.9">90% (Very specific)</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="max_results">Max Results</Label>
									<Select
										value={advancedFilters.maxResults.toString()}
										onValueChange={(value) =>
											setAdvancedFilters((prev) => ({
												...prev,
												maxResults: parseInt(value),
											}))
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="20">20 results</SelectItem>
											<SelectItem value="50">50 results</SelectItem>
											<SelectItem value="100">100 results</SelectItem>
											<SelectItem value="200">200 results</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label>Exclude Categories</Label>
									<div className="mt-2 space-y-2 max-h-24 overflow-y-auto">
										{categories.map((category) => (
											<div
												key={category.name}
												className="flex items-center space-x-2"
											>
												<Checkbox
													id={`exclude-${category.name}`}
													checked={advancedFilters.excludeCategories.includes(
														category.name,
													)}
													onCheckedChange={(checked) => {
														setAdvancedFilters((prev) => ({
															...prev,
															excludeCategories: checked
																? [...prev.excludeCategories, category.name]
																: prev.excludeCategories.filter(
																		(c) => c !== category.name,
																	),
														}));
													}}
												/>
												<Label
													htmlFor={`exclude-${category.name}`}
													className="text-sm"
												>
													{category.display_name}
												</Label>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Search History and Suggestions */}
			{(searchHistory.length > 0 || searchSuggestions.length > 0) && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Quick Access</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{searchHistory.length > 0 && (
								<div>
									<Label className="text-sm font-medium mb-2 block">
										Recent Searches
									</Label>
									<div className="flex flex-wrap gap-2">
										{searchHistory.slice(0, 5).map((query, idx) => (
											<Badge
												key={idx}
												variant="outline"
												className="cursor-pointer hover:bg-gray-100"
												onClick={() => setSearchQuery(query)}
											>
												<RefreshCw className="w-3 h-3 mr-1" />
												{query}
											</Badge>
										))}
									</div>
								</div>
							)}

							{searchSuggestions.length > 0 && (
								<div>
									<Label className="text-sm font-medium mb-2 block">
										Popular Searches
									</Label>
									<div className="flex flex-wrap gap-2">
										{searchSuggestions.slice(0, 5).map((suggestion, idx) => (
											<Badge
												key={idx}
												variant="outline"
												className="cursor-pointer hover:bg-gray-100"
												onClick={() => setSearchQuery(suggestion)}
											>
												<TrendingUp className="w-3 h-3 mr-1" />
												{suggestion}
											</Badge>
										))}
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Object Statistics */}
			{objectStats && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Content Analysis</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
							<div className="text-center">
								<div className="text-lg font-bold text-blue-600">
									{objectStats.total_photos.toLocaleString()}
								</div>
								<div className="text-xs text-gray-600">Total Photos</div>
							</div>
							<div className="text-center">
								<div className="text-lg font-bold text-green-600">
									{objectStats.photos_with_objects.toLocaleString()}
								</div>
								<div className="text-xs text-gray-600">With Objects</div>
							</div>
							<div className="text-center">
								<div className="text-lg font-bold text-purple-600">
									{objectStats.total_objects_detected.toLocaleString()}
								</div>
								<div className="text-xs text-gray-600">Objects Found</div>
							</div>
							<div className="text-center">
								<div className="text-lg font-bold text-orange-600">
									{objectStats.average_objects_per_photo.toFixed(1)}
								</div>
								<div className="text-xs text-gray-600">Avg Objects</div>
							</div>
							<div className="text-center">
								<div className="text-lg font-bold text-red-600">
									{(objectStats.detection_quality_score * 100).toFixed(0)}%
								</div>
								<div className="text-xs text-gray-600">Quality Score</div>
							</div>
						</div>

						{/* Most Common Objects */}
						<div className="mt-4 pt-4 border-t">
							<Label className="text-sm font-medium mb-2 block">
								Most Common Objects
							</Label>
							<div className="flex flex-wrap gap-2">
								{objectStats.most_common_objects.map(
									(obj: any, idx: number) => (
										<Badge key={idx} variant="secondary" className="text-xs">
											{obj.class}: {obj.count}
										</Badge>
									),
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Search Results */}
			{searchResults.length > 0 && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-base">
								Search Results ({searchResults.length})
							</CardTitle>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setSearchResults([])}
							>
								Clear Results
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{searchResults.map((result, idx) => (
								<Card
									key={idx}
									className="cursor-pointer hover:shadow-lg transition-shadow"
									onClick={() => handleResultClick(result)}
								>
									<CardContent className="p-4">
										<div className="space-y-3">
											{/* Thumbnail */}
											<div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
												<Image className="w-8 h-8 text-gray-400" />
											</div>

											{/* File Name */}
											<div>
												<div className="font-medium text-sm truncate">
													{result.photo_path.split("/").pop()}
												</div>
												<div className="text-xs text-gray-600">
													{result.matching_objects.length} objects found
												</div>
											</div>

											{/* Matching Objects */}
											<div className="space-y-1">
												{result.matching_objects
													.slice(0, 3)
													.map((object, objIdx) => (
														<div
															key={objIdx}
															className="flex items-center justify-between text-xs"
														>
															<span className="bg-gray-100 px-2 py-1 rounded">
																{object.class_name}
															</span>
															<span className="text-gray-600">
																{(object.confidence * 100).toFixed(0)}%
															</span>
														</div>
													))}
												{result.matching_objects.length > 3 && (
													<div className="text-xs text-gray-500">
														+{result.matching_objects.length - 3} more objects
													</div>
												)}
											</div>

											{/* Relevance Score */}
											<div className="flex items-center justify-between text-xs">
												<span className="text-gray-600">Match Score:</span>
												<div className="flex items-center gap-1">
													<Star className="w-3 h-3 text-yellow-500" />
													<span className="font-medium">
														{(result.relevance_score * 100).toFixed(0)}%
													</span>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>

						{/* Load More */}
						{searchResults.length >= 20 && (
							<div className="flex justify-center mt-4">
								<Button variant="outline">Load More Results</Button>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* No Results */}
			{!searchState.isSearching &&
				searchResults.length === 0 &&
				(searchQuery || selectedCategories.length > 0) && (
					<Card>
						<CardContent className="p-8 text-center">
							<Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								No Objects Found
							</h3>
							<p className="text-sm text-gray-600 mb-4">
								Try adjusting your search terms or filters to find matching
								objects
							</p>
							<div className="flex justify-center gap-2">
								<Button variant="outline" onClick={() => setSearchQuery("")}>
									Clear Search
								</Button>
								<Button
									variant="outline"
									onClick={() => setSelectedCategories([])}
								>
									Clear Categories
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

			{/* Getting Started */}
			{!searchQuery &&
				selectedCategories.length === 0 &&
				searchResults.length === 0 && (
					<Card>
						<CardContent className="p-8 text-center">
							<Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								Start Object Search
							</h3>
							<p className="text-sm text-gray-600 mb-4">
								Search for photos by describing objects, scenes, or content you
								want to find
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-md mx-auto">
								<Input
									placeholder="e.g., red sports cars"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleSearch()}
								/>
								<Button onClick={handleSearch} disabled={!searchQuery.trim()}>
									<Search className="w-4 h-4 mr-2" />
									Search
								</Button>
							</div>
						</CardContent>
					</Card>
				)}
		</div>
	);
}
