// Enhanced Service Worker for Al-Aqsa Security Attendance System
const CACHE_NAME = 'al-aqsa-attendance-v2';
const OFFLINE_URL = '/mobile';
const DB_NAME = 'attendance-db';
const DB_VERSION = 1;
const STORE_NAME = 'offline-records';

// Assets to cache for offline use
const ASSETS_TO_CACHE = [
  '/',
  '/mobile',
  '/static/css/style.css',
  '/static/js/main.js',
  '/static/js/autocomplete.js',
  '/static/js/field-connections.js',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png',
  '/static/icons/favicon.ico',
  '/static/icons/apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap'
];

// Installation - Cache core assets and set up IndexedDB
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
  
  event.waitUntil(
    Promise.all([
      // Cache core assets
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('[Service Worker] Caching core app assets...');
          return cache.addAll(ASSETS_TO_CACHE);
        }),
      
      // Set up IndexedDB for offline data storage
      setupIndexedDB()
    ])
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

// Fetch handler with different strategies based on request type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests except for specific API endpoints we want to handle offline
  if (event.request.method !== 'GET' && 
      !(event.request.method === 'POST' && url.pathname === '/api/submit')) {
    return;
  }
  
  // Skip cross-origin requests
  if (!url.origin.startsWith(self.location.origin)) {
    return;
  }
  
  // Special handling for attendance submission POST request
  if (event.request.method === 'POST' && url.pathname === '/api/submit') {
    return event.respondWith(handleAttendanceSubmit(event.request));
  }
  
  // For API GET requests, we use network first but cache successful responses
  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME + '-api')
              .then((cache) => cache.put(event.request, clonedResponse));
          }
          return response;
        })
        .catch(() => {
          // If network fails, try from cache
          return caches.match(event.request);
        })
    );
  }
  
  // For page requests, use cache first for HTML pages
  if (url.pathname === '/' || 
      url.pathname === '/mobile' || 
      url.pathname.endsWith('.html')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Return cached response if available
          if (cachedResponse) {
            // Fetch from network in the background to update cache
            fetch(event.request)
              .then((response) => {
                if (response.ok) {
                  caches.open(CACHE_NAME)
                    .then((cache) => cache.put(event.request, response));
                }
              })
              .catch(() => {/* swallow network errors */});
            
            return cachedResponse;
          }
          
          // If not in cache, try network
          return fetch(event.request)
            .then((response) => {
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              
              // Cache the fetched response
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch(() => {
              // If network fails and no cache, show offline page
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }
  
  // For all other assets (CSS, JS, images), use a cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((response) => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            
            // Cache the fetched response for future
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch((error) => {
            console.error('Fetch failed:', error);
            
            // For image requests, return a placeholder
            if (event.request.destination === 'image') {
              return caches.match('/static/icons/placeholder.png');
            }
            
            // Otherwise, just propagate the error
            throw error;
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

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let title = 'Al-Aqsa Security';
  let options = {
    body: 'New notification from Al-Aqsa Security Attendance system',
    icon: '/static/icons/icon-192x192.png',
    badge: '/static/icons/badge.png'
  };
  
  // Try to parse data if available
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      
      if (data.icon) options.icon = data.icon;
      if (data.badge) options.badge = data.badge;
      if (data.url) options.data = { url: data.url };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event);
  
  event.notification.close();
  
  // Check if there is a URL to open
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    // Otherwise just focus or open the main app
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          if (clientList.length > 0) {
            return clientList[0].focus();
          }
          return clients.openWindow('/');
        })
    );
  }
});

// Setup IndexedDB for offline data storage
function setupIndexedDB() {
  return new Promise((resolve, reject) => {
    if (!indexedDB) {
      console.error('IndexedDB not supported');
      resolve();
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      resolve(); // Resolve anyway to not block SW installation
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store for offline records
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = (event) => {
      console.log('[Service Worker] IndexedDB setup successful');
      resolve();
    };
  });
}

// Handle attendance form submission
async function handleAttendanceSubmit(request) {
  try {
    // Try submitting to the network first
    const response = await fetch(request.clone());
    
    if (response.ok) {
      return response;
    } else {
      throw new Error('Network response was not ok');
    }
  } catch (error) {
    console.log('[Service Worker] Saving attendance record for later submission');
    
    try {
      // Clone the request data
      const data = await request.json();
      
      // Add to IndexedDB for later sync
      await saveOfflineRecord(data);
      
      // Register for background sync
      await self.registration.sync.register('attendance-sync');
      
      // Return a fake successful response
      return new Response(JSON.stringify({
        success: true,
        offline: true,
        message: 'Your attendance has been saved offline and will be submitted when you reconnect.'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (err) {
      console.error('Error handling offline submission:', err);
      
      // Return error response
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to save attendance record offline.'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }
}

// Save offline record to IndexedDB
function saveOfflineRecord(data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      reject(new Error('Error opening IndexedDB'));
    };
    
    request.onsuccess = (event) => {
      try {
        const db = event.target.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        // Add timestamp for when it was saved offline
        const record = {
          ...data,
          offline_timestamp: new Date().toISOString()
        };
        
        const addRequest = store.add(record);
        
        addRequest.onsuccess = () => {
          resolve();
        };
        
        addRequest.onerror = (event) => {
          reject(new Error('Error adding record to IndexedDB'));
        };
        
        tx.oncomplete = () => {
          db.close();
        };
      } catch (err) {
        reject(err);
      }
    };
  });
}

// Get pending records from IndexedDB
function getPendingRecords() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error);
      resolve([]);
    };
    
    request.onsuccess = (event) => {
      try {
        const db = event.target.result;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result);
        };
        
        getAllRequest.onerror = (event) => {
          console.error('Error getting offline records:', event.target.error);
          resolve([]);
        };
        
        tx.oncomplete = () => {
          db.close();
        };
      } catch (err) {
        console.error('Error in getPendingRecords:', err);
        resolve([]);
      }
    };
  });
}

// Remove a synchronized record from IndexedDB
function removePendingRecord(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error);
      resolve();
    };
    
    request.onsuccess = (event) => {
      try {
        const db = event.target.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => {
          resolve();
        };
        
        deleteRequest.onerror = (event) => {
          console.error('Error removing record:', event.target.error);
          resolve();
        };
        
        tx.oncomplete = () => {
          db.close();
        };
      } catch (err) {
        console.error('Error in removePendingRecord:', err);
        resolve();
      }
    };
  });
}

// Sync attendance records saved while offline
async function syncAttendanceRecords() {
  console.log('[Service Worker] Syncing offline attendance records');
  
  try {
    // Get pending records from IndexedDB
    const records = await getPendingRecords();
    
    if (records.length === 0) {
      console.log('[Service Worker] No offline records to sync');
      return;
    }
    
    console.log(`[Service Worker] Found ${records.length} records to sync`);
    
    // Try to send each record
    let syncedCount = 0;
    
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
          syncedCount++;
          
          // Show notification for the first synced record
          if (syncedCount === 1) {
            self.registration.showNotification('Attendance Sync', {
              body: `Successfully synchronized ${records.length} offline attendance record(s).`,
              icon: '/static/icons/icon-192x192.png'
            });
          }
        } else {
          console.error('Error syncing record, server responded with:', response.status);
        }
      } catch (err) {
        console.error('Error syncing record:', err);
      }
    }
    
    console.log(`[Service Worker] Synced ${syncedCount} out of ${records.length} records`);
    
    // If some records failed to sync, register for another sync attempt later
    if (syncedCount < records.length) {
      await self.registration.sync.register('attendance-sync');
    }
    
  } catch (err) {
    console.error('Error in syncAttendanceRecords:', err);
  }
}