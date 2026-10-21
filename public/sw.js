const VERSION = 'dev';
const SHELL_CACHE = `brtp-shell-${VERSION}`;
const PAGE_CACHE = 'brtp-pages-v1';
const IMAGE_CACHE = 'brtp-img-v1';
const API_CACHE = 'brtp-api-v1';
const NETWORK_TIMEOUT_MS = 3000;
const MAX_IMAGES = 300;

const SHELL = [
  './',
  'shop/',
  'promotions/',
  'about/',
  'contact/',
  'delivery-returns/',
  'privacy/',
  'terms/',
  'accessibility/',
  'manifest.webmanifest',
  'css/styles.css',
  'fonts/literata-latin.woff2',
  'fonts/outfit-latin.woff2',
  'js/core/api.js',
  'js/core/format.js',
  'js/core/shop.js',
  'js/core/validate.js',
  'js/pages/home.js',
  'js/pages/item.js',
  'js/pages/page.js',
  'js/pages/promotions.js',
  'js/pages/shop.js',
  'js/shared/app.js',
  'js/shared/busy.js',
  'js/shared/dom.js',
  'js/shared/live.js',
  'js/shared/loader.js',
  'js/shared/pwa.js',
  'js/shared/render.js',
  'js/shared/reveal.js',
  'js/shared/shell.js',
  'js/shared/theme-init.js',
  'js/shared/theme.js',
  'js/shared/toast.js',
  'img/brand/mark-96.webp',
  'img/brand/mark-192.webp',
  'img/icons/favicon-32.png',
  'img/icons/favicon-48.png',
  'img/icons/favicon-96.png',
  'img/icons/icon-192.png',
  'img/icons/icon-512.png',
  'img/icons/icon-maskable-512.png',
  'img/icons/apple-touch-icon.png',
];

const SHELL_PATHS = new Set(SHELL.map((path) => new URL(path, self.registration.scope).pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('brtp-shell-') && key !== SHELL_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

const isApi = (url) => /\/v1\/(shop|promotions)$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isApi(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/img/') || url.pathname.includes('/fonts/')) event.respondWith(cacheFirst(request));
  else event.respondWith(networkFirst(request, SHELL_PATHS.has(url.pathname) ? SHELL_CACHE : PAGE_CACHE));
});

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_IMAGES))) await cache.delete(key);
}

async function cacheFirst(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type !== 'opaque') {
    await cache.put(request, response.clone());
    trim(cache);
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const network = fetch(request, { cache: 'no-cache' }).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS, null));
  const fresh = await Promise.race([network.catch(() => null), timeout]);
  if (fresh) return fresh;
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  return network;
}
