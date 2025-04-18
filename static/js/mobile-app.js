/**
 * Al-Aqsa Security - Mobile Attendance App
 * Enhanced JavaScript for mobile experience with offline support
 */

// IndexedDB configuration
const DB_NAME = 'al-aqsa-attendance-db';
const DB_VERSION = 1;
const ATTENDANCE_STORE = 'offline-attendance';
const PROJECT_STORE = 'projects';
const EMPLOYEE_STORE = 'employees';

// Global app state
let db;
let deferredPrompt;
let isOnline = navigator.onLine;
let pendingSync = false;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize components
  initClock();
  initGeolocation();
  initCamera();
  initFormHandling();
  initNetworkStatus();
  initDatabase();
  initInstallPrompt();
  
  // Add app shortcuts for quick clock in/out
  setupAppShortcuts();
  
  // Register service worker for offline support
  registerServiceWorker();
});

/**
 * Initialize clock display and update it every second
 */
function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

/**
 * Update the clock with current time/date
 */
function updateClock() {
  const now = new Date();
  
  // Update time
  const timeElement = document.getElementById('currentTime');
  if (timeElement) {
    timeElement.textContent = now.toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  // Update date
  const dateElement = document.getElementById('currentDate');
  if (dateElement) {
    dateElement.textContent = now.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

/**
 * Initialize geolocation with high accuracy and persistent display
 */
function initGeolocation() {
  const locationStatus = document.getElementById('locationStatus');
  const locationStatusText = document.getElementById('locationStatusText');
  const locationInfo = document.getElementById('locationInfo');
  const coordinatesInfo = document.getElementById('coordinatesInfo');
  const latitudeInput = document.getElementById('latitude');
  const longitudeInput = document.getElementById('longitude');
  const submitBtn = document.getElementById('submitBtn');
  const refreshLocationBtn = document.getElementById('refreshLocationBtn');
  
  // Create vibration feedback function (for mobile devices)
  const vibrateDevice = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };
  
  if (!navigator.geolocation) {
    if (locationStatusText) locationStatusText.textContent = 'Not supported';
    if (locationStatus) locationStatus.className = 'status-indicator status-error';
    if (locationInfo) locationInfo.innerHTML = '<strong class="text-danger">Error:</strong> Geolocation is not supported by your device.';
    if (submitBtn) submitBtn.disabled = false;
    return;
  }
  
  // Track watch position ID so we can cancel it when needed
  let watchId = null;
  
  // Success callback
  function handlePositionSuccess(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    
    // Update UI
    if (locationStatus) locationStatus.className = 'status-indicator status-success';
    if (locationStatusText) locationStatusText.textContent = 'Acquired';
    if (locationInfo) locationInfo.innerHTML = `
      <strong>Location acquired</strong> with accuracy of ${accuracy.toFixed(1)} meters.
    `;
    if (coordinatesInfo) coordinatesInfo.textContent = `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`;
    
    // Update form values
    if (latitudeInput) latitudeInput.value = latitude;
    if (longitudeInput) longitudeInput.value = longitude;
    
    // Enable submit button
    if (submitBtn) submitBtn.disabled = false;
    
    // Store coordinates in localStorage for offline use
    localStorage.setItem('lastKnownLocation', JSON.stringify({
      latitude,
      longitude,
      accuracy,
      timestamp: new Date().toISOString()
    }));
    
    // Short vibration to indicate success (if supported)
    vibrateDevice(100);
  }
  
  // Error callback
  function handlePositionError(error) {
    if (locationStatus) locationStatus.className = 'status-indicator status-error';
    
    let errorMessage = '';
    switch(error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location services.';
        if (locationStatusText) locationStatusText.textContent = 'Denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information is unavailable.';
        if (locationStatusText) locationStatusText.textContent = 'Unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out.';
        if (locationStatusText) locationStatusText.textContent = 'Timeout';
        break;
      case error.UNKNOWN_ERROR:
        errorMessage = 'An unknown error occurred.';
        if (locationStatusText) locationStatusText.textContent = 'Error';
        break;
    }
    
    if (locationInfo) locationInfo.innerHTML = `<strong class="text-danger">Error:</strong> ${errorMessage}`;
    
    // Try to get the last known location from localStorage
    const lastLocation = localStorage.getItem('lastKnownLocation');
    if (lastLocation) {
      try {
        const locationData = JSON.parse(lastLocation);
        const locationTime = new Date(locationData.timestamp);
        const timeAgo = Math.round((new Date() - locationTime) / (1000 * 60)); // minutes
        
        if (coordinatesInfo) {
          coordinatesInfo.innerHTML = `
            <div class="text-warning">Using last known location (${timeAgo} minutes ago):</div>
            <div>Lat: ${locationData.latitude.toFixed(6)}, Long: ${locationData.longitude.toFixed(6)}</div>
          `;
        }
        
        // Update form values with last known location
        if (latitudeInput) latitudeInput.value = locationData.latitude;
        if (longitudeInput) longitudeInput.value = locationData.longitude;
        
        // Enable submit button with last known location
        if (submitBtn) submitBtn.disabled = false;
      } catch (e) {
        console.error('Error parsing last known location:', e);
      }
    }
    
    // Vibration pattern for error (if supported)
    vibrateDevice([100, 100, 100]);
  }
  
  // Start watching location
  function startLocationWatch() {
    if (locationStatus) locationStatus.className = 'status-indicator status-acquiring';
    if (locationStatusText) locationStatusText.textContent = 'Acquiring...';
    
    // Cancel any existing watch
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    
    // Setup high accuracy location watching
    watchId = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000 // Allow cached positions up to 30 seconds old
      }
    );
  }
  
  // Initial location request
  startLocationWatch();
  
  // Add refresh button functionality
  if (refreshLocationBtn) {
    refreshLocationBtn.addEventListener('click', function() {
      startLocationWatch();
      vibrateDevice(50); // Short vibration for button press
    });
  }
  
  // Stop the watch when the page is hidden
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden' && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    } else if (document.visibilityState === 'visible' && watchId === null) {
      startLocationWatch();
    }
  });
}

/**
 * Initialize camera with enhanced mobile support
 */
function initCamera() {
  let stream = null;
  const toggleCameraBtn = document.getElementById('toggleCameraBtn');
  const cameraContainer = document.getElementById('cameraContainer');
  const cameraPreview = document.getElementById('cameraPreview');
  const captureBtn = document.getElementById('captureBtn');
  const photoPreviewContainer = document.getElementById('photoPreviewContainer');
  const photoPreview = document.getElementById('photoPreview');
  const retakePhotoBtn = document.getElementById('retakePhotoBtn');
  const photoInput = document.getElementById('photoInput');
  
  if (!toggleCameraBtn || !cameraContainer || !cameraPreview) return;
  
  // Check camera support
  const hasGetUserMedia = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };
  
  // If camera is not supported, hide the camera section
  if (!hasGetUserMedia()) {
    toggleCameraBtn.parentElement.style.display = 'none';
    console.log('Camera not supported on this device');
    return;
  }
  
  toggleCameraBtn.addEventListener('click', function() {
    if (cameraContainer.style.display === 'none' || cameraContainer.style.display === '') {
      // Start camera
      startCamera();
      cameraContainer.style.display = 'block';
      photoPreviewContainer.style.display = 'none';
      toggleCameraBtn.innerHTML = '<i class="bi bi-x-circle"></i> Cancel';
      
      // Vibrate if supported (camera opening)
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } else {
      // Stop camera
      stopCamera();
      cameraContainer.style.display = 'none';
      toggleCameraBtn.innerHTML = '<i class="bi bi-camera"></i> Take Photo';
    }
  });
  
  function startCamera() {
    // Try to get the front camera for selfies
    const constraints = { 
      video: { 
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 1.777777778 }
      } 
    };
    
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function(mediaStream) {
        stream = mediaStream;
        cameraPreview.srcObject = mediaStream;
        cameraPreview.style.display = 'block';
        cameraPreview.play();
      })
      .catch(function(error) {
        console.error("Error accessing the camera: ", error);
        
        // Try with basic constraints if the initial request fails
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(function(basicStream) {
            stream = basicStream;
            cameraPreview.srcObject = basicStream;
            cameraPreview.style.display = 'block';
            cameraPreview.play();
          })
          .catch(function(basicError) {
            console.error("Error with basic camera access: ", basicError);
            alert("Could not access the camera. Please ensure camera permissions are granted.");
            cameraContainer.style.display = 'none';
            toggleCameraBtn.innerHTML = '<i class="bi bi-camera"></i> Take Photo';
          });
      });
  }
  
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(function(track) {
        track.stop();
      });
      stream = null;
    }
  }
  
  // Capture photo
  if (captureBtn && photoInput) {
    captureBtn.addEventListener('click', function() {
      // Vibrate if supported (camera shutter)
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      
      const canvas = document.getElementById('captureCanvas');
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = cameraPreview.videoWidth;
      canvas.height = cameraPreview.videoHeight;
      
      // Draw the video frame on the canvas
      context.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
      
      // Convert to JPEG with reduced quality for smaller file size
      canvas.toBlob(function(blob) {
        // Create a File object
        const capturedImage = new File([blob], "captured-photo.jpg", { type: "image/jpeg" });
        
        // Create a DataTransfer to create a FileList
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(capturedImage);
        
        // Set the files property of the file input
        photoInput.files = dataTransfer.files;
        
        // Display preview
        const imageUrl = URL.createObjectURL(blob);
        photoPreview.src = imageUrl;
        photoPreviewContainer.style.display = 'block';
        cameraContainer.style.display = 'none';
        
        // Stop camera to save battery
        stopCamera();
        
        // Change button text
        toggleCameraBtn.innerHTML = '<i class="bi bi-camera"></i> Change Photo';
        
        // Store the photo in localStorage for offline use (as a base64 string)
        const reader = new FileReader();
        reader.onloadend = function() {
          const base64data = reader.result;
          
          // Store with timestamp to know when it was taken
          const photoData = {
            data: base64data,
            timestamp: new Date().toISOString()
          };
          
          try {
            localStorage.setItem('lastCapturedPhoto', JSON.stringify(photoData));
          } catch (e) {
            // If the photo is too large for localStorage, we'll just not store it
            console.warn('Photo too large to store in localStorage:', e);
          }
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.7); // Reduced quality (0.7) for better compression
    });
  }
  
  // Retake photo
  if (retakePhotoBtn) {
    retakePhotoBtn.addEventListener('click', function() {
      photoPreviewContainer.style.display = 'none';
      startCamera();
      cameraContainer.style.display = 'block';
      
      // Vibrate if supported (button press)
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    });
  }
  
  // Clean up camera when page is hidden
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden' && stream) {
      stopCamera();
    }
  });
}

/**
 * Initialize form handling with offline support
 */
function initFormHandling() {
  const form = document.getElementById('attendanceForm');
  const clockInOption = document.getElementById('clockInOption');
  const clockOutOption = document.getElementById('clockOutOption');
  const clockInRadio = document.getElementById('clockIn');
  const clockOutRadio = document.getElementById('clockOut');
  
  // Setup clock in/out action toggle
  if (clockInRadio && clockOutRadio) {
    if (clockInOption) {
      clockInOption.addEventListener('click', function() {
        clockInRadio.checked = true;
        // Vibrate if supported (button press)
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      });
    }
    
    if (clockOutOption) {
      clockOutOption.addEventListener('click', function() {
        clockOutRadio.checked = true;
        // Vibrate if supported (button press)
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      });
    }
  }
  
  // Setup form submission
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  // Setup app bar shortcuts
  const clockInShortcut = document.getElementById('clockInShortcut');
  const clockOutShortcut = document.getElementById('clockOutShortcut');
  
  if (clockInShortcut && clockInRadio) {
    clockInShortcut.addEventListener('click', function(e) {
      e.preventDefault();
      clockInRadio.checked = true;
      
      // Focus employee ID field if empty
      const employeeIdField = document.getElementById('employee_id');
      if (employeeIdField && !employeeIdField.value) {
        employeeIdField.focus();
      }
      
      // Vibrate if supported (button press)
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    });
  }
  
  if (clockOutShortcut && clockOutRadio) {
    clockOutShortcut.addEventListener('click', function(e) {
      e.preventDefault();
      clockOutRadio.checked = true;
      
      // Focus employee ID field if empty
      const employeeIdField = document.getElementById('employee_id');
      if (employeeIdField && !employeeIdField.value) {
        employeeIdField.focus();
      }
      
      // Vibrate if supported (button press)
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    });
  }
}

/**
 * Handle form submission with online/offline support
 */
function handleFormSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const employeeId = formData.get('employee_id');
  const action = formData.get('action');
  
  // Basic validation
  if (!employeeId) {
    showToast('Please enter your Employee ID', 'error');
    
    // Focus the employee ID field
    const employeeIdField = document.getElementById('employee_id');
    if (employeeIdField) {
      employeeIdField.focus();
    }
    
    // Vibrate error pattern
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 100, 100]);
    }
    
    return;
  }
  
  // Check if we're online or offline
  if (!navigator.onLine) {
    // We're offline - store locally and show message
    handleOfflineSubmission(formData);
  } else {
    // We're online - proceed with normal submission
    handleOnlineSubmission(form, formData);
  }
}

/**
 * Handle form submission when device is offline
 */
function handleOfflineSubmission(formData) {
  // Create attendance data object
  const attendanceData = {
    id: Date.now().toString(), // Temporary ID
    employee_id: formData.get('employee_id'),
    action: formData.get('action'),
    project_id: formData.get('project_id') || null,
    latitude: formData.get('latitude') || null,
    longitude: formData.get('longitude') || null,
    timestamp: new Date().toISOString(),
    offline: true
  };
  
  // Store in IndexedDB
  storeOfflineAttendance(attendanceData)
    .then(() => {
      // Show success message
      showToast(`${attendanceData.action} saved offline. Will sync when online.`, 'success');
      
      // Vibrate success pattern
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      
      // Reset form
      document.getElementById('attendanceForm').reset();
      
      // Register for background sync if supported
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready
          .then(registration => {
            registration.sync.register('sync-attendance')
              .then(() => {
                console.log('Background sync registered');
                pendingSync = true;
              })
              .catch(err => {
                console.error('Background sync registration failed:', err);
              });
          });
      }
    })
    .catch(error => {
      console.error('Error storing offline attendance:', error);
      showToast('Failed to save attendance offline', 'error');
      
      // Vibrate error pattern
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 100, 100, 100, 100]);
      }
    });
}

/**
 * Handle form submission when device is online
 */
function handleOnlineSubmission(form, formData) {
  // Create data object for API
  const data = {
    employee_id: formData.get('employee_id'),
    action: formData.get('action'),
    project_id: formData.get('project_id') || null,
    latitude: formData.get('latitude') || null,
    longitude: formData.get('longitude') || null
  };
  
  // If we have a photo, we need to use the FormData approach with fetch
  const photoInput = document.getElementById('photoInput');
  if (photoInput && photoInput.files && photoInput.files.length > 0) {
    // Regular form submission with photo
    fetch(form.action, {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      showToast(`Successfully ${formData.get('action').toLowerCase()}ed!`, 'success');
      form.reset();
      
      // Vibrate success pattern
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    })
    .catch(error => {
      console.error('Error submitting attendance:', error);
      showToast('Failed to submit attendance. Please try again.', 'error');
      
      // Vibrate error pattern
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 100, 100, 100, 100]);
      }
    });
  } else {
    // JSON submission without photo
    fetch('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      showToast(`Successfully ${formData.get('action').toLowerCase()}ed!`, 'success');
      form.reset();
      
      // Vibrate success pattern
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    })
    .catch(error => {
      console.error('Error submitting attendance:', error);
      showToast('Failed to submit attendance. Please try again.', 'error');
      
      // Vibrate error pattern
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 100, 100, 100, 100]);
      }
    });
  }
}

/**
 * Initialize IndexedDB for offline storage
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('IndexedDB initialized successfully');
      resolve(db);
      
      // If we have a pending sync and we're now online, try to sync
      if (pendingSync && navigator.onLine) {
        triggerSync();
      }
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(ATTENDANCE_STORE)) {
        db.createObjectStore(ATTENDANCE_STORE, { keyPath: 'id' });
        console.log('Created attendance object store');
      }
      
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
        console.log('Created projects object store');
      }
      
      if (!db.objectStoreNames.contains(EMPLOYEE_STORE)) {
        db.createObjectStore(EMPLOYEE_STORE, { keyPath: 'id' });
        console.log('Created employees object store');
      }
    };
  }).catch(error => {
    console.error('Failed to initialize IndexedDB:', error);
    
    // Fallback to localStorage if IndexedDB fails
    console.log('Falling back to localStorage for offline storage');
    return null;
  });
}

/**
 * Store attendance data in IndexedDB for offline use
 */
function storeOfflineAttendance(attendanceData) {
  return new Promise((resolve, reject) => {
    if (db) {
      // Store in IndexedDB
      const transaction = db.transaction([ATTENDANCE_STORE], 'readwrite');
      const store = transaction.objectStore(ATTENDANCE_STORE);
      
      const request = store.add(attendanceData);
      
      request.onsuccess = () => {
        resolve(attendanceData);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    } else {
      // Fallback to localStorage
      try {
        const storedRecords = JSON.parse(localStorage.getItem('offlineAttendance') || '[]');
        storedRecords.push(attendanceData);
        localStorage.setItem('offlineAttendance', JSON.stringify(storedRecords));
        resolve(attendanceData);
      } catch (e) {
        reject(e);
      }
    }
  });
}

/**
 * Get all offline attendance records
 */
function getOfflineAttendanceRecords() {
  return new Promise((resolve, reject) => {
    if (db) {
      const transaction = db.transaction([ATTENDANCE_STORE], 'readonly');
      const store = transaction.objectStore(ATTENDANCE_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    } else {
      // Fallback to localStorage
      try {
        const records = JSON.parse(localStorage.getItem('offlineAttendance') || '[]');
        resolve(records);
      } catch (e) {
        reject(e);
      }
    }
  });
}

/**
 * Delete an offline attendance record
 */
function deleteOfflineAttendanceRecord(id) {
  return new Promise((resolve, reject) => {
    if (db) {
      const transaction = db.transaction([ATTENDANCE_STORE], 'readwrite');
      const store = transaction.objectStore(ATTENDANCE_STORE);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    } else {
      // Fallback to localStorage
      try {
        const storedRecords = JSON.parse(localStorage.getItem('offlineAttendance') || '[]');
        const updatedRecords = storedRecords.filter(record => record.id !== id);
        localStorage.setItem('offlineAttendance', JSON.stringify(updatedRecords));
        resolve();
      } catch (e) {
        reject(e);
      }
    }
  });
}

/**
 * Initialize network status monitoring
 */
function initNetworkStatus() {
  // Create offline indicator
  const offlineIndicator = document.createElement('div');
  offlineIndicator.className = 'offline-indicator';
  offlineIndicator.textContent = 'You are offline. Data will be saved locally.';
  document.body.appendChild(offlineIndicator);
  
  function updateOnlineStatus() {
    isOnline = navigator.onLine;
    
    if (isOnline) {
      // We're online
      document.body.classList.remove('offline');
      offlineIndicator.classList.remove('visible');
      
      // Check for pending records to sync
      if (pendingSync) {
        triggerSync();
      }
    } else {
      // We're offline
      document.body.classList.add('offline');
      offlineIndicator.classList.add('visible');
    }
  }
  
  // Setup event listeners
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial check
  updateOnlineStatus();
}

/**
 * Trigger background sync when online
 */
function triggerSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window && navigator.onLine) {
    navigator.serviceWorker.ready.then(registration => {
      registration.sync.register('sync-attendance')
        .then(() => {
          console.log('Trigger: Background sync registered');
        })
        .catch(err => {
          console.error('Trigger: Background sync registration failed:', err);
          
          // Fallback for browsers that don't support background sync
          syncOfflineRecords();
        });
    });
  } else {
    // Fallback for browsers that don't support service workers or sync
    syncOfflineRecords();
  }
}

/**
 * Sync offline records manually
 */
function syncOfflineRecords() {
  getOfflineAttendanceRecords()
    .then(records => {
      if (records.length === 0) {
        console.log('No offline records to sync');
        return;
      }
      
      console.log(`Syncing ${records.length} offline attendance records`);
      
      // Process each record
      records.forEach(record => {
        fetch('/api/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(record)
        })
        .then(response => {
          if (response.ok) {
            console.log(`Successfully synced record: ${record.id}`);
            return deleteOfflineAttendanceRecord(record.id);
          } else {
            console.error(`Failed to sync record: ${record.id}`);
          }
        })
        .catch(error => {
          console.error(`Error syncing record: ${record.id}`, error);
        });
      });
    })
    .catch(error => {
      console.error('Error getting offline records:', error);
    });
}

/**
 * Initialize PWA install prompt
 */
function initInstallPrompt() {
  const installButton = document.getElementById('installAppButton');
  
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show the install button
    if (installButton) {
      installButton.style.display = 'flex';
    }
  });
  
  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (deferredPrompt) {
        // Show the prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        try {
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`User response to the install prompt: ${outcome}`);
        } catch (error) {
          console.error('Error showing install prompt:', error);
        }
        
        // We've used the prompt, and can't use it again
        deferredPrompt = null;
      }
    });
    
    // Hide the button if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      installButton.style.display = 'none';
    }
  }
  
  // Listen for the appinstalled event
  window.addEventListener('appinstalled', (evt) => {
    // Hide the install button
    if (installButton) {
      installButton.style.display = 'none';
    }
    
    // Log the installation
    console.log('Application was installed', evt);
    
    // Show a toast message
    showToast('App installed successfully!', 'success');
  });
}

/**
 * Setup app shortcuts for quick actions
 */
function setupAppShortcuts() {
  // Handle URL parameters to auto-select action
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  
  if (action === 'clockin' && document.getElementById('clockIn')) {
    document.getElementById('clockIn').checked = true;
  } else if (action === 'clockout' && document.getElementById('clockOut')) {
    document.getElementById('clockOut').checked = true;
  }
}

/**
 * Register the service worker for offline support
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/js/mobile-service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  // Check if the toast container exists, create it if not
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 start-50 translate-middle-x p-3';
    toastContainer.style.zIndex = '1090';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastElement = document.createElement('div');
  toastElement.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
  toastElement.setAttribute('role', 'alert');
  toastElement.setAttribute('aria-live', 'assertive');
  toastElement.setAttribute('aria-atomic', 'true');
  
  // Set toast content
  toastElement.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  // Add to container
  toastContainer.appendChild(toastElement);
  
  // Initialize and show toast
  const toast = new bootstrap.Toast(toastElement, {
    autohide: true,
    delay: 3000
  });
  
  toast.show();
  
  // Remove toast after it's hidden
  toastElement.addEventListener('hidden.bs.toast', function () {
    toastElement.remove();
  });
}