// Photo Search PWA Service Worker
// Offline-first app shell with sensible runtime caching for static assets and thumbnails.
// Notes:
// - This SW is generic and doesn't rely on build-time injection; it updates caches opportunistically.
// - Dynamic API JSON is left to the app's Offline services; we focus on shell, JS/CSS, images, and thumbs.

const VERSION = 'v3';
const SHELL_CACHE = `ps-shell-${VERSION}`;
const STATIC_CACHE = `ps-static-${VERSION}`;
const JSON_CACHE = `ps-json-${VERSION}`;
const CACHE_ALLOWLIST = [SHELL_CACHE, STATIC_CACHE, JSON_CACHE];

// Common shell assets; keep minimal since we don't know hashed filenames at build time.
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => void 0)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('ps-') && !CACHE_ALLOWLIST.includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'ps:invalidate-json-cache') {
    event.waitUntil(caches.delete(JSON_CACHE));
  }
});

function isNavigationRequest(event) {
  return event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'));
}

function sameOrigin(url) {
  try {
    const u = new URL(url, self.location.origin);
    return u.origin === self.location.origin;
  } catch {
    return false;
  }
}

// Simple helpers to decide caching strategy
function isStaticAsset(url) {
  return /(\.((css|js|mjs|wasm|map|png|jpg|jpeg|gif|svg|webp|ico|ttf|woff2?)))(\?.*)?$/i.test(url);
}

function isThumb(url) {
  // Cache thumbnails served by the API for offline gallery browsing (incl. faces & video thumbs)
  return /\/(thumb|thumb_face|video\/thumbnail)(\?|$)/.test(url);
}

function isJsonApi(url) {
  // Cache read-only JSON API responses for offline browsing
  // Include nested routes (e.g., /map/clusters, /faces/photos) by allowing '/' after the prefix
  return /\/(library|collections|trips|smart_collections|presets|favorites|tags|saved|metadata|map|faces|ocr|workspace|videos)(\?|\/|$)/.test(url);
}

function isCacheableJson(request) {
  // Only cache GET requests for JSON APIs
  return request.method === 'GET' && request.headers.get('accept')?.includes('application/json');
}

const JSON_TTL_MS = 5 * 60 * 1000;

async function storeJsonResponse(request, response) {
  if (!response || response.status !== 200) return;
  try {
    const cache = await caches.open(JSON_CACHE);
    const headers = new Headers(response.headers);
    headers.set('sw-cache-time', new Date().toISOString());
    const body = await response.clone().blob();
    const cachedResponse = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    await cache.put(request, cachedResponse);
  } catch {
    // Ignore caching errors
  }
}

async function fetchAndStoreJson(request) {
  // nosemgrep: ESLint8_security-node_detect-unhandled-async-errors -- Errors are caught and ignored in caching logic
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      await storeJsonResponse(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return undefined;
  }
}

function isCachedResponseFresh(response) {
  const cachedAt = response.headers.get('sw-cache-time');
  if (!cachedAt) return false;
  const timestamp = Date.parse(cachedAt);
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp < JSON_TTL_MS;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return; // Let POST/PUT etc. pass through

  // App shell navigation: serve cached index.html on failure
  if (isNavigationRequest(event)) {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(request);
          // Optionally update cached index if path is root
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/index.html', net.clone()).catch(() => void 0);
          return net;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cached = await cache.match('/index.html');
          if (cached) return cached;
          // As last resort, try cache match for the exact request
          const any = await caches.match(request);
          return any || new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  const url = request.url;
  if (sameOrigin(url) && (isStaticAsset(url) || isThumb(url))) {
    // Stale-while-revalidate for static and thumbs
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        const fetchAndUpdate = fetch(request)
          .then((resp) => {
            if (resp && resp.status === 200) {
              cache.put(request, resp.clone()).catch(() => void 0);
            }
            return resp;
          })
          .catch(() => undefined);

        return cached || (await fetchAndUpdate) || new Response('Offline', { status: 503, statusText: 'Offline' });
      })()
    );
    return;
  }

  // JSON API caching with TTL
  if (sameOrigin(url) && isJsonApi(url) && isCacheableJson(request)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(JSON_CACHE);
        const cached = await cache.match(request);

        if (cached && isCachedResponseFresh(cached)) {
          event.waitUntil(fetchAndStoreJson(request));
          return cached;
        }

        const networkResponse = await fetchAndStoreJson(request);
        if (networkResponse) {
          return networkResponse;
        }

        if (cached) {
          return cached;
        }

        return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'application/json' }
        });
      })()
    );
    return;
  }

  // Default: network first with fallback to cache
  event.respondWith(
    (async () => {
      try {
        const resp = await fetch(request);
        return resp;
      } catch {
        const cached = await caches.match(request);
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
