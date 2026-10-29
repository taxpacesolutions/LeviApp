// Home Kingdom service worker: makes the app open fast and lets you look at
// the last loaded data while offline. Database calls are never cached here.
const CACHE = "hk-v4";
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

// Push notifications (only important things; the server decides what to send).
self.addEventListener("push", (event) => {
  let msg = { title: "Home Kingdom", body: "", url: "/" };
  try { msg = { ...msg, ...event.data.json() }; } catch { /* plain text or empty */ }
  event.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: msg.url },
      tag: msg.url,
    }),
  );
});

// Tapping a notification opens (or focuses) the app on the right screen.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => w.url.startsWith(self.location.origin));
      if (win) return win.focus().then((w) => (w && "navigate" in w ? w.navigate(url) : undefined));
      return self.clients.openWindow(url);
    }),
  );
});
