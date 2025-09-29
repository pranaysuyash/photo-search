import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { imageLoadingService } from "../services/ImageLoadingService";

interface ProgressiveImageProps {
	src: string | ((size: number) => string);
	alt: string;
	className?: string;
	thumbSize?: number;
	mediumSize?: number;
	fullSize?: number;
	onLoad?: () => void;
	onError?: () => void;
	loadingComponent?: React.ReactNode;
	placeholder?: string;
	fallback?: string;
	enableLazyLoading?: boolean;
}

// Helper functions for direct image loading
async function loadImageDirectly(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve();
		img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
		img.src = src;
	});
}

async function preloadImageDirectly(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve();
		img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
		img.src = src;
	});
}

export function ProgressiveImage({
	src,
	alt,
	className,
	thumbSize = 128,
	mediumSize = 256,
	fullSize = 1024,
	onLoad,
	onError,
	loadingComponent,
	placeholder,
	fallback,
	enableLazyLoading = true,
}: ProgressiveImageProps) {
	const imgRef = useRef<HTMLImageElement>(null);
	const [currentSrc, setCurrentSrc] = useState<string>("");
	const [currentTier, setCurrentTier] = useState<"thumb" | "medium" | "full">(
		"thumb",
	);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [isIntersecting, setIsIntersecting] = useState(!enableLazyLoading);

	// Generate progressive URLs using useMemo
	const imageTiers = useMemo<ImageTier>(() => {
		function updateUrlSize(url: URL, size: number): string {
			url.searchParams.set("size", size.toString());
			return url.toString();
		}

		if (typeof src === "function") {
			return {
				thumb: src(thumbSize),
				medium: src(mediumSize),
				full: src(fullSize),
			};
		}

		try {
			const url = new URL(src);
			return {
				thumb: updateUrlSize(url, thumbSize),
				medium: updateUrlSize(url, mediumSize),
				full: updateUrlSize(url, fullSize),
			};
		} catch {
			// Fallback for invalid URLs
			return {
				thumb: src,
				medium: src,
				full: src,
			};
		}
	}, [src, thumbSize, mediumSize, fullSize]);

	// Helper functions for direct image loading (since ImageLoadingService methods are private)
	async function loadImageDirectly(src: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve();
			img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
			img.src = src;
		});
	}

	async function preloadImageDirectly(src: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve();
			img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
			img.src = src;
		});
	}

	// Handle intersection observer for lazy loading
	useEffect(() => {
		if (!enableLazyLoading) {
			setIsIntersecting(true);
			return;
		}

		if (!imgRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry.isIntersecting) {
					setIsIntersecting(true);
					observer.unobserve(entry.target);
				}
			},
			{
				threshold: 0.1,
				rootMargin: "50px",
			},
		);

		observer.observe(imgRef.current);

		return () => {
			observer.disconnect();
		};
	}, [enableLazyLoading]);

	// Handle progressive image loading
	useEffect(() => {
		if (!isIntersecting) return;

		const loadProgressiveImage = async () => {
			try {
				setIsLoading(true);
				setHasError(false);

				// Start with thumbnail
				await loadImageDirectly(imageTiers.thumb);
				setCurrentSrc(imageTiers.thumb);
				setCurrentTier("thumb");
				setIsLoading(false);

				// Preload medium size
				await preloadImageDirectly(imageTiers.medium);

				// Upgrade to medium after a short delay for better UX
				setTimeout(async () => {
					if (imgRef.current && isIntersecting) {
						try {
							await loadImageDirectly(imageTiers.medium);
							setCurrentSrc(imageTiers.medium);
							setCurrentTier("medium");
							onLoad?.();
						} catch (error) {
							console.warn("Failed to load medium image:", error);
						}
					}
				}, 500);

				// Preload full size for potential upgrade
				await preloadImageDirectly(imageTiers.full);
			} catch (error) {
				console.error("Failed to load progressive image:", error);
				setHasError(true);
				setIsLoading(false);
				onError?.();
			}
		};

		loadProgressiveImage();
	}, [
		isIntersecting,
		onLoad,
		onError,
		imageTiers.thumb,
		imageTiers.medium,
		imageTiers.full,
		loadImageDirectly,
		preloadImageDirectly,
	]); // eslint-disable-line react-hooks/exhaustive-deps

	// Handle manual upgrade to full quality (e.g., on hover/focus)
	const upgradeToFull = async () => {
		if (currentTier === "full") return;

		try {
			await loadImageDirectly(imageTiers.full);
			setCurrentSrc(imageTiers.full);
			setCurrentTier("full");
		} catch (error) {
			console.warn("Failed to upgrade to full image:", error);
		}
	};

	const handleImageLoad = () => {
		setIsLoading(false);
		onLoad?.();
	};

	const handleImageError = () => {
		setHasError(true);
		setIsLoading(false);
		onError?.();
	};

	return (
		<div className={cn("relative overflow-hidden", className)}>
			{/* Loading placeholder */}
			{isLoading && (
				<div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
					{loadingComponent || (
						<div className="text-gray-400 text-sm">Loading...</div>
					)}
				</div>
			)}

			{/* Error fallback */}
			{hasError && (
				<div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
					{fallback || (
						<div className="text-gray-500 text-sm">
							{placeholder || "Image not available"}
						</div>
					)}
				</div>
			)}

			{/* Actual image */}
			{!hasError && (
				<img
					ref={imgRef}
					src={currentSrc}
					alt={alt}
					className={cn(
						"w-full h-full object-cover transition-opacity duration-300",
						isLoading ? "opacity-0" : "opacity-100",
					)}
					onLoad={handleImageLoad}
					onError={handleImageError}
					loading={enableLazyLoading ? "lazy" : "eager"}
					onMouseEnter={upgradeToFull}
					onFocus={upgradeToFull}
					// Add data attributes for debugging
					data-current-tier={currentTier}
					data-image-state={
						isLoading ? "loading" : hasError ? "error" : "loaded"
					}
				/>
			)}

			{/* Quality indicator (for debugging) */}
			{process.env.NODE_ENV === "development" && (
				<div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
					{currentTier}
				</div>
			)}
		</div>
	);
}

// Hook for managing progressive image loading
export function useProgressiveImage(
	src: string,
	options: {
		thumbSize?: number;
		mediumSize?: number;
		fullSize?: number;
		enableLazyLoading?: boolean;
	} = {},
) {
	const [currentSrc, setCurrentSrc] = useState<string>("");
	const [currentTier, setCurrentTier] = useState<"thumb" | "medium" | "full">(
		"thumb",
	);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const loadImage = async () => {
			try {
				setIsLoading(true);
				setHasError(false);

				const { thumb, medium, full } =
					imageLoadingService.createProgressiveUrls(src, {
						thumb: options.thumbSize || 128,
						medium: options.mediumSize || 256,
						full: options.fullSize || 1024,
					});

				// Load thumbnail first
				await loadImageDirectly(thumb);
				if (isMounted) {
					setCurrentSrc(thumb);
					setCurrentTier("thumb");
					setIsLoading(false);
				}

				// Preload medium and full
				if (options.enableLazyLoading !== false) {
					await preloadImageDirectly(medium);
					await preloadImageDirectly(full);
				}
			} catch (_error) {
				if (isMounted) {
					setHasError(true);
					setIsLoading(false);
				}
			}
		};

		loadImage();

		return () => {
			isMounted = false;
		};
	}, [src, options]);

	const upgradeTier = async (targetTier: "thumb" | "medium" | "full") => {
		if (currentTier === targetTier) return;

		try {
			const urls = imageLoadingService.createProgressiveUrls(src, {
				thumb: options.thumbSize || 128,
				medium: options.mediumSize || 256,
				full: options.fullSize || 1024,
			});

			await loadImageDirectly(urls[targetTier]);
			setCurrentSrc(urls[targetTier]);
			setCurrentTier(targetTier);
		} catch (error) {
			console.warn(`Failed to upgrade to ${targetTier}:`, error);
		}
	};

	return {
		src: currentSrc,
		currentTier,
		isLoading,
		hasError,
		upgradeTier,
	};
}
