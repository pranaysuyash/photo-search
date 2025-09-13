import clsx from "clsx";
import {
	motion,
	type PanInfo,
	useMotionValue,
	useTransform,
} from "framer-motion";
import {
	Download,
	RotateCcw,
	Search,
	Share,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface MobileOptimizationsProps {
	children: React.ReactNode;
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
	onSwipeUp?: () => void;
	onSwipeDown?: () => void;
	enableSwipeGestures?: boolean;
	enablePullToRefresh?: boolean;
	onPullToRefresh?: () => void;
}

// Mobile-optimized sidebar with swipe gestures
export function MobileSidebar({
	isOpen,
	onClose,
	children,
	position = "left",
}: {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	position?: "left" | "right";
}) {
	const sidebarRef = useRef<HTMLDivElement>(null);
	const x = useMotionValue(0);
	const _opacity = useTransform(x, [-100, 0, 100], [0, 1, 0]);

	const handleDragEnd = (_event: unknown, info: PanInfo) => {
		const threshold = 50;
		if (position === "left" && info.offset.x < -threshold) {
			onClose();
		} else if (position === "right" && info.offset.x > threshold) {
			onClose();
		}
	};

	return (
		<>
			{/* Backdrop */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: isOpen ? 0.5 : 0 }}
				className={clsx(
					"fixed inset-0 bg-black z-40 md:hidden",
					!isOpen && "pointer-events-none",
				)}
				onClick={onClose}
			/>

			{/* Sidebar */}
			<motion.div
				ref={sidebarRef}
				initial={{ x: position === "left" ? "-100%" : "100%" }}
				animate={{ x: isOpen ? 0 : position === "left" ? "-100%" : "100%" }}
				transition={{ type: "tween", duration: 0.3 }}
				drag={position === "left" ? "x" : "x"}
				dragConstraints={{
					left: position === "left" ? -100 : 0,
					right: position === "left" ? 0 : 100,
				}}
				dragElastic={0.2}
				onDragEnd={handleDragEnd}
				className="fixed top-0 bottom-0 w-80 max-w-[90vw] bg-white dark:bg-gray-800 shadow-2xl z-50 md:hidden overflow-y-auto"
				style={{ x }}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
						Menu
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						aria-label="Close menu"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-4">{children}</div>
			</motion.div>
		</>
	);
}

// Mobile-optimized search bar with voice input
export function MobileSearchBar({
	value,
	onChange,
	onSubmit,
	placeholder = "Search photos...",
	enableVoiceSearch = true,
}: {
	value: string;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void;
	placeholder?: string;
	enableVoiceSearch?: boolean;
}) {
	const [isListening, setIsListening] = useState(false);
	const [recognition, setRecognition] = useState<unknown>(null);

	useEffect(() => {
		if (enableVoiceSearch && "webkitSpeechRecognition" in window) {
			const recognition = new (window as unknown).webkitSpeechRecognition();
			recognition.continuous = false;
			recognition.interimResults = false;
			recognition.lang = "en-US";

			recognition.onstart = () => setIsListening(true);
			recognition.onend = () => setIsListening(false);
			recognition.onresult = (event: unknown) => {
				const transcript = event.results[0][0].transcript;
				onChange(transcript);
				onSubmit(transcript);
			};

			setRecognition(recognition);
		}
	}, [enableVoiceSearch, onChange, onSubmit]);

	const handleVoiceSearch = () => {
		if (recognition && !isListening) {
			recognition.start();
		}
	};

	return (
		<div className="relative w-full">
			<div className="relative">
				<input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyPress={(e) => e.key === "Enter" && onSubmit(value)}
					placeholder={placeholder}
					className="w-full pl-4 pr-12 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					autoComplete="off"
					autoCapitalize="off"
					autoCorrect="off"
					spellCheck="false"
				/>
				<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
					{enableVoiceSearch && (
						<button
							type="button"
							onClick={handleVoiceSearch}
							className={clsx(
								"p-2 rounded-lg transition-colors",
								isListening
									? "text-red-500 bg-red-50 dark:bg-red-900/20"
									: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
							)}
							aria-label="Voice search"
						>
							<div
								className={clsx(
									"w-5 h-5 rounded-full border-2 transition-colors",
									isListening
										? "border-red-500 bg-red-500 animate-pulse"
										: "border-current",
								)}
							/>
						</button>
					)}
					<button
						type="button"
						onClick={() => onSubmit(value)}
						className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						aria-label="Search"
					>
						<Search className="w-5 h-5" />
					</button>
				</div>
			</div>
		</div>
	);
}

// Mobile-optimized photo grid with touch gestures
export function MobilePhotoGrid({
	photos,
	onPhotoClick,
	onPhotoLongPress,
	selectedPhotos = [],
	onSelectionChange,
}: {
	photos: Array<{ id: string; src: string; alt: string }>;
	onPhotoClick: (photo: unknown) => void;
	onPhotoLongPress?: (photo: unknown) => void;
	selectedPhotos?: string[];
	onSelectionChange?: (selected: string[]) => void;
}) {
	const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
		null,
	);
	const [isSelectionMode, setIsSelectionMode] = useState(false);

	const handleTouchStart = (photo: unknown) => {
		if (onPhotoLongPress) {
			const timer = setTimeout(() => {
				setIsSelectionMode(true);
				onPhotoLongPress(photo);
			}, 500);
			setLongPressTimer(timer);
		}
	};

	const handleTouchEnd = (_photo: unknown) => {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			setLongPressTimer(null);
		}
	};

	const handlePhotoClick = (photo: unknown) => {
		if (isSelectionMode && onSelectionChange) {
			const isSelected = selectedPhotos.includes(photo.id);
			const newSelected = isSelected
				? selectedPhotos.filter((id) => id !== photo.id)
				: [...selectedPhotos, photo.id];
			onSelectionChange(newSelected);

			if (newSelected.length === 0) {
				setIsSelectionMode(false);
			}
		} else {
			onPhotoClick(photo);
		}
	};

	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-4">
			{photos.map((photo) => (
				<motion.div
					key={photo.id}
					className={clsx(
						"relative aspect-square rounded-lg overflow-hidden cursor-pointer",
						"active:scale-95 transition-transform",
						selectedPhotos.includes(photo.id) &&
							"ring-2 ring-blue-500 ring-offset-2",
					)}
					onTouchStart={() => handleTouchStart(photo)}
					onTouchEnd={() => handleTouchEnd(photo)}
					onClick={() => handlePhotoClick(photo)}
					whileTap={{ scale: 0.95 }}
				>
					<img
						src={photo.src}
						alt={photo.alt}
						className="w-full h-full object-cover"
						loading="lazy"
					/>
					{selectedPhotos.includes(photo.id) && (
						<div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
							<div className="w-3 h-3 bg-white rounded-full" />
						</div>
					)}
				</motion.div>
			))}
		</div>
	);
}

// Mobile-optimized action sheet
export function MobileActionSheet({
	isOpen,
	onClose,
	title,
	actions,
}: {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	actions: Array<{
		label: string;
		icon?: React.ReactNode;
		onClick: () => void;
		destructive?: boolean;
		disabled?: boolean;
	}>;
}) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: isOpen ? 1 : 0 }}
			className={clsx(
				"fixed inset-0 z-50 md:hidden",
				!isOpen && "pointer-events-none",
			)}
		>
			{/* Backdrop */}
			<div
				role="button"
				tabIndex={0}
				className="absolute inset-0 bg-black/50"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onClose;
					}
				}}
			/>

			{/* Sheet */}
			<motion.div
				initial={{ y: "100%" }}
				animate={{ y: isOpen ? 0 : "100%" }}
				transition={{ type: "tween", duration: 0.3 }}
				className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl"
			>
				{/* Handle */}
				<div className="flex justify-center p-3">
					<div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
				</div>

				{/* Title */}
				{title && (
					<div className="px-6 pb-2">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
							{title}
						</h3>
					</div>
				)}

				{/* Actions */}
				<div className="py-2">
					{actions.map((action, index) => (
						<button
							type="button"
							key={`action-${action.label}-${index}`}
							onClick={() => {
								action.onClick();
								onClose();
							}}
							disabled={action.disabled}
							className={clsx(
								"w-full px-6 py-4 text-left flex items-center gap-3 transition-colors",
								action.destructive
									? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
									: "text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700",
								action.disabled && "opacity-50 cursor-not-allowed",
							)}
						>
							{action.icon}
							<span className="font-medium">{action.label}</span>
						</button>
					))}
				</div>

				{/* Cancel */}
				<div className="p-3 border-t border-gray-200 dark:border-gray-700">
					<button
						type="button"
						onClick={onClose}
						className="w-full py-3 text-center font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
					>
						Cancel
					</button>
				</div>
			</motion.div>
		</motion.div>
	);
}

// Pull-to-refresh component
export function PullToRefresh({
	onRefresh,
	children,
	threshold = 80,
}: {
	onRefresh: () => void;
	children: React.ReactNode;
	threshold?: number;
}) {
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [pullDistance, setPullDistance] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	const handleTouchStart = (e: React.TouchEvent) => {
		if (containerRef.current?.scrollTop === 0) {
			containerRef.current.dataset.pullStart = e.touches[0].clientY.toString();
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (!containerRef.current?.dataset.pullStart || isRefreshing) return;

		const startY = parseFloat(containerRef.current.dataset.pullStart);
		const currentY = e.touches[0].clientY;
		const distance = Math.max(0, currentY - startY);

		if (distance > 0) {
			setPullDistance(distance);
			e.preventDefault();
		}
	};

	const handleTouchEnd = () => {
		if (pullDistance >= threshold && !isRefreshing) {
			setIsRefreshing(true);
			onRefresh();
			setTimeout(() => {
				setIsRefreshing(false);
				setPullDistance(0);
			}, 1000);
		} else {
			setPullDistance(0);
		}
		if (containerRef.current) {
			delete containerRef.current.dataset.pullStart;
		}
	};

	return (
		<div
			ref={containerRef}
			className="relative overflow-y-auto h-full"
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
		>
			{/* Pull indicator */}
			<motion.div
				className="absolute top-0 left-0 right-0 flex justify-center items-center py-4 bg-white dark:bg-gray-800 z-10"
				style={{
					transform: `translateY(${Math.min(pullDistance - 60, 0)}px)`,
					opacity: pullDistance > 20 ? 1 : 0,
				}}
			>
				<motion.div
					animate={{ rotate: pullDistance >= threshold ? 180 : 0 }}
					className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full"
				/>
				<span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
					{pullDistance >= threshold ? "Release to refresh" : "Pull to refresh"}
				</span>
			</motion.div>

			{/* Content */}
			<motion.div
				style={{
					transform: `translateY(${Math.max(0, pullDistance - 60)}px)`,
				}}
			>
				{children}
			</motion.div>
		</div>
	);
}

// Mobile-optimized image viewer with pinch-to-zoom
export function MobileImageViewer({
	src,
	alt,
	onClose,
	onShare,
	onDownload,
}: {
	src: string;
	alt: string;
	onClose: () => void;
	onShare?: () => void;
	onDownload?: () => void;
}) {
	const [scale, setScale] = useState(1);
	const [rotation, setRotation] = useState(0);
	const imageRef = useRef<HTMLImageElement>(null);

	const _handlePinch = (e: unknown) => {
		setScale(e.scale);
	};

	const handleRotate = () => {
		setRotation((prev) => prev + 90);
	};

	const handleZoomIn = () => {
		setScale((prev) => Math.min(prev * 1.2, 3));
	};

	const handleZoomOut = () => {
		setScale((prev) => Math.max(prev / 1.2, 0.5));
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 bg-black z-50 flex flex-col"
		>
			{/* Header */}
			<div className="flex items-center justify-between p-4 text-white">
				<button
					type="button"
					onClick={onClose}
					className="p-2 hover:bg-white/10 rounded-lg transition-colors"
					aria-label="Close viewer"
				>
					<X className="w-6 h-6" />
				</button>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleZoomOut}
						className="p-2 hover:bg-white/10 rounded-lg transition-colors"
						aria-label="Zoom out"
					>
						<ZoomOut className="w-5 h-5" />
					</button>
					<span className="text-sm">{Math.round(scale * 100)}%</span>
					<button
						type="button"
						onClick={handleZoomIn}
						className="p-2 hover:bg-white/10 rounded-lg transition-colors"
						aria-label="Zoom in"
					>
						<ZoomIn className="w-5 h-5" />
					</button>
					<button
						type="button"
						onClick={handleRotate}
						className="p-2 hover:bg-white/10 rounded-lg transition-colors"
						aria-label="Rotate"
					>
						<RotateCcw className="w-5 h-5" />
					</button>
				</div>

				<div className="flex items-center gap-2">
					{onShare && (
						<button
							type="button"
							onClick={onShare}
							className="p-2 hover:bg-white/10 rounded-lg transition-colors"
							aria-label="Share"
						>
							<Share className="w-5 h-5" />
						</button>
					)}
					{onDownload && (
						<button
							type="button"
							onClick={onDownload}
							className="p-2 hover:bg-white/10 rounded-lg transition-colors"
							aria-label="Download"
						>
							<Download className="w-5 h-5" />
						</button>
					)}
				</div>
			</div>

			{/* Image */}
			<div className="flex-1 flex items-center justify-center overflow-hidden">
				<motion.img
					ref={imageRef}
					src={src}
					alt={alt}
					className="max-w-full max-h-full object-contain"
					style={{
						scale,
						rotate: rotation,
					}}
					drag
					dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
				/>
			</div>
		</motion.div>
	);
}

// Main mobile optimizations wrapper
export function MobileOptimizations({
	children,
	onSwipeLeft,
	onSwipeRight,
	onSwipeUp,
	onSwipeDown,
	enableSwipeGestures = true,
	enablePullToRefresh = false,
	onPullToRefresh,
}: MobileOptimizationsProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
		null,
	);

	const handleTouchStart = (e: React.TouchEvent) => {
		if (!enableSwipeGestures) return;
		setTouchStart({
			x: e.touches[0].clientX,
			y: e.touches[0].clientY,
		});
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		if (!enableSwipeGestures || !touchStart) return;

		const touchEnd = {
			x: e.changedTouches[0].clientX,
			y: e.changedTouches[0].clientY,
		};

		const deltaX = touchEnd.x - touchStart.x;
		const deltaY = touchEnd.y - touchStart.y;
		const minSwipeDistance = 50;

		if (Math.abs(deltaX) > Math.abs(deltaY)) {
			// Horizontal swipe
			if (Math.abs(deltaX) > minSwipeDistance) {
				if (deltaX > 0) {
					onSwipeRight?.();
				} else {
					onSwipeLeft?.();
				}
			}
		} else {
			// Vertical swipe
			if (Math.abs(deltaY) > minSwipeDistance) {
				if (deltaY > 0) {
					onSwipeDown?.();
				} else {
					onSwipeUp?.();
				}
			}
		}

		setTouchStart(null);
	};

	const content =
		enablePullToRefresh && onPullToRefresh ? (
			<PullToRefresh onRefresh={onPullToRefresh}>{children}</PullToRefresh>
		) : (
			children
		);

	return (
		<div
			ref={containerRef}
			className="min-h-screen"
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
		>
			{content}
		</div>
	);
}

// Hook for detecting mobile devices and screen size
export function useMobileDetection() {
	const [isMobile, setIsMobile] = useState(false);
	const [isTablet, setIsTablet] = useState(false);
	const [screenSize, setScreenSize] = useState<"mobile" | "tablet" | "desktop">(
		"desktop",
	);

	useEffect(() => {
		const checkDevice = () => {
			const width = window.innerWidth;
			const mobile = width < 768;
			const tablet = width >= 768 && width < 1024;

			setIsMobile(mobile);
			setIsTablet(tablet);
			setScreenSize(mobile ? "mobile" : tablet ? "tablet" : "desktop");
		};

		checkDevice();
		window.addEventListener("resize", checkDevice);
		return () => window.removeEventListener("resize", checkDevice);
	}, []);

	return { isMobile, isTablet, screenSize };
}

// Hook for haptic feedback (iOS)
export function useHapticFeedback() {
	const trigger = (type: "light" | "medium" | "heavy" = "light") => {
		if ("vibrate" in navigator) {
			const patterns = {
				light: [10],
				medium: [20],
				heavy: [30],
			};
			navigator.vibrate(patterns[type]);
		}
	};

	return { trigger };
}
