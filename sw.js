// Nautic Editor offline support: the app opens from the saved copy right away (works with no internet or a slow hotspot).
// Each new version has a new CACHE name, so the browser downloads it in the background and the app reloads once it is ready.
const CACHE = 'nautic-v31';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/nautic10-192.png', './icons/nautic10-512.png', './icons/nautic10-touch.png', './icons/nautic10-64.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(u); return c.put(u, r); })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (new URL(req.url).pathname.endsWith('/sw.js')) return;
  const nav = req.mode === 'navigate';
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(nav ? './index.html' : req, { ignoreSearch: true });
    if (hit) return hit;
    try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
    catch (err) { return (await caches.match(req, { ignoreSearch: true })) || (await caches.match('./index.html')) || Response.error(); }
  }));
});
