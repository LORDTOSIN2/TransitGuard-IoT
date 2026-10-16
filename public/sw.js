// Service Worker for the TransitGuard PWA dashboard.
//
// Strategy (revised to fix deploy-skew blanks and stale telemetry):
//   * Navigations (the HTML shell): NETWORK-FIRST with `cache: 'reload'` so the newest
//     index.html is always fetched, falling back to the cached shell only when offline.
//     A new deploy ships a new hashed bundle; the fresh shell points at it and the old
//     cached shell can never resurrect a deleted `assets/index-*.js` (HTTP 404 blank app).
//   * Same-origin static assets: stale-while-revalidate. Filenames are content-hashed, so
//     a cached entry is immutable and safe to reuse while the network copy refreshes.
//   * Anything else — Supabase REST/Realtime, Edge Functions, cross-origin fonts/tiles —
//     is NOT intercepted, so live data is never served from the cache.
//
// Bump CACHE_VERSION whenever the caching logic changes; stale caches are purged on
// activate so an updated worker always starts clean.
const CACHE_VERSION = 'v2';
const CACHE_PREFIX = 'transitguard-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// Small assets worth having offline. The HTML shell is cached at runtime by the
// navigation handler instead of being precached, so it is always the freshest copy.
const PRECACHE_ASSETS = ['/manifest.json', '/icon.svg'];
const OFFLINE_FALLBACK = '/';
const OFFLINE_FALLBACK_ALT = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Allow the page to force activation of a waiting worker.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

// Dynamic/API paths that must never be cached even if served same-origin.
function isDynamicPath(pathname) {
  return (
    pathname.startsWith('/rest/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/functions/') ||
    pathname.startsWith('/realtime/')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return; // Supabase, Google Fonts, CARTO tiles → browser default
  if (isDynamicPath(url.pathname)) return;

  // 1. HTML shell — network-first, never serve a stale shell while online.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'reload' })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_FALLBACK, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(OFFLINE_FALLBACK)
            .then((cached) => cached || caches.match(OFFLINE_FALLBACK_ALT))
        )
    );
    return;
  }

  // 2. Static same-origin assets — stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
