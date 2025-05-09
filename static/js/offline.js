/**
 * Al-Aqsa Security Field Attendance Tracker
 * Offline functionality handler
 * Version: 2.0.0
 */

(function() {
  'use strict';
  
  // Offline data store using IndexedDB
  const dbPromise = initDatabase();
  
  // Status elements on the page
  let offlineStatusElement = null;
  let onlineStatusElement = null;
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI elements
    initUI();
    
    // Set up event listeners for online/offline events
    setupEventListeners();
    
    // Check if attendance form exists and initialize it
    if (document.getElementById('attendanceForm')) {
      initAttendanceForm();
    }
    
    // Handle offline records if we have any
    checkForOfflineRecords();
    
    // Register service worker if browser supports it
    registerServiceWorker();
  });
  
  /**
   * Initialize the IndexedDB database
   */
  function initDatabase() {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported');
      return Promise.reject('IndexedDB not supported');
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('al-aqsa-attendance', 1);
      
      request.onerror = event => {
        console.error('IndexedDB error:', event.target.error);
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
  
  /**
   * Initialize UI elements for online/offline status
   */
  function initUI() {
    // Find status elements in the DOM
    offlineStatusElement = document.getElementById('offlineStatus');
    onlineStatusElement = document.getElementById('onlineStatus');
    
    // Hide/show based on current network status
    updateUIForNetworkStatus();
  }
  
  /**
   * Set up event listeners for online/offline events
   */
  function setupEventListeners() {
    // Network status change listeners
    window.addEventListener('online', () => {
      console.log('App is online');
      updateUIForNetworkStatus();
      syncOfflineRecords();
    });
    
    window.addEventListener('offline', () => {
      console.log('App is offline');
      updateUIForNetworkStatus();
    });
  }
  
  /**
   * Update the UI based on current network status
   */
  function updateUIForNetworkStatus() {
    const isOnline = navigator.onLine;
    
    // Update status elements if they exist
    if (offlineStatusElement) {
      offlineStatusElement.style.display = isOnline ? 'none' : 'block';
    }
    
    if (onlineStatusElement) {
      onlineStatusElement.style.display = isOnline ? 'block' : 'none';
    }
    
    // Add/remove offline class from body
    if (isOnline) {
      document.body.classList.remove('offline-mode');
    } else {
      document.body.classList.add('offline-mode');
    }
    
    // Update submit buttons
    const submitBtns = document.querySelectorAll('.submit-btn');
    submitBtns.forEach(btn => {
      if (isOnline) {
        btn.textContent = 'Submit';
      } else {
        btn.textContent = 'Save Offline';
      }
    });
  }
  
  /**
   * Initialize the attendance form for offline support
   */
  function initAttendanceForm() {
    const form = document.getElementById('attendanceForm');
    
    form.addEventListener('submit', event => {
      // If offline, store the form data and don't submit
      if (!navigator.onLine) {
        event.preventDefault();
        
        // Get form data
        const formData = new FormData(form);
        const formDataObj = {};
        
        formData.forEach((value, key) => {
          formDataObj[key] = value;
        });
        
        // Add timestamp
        formDataObj.timestamp = new Date().toISOString();
        
        // Store in IndexedDB
        storeOfflineRecord(formDataObj)
          .then(() => {
            showMessage('Record saved for offline submission. It will be uploaded when you are back online.', 'success');
            form.reset();
          })
          .catch(error => {
            showMessage('Failed to save record offline: ' + error, 'danger');
          });
      }
    });
  }
  
  /**
   * Store an attendance record for offline use
   */
  function storeOfflineRecord(data) {
    return dbPromise.then(db => {
      const transaction = db.transaction(['attendance'], 'readwrite');
      const store = transaction.objectStore('attendance');
      
      // Add the record with synced=0 (not synced)
      const record = {
        data: data,
        synced: 0,
        timestamp: new Date().toISOString()
      };
      
      return store.add(record);
    });
  }
  
  /**
   * Check for offline records and update the UI
   */
  function checkForOfflineRecords() {
    getUnsyncedRecordsCount()
      .then(count => {
        updateUnsyncedRecordsUI(count);
      })
      .catch(error => {
        console.error('Failed to check offline records:', error);
      });
  }
  
  /**
   * Get the count of unsynced records
   */
  function getUnsyncedRecordsCount() {
    return dbPromise.then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['attendance'], 'readonly');
        const store = transaction.objectStore('attendance');
        const index = store.index('synced');
        const query = index.count(0); // Count all records where synced = 0
        
        query.onsuccess = () => {
          resolve(query.result);
        };
        
        query.onerror = () => {
          reject('Failed to count records');
        };
      });
    });
  }
  
  /**
   * Update the UI to show how many unsynced records exist
   */
  function updateUnsyncedRecordsUI(count) {
    const unsyncedBadge = document.getElementById('unsyncedBadge');
    
    if (unsyncedBadge) {
      if (count > 0) {
        unsyncedBadge.textContent = count;
        unsyncedBadge.style.display = 'inline-block';
      } else {
        unsyncedBadge.style.display = 'none';
      }
    }
  }
  
  /**
   * Sync offline records when we come back online
   */
  function syncOfflineRecords() {
    // Check if we have service worker sync available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then(registration => {
          registration.sync.register('sync-attendance')
            .then(() => {
              console.log('Sync registration successful');
            })
            .catch(error => {
              console.error('Sync registration failed:', error);
              // Fallback: do manual sync
              doManualSync();
            });
        })
        .catch(error => {
          console.error('Service worker not ready:', error);
          // Fallback: do manual sync
          doManualSync();
        });
    } else {
      // No service worker sync support, do manual sync
      doManualSync();
    }
  }
  
  /**
   * Manual sync if service worker sync isn't available
   */
  function doManualSync() {
    dbPromise.then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['attendance'], 'readonly');
        const store = transaction.objectStore('attendance');
        const index = store.index('synced');
        const query = index.getAll(0); // Get all records where synced = 0
        
        query.onsuccess = () => {
          const records = query.result;
          
          if (records.length === 0) {
            resolve();
            return;
          }
          
          console.log(`Manual sync: Found ${records.length} records to sync`);
          
          // Process each record
          const syncPromises = records.map(record => {
            return fetch('/api/submit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(record.data)
            })
            .then(response => {
              if (response.ok) {
                // Mark as synced
                return markRecordAsSynced(db, record.id)
                  .then(() => true);
              } else {
                console.error(`Failed to sync record ${record.id}: Server rejected`);
                return false;
              }
            })
            .catch(error => {
              console.error(`Failed to sync record ${record.id}:`, error);
              return false;
            });
          });
          
          Promise.all(syncPromises)
            .then(results => {
              const successCount = results.filter(r => r).length;
              console.log(`Manual sync completed: ${successCount}/${records.length} records synced`);
              
              // Update UI
              checkForOfflineRecords();
              
              if (successCount > 0) {
                showMessage(`Successfully synced ${successCount} offline records.`, 'success');
              }
              
              resolve();
            })
            .catch(reject);
        };
        
        query.onerror = reject;
      });
    })
    .catch(error => {
      console.error('Manual sync failed:', error);
    });
  }
  
  /**
   * Mark a record as synced
   */
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
  
  /**
   * Register the service worker
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/static/js/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }
  
  /**
   * Show a message to the user
   */
  function showMessage(message, type = 'info') {
    // Check if message container exists, create if it doesn't
    let messageContainer = document.getElementById('messageContainer');
    
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.id = 'messageContainer';
      messageContainer.className = 'message-container';
      document.body.appendChild(messageContainer);
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-dismissible fade show`;
    messageElement.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    messageContainer.appendChild(messageElement);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (messageElement.parentNode === messageContainer) {
        messageContainer.removeChild(messageElement);
      }
    }, 5000);
  }
  
})();