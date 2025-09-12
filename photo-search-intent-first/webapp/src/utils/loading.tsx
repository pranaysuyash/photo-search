/**
 * Loading and performance utilities for the photo search application
 */

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

/**
 * Props for the ScrollLoader component
 */
interface ScrollLoaderProps {
	onLoadMore: () => void;
	isLoading: boolean;
	hasMore: boolean;
	threshold?: number;
	className?: string;
	loadingText?: string;
}

/**
 * Infinite scroll loader component
 * Triggers callback when user scrolls near the bottom
 *
 * @example
 * <ScrollLoader
 *   onLoadMore={loadMorePhotos}
 *   isLoading={loading}
 *   hasMore={hasMorePhotos}
 * />
 */
export const ScrollLoader: React.FC<ScrollLoaderProps> = ({
	onLoadMore,
	isLoading,
	hasMore,
	threshold = 0.1,
	className = "",
	loadingText = "Loading…",
}) => {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!ref.current || isLoading || !hasMore) return;

		const element = ref.current;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					onLoadMore();
				}
			},
			{ threshold },
		);

		observer.observe(element);
		return () => observer.disconnect();
	}, [isLoading, hasMore, onLoadMore, threshold]);

	return (
		<div
			ref={ref}
			className={`h-8 w-full flex items-center justify-center text-xs text-gray-500 ${className}`}
		>
			{isLoading ? (
				<div className="flex items-center gap-2">
					<Loader2 className="w-4 h-4 animate-spin" />
					<span>{loadingText}</span>
				</div>
			) : (
				!hasMore && <span className="text-gray-400">No more items</span>
			)}
		</div>
	);
};

/**
 * Props for the LoadingSpinner component
 */
interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg" | "xl";
	color?: "primary" | "secondary" | "white";
	className?: string;
	message?: string;
}

/**
 * Loading spinner component with various sizes and colors
 *
 * @example
 * <LoadingSpinner size="lg" color="primary" message="Processing photos..." />
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
	size = "md",
	color = "primary",
	className = "",
	message,
}) => {
	const sizeClasses = {
		sm: "w-4 h-4",
		md: "w-6 h-6",
		lg: "w-8 h-8",
		xl: "w-12 h-12",
	};

	const colorClasses = {
		primary: "text-blue-600",
		secondary: "text-gray-600",
		white: "text-white",
	};

	return (
		<div className={`flex items-center justify-center ${className}`}>
			<Loader2
				className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}
			/>
			{message && (
				<span
					className={`ml-2 text-sm ${color === "white" ? "text-white" : "text-gray-600"}`}
				>
					{message}
				</span>
			)}
		</div>
	);
};

/**
 * Props for the LoadingOverlay component
 */
interface LoadingOverlayProps {
	isLoading: boolean;
	message?: string;
	className?: string;
	children?: React.ReactNode;
}

/**
 * Loading overlay that covers content while loading
 *
 * @example
 * <LoadingOverlay isLoading={isLoading} message="Processing...">
 *   <PhotoGrid photos={photos} />
 * </LoadingOverlay>
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
	isLoading,
	message,
	className = "",
	children,
}) => {
	return (
		<div className={`relative ${className}`}>
			{children}
			<AnimatePresence>
				{isLoading && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
					>
						<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
							<LoadingSpinner size="lg" message={message || "Loading..."} />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

/**
 * Props for the useLoading hook
 */
interface UseLoadingOptions {
	delay?: number;
	minimumLoadingTime?: number;
}

/**
 * Hook for managing loading states with delay and minimum time
 * Prevents loading flicker for fast operations
 *
 * @example
 * const { isLoading, startLoading, stopLoading } = useLoading({
 *   delay: 200,
 *   minimumLoadingTime: 500
 * });
 */
export const useLoading = (_options: UseLoadingOptions = {}) => {
	const { delay = 0, minimumLoadingTime = 0 } = _options;
	const [_isLoading, setIsLoading] = useState(false);
	const [shouldShowLoading, setShouldShowLoading] = useState(false);
	const startTimeRef = useRef<number>(0);
	const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
	const minTimeTimerRef = useRef<NodeJS.Timeout | null>(null);

	const startLoading = () => {
		startTimeRef.current = Date.now();
		setIsLoading(true);

		if (delay > 0) {
			delayTimerRef.current = setTimeout(() => {
				setShouldShowLoading(true);
			}, delay);
		} else {
			setShouldShowLoading(true);
		}
	};

	const stopLoading = () => {
		const elapsedTime = Date.now() - startTimeRef.current;
		const remainingMinTime = Math.max(0, minimumLoadingTime - elapsedTime);

		const finalizeLoading = () => {
			setIsLoading(false);
			setShouldShowLoading(false);

			if (delayTimerRef.current) {
				clearTimeout(delayTimerRef.current);
				delayTimerRef.current = null;
			}
			if (minTimeTimerRef.current) {
				clearTimeout(minTimeTimerRef.current);
				minTimeTimerRef.current = null;
			}
		};

		if (remainingMinTime > 0) {
			minTimeTimerRef.current = setTimeout(finalizeLoading, remainingMinTime);
		} else {
			finalizeLoading();
		}
	};

	useEffect(() => {
		return () => {
			if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
			if (minTimeTimerRef.current) clearTimeout(minTimeTimerRef.current);
		};
	}, []);

	return {
		isLoading: shouldShowLoading,
		startLoading,
		stopLoading,
	};
};

/**
 * Props for the ProgressiveLoader component
 */
interface ProgressiveLoaderProps {
	items: unknown[];
	renderItem: (item: unknown, index: number) => React.ReactNode;
	batchSize?: number;
	delay?: number;
	className?: string;
	onProgress?: (loaded: number, total: number) => void;
}

/**
 * Progressive loader for large lists
 * Renders items in batches to prevent UI blocking
 *
 * @example
 * <ProgressiveLoader
 *   items={photos}
 *   renderItem={(photo) => <PhotoCard key={photo.id} photo={photo} />}
 *   batchSize={20}
 *   delay={100}
 * />
 */
export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
	items,
	renderItem,
	batchSize = 10,
	delay = 50,
	className = "",
	onProgress,
}) => {
	const [loadedCount, setLoadedCount] = useState(batchSize);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (loadedCount >= items.length) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		const timer = setTimeout(() => {
			const newCount = Math.min(loadedCount + batchSize, items.length);
			setLoadedCount(newCount);
			onProgress?.(newCount, items.length);

			if (newCount >= items.length) {
				setIsLoading(false);
			}
		}, delay);

		return () => clearTimeout(timer);
	}, [items.length, loadedCount, batchSize, delay, onProgress]);

	return (
		<>
			<div className={className}>
				{items
					.slice(0, loadedCount)
					.map((item, index) => renderItem(item, index))}
			</div>
			{isLoading && (
				<div className="flex justify-center py-4">
					<LoadingSpinner size="sm" message="Loading more items..." />
				</div>
			)}
		</>
	);
};

/**
 * Hook to detect when content is being loaded
 * Useful for showing loading states during navigation or data fetching
 *
 * @example
 * const isContentLoading = useContentLoading();
 *
 * if (isContentLoading) {
 *   return <LoadingSpinner message="Loading content..." />;
 * }
 */
export const useContentLoading = () => {
	const [isLoading, setIsLoading] = useState(false);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const startLoading = (duration = 0) => {
		if (duration > 0) {
			timeoutRef.current = setTimeout(() => setIsLoading(true), duration);
		} else {
			setIsLoading(true);
		}
	};

	const stopLoading = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setIsLoading(false);
	};

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	return { isLoading, startLoading, stopLoading };
};
