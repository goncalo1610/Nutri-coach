// NUTRI+ Coach — Service Worker
// ⚡ Bump CACHE_VERSION à chaque modif majeure de l'app pour forcer un refresh client
const CACHE_VERSION = '2026-04-26-precision-v1'; // ajout: portion slider + Katch-McArdle + prompt Gemini v2
const CACHE_NAME = 'nutri-coach-' + CACHE_VERSION;

// ── Installation ──
self.addEventListener('install', event => {
    console.log('[SW] Install — cache:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll([
                '/Nutri-coach/',
                '/Nutri-coach/index.html',
                '/Nutri-coach/manifest.json',
            ]))
            .catch(() => {})
    );
    self.skipWaiting();
});

// ── Activation : supprimer les ANCIENS caches ──
self.addEventListener('activate', event => {
    console.log('[SW] Activate — nettoyage anciens caches');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k.startsWith('nutri-coach-') && k !== CACHE_NAME)
                    .map(k => {
                        console.log('[SW] Suppression ancien cache:', k);
                        return caches.delete(k);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch : Network-first pour HTML, cache-first pour assets ──
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isHTML = event.request.headers.get('accept')?.includes('text/html');
    const isLocal = url.origin === self.location.origin;

    // Pour les pages HTML → toujours network en premier (garantit la dernière version)
    if (isHTML && isLocal) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Pour les autres assets → cache-first
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request)
                .then(response => {
                    if (response.ok && isLocal) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
            )
    );
});

// ── Message depuis l'app : forcer la mise à jour ──
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ── Clic sur une notification → ouvre l'app sur la bonne section ──
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const data = event.notification.data || {};
    const section = data.section || 'view-home';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes('/Nutri-coach') && 'focus' in client) {
                    client.focus();
                    client.postMessage({ type: 'NAVIGATE', section });
                    return;
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/Nutri-coach/?notif=' + section);
            }
        })
    );
});
