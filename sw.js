// ═══════════════════════════════════════════════════════
//  MELITA COFFE — Service Worker v1.0
//  Estrategia:
//    • assets estáticos → Cache First
//    • páginas HTML     → Network First (con fallback offline)
//    • APIs externas    → Network Only
// ═══════════════════════════════════════════════════════
const CACHE_NAME   = 'melita-coffe-v4';
const OFFLINE_URL  = '/offline/';

// Recursos que se pre-cachean al instalar el SW
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/styles.css',
  '/assets/js/script.js',
  '/manifest.json',
  '/offline/',
  '/assets/img/favicon.ico',
  '/assets/img/logo.png',
  '/assets/img/foto-local.jpg',
  '/assets/img/icons/icon-192.png',
  '/assets/img/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,300&family=Playfair+Display:wght@700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js'
];

// ───────────── INSTALL ─────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Error en pre-caché:', err))
  );
});

// ───────────── ACTIVATE ─────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ───────────── FETCH ─────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones no-GET
  if (request.method !== 'GET') return;

  // Ignorar extensiones de navegador y WhatsApp/tel links
  if (!url.protocol.startsWith('http')) return;

  // APIs externas (wa.me, analytics, etc.) → Network Only
  const externalBypass = ['wa.me', 'google-analytics', 'googletagmanager'];
  if (externalBypass.some(d => url.hostname.includes(d))) return;

  // Fuentes de Google → Cache First (larga duración)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // CDN de AlpineJS → Cache First
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Peticiones de navegación (HTML) → Network First
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNav(request));
    return;
  }

  // Resto de assets estáticos (CSS, JS, imágenes, audio) → Cache First
  event.respondWith(cacheFirst(request));
});

// ───────────── ESTRATEGIAS ─────────────

/**
 * Cache First: busca en caché; si falla, va a la red y guarda la respuesta.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sin conexión y sin caché: no hay fallback específico para assets
    return new Response('', { status: 408 });
  }
}

/**
 * Network First para navegación: intenta la red; si falla, devuelve la
 * página cacheada o la página offline personalizada.
 */
async function networkFirstNav(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback a offline.html
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;

    // Último recurso: respuesta mínima
    return new Response(
      '<h1>Sin conexión</h1><p>Por favor conéctate a internet para usar Melita Coffe.</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// ───────────── PUSH NOTIFICATIONS (futuro) ─────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'Melita Coffe', {
    body: data.body || '¡Tenemos novedades para ti!',
    icon: '/img/icons/icon-192.png',
    badge: '/img/icons/icon-72.png',
    data: { url: data.url || '/' }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
