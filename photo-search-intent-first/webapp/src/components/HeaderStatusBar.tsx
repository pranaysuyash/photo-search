import {
	CheckCircle2,
	Database,
	HardDrive,
	Image,
	Loader2,
	Search,
	Server,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLibrary } from "../contexts/LibraryContext";
import { useSimpleStore } from "../stores/SimpleStore";

interface HeaderStatusBarProps {
	className?: string;
	showLibraryInfo?: boolean;
	showPerformance?: boolean;
}

interface PerformanceStatus {
	cpuUsage: number;
	memoryUsage: number;
	activeJobs: number;
	indexingSpeed?: number;
	searchPerformance?: number;
}

interface LibraryInfo {
	photoCount: number;
	indexedCount: number;
	currentDirectory: string;
	searchProvider: string;
	isIndexing: boolean;
	indexingProgress?: {
		processed: number;
		total: number;
		phase: string;
	};
}

export function HeaderStatusBar({
	className = "",
	showLibraryInfo = true,
	showPerformance = false,
}: HeaderStatusBarProps) {
	const [performance, setPerformance] = useState<PerformanceStatus>({
		cpuUsage: 0,
		memoryUsage: 0,
		activeJobs: 0,
	});

	const { library } = useLibrary();
	const store = useSimpleStore();

	// Update performance status
	const updatePerformance = useCallback(() => {
		const mockPerformance = {
			cpuUsage: Math.random() * 30 + (library?.status === "indexing" ? 40 : 10),
			memoryUsage: Math.random() * 20 + 30,
			activeJobs: store.jobs.filter((job) => job.status === "running").length,
		};

		setPerformance(mockPerformance);
	}, [library, store]);

	// Set up monitoring
	useEffect(() => {
		updatePerformance();
		const performanceInterval = setInterval(updatePerformance, 2000);
		return () => clearInterval(performanceInterval);
	}, [updatePerformance]);

	// Get library info
	const libraryInfo: LibraryInfo = {
		photoCount: library?.photoCount || 0,
		indexedCount: library?.indexedCount || 0,
		currentDirectory: library?.rootDir || "",
		searchProvider: library?.searchProvider || "local",
		isIndexing: library?.status === "indexing",
		indexingProgress: library?.indexingProgress,
	};

	const isIndexing = libraryInfo.isIndexing;
	const indexingComplete =
		libraryInfo.indexedCount > 0 &&
		libraryInfo.indexedCount === libraryInfo.photoCount;

	// Format directory name
	const formatDirectory = (dir: string) => {
		if (!dir) return "No directory selected";
		const parts = dir.split("/");
		if (parts.length > 3) {
			return `.../${parts.slice(-2).join("/")}`;
		}
		return dir;
	};

	return (
		<div className={`relative ${className}`}>
			{/* Status Bar */}
			<div className="flex items-center gap-4 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
				{/* Left Section - Library Info */}
				{showLibraryInfo && (
					<div className="flex items-center gap-6">
						{/* Directory Status */}
						<div className="flex items-center gap-2">
							<HardDrive className="w-4 h-4 text-gray-600 dark:text-gray-400" />
							<span className="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
								{formatDirectory(libraryInfo.currentDirectory)}
							</span>
						</div>

						{/* Photo Count */}
						<div className="flex items-center gap-2">
							<Image className="w-4 h-4 text-gray-600 dark:text-gray-400" />
							<span className="text-sm text-gray-700 dark:text-gray-300">
								{libraryInfo.photoCount.toLocaleString()} photos
							</span>
						</div>

						{/* Indexing Status */}
						<div className="flex items-center gap-2">
							{isIndexing ? (
								<>
									<Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
									<span className="text-sm text-blue-700 dark:text-blue-300">
										Indexing{" "}
										{libraryInfo.indexingProgress
											? `${libraryInfo.indexingProgress.processed}/${libraryInfo.indexingProgress.total}`
											: `${libraryInfo.indexedCount}/${libraryInfo.photoCount}`}
									</span>
								</>
							) : indexingComplete ? (
								<>
									<CheckCircle2 className="w-4 h-4 text-green-600" />
									<span className="text-sm text-green-700 dark:text-green-300">
										{libraryInfo.indexedCount.toLocaleString()} indexed
									</span>
								</>
							) : (
								<>
									<div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
									<span className="text-sm text-yellow-700 dark:text-yellow-300">
										Ready to index
									</span>
								</>
							)}
						</div>
					</div>
				)}

				{/* Center Section - Performance (Optional) */}
				{showPerformance && (
					<div className="hidden md:flex items-center gap-6">
						{/* Active Jobs */}
						{performance.activeJobs > 0 && (
							<div className="flex items-center gap-2">
								<div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
								<span className="text-sm text-orange-700 dark:text-orange-300">
									{performance.activeJobs} job
									{performance.activeJobs !== 1 ? "s" : ""}
								</span>
							</div>
						)}

						{/* System Resources */}
						<div className="flex items-center gap-2">
							<Database className="w-4 h-4 text-gray-600 dark:text-gray-400" />
							<span className="text-sm text-gray-700 dark:text-gray-300">
								{performance.memoryUsage.toFixed(0)}%
							</span>
						</div>
					</div>
				)}

				{/* Right Section - Search Status */}
				<div className="flex items-center gap-6">
					{/* Search Provider */}
					<div className="flex items-center gap-2">
						<Search className="w-4 h-4 text-gray-600 dark:text-gray-400" />
						<span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
							{libraryInfo.searchProvider}
						</span>
					</div>

					{/* Backend Status */}
					<div className="flex items-center gap-2">
						<Server className="w-4 h-4 text-gray-600 dark:text-gray-400" />
						<span className="text-sm text-gray-700 dark:text-gray-300">
							Local Backend
						</span>
						<div className="w-2 h-2 bg-green-500 rounded-full" />
					</div>
				</div>
			</div>
		</div>
	);
}

// Mini version for compact display
export function MiniHeaderStatus() {
	const { library } = useLibrary();

	const isIndexing = library?.status === "indexing";
	const indexingComplete =
		library?.indexedCount > 0 && library?.indexedCount === library?.photoCount;

	return (
		<div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
			{/* Photo Count */}
			<div className="flex items-center gap-1">
				<Image className="w-3 h-3" />
				<span>{library?.photoCount?.toLocaleString() || "0"}</span>
			</div>

			{/* Indexing Status */}
			<div className="flex items-center gap-1">
				{isIndexing ? (
					<>
						<Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
						<span className="text-blue-700 dark:text-blue-300">Indexing</span>
					</>
				) : indexingComplete ? (
					<>
						<CheckCircle2 className="w-3 h-3 text-green-600" />
						<span className="text-green-700 dark:text-green-300">Ready</span>
					</>
				) : (
					<>
						<div className="w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
						<span className="text-yellow-700 dark:text-yellow-300">Setup</span>
					</>
				)}
			</div>
		</div>
	);
}
