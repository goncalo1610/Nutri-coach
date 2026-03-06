// ===== NUTRI+ Coach — Service Worker =====
// Version du cache — à incrémenter à chaque mise à jour importante
const CACHE_NAME = 'nutri-plus-v1';

// Fichiers à mettre en cache pour le mode hors-ligne
const ASSETS_TO_CACHE = [
  '/Nutri-coach/',
  '/Nutri-coach/index.html',
  '/Nutri-coach/manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap'
];

// ===== INSTALLATION : mise en cache des assets statiques =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // On met en cache les fichiers locaux seulement (les externe peuvent échouer)
      return cache.addAll([
        '/Nutri-coach/',
        '/Nutri-coach/index.html',
        '/Nutri-coach/manifest.json'
      ]).catch((err) => {
        console.log('[SW] Certains fichiers non mis en cache:', err);
      });
    })
  );
  // Force l'activation immédiate sans attendre la fermeture des onglets
  self.skipWaiting();
});

// ===== ACTIVATION : nettoyage des anciens caches =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Prend le contrôle immédiatement sur tous les onglets ouverts
  self.clients.claim();
});

// ===== FETCH : stratégie "Network First, Cache Fallback" =====
// → On essaie d'abord le réseau (pour avoir les données fraîches)
// → Si hors-ligne, on sert depuis le cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // On ne touche pas aux appels API (Gemini, Firebase) — toujours en réseau
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('iconify.design')
  ) {
    return; // Laisse passer sans intercepter
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mise en cache de la réponse fraîche (seulement pour les requêtes GET)
        if (event.request.method === 'GET' && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Hors ligne → on cherche dans le cache
        return caches.match(event.request).then((cached) => {
          if (cached) {
            console.log('[SW] Servi depuis le cache:', event.request.url);
            return cached;
          }
          // Si même pas en cache, retourne la page principale (pour la navigation)
          if (event.request.mode === 'navigate') {
            return caches.match('/Nutri-coach/index.html');
          }
        });
      })
  );
});
