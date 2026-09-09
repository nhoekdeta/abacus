/* Offline cache for Peanick & Ponita Playground. Bump CACHE when files change. */
const CACHE = "peanick-ponita-v12";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/i18n.js",
  "./js/speech.js",
  "./js/bgfx.js",
  "./js/audio.js",
  "./js/music.js",
  "./js/storage.js",
  "./js/abacus.js",
  "./js/games.js",
  "./js/lessons.js",
  "./js/pet.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
