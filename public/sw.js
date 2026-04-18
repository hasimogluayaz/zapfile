// ZapFile Service Worker
// Cache-first for static assets, network-first for HTML pages

const CACHE_VERSION = 'zapfile-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;

// App shell — precache best-effort (no fail-all if one URL errors)
const APP_SHELL = [
  '/',
  '/tools',
  '/workflows',
  '/privacy',
  '/about',
];

const STATIC_EXTENSIONS = [
  '.js',
  '.css',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
];

function isStaticAsset(url) {
  const pathname = new URL(url).pathname;
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

function isPageRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('accept')?.includes('text/html'))
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        APP_SHELL.map((path) =>
          cache.add(new URL(path, self.location.origin).toString()).catch(() => {})
        )
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== PAGES_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const allowedOrigins = [
    self.location.origin,
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];
  if (!allowedOrigins.some((origin) => request.url.startsWith(origin))) return;

  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isPageRequest(request)) {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZapFile - Offline</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f0f13;color:#e4e4e7}div{text-align:center;max-width:22rem;padding:1.5rem}h1{font-size:1.25rem;margin-bottom:.5rem}p{color:#a1a1aa;font-size:.9rem;line-height:1.5}a{color:#818cf8}</style></head><body><div><h1>You are offline</h1><p>Cached ZapFile pages may still open. Reconnect to load new tools.</p><p><a href="/">Home</a> · <a href="/workflows">Workflows</a></p></div></body></html>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}
