import clsx from "clsx";
import {
	AnimatePresence,
	motion,
	type PanInfo,
	useMotionValue,
	useReducedMotion,
	useTransform,
} from "framer-motion";
import {
	Aperture,
	Calendar,
	Camera,
	ChevronLeft,
	ChevronRight,
	Clock,
	Download,
	Edit3,
	HardDrive,
	Heart,
	Info,
	MapPin,
	Maximize2,
	MessageSquare,
	RotateCw,
	Share2,
	Sparkles,
	Star,
	Trash2,
	User,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface Photo {
	id: string;
	path: string;
	thumbnail?: string;
	fullPath?: string;
	title?: string;
	description?: string;
	date?: string;
	location?: string;
	camera?: string;
	lens?: string;
	focalLength?: string;
	aperture?: string;
	shutterSpeed?: string;
	iso?: string;
	fileSize?: string;
	dimensions?: string;
	people?: string[];
	tags?: string[];
	rating?: number;
	favorite?: boolean;
	comments?: Array<{ user: string; text: string; date: string }>;
	aiAnalysis?: {
		description: string;
		tags: string[];
		score: number;
	};
}

interface ModernLightboxProps {
	isOpen: boolean;
	onClose: () => void;
	photos: Photo[];
	currentIndex: number;
	onNavigate: (index: number) => void;
	onPhotoAction?: (action: string, photo: Photo) => void;
	enableZoom?: boolean;
	enableRotation?: boolean;
	showThumbnails?: boolean;
	showInfo?: boolean;
	className?: string;
}

const ModernLightbox: React.FC<ModernLightboxProps> = ({
	isOpen,
	onClose,
	photos,
	currentIndex,
	onNavigate,
	onPhotoAction,
	enableZoom = true,
	enableRotation = true,
	showThumbnails = true,
	showInfo = true,
	className,
}) => {
	const [zoom, setZoom] = useState(1);
	const [rotation, setRotation] = useState(0);
	const [showSidebar, setShowSidebar] = useState(false);
	const [showThumbnailBar, _setShowThumbnailBar] = useState(showThumbnails);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [touchStart, setTouchStart] = useState<number | null>(null);

	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const scale = useTransform(() => zoom);
	const rotate = useTransform(() => rotation);

	const currentPhoto = photos[currentIndex];

	const navigatePrevious = useCallback(() => {
		if (currentIndex > 0) {
			onNavigate(currentIndex - 1);
		}
	}, [currentIndex, onNavigate]);

	const navigateNext = useCallback(() => {
		if (currentIndex < photos.length - 1) {
			onNavigate(currentIndex + 1);
		}
	}, [currentIndex, photos.length, onNavigate]);

	const handleZoomIn = useCallback(() => {
		setZoom((prev) => Math.min(prev * 1.25, 4));
	}, []);

	const handleZoomOut = useCallback(() => {
		setZoom((prev) => Math.max(prev / 1.25, 0.5));
	}, []);

	useEffect(() => {
		setImageLoaded(false);
		setZoom(1);
		setRotation(0);
		x.set(0);
		y.set(0);
	}, [x, y]);

	// Keyboard navigation
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case "Escape":
					onClose();
					break;
				case "ArrowLeft":
					navigatePrevious();
					break;
				case "ArrowRight":
					navigateNext();
					break;
				case "+":
				case "=":
					handleZoomIn();
					break;
				case "-":
					handleZoomOut();
					break;
				case "i":
					setShowSidebar(!showSidebar);
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isOpen,
		showSidebar,
		handleZoomIn,
		handleZoomOut,
		navigateNext,
		navigatePrevious,
		onClose,
	]);

	const handleRotate = () => {
		setRotation((prev) => (prev + 90) % 360);
	};

	const resetTransform = () => {
		setZoom(1);
		setRotation(0);
		x.set(0);
		y.set(0);
	};

	const handleDragEnd = (
		_event: MouseEvent | TouchEvent | PointerEvent,
		info: PanInfo,
	) => {
		const swipeThreshold = 100;
		const velocityThreshold = 500;

		if (zoom === 1) {
			if (
				info.offset.x < -swipeThreshold ||
				info.velocity.x < -velocityThreshold
			) {
				navigateNext();
			} else if (
				info.offset.x > swipeThreshold ||
				info.velocity.x > velocityThreshold
			) {
				navigatePrevious();
			}
		}
	};

	const handleTouchStart = (e: React.TouchEvent) => {
		setTouchStart(e.touches[0].clientX);
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		if (!touchStart) return;

		const touchEnd = e.changedTouches[0].clientX;
		const diff = touchStart - touchEnd;

		if (Math.abs(diff) > 50) {
			if (diff > 0) {
				navigateNext();
			} else {
				navigatePrevious();
			}
		}

		setTouchStart(null);
	};

	const prefersReducedMotion = useReducedMotion();
	if (!isOpen) return null;
	return (
		<AnimatePresence>
			<motion.div
				initial={prefersReducedMotion ? undefined : { opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={prefersReducedMotion ? undefined : { opacity: 0 }}
				className={clsx("fixed inset-0 z-50 bg-black flex flex-col", className)}
			>
				{/* Header */}
				<motion.div
					initial={prefersReducedMotion ? undefined : { opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={prefersReducedMotion ? undefined : { delay: 0.1 }}
					className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent"
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<motion.button
								{...(prefersReducedMotion
									? {}
									: { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } })}
								onClick={onClose}
								className="p-3 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-colors"
							>
								<X className="w-5 h-5" />
							</motion.button>

							<div className="text-white">
								<h2 className="text-lg font-semibold">
									{currentPhoto.title || "Untitled"}
								</h2>
								<p className="text-sm text-white/70">
									{currentIndex + 1} of {photos.length}
								</p>
							</div>
						</div>

						{/* Toolbar */}
						<div className="flex items-center gap-2">
							{enableZoom && (
								<>
									<motion.button
										{...(prefersReducedMotion
											? {}
											: {
													whileHover: { scale: 1.1 },
													whileTap: { scale: 0.9 },
												})}
										onClick={handleZoomIn}
										className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-colors"
									>
										<ZoomIn className="w-5 h-5" />
									</motion.button>
									<motion.button
										{...(prefersReducedMotion
											? {}
											: {
													whileHover: { scale: 1.1 },
													whileTap: { scale: 0.9 },
												})}
										onClick={handleZoomOut}
										className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-colors"
									>
										<ZoomOut className="w-5 h-5" />
									</motion.button>
								</>
							)}

							{enableRotation && (
								<motion.button
									{...(prefersReducedMotion
										? {}
										: { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } })}
									onClick={handleRotate}
									className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-colors"
								>
									<RotateCw className="w-5 h-5" />
								</motion.button>
							)}

							<motion.button
								{...(prefersReducedMotion
									? {}
									: { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } })}
								onClick={() => onPhotoAction?.("download", currentPhoto)}
								className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-colors"
							>
								<Download className="w-5 h-5" />
							</motion.button>

							<motion.button
								{...(prefersReducedMotion
									? {}
									: { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } })}
								onClick={() => onPhotoAction?.("share", currentPhoto)}
								className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-colors"
							>
								<Share2 className="w-5 h-5" />
							</motion.button>

							{showInfo && (
								<motion.button
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.9 }}
									onClick={() => setShowSidebar(!showSidebar)}
									className={clsx(
										"p-2 backdrop-blur-sm rounded-lg text-white transition-colors",
										showSidebar
											? "bg-blue-500"
											: "bg-white/10 hover:bg-white/20",
									)}
								>
									<Info className="w-5 h-5" />
								</motion.button>
							)}
						</div>
					</div>
				</motion.div>

				{/* Main Image Container */}
				<div className="flex-1 relative flex items-center justify-center overflow-hidden">
					{/* Navigation Buttons */}
					{currentIndex > 0 && (
						<motion.button
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={navigatePrevious}
							className="absolute left-4 z-10 p-3 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-colors"
						>
							<ChevronLeft className="w-6 h-6" />
						</motion.button>
					)}

					{currentIndex < photos.length - 1 && (
						<motion.button
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={navigateNext}
							className="absolute right-4 z-10 p-3 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-colors"
						>
							<ChevronRight className="w-6 h-6" />
						</motion.button>
					)}

					{/* Image */}
					<AnimatePresence mode="wait">
						<motion.div
							key={currentIndex}
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ duration: 0.3 }}
							className="relative w-full h-full flex items-center justify-center"
							onTouchStart={handleTouchStart}
							onTouchEnd={handleTouchEnd}
						>
							{!imageLoaded && (
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
								</div>
							)}

							<motion.img
								src={currentPhoto.fullPath || currentPhoto.path}
								alt={currentPhoto.title || ""}
								className="max-w-full max-h-full object-contain cursor-move select-none"
								drag={zoom > 1}
								dragElastic={0.2}
								dragConstraints={{
									left: -200 * (zoom - 1),
									right: 200 * (zoom - 1),
									top: -200 * (zoom - 1),
									bottom: 200 * (zoom - 1),
								}}
								onDragEnd={handleDragEnd}
								style={{
									x,
									y,
									scale,
									rotate,
								}}
								onLoad={() => setImageLoaded(true)}
								onDoubleClick={() =>
									zoom === 1 ? handleZoomIn() : resetTransform()
								}
							/>
						</motion.div>
					</AnimatePresence>
				</div>

				{/* Thumbnail Bar */}
				<AnimatePresence>
					{showThumbnailBar && (
						<motion.div
							initial={{ opacity: 0, y: 100 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 100 }}
							className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
						>
							<div className="flex gap-2 overflow-x-auto pb-2">
								{photos.map((photo, index) => (
									<motion.button
										key={photo.id}
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										onClick={() => onNavigate(index)}
										className={clsx(
											"relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all",
											index === currentIndex
												? "ring-2 ring-white ring-offset-2 ring-offset-black"
												: "opacity-60 hover:opacity-100",
										)}
									>
										<img
											src={photo.thumbnail || photo.path}
											alt=""
											className="w-full h-full object-cover"
										/>
									</motion.button>
								))}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Info Sidebar */}
				<AnimatePresence>
					{showSidebar && (
						<motion.div
							initial={{ opacity: 0, x: 400 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: 400 }}
							transition={{ type: "spring", damping: 25, stiffness: 200 }}
							className="absolute right-0 top-0 bottom-0 w-96 bg-black/90 backdrop-blur-xl border-l border-white/10"
						>
							<div className="h-full overflow-y-auto p-6 space-y-6">
								{/* Quick Actions */}
								<div className="flex items-center gap-3">
									<motion.button
										whileHover={{ scale: 1.1 }}
										whileTap={{ scale: 0.9 }}
										onClick={() => onPhotoAction?.("favorite", currentPhoto)}
										className={clsx(
											"p-3 rounded-xl transition-colors",
											currentPhoto.favorite
												? "bg-red-500 text-white"
												: "bg-white/10 text-white hover:bg-white/20",
										)}
									>
										<Heart
											className={clsx("w-5 h-5", {
												"fill-current": currentPhoto.favorite,
											})}
										/>
									</motion.button>

									<div className="flex items-center gap-1">
										{[1, 2, 3, 4, 5].map((star) => (
											<motion.button
												key={star}
												whileHover={{ scale: 1.2 }}
												whileTap={{ scale: 0.8 }}
												onClick={() =>
													onPhotoAction?.("rate", {
														...currentPhoto,
														rating: star,
													})
												}
												className="text-yellow-400"
											>
												<Star
													className={clsx("w-5 h-5", {
														"fill-current":
															currentPhoto.rating &&
															currentPhoto.rating >= star,
													})}
												/>
											</motion.button>
										))}
									</div>
								</div>

								{/* AI Analysis */}
								{currentPhoto.aiAnalysis && (
									<div className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
										<div className="flex items-center gap-2 mb-3">
											<Sparkles className="w-5 h-5 text-purple-400" />
											<h3 className="text-white font-semibold">AI Analysis</h3>
										</div>
										<p className="text-white/80 text-sm mb-3">
											{currentPhoto.aiAnalysis.description}
										</p>
										<div className="flex flex-wrap gap-2">
											{currentPhoto.aiAnalysis.tags.map((tag, _index) => (
												<span
													key={`item-${String(tag)}`}
													className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded-lg"
												>
													{tag}
												</span>
											))}
										</div>
									</div>
								)}

								{/* Photo Info */}
								<div className="space-y-3">
									<h3 className="text-white font-semibold">Information</h3>

									{currentPhoto.date && (
										<div className="flex items-center gap-3 text-white/70">
											<Calendar className="w-4 h-4" />
											<span className="text-sm">{currentPhoto.date}</span>
										</div>
									)}

									{currentPhoto.location && (
										<div className="flex items-center gap-3 text-white/70">
											<MapPin className="w-4 h-4" />
											<span className="text-sm">{currentPhoto.location}</span>
										</div>
									)}

									{currentPhoto.people && currentPhoto.people.length > 0 && (
										<div className="flex items-center gap-3 text-white/70">
											<User className="w-4 h-4" />
											<span className="text-sm">
												{currentPhoto.people.join(", ")}
											</span>
										</div>
									)}

									{currentPhoto.dimensions && (
										<div className="flex items-center gap-3 text-white/70">
											<Maximize2 className="w-4 h-4" />
											<span className="text-sm">{currentPhoto.dimensions}</span>
										</div>
									)}

									{currentPhoto.fileSize && (
										<div className="flex items-center gap-3 text-white/70">
											<HardDrive className="w-4 h-4" />
											<span className="text-sm">{currentPhoto.fileSize}</span>
										</div>
									)}
								</div>

								{/* Camera Settings */}
								{(currentPhoto.camera || currentPhoto.lens) && (
									<div className="space-y-3">
										<h3 className="text-white font-semibold">
											Camera Settings
										</h3>

										{currentPhoto.camera && (
											<div className="flex items-center gap-3 text-white/70">
												<Camera className="w-4 h-4" />
												<span className="text-sm">{currentPhoto.camera}</span>
											</div>
										)}

										{currentPhoto.aperture && (
											<div className="flex items-center gap-3 text-white/70">
												<Aperture className="w-4 h-4" />
												<span className="text-sm">
													f/{currentPhoto.aperture}
												</span>
											</div>
										)}

										{currentPhoto.shutterSpeed && (
											<div className="flex items-center gap-3 text-white/70">
												<Clock className="w-4 h-4" />
												<span className="text-sm">
													{currentPhoto.shutterSpeed}s
												</span>
											</div>
										)}

										{currentPhoto.iso && (
											<div className="flex items-center gap-3 text-white/70">
												<span className="text-xs font-bold text-white/50">
													ISO
												</span>
												<span className="text-sm">{currentPhoto.iso}</span>
											</div>
										)}
									</div>
								)}

								{/* Tags */}
								{currentPhoto.tags && currentPhoto.tags.length > 0 && (
									<div className="space-y-3">
										<h3 className="text-white font-semibold">Tags</h3>
										<div className="flex flex-wrap gap-2">
											{currentPhoto.tags.map((tag, _index) => (
												<span
													key={`item-${String(tag)}`}
													className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
												>
													#{tag}
												</span>
											))}
										</div>
									</div>
								)}

								{/* Comments */}
								{currentPhoto.comments && currentPhoto.comments.length > 0 && (
									<div className="space-y-3">
										<h3 className="text-white font-semibold flex items-center gap-2">
											<MessageSquare className="w-4 h-4" />
											Comments
										</h3>
										<div className="space-y-2">
											{currentPhoto.comments.map((comment, _index) => (
												<div
													key={`item-${String(comment)}`}
													className="p-3 bg-white/5 rounded-lg"
												>
													<div className="flex items-center justify-between mb-1">
														<span className="text-white/80 text-sm font-medium">
															{comment.user}
														</span>
														<span className="text-white/50 text-xs">
															{comment.date}
														</span>
													</div>
													<p className="text-white/70 text-sm">
														{comment.text}
													</p>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Actions */}
								<div className="space-y-2 pt-4 border-t border-white/10">
									<button
										type="button"
										onClick={() => onPhotoAction?.("edit", currentPhoto)}
										className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
									>
										<Edit3 className="w-4 h-4" />
										Edit Photo
									</button>
									<button
										type="button"
										onClick={() => onPhotoAction?.("delete", currentPhoto)}
										className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
									>
										<Trash2 className="w-4 h-4" />
										Delete Photo
									</button>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</AnimatePresence>
	);
};

export default ModernLightbox;
