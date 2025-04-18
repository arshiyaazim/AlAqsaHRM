// Mobile Service Worker for Al-Aqsa Security Attendance System
const CACHE_NAME = 'al-aqsa-mobile-v1';
const OFFLINE_URL = '/mobile';

// List of assets to cache for offline use
const ASSETS_TO_CACHE = [
  '/mobile',
  '/',
  '/static/css/style.css',
  '/static/js/main.js',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png',
  '/static/icons/apple-touch-icon.png',
  '/static/icons/clockin.png',
  '/static/icons/clockout.png',
  '/static/icons/favicon.ico',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap'
];

// Database names and object stores
const DB_NAME = 'attendance-offline-db';
const ATTENDANCE_STORE = 'offline-attendance';
const EMPLOYEE_STORE = 'employees';
const PROJECT_STORE = 'projects';
const DB_VERSION = 1;

// Install event - Cache core assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing mobile service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app assets for offline use...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating mobile service worker...');
  
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
        // Initialize IndexedDB if needed
        initIndexedDB();
        
        console.log('[Service Worker] Claiming clients...');
        return self.clients.claim();
      })
  );
});

// Fetch event - Network first with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  // API endpoints - handle differently
  if (event.request.url.includes('/api/')) {
    // For API requests that can work offline with IndexedDB
    if (event.request.url.includes('/api/projects') && event.request.method === 'GET') {
      // Try to fetch from network, fallback to IndexedDB for project list
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // Clone the response to store in IndexedDB
            const clonedResponse = response.clone();
            clonedResponse.json().then(projects => {
              storeProjects(projects);
            }).catch(err => console.error('Error storing projects:', err));
            
            return response;
          })
          .catch(() => {
            // If network fetch fails, try to get from IndexedDB
            return getProjectsFromIDB()
              .then(projects => {
                if (projects && projects.length > 0) {
                  return new Response(JSON.stringify(projects), {
                    headers: { 'Content-Type': 'application/json' }
                  });
                } else {
                  return caches.match(OFFLINE_URL);
                }
              });
          })
      );
      return;
    }
    
    // For attendance submission when offline
    if (event.request.url.includes('/api/submit') && event.request.method === 'POST') {
      // Try to send to server, if it fails store locally
      event.respondWith(
        fetch(event.request.clone())
          .then(response => response)
          .catch(error => {
            // If offline, store the request data in IndexedDB
            return event.request.json()
              .then(attendanceData => {
                // Store in IndexedDB
                return storeOfflineAttendance(attendanceData)
                  .then(() => {
                    // Return success response even though we're offline
                    return new Response(JSON.stringify({
                      success: true,
                      offline: true,
                      message: 'Attendance saved offline and will sync when online'
                    }), {
                      headers: { 'Content-Type': 'application/json' }
                    });
                  });
              });
          })
      );
      return;
    }
    
    // For other API requests, just let them fail when offline
    return;
  }
  
  // For non-API requests, use a network-first strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't cache non-success responses
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        // Clone the response for caching
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        
        return response;
      })
      .catch((error) => {
        console.log('[Service Worker] Fetch failed; returning offline page instead.', error);
        
        // Check cache for a match
        return caches.match(event.request)
          .then((cachedResponse) => {
            // Return cached response or offline page
            return cachedResponse || caches.match(OFFLINE_URL);
          });
      })
  );
});

// Background sync for offline attendance submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncOfflineAttendance());
  }
});

// Initialize IndexedDB
function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('[Service Worker] IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      console.log('[Service Worker] IndexedDB opened successfully');
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(ATTENDANCE_STORE)) {
        db.createObjectStore(ATTENDANCE_STORE, { keyPath: 'id' });
        console.log('[Service Worker] Created attendance object store');
      }
      
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
        console.log('[Service Worker] Created projects object store');
      }
      
      if (!db.objectStoreNames.contains(EMPLOYEE_STORE)) {
        db.createObjectStore(EMPLOYEE_STORE, { keyPath: 'id' });
        console.log('[Service Worker] Created employees object store');
      }
    };
  });
}

// Get a connection to IndexedDB
function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      reject('Error opening IndexedDB');
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
}

// Store offline attendance record
function storeOfflineAttendance(attendanceData) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      // Add timestamp if not present
      if (!attendanceData.timestamp) {
        attendanceData.timestamp = new Date().toISOString();
      }
      
      // Add unique ID if not present
      if (!attendanceData.id) {
        attendanceData.id = Date.now().toString();
      }
      
      const transaction = db.transaction([ATTENDANCE_STORE], 'readwrite');
      const store = transaction.objectStore(ATTENDANCE_STORE);
      
      const request = store.add(attendanceData);
      
      request.onsuccess = () => {
        console.log('[Service Worker] Attendance data stored in IndexedDB');
        resolve(attendanceData);
      };
      
      request.onerror = (event) => {
        console.error('[Service Worker] Error storing attendance data:', event.target.error);
        reject(event.target.error);
      };
    });
  });
}

// Store projects for offline access
function storeProjects(projects) {
  if (!projects || !projects.length) return Promise.resolve();
  
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECT_STORE], 'readwrite');
      const store = transaction.objectStore(PROJECT_STORE);
      
      // Clear existing data
      store.clear();
      
      // Add each project
      projects.forEach(project => {
        store.add(project);
      });
      
      transaction.oncomplete = () => {
        console.log('[Service Worker] Projects stored for offline use');
        resolve();
      };
      
      transaction.onerror = (event) => {
        console.error('[Service Worker] Error storing projects:', event.target.error);
        reject(event.target.error);
      };
    });
  });
}

// Get projects from IndexedDB
function getProjectsFromIDB() {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECT_STORE], 'readonly');
      const store = transaction.objectStore(PROJECT_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('[Service Worker] Error getting projects:', event.target.error);
        reject(event.target.error);
      };
    });
  }).catch(error => {
    console.error('[Service Worker] Failed to get projects from IndexedDB:', error);
    return [];
  });
}

// Get all offline attendance records
function getOfflineAttendanceRecords() {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ATTENDANCE_STORE], 'readonly');
      const store = transaction.objectStore(ATTENDANCE_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('[Service Worker] Error getting offline records:', event.target.error);
        reject(event.target.error);
      };
    });
  }).catch(error => {
    console.error('[Service Worker] Failed to get offline attendance records:', error);
    return [];
  });
}

// Delete an offline attendance record
function deleteOfflineAttendanceRecord(id) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ATTENDANCE_STORE], 'readwrite');
      const store = transaction.objectStore(ATTENDANCE_STORE);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  });
}

// Sync offline attendance records when back online
async function syncOfflineAttendance() {
  try {
    const records = await getOfflineAttendanceRecords();
    
    if (records.length === 0) {
      console.log('[Service Worker] No offline records to sync');
      return;
    }
    
    console.log(`[Service Worker] Syncing ${records.length} offline attendance records`);
    
    // Process each record
    for (const record of records) {
      try {
        // Try to submit to server
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(record)
        });
        
        if (response.ok) {
          console.log(`[Service Worker] Successfully synced record: ${record.id}`);
          
          // Delete from local storage
          await deleteOfflineAttendanceRecord(record.id);
          
          // Show notification
          await self.registration.showNotification('Attendance Synced', {
            body: `Your ${record.action.toLowerCase()} attendance record has been synchronized.`,
            icon: '/static/icons/icon-192x192.png',
            badge: '/static/icons/icon-72x72.png',
            timestamp: new Date().getTime()
          });
        } else {
          console.error(`[Service Worker] Failed to sync record: ${record.id}`, await response.text());
        }
      } catch (error) {
        console.error(`[Service Worker] Error syncing record: ${record.id}`, error);
      }
    }
    
    // Check if any records remain
    const remainingRecords = await getOfflineAttendanceRecords();
    if (remainingRecords.length > 0) {
      console.log(`[Service Worker] ${remainingRecords.length} records still need syncing`);
    } else {
      console.log('[Service Worker] All offline records synced successfully');
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}