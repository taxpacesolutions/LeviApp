// Home Kingdom service worker: makes the app open fast and lets you look at
// the last loaded data while offline. Database calls are never cached here.
const CACHE = "hk-v3";
const SHELL = ["/manifest.webmanifest", "/icon.svg", "/icon-192.png"];

// Cache index.html plus every built file it references, so the app opens offline.
async function cacheApp(html) {
  const cache = await caches.open(CACHE);
  const text = html ?? (await (await fetch("/index.html", { cache: "no-cache" })).text());
  await cache.put("/index.html", new Response(text, { headers: { "Content-Type": "text/html" } }));
  const assets = [...text.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await Promise.all(assets.map((a) => cache.match(a, { ignoreVary: true }).then((hit) => hit || cache.add(a)).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => cacheApp()).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Pages: network first so updates arrive; fall back to the cached app.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) res.clone().text().then((html) => cacheApp(html)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/index.html", { ignoreVary: true })),
    );
    return;
  }

  // Built files have unique names, so a cached copy is always correct.
  event.respondWith(
    caches.match(req, { ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
