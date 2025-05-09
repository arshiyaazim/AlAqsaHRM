/**
 * Field Attendance Tracker - Offline Support
 * 
 * Provides offline functionality for the mobile attendance application
 * including:
 * - Local storage for attendance records when offline
 * - Synchronization when coming back online
 * - Cache management for offline forms
 * - Status indicators
 */

// Database and store names
const DB_NAME = 'field-attendance-tracker-db';
const DB_VERSION = 1;
const ATTENDANCE_STORE = 'attendance-records';
const FORM_CACHE_STORE = 'form-cache';

// DOM Element references
let offlineStatus;
let onlineStatus;
let unsyncedRecords;
let unsyncedBadge;
let syncNowBtn;
let offlineBanner;
let installPrompt;

// Runtime variables
let isOnline = navigator.onLine;
let dbPromise = null;
let deferredInstallPrompt = null;

// Initialize offline support
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    offlineStatus = document.getElementById('offlineStatus');
    onlineStatus = document.getElementById('onlineStatus');
    unsyncedRecords = document.getElementById('unsyncedRecords');
    unsyncedBadge = document.getElementById('unsyncedBadge');
    syncNowBtn = document.getElementById('syncNowBtn');
    offlineBanner = document.getElementById('offline-banner');
    installPrompt = document.getElementById('install-prompt');
    
    // Set up event listeners for online/offline events
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    // Set up sync button
    if (syncNowBtn) {
        syncNowBtn.addEventListener('click', syncOfflineRecords);
    }
    
    // Initialize the IndexedDB database
    initDatabase();
    
    // Set initial online/offline status
    handleOnlineStatusChange();
    
    // Check for unsynced records
    checkUnsyncedRecords();
    
    // Register form submit handler for offline support
    const attendanceForm = document.getElementById('attendanceForm');
    if (attendanceForm) {
        // Override standard form submission
        attendanceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFormSubmission(e.target);
            return false;
        });
    }
    
    // Set up install prompt
    window.addEventListener('beforeinstallprompt', function(e) {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        
        // Store the event for later use
        deferredInstallPrompt = e;
        
        // Show the install button if it exists
        if (installPrompt) {
            installPrompt.style.display = 'block';
            
            // Set up event listener for the install button
            const installButton = document.getElementById('installButton');
            if (installButton) {
                installButton.addEventListener('click', function() {
                    // Show the install prompt
                    deferredInstallPrompt.prompt();
                    
                    // Wait for the user to respond to the prompt
                    deferredInstallPrompt.userChoice.then(function(choiceResult) {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the install prompt');
                            installPrompt.style.display = 'none';
                        } else {
                            console.log('User dismissed the install prompt');
                        }
                        
                        // Clear the saved prompt since it can't be used again
                        deferredInstallPrompt = null;
                    });
                });
            }
        }
    });
});

// Initialize the IndexedDB database
function initDatabase() {
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(ATTENDANCE_STORE)) {
                db.createObjectStore(ATTENDANCE_STORE, { keyPath: 'id', autoIncrement: true });
            }
            
            if (!db.objectStoreNames.contains(FORM_CACHE_STORE)) {
                db.createObjectStore(FORM_CACHE_STORE, { keyPath: 'id' });
            }
        };
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        
        request.onerror = function(event) {
            console.error('Error opening IndexedDB:', event.target.error);
            reject('Error opening IndexedDB');
        };
    });
}

// Handle online/offline status changes
function handleOnlineStatusChange() {
    isOnline = navigator.onLine;
    
    // Update body class for CSS targeting
    if (isOnline) {
        document.body.classList.remove('offline-mode');
    } else {
        document.body.classList.add('offline-mode');
    }
    
    // Update UI elements
    updateStatusDisplay();
    
    // If coming back online, attempt to sync
    if (isOnline) {
        syncOfflineRecords();
    }
}

// Update the status display elements
function updateStatusDisplay() {
    // Update the main status panels if they exist
    if (offlineStatus) {
        offlineStatus.style.display = isOnline ? 'none' : 'block';
    }
    
    if (onlineStatus) {
        onlineStatus.style.display = isOnline ? 'block' : 'none';
    }
    
    // Update the banner if it exists
    if (offlineBanner) {
        offlineBanner.classList.toggle('d-none', isOnline);
    }
}

// Check for unsynced records and update UI
function checkUnsyncedRecords() {
    if (!dbPromise) return;
    
    dbPromise.then(db => {
        const transaction = db.transaction([ATTENDANCE_STORE], 'readonly');
        const store = transaction.objectStore(ATTENDANCE_STORE);
        const countRequest = store.count();
        
        countRequest.onsuccess = function() {
            const count = countRequest.result;
            
            if (unsyncedBadge) {
                unsyncedBadge.textContent = count;
            }
            
            if (unsyncedRecords) {
                unsyncedRecords.style.display = count > 0 ? 'block' : 'none';
            }
        };
    }).catch(error => {
        console.error('Error checking unsynced records:', error);
    });
}

// Handle form submission with offline support
function handleFormSubmission(form) {
    // Validate form
    if (!validateForm(form)) {
        return;
    }
    
    // If online, submit normally
    if (isOnline) {
        submitFormToServer(form);
    } else {
        // If offline, save locally
        saveFormLocally(form);
    }
}

// Validate form before submission
function validateForm(form) {
    // Basic validation - required fields
    const requiredInputs = form.querySelectorAll('[required]');
    for (const input of requiredInputs) {
        if (!input.value.trim()) {
            alert(`Please fill in the ${input.name || 'required'} field.`);
            input.focus();
            return false;
        }
    }
    
    // Check location
    const latitudeInput = form.querySelector('#latitude');
    const longitudeInput = form.querySelector('#longitude');
    if ((!latitudeInput || !latitudeInput.value) || (!longitudeInput || !longitudeInput.value)) {
        alert('Please wait for your location to be captured or refresh location.');
        return false;
    }
    
    return true;
}

// Submit form to server
function submitFormToServer(form) {
    const formData = new FormData(form);
    
    // Add online flag
    formData.append('online_submission', 'true');
    
    // Add timestamp
    formData.append('client_timestamp', new Date().toISOString());
    
    fetch(form.action, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server returned ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Attendance recorded successfully!');
            resetForm(form);
        } else {
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error submitting form:', error);
        
        // If fetch fails due to network issue, save locally
        if (!navigator.onLine) {
            alert('Network error occurred. Saving attendance locally for later submission.');
            saveFormLocally(form);
        } else {
            alert('Error submitting attendance: ' + error.message);
        }
    });
}

// Save form data locally for later sync
function saveFormLocally(form) {
    if (!dbPromise) {
        alert('Offline storage is not available. Please try again when online.');
        return;
    }
    
    const formData = new FormData(form);
    const formObject = {};
    let hasPhotoFile = false;
    
    // Convert FormData to an object
    for (const [key, value] of formData.entries()) {
        // Handle file separately
        if (key === 'photo' && value instanceof File && value.name) {
            hasPhotoFile = true;
            // We need to read the file as a data URL for storage
            const reader = new FileReader();
            reader.onload = function(e) {
                formObject[key] = {
                    name: value.name,
                    type: value.type,
                    dataUrl: e.target.result
                };
                
                // Save after photo is processed
                finalizeSaving();
            };
            reader.readAsDataURL(value);
        } else {
            formObject[key] = value;
        }
    }
    
    // Add metadata
    formObject.timestamp = new Date().toISOString();
    formObject.deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
    };
    
    // If there's no photo file, save immediately
    if (!hasPhotoFile) {
        finalizeSaving();
    }
    
    function finalizeSaving() {
        dbPromise.then(db => {
            const transaction = db.transaction([ATTENDANCE_STORE], 'readwrite');
            const store = transaction.objectStore(ATTENDANCE_STORE);
            
            const request = store.add(formObject);
            
            request.onsuccess = function() {
                alert('Your attendance has been saved offline and will be submitted when you are back online.');
                resetForm(form);
                checkUnsyncedRecords();
            };
            
            request.onerror = function(event) {
                alert('Error saving attendance record: ' + event.target.error);
            };
        }).catch(error => {
            alert('Database error: ' + error);
        });
    }
}

// Reset form after submission
function resetForm(form) {
    form.reset();
    
    // Reset photo preview if exists
    const photoPreview = document.getElementById('photoPreview');
    if (photoPreview) {
        photoPreview.classList.add('d-none');
    }
    
    // Clear any selected file
    const photoInput = document.getElementById('photo');
    if (photoInput) {
        photoInput.value = '';
    }
    
    // Refresh location if applicable
    if (typeof updateLocation === 'function') {
        updateLocation();
    }
}

// Synchronize offline records with the server
function syncOfflineRecords() {
    if (!isOnline) {
        alert('You are currently offline. Records will be synced when you reconnect to the internet.');
        return;
    }
    
    if (!dbPromise) {
        alert('Offline storage is not available.');
        return;
    }
    
    // Disable sync button and show loading indicator
    if (syncNowBtn) {
        syncNowBtn.disabled = true;
        syncNowBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Syncing...';
    }
    
    dbPromise.then(db => {
        const transaction = db.transaction([ATTENDANCE_STORE], 'readonly');
        const store = transaction.objectStore(ATTENDANCE_STORE);
        const request = store.getAll();
        
        request.onsuccess = function() {
            const records = request.result;
            
            if (records.length === 0) {
                console.log('No offline records to sync');
                finishSync();
                return;
            }
            
            console.log(`Found ${records.length} offline records to sync`);
            
            // Process records sequentially
            let recordsProcessed = 0;
            let recordsSucceeded = 0;
            let recordsFailed = 0;
            
            function processNextRecord(index) {
                if (index >= records.length) {
                    console.log(`Sync complete: ${recordsSucceeded} succeeded, ${recordsFailed} failed`);
                    finishSync();
                    return;
                }
                
                syncRecord(records[index])
                    .then(() => {
                        recordsProcessed++;
                        recordsSucceeded++;
                        
                        console.log(`Record ${index + 1}/${records.length} synced successfully`);
                        
                        // Process next record
                        processNextRecord(index + 1);
                    })
                    .catch(error => {
                        recordsProcessed++;
                        recordsFailed++;
                        
                        console.error(`Failed to sync record ${index + 1}/${records.length}:`, error);
                        
                        // Continue with next record despite error
                        processNextRecord(index + 1);
                    });
            }
            
            // Start processing from the first record
            processNextRecord(0);
        };
        
        request.onerror = function(event) {
            console.error('Error reading offline records:', event.target.error);
            finishSync();
        };
    }).catch(error => {
        console.error('Database error during sync:', error);
        finishSync();
    });
    
    function finishSync() {
        // Re-enable sync button
        if (syncNowBtn) {
            syncNowBtn.disabled = false;
            syncNowBtn.innerHTML = '<i class="bi bi-cloud-arrow-up me-2"></i> Sync Now';
        }
        
        // Update UI to reflect current unsynced record count
        checkUnsyncedRecords();
    }
}

// Sync a single record
function syncRecord(record) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        
        // Add all data fields except internal fields
        for (const key in record) {
            if (key === 'id' || key === 'deviceInfo' || key === 'timestamp') {
                continue; // Skip internal fields
            }
            
            // Handle photo data URL specially
            if (key === 'photo' && record[key] && record[key].dataUrl) {
                // Convert data URL back to a File object
                fetch(record[key].dataUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], record[key].name, { type: record[key].type });
                        formData.append(key, file);
                        continueSync();
                    })
                    .catch(error => {
                        console.error('Error converting photo data URL to File:', error);
                        continueSync(); // Continue without the photo if conversion fails
                    });
                return; // Exit - continueSync will be called after photo is processed
            } else {
                formData.append(key, record[key]);
            }
        }
        
        // Add sync metadata
        formData.append('offline_sync', 'true');
        formData.append('offline_timestamp', record.timestamp || '');
        formData.append('sync_timestamp', new Date().toISOString());
        
        continueSync();
        
        function continueSync() {
            // Submit to server
            fetch('/api/submit', { // Use the API endpoint for submission
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error(data.message || 'Unknown server error');
                }
                
                // Remove the record from IndexedDB after successful sync
                return removeRecord(record.id);
            })
            .then(() => {
                resolve();
            })
            .catch(error => {
                reject(error);
            });
        }
    });
}

// Remove a record from IndexedDB
function removeRecord(id) {
    return dbPromise.then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([ATTENDANCE_STORE], 'readwrite');
            const store = transaction.objectStore(ATTENDANCE_STORE);
            
            const request = store.delete(id);
            
            request.onsuccess = function() {
                resolve();
            };
            
            request.onerror = function(event) {
                reject(`Failed to remove record ${id}: ${event.target.error}`);
            };
        });
    });
}

// Cache form data for offline use
function cacheFormData(formId, data) {
    if (!dbPromise) return Promise.reject('Database not available');
    
    return dbPromise.then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([FORM_CACHE_STORE], 'readwrite');
            const store = transaction.objectStore(FORM_CACHE_STORE);
            
            const record = {
                id: formId,
                data: data,
                timestamp: new Date().toISOString()
            };
            
            const request = store.put(record);
            
            request.onsuccess = function() {
                resolve();
            };
            
            request.onerror = function(event) {
                reject(`Failed to cache form data: ${event.target.error}`);
            };
        });
    });
}

// Get cached form data
function getCachedFormData(formId) {
    if (!dbPromise) return Promise.reject('Database not available');
    
    return dbPromise.then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([FORM_CACHE_STORE], 'readonly');
            const store = transaction.objectStore(FORM_CACHE_STORE);
            
            const request = store.get(formId);
            
            request.onsuccess = function() {
                resolve(request.result ? request.result.data : null);
            };
            
            request.onerror = function(event) {
                reject(`Failed to get cached form data: ${event.target.error}`);
            };
        });
    });
}