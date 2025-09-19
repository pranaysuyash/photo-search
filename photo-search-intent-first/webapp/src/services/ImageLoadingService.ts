/**
 * Enhanced Image Loading Service with batch loading, priority queues, and advanced caching
 */

interface ImageLoadingOptions {
	threshold?: number;
	rootMargin?: string;
	quality?: "low" | "medium" | "high";
	enableProgressiveLoading?: boolean;
	enableBatchLoading?: boolean;
	maxConcurrentLoads?: number;
	enableTieredLoading?: boolean;
}

interface CacheEntry {
	blob: Blob;
	url: string;
	timestamp: number;
	size: number;
	lastAccessed: number;
	priority: number;
	tier?: "thumb" | "medium" | "full";
}

interface ProgressiveImageLoad {
	thumbUrl: string;
	mediumUrl: string;
	fullUrl: string;
	currentTier: "thumb" | "medium" | "full";
	onTierChange?: (tier: "thumb" | "medium" | "full") => void;
}

interface BatchLoadRequest {
	urls: string[];
	priority: "high" | "medium" | "low";
	onProgress?: (loaded: number, total: number) => void;
	onComplete?: (results: Map<string, string>) => void;
}

interface ThumbnailBatch {
	paths: string[];
	size: number;
	priority: "high" | "medium" | "low";
	resolve: (results: Map<string, string>) => void;
	reject: (error: Error) => void;
}

import { getImageErrorSampleRate, shouldSample } from "../config/logging";
import { handleError } from "../utils/errors";

class ImageLoadingService {
	private intersectionObserver: IntersectionObserver | null = null;
	private imageCache = new Map<string, CacheEntry>();
	private loadingQueue = new Set<string>();
	private maxCacheSize = 100 * 1024 * 1024; // 100MB
	private currentCacheSize = 0;
	private options: Required<ImageLoadingOptions>;
	private batchQueue: BatchLoadRequest[] = [];
	private isProcessingBatch = false;
	private batchProcessingTimer: number | null = null;

	constructor(options: ImageLoadingOptions = {}) {
		this.options = {
			threshold: options.threshold ?? 0.1,
			rootMargin: options.rootMargin ?? "50px",
			quality: options.quality ?? "medium",
			enableProgressiveLoading: options.enableProgressiveLoading ?? true,
			enableBatchLoading: options.enableBatchLoading ?? true,
			maxConcurrentLoads: options.maxConcurrentLoads ?? 6,
			enableTieredLoading: options.enableTieredLoading ?? true,
		};

		this.initIntersectionObserver();
		this.initBatchProcessing();
	}

	private initIntersectionObserver() {
		if (typeof window === "undefined" || !window.IntersectionObserver) {
			return;
		}

		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const img = entry.target as HTMLImageElement;
						const src = img.dataset.src;
						if (src && !img.src) {
							this.loadImage(src, img);
							this.intersectionObserver?.unobserve(img);
						}
					}
				});
			},
			{
				threshold: this.options.threshold,
				rootMargin: this.options.rootMargin,
			},
		);
	}

	private initBatchProcessing() {
		// Initialize batch processing queue
		this.batchQueue = [];
		this.isProcessingBatch = false;
		this.batchProcessingTimer = null;
	}

	/**
	 * Observe an image element for lazy loading
	 */
	observeImage(img: HTMLImageElement, src: string) {
		if (!this.intersectionObserver) {
			// Fallback for browsers without intersection observer
			this.loadImage(src, img);
			return;
		}

		img.dataset.src = src;

		// Add loading placeholder
		if (this.options.enableProgressiveLoading) {
			img.style.backgroundColor = "#f3f4f6";
			img.style.backgroundImage =
				"linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)";
			img.style.backgroundSize = "200% 100%";
			img.style.animation = "shimmer 2s infinite linear";
		}

		this.intersectionObserver.observe(img);
	}

	/**
	 * Load image with caching
	 */
	private async loadImage(src: string, img?: HTMLImageElement): Promise<void> {
		if (this.loadingQueue.has(src)) {
			return;
		}

		// Check cache first
		const cached = this.imageCache.get(src);
		if (cached) {
			if (img) {
				this.applyImageToElement(cached.url, img);
			}
			// Move to end of cache (LRU)
			this.imageCache.delete(src);
			this.imageCache.set(src, cached);
			return;
		}

		this.loadingQueue.add(src);

		try {
			const response = await fetch(src, {
				credentials: "same-origin",
				cache: "force-cache",
			});

			if (!response.ok) {
				throw new Error(`Failed to load image: ${response.status}`);
			}

			const blob = await response.blob();
			const objectUrl = URL.createObjectURL(blob);

			// Add to cache
			const entry: CacheEntry = {
				blob,
				url: objectUrl,
				timestamp: Date.now(),
				size: blob.size,
				lastAccessed: Date.now(),
				priority: 1,
			};

			this.addToCache(src, entry);
			if (img) {
				this.applyImageToElement(objectUrl, img);
			}
		} catch (error) {
			console.warn("Failed to load image:", src, error);
			// Sample to avoid noisy logs on intermittent failures (env-tunable)
			const p = getImageErrorSampleRate();
			if (shouldSample(p)) {
				handleError(error, {
					logToServer: true,
					// keep console noise low; warn above already emitted
					logToConsole: false,
					context: {
						action: "image_load",
						component: "ImageLoadingService.loadImage",
						metadata: { src },
					},
				});
			}
			if (img) {
				img.style.backgroundColor = "#fee2e2";
				img.alt = "Failed to load";
			}
		} finally {
			this.loadingQueue.delete(src);
		}
	}

	private applyImageToElement(url: string, img?: HTMLImageElement) {
		if (!img) return;

		img.onload = () => {
			// Remove loading animation
			img.style.backgroundColor = "";
			img.style.backgroundImage = "";
			img.style.animation = "";
		};

		img.src = url;
	}

	private addToCache(key: string, entry: CacheEntry) {
		// Implement LRU cache with size limit
		this.currentCacheSize += entry.size;

		// Remove oldest entries if over limit
		while (
			this.currentCacheSize > this.maxCacheSize &&
			this.imageCache.size > 0
		) {
			const firstEntry = this.imageCache.entries().next().value;
			if (firstEntry) {
				const [oldestKey, oldestEntry] = firstEntry;
				this.imageCache.delete(oldestKey);
				this.currentCacheSize -= oldestEntry.size;
				URL.revokeObjectURL(oldestEntry.url);
			}
		}

		this.imageCache.set(key, entry);
	}

	/**
	 * Preload images for better UX
	 */
	preloadImages(urls: string[], priority: "high" | "low" = "low") {
		if (priority === "low") {
			// Use requestIdleCallback for low priority preloading
			if (window.requestIdleCallback) {
				window.requestIdleCallback(() => {
					this.preloadImageBatch(urls);
				});
			} else {
				setTimeout(() => this.preloadImageBatch(urls), 100);
			}
		} else {
			this.preloadImageBatch(urls);
		}
	}

	private async preloadImageBatch(urls: string[]) {
		const promises = urls
			.filter((url) => !this.imageCache.has(url) && !this.loadingQueue.has(url))
			.slice(0, 10) // Limit concurrent preloads
			.map((url) => this.preloadSingleImage(url));

		await Promise.allSettled(promises);
	}

	private async preloadSingleImage(src: string): Promise<void> {
		if (this.imageCache.has(src) || this.loadingQueue.has(src)) {
			return;
		}

		this.loadingQueue.add(src);

		try {
			const response = await fetch(src, {
				credentials: "same-origin",
				cache: "force-cache",
			});

			if (response.ok) {
				const blob = await response.blob();
				const objectUrl = URL.createObjectURL(blob);

				const entry: CacheEntry = {
					blob,
					url: objectUrl,
					timestamp: Date.now(),
					size: blob.size,
					lastAccessed: Date.now(),
					priority: 1,
				};

				this.addToCache(src, entry);
			}
		} catch {
			// Ignore preload failures
		} finally {
			this.loadingQueue.delete(src);
		}
	}

	/**
	 * Clear cache and release memory
	 */
	clearCache() {
		for (const entry of this.imageCache.values()) {
			URL.revokeObjectURL(entry.url);
		}
		this.imageCache.clear();
		this.currentCacheSize = 0;
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		return {
			size: this.imageCache.size,
			totalSize: this.currentCacheSize,
			maxSize: this.maxCacheSize,
			hitRate:
				this.imageCache.size > 0
					? Array.from(this.imageCache.values()).filter(
							(e) => Date.now() - e.timestamp < 300000,
						).length / this.imageCache.size
					: 0,
		};
	}

	/**
	 * Load progressive image with tiered loading
	 */
	async loadProgressiveImage(options: ProgressiveImageLoad): Promise<void> {
		if (!this.options.enableTieredLoading) {
			// Fallback to direct full loading
			await this.loadImage(options.fullUrl);
			return;
		}

		// Start with thumbnail
		await this.loadImage(options.thumbUrl);
		options.onTierChange?.("thumb");

		// After thumb loads, preload medium
		if (options.mediumUrl && options.mediumUrl !== options.thumbUrl) {
			await this.preloadSingleImage(options.mediumUrl);

			// Upgrade to medium when visible
			if (this.shouldUpgradeTier(options.currentTier, "medium")) {
				await this.loadImage(options.mediumUrl);
				options.onTierChange?.("medium");

				// After medium loads, preload full
				if (options.fullUrl && options.fullUrl !== options.mediumUrl) {
					await this.preloadSingleImage(options.fullUrl);

					// Upgrade to full when image is focused or user interacts
					if (this.shouldUpgradeTier(options.currentTier, "full")) {
						await this.loadImage(options.fullUrl);
						options.onTierChange?.("full");
					}
				}
			}
		}
	}

	private shouldUpgradeTier(
		current: "thumb" | "medium" | "full",
		target: "thumb" | "medium" | "full",
	): boolean {
		const tierPriority = { thumb: 1, medium: 2, full: 3 };
		return tierPriority[target] > tierPriority[current];
	}

	/**
	 * Create a progressive image URL generator
	 */
	createProgressiveUrls(
		baseUrl: string | ((size: number) => string),
		tiers: { thumb: number; medium: number; full: number } = {
			thumb: 128,
			medium: 256,
			full: 1024,
		},
	): { thumb: string; medium: string; full: string } {
		if (typeof baseUrl === "function") {
			return {
				thumb: baseUrl(tiers.thumb),
				medium: baseUrl(tiers.medium),
				full: baseUrl(tiers.full),
			};
		}

		// Extract size parameter from URL or add it
		const url = new URL(baseUrl);
		return {
			thumb: this.updateUrlSize(url, tiers.thumb),
			medium: this.updateUrlSize(url, tiers.medium),
			full: this.updateUrlSize(url, tiers.full),
		};
	}

	private updateUrlSize(url: URL, size: number): string {
		url.searchParams.set("size", size.toString());
		return url.toString();
	}

	/**
	 * Cleanup when service is destroyed
	 */
	destroy() {
		if (this.intersectionObserver) {
			this.intersectionObserver.disconnect();
			this.intersectionObserver = null;
		}
		this.clearCache();
		this.loadingQueue.clear();
	}
}

// Create singleton instance
export const imageLoadingService = new ImageLoadingService();

// Add CSS for shimmer effect
if (typeof document !== "undefined") {
	const style = document.createElement("style");
	style.textContent = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
	document.head.appendChild(style);
}

export default ImageLoadingService;
