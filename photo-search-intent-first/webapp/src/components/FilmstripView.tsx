import { motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { thumbUrl } from "../api";

interface Photo {
	id: string;
	path: string;
	thumbnail?: string;
	caption?: string;
	date?: string;
	selected?: boolean;
}

interface FilmstripViewProps {
	photos: Photo[];
	selectedPhotos?: Set<string>;
	onPhotoClick?: (photo: Photo, index: number) => void;
	onPhotoSelect?: (photo: Photo, selected: boolean) => void;
	currentIndex?: number;
	onIndexChange?: (index: number) => void;
	itemWidth?: number;
	itemHeight?: number;
	gap?: number;
	showNavigation?: boolean;
	enableSwipe?: boolean;
	className?: string;
}

export function FilmstripView({
	photos,
	selectedPhotos = new Set(),
	onPhotoClick,
	onPhotoSelect,
	currentIndex = 0,
	onIndexChange,
	itemWidth = 200,
	itemHeight = 150,
	gap = 8,
	showNavigation = true,
	enableSwipe = true,
	className = "",
}: FilmstripViewProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState(0);
	const [isDragging, setIsDragging] = useState(false);

	// Calculate visible items and scroll position
	const visibleItems = Math.floor(containerWidth / (itemWidth + gap)) || 1;
	const maxScrollIndex = Math.max(0, photos.length - visibleItems);
	const clampedIndex = Math.min(currentIndex, maxScrollIndex);

	// Update container width on resize
	useEffect(() => {
		const updateWidth = () => {
			if (containerRef.current) {
				setContainerWidth(containerRef.current.clientWidth);
			}
		};

		updateWidth();
		window.addEventListener("resize", updateWidth);
		return () => window.removeEventListener("resize", updateWidth);
	}, []);

	// Scroll to current index
	useEffect(() => {
		if (containerRef.current && photos.length > 0) {
			const scrollLeft = clampedIndex * (itemWidth + gap);
			containerRef.current.scrollTo({
				left: scrollLeft,
				behavior: "smooth",
			});
		}
	}, [clampedIndex, itemWidth, gap, photos.length]);

	// Handle swipe gestures
	const handleDragEnd = useCallback(
		(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
			setIsDragging(false);

			if (!enableSwipe) return;

			const swipeThreshold = 50;
			const velocityThreshold = 500;

			// Check for swipe based on velocity or distance
			if (
				Math.abs(info.velocity.x) > velocityThreshold ||
				Math.abs(info.offset.x) > swipeThreshold
			) {
				const direction = info.offset.x > 0 ? -1 : 1;
				const newIndex = Math.max(
					0,
					Math.min(maxScrollIndex, clampedIndex + direction),
				);

				if (newIndex !== clampedIndex) {
					onIndexChange?.(newIndex);
				}
			}
		},
		[enableSwipe, clampedIndex, maxScrollIndex, onIndexChange],
	);

	// Navigation functions
	const navigateLeft = useCallback(() => {
		const newIndex = Math.max(0, clampedIndex - 1);
		onIndexChange?.(newIndex);
	}, [clampedIndex, onIndexChange]);

	const navigateRight = useCallback(() => {
		const newIndex = Math.min(maxScrollIndex, clampedIndex + 1);
		onIndexChange?.(newIndex);
	}, [clampedIndex, maxScrollIndex, onIndexChange]);

	// Keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			switch (e.key) {
				case "ArrowLeft":
					e.preventDefault();
					navigateLeft();
					break;
				case "ArrowRight":
					e.preventDefault();
					navigateRight();
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [navigateLeft, navigateRight]);

	// Handle photo click
	const handlePhotoClick = useCallback(
		(photo: Photo, index: number) => {
			if (!isDragging) {
				onPhotoClick?.(photo, index);
			}
		},
		[isDragging, onPhotoClick],
	);

	// Handle photo selection
	const handlePhotoSelect = useCallback(
		(photo: Photo, e: React.MouseEvent) => {
			e.stopPropagation();
			onPhotoSelect?.(photo, !selectedPhotos.has(photo.id));
		},
		[selectedPhotos, onPhotoSelect],
	);

	if (photos.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-gray-500">
				<p>No photos to display</p>
			</div>
		);
	}

	return (
		<div className={`filmstrip-view relative ${className}`}>
			{/* Navigation buttons */}
			{showNavigation && clampedIndex > 0 && (
				<button
					type="button"
					onClick={navigateLeft}
					className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
					aria-label="Previous photos"
				>
					<ChevronLeft className="w-5 h-5" />
				</button>
			)}

			{showNavigation && clampedIndex < maxScrollIndex && (
				<button
					type="button"
					onClick={navigateRight}
					className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
					aria-label="Next photos"
				>
					<ChevronRight className="w-5 h-5" />
				</button>
			)}

			{/* Filmstrip container */}
			<div ref={containerRef} className="overflow-x-auto scrollbar-hide">
				<motion.div
					className="flex gap-2 px-4 py-4 min-w-full"
					drag={enableSwipe ? "x" : false}
					dragConstraints={{ left: 0, right: 0 }}
					dragElastic={0.1}
					onDragStart={() => setIsDragging(true)}
					onDragEnd={handleDragEnd}
				>
					{photos.map((photo, index) => {
						const isSelected = selectedPhotos.has(photo.id);
						const isCurrent = index === clampedIndex;

						return (
							<motion.div
								key={photo.id}
								className={`relative flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
									isSelected
										? "border-blue-500 ring-2 ring-blue-500/50"
										: isCurrent
											? "border-white shadow-lg"
											: "border-gray-300 hover:border-gray-400"
								}`}
								style={{
									width: itemWidth,
									height: itemHeight,
								}}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => handlePhotoClick(photo, index)}
							>
								{/* Photo image */}
								<img
									src={photo.thumbnail || thumbUrl("", "", photo.path, 256)}
									alt={photo.caption || "Photo"}
									className="w-full h-full object-cover"
									loading="lazy"
								/>

								{/* Selection overlay */}
								{isSelected && (
									<div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
										<div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
											✓
										</div>
									</div>
								)}

								{/* Current indicator */}
								{isCurrent && !isSelected && (
									<div className="absolute inset-0 border-2 border-white shadow-lg" />
								)}

								{/* Selection button */}
								<button
									type="button"
									onClick={(e) => handlePhotoSelect(photo, e)}
									className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
										isSelected
											? "bg-blue-500 border-blue-500 text-white"
											: "bg-white/80 border-white hover:bg-white"
									}`}
									aria-label={isSelected ? "Deselect photo" : "Select photo"}
								>
									{isSelected && <span className="text-xs">✓</span>}
								</button>

								{/* Caption overlay */}
								{photo.caption && (
									<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
										<p className="text-white text-xs truncate">
											{photo.caption}
										</p>
									</div>
								)}
							</motion.div>
						);
					})}
				</motion.div>
			</div>

			{/* Progress indicator */}
			{photos.length > visibleItems && (
				<div className="flex justify-center mt-4 space-x-1">
					{Array.from(
						{ length: Math.ceil(photos.length / visibleItems) },
						(_, i) => (
							<button
								key={String(i)}
								type="button"
								onClick={() => onIndexChange?.(i * visibleItems)}
								className={`w-2 h-2 rounded-full transition-colors ${
									Math.floor(clampedIndex / visibleItems) === i
										? "bg-blue-500"
										: "bg-gray-300 hover:bg-gray-400"
								}`}
								aria-label={`Go to photo group ${i + 1}`}
							/>
						),
					)}
				</div>
			)}
		</div>
	);
}

export default FilmstripView;
