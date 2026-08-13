import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Activate every published build immediately and take control of open tabs.
// The precache activation step removes assets from older releases.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(Promise.all([
  self.clients.claim(),
  // Remove caches created by the retired Expo-era worker. The current PWA
  // intentionally owns only Workbox's versioned precache.
  caches.keys().then((names) => Promise.all(
    names.filter((name) => !name.startsWith('workbox-precache')).map((name) => caches.delete(name)),
  )),
])));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json?.() || {}; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title || 'Ardent', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || (data.groupId ? `group-${data.groupId}` : 'ardent'),
    renotify: true,
    data: { url: data.url || '/', groupId: data.groupId || null },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin);
  if (event.notification.data?.groupId) url.searchParams.set('group', event.notification.data.groupId);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('navigate' in client) await client.navigate(url.href);
      if ('focus' in client) return client.focus();
    }
    return self.clients.openWindow?.(url.href);
  })());
});
