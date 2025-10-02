import {
	FolderOpen,
	FolderTree,
	Globe,
	RotateCcw,
	Save,
	Search,
	Settings,
	X,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

interface SearchScope {
	type: "all" | "selected" | "custom";
	selectedFolders: string[];
	searchScope: "all" | "recent" | "favorites";
}

interface SavedSearchConfiguration {
	id: string;
	name: string;
	scope: SearchScope;
	query: string;
	createdAt: string;
	lastUsed: string;
}

interface MultiFolderSearchControlsProps {
	workspace: string[];
	searchScope: SearchScope;
	onScopeChange: (scope: SearchScope) => void;
	onSearch: (query: string, scope: SearchScope) => void;
	savedConfigurations?: SavedSearchConfiguration[];
	onSaveConfiguration?: (name: string, scope: SearchScope) => void;
	onLoadConfiguration?: (config: SavedSearchConfiguration) => void;
}

export default function MultiFolderSearchControls({
	workspace,
	searchScope,
	onScopeChange,
	onSearch,
	savedConfigurations = [],
	onSaveConfiguration,
	onLoadConfiguration,
}: MultiFolderSearchControlsProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [showFolderSelector, setShowFolderSelector] = useState(false);
	const [newConfigName, setNewConfigName] = useState("");
	const [recentSearches, setRecentSearches] = useState<
		Array<{ query: string; scope: SearchScope; timestamp: number }>
	>([]);

	// Filter folders based on search in folder selector
	const [folderSearchTerm, setFolderSearchTerm] = useState("");
	const filteredFolders = useMemo(() => {
		return workspace.filter((folder) =>
			folder.toLowerCase().includes(folderSearchTerm.toLowerCase()),
		);
	}, [workspace, folderSearchTerm]);

	// Get folder statistics
	const folderStats = useMemo(() => {
		const totalFolders = workspace.length;
		const selectedFolders =
			searchScope.type === "custom"
				? searchScope.selectedFolders.length
				: searchScope.type === "all"
					? totalFolders
					: 0;

		return {
			total: totalFolders,
			selected: selectedFolders,
			searching: searchScope.type === "all" ? totalFolders : selectedFolders,
		};
	}, [workspace, searchScope]);

	// Handle search submission
	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim()) return;

		// Add to recent searches
		const newRecentSearch = {
			query: searchQuery.trim(),
			scope: { ...searchScope },
			timestamp: Date.now(),
		};

		setRecentSearches((prev) => {
			const filtered = prev.filter((s) => s.query !== searchQuery.trim());
			return [newRecentSearch, ...filtered].slice(0, 10); // Keep last 10
		});

		onSearch(searchQuery.trim(), searchScope);
	};

	// Toggle folder selection in custom scope
	const toggleFolderSelection = (folderPath: string) => {
		if (searchScope.type !== "custom") return;

		const newSelectedFolders = searchScope.selectedFolders.includes(folderPath)
			? searchScope.selectedFolders.filter((f) => f !== folderPath)
			: [...searchScope.selectedFolders, folderPath];

		onScopeChange({
			...searchScope,
			selectedFolders: newSelectedFolders,
		});
	};

	// Select all folders for custom scope
	const selectAllFolders = () => {
		onScopeChange({
			type: "custom",
			selectedFolders: [...workspace],
			searchScope: "all",
		});
	};

	// Clear folder selection
	const clearFolderSelection = () => {
		onScopeChange({
			type: "custom",
			selectedFolders: [],
			searchScope: "all",
		});
	};

	// Save current configuration
	const saveConfiguration = () => {
		if (!newConfigName.trim() || !onSaveConfiguration) return;
		onSaveConfiguration(newConfigName.trim(), searchScope);
		setNewConfigName("");
	};

	// Load saved configuration
	const loadConfiguration = (config: SavedSearchConfiguration) => {
		if (onLoadConfiguration) {
			onLoadConfiguration(config);
			setSearchQuery(config.query);
		}
	};

	// Quick scope presets
	const scopePresets = [
		{
			name: "All Folders",
			type: "all" as const,
			icon: <Globe className="w-4 h-4" />,
			description: "Search across all workspace folders",
		},
		{
			name: "Recent Folders",
			type: "selected" as const,
			icon: <FolderOpen className="w-4 h-4" />,
			description: "Search in recently added folders",
		},
		{
			name: "Custom Selection",
			type: "custom" as const,
			icon: <FolderTree className="w-4 h-4" />,
			description: "Choose specific folders to search",
		},
	];

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Search className="w-5 h-5" />
						Multi-Folder Search
					</CardTitle>
					<div className="flex items-center gap-2">
						<Badge variant="outline" className="text-xs">
							{folderStats.searching} of {folderStats.total} folders
						</Badge>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowAdvanced(!showAdvanced)}
						>
							<Settings className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Search Form */}
				<form onSubmit={handleSearch} className="flex gap-2">
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
						<Input
							placeholder="Search across folders..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Button type="submit" disabled={!searchQuery.trim()}>
						Search
					</Button>
				</form>

				{/* Scope Selection */}
				<div className="space-y-3">
					<div className="text-sm font-medium">Search Scope:</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
						{scopePresets.map((preset) => (
							<Button
								key={preset.name}
								variant={
									searchScope.type === preset.type ? "default" : "outline"
								}
								onClick={() =>
									onScopeChange({
										type: preset.type,
										selectedFolders:
											preset.type === "custom"
												? searchScope.selectedFolders
												: [],
										searchScope: "all",
									})
								}
								className="flex flex-col items-center gap-2 h-auto py-4"
							>
								{preset.icon}
								<div className="text-sm">{preset.name}</div>
								<div className="text-xs opacity-70">{preset.description}</div>
							</Button>
						))}
					</div>

					{/* Custom Folder Selection */}
					{searchScope.type === "custom" && (
						<div className="border rounded-lg p-3 space-y-3">
							<div className="flex items-center justify-between">
								<div className="text-sm font-medium">
									Selected Folders ({searchScope.selectedFolders.length})
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={selectAllFolders}
										disabled={
											searchScope.selectedFolders.length === workspace.length
										}
									>
										Select All
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={clearFolderSelection}
										disabled={searchScope.selectedFolders.length === 0}
									>
										Clear
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowFolderSelector(!showFolderSelector)}
									>
										{showFolderSelector ? "Hide" : "Show"} Folders
									</Button>
								</div>
							</div>

							{showFolderSelector && (
								<div className="space-y-3">
									<Input
										placeholder="Search folders..."
										value={folderSearchTerm}
										onChange={(e) => setFolderSearchTerm(e.target.value)}
									/>

									<div className="max-h-48 overflow-y-auto space-y-1">
										{filteredFolders.map((folder) => {
											const isSelected =
												searchScope.selectedFolders.includes(folder);
											const folderName = folder.split("/").pop() || folder;

											return (
												<div
													key={folder}
													className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
												>
													<Checkbox
														checked={isSelected}
														onCheckedChange={() =>
															toggleFolderSelection(folder)
														}
													/>
													<div className="flex-1 min-w-0">
														<div className="text-sm font-medium truncate">
															{folderName}
														</div>
														<div className="text-xs text-gray-500 truncate">
															{folder}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							)}

							{/* Selected folders summary */}
							{searchScope.selectedFolders.length > 0 && (
								<div className="flex flex-wrap gap-1">
									{searchScope.selectedFolders.slice(0, 5).map((folder) => (
										<Badge key={folder} variant="secondary" className="text-xs">
											{folder.split("/").pop() || folder}
										</Badge>
									))}
									{searchScope.selectedFolders.length > 5 && (
										<Badge variant="secondary" className="text-xs">
											+{searchScope.selectedFolders.length - 5} more
										</Badge>
									)}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Advanced Options */}
				{showAdvanced && (
					<div className="space-y-4 border-t pt-4">
						{/* Saved Configurations */}
						{savedConfigurations.length > 0 && (
							<div className="space-y-2">
								<div className="text-sm font-medium">Saved Configurations:</div>
								<div className="grid grid-cols-1 gap-2">
									{savedConfigurations.slice(0, 3).map((config) => (
										<Button
											key={config.id}
											variant="outline"
											onClick={() => loadConfiguration(config)}
											className="justify-start"
										>
											<div className="flex-1 text-left">
												<div className="font-medium">{config.name}</div>
												<div className="text-xs text-gray-500">
													{config.query} • {config.scope.selectedFolders.length}{" "}
													folders
												</div>
											</div>
										</Button>
									))}
								</div>
							</div>
						)}

						{/* Recent Searches */}
						{recentSearches.length > 0 && (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<div className="text-sm font-medium">Recent Searches:</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setRecentSearches([])}
									>
										<RotateCcw className="w-3 h-3" />
									</Button>
								</div>
								<div className="space-y-1">
									{recentSearches.slice(0, 5).map((search, index) => (
										<Button
											key={index}
											variant="ghost"
											onClick={() => {
												setSearchQuery(search.query);
												onScopeChange(search.scope);
											}}
											className="justify-start w-full"
										>
											<div className="flex-1 text-left">
												<div className="text-sm">{search.query}</div>
												<div className="text-xs text-gray-500">
													{search.scope.type} scope
												</div>
											</div>
										</Button>
									))}
								</div>
							</div>
						)}

						{/* Save Configuration */}
						{onSaveConfiguration && (
							<div className="flex gap-2">
								<Input
									placeholder="Save current configuration as..."
									value={newConfigName}
									onChange={(e) => setNewConfigName(e.target.value)}
								/>
								<Button
									onClick={saveConfiguration}
									disabled={!newConfigName.trim()}
								>
									<Save className="w-4 h-4 mr-2" />
									Save
								</Button>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
