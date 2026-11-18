const CACHE_NAME = "new-era-v1";
const PRECACHE_URLS = ["/", "/app", "/manifest.json", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  // Keep AI calls out of the cache. DB calls stay in-worker now (D1),
  // so there's nothing extra to pass through for them.
  return url.hostname === "openrouter.ai";
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)(\?.*)?$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") return;
  if (isApiRequest(url)) return;

  if (event.request.mode === "navigate" || isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        });
        return cached ?? networkFetch;
      }),
    );
  } else {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});
