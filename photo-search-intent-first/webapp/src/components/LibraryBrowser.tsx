import { ArrowUpDown, BarChart3, Check, Play } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { thumbUrl } from "../api";
import { VideoService } from "../services/VideoService";

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
}

export default function LibraryBrowser({
	dir,
	engine,
	library,
	onLoadLibrary,
	selected = new Set(),
	onToggleSelect,
	onOpen,
	tagsMap = {},
}: LibraryBrowserProps) {
	const [sortBy, setSortBy] = useState<SortOption>("name");
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
	const [showStats, setShowStats] = useState(false);

	// Extract file info for sorting
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

	// Sorted library items
	const sortedLibrary = useMemo(() => {
		if (!library.length) return [];

		return [...library].sort((a, b) => {
			const aInfo = getFileInfo(a);
			const bInfo = getFileInfo(b);

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
	}, [library, sortBy, sortDirection, getFileInfo]);

	// Library statistics
	const stats = useMemo(() => {
		const total = library.length;
		const videos = library.filter((p) => VideoService.isVideoFile(p)).length;
		const photos = total - videos;
		const selected_count = selected.size;

		// Rating distribution
		const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
		library.forEach((path) => {
			const tags = tagsMap[path] || [];
			const ratingTag = tags.find((t) => t.startsWith("rating:"));
			if (ratingTag) {
				const rating = parseInt(
					ratingTag.split(":")[1],
				) as keyof typeof ratings;
				if (rating >= 1 && rating <= 5) {
					ratings[rating]++;
				}
			}
		});

		return { total, photos, videos, selected: selected_count, ratings };
	}, [library, selected, tagsMap]);

	const handleSort = (newSortBy: SortOption) => {
		if (sortBy === newSortBy) {
			setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(newSortBy);
			setSortDirection("asc");
		}
	};

	const selectAll = () => {
		if (onToggleSelect) {
			library.forEach((path) => {
				if (!selected.has(path)) {
					onToggleSelect(path);
				}
			});
		}
	};

	const selectNone = () => {
		if (onToggleSelect) {
			Array.from(selected).forEach((path) => {
				onToggleSelect(path);
			});
		}
	};

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
						className={`p-1 rounded ${showStats ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:bg-gray-100"}`}
						title="Toggle statistics"
					>
						<BarChart3 className="w-4 h-4" />
					</button>
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
							title={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
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
						onClick={() => onLoadLibrary(120, 0)}
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
				<div className="mb-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
					{selected.size} item{selected.size !== 1 ? "s" : ""} selected
				</div>
			)}

			{/* Content */}
			{library.length === 0 ? (
				<div className="text-sm text-gray-600 mt-2">
					No items yet. Build the index, then click Reload.
				</div>
			) : (
				<div className="mt-2 grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
					{sortedLibrary.map((p, _i) => {
						const isSelected = selected.has(p);
						const fileInfo = getFileInfo(p);

						return (
							<div
								role="button"
								tabIndex={0}
								key={p}
								className={`relative group cursor-pointer rounded overflow-hidden ${
									isSelected ? "ring-2 ring-blue-500" : ""
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
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onToggleSelect(p);
										}}
										className={`absolute top-1 left-1 z-10 w-5 h-5 rounded border-2 flex items-center justify-center
                      ${
												isSelected
													? "bg-blue-600 border-blue-600"
													: "bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100"
											} transition-opacity`}
									>
										{isSelected && <Check className="w-3 h-3 text-white" />}
									</button>
								)}

								{/* Main image */}
								<img
									src={thumbUrl(dir, engine, p, 196)}
									alt={fileInfo.name}
									title={`${fileInfo.name}${fileInfo.rating > 0 ? ` - ${"★".repeat(fileInfo.rating)}` : ""}`}
									className="w-full h-24 object-cover"
								/>

								{/* Video indicator */}
								{fileInfo.isVideo && (
									<div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
										<div className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center">
											<Play className="w-4 h-4 text-white ml-0.5" />
										</div>
									</div>
								)}

								{/* Rating indicator */}
								{fileInfo.rating > 0 && (
									<div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
										{"★".repeat(fileInfo.rating)}
									</div>
								)}

								{/* Filename overlay on hover */}
								<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
									<div className="p-1 text-white text-xs truncate">
										{fileInfo.name}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
