const ADMIN_CACHE = "admin-pwa-v1";
const ADMIN_ASSETS = [
  "/login.html",
  "/index.html",
  "/defects.html",
  "/approvals.html",
  "/categories.html",
  "/dashboard.html",
  "/styles.css",
  "/common.js",
  "/index.js",
  "/defects.js",
  "/approvals.js",
  "/categories.js",
  "/dashboard.js",
  "/fleetNumbers.js",
  "/defectCategories.js",
  "/dvsaClientGuidance.js",
  "/images/logo.png",
  "/images/admin-app-icon-192.png",
  "/images/admin-app-icon-512.png",
  "/images/admin-apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ADMIN_CACHE).then((cache) => cache.addAll(ADMIN_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== ADMIN_CACHE).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseClone = response.clone();
        caches.open(ADMIN_CACHE).then((cache) => cache.put(request, responseClone));
        return response;
      });
    })
  );
});
