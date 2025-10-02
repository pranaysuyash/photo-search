import { useCallback, useState } from "react";
import { thumbUrl } from "../api";
import FilmstripView from "./FilmstripView";

interface FilmstripResultsProps {
	dir: string;
	engine: string;
	results: Array<{ path: string; score?: number }>;
	selected: Set<string>;
	onToggleSelect: (path: string) => void;
	onOpen: (path: string) => void;
	ratingMap?: Record<string, number>;
}

export function FilmstripResults({
	dir,
	engine,
	results,
	selected,
	onToggleSelect,
	onOpen,
	_ratingMap,
}: FilmstripResultsProps) {
	const [currentIndex, setCurrentIndex] = useState(0);

	// Convert results to Photo format for FilmstripView
	const photos = results.map((result, index) => ({
		id: result.path,
		path: result.path,
		thumbnail: thumbUrl(dir, engine, result.path, 256),
		caption: result.path.split("/").pop() || `Photo ${index + 1}`,
		date: new Date().toISOString(), // Could be enhanced with actual EXIF data
		selected: selected.has(result.path),
	}));

	// Handle photo click
	const handlePhotoClick = useCallback(
		(photo: { path: string }, index: number) => {
			setCurrentIndex(index);
			onOpen(photo.path);
		},
		[onOpen],
	);

	// Handle photo selection
	const handlePhotoSelect = useCallback(
		(photo: { path: string }, _isSelected: boolean) => {
			onToggleSelect(photo.path);
		},
		[onToggleSelect],
	);

	// Handle index change
	const handleIndexChange = useCallback((index: number) => {
		setCurrentIndex(index);
	}, []);

	if (results.length === 0) {
		return (
			<div className="flex items-center justify-center h-64 text-gray-500">
				<p>No photos to display in filmstrip view</p>
			</div>
		);
	}

	return (
		<div className="w-full">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
					Filmstrip View
				</h3>
				<div className="text-sm text-gray-600 dark:text-gray-400">
					{results.length} photos • {selected.size} selected
				</div>
			</div>

			<FilmstripView
				photos={photos}
				selectedPhotos={selected}
				onPhotoClick={handlePhotoClick}
				onPhotoSelect={handlePhotoSelect}
				currentIndex={currentIndex}
				onIndexChange={handleIndexChange}
				itemWidth={280}
				itemHeight={200}
				gap={12}
				showNavigation={true}
				enableSwipe={true}
				className="bg-gray-50 dark:bg-gray-900 rounded-xl"
			/>
		</div>
	);
}

export default FilmstripResults;
