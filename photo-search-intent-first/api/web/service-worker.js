// Minimal no-op service worker to avoid 404 in packaged builds
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough fetch; this SW doesn't cache by default
self.addEventListener('fetch', () => {
  // no-op
});

