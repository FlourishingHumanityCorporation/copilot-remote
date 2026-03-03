/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache all assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// Handle incoming push notifications
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() as { title?: string; body?: string; tag?: string } ?? {};
  const title = data.title ?? 'Copilot Remote';
  const body = data.body ?? 'A session has a new response.';
  const tag = data.tag ?? 'copilot-remote';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag,
    }),
  );
});

// Focus or open the app when a notification is clicked
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow('/');
      }),
  );
});
