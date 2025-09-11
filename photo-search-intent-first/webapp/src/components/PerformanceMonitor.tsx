/**
 * Performance monitoring component to track app performance in development
 */
import { memo, useEffect, useState } from "react";
import { imageLoadingService } from "../services/ImageLoadingService";

interface PerformanceStats {
	renderTime: number;
	memoryUsage: number;
	imageCache: {
		size: number;
		totalSize: number;
		hitRate: number;
	};
	networkRequests: number;
}

const PerformanceMonitor = memo(() => {
	const [stats, setStats] = useState<PerformanceStats | null>(null);
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		if (process.env.NODE_ENV !== "development") return;

		const updateStats = () => {
			const cacheStats = imageLoadingService.getCacheStats();
			const memory = (performance as any).memory;

			const newStats: PerformanceStats = {
				renderTime: performance.now(),
				memoryUsage: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0,
				imageCache: cacheStats,
				networkRequests:
					(performance as any).getEntriesByType?.("navigation")?.length || 0,
			};

			setStats(newStats);
		};

		const interval = setInterval(updateStats, 2000);
		updateStats();

		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.shiftKey && e.key === "P") {
				setIsVisible((prev) => !prev);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	if (process.env.NODE_ENV !== "development" || !isVisible || !stats) {
		return null;
	}

	return (
		<div className="fixed bottom-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono z-[9999]">
			<div className="flex items-center justify-between mb-2">
				<h3 className="font-bold">Performance Monitor</h3>
				<button
					type="button"
					onClick={() => setIsVisible(false)}
					className="text-gray-400 hover:text-white ml-4"
				>
					×
				</button>
			</div>

			<div className="space-y-1">
				<div>
					<span className="text-blue-400">Memory:</span>{" "}
					<span
						className={
							stats.memoryUsage > 100 ? "text-red-400" : "text-green-400"
						}
					>
						{stats.memoryUsage.toFixed(1)}MB
					</span>
				</div>

				<div>
					<span className="text-blue-400">Image Cache:</span>{" "}
					<span className="text-green-400">
						{stats.imageCache.size} items (
						{(stats.imageCache.totalSize / 1024 / 1024).toFixed(1)}MB)
					</span>
				</div>

				<div>
					<span className="text-blue-400">Cache Hit Rate:</span>{" "}
					<span
						className={
							stats.imageCache.hitRate > 0.8
								? "text-green-400"
								: "text-yellow-400"
						}
					>
						{(stats.imageCache.hitRate * 100).toFixed(1)}%
					</span>
				</div>

				<div className="text-gray-400 mt-2">Press Ctrl+Shift+P to toggle</div>
			</div>
		</div>
	);
});

PerformanceMonitor.displayName = "PerformanceMonitor";

export default PerformanceMonitor;
