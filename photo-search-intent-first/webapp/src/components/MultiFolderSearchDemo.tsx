import {
	BookOpen,
	Filter,
	FolderOpen,
	Layers,
	Search,
	Settings,
	Zap,
} from "lucide-react";
import React, { useState } from "react";
import {
	useEnhancedSearchContext,
	useWorkspaceStore,
} from "../hooks/useStores";
import { AdvancedQueryParser } from "../utils/advancedQueryParser";
import EnhancedWorkspace from "./EnhancedWorkspace";
import MultiFolderSearchControls from "./MultiFolderSearchControls";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface SavedSearchConfiguration {
	id: string;
	name: string;
	scope: {
		type: "all" | "selected" | "custom";
		selectedFolders: string[];
		searchScope: "all" | "recent" | "favorites";
	};
	query: string;
	createdAt: string;
	lastUsed: string;
}

export default function MultiFolderSearchDemo() {
	const workspace = useWorkspaceStore();
	const { state, actions } = useEnhancedSearchContext();
	const [savedConfigs, setSavedConfigs] = useState<SavedSearchConfiguration[]>([
		{
			id: "1",
			name: "Beach Photos",
			scope: {
				type: "custom",
				selectedFolders: ["/Users/john/Pictures/Vacation"],
				searchScope: "all",
			},
			query: "beach sunset NOT night",
			createdAt: "2024-01-15",
			lastUsed: "2024-01-20",
		},
		{
			id: "2",
			name: "Portrait Photography",
			scope: {
				type: "all",
				selectedFolders: [],
				searchScope: "all",
			},
			query: "portrait professional OR artistic",
			createdAt: "2024-01-10",
			lastUsed: "2024-01-18",
		},
	]);

	const [selectedFolders, setSelectedFolders] = useState<string[]>([]);

	const handleSearch = async (query: string, scope: any) => {
		// Parse the query using advanced parser
		const parsedQuery = AdvancedQueryParser.parse(query);
		console.log("Parsed query:", parsedQuery);

		// Perform the search
		await actions.performMultiFolderSearch(query, scope);
	};

	const handleSaveConfiguration = (name: string, scope: any) => {
		const newConfig: SavedSearchConfiguration = {
			id: Date.now().toString(),
			name,
			scope,
			query: state.query,
			createdAt: new Date().toISOString(),
			lastUsed: new Date().toISOString(),
		};

		setSavedConfigs((prev) => [...prev, newConfig]);
	};

	const handleLoadConfiguration = (config: SavedSearchConfiguration) => {
		actions.setQuery(config.query);
		actions.setSearchScope(config.scope);
	};

	// Get query analysis
	const queryAnalysis = state.query
		? AdvancedQueryParser.parse(state.query)
		: null;

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-bold flex items-center justify-center gap-2">
						<Layers className="w-8 h-8 text-blue-600" />
						Multi-Folder Search Demo
					</h1>
					<p className="text-gray-600">
						Enhanced search capabilities across multiple photo folders with
						advanced query parsing
					</p>
				</div>

				{/* Quick Stats */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<Card>
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-gray-600">Total Folders</p>
									<p className="text-2xl font-bold">{workspace.length}</p>
								</div>
								<FolderOpen className="w-8 h-8 text-blue-500" />
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-gray-600">Search Results</p>
									<p className="text-2xl font-bold">{state.results.length}</p>
								</div>
								<Search className="w-8 h-8 text-green-500" />
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-gray-600">Query Complexity</p>
									<p className="text-2xl font-bold capitalize">
										{queryAnalysis?.complexity || "simple"}
									</p>
								</div>
								<Zap className="w-8 h-8 text-yellow-500" />
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-gray-600">Boolean Logic</p>
									<p className="text-2xl font-bold">
										{queryAnalysis?.hasBooleanLogic ? "Yes" : "No"}
									</p>
								</div>
								<Settings className="w-8 h-8 text-purple-500" />
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Main Content */}
				<Tabs defaultValue="search" className="space-y-6">
					<TabsList className="grid w-full grid-cols-4">
						<TabsTrigger value="search">Search</TabsTrigger>
						<TabsTrigger value="workspace">Workspace</TabsTrigger>
						<TabsTrigger value="analysis">Query Analysis</TabsTrigger>
						<TabsTrigger value="saved">Saved Configs</TabsTrigger>
					</TabsList>

					<TabsContent value="search" className="space-y-6">
						<MultiFolderSearchControls
							workspace={workspace}
							searchScope={state.searchScope}
							onScopeChange={actions.setSearchScope}
							onSearch={handleSearch}
							savedConfigurations={savedConfigs}
							onSaveConfiguration={handleSaveConfiguration}
							onLoadConfiguration={handleLoadConfiguration}
						/>

						{/* Search Results */}
						{state.isSearching && (
							<Card>
								<CardContent className="p-6">
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium">
												Searching folders...
											</span>
											<span className="text-sm text-gray-600">
												{Math.round(state.searchProgress)}%
											</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className="bg-blue-600 h-2 rounded-full transition-all duration-300"
												style={{ width: `${state.searchProgress}%` }}
											></div>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{state.results.length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle>Search Results ({state.results.length})</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										{state.results.slice(0, 10).map((result, index) => (
											<div
												key={`${result.path}-${index}`}
												className="flex items-center justify-between p-3 border rounded-lg"
											>
												<div className="flex-1 min-w-0">
													<div className="text-sm font-medium truncate">
														{result.path.split("/").pop()}
													</div>
													<div className="text-xs text-gray-500 truncate">
														{result.path}
													</div>
													{result.folder && (
														<div className="text-xs text-blue-600 mt-1">
															Folder: {result.folder.split("/").pop()}
														</div>
													)}
												</div>
												<div className="text-right">
													<div className="text-sm font-medium">
														{(result.score * 100).toFixed(1)}%
													</div>
													<div className="text-xs text-gray-500">Score</div>
												</div>
											</div>
										))}
										{state.results.length > 10 && (
											<div className="text-center text-sm text-gray-500">
												+{state.results.length - 10} more results
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					<TabsContent value="workspace" className="space-y-6">
						<EnhancedWorkspace
							workspace={workspace}
							setWorkspace={() => {}} // This would be connected to workspace store
							selectedFolders={selectedFolders}
							onSelectionChange={setSelectedFolders}
							showSelection={true}
						/>
					</TabsContent>

					<TabsContent value="analysis" className="space-y-6">
						{queryAnalysis ? (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Query Breakdown */}
								<Card>
									<CardHeader>
										<CardTitle>Query Breakdown</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div>
											<h4 className="font-medium mb-2">Original Query</h4>
											<code className="bg-gray-100 p-2 rounded text-sm block">
												{queryAnalysis.original}
											</code>
										</div>

										<div>
											<h4 className="font-medium mb-2">Tokens</h4>
											<div className="flex flex-wrap gap-2">
												{queryAnalysis.tokens.map((token, index) => (
													<span
														key={index}
														className={`px-2 py-1 rounded text-xs ${
															token.type === "operator"
																? "bg-blue-100 text-blue-800"
																: token.type === "exclude"
																	? "bg-red-100 text-red-800"
																	: token.type === "keyword"
																		? "bg-gray-100 text-gray-800"
																		: "bg-purple-100 text-purple-800"
														}`}
													>
														{token.text} ({token.type})
													</span>
												))}
											</div>
										</div>

										{queryAnalysis.exclusions.length > 0 && (
											<div>
												<h4 className="font-medium mb-2">Exclusions</h4>
												<div className="flex flex-wrap gap-2">
													{queryAnalysis.exclusions.map((exclusion, index) => (
														<span
															key={index}
															className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
														>
															-{exclusion}
														</span>
													))}
												</div>
											</div>
										)}

										{queryAnalysis.expansions.length > 0 && (
											<div>
												<h4 className="font-medium mb-2">Query Expansions</h4>
												<div className="flex flex-wrap gap-2">
													{queryAnalysis.expansions.map((expansion, index) => (
														<span
															key={index}
															className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
														>
															+{expansion}
														</span>
													))}
												</div>
											</div>
										)}
									</CardContent>
								</Card>

								{/* Context Analysis */}
								<Card>
									<CardHeader>
										<CardTitle>Context Analysis</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{Object.entries(queryAnalysis.context).map(
											([key, value]) =>
												value && (
													<div
														key={key}
														className="flex items-center justify-between"
													>
														<span className="capitalize font-medium">
															{key.replace("Context", "")}
														</span>
														<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
															{value}
														</span>
													</div>
												),
										)}

										{!Object.values(queryAnalysis.context).some(Boolean) && (
											<div className="text-center text-gray-500 py-8">
												<Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
												<p>No specific context detected in this query</p>
											</div>
										)}
									</CardContent>
								</Card>
							</div>
						) : (
							<Card>
								<CardContent className="p-12 text-center">
									<BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
									<h3 className="text-lg font-medium mb-2">
										No Query to Analyze
									</h3>
									<p className="text-gray-500">
										Enter a search query to see detailed analysis
									</p>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					<TabsContent value="saved" className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{savedConfigs.map((config) => (
								<Card key={config.id}>
									<CardContent className="p-4">
										<div className="space-y-3">
											<div className="flex items-center justify-between">
												<h4 className="font-medium">{config.name}</h4>
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleLoadConfiguration(config)}
												>
													Load
												</Button>
											</div>

											<div className="text-sm text-gray-600 space-y-1">
												<div>
													<strong>Query:</strong> {config.query}
												</div>
												<div>
													<strong>Scope:</strong> {config.scope.type}
												</div>
												<div>
													<strong>Folders:</strong>{" "}
													{config.scope.selectedFolders.length}
												</div>
												<div>
													<strong>Last Used:</strong>{" "}
													{new Date(config.lastUsed).toLocaleDateString()}
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>

						{savedConfigs.length === 0 && (
							<Card>
								<CardContent className="p-12 text-center">
									<BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
									<h3 className="text-lg font-medium mb-2">
										No Saved Configurations
									</h3>
									<p className="text-gray-500">
										Save your search configurations for quick access
									</p>
								</CardContent>
							</Card>
						)}
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
