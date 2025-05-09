/**
 * Field Attendance Tracker - Service Worker
 * 
 * This service worker provides offline capabilities for the Field Attendance Tracker application.
 * It uses Cache Storage API to cache static resources and API responses for offline use.
 * 
 * Features:
 * - Precaches essential static resources on install
 * - Uses a stale-while-revalidate strategy for most resources
 * - Caches API responses for offline use
 * - Provides a custom offline page when offline and not in cache
 * - Syncs offline attendance records when back online
 */

const CACHE_NAME = 'field-attendance-tracker-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/mobile',
  '/mobile_app',
  '/static/css/bootstrap.min.css',
  '/static/css/bootstrap-icons.css',
  '/static/js/bootstrap.bundle.min.js',
  '/static/js/jquery-3.6.0.min.js',
  '/static/js/main.js',
  '/static/js/field-connections.js',
  '/static/js/location.js',
  '/static/js/camera.js',
  '/static/js/offline-storage.js',
  '/static/img/logo.png',
  '/static/img/app-icon-192.png',
  '/static/img/app-icon-512.png',
  '/offline.html',
  '/manifest.json'
];

// API endpoints to cache (GET requests only)
const API_CACHE_URLS = [
  '/api/projects',
  '/api/form-fields'
];

// Install event - precache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Precache static assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Precaching complete');
        return self.skipWaiting(); // Ensure the new service worker activates right away
      })
      .catch(error => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => {
            return cacheName !== CACHE_NAME;
          }).map(cacheName => {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Service Worker activated');
        return self.clients.claim(); // Take control of all clients
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    // For API GET requests that should be cached
    if (request.method === 'GET' && API_CACHE_URLS.some(endpoint => url.pathname.startsWith(endpoint))) {
      event.respondWith(handleApiRequest(request));
    }
    // For other API requests (including POST/PUT attendance records)
    else if (url.pathname === '/api/submit') {
      event.respondWith(handleAttendanceSubmission(request));
    }
    return;
  }
  
  // For non-API requests, use cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          // Resource in cache, return it and fetch update in background (stale-while-revalidate)
          const fetchPromise = fetch(request)
            .then(networkResponse => {
              // Update cache with new response
              if (networkResponse.ok) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(request, networkResponse.clone()));
              }
              return networkResponse;
            })
            .catch(error => {
              console.log('[Service Worker] Network fetch failed:', error);
            });
          
          return response;
        }
        
        // Resource not in cache, fetch from network
        return fetch(request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Clone the response to store in cache and return the original
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Network request failed:', error);
            
            // If HTML page requested, show offline page
            if (request.headers.get('Accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
            
            // Otherwise return error
            return new Response('Network error occurred', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle API GET requests
function handleApiRequest(request) {
  // Network first, falling back to cache
  return fetch(request)
    .then(response => {
      // Clone response for cache
      const responseToCache = response.clone();
      
      caches.open(CACHE_NAME)
        .then(cache => {
          cache.put(request, responseToCache);
        });
      
      return response;
    })
    .catch(error => {
      console.log('[Service Worker] API fetch failed, using cache:', error);
      
      return caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If no cached response, return error response
          return new Response(JSON.stringify({ error: 'Network unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
    });
}

// Handle attendance submission
function handleAttendanceSubmission(request) {
  // Clone the request to read the body
  const requestClone = request.clone();
  
  // Try to send to server
  return fetch(request)
    .then(response => {
      return response;
    })
    .catch(error => {
      // If offline, store the request in IndexedDB for later sync
      console.log('[Service Worker] Attendance submission failed, storing for later:', error);
      
      return requestClone.json()
        .then(data => {
          // Store in IndexedDB for later sync
          return saveAttendanceForLater(data)
            .then(() => {
              // Return success response to user
              return new Response(JSON.stringify({ 
                offline: true, 
                message: 'Attendance recorded offline. Will sync when online.'
              }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
        .catch(error => {
          console.error('Error processing offline attendance:', error);
          return new Response(JSON.stringify({ 
            error: 'Failed to save attendance offline'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        });
    });
}

// IndexedDB functions for offline data storage
const DB_NAME = 'field-attendance-tracker-db';
const DB_VERSION = 1;
const ATTENDANCE_STORE = 'offline-attendance';

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create object store for offline attendance records
      if (!db.objectStoreNames.contains(ATTENDANCE_STORE)) {
        db.createObjectStore(ATTENDANCE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onerror = event => {
      console.error('IndexedDB error:', event.target.error);
      reject('Error opening IndexedDB');
    };
  });
}

// Save attendance record for later sync
function saveAttendanceForLater(data) {
  return openDB()
    .then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(ATTENDANCE_STORE, 'readwrite');
        const store = transaction.objectStore(ATTENDANCE_STORE);
        
        // Add timestamp for sync ordering
        data.timestamp = new Date().toISOString();
        data.synced = false;
        
        const request = store.add(data);
        
        request.onsuccess = event => {
          console.log('[Service Worker] Attendance saved for later sync');
          resolve(event.target.result);
        };
        
        request.onerror = event => {
          console.error('Error storing attendance:', event.target.error);
          reject('Failed to store attendance data');
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      });
    });
}

// Background sync for attendance data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendanceRecords());
  }
});

// Sync all offline attendance records
function syncAttendanceRecords() {
  return openDB()
    .then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(ATTENDANCE_STORE, 'readonly');
        const store = transaction.objectStore(ATTENDANCE_STORE);
        const request = store.getAll();
        
        request.onsuccess = event => {
          const records = event.target.result;
          db.close();
          
          if (records.length === 0) {
            resolve('No offline records to sync');
            return;
          }
          
          console.log(`[Service Worker] Syncing ${records.length} attendance records`);
          
          // Process each record sequentially
          return records.reduce((promiseChain, record) => {
            return promiseChain
              .then(() => syncSingleRecord(record))
              .catch(error => {
                console.error(`Failed to sync record ${record.id}:`, error);
                // Continue with next record
                return Promise.resolve();
              });
          }, Promise.resolve())
            .then(() => {
              console.log('[Service Worker] All records processed');
              resolve('Sync completed');
            });
        };
        
        request.onerror = event => {
          console.error('Error reading offline records:', event.target.error);
          reject('Failed to read offline attendance records');
        };
      });
    });
}

// Sync a single attendance record
function syncSingleRecord(record) {
  return fetch('/api/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(record)
  })
  .then(response => {
    if (response.ok) {
      // Record synced successfully, remove from IndexedDB
      return removeRecord(record.id);
    } else {
      // Server error
      console.error(`Server rejected record ${record.id}:`, response.statusText);
      return Promise.reject(`Server error: ${response.statusText}`);
    }
  });
}

// Remove a synced record from IndexedDB
function removeRecord(id) {
  return openDB()
    .then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(ATTENDANCE_STORE, 'readwrite');
        const store = transaction.objectStore(ATTENDANCE_STORE);
        const request = store.delete(id);
        
        request.onsuccess = event => {
          console.log(`[Service Worker] Record ${id} synced and removed`);
          resolve(true);
        };
        
        request.onerror = event => {
          console.error(`Error removing record ${id}:`, event.target.error);
          reject(`Failed to remove record ${id}`);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      });
    });
}

// Periodic sync for attendance data (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncAttendanceRecords());
  }
});

// Push notification event handler
self.addEventListener('push', event => {
  let notification = {
    title: 'Field Attendance Tracker',
    body: 'New update available',
    icon: '/static/img/app-icon-192.png',
    badge: '/static/img/notification-badge.png',
    tag: 'attendance-notification',
    data: {
      url: '/'
    }
  };
  
  // Try to parse notification data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notification = { ...notification, ...data };
    } catch (error) {
      console.error('Error parsing push notification:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      tag: notification.tag,
      data: notification.data,
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Open App'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    })
  );
});

// Notification click event handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Default action is to open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        const url = event.notification.data?.url || '/';
        
        // Check if a tab is already open
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open a new tab
        return clients.openWindow(url);
      })
  );
});

console.log('[Service Worker] Service Worker registered');