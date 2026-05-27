// public/sw.js
// Service Worker for chat push notifications.
// Handles click → navigate to the relevant channel.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification click — open or focus the relevant channel tab
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const targetUrl = new URL(url, self.location.origin);

        for (const client of clientList) {
          const clientUrl = new URL(client.url);

          // If the exact URL is already open, just focus it.
          if (clientUrl.href === targetUrl.href && "focus" in client) {
            return client.focus();
          }

          // If the same page is open but with a different query, navigate it.
          if (clientUrl.pathname === targetUrl.pathname && "navigate" in client) {
            return client.navigate(targetUrl.href).then(() => {
              if ("focus" in client) {
                return client.focus();
              }
            });
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl.href);
        }
      })
  );
});
