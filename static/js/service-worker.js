// Service Worker for Al-Aqsa Security Attendance System
const CACHE_NAME = 'al-aqsa-attendance-v1';
const OFFLINE_URL = '/';

const ASSETS_TO_CACHE = [
  '/',
  '/static/css/style.css',
  '/static/js/main.js',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png'
];

// Installation - Cache core assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching core app assets...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activation - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients...');
        return self.clients.claim();
      })
  );
});

// Fetch - Network first strategy with fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  // For API requests, use network only
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If request was successful, clone response for cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Network failure - try to serve from cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If we couldn't serve the request from cache, serve the offline page
            return caches.match(OFFLINE_URL);
          });
      })
  );
});

// Handle background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncAttendanceRecords());
  }
});

// Sync attendance records saved while offline
async function syncAttendanceRecords() {
  try {
    // Get pending records from IndexedDB
    const records = await getPendingRecords();
    
    if (records.length === 0) return;
    
    // Try to send each record
    for (const record of records) {
      try {
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(record)
        });
        
        if (response.ok) {
          // If successful, remove from pending records
          await removePendingRecord(record.id);
          
          // Show notification
          self.registration.showNotification('Attendance Sync', {
            body: 'Your attendance record has been synchronized.',
            icon: '/static/icons/icon-192x192.png'
          });
        }
      } catch (err) {
        console.error('Error syncing record:', err);
      }
    }
  } catch (err) {
    console.error('Error in syncAttendanceRecords:', err);
  }
}

// Placeholder functions for IndexedDB operations
// These would need to be implemented in a real app
function getPendingRecords() {
  // In a real implementation, this would fetch from IndexedDB
  return Promise.resolve([]);
}

function removePendingRecord(id) {
  // In a real implementation, this would remove from IndexedDB
  return Promise.resolve();
}