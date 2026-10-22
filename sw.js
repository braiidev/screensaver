const CACHE_NAME = "weatherapp-v1.1.0";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./assets/img/icon.png",
  "./assets/img/icon-192.png",
  "./assets/img/icon-512.png",
  "./assets/img/apple-touch-icon.png",
  "./src/styles/index.css",
  "./src/styles/tokens.css",
  "./src/styles/reset.css",
  "./src/styles/layout.css",
  "./src/styles/clock.css",
  "./src/styles/card.css",
  "./src/styles/forecast.css",
  "./src/styles/cities.css",
  "./src/styles/states.css",
  "./src/config.js",
  "./src/main.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.destination === "image" && url.pathname.includes("assets/img/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
    return;
  }

  if (url.pathname.startsWith("./src/") || url.pathname === "./" || url.pathname === "./index.html") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
