import { motion } from "framer-motion";
import { ArrowUpDown, BarChart3, Check, Play, Settings } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiThumbBatch, thumbUrl } from "../api";
import { useMemoryManager } from "../hooks/useMemoryManager";
import { VideoService } from "../services/VideoService";
import { ScrollLoader } from "../utils/loading";
import { VirtualizedPhotoGrid } from "./VirtualizedPhotoGrid";

type SortOption = "name" | "date" | "size" | "rating" | "camera";
type SortDirection = "asc" | "desc";

interface LibraryBrowserProps {
	dir: string;
	engine: string;
	library: string[];
	onLoadLibrary: (limit?: number, offset?: number) => void;
	selected?: Set<string>;
	onToggleSelect?: (path: string) => void;
	onOpen?: (path: string) => void;
	tagsMap?: Record<string, string[]>;
	hasMore?: boolean;
	isLoading?: boolean;
}

const LibraryBrowser = memo(function LibraryBrowser({
	dir,
	engine,
	library,
	onLoadLibrary,
	selected = new Set(),
	onToggleSelect,
	onOpen,
	tagsMap = {},
	hasMore = false,
	isLoading = false,
}: LibraryBrowserProps) {
	const [sortBy, setSortBy] = useState<SortOption>("name");
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
	const [showStats, setShowStats] = useState(false);
	const [useVirtualizedGrid, setUseVirtualizedGrid] = useState(false);
	const [preloadedThumbs, setPreloadedThumbs] = useState<Set<string>>(
		new Set(),
	);
	const preloadInProgress = useRef(false);

	// Initialize memory manager for performance optimization
	const memoryManager = useMemoryManager({
		maxMemoryMB: 300,
		cleanupThreshold: 0.8,
		monitoringInterval: 10000,
		onMemoryWarning: (usageMB) => {
			console.warn(`Memory warning: ${usageMB}MB used`);
			// Auto-enable virtualized grid for large collections when memory is high
			if (library.length > 5000 && !useVirtualizedGrid) {
				setUseVirtualizedGrid(true);
			}
		},
		onMemoryCritical: (usageMB) => {
			console.error(
				`Memory critical: ${usageMB}MB used - enabling virtualized grid`,
			);
			setUseVirtualizedGrid(true);
		},
	});

	// Animation variants for micro-interactions
	const photoVariants = {
		initial: { opacity: 0, scale: 0.9 },
		animate: { opacity: 1, scale: 1 },
		hover: { scale: 1.05, y: -2 },
		tap: { scale: 0.95 },
	};

	const overlayVariants = {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
	};

	// Batch preload thumbnails for better performance
	const preloadThumbnailsBatch = useCallback(
		async (paths: string[], batchSize = 20) => {
			if (!dir || preloadInProgress.current || paths.length === 0) return;

			preloadInProgress.current = true;
			const batches = [];
			for (let i = 0; i < paths.length; i += batchSize) {
				batches.push(paths.slice(i, i + batchSize));
			}

			try {
				for (const batch of batches) {
					// Filter out already preloaded thumbnails
					const toPreload = batch.filter((path) => !preloadedThumbs.has(path));
					if (toPreload.length === 0) continue;

					try {
						await apiThumbBatch(dir, toPreload, 196);
						// Mark these paths as preloaded
						setPreloadedThumbs((prev) => new Set([...prev, ...toPreload]));
					} catch (error) {
						console.warn("Failed to preload thumbnail batch:", error);
						// Continue with next batch even if one fails
					}
				}
			} finally {
				preloadInProgress.current = false;
			}
		},
		[dir, preloadedThumbs],
	);

	// Auto-enable virtualized grid for large collections
	useEffect(() => {
		// Enable virtualized grid for large collections to improve performance
		if (library.length > 2000 && !useVirtualizedGrid) {
			console.log(
				`Large collection detected (${library.length} items), enabling virtualized grid`,
			);
			setUseVirtualizedGrid(true);
		} else if (library.length <= 1000 && useVirtualizedGrid) {
			// Disable for small collections to maintain smooth animations
			setUseVirtualizedGrid(false);
		}
	}, [library.length, useVirtualizedGrid]);

	// Preload thumbnails when library changes
	useEffect(() => {
		if (library.length > 0) {
			// Preload first batch immediately
			const firstBatch = library.slice(0, 40);
			preloadThumbnailsBatch(firstBatch);

			// Preload remaining thumbnails with delay to avoid blocking UI
			if (library.length > 40) {
				const remainingBatch = library.slice(40, 120);
				setTimeout(() => preloadThumbnailsBatch(remainingBatch), 1000);
			}
		}
	}, [library, preloadThumbnailsBatch]);

	// Extract file info for sorting - memoized per path
	const getFileInfo = useCallback(
		(path: string) => {
			const name = path.split("/").pop() || path;
			const ext = name.split(".").pop()?.toLowerCase() || "";

			// Extract rating from tags if available
			const tags = tagsMap[path] || [];
			const ratingTag = tags.find((t) => t.startsWith("rating:"));
			const rating = ratingTag ? parseInt(ratingTag.split(":")[1]) : 0;

			return {
				name,
				ext,
				rating,
				isVideo: VideoService.isVideoFile(path),
			};
		},
		[tagsMap],
	);

	// Memoized file info cache to avoid recalculating
	const fileInfoCache = useMemo(() => {
		const cache: Record<string, ReturnType<typeof getFileInfo>> = {};
		library.forEach((path) => {
			cache[path] = getFileInfo(path);
		});
		return cache;
	}, [library, getFileInfo]);

	// Sorted library items - optimized with cached file info
	const sortedLibrary = useMemo(() => {
		if (!library.length) return [];

		return [...library].sort((a, b) => {
			const aInfo = fileInfoCache[a];
			const bInfo = fileInfoCache[b];

			let compareValue = 0;

			switch (sortBy) {
				case "name":
					compareValue = aInfo.name.localeCompare(bInfo.name);
					break;
				case "rating":
					compareValue = bInfo.rating - aInfo.rating; // Higher ratings first
					break;
				case "date":
					// For now, use filename for date sorting (could be enhanced with EXIF data)
					compareValue = a.localeCompare(b);
					break;
				case "size":
					// Would need size info from API - for now sort by name
					compareValue = aInfo.name.localeCompare(bInfo.name);
					break;
				case "camera":
					// Would need EXIF data - for now sort by name
					compareValue = aInfo.name.localeCompare(bInfo.name);
					break;
				default:
					compareValue = 0;
			}

			return sortDirection === "desc" ? -compareValue : compareValue;
		});
	}, [library, sortBy, sortDirection, fileInfoCache]);

	// Library statistics - optimized with cached file info
	const stats = useMemo(() => {
		const total = library.length;
		const videos = library.filter((p) => fileInfoCache[p]?.isVideo).length;
		const photos = total - videos;
		const selected_count = selected.size;

		// Rating distribution
		const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
		library.forEach((path) => {
			const rating = fileInfoCache[path]?.rating || 0;
			if (rating >= 1 && rating <= 5) {
				ratings[rating as keyof typeof ratings]++;
			}
		});

		return { total, photos, videos, selected: selected_count, ratings };
	}, [library, selected, fileInfoCache]);

	const handleSort = useCallback(
		(newSortBy: SortOption) => {
			if (sortBy === newSortBy) {
				setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
			} else {
				setSortBy(newSortBy);
				setSortDirection("asc");
			}
		},
		[sortBy],
	);

	const selectAll = useCallback(() => {
		if (onToggleSelect) {
			library.forEach((path) => {
				if (!selected.has(path)) {
					onToggleSelect(path);
				}
			});
		}
	}, [onToggleSelect, library, selected]);

	const selectNone = useCallback(() => {
		if (onToggleSelect) {
			Array.from(selected).forEach((path) => {
				onToggleSelect(path);
			});
		}
	}, [onToggleSelect, selected]);

	const handleLoadLibrary = useCallback(() => {
		onLoadLibrary(useVirtualizedGrid ? 500 : 120, 0);
	}, [onLoadLibrary, useVirtualizedGrid]);

	const _selectRange = (startIndex: number, endIndex: number) => {
		if (onToggleSelect) {
			const start = Math.min(startIndex, endIndex);
			const end = Math.max(startIndex, endIndex);

			for (let i = start; i <= end; i++) {
				const path = sortedLibrary[i];
				if (path && !selected.has(path)) {
					onToggleSelect(path);
				}
			}
		}
	};
	return (
		<div className="bg-white border rounded p-3">
			{/* Header with controls */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-3">
					<h2 className="font-semibold">Library</h2>
					<button
						type="button"
						onClick={() => setShowStats(!showStats)}
						className={`p-1 rounded ${
							showStats
								? "bg-blue-100 text-blue-600"
								: "text-gray-500 hover:bg-gray-100"
						}`}
						title="Toggle statistics"
					>
						<BarChart3 className="w-4 h-4" />
					</button>
					{library.length > 1000 && (
						<button
							type="button"
							onClick={() => setUseVirtualizedGrid(!useVirtualizedGrid)}
							className={`p-1 rounded ${
								useVirtualizedGrid
									? "bg-green-100 text-green-600"
									: "text-gray-500 hover:bg-gray-100"
							}`}
							title={`${useVirtualizedGrid ? "Disable" : "Enable"} virtualized grid for better performance`}
						>
							<Settings className="w-4 h-4" />
						</button>
					)}
				</div>

				<div className="flex items-center gap-2">
					{/* Sort controls */}
					<div className="flex items-center gap-1">
						<ArrowUpDown className="w-3 h-3 text-gray-400" />
						<select
							value={sortBy}
							onChange={(e) => handleSort(e.target.value as SortOption)}
							className="text-xs border rounded px-1 py-0.5"
						>
							<option value="name">Name</option>
							<option value="date">Date</option>
							<option value="rating">Rating</option>
							<option value="size">Size</option>
							<option value="camera">Camera</option>
						</select>
						<button
							type="button"
							onClick={() =>
								setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
							}
							className="text-xs text-gray-500 hover:text-gray-700"
							title={`Sort ${
								sortDirection === "asc" ? "descending" : "ascending"
							}`}
						>
							{sortDirection === "asc" ? "↑" : "↓"}
						</button>
					</div>

					{/* Selection controls */}
					{onToggleSelect && (
						<div className="flex items-center gap-1 text-xs">
							<button
								type="button"
								onClick={selectAll}
								className="bg-gray-200 rounded px-2 py-0.5 hover:bg-gray-300"
							>
								All
							</button>
							<button
								type="button"
								onClick={selectNone}
								className="bg-gray-200 rounded px-2 py-0.5 hover:bg-gray-300"
							>
								None
							</button>
						</div>
					)}

					<button
						type="button"
						onClick={handleLoadLibrary}
						className="bg-gray-200 rounded px-3 py-1 text-sm hover:bg-gray-300"
					>
						Reload
					</button>
				</div>
			</div>

			{/* Statistics panel */}
			{showStats && library.length > 0 && (
				<div className="mb-3 p-2 bg-gray-50 rounded text-xs">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
						<div>
							<div className="font-medium">Total: {stats.total}</div>
							<div className="text-gray-600">Photos: {stats.photos}</div>
							<div className="text-gray-600">Videos: {stats.videos}</div>
						</div>
						<div>
							<div className="font-medium">Selected: {stats.selected}</div>
							<div className="text-gray-600">
								{stats.selected > 0 &&
									`${((stats.selected / stats.total) * 100).toFixed(1)}%`}
							</div>
						</div>
						<div>
							<div className="font-medium">Ratings:</div>
							<div className="flex gap-1">
								{Object.entries(stats.ratings).map(([rating, count]) => (
									<span
										key={rating}
										className="text-gray-600"
										title={`${rating} stars: ${count} photos`}
									>
										{rating}★:{count}
									</span>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Selection status */}
			{selected.size > 0 && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					className="mb-2 p-2 bg-blue-50 rounded text-sm text-blue-800"
				>
					{selected.size} item{selected.size !== 1 ? "s" : ""} selected
				</motion.div>
			)}

			{/* Content */}
			{library.length === 0 ? (
				<div className="text-sm text-gray-600 mt-2">
					No items yet. Build the index, then click Reload.
				</div>
			) : useVirtualizedGrid ? (
				/* Virtualized grid for large collections */
				<VirtualizedPhotoGrid
					dir={dir}
					engine={engine}
					onItemClick={onOpen}
					className="mt-2"
					imageQuality="medium"
					showMetrics={showStats}
				/>
			) : (
				/* Traditional grid for small collections with animations */
				<>
					<div className="mt-2 grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
						{sortedLibrary.slice(0, 120).map((p, i) => {
							const isSelected = selected.has(p);
							const fileInfo = fileInfoCache[p];

							return (
								<motion.button
									type="button"
									key={p}
									variants={photoVariants}
									initial="initial"
									animate="animate"
									whileHover="hover"
									whileTap="tap"
									transition={{ duration: 0.3, delay: i * 0.01 }}
									className={`relative group cursor-pointer rounded overflow-hidden text-left transition-all duration-200 hover:shadow-lg ${
										isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""
									}`}
									onClick={() => (onOpen ? onOpen(p) : undefined)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											if (onOpen) onOpen(p);
										}
									}}
								>
									{/* Selection checkbox */}
									{onToggleSelect && (
										<motion.button
											type="button"
											variants={overlayVariants}
											initial="initial"
											animate="animate"
											onClick={(e) => {
												e.stopPropagation();
												onToggleSelect(p);
											}}
											className={`absolute top-1 left-1 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
												isSelected
													? "bg-blue-600 border-blue-600"
													: "bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100"
											}`}
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.9 }}
										>
											{isSelected && <Check className="w-3 h-3 text-white" />}
										</motion.button>
									)}

									{/* Main image */}
									<motion.img
										src={thumbUrl(dir, engine, p, 196)}
										alt={fileInfo.name}
										title={`${fileInfo.name}${
											fileInfo.rating > 0
												? ` - ${"★".repeat(fileInfo.rating)}`
												: ""
										}`}
										className="w-full h-24 object-cover transition-transform duration-300"
										whileHover={{ scale: 1.1 }}
										transition={{ duration: 0.3 }}
									/>

									{/* Video indicator */}
									{fileInfo.isVideo && (
										<motion.div
											variants={overlayVariants}
											initial="initial"
											animate="animate"
											className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors duration-300"
										>
											<motion.div
												className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center"
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
											>
												<Play className="w-4 h-4 text-white ml-0.5" />
											</motion.div>
										</motion.div>
									)}

									{/* Rating indicator */}
									{fileInfo.rating > 0 && (
										<motion.div
											variants={overlayVariants}
											initial="initial"
											animate="animate"
											className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded"
											whileHover={{ scale: 1.1 }}
										>
											{"★".repeat(fileInfo.rating)}
										</motion.div>
									)}

									{/* Filename overlay on hover */}
									<motion.div
										variants={overlayVariants}
										initial="initial"
										animate="animate"
										className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
									>
										<div className="p-1 text-white text-xs truncate">
											{fileInfo.name}
										</div>
									</motion.div>
								</motion.button>
							);
						})}
					</div>
					<ScrollLoader
						onLoadMore={() => onLoadLibrary(120, library.length)}
						isLoading={isLoading}
						hasMore={hasMore}
						loadingText="Loading more photos..."
					/>
				</>
			)}
		</div>
	);
});

LibraryBrowser.displayName = "LibraryBrowser";

export default LibraryBrowser;

LibraryBrowser.displayName = "LibraryBrowser";
