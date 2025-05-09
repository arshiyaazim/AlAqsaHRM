// Al-Aqsa Security - Advanced Service Worker for Field Attendance Tracker
// Version: 2.0.0

const CACHE_NAME = 'al-aqsa-field-attendance-v2';
const DATA_CACHE_NAME = 'al-aqsa-data-v2';

// Assets to cache immediately when service worker is installed
const STATIC_CACHE_URLS = [
  '/',
  '/mobile_app',
  '/static/css/bootstrap.min.css',
  '/static/css/bootstrap-icons.css',
  '/static/js/bootstrap.bundle.min.js',
  '/static/js/jquery-3.6.0.min.js',
  '/static/js/app.js',
  '/static/js/offline.js',
  '/static/images/logo.png',
  '/static/images/offline.svg',
  '/static/manifest.json',
  '/static/favicon.ico',
  '/offline'
];

// Installation event - cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching static files');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch(error => {
        console.error('[Service Worker] Cache installation failed:', error);
      })
  );
});

// Activation event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Take control of uncontrolled clients immediately
  event.waitUntil(clients.claim());
  
  // Remove old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Helper function to determine if a request is an API call
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Helper function to determine if a request is for a page
function isHtmlRequest(request) {
  return request.headers.get('Accept').includes('text/html');
}

// Helper function to determine if we're online
function isOnline() {
  return navigator.onLine;
}

// Handle fetch events - implement the caching strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle API requests - Network with cache fallback
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response before using it
          const clonedResponse = response.clone();
          
          // Open the data cache and store the new response
          caches.open(DATA_CACHE_NAME)
            .then(cache => {
              cache.put(event.request, clonedResponse);
            });
          
          return response;
        })
        .catch(error => {
          console.log('[Service Worker] API Network request failed, trying cache', error);
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For HTML page requests - Network-first with offline fallback strategy
  if (isHtmlRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => {
              // If we have a cached version, return it
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // Otherwise return the offline page for HTML requests
              return caches.match('/offline');
            });
        })
    );
    return;
  }
  
  // For all other requests - Cache first, falling back to network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise try to fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Clone the response before returning it
            const responseToCache = response.clone();
            
            // Add the new response to the cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch failed:', error);
            
            // Special handling for image requests when offline
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/static/images/offline.svg');
            }
          });
      })
  );
});

// Background sync for storing attendance records when offline
self.addEventListener('sync', event => {
  if (event.tag === 'sync-attendance') {
    console.log('[Service Worker] Syncing attendance records...');
    event.waitUntil(syncAttendanceRecords());
  }
});

// Function to sync attendance records saved while offline
async function syncAttendanceRecords() {
  try {
    // Open the IndexedDB database
    const db = await openDatabase();
    
    // Get all unsynced records
    const records = await getUnsyncedRecords(db);
    
    if (records.length === 0) {
      console.log('[Service Worker] No records to sync');
      return;
    }
    
    console.log(`[Service Worker] Syncing ${records.length} attendance records`);
    
    // Process each record
    const syncPromises = records.map(async record => {
      try {
        // Try to send the record to the server
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(record.data)
        });
        
        if (response.ok) {
          // Mark record as synced
          await markRecordAsSynced(db, record.id);
          console.log(`[Service Worker] Successfully synced record ${record.id}`);
          return true;
        } else {
          console.error(`[Service Worker] Server rejected record ${record.id}`);
          return false;
        }
      } catch (error) {
        console.error(`[Service Worker] Failed to sync record ${record.id}:`, error);
        return false;
      }
    });
    
    // Wait for all sync attempts
    const results = await Promise.all(syncPromises);
    
    // Count successful syncs
    const successCount = results.filter(result => result).length;
    console.log(`[Service Worker] Sync completed. ${successCount}/${records.length} records synced successfully.`);
    
    // If any records failed to sync, schedule another sync attempt
    if (successCount < records.length) {
      await self.registration.sync.register('sync-attendance');
    }
  } catch (error) {
    console.error('[Service Worker] Error syncing attendance records:', error);
  }
}

// Helper function to open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('al-aqsa-attendance', 1);
    
    request.onerror = event => {
      reject('Failed to open database');
    };
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create object store for offline attendance records
      if (!db.objectStoreNames.contains('attendance')) {
        const store = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Helper function to get unsynced records
function getUnsyncedRecords(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['attendance'], 'readonly');
    const store = transaction.objectStore('attendance');
    const index = store.index('synced');
    const query = index.getAll(0); // Get all records where synced = 0
    
    query.onsuccess = event => {
      resolve(event.target.result);
    };
    
    query.onerror = event => {
      reject('Failed to get unsynced records');
    };
  });
}

// Helper function to mark a record as synced
function markRecordAsSynced(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['attendance'], 'readwrite');
    const store = transaction.objectStore('attendance');
    const request = store.get(id);
    
    request.onsuccess = event => {
      const record = event.target.result;
      if (record) {
        record.synced = 1;
        const updateRequest = store.put(record);
        
        updateRequest.onsuccess = () => {
          resolve();
        };
        
        updateRequest.onerror = () => {
          reject('Failed to update record');
        };
      } else {
        reject('Record not found');
      }
    };
    
    request.onerror = () => {
      reject('Failed to get record');
    };
  });
}

// Listen for push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification received', event);
  
  let notification = {
    title: 'Al-Aqsa Security',
    body: 'New notification',
    icon: '/static/images/logo.png',
    badge: '/static/images/badge.png',
    data: {
      url: '/'
    }
  };
  
  try {
    if (event.data) {
      notification = { ...notification, ...JSON.parse(event.data.text()) };
    }
  } catch (e) {
    console.error('[Service Worker] Failed to parse push data', e);
  }
  
  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      data: notification.data
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked', event);
  
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        // Check if there is already a window focused
        for (let client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Log service worker lifecycle for debugging
console.log('[Service Worker] Service Worker registered successfully');