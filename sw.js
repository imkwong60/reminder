// 提醒本本 Service Worker

const CACHE_NAME = "reminder-notebook-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// 處理推送
self.addEventListener("push", (event) => {
  let data = {
    title: "提醒本本 🐻",
    body: "有新的提醒",
    icon: "https://upload.wikimedia.org/wikipedia/commons/1/13/Kumamon.png",
    badge: "https://upload.wikimedia.org/wikipedia/commons/1/13/Kumamon.png",
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
