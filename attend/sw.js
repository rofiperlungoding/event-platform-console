/* Service Worker — offline-first + background sync */
const CACHE_NAME = 'checkin-v1';
const STATIC_ASSETS = [
  '/attend/scan.html',
  '/attend/manifest.json',
  '/attend/icon-192.svg',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
];

// Install: cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache first, fallback to network
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls: network-first (don't cache)
  if (url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/attendance/') ||
      url.pathname.startsWith('/device/') ||
      url.pathname.startsWith('/sessions/') ||
      url.pathname.startsWith('/health')) {
    return; // let browser handle normally
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    }).catch(() => caches.match('/attend/scan.html'))
  );
});

// Background sync: process queued check-ins
self.addEventListener('sync', e => {
  if (e.tag === 'sync-checkins') {
    e.waitUntil(syncCheckins());
  }
});

async function syncCheckins() {
  // Open IndexedDB and process queue
  const db = await openDB();
  const tx = db.transaction('queue', 'readonly');
  const store = tx.objectStore('queue');
  const items = await getAllFromStore(store);

  for (const item of items) {
    try {
      const r = await fetch(item.url, {
        method: 'POST',
        headers: item.headers,
        body: item.body,
      });
      if (r.ok || r.status === 409) {
        // Success or already checked in — remove from queue
        const dtx = db.transaction('queue', 'readwrite');
        dtx.objectStore('queue').delete(item.id);
      }
      // If server error, leave in queue for next sync
    } catch (e) {
      // Network error, leave in queue
      break;
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('checkin-queue', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('queue', {keyPath: 'id', autoIncrement: true});
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
