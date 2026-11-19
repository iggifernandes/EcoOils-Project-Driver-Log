// Service worker: network-first for the course shell, so updates always arrive.
// Offline, the last copy is served. Audio files are NOT cached here (large, and
// range requests do not mix well with the cache); the browser fetches them directly.
const CACHE_NAME = 'defdrive-shell-v1';
const SHELL_FILES = ['./', './index.html', './content.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(SHELL_FILES)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // fonts etc: browser handles
  if (url.pathname.includes('/audio/')) return;         // audio: browser handles
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
