const PAGE_CACHE = "stemstudio-pages-v3";
const ASSET_CACHE = "stemstudio-assets-v1";
const PRECACHE_URLS = ["/", "/index.html", "/editor.html", "/play.html"];
const CACHEABLE_CODE_EXTENSIONS = [
  ".js",
  ".css",
  ".mjs",
  ".wasm",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then(cache => cache.addAll(PRECACHE_URLS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  const ALLOWED_CACHES = new Set([PAGE_CACHE, ASSET_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then(names => Promise.all(names.filter(n => !ALLOWED_CACHES.has(n)).map(n => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    url.pathname === "/app-version.json" ||
    url.pathname === "/service-worker.js" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/.proxy/") ||
    url.pathname.startsWith("/Upload") ||
    url.pathname.startsWith("/uploads")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    const fallbackUrl = url.pathname.startsWith("/create/")
      ? "/editor.html"
      : url.pathname.startsWith("/play/")
        ? "/play.html"
        : "/index.html";
    event.respondWith(networkFirst(request, PAGE_CACHE, fallbackUrl));
    return;
  }

  const shouldCacheAsset =
    url.pathname.startsWith("/assets/") &&
    CACHEABLE_CODE_EXTENSIONS.some(extension => url.pathname.endsWith(extension));

  if (shouldCacheAsset) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  }
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone()).catch(() => undefined);
    }

    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (fallbackUrl) {
      const fallbackResponse = await cache.match(fallbackUrl);
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }

    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    cache.put(request, response.clone()).catch(() => undefined);
  }

  return response;
}
