// 提醒本本 Service Worker — 離線優先

const CACHE_NAME = "reminder-notebook-v3";
const PRECACHE = [
  "./",
  "./index.html",
  "./sw.js",
  "./lib/supabase.js",
  "./icon-192.png",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 逐一加入，避免單一失敗（例如尚未上傳的 icon）拖垮整個 precache
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const res = await fetch(new Request(url, { cache: "reload" }));
            if (res.ok) await cache.put(url, res);
          } catch (err) {
            console.warn("[SW] skip precache", url, err);
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => clients.claim())
  );
});

// 離線優先：同源靜態資源 cache-first；其餘 network-first 並回寫快取
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 只處理同源
  if (url.origin !== self.location.origin) return;

  // HTML 導航：network 優先，失敗用快取（確保離線可開 app）
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match("./index.html").then((r) => r || caches.match("./"))
        )
    );
    return;
  }

  // 其他靜態：cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // 離線且無快取
          return new Response("", { status: 503, statusText: "Offline" });
        });
    })
  );
});

// 處理推送
self.addEventListener("push", (event) => {
  let data = {
    title: "提醒本本 🐻",
    body: "有新的提醒",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "reminder",
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error("Push data parse error", e);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag || "reminder",
    renotify: true,
    requireInteraction: false,
    data: data.data || { url: "/" },
    vibrate: [120, 80, 120],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 點擊通知
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
