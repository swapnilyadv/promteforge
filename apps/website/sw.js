// Offline support for the installed app: the app shell is cached on first visit, so the converter opens
// even without a connection. The converter itself runs on the device, so it needs no network once cached.
const CACHE = 'promptforge-app-v6';
const SHELL = ['./app.html', './try.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // Network first, so an engine update reaches the installed app on its next open; the cache is only the
  // offline fallback, and it is refreshed with every successful load of an app file.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const path = './' + new URL(e.request.url).pathname.split('/').pop();
        if (res.ok && SHELL.includes(path)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || (e.request.mode === 'navigate' ? caches.match('./app.html') : Response.error()))),
  );
});
