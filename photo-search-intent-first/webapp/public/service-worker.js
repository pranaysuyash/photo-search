// Service Worker for PhotoVault PWA
// Implements offline-first caching strategy with network fallback

const CACHE_NAME = "photovault-v1.0.0";
const RUNTIME_CACHE = "photovault-runtime";
const IMAGE_CACHE = "photovault-images";
const _PHOTO_CACHE = "photovault-photos-v1";
const _METADATA_CACHE = "photovault-metadata-v1";

// Core assets to cache on install
const STATIC_ASSETS = [
	"/",
	"/index.html",
	"/manifest.json",
	"/favicon.ico",
  "/icons/icon-192x192.svg",
	"/icons/icon-512x512.svg",
];

// API endpoints to cache with network-first strategy
const _API_CACHE_PATTERNS = [
	"/api/metadata",
	"/api/collections",
	"/api/saved",
	"/api/tags",
	"/api/clusters",
	"/api/thumb",
	"/api/media",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				console.log("[SW] Caching static assets");
				return cache.addAll(STATIC_ASSETS);
			})
			.then(() => {
				console.log("[SW] Static assets cached, skipping waiting");
				return self.skipWaiting();
			}),
	);
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((cacheName) => {
							return (
								cacheName.startsWith("photovault-") &&
								cacheName !== CACHE_NAME &&
								cacheName !== RUNTIME_CACHE &&
								cacheName !== IMAGE_CACHE
							);
						})
						.map((cacheName) => {
							console.log("[SW] Deleting old cache:", cacheName);
							return caches.delete(cacheName);
						}),
				);
			})
			.then(() => {
				console.log("[SW] Claiming clients");
				return self.clients.claim();
			}),
	);
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests
	if (request.method !== "GET") {
		return;
	}

	// Handle photo/thumbnail requests with enhanced caching
	if (
		url.pathname.startsWith("/api/thumb/") ||
		url.pathname.startsWith("/api/media/")
	) {
		event.respondWith(photoCacheStrategy(request));
		return;
	}

	// Handle API requests with network-first strategy
	if (url.pathname.startsWith("/api/")) {
		event.respondWith(networkFirstStrategy(request, RUNTIME_CACHE));
		return;
	}

	// Handle image requests with cache-first strategy
	if (
		request.destination === "image" ||
		/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)
	) {
		event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
		return;
	}

	// Handle static assets with cache-first strategy
	if (
		STATIC_ASSETS.includes(url.pathname) ||
		url.pathname.endsWith(".js") ||
		url.pathname.endsWith(".css")
	) {
		event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
		return;
	}

	// Default to network-first for everything else
	event.respondWith(networkFirstStrategy(request, RUNTIME_CACHE));
});

// Cache-first strategy (offline-first)
async function cacheFirstStrategy(request, cacheName) {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);

	if (cached) {
		// Return cached version and update cache in background
		fetchAndCache(request, cache);
		return cached;
	}

	try {
		const response = await fetch(request);
		if (response.ok) {
			cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		console.error("[SW] Fetch failed:", error);
		// Return offline fallback if available
		return (
			caches.match("/offline.html") || new Response("Offline", { status: 503 })
		);
	}
}

// Network-first strategy (online-first with fallback)
async function networkFirstStrategy(request, cacheName) {
	const cache = await caches.open(cacheName);

	try {
		const response = await fetch(request);
		if (response.ok) {
			// Cache successful responses
			cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		// Network failed, try cache
		const cached = await cache.match(request);
		if (cached) {
			return cached;
		}

		// No cache available, return error
		console.error("[SW] Network and cache failed:", error);
		return new Response(
			JSON.stringify({ error: "Offline - no cached data available" }),
			{
				status: 503,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}

// Photo cache strategy with smart caching
async function photoCacheStrategy(request) {
	const url = new URL(request.url);
	const isThumbnail = url.pathname.startsWith("/api/thumb/");
	const cacheName = isThumbnail ? "photovault-thumbnails" : "photovault-photos";

	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);

	if (cached) {
		// Return cached version and update in background if online
		if (navigator.onLine) {
			fetchAndCache(request, cache);
		}
		return cached;
	}

	try {
		const response = await fetch(request);
		if (response.ok) {
			// Cache the response
			cache.put(request, response.clone());

			// For thumbnails, also create a lower quality version for offline use
			if (isThumbnail) {
				try {
					const blob = await response.clone().blob();
					const lowQualityUrl = request.url.replace("size=400", "size=200");
					const lowQualityResponse = new Response(blob, {
						headers: {
							"Content-Type": response.headers.get("Content-Type"),
							"Cache-Control": "public, max-age=31536000",
						},
					});
					cache.put(lowQualityUrl, lowQualityResponse);
				} catch (error) {
					console.log("[SW] Failed to create low quality thumbnail:", error);
				}
			}
		}
		return response;
	} catch (error) {
		console.error("[SW] Photo fetch failed:", error);

		// Try to return a lower quality version if available
		if (isThumbnail) {
			const lowQualityUrl = request.url.replace("size=400", "size=200");
			const lowQualityCached = await cache.match(lowQualityUrl);
			if (lowQualityCached) {
				return lowQualityCached;
			}
		}

		// Return offline placeholder
		return new Response(
			'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f3f4f6"/><text x="200" y="200" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="sans-serif" font-size="16">Photo unavailable offline</text></svg>',
			{
				headers: {
					"Content-Type": "image/svg+xml",
					"Cache-Control": "public, max-age=3600",
				},
			},
		);
	}
}

// Background fetch and cache update
async function fetchAndCache(request, cache) {
	try {
		const response = await fetch(request);
		if (response.ok) {
			cache.put(request, response);
		}
	} catch (_error) {
		// Silent fail - we already returned cached version
	}
}

// Handle background sync for offline actions
self.addEventListener("sync", (event) => {
	if (event.tag === "sync-searches") {
		event.waitUntil(syncSearches());
	} else if (event.tag === "sync-collections") {
		event.waitUntil(syncCollections());
	}
});

// Sync offline searches when back online
async function syncSearches() {
	const cache = await caches.open("offline-queue");
	const requests = await cache.keys();

	for (const request of requests) {
		if (request.url.includes("/api/search")) {
			try {
				await fetch(request);
				await cache.delete(request);
			} catch (_error) {
				console.error("[SW] Sync failed for:", request.url);
			}
		}
	}
}

// Sync offline collection changes
async function syncCollections() {
	const cache = await caches.open("offline-queue");
	const requests = await cache.keys();

	for (const request of requests) {
		if (request.url.includes("/api/collections")) {
			try {
				await fetch(request);
				await cache.delete(request);
			} catch (_error) {
				console.error("[SW] Sync failed for:", request.url);
			}
		}
	}
}

// Handle push notifications
self.addEventListener("push", (event) => {
	const options = {
		body: event.data ? event.data.text() : "New updates available",
        icon: "/icons/icon-512x512.svg",
        badge: "/icons/icon-512x512.svg",
		vibrate: [100, 50, 100],
		data: {
			dateOfArrival: Date.now(),
			primaryKey: 1,
		},
	};

	event.waitUntil(self.registration.showNotification("PhotoVault", options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	event.waitUntil(clients.openWindow("/"));
});
