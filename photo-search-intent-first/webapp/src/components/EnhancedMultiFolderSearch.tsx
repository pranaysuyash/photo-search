import {
	ArrowRight,
	BookOpen,
	Filter,
	FolderOpen,
	FolderTree,
	Globe,
	HelpCircle,
	Info,
	Layers,
	Search,
	Settings,
	Sparkles,
	X,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "./ui/collapsible";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface SearchScope {
	type: "all" | "selected" | "custom";
	selectedFolders: string[];
	searchScope: "all" | "recent" | "favorites";
}

interface FolderInfo {
	path: string;
	name: string;
	photoCount?: number;
	lastModified?: string;
	isFavorite?: boolean;
}

interface EnhancedMultiFolderSearchProps {
	workspace: string[];
	onSearch: (query: string, scope: SearchScope) => void;
	currentQuery?: string;
	className?: string;
}

export default function EnhancedMultiFolderSearch({
	workspace,
	onSearch,
	currentQuery = "",
	className,
}: EnhancedMultiFolderSearchProps) {
	const [searchQuery, setSearchQuery] = useState(currentQuery);
	const [searchScope, setSearchScope] = useState<SearchScope>({
		type: "all",
		selectedFolders: [],
		searchScope: "all",
	});
	const [showHelp, setShowHelp] = useState(false);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [activeTab, setActiveTab] = useState("simple");

	// Enhanced folder information
	const folderInfo: FolderInfo[] = useMemo(() => {
		return workspace.map((folder) => ({
			path: folder,
			name: folder.split("/").pop() || folder,
			photoCount: Math.floor(Math.random() * 5000) + 100, // Mock data
			lastModified: new Date(
				Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
			).toISOString(),
			isFavorite: Math.random() > 0.7, // Mock data
		}));
	}, [workspace]);

	// Filter folders based on search
	const [folderSearchTerm, setFolderSearchTerm] = useState("");
	const filteredFolders = useMemo(() => {
		return folderInfo.filter(
			(folder) =>
				folder.name.toLowerCase().includes(folderSearchTerm.toLowerCase()) ||
				folder.path.toLowerCase().includes(folderSearchTerm.toLowerCase()),
		);
	}, [folderInfo, folderSearchTerm]);

	// Calculate search statistics
	const searchStats = useMemo(() => {
		const totalFolders = workspace.length;
		const selectedFolders =
			searchScope.type === "custom"
				? searchScope.selectedFolders.length
				: searchScope.type === "all"
					? totalFolders
					: 0;

		const totalPhotos = folderInfo.reduce(
			(sum, folder) => sum + (folder.photoCount || 0),
			0,
		);
		const selectedPhotos =
			searchScope.type === "custom"
				? folderInfo
						.filter((f) => searchScope.selectedFolders.includes(f.path))
						.reduce((sum, folder) => sum + (folder.photoCount || 0), 0)
				: searchScope.type === "all"
					? totalPhotos
					: 0;

		return {
			totalFolders,
			selectedFolders,
			totalPhotos,
			selectedPhotos,
			searchingIn: searchScope.type === "all" ? totalFolders : selectedFolders,
		};
	}, [workspace, searchScope, folderInfo]);

	// Handle search submission
	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim()) return;

		onSearch(searchQuery.trim(), searchScope);
	};

	// Toggle folder selection
	const toggleFolderSelection = (folderPath: string) => {
		if (searchScope.type !== "custom") return;

		const newSelectedFolders = searchScope.selectedFolders.includes(folderPath)
			? searchScope.selectedFolders.filter((f) => f !== folderPath)
			: [...searchScope.selectedFolders, folderPath];

		setSearchScope({
			...searchScope,
			selectedFolders: newSelectedFolders,
		});
	};

	// Quick scope presets with better descriptions
	const scopePresets = [
		{
			type: "all" as const,
			name: "All Folders",
			description: "Search every folder in your workspace",
			icon: <Globe className="w-5 h-5" />,
			color: "text-blue-600",
			bgColor: "bg-blue-50",
			borderColor: "border-blue-200",
			detail: `${searchStats.totalFolders} folders • ${searchStats.totalPhotos.toLocaleString()} photos`,
		},
		{
			type: "selected" as const,
			name: "Recent Folders",
			description: "Focus on recently modified folders",
			icon: <FolderOpen className="w-5 h-5" />,
			color: "text-green-600",
			bgColor: "bg-green-50",
			borderColor: "border-green-200",
			detail: "Recently updated folders only",
		},
		{
			type: "custom" as const,
			name: "Choose Folders",
			description: "Select specific folders to search",
			icon: <FolderTree className="w-5 h-5" />,
			color: "text-purple-600",
			bgColor: "bg-purple-50",
			borderColor: "border-purple-200",
			detail: `${searchScope.selectedFolders.length} folders selected`,
		},
	];

	// Search templates for common multi-folder scenarios
	const searchTemplates = [
		{
			name: "Family Across Years",
			query: "family OR relatives",
			scopes: ["all", "custom"],
			description: "Find family photos in all folders",
		},
		{
			name: "Recent Travel Photos",
			query: "vacation OR travel OR trip",
			scopes: ["selected", "custom"],
			description: "Recent vacation pictures",
		},
		{
			name: "Professional Work",
			query: "professional OR work OR business",
			scopes: ["custom"],
			description: "Work-related photos only",
		},
		{
			name: "Nature & Landscapes",
			query: "nature OR landscape OR outdoor",
			scopes: ["all"],
			description: "All nature photography",
		},
	];

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Header with clear explanation */}
			<Card className="border-2 border-blue-200 bg-blue-50/30">
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-600 rounded-lg">
								<Layers className="w-6 h-6 text-white" />
							</div>
							<div>
								<CardTitle className="text-xl text-blue-900">
									Multi-Folder Search
								</CardTitle>
								<p className="text-sm text-blue-700 mt-1">
									Search across multiple folders simultaneously with intelligent
									scope selection
								</p>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowHelp(!showHelp)}
							className="text-blue-600 border-blue-200 hover:bg-blue-100"
						>
							<HelpCircle className="w-4 h-4 mr-2" />
							{showHelp ? "Hide" : "Show"} Help
						</Button>
					</div>
				</CardHeader>

				{/* Help Section */}
				{showHelp && (
					<CardContent className="pt-0 border-t border-blue-200">
						<div className="bg-white rounded-lg p-4 space-y-3">
							<div className="flex items-start gap-2">
								<Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
								<div className="text-sm text-gray-700">
									<strong>How it works:</strong> Select which folders to include
									in your search, then enter your search terms. The system will
									search across all selected folders simultaneously and show
									combined results.
								</div>
							</div>
							<div className="flex items-start gap-2">
								<Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
								<div className="text-sm text-gray-700">
									<strong>Pro tip:</strong> Use specific folder selection for
									focused searches, or "All Folders" for comprehensive searches
									across your entire photo library.
								</div>
							</div>
						</div>
					</CardContent>
				)}
			</Card>

			{/* Search Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card className="text-center">
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-blue-600">
							{searchStats.totalFolders}
						</div>
						<div className="text-sm text-gray-600">Total Folders</div>
					</CardContent>
				</Card>
				<Card className="text-center">
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-green-600">
							{searchStats.selectedFolders}
						</div>
						<div className="text-sm text-gray-600">Selected</div>
					</CardContent>
				</Card>
				<Card className="text-center">
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-purple-600">
							{searchStats.totalPhotos.toLocaleString()}
						</div>
						<div className="text-sm text-gray-600">Total Photos</div>
					</CardContent>
				</Card>
				<Card className="text-center">
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-orange-600">
							{searchStats.selectedPhotos.toLocaleString()}
						</div>
						<div className="text-sm text-gray-600">Searchable Photos</div>
					</CardContent>
				</Card>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="space-y-6"
			>
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="simple">Simple Search</TabsTrigger>
					<TabsTrigger value="advanced">Advanced</TabsTrigger>
					<TabsTrigger value="templates">Templates</TabsTrigger>
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
							<form onSubmit={handleSearch} className="flex gap-3">
								<div className="flex-1 relative">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
									<Input
										placeholder="What are you looking for across multiple folders?"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="pl-10 h-12 text-base"
									/>
								</div>
								<Button
									type="submit"
									disabled={
										!searchQuery.trim() || searchStats.selectedFolders === 0
									}
									className="px-6 h-12"
								>
									Search {searchStats.selectedFolders} Folders
								</Button>
							</form>

							{/* Search Scope Selection */}
							<div className="space-y-3">
								<Label className="text-sm font-medium text-gray-700">
									Search in these folders:
								</Label>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
									{scopePresets.map((preset) => (
										<button
											type="button"
											key={preset.type}
											onClick={() =>
												setSearchScope({
													type: preset.type,
													selectedFolders:
														preset.type === "custom"
															? searchScope.selectedFolders
															: [],
													searchScope: "all",
												})
											}
											className={`p-4 rounded-lg border-2 transition-all ${
												searchScope.type === preset.type
													? `${preset.bgColor} ${preset.borderColor} ${preset.color}`
													: "border-gray-200 hover:border-gray-300 bg-white"
											}`}
										>
											<div className="flex items-center gap-3">
												{preset.icon}
												<div className="text-left">
													<div className="font-medium">{preset.name}</div>
													<div className="text-xs opacity-80">
														{preset.description}
													</div>
													<div className="text-xs font-medium mt-1">
														{preset.detail}
													</div>
												</div>
											</div>
										</button>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Advanced Tab */}
				<TabsContent value="advanced" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Settings className="w-5 h-5" />
								Advanced Folder Selection
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Custom Folder Selection */}
							<div className="border rounded-lg p-4 space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<h4 className="font-medium">Custom Folder Selection</h4>
										<p className="text-sm text-gray-600">
											Choose specific folders to include in your search
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="outline" className="text-sm">
											{searchScope.selectedFolders.length} selected
										</Badge>
										{searchScope.type !== "custom" && (
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													setSearchScope({
														type: "custom",
														selectedFolders: [],
														searchScope: "all",
													})
												}
											>
												Enable Custom Selection
											</Button>
										)}
									</div>
								</div>

								{searchScope.type === "custom" && (
									<>
										{/* Folder Search */}
										<Input
											placeholder="Search folders by name..."
											value={folderSearchTerm}
											onChange={(e) => setFolderSearchTerm(e.target.value)}
											className="max-w-md"
										/>

										{/* Quick Actions */}
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													setSearchScope({
														...searchScope,
														selectedFolders: workspace,
													})
												}
												disabled={
													searchScope.selectedFolders.length ===
													workspace.length
												}
											>
												Select All ({workspace.length})
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													setSearchScope({
														...searchScope,
														selectedFolders: [],
													})
												}
												disabled={searchScope.selectedFolders.length === 0}
											>
												Clear Selection
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													setSearchScope({
														...searchScope,
														selectedFolders: folderInfo
															.filter((f) => f.isFavorite)
															.map((f) => f.path),
													})
												}
											>
												Select Favorites Only
											</Button>
										</div>

										{/* Folder List */}
										<div className="max-h-64 overflow-y-auto border rounded-lg">
											{filteredFolders.map((folder) => {
												const isSelected = searchScope.selectedFolders.includes(
													folder.path,
												);
												return (
													<div
														key={folder.path}
														className={`flex items-center gap-3 p-3 border-b hover:bg-gray-50 ${
															isSelected ? "bg-blue-50" : ""
														}`}
													>
														<Checkbox
															checked={isSelected}
															onCheckedChange={() =>
																toggleFolderSelection(folder.path)
															}
														/>
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2">
																<span className="font-medium truncate">
																	{folder.name}
																</span>
																{folder.isFavorite && (
																	<Badge
																		variant="secondary"
																		className="text-xs"
																	>
																		Favorite
																	</Badge>
																)}
															</div>
															<div className="text-sm text-gray-500 truncate">
																{folder.path}
															</div>
															<div className="text-xs text-gray-400">
																{folder.photoCount?.toLocaleString()} photos •
																{new Date(
																	folder.lastModified || "",
																).toLocaleDateString()}
															</div>
														</div>
													</div>
												);
											})}
										</div>

										{/* Selected Folders Summary */}
										{searchScope.selectedFolders.length > 0 && (
											<div className="bg-gray-50 rounded-lg p-3">
												<div className="text-sm font-medium mb-2">
													Selected Folders:
												</div>
												<div className="flex flex-wrap gap-2">
													{searchScope.selectedFolders
														.slice(0, 8)
														.map((folderPath) => {
															const folder = folderInfo.find(
																(f) => f.path === folderPath,
															);
															return (
																<Badge
																	key={folderPath}
																	variant="secondary"
																	className="text-xs"
																>
																	{folder?.name || folderPath.split("/").pop()}
																</Badge>
															);
														})}
													{searchScope.selectedFolders.length > 8 && (
														<Badge variant="secondary" className="text-xs">
															+{searchScope.selectedFolders.length - 8} more
														</Badge>
													)}
												</div>
											</div>
										)}
									</>
								)}
							</div>

							{/* Search Form */}
							<Separator />
							<form onSubmit={handleSearch} className="flex gap-3">
								<div className="flex-1">
									<Input
										placeholder="Enter your search query..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="h-12 text-base"
									/>
								</div>
								<Button
									type="submit"
									disabled={
										!searchQuery.trim() || searchStats.selectedFolders === 0
									}
									className="px-6 h-12"
								>
									<Search className="w-4 h-4 mr-2" />
									Search
								</Button>
							</form>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Templates Tab */}
				<TabsContent value="templates" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<BookOpen className="w-5 h-5" />
								Search Templates
							</CardTitle>
							<p className="text-sm text-gray-600">
								Quick-start your search with pre-configured templates for common
								scenarios
							</p>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{searchTemplates.map((template, index) => (
									<Card
										key={index}
										className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors"
									>
										<CardContent className="p-4">
											<div className="space-y-3">
												<div>
													<h4 className="font-medium">{template.name}</h4>
													<p className="text-sm text-gray-600">
														{template.description}
													</p>
												</div>
												<div className="bg-gray-50 rounded p-2">
													<code className="text-sm text-blue-600">
														{template.query}
													</code>
												</div>
												<div className="flex gap-2">
													{template.scopes.map((scope) => (
														<Badge
															key={scope}
															variant="outline"
															className="text-xs"
														>
															{scope === "all" && "All Folders"}
															{scope === "selected" && "Recent Folders"}
															{scope === "custom" && "Custom Selection"}
														</Badge>
													))}
												</div>
												<Button
													variant="outline"
													size="sm"
													className="w-full"
													onClick={() => {
														setSearchQuery(template.query);
														const suggestedScope = template.scopes.includes(
															"custom",
														)
															? "custom"
															: (template.scopes[0] as unknown);
														if (suggestedScope === "custom") {
															setSearchScope({
																type: "custom",
																selectedFolders: [],
																searchScope: "all",
															});
															setActiveTab("advanced");
														} else {
															setSearchScope({
																type: suggestedScope,
																selectedFolders: [],
																searchScope: "all",
															});
														}
													}}
												>
													Use This Template
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Search Summary */}
			{searchQuery.trim() && (
				<Card className="border-green-200 bg-green-50/30">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<Search className="w-5 h-5 text-green-600" />
							<div className="flex-1">
								<div className="font-medium text-green-900">
									Ready to search for "
									<span className="font-bold">{searchQuery}</span>"
								</div>
								<div className="text-sm text-green-700">
									{searchScope.type === "all" &&
										`Searching all ${searchStats.totalFolders} folders (${searchStats.totalPhotos.toLocaleString()} photos)`}
									{searchScope.type === "selected" &&
										"Searching recently modified folders"}
									{searchScope.type === "custom" &&
										`Searching ${searchStats.selectedFolders} selected folders (${searchStats.selectedPhotos.toLocaleString()} photos)`}
								</div>
							</div>
							<ArrowRight className="w-5 h-5 text-green-600" />
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
