// Minimal pass-through service worker. Its only job is to satisfy the
// browser's PWA installability requirement (add to home screen / standalone
// display) — it does not cache or intercept anything.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally not calling event.respondWith — let the browser handle
  // every request normally.
});
