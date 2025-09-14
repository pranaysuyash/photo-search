/**
 * Image Loading Service with intersection observer, caching, and progressive loading
 */

interface ImageLoadingOptions {
	threshold?: number;
	rootMargin?: string;
	quality?: "low" | "medium" | "high";
	enableProgressiveLoading?: boolean;
}

interface CacheEntry {
	blob: Blob;
	url: string;
	timestamp: number;
	size: number;
}

import { handleError } from "../utils/errors";

class ImageLoadingService {
	private intersectionObserver: IntersectionObserver | null = null;
	private imageCache = new Map<string, CacheEntry>();
	private loadingQueue = new Set<string>();
	private maxCacheSize = 100 * 1024 * 1024; // 100MB
	private currentCacheSize = 0;
	private options: Required<ImageLoadingOptions>;

	constructor(options: ImageLoadingOptions = {}) {
		this.options = {
			threshold: options.threshold ?? 0.1,
			rootMargin: options.rootMargin ?? "50px",
			quality: options.quality ?? "medium",
			enableProgressiveLoading: options.enableProgressiveLoading ?? true,
		};

		this.initIntersectionObserver();
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
	private async loadImage(src: string, img: HTMLImageElement) {
		if (this.loadingQueue.has(src)) {
			return;
		}

		// Check cache first
		const cached = this.imageCache.get(src);
		if (cached) {
			this.applyImageToElement(cached.url, img);
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
			};

			this.addToCache(src, entry);
			this.applyImageToElement(objectUrl, img);
        } catch (error) {
            console.warn("Failed to load image:", src, error);
            // Sample to avoid noisy logs on intermittent failures (env-tunable)
            const env: any = (import.meta as unknown as { env?: Record<string, any> })?.env || {};
            const imageSample = Number(env.VITE_IMAGE_ERROR_SAMPLE ?? "0.02"); // default ~2%
            const p = Math.min(1, Math.max(0, isNaN(imageSample) ? 0.02 : imageSample));
            if (Math.random() < p) {
                handleError(error, {
                    logToServer: true,
                    // keep console noise low; warn above already emitted
                    logToConsole: false,
                    context: { action: "image_load", component: "ImageLoadingService.loadImage", metadata: { src } },
                });
            }
            img.style.backgroundColor = "#fee2e2";
            img.alt = "Failed to load";
        } finally {
            this.loadingQueue.delete(src);
        }
    }

	private applyImageToElement(url: string, img: HTMLImageElement) {
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
