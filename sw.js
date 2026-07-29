// sw.js
//
// Service Worker fürs Aufmaß-Tool (PWA).
//
// Strategie: "Network First, Cache Fallback" – die App versucht immer
// zuerst, aktuelle Dateien aus dem Netz zu laden (wichtig, damit du beim
// Weiterentwickeln nicht versehentlich eine alte, gecachte Version siehst).
// Nur wenn kein Netz verfügbar ist (offline), wird auf die zuletzt
// erfolgreich geladene Version aus dem Cache zurückgegriffen.
//
// Der Cache-Name (CACHE_VERSION) sollte hochgezählt werden, wenn du
// größere Änderungen machst, damit alte Caches sauber ersetzt werden.

const CACHE_VERSION = 'aufmass-tool-v1';

// Kern-Dateien, die beim ersten Besuch direkt vorab gecacht werden,
// damit die App auch offline zumindest startet.
const CORE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './js/main.js',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_VERSION)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Nur GET-Requests behandeln (POST/PUT etc. unverändert durchlassen)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Erfolgreiche Antwort zusätzlich im Cache ablegen,
                // damit sie später offline verfügbar ist.
                const responseClone = networkResponse.clone();
                caches.open(CACHE_VERSION).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                // Kein Netz -> aus dem Cache bedienen, falls vorhanden
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('./index.html');
                });
            })
    );
});
