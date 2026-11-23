// UltraNautic Hub: opens from the saved copy right away (works offline); a new CACHE name downloads the new version in the background
const CACHE = 'ultranautic-hub-v16';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/hub1-192.png', './icons/hub1-512.png', './icons/hub1-touch.png', './icons/hub1-64.png', './icons/nautic.png', './icons/nauticx.png', './icons/nautic-music.png', './icons/nautic-online.png', './hub/accounts.js', './hub/social.js', './hub/social.css', './hub/sky.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(u); return c.put(u, r); })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('ultranautic-hub-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  const base = new URL('./', self.registration.scope).pathname, p = u.pathname;
  // only the hub's own files; the apps in nautic/, music/ and nauticx/ have their own offline helpers
  if (req.method !== 'GET' || u.origin !== location.origin || !p.startsWith(base) || p.startsWith(base + 'nautic/') || p.startsWith(base + 'music/') || p.startsWith(base + 'nauticx/') || p.endsWith('/sw.js')) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true });
    if (hit) return hit;
    try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; } catch (er) { return (await c.match('./index.html')) || Response.error(); }
  }));
});
