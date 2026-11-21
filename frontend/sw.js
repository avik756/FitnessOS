/* Deliberately cache only the public offline notice and icons. No account data,
   API responses, authenticated HTML, photos, or exports enter Cache Storage. */
const CACHE = 'fitnessos-public-v1';
const PUBLIC = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC)));
  // Let existing tabs finish naturally; never force-reload an editor for an update.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('fitnessos-public-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/login')) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  } else if (PUBLIC.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
