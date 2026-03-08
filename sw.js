// NUTRI+ Coach — Service Worker v2.0
const CACHE_NAME = 'nutri-coach-v2';
const ASSETS = [
    '/Nutri-coach/',
    '/Nutri-coach/index.html',
    '/Nutri-coach/manifest.json',
];

// ── Installation ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
    );
    self.skipWaiting();
});

// ── Activation ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// ── Fetch (cache-first pour les assets, network pour le reste) ──
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});

// ── Clic sur une notification → ouvre l'app sur la bonne section ──
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const data = event.notification.data || {};
    const section = data.section || 'view-home';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // Si l'app est déjà ouverte → focus + naviguer vers la section
            for (const client of clientList) {
                if (client.url.includes('/Nutri-coach') && 'focus' in client) {
                    client.focus();
                    client.postMessage({ type: 'NAVIGATE', section });
                    return;
                }
            }
            // Sinon → ouvrir l'app
            if (clients.openWindow) {
                return clients.openWindow('/Nutri-coach/?notif=' + section);
            }
        })
    );
});
