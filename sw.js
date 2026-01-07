const ASSETS = [
    './',
    './index.html',
    './styles/main.css',
    './styles/components.css',
    './styles/layout.css',
    './js/app.js',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // Focus existing window
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            // Open new if none
            if (clients.openWindow) return clients.openWindow('./index.html');
        })
    );
});
