// Offline shell: the app opens with no signal (a parking lot at a client site)
// and shows saved drives. Planning a new drive still needs the network.
// Bump VERSION with every release so phones pick up the new files.
const VERSION = 'tp-0.1.0';
const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/brands.js',
  'js/expenses.js',
  'js/planner.js',
  'js/store.js',
  'js/providers/demo.js',
  'js/providers/google.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Same-origin GETs only: cache first, refreshed in the background. API calls go
// to the Worker's origin and never touch this cache.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
