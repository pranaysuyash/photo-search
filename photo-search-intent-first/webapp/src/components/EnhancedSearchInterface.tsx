import { Search, Settings, Zap } from "lucide-react";
import { useState } from "react";
import {
	type ParsedQuery,
	queryProcessor,
} from "../services/AdvancedQueryProcessor";
import EnhancedMultiFolderSearch from "./EnhancedMultiFolderSearch";
import MultiFolderSearchResults from "./MultiFolderSearchResults";
import MultiFolderSearchToggle from "./MultiFolderSearchToggle";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface SearchResult {
	path: string;
	folder: string;
	score: number;
	filename: string;
}

interface EnhancedSearchInterfaceProps {
	workspace: string[];
	onSearch: (query: string, scope: any) => void;
	className?: string;
}

export default function EnhancedSearchInterface({
	workspace,
	onSearch,
	className,
}: EnhancedSearchInterfaceProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
	const [searchScope, setSearchScope] = useState<unknown>({
		type: "all",
		selectedFolders: [],
	});
	const [isSearching, setIsSearching] = useState(false);
	const [activeTab, setActiveTab] = useState("simple");

	// Parse query in real-time
	const handleQueryChange = (query: string) => {
		setSearchQuery(query);
		if (query.trim()) {
			const parsed = queryProcessor.processQuery(query);
			setParsedQuery(parsed);
		} else {
			setParsedQuery(null);
		}
	};

	// Handle search submission
	const handleSearch = async (query: string, scope: any) => {
		setIsSearching(true);
		setSearchScope(scope);

		// Simulate search results (in real implementation, this would call the search API)
		setTimeout(() => {
			const mockResults: SearchResult[] = [
				{
					path: "/Users/john/Pictures/Vacation/beach_sunset.jpg",
					folder: "/Users/john/Pictures/Vacation",
					score: 0.95,
					filename: "beach_sunset.jpg",
				},
				{
					path: "/Users/john/Pictures/Family/family_beach_day.jpg",
					folder: "/Users/john/Pictures/Family",
					score: 0.88,
					filename: "family_beach_day.jpg",
				},
				{
					path: "/Users/john/Pictures/Travel/summer_vacation.jpg",
					folder: "/Users/john/Pictures/Travel",
					score: 0.82,
					filename: "summer_vacation.jpg",
				},
			].filter((result) => {
				// Filter results based on search scope
				if (scope.type === "all") return true;
				if (scope.type === "selected") return true; // In real implementation, check if folder is recent
				if (scope.type === "custom")
					return scope.selectedFolders.includes(result.folder);
				return true;
			});

			setSearchResults(mockResults);
			setIsSearching(false);
		}, 1000);
	};

	// Handle simple search form submission
	const handleSimpleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim()) return;
		handleSearch(searchQuery, { type: "all", selectedFolders: [] });
	};

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Header */}
			<Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
				<CardHeader>
					<CardTitle className="flex items-center gap-3">
						<div className="p-2 bg-blue-600 rounded-lg">
							<Search className="w-6 h-6 text-white" />
						</div>
						<div>
							<div className="text-xl text-blue-900">
								Enhanced Search Interface
							</div>
							<div className="text-sm text-blue-700">
								Advanced search with multi-folder support and intelligent query
								understanding
							</div>
						</div>
					</CardTitle>
				</CardHeader>
			</Card>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="space-y-6"
			>
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="simple">Simple Search</TabsTrigger>
					<TabsTrigger value="multi-folder">Multi-Folder</TabsTrigger>
					<TabsTrigger value="advanced">Advanced Query</TabsTrigger>
				</TabsList>

				{/* Simple Search Tab */}
				<TabsContent value="simple" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Search className="w-5 h-5" />
								Quick Search
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<form onSubmit={handleSimpleSearch} className="flex gap-3">
								<div className="flex-1 relative">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
									<Input
										placeholder="Search across all folders..."
										value={searchQuery}
										onChange={(e) => handleQueryChange(e.target.value)}
										className="pl-10 h-12 text-base"
									/>
								</div>
								<Button
									type="submit"
									disabled={!searchQuery.trim()}
									className="px-6 h-12"
								>
									Search All Folders
								</Button>
							</form>

							{/* Query Analysis */}
							{parsedQuery && parsedQuery.intent !== "simple" && (
								<Card className="border-purple-200 bg-purple-50/30">
									<CardContent className="p-4">
										<div className="flex items-center gap-2 mb-2">
											<Zap className="w-4 h-4 text-purple-600" />
											<span className="font-medium text-purple-900">
												Query Analysis
											</span>
										</div>
										<div className="text-sm text-purple-700">
											<div>
												Intent: <strong>{parsedQuery.intent}</strong>
											</div>
											<div>
												Terms: <strong>{parsedQuery.terms.length}</strong>
											</div>
											<div>
												Expanded:{" "}
												<strong>{parsedQuery.expandedTerms.length}</strong>
											</div>
											{parsedQuery.filters.length > 0 && (
												<div>
													Filters: <strong>{parsedQuery.filters.length}</strong>
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Multi-Folder Search Tab */}
				<TabsContent value="multi-folder" className="space-y-6">
					<EnhancedMultiFolderSearch
						workspace={workspace}
						onSearch={handleSearch}
						currentQuery={searchQuery}
					/>
				</TabsContent>

				{/* Advanced Query Tab */}
				<TabsContent value="advanced" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Settings className="w-5 h-5" />
								Advanced Query Processing
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-4">
								<div>
									<label className="text-sm font-medium text-gray-700">
										Advanced Query:
									</label>
									<Input
										placeholder="Try: 'beach AND sunset NOT night' or 'family OR friends'"
										value={searchQuery}
										onChange={(e) => handleQueryChange(e.target.value)}
										className="mt-2 h-12 text-base font-mono"
									/>
								</div>

								{parsedQuery && (
									<Card className="border-blue-200 bg-blue-50/30">
										<CardContent className="p-4">
											<div className="space-y-3">
												<div className="font-medium text-blue-900">
													Parsed Query:
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
													<div>
														<span className="font-medium">Original:</span>{" "}
														{parsedQuery.original}
													</div>
													<div>
														<span className="font-medium">Intent:</span>{" "}
														{parsedQuery.intent}
													</div>
													<div>
														<span className="font-medium">Terms:</span>{" "}
														{parsedQuery.terms.length}
													</div>
													<div>
														<span className="font-medium">Expanded:</span>{" "}
														{parsedQuery.expandedTerms.length}
													</div>
												</div>
												{parsedQuery.expandedTerms.length > 0 && (
													<div>
														<span className="font-medium">Expanded Terms:</span>
														<div className="flex flex-wrap gap-1 mt-1">
															{parsedQuery.expandedTerms
																.slice(0, 10)
																.map((term, index) => (
																	<span
																		key={index}
																		className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
																	>
																		{term}
																	</span>
																))}
															{parsedQuery.expandedTerms.length > 10 && (
																<span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
																	+{parsedQuery.expandedTerms.length - 10} more
																</span>
															)}
														</div>
													</div>
												)}
											</div>
										</CardContent>
									</Card>
								)}

								<Button
									onClick={() =>
										handleSearch(searchQuery, {
											type: "all",
											selectedFolders: [],
										})
									}
									disabled={!searchQuery.trim()}
									className="w-full h-12"
								>
									Search with Advanced Processing
								</Button>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<Separator />

			{/* Search Results */}
			{isSearching && (
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-center space-y-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
							<span className="text-lg font-medium">Searching...</span>
						</div>
					</CardContent>
				</Card>
			)}

			{searchResults.length > 0 && !isSearching && (
				<MultiFolderSearchResults
					results={searchResults}
					searchQuery={searchQuery}
					searchScope={searchScope}
					onResultClick={(result) => {
						console.log("Result clicked:", result);
						// Handle result click (e.g., open in lightbox)
					}}
					onFolderFilter={(folderPath) => {
						console.log("Filter by folder:", folderPath);
						// Handle folder filtering
						setSearchScope({
							type: "custom",
							selectedFolders: [folderPath],
						});
					}}
				/>
			)}

			{/* Multi-Folder Search Toggle (shown when not in multi-folder tab) */}
			{activeTab !== "multi-folder" && (
				<MultiFolderSearchToggle
					workspace={workspace}
					onSearch={handleSearch}
					currentQuery={searchQuery}
				/>
			)}
		</div>
	);
}
