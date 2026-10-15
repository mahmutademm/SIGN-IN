// Keeps the kiosk and Who's Out shells on the device so the apps open even if the Wi-Fi drops.
// Network first, so a new deploy shows up on the next load; the cached copy is only the fallback.
// Supabase requests are never cached: sign-ins always go to the server.
const CACHE = "restroom-v1";
const SHELL = [
  "./",
  "index.html",
  "config.js",
  "manifest.webmanifest",
  "assets/theme.css",
  "assets/edep-logo.png",
  "assets/edep-logo-light.png",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/icon-192.png",
  // Who's Out (teacher app) and the log it links to
  "out.html",
  "teacher.html",
  "teacher.webmanifest",
  "assets/teacher.css",
  "assets/teacher.js",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  const font = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (req.method !== "GET" || (url.origin !== location.origin && !font)) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
