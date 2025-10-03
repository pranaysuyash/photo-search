import {
	Camera,
	FaceIcon,
	Filter,
	Search,
	Sparkles,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import EnhancedFaceRecognition from "./EnhancedFaceRecognition";
import ObjectDetectionSearch from "./ObjectDetectionSearch";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface AdvancedSearchUnifiedProps {
	className?: string;
	directory: string;
	onResultSelected?: (photoPath: string, metadata: any) => void;
}

export default function AdvancedSearchUnified({
	className,
	directory,
	onResultSelected,
}: AdvancedSearchUnifiedProps) {
	const [activeTab, setActiveTab] = useState("unified");
	const [unifiedQuery, setUnifiedQuery] = useState("");
	const [searchFilters, setSearchFilters] = useState({
		includeFaces: true,
		includeObjects: true,
		dateRange: { enabled: false, start: "", end: "" },
		fileTypes: [] as string[],
		minQuality: 0.5,
	});

	const handleUnifiedSearch = async () => {
		if (!unifiedQuery.trim()) return;

		// Parse the query to determine what kind of search to perform
		const query = unifiedQuery.toLowerCase();

		// Face-related keywords
		const faceKeywords = [
			"person",
			"people",
			"face",
			"smiling",
			"portrait",
			"family",
			"friend",
		];
		const hasFaceQuery = faceKeywords.some((keyword) =>
			query.includes(keyword),
		);

		// Object-related keywords
		const objectKeywords = [
			"car",
			"dog",
			"cat",
			"food",
			"building",
			"tree",
			"house",
			"table",
			"chair",
		];
		const hasObjectQuery = objectKeywords.some((keyword) =>
			query.includes(keyword),
		);

		// Auto-switch to appropriate tab
		if (hasFaceQuery && !hasObjectQuery) {
			setActiveTab("faces");
		} else if (hasObjectQuery && !hasFaceQuery) {
			setActiveTab("objects");
		} else if (hasFaceQuery && hasObjectQuery) {
			setActiveTab("unified");
		}
	};

	const handleFaceSelected = (photoPath: string, faceIdx: number) => {
		onResultSelected?.(photoPath, {
			type: "face",
			faceIndex: faceIdx,
			query: unifiedQuery,
		});
	};

	const handleObjectSelected = (photoPath: string, objects: unknown[]) => {
		onResultSelected?.(photoPath, {
			type: "objects",
			objects: objects,
			query: unifiedQuery,
		});
	};

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Header */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
							<Sparkles className="w-6 h-6 text-white" />
						</div>
						<div className="flex-1">
							<CardTitle className="text-lg">Advanced Search</CardTitle>
							<p className="text-sm text-gray-600">
								AI-powered search with face recognition and object detection
							</p>
						</div>
					</div>
				</CardHeader>

				{/* Unified Search Bar */}
				<CardContent className="border-t">
					<div className="space-y-4">
						<div className="flex gap-2">
							<div className="flex-1 relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
								<Input
									placeholder="Search anything: 'John at the beach', 'red cars', 'family dinner', 'dogs playing'..."
									value={unifiedQuery}
									onChange={(e) => setUnifiedQuery(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleUnifiedSearch()}
									className="pl-10"
								/>
								{unifiedQuery && (
									<Button
										variant="ghost"
										size="sm"
										className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
										onClick={() => setUnifiedQuery("")}
									>
										<X className="w-3 h-3" />
									</Button>
								)}
							</div>
							<Button
								onClick={handleUnifiedSearch}
								disabled={!unifiedQuery.trim()}
								className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
							>
								<Search className="w-4 h-4 mr-2" />
								Smart Search
							</Button>
						</div>

						{/* Quick Filters */}
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								<Label className="text-sm">Include:</Label>
								<Badge
									variant={searchFilters.includeFaces ? "default" : "outline"}
									className="cursor-pointer"
									onClick={() =>
										setSearchFilters((prev) => ({
											...prev,
											includeFaces: !prev.includeFaces,
										}))
									}
								>
									<FaceIcon className="w-3 h-3 mr-1" />
									Faces
								</Badge>
								<Badge
									variant={searchFilters.includeObjects ? "default" : "outline"}
									className="cursor-pointer"
									onClick={() =>
										setSearchFilters((prev) => ({
											...prev,
											includeObjects: !prev.includeObjects,
										}))
									}
								>
									<Camera className="w-3 h-3 mr-1" />
									Objects
								</Badge>
							</div>

							<div className="flex items-center gap-2">
								<Label htmlFor="min_quality" className="text-sm">
									Min Quality:
								</Label>
								<select
									id="min_quality"
									value={searchFilters.minQuality}
									onChange={(e) =>
										setSearchFilters((prev) => ({
											...prev,
											minQuality: parseFloat(e.target.value),
										}))
									}
									className="text-sm border rounded px-2 py-1"
								>
									<option value="0.3">Low</option>
									<option value="0.5">Medium</option>
									<option value="0.7">High</option>
									<option value="0.9">Very High</option>
								</select>
							</div>
						</div>

						{/* Search Suggestions */}
						{unifiedQuery.length === 0 && (
							<div className="space-y-2">
								<Label className="text-sm font-medium">
									Try these searches:
								</Label>
								<div className="flex flex-wrap gap-2">
									{[
										"people smiling at the beach",
										"red sports cars",
										"family dinner with food",
										"dogs playing in park",
										"buildings at sunset",
										"birthday party with cake",
										"cats sleeping on couch",
										"group photos with friends",
									].map((suggestion, idx) => (
										<Badge
											key={idx}
											variant="outline"
											className="cursor-pointer hover:bg-gray-100"
											onClick={() => setUnifiedQuery(suggestion)}
										>
											{suggestion}
										</Badge>
									))}
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Advanced Search Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="unified" className="flex items-center gap-2">
						<Sparkles className="w-4 h-4" />
						Unified Search
					</TabsTrigger>
					<TabsTrigger value="faces" className="flex items-center gap-2">
						<Users className="w-4 h-4" />
						Face Recognition
					</TabsTrigger>
					<TabsTrigger value="objects" className="flex items-center gap-2">
						<Camera className="w-4 h-4" />
						Object Detection
					</TabsTrigger>
				</TabsList>

				<TabsContent value="unified" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								Unified Search Results
							</CardTitle>
							<p className="text-sm text-gray-600">
								Combined results from face recognition and object detection
							</p>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{/* Search Status */}
								{unifiedQuery && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
										<div className="flex items-center gap-2 mb-2">
											<Search className="w-4 h-4 text-blue-600" />
											<span className="font-medium text-blue-900">
												Searching for: "{unifiedQuery}"
											</span>
										</div>
										<div className="text-sm text-blue-700">
											{searchFilters.includeFaces && (
												<div>• Scanning faces for people and expressions</div>
											)}
											{searchFilters.includeObjects && (
												<div>• Analyzing objects and scenes in images</div>
											)}
											<div>
												• Minimum quality threshold:{" "}
												{(searchFilters.minQuality * 100).toFixed(0)}%
											</div>
										</div>
									</div>
								)}

								{/* Integration Placeholder */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Card className="border-dashed">
										<CardContent className="p-6 text-center">
											<Users className="w-8 h-8 text-gray-400 mx-auto mb-3" />
											<h3 className="font-medium text-gray-900 mb-1">
												Face Results
											</h3>
											<p className="text-sm text-gray-600 mb-3">
												Switch to Face Recognition tab for detailed face search
											</p>
											<Button
												variant="outline"
												size="sm"
												onClick={() => setActiveTab("faces")}
											>
												Go to Face Search
											</Button>
										</CardContent>
									</Card>

									<Card className="border-dashed">
										<CardContent className="p-6 text-center">
											<Camera className="w-8 h-8 text-gray-400 mx-auto mb-3" />
											<h3 className="font-medium text-gray-900 mb-1">
												Object Results
											</h3>
											<p className="text-sm text-gray-600 mb-3">
												Switch to Object Detection tab for detailed object
												search
											</p>
											<Button
												variant="outline"
												size="sm"
												onClick={() => setActiveTab("objects")}
											>
												Go to Object Search
											</Button>
										</CardContent>
									</Card>
								</div>

								{/* Instructions */}
								<Alert>
									<Filter className="h-4 w-4" />
									<AlertDescription>
										<div className="space-y-2">
											<strong>Unified Search Tips:</strong>
											<ul className="list-disc list-inside text-sm space-y-1">
												<li>
													Combine face and object queries: "John with his red
													car"
												</li>
												<li>
													Include context: "family dinner at restaurant with
													food"
												</li>
												<li>
													Use descriptive terms: "sunset photos with buildings"
												</li>
												<li>Quality filters ensure better results</li>
											</ul>
										</div>
									</AlertDescription>
								</Alert>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="faces">
					<EnhancedFaceRecognition
						directory={directory}
						onFaceSelected={handleFaceSelected}
					/>
				</TabsContent>

				<TabsContent value="objects">
					<ObjectDetectionSearch
						directory={directory}
						onObjectSelected={handleObjectSelected}
					/>
				</TabsContent>
			</Tabs>

			{/* Search Statistics Footer */}
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center justify-between text-sm text-gray-600">
						<div className="flex items-center gap-4">
							<span>Directory: {directory}</span>
							<span>•</span>
							<span>Face Recognition: Enhanced</span>
							<span>•</span>
							<span>Object Detection: AI-Powered</span>
						</div>
						<div className="flex items-center gap-2">
							<Filter className="w-3 h-3" />
							<span>Advanced Filters Active</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function Alert({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className || ""}`}
		>
			{children}
		</div>
	);
}
