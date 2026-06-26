// Turns the `expo export --platform web` output in dist/ into an installable PWA:
// adds a web manifest, icons (incl. iOS apple-touch-icon), meta tags, and a
// stale-while-revalidate service worker. Run after every web export:
//   npx expo export --platform web --output-dir dist && node scripts/pwa-postbuild.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const DIST = 'dist';
const SRC_ICON = 'assets/icon.png';
const INDIGO = '#4B3F9E';

await fs.mkdir(path.join(DIST, 'icons'), { recursive: true });

// Icons from the app icon (full-bleed indigo, good as maskable + apple-touch).
for (const size of [192, 512, 180]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  await sharp(SRC_ICON).resize(size, size).flatten({ background: INDIGO }).png()
    .toFile(path.join(DIST, 'icons', name));
}

const manifest = {
  name: 'Ardent — Bible Study Journal',
  short_name: 'Ardent',
  description: 'A simple journal for Bible study groups — daily verses, reflections, prayer.',
  start_url: '.',
  scope: '.',
  display: 'standalone',
  orientation: 'portrait',
  background_color: INDIGO,
  theme_color: INDIGO,
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};
await fs.writeFile(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

const sw = `const CACHE = 'ardent-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request);
    const network = fetch(e.request).then((res) => { try { cache.put(e.request, res.clone()); } catch (_) {} return res; }).catch(() => cached);
    return cached || network;
  })());
});

// Web Push: show the notification, and focus/open the app on tap.
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}
  const title = data.title || 'Ardent';
  e.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: { url: data.url || '/' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow('/');
  })());
});
`;
await fs.writeFile(path.join(DIST, 'sw.js'), sw);

const head = `
    <link rel="manifest" href="manifest.webmanifest" />
    <meta name="theme-color" content="${INDIGO}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Ardent" />
    <link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
    <script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}</script>
  </head>`;

const indexPath = path.join(DIST, 'index.html');
let html = await fs.readFile(indexPath, 'utf8');
if (!html.includes('manifest.webmanifest')) {
  html = html.replace('</head>', head);
}
html = html.replace(/<title>.*?<\/title>/, '<title>Ardent — Bible Study Journal</title>');
await fs.writeFile(indexPath, html);

// Bundle the admin dashboard at /admin (gated by the admin password).
await fs.mkdir(path.join(DIST, 'admin'), { recursive: true });
await fs.copyFile('admin/index.html', path.join(DIST, 'admin', 'index.html'));

console.log('PWA assets written to dist/ (manifest, icons, sw.js, meta tags, /admin).');
