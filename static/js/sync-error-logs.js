/**
 * Field Attendance Tracker - Error Log Sync
 * 
 * Provides functionality for synchronizing error logs stored in IndexedDB
 * with the server when coming back online.
 */

// Sync error logs with the server
function syncErrorLogs() {
    if (!navigator.onLine) {
        showToast('You are offline. Error logs will be synced when you reconnect.', 'warning');
        return;
    }
    
    if (!dbPromise) {
        showToast('Error: Database not available', 'error');
        return;
    }
    
    dbPromise.then(db => {
        const transaction = db.transaction([ERROR_STORE], 'readonly');
        const store = transaction.objectStore(ERROR_STORE);
        const request = store.getAll();
        
        request.onsuccess = function() {
            const errorLogs = request.result;
            
            if (errorLogs.length === 0) {
                console.log('No error logs to sync');
                return;
            }
            
            console.log(`Found ${errorLogs.length} error logs to sync`);
            
            // Send all error logs in a single request
            fetch('/api/sync/error-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ errors: errorLogs })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Server returned ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // If successful, remove synced logs from IndexedDB
                    clearSyncedErrorLogs(data.syncedIds);
                    showToast(`${data.syncedCount} error logs synced successfully`, 'success');
                } else {
                    showToast('Error syncing logs: ' + (data.message || 'Unknown error'), 'error');
                }
            })
            .catch(error => {
                showToast('Failed to sync error logs: ' + error.message, 'error');
            });
        };
        
        request.onerror = function(event) {
            console.error('Error reading error logs:', event.target.error);
        };
    }).catch(error => {
        console.error('Database error during error log sync:', error);
    });
}

// Clear synced error logs from IndexedDB
function clearSyncedErrorLogs(syncedIds) {
    if (!syncedIds || !Array.isArray(syncedIds) || syncedIds.length === 0) {
        return;
    }
    
    dbPromise.then(db => {
        const transaction = db.transaction([ERROR_STORE], 'readwrite');
        const store = transaction.objectStore(ERROR_STORE);
        
        syncedIds.forEach(id => {
            store.delete(id);
        });
        
        transaction.oncomplete = function() {
            console.log(`${syncedIds.length} synced error logs cleared from IndexedDB`);
        };
    }).catch(error => {
        console.error('Error clearing synced error logs:', error);
    });
}

// Function to check and sync error logs automatically
function autoSyncErrorLogs() {
    // Only sync if online
    if (navigator.onLine) {
        dbPromise.then(db => {
            const transaction = db.transaction([ERROR_STORE], 'readonly');
            const store = transaction.objectStore(ERROR_STORE);
            const countRequest = store.count();
            
            countRequest.onsuccess = function() {
                const count = countRequest.result;
                if (count > 0) {
                    console.log(`Auto-syncing ${count} error logs`);
                    syncErrorLogs();
                }
            };
        }).catch(error => {
            console.error('Error checking error logs count:', error);
        });
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Check if toast container exists, create if not
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center text-white bg-${type === 'info' ? 'primary' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Create toast content
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Initialize Bootstrap toast
    const bsToast = new bootstrap.Toast(toast, {
        delay: 5000 // Auto-hide after 5 seconds
    });
    
    // Show toast
    bsToast.show();
    
    // Remove from DOM after hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Event listener for sync button
    const syncErrorsBtn = document.getElementById('syncErrorsBtn');
    if (syncErrorsBtn) {
        syncErrorsBtn.addEventListener('click', syncErrorLogs);
    }
    
    // Set up online listener to auto-sync
    window.addEventListener('online', autoSyncErrorLogs);
    
    // Try initial auto-sync after page load
    setTimeout(autoSyncErrorLogs, 5000);
});