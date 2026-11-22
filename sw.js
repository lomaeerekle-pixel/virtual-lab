/* Offline cache for the Virtual Lab (PWA). Bump VERSION on every release. */
const VERSION = 'vlab-202611221009';
const ASSETS = [
  "./",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./index.html",
  "./js/app.js",
  "./js/pwa.js",
  "./js/catalog.js",
  "./js/core/codeutil.js",
  "./js/core/router.js",
  "./js/core/store.js",
  "./js/core/util.js",
  "./js/formulas/data-more.js",
  "./js/formulas/data-physics.js",
  "./js/formulas/engine.js",
  "./js/formulas/page.js",
  "./js/pages/admin.js",
  "./js/pages/auth.js",
  "./js/pages/student.js",
  "./js/pages/teacher.js",
  "./js/stem/bridge.js",
  "./js/stem/lab.js",
  "./js/stem/registry.js",
  "./js/stem/sims/astronomy.js",
  "./js/stem/sims/biology.js",
  "./js/stem/sims/biology2.js",
  "./js/stem/sims/chemistry.js",
  "./js/stem/sims/chemistry2.js",
  "./js/stem/sims/earth.js",
  "./js/stem/sims/informatics.js",
  "./js/stem/sims/informatics2.js",
  "./js/stem/sims/math.js",
  "./js/stem/sims/math2.js",
  "./js/stem/sims/math3.js",
  "./js/stem/sims/physics.js",
  "./js/stem/sims/physics2.js",
  "./js/stem/sims/physics3.js",
  "./js/stem/sims/physics4.js",
  "./js/tech/board.js",
  "./js/tech/circuit/editor.js",
  "./js/tech/circuit/model.js",
  "./js/tech/circuit/page.js",
  "./js/tech/circuit/parts-extra.js",
  "./js/tech/circuit/parts.js",
  "./js/tech/circuit/templates-extra.js",
  "./js/tech/circuit/templates.js",
  "./js/tech/engine.js",
  "./js/tech/exercises.js",
  "./js/tech/lab.js",
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // app files: cache first, then network (and refresh the cache)
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone())); return res; }).catch(() => hit || caches.match('./index.html'));
      return hit || net;
    }));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // fonts: network first, cached copy offline
    e.respondWith(fetch(req).then(res => { caches.open(VERSION).then(c => c.put(req, res.clone())); return res; }).catch(() => caches.match(req)));
  }
});
