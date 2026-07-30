/**
 * Service Worker
 * 
 * Provides offline support, caching strategies, and background sync
 * for the StellarVeriphy PWA.
 */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `stellarveriphy-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `stellarveriphy-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `stellarveriphy-images-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/offline',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
];

// Maximum cache sizes
const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_IMAGE_CACHE_SIZE = 30;

// Cache size management
async function limitCacheSize(cacheName, maxSize) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxSize) {
        await cache.delete(keys[0]);
        await limitCacheSize(cacheName, maxSize);
    }
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests (except fonts and images)
    if (url.origin !== self.location.origin &&
        !request.url.includes('fonts.googleapis.com') &&
        !request.url.includes('fonts.gstatic.com') &&
        !request.destination.includes('image')) {
        return;
    }

    // Handle API requests - network only
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ error: 'Offline - API unavailable' }),
                        {
                            headers: { 'Content-Type': 'application/json' },
                            status: 503
                        }
                    );
                })
        );
        return;
    }

    // Handle images - cache first
    if (request.destination === 'image') {
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    return response || fetch(request)
                        .then((fetchResponse) => {
                            return caches.open(IMAGE_CACHE)
                                .then((cache) => {
                                    cache.put(request, fetchResponse.clone());
                                    limitCacheSize(IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE);
                                    return fetchResponse;
                                });
                        });
                })
        );
        return;
    }

    // Handle pages and assets - network first with cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Clone response before caching
                const responseToCache = response.clone();

                // Cache successful responses
                if (response.status === 200) {
                    caches.open(DYNAMIC_CACHE)
                        .then((cache) => {
                            cache.put(request, responseToCache);
                            limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
                        });
                }

                return response;
            })
            .catch(() => {
                // Try cache
                return caches.match(request)
                    .then((response) => {
                        // Return cached response or offline page
                        return response || caches.match('/offline')
                            .then((offlineResponse) => {
                                return offlineResponse || new Response(
                                    '<html><body><h1>Offline</h1><p>No internet connection available.</p></body></html>',
                                    { headers: { 'Content-Type': 'text/html' } }
                                );
                            });
                    });
            })
    );
});

// Background sync event
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-transactions') {
        event.waitUntil(syncTransactions());
    }
});

async function syncTransactions() {
    try {
        // Get pending transactions from IndexedDB
        const db = await openDatabase();
        const transactions = await getPendingTransactions(db);

        // Sync each transaction
        for (const tx of transactions) {
            await fetch('/api/transactions/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tx),
            });
        }

        console.log('[SW] Transactions synced successfully');
    } catch (error) {
        console.error('[SW] Sync failed:', error);
        throw error; // Retry on next sync event
    }
}

// Push notification event
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    const options = {
        body: event.data ? event.data.text() : 'New update available',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'stellarveriphy-notification',
        requireInteraction: false,
        data: event.data ? JSON.parse(event.data.text()) : {},
        actions: [
            {
                action: 'view',
                title: 'View',
                icon: '/icons/action-view.png',
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/icons/action-dismiss.png',
            },
        ],
    };

    event.waitUntil(
        self.registration.showNotification('StellarVeriphy', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});

// Message event - communicate with main thread
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(DYNAMIC_CACHE)
                .then((cache) => cache.addAll(event.data.urls))
        );
    }

    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys()
                .then((cacheNames) => Promise.all(
                    cacheNames.map((name) => caches.delete(name))
                ))
        );
    }
});

// Helper: Open IndexedDB
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('stellarveriphy-db', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pending-transactions')) {
                db.createObjectStore('pending-transactions', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Helper: Get pending transactions
function getPendingTransactions(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pending-transactions'], 'readonly');
        const store = transaction.objectStore('pending-transactions');
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}
