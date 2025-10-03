import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface SearchResult {
	path: string;
	folder: string;
	score: number;
	filename: string;
}

interface FolderResults {
	folderPath: string;
	folderName: string;
	results: SearchResult[];
	totalCount: number;
	averageScore: number;
}

interface MultiFolderSearchResultsProps {
	results: SearchResult[];
	searchQuery: string;
	searchScope: {
		type: "all" | "selected" | "custom";
		selectedFolders: string[];
	};
	onResultClick?: (result: SearchResult) => void;
	onFolderFilter?: (folderPath: string) => void;
	className?: string;
}

export default function MultiFolderSearchResults({
	results,
	searchQuery,
	searchScope,
	onResultClick,
	onFolderFilter,
	className,
}: MultiFolderSearchResultsProps) {
	// Group results by folder
	const folderResults: FolderResults[] = results.reduce((acc, result) => {
		const existingFolder = acc.find((f) => f.folderPath === result.folder);
		if (existingFolder) {
			existingFolder.results.push(result);
			existingFolder.totalCount++;
		} else {
			acc.push({
				folderPath: result.folder,
				folderName: result.folder.split("/").pop() || result.folder,
				results: [result],
				totalCount: 1,
				averageScore: result.score,
			});
		}
		return acc;
	}, [] as FolderResults[]);

	// Sort folders by result count and average score
	folderResults.sort((a, b) => {
		const countDiff = b.totalCount - a.totalCount;
		if (countDiff !== 0) return countDiff;
		return b.averageScore - a.averageScore;
	});

	// Calculate folder statistics
	const totalFolders = folderResults.length;
	const totalResults = results.length;
	const averageScore =
		results.reduce((sum, r) => sum + r.score, 0) / results.length;

	const topFolders = folderResults.slice(0, 5);
	const otherFolders = folderResults.slice(5);

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Search Summary */}
			<Card className="border-2 border-green-200 bg-green-50/30">
				<CardHeader className="pb-4">
					<CardTitle className="flex items-center justify-between">
						<span className="text-green-900">Search Results Summary</span>
						<Badge variant="secondary" className="text-green-700 bg-green-100">
							{totalResults} results
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">
								{totalFolders}
							</div>
							<div className="text-sm text-gray-600">Folders with results</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">
								{totalResults}
							</div>
							<div className="text-sm text-gray-600">Total results</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-purple-600">
								{(averageScore * 100).toFixed(1)}%
							</div>
							<div className="text-sm text-gray-600">Avg. confidence</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-orange-600">
								{searchScope.type === "all"
									? "All"
									: searchScope.selectedFolders.length}
							</div>
							<div className="text-sm text-gray-600">Folders searched</div>
						</div>
					</div>

					<div className="bg-white rounded-lg p-3">
						<div className="text-sm text-gray-700">
							<strong>Query:</strong> "{searchQuery}" •<strong>Scope:</strong>{" "}
							{searchScope.type === "all"
								? "All folders"
								: searchScope.type === "selected"
									? "Recent folders"
									: `${searchScope.selectedFolders.length} selected folders`}
						</div>
					</div>
				</CardContent>
			</Card>

			<Tabs defaultValue="all" className="space-y-4">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="all">All Results ({totalResults})</TabsTrigger>
					<TabsTrigger value="by-folder">
						By Folder ({totalFolders})
					</TabsTrigger>
					<TabsTrigger value="top">Top Results</TabsTrigger>
				</TabsList>

				{/* All Results Tab */}
				<TabsContent value="all" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">All Search Results</CardTitle>
							<p className="text-sm text-gray-600">
								Results from all folders, sorted by relevance score
							</p>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{results.slice(0, 20).map((result, index) => (
									<div
										key={`${result.path}-${index}`}
										className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
										onClick={() => onResultClick?.(result)}
										role="button"
										tabIndex={0}
									>
										<div className="text-sm text-gray-500 w-8">
											#{index + 1}
										</div>
										<div className="flex-1 min-w-0">
											<div className="font-medium truncate">
												{result.filename}
											</div>
											<div className="text-sm text-gray-500 truncate">
												{result.folder}
											</div>
										</div>
										<div className="text-right">
											<div className="text-sm font-medium">
												{(result.score * 100).toFixed(1)}%
											</div>
											<div className="text-xs text-gray-500">Match</div>
										</div>
									</div>
								))}
								{results.length > 20 && (
									<div className="text-center py-4 text-sm text-gray-500">
										+{results.length - 20} more results
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* By Folder Tab */}
				<TabsContent value="by-folder" className="space-y-4">
					{folderResults.map((folder, index) => (
						<Card
							key={folder.folderPath}
							className="border-2 border-dashed border-gray-300"
						>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<CardTitle className="text-base flex items-center gap-2">
										<span className="text-lg">📁</span>
										{folder.folderName}
									</CardTitle>
									<div className="flex items-center gap-2">
										<Badge variant="outline">{folder.totalCount} results</Badge>
										<Badge variant="secondary">
											{(folder.averageScore * 100).toFixed(1)}% avg
										</Badge>
										<Button
											variant="outline"
											size="sm"
											onClick={() => onFolderFilter?.(folder.folderPath)}
										>
											Filter
										</Button>
									</div>
								</div>
								<p className="text-xs text-gray-500">{folder.folderPath}</p>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="space-y-1">
									{folder.results.slice(0, 5).map((result, resultIndex) => (
										<div
											key={`${result.path}-${resultIndex}`}
											className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
											onClick={() => onResultClick?.(result)}
											role="button"
											tabIndex={0}
										>
											<div className="flex-1 min-w-0">
												<div className="text-sm font-medium truncate">
													{result.filename}
												</div>
											</div>
											<div className="text-sm text-gray-600">
												{(result.score * 100).toFixed(1)}%
											</div>
										</div>
									))}
									{folder.results.length > 5 && (
										<div className="text-center py-2 text-xs text-gray-500">
											+{folder.results.length - 5} more in this folder
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</TabsContent>

				{/* Top Results Tab */}
				<TabsContent value="top" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Top Results</CardTitle>
							<p className="text-sm text-gray-600">
								Highest confidence matches across all folders
							</p>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{results
									.sort((a, b) => b.score - a.score)
									.slice(0, 10)
									.map((result, index) => (
										<div
											key={`${result.path}-${index}`}
											className="flex items-center gap-4 p-4 border-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
											onClick={() => onResultClick?.(result)}
											role="button"
											tabIndex={0}
										>
											<div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
												{index + 1}
											</div>
											<div className="flex-1 min-w-0">
												<div className="font-medium truncate">
													{result.filename}
												</div>
												<div className="text-sm text-gray-500 truncate">
													{result.folder}
												</div>
											</div>
											<div className="text-right">
												<div className="text-lg font-bold text-blue-600">
													{(result.score * 100).toFixed(1)}%
												</div>
												<div className="text-xs text-gray-500">Match</div>
											</div>
										</div>
									))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{totalFolders === 0 && (
				<Card className="border-2 border-orange-200 bg-orange-50/30">
					<CardContent className="p-8 text-center">
						<div className="text-lg font-medium text-orange-900 mb-2">
							No results found
						</div>
						<p className="text-sm text-orange-700">
							No photos matched "{searchQuery}" in the selected folders. Try
							adjusting your search terms or expanding your folder selection.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
