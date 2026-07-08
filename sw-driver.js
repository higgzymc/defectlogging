const DRIVER_CACHE = "driver-pwa-v1";
const DRIVER_ASSETS = [
  "/driver-login.html",
  "/driver.html",
  "/styles.css",
  "/driver-auth.js",
  "/driver.js",
  "/common.js",
  "/fleetNumbers.js",
  "/defectCategories.js",
  "/dvsaClientGuidance.js",
  "/images/logo.png",
  "/images/driver-app-icon-192.png",
  "/images/driver-app-icon-512.png",
  "/images/driver-apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(DRIVER_CACHE).then((cache) => cache.addAll(DRIVER_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== DRIVER_CACHE).map((key) => caches.delete(key))
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
        caches.open(DRIVER_CACHE).then((cache) => cache.put(request, responseClone));
        return response;
      });
    })
  );
});
