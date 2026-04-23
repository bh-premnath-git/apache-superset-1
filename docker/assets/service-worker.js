// No-op service worker. The Superset 6.x front-end registers
// /static/service-worker.js unconditionally (PWA scaffolding), but this
// deployment does not ship the production PWA bundle, which results in a
// 404 at registration time. Providing this stub satisfies the registration
// request without caching or intercepting any traffic so the page behaves
// exactly as if no service worker were installed.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
