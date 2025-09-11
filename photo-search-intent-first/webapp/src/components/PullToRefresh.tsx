/**
 * Pull-to-Refresh Component for Mobile PWA
 * Provides native-like pull-to-refresh functionality
 */

import { RefreshCw } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface PullToRefreshProps {
	onRefresh: () => Promise<void> | void;
	children: ReactNode;
	className?: string;
	threshold?: number;
	maxPull?: number;
	refreshTimeout?: number;
	disabled?: boolean;
}

interface PullState {
	isPulling: boolean;
	pullDistance: number;
	isRefreshing: boolean;
	canRefresh: boolean;
}

export function PullToRefresh({
	onRefresh,
	children,
	className = "",
	threshold = 80,
	maxPull = 120,
	refreshTimeout = 3000,
	disabled = false,
}: PullToRefreshProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [pullState, setPullState] = useState<PullState>({
		isPulling: false,
		pullDistance: 0,
		isRefreshing: false,
		canRefresh: false,
	});

	const touchStartRef = useRef({ y: 0, x: 0 });
	const startScrollTopRef = useRef(0);
	const isDraggingRef = useRef(false);

	// Check if we can pull (at top of scrollable content)
	const canPull = () => {
		if (disabled) return false;

		// Check if we're at the top of the page or scrollable container
		const scrollTop = window.scrollY || document.documentElement.scrollTop;
		const containerScrollTop = containerRef.current?.scrollTop || 0;

		return scrollTop <= 5 && containerScrollTop <= 5;
	};

	// Handle touch start
	const handleTouchStart = (e: TouchEvent) => {
		if (disabled || !canPull()) return;

		const touch = e.touches[0];
		touchStartRef.current = { x: touch.clientX, y: touch.clientY };
		startScrollTopRef.current =
			window.scrollY || document.documentElement.scrollTop;
		isDraggingRef.current = false;
	};

	// Handle touch move
	const handleTouchMove = (e: TouchEvent) => {
		if (disabled) return;

		const touch = e.touches[0];
		const deltaY = touch.clientY - touchStartRef.current.y;
		const deltaX = touch.clientX - touchStartRef.current.x;

		// Check if this is a vertical scroll (ignore horizontal swipes)
		if (Math.abs(deltaX) > Math.abs(deltaY)) return;

		// Check if we're pulling down and at the top
		if (deltaY > 0 && canPull()) {
			if (!isDraggingRef.current) {
				isDraggingRef.current = true;
			}

			// Prevent default scrolling
			e.preventDefault();

			// Calculate pull distance with resistance
			const pullDistance = Math.min(deltaY * 0.5, maxPull);
			const canRefresh = pullDistance >= threshold;

			setPullState((prev) => ({
				...prev,
				isPulling: true,
				pullDistance,
				canRefresh,
			}));
		}
	};

	// Handle touch end
	const handleTouchEnd = async () => {
		if (disabled || !isDraggingRef.current) return;

		isDraggingRef.current = false;

		if (pullState.canRefresh && !pullState.isRefreshing) {
			// Trigger refresh
			setPullState((prev) => ({
				...prev,
				isRefreshing: true,
				pullDistance: threshold, // Keep at threshold while refreshing
			}));

			try {
				// Call refresh function
				await Promise.race([
					onRefresh(),
					new Promise((_, reject) =>
						setTimeout(
							() => reject(new Error("Refresh timeout")),
							refreshTimeout,
						),
					),
				]);
			} catch (error) {
				console.error("Refresh failed:", error);
			} finally {
				// Reset pull state
				setPullState({
					isPulling: false,
					pullDistance: 0,
					isRefreshing: false,
					canRefresh: false,
				});
			}
		} else {
			// Reset without refreshing
			setPullState({
				isPulling: false,
				pullDistance: 0,
				isRefreshing: false,
				canRefresh: false,
			});
		}
	};

	// Add event listeners
	useEffect(() => {
		if (disabled) return;

		const container = containerRef.current;
		if (!container) return;

		container.addEventListener("touchstart", handleTouchStart, {
			passive: true,
		});
		container.addEventListener("touchmove", handleTouchMove, {
			passive: false,
		});
		container.addEventListener("touchend", handleTouchEnd, { passive: true });

		return () => {
			container.removeEventListener("touchstart", handleTouchStart);
			container.removeEventListener("touchmove", handleTouchMove);
			container.removeEventListener("touchend", handleTouchEnd);
		};
	}, [disabled, handleTouchEnd, handleTouchMove, handleTouchStart]);

	// Calculate transform and styles
	const pullProgress = Math.min(pullState.pullDistance / threshold, 1);
	const contentTransform = pullState.isPulling
		? `translateY(${pullState.pullDistance}px)`
		: "";
	const indicatorOpacity = pullProgress;
	const indicatorScale = 0.5 + pullProgress * 0.5;
	const indicatorRotation = pullState.isRefreshing ? 360 : pullProgress * 180;

	return (
		<div
			ref={containerRef}
			className={`relative overflow-hidden ${className}`}
			style={{ touchAction: "pan-y" }}
		>
			{/* Pull indicator */}
			<div
				className="absolute top-0 left-0 right-0 flex justify-center z-10 pointer-events-none"
				style={{
					transform: `translateY(${Math.max(0, pullState.pullDistance - 40)}px)`,
					opacity: indicatorOpacity,
				}}
			>
				<div
					className={`p-3 rounded-full transition-all duration-200 ${
						pullState.canRefresh && !pullState.isRefreshing
							? "bg-green-500 text-white"
							: pullState.isRefreshing
								? "bg-blue-500 text-white"
								: "bg-gray-200 text-gray-600"
					}`}
					style={{
						transform: `scale(${indicatorScale}) rotate(${indicatorRotation}deg)`,
						transition: pullState.isRefreshing
							? "transform 0.5s linear"
							: "transform 0.2s ease-out",
					}}
				>
					<RefreshCw
						className={`w-6 h-6 ${
							pullState.isRefreshing ? "animate-spin" : ""
						}`}
					/>
				</div>
			</div>

			{/* Content */}
			<div
				ref={contentRef}
				className="relative"
				style={{
					transform: contentTransform,
					transition: pullState.isPulling ? "none" : "transform 0.3s ease-out",
				}}
			>
				{children}
			</div>

			{/* Refresh status text */}
			{pullState.isPulling && (
				<div className="absolute top-16 left-0 right-0 text-center pointer-events-none">
					<p className="text-sm text-gray-600">
						{pullState.canRefresh && !pullState.isRefreshing
							? "Release to refresh"
							: pullState.isRefreshing
								? "Refreshing..."
								: "Pull down to refresh"}
					</p>
				</div>
			)}
		</div>
	);
}

// Hook for pull-to-refresh functionality
export function usePullToRefresh(
	onRefresh: () => Promise<void> | void,
	enabled = true,
) {
	const refreshRef = useRef(onRefresh);

	// Update ref to always use latest callback
	useEffect(() => {
		refreshRef.current = onRefresh;
	}, [onRefresh]);

	return {
		pullToRefreshProps: {
			onRefresh: () => refreshRef.current(),
			disabled: !enabled,
		},
	};
}

// Mobile-optimized component wrapper
export function MobilePullToRefresh({
	onRefresh,
	children,
	className = "",
}: {
	onRefresh: () => Promise<void> | void;
	children: ReactNode;
	className?: string;
}) {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		// Check if device is mobile
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);

		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	if (!isMobile) {
		return <div className={className}>{children}</div>;
	}

	return (
		<PullToRefresh onRefresh={onRefresh} className={className}>
			{children}
		</PullToRefresh>
	);
}

export default PullToRefresh;
