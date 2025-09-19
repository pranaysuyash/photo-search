import { useState } from "react";
import FilmstripView from "../components/FilmstripView";

interface Photo {
	id: string;
	path: string;
	thumbnail?: string;
	caption?: string;
	date?: string;
	selected?: boolean;
}

// Example usage of FilmstripView component
export function FilmstripExample() {
	const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
	const [currentIndex, setCurrentIndex] = useState(0);

	// Example photo data
	const photos = [
		{
			id: "1",
			path: "/path/to/photo1.jpg",
			caption: "Beautiful sunset",
			date: "2024-01-15",
		},
		{
			id: "2",
			path: "/path/to/photo2.jpg",
			caption: "Mountain landscape",
			date: "2024-01-16",
		},
		{
			id: "3",
			path: "/path/to/photo3.jpg",
			caption: "City skyline",
			date: "2024-01-17",
		},
		{
			id: "4",
			path: "/path/to/photo4.jpg",
			caption: "Forest trail",
			date: "2024-01-18",
		},
		{
			id: "5",
			path: "/path/to/photo5.jpg",
			caption: "Ocean waves",
			date: "2024-01-19",
		},
	];

	const handlePhotoClick = (photo: Photo, index: number) => {
		console.log("Photo clicked:", photo, "at index:", index);
		setCurrentIndex(index);
	};

	const handlePhotoSelect = (photo: Photo, selected: boolean) => {
		setSelectedPhotos((prev) => {
			const newSet = new Set(prev);
			if (selected) {
				newSet.add(photo.id);
			} else {
				newSet.delete(photo.id);
			}
			return newSet;
		});
	};

	const handleIndexChange = (index: number) => {
		setCurrentIndex(index);
	};

	return (
		<div className="p-4">
			<h2 className="text-2xl font-bold mb-4">Filmstrip View Example</h2>
			<p className="text-gray-600 mb-4">
				This demonstrates the FilmstripView component with horizontal scrolling,
				touch/swipe support, and photo selection.
			</p>

			{/* Filmstrip View */}
			<FilmstripView
				photos={photos}
				selectedPhotos={selectedPhotos}
				onPhotoClick={handlePhotoClick}
				onPhotoSelect={handlePhotoSelect}
				currentIndex={currentIndex}
				onIndexChange={handleIndexChange}
				itemWidth={200}
				itemHeight={150}
				gap={8}
				showNavigation={true}
				enableSwipe={true}
				className="border rounded-lg"
			/>

			{/* Status info */}
			<div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
				<p>
					<strong>Current Index:</strong> {currentIndex}
				</p>
				<p>
					<strong>Selected Photos:</strong> {selectedPhotos.size}
				</p>
				<p>
					<strong>Total Photos:</strong> {photos.length}
				</p>
			</div>

			{/* Usage instructions */}
			<div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
				<h3 className="font-semibold mb-2">Features:</h3>
				<ul className="list-disc list-inside space-y-1 text-sm">
					<li>Horizontal scrolling with smooth animations</li>
					<li>Touch/swipe gestures for mobile devices</li>
					<li>Photo selection with visual indicators</li>
					<li>Navigation arrows for desktop</li>
					<li>Progress indicators for large photo sets</li>
					<li>Keyboard navigation (arrow keys)</li>
					<li>Responsive design for different screen sizes</li>
				</ul>
			</div>
		</div>
	);
}

export default FilmstripExample;
