// StratMarket Institutional Service Worker
// Version: 1.0.0
// Provides offline resiliency, static asset caching, and standalone PWA installability

const CACHE_NAME = "stratmarket-v1-cache";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/chart/all",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable.png",
  "/apple-touch-icon.png",
  "/logo.png"
];

// Install: pre-cache critical shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Pre-caching warning:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for API, candles & market feeds; Stale-While-Revalidate for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always bypass cache for internal signals, auth, websockets, and API calls
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/market-data/") ||
    url.pathname.includes("/candles") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Static assets (_next/static, images, fonts) -> Cache-first with background revalidation
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2|woff|ttf)$/i)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkRes) => {
          if (networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkRes;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Navigation routes (HTML pages) -> Network-first with cache fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const dashboardFallback = await caches.match("/dashboard");
          if (dashboardFallback) return dashboardFallback;
          return caches.match("/");
        })
    );
  }
});
