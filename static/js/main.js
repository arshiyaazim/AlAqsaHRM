/**
 * Al-Aqsa Security - Attendance System
 * Main JavaScript file
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize components based on page
  if (document.getElementById('attendanceForm')) {
    initAttendanceForm();
  }
  
  if (document.getElementById('adminDashboard')) {
    initAdminDashboard();
  }
  
  // Initialize common elements
  initOfflineDetection();
  initInstallPrompt();
});

/**
 * Initialize the attendance form functionality
 */
function initAttendanceForm() {
  // Update clock
  updateClock();
  setInterval(updateClock, 1000);
  
  // Get location
  initGeolocation();
  
  // Initialize camera functionality if available
  if (document.getElementById('toggleCameraBtn')) {
    initCamera();
  }
  
  // Handle form submission
  const form = document.getElementById('attendanceForm');
  if (form) {
    form.addEventListener('submit', handleAttendanceSubmit);
  }
  
  // Check for URL parameters to auto-select action
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  
  if (action === 'clockin' && document.getElementById('clockIn')) {
    document.getElementById('clockIn').checked = true;
  } else if (action === 'clockout' && document.getElementById('clockOut')) {
    document.getElementById('clockOut').checked = true;
  }
}

/**
 * Update the clock display
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
 * Initialize geolocation functionality
 */
function initGeolocation() {
  const locationStatus = document.getElementById('locationStatus');
  const locationStatusText = document.getElementById('locationStatusText');
  const locationInfo = document.getElementById('locationInfo');
  const coordinatesInfo = document.getElementById('coordinatesInfo');
  const latitudeInput = document.getElementById('latitude');
  const longitudeInput = document.getElementById('longitude');
  const submitBtn = document.getElementById('submitBtn');
  
  if (!navigator.geolocation) {
    if (locationStatusText) locationStatusText.textContent = 'Geolocation not supported';
    if (locationStatus) locationStatus.className = 'status-indicator status-error';
    if (locationInfo) locationInfo.innerHTML = '<strong class="text-danger">Error:</strong> Geolocation is not supported by your browser.';
    if (submitBtn) submitBtn.disabled = false;
    return;
  }
  
  function getLocation() {
    if (locationStatus) locationStatus.className = 'status-indicator status-acquiring';
    if (locationStatusText) locationStatusText.textContent = 'Acquiring location...';
    
    navigator.geolocation.getCurrentPosition(
      // Success callback
      function(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        // Update UI
        if (locationStatus) locationStatus.className = 'status-indicator status-success';
        if (locationStatusText) locationStatusText.textContent = 'Location acquired';
        if (locationInfo) locationInfo.innerHTML = `
          <strong>Location acquired</strong> with accuracy of ${accuracy.toFixed(1)} meters.
        `;
        if (coordinatesInfo) coordinatesInfo.textContent = `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`;
        
        // Update form values
        if (latitudeInput) latitudeInput.value = latitude;
        if (longitudeInput) longitudeInput.value = longitude;
        
        // Enable submit button
        if (submitBtn) submitBtn.disabled = false;
      },
      // Error callback
      function(error) {
        if (locationStatus) locationStatus.className = 'status-indicator status-error';
        
        let errorMessage = '';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location services.';
            if (locationStatusText) locationStatusText.textContent = 'Permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            if (locationStatusText) locationStatusText.textContent = 'Position unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            if (locationStatusText) locationStatusText.textContent = 'Timeout';
            break;
          case error.UNKNOWN_ERROR:
            errorMessage = 'An unknown error occurred.';
            if (locationStatusText) locationStatusText.textContent = 'Unknown error';
            break;
        }
        
        if (locationInfo) locationInfo.innerHTML = `<strong class="text-danger">Error:</strong> ${errorMessage}`;
        
        // Enable submit button anyway to allow submission without location
        if (submitBtn) submitBtn.disabled = false;
      },
      // Options
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }
  
  // Initial location request
  getLocation();
  
  // Add refresh button functionality if it exists
  const refreshLocationBtn = document.getElementById('refreshLocationBtn');
  if (refreshLocationBtn) {
    refreshLocationBtn.addEventListener('click', function() {
      getLocation();
    });
  }
}

/**
 * Initialize camera functionality
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
  
  toggleCameraBtn.addEventListener('click', function() {
    if (cameraContainer.style.display === 'none') {
      // Start camera
      startCamera();
      cameraContainer.style.display = 'block';
      photoPreviewContainer.style.display = 'none';
      toggleCameraBtn.innerHTML = '<i class="bi bi-x-circle"></i> Cancel';
    } else {
      // Stop camera
      stopCamera();
      cameraContainer.style.display = 'none';
      toggleCameraBtn.innerHTML = '<i class="bi bi-camera"></i> Take Photo';
    }
  });
  
  function startCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      .then(function(mediaStream) {
        stream = mediaStream;
        cameraPreview.srcObject = mediaStream;
        cameraPreview.style.display = 'block';
        cameraPreview.play();
      })
      .catch(function(error) {
        console.error("Error accessing the camera: ", error);
        alert("Could not access the camera. Please ensure camera permissions are granted.");
        cameraContainer.style.display = 'none';
        toggleCameraBtn.innerHTML = '<i class="bi bi-camera"></i> Take Photo';
      });
    } else {
      alert("Your browser doesn't support camera access.");
      cameraContainer.style.display = 'none';
    }
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
  if (captureBtn) {
    captureBtn.addEventListener('click', function() {
      const canvas = document.getElementById('captureCanvas');
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = cameraPreview.videoWidth;
      canvas.height = cameraPreview.videoHeight;
      
      // Draw the video frame on the canvas
      context.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob and create a file
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
        
        // Stop camera
        stopCamera();
        
        // Change button text back
        toggleCameraBtn.innerHTML = '<i class="bi bi-camera"></i> Change Photo';
      }, 'image/jpeg', 0.9);
    });
  }
  
  // Retake photo
  if (retakePhotoBtn) {
    retakePhotoBtn.addEventListener('click', function() {
      photoPreviewContainer.style.display = 'none';
      startCamera();
      cameraContainer.style.display = 'block';
    });
  }
}

/**
 * Handle attendance form submission
 */
function handleAttendanceSubmit(event) {
  const form = event.target;
  const employeeId = form.elements.employee_id.value.trim();
  
  // Basic validation
  if (!employeeId) {
    alert('Please enter your Employee ID');
    event.preventDefault();
    return false;
  }
  
  // If we're offline, prevent form submission and store data locally
  if (!navigator.onLine) {
    event.preventDefault();
    
    // Get form data
    const formData = new FormData(form);
    const attendanceData = {
      employee_id: formData.get('employee_id'),
      project_id: formData.get('project_id') || null,
      action: formData.get('action'),
      latitude: formData.get('latitude') || null,
      longitude: formData.get('longitude') || null,
      timestamp: new Date().toISOString(),
      id: Date.now().toString() // Temporary ID for local storage
    };
    
    // Store locally (in a real app, this would use IndexedDB)
    storeOfflineAttendance(attendanceData);
    
    // Show offline submission message
    alert('You are currently offline. Your attendance has been saved and will be submitted when you are online again.');
    
    // Reset form
    form.reset();
    
    return false;
  }
  
  // Online submission continues normally
  return true;
}

/**
 * Store attendance data for offline use
 * In a real implementation, this would use IndexedDB
 */
function storeOfflineAttendance(data) {
  let storedRecords = [];
  
  // Get existing records
  const storedData = localStorage.getItem('offlineAttendance');
  if (storedData) {
    try {
      storedRecords = JSON.parse(storedData);
    } catch (e) {
      console.error('Error parsing stored attendance data:', e);
      storedRecords = [];
    }
  }
  
  // Add new record
  storedRecords.push(data);
  
  // Save back to storage
  localStorage.setItem('offlineAttendance', JSON.stringify(storedRecords));
  
  // Register for sync when back online
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(function(registration) {
        registration.sync.register('attendance-sync');
      })
      .catch(function(err) {
        console.error('Sync registration failed:', err);
      });
  }
}

/**
 * Initialize offline detection
 */
function initOfflineDetection() {
  const offlineIndicator = document.createElement('div');
  offlineIndicator.className = 'offline-indicator';
  offlineIndicator.textContent = 'You are offline. Data will be saved locally.';
  document.body.appendChild(offlineIndicator);
  
  function updateOnlineStatus() {
    if (navigator.onLine) {
      offlineIndicator.classList.remove('visible');
      syncOfflineData();
    } else {
      offlineIndicator.classList.add('visible');
    }
  }
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial check
  updateOnlineStatus();
}

/**
 * Sync data stored offline when coming back online
 */
function syncOfflineData() {
  // In a real implementation, this would be handled by the service worker
  // This is a simplified version for demonstration
  
  const storedData = localStorage.getItem('offlineAttendance');
  if (!storedData) return;
  
  try {
    const records = JSON.parse(storedData);
    if (records.length === 0) return;
    
    console.log('Syncing', records.length, 'offline records');
    
    // Process each stored record
    let successCount = 0;
    
    records.forEach(function(record, index) {
      // Submit via fetch API
      fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      })
      .then(function(response) {
        if (response.ok) {
          successCount++;
          
          // Remove successfully synced records
          records.splice(index, 1);
          localStorage.setItem('offlineAttendance', JSON.stringify(records));
          
          if (successCount === 1) {
            // Show notification for first success only to avoid spamming
            alert('Your offline attendance records have been synchronized.');
          }
        }
      })
      .catch(function(error) {
        console.error('Error syncing record:', error);
      });
    });
  } catch (e) {
    console.error('Error parsing offline data:', e);
  }
}

/**
 * Initialize admin dashboard functionality
 */
function initAdminDashboard() {
  // Handle CSV export if button exists
  const exportBtn = document.querySelector('.export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportTableToCSV);
  }
  
  // Initialize date picker if it exists
  const datePicker = document.getElementById('date');
  if (datePicker) {
    datePicker.valueAsDate = new Date();
  }
  
  // Handle photo modal
  const photoModal = document.getElementById('photoModal');
  if (photoModal) {
    photoModal.addEventListener('show.bs.modal', function(event) {
      const button = event.relatedTarget;
      const photoUrl = button.getAttribute('data-photo');
      const modalPhoto = document.getElementById('modalPhoto');
      if (modalPhoto) {
        modalPhoto.src = photoUrl;
      }
    });
  }
}

/**
 * Export table data to CSV file
 */
function exportTableToCSV() {
  const table = document.getElementById('attendanceTable');
  if (!table) return;
  
  let csv = [];
  
  // Get headers (skipping the photo column)
  let headers = [];
  const headerCells = table.querySelectorAll('thead th');
  headerCells.forEach(function(cell, index) {
    if (index !== 6) { // Skip Photo column
      headers.push(cell.textContent);
    }
  });
  csv.push(headers.join(','));
  
  // Get rows
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(function(row) {
    let rowData = [];
    const cells = row.querySelectorAll('td');
    cells.forEach(function(cell, index) {
      if (index !== 6) { // Skip Photo column
        // Clean the text content for CSV (remove commas, new lines)
        let text = cell.textContent.trim().replace(/\n/g, ' ').replace(/,/g, ';');
        
        // For the Location column, get only the coordinates if available
        if (index === 5) {
          const coordinates = cell.querySelector('.coordinates');
          text = coordinates ? coordinates.textContent.trim() : 'No location data';
        }
        
        // For the Action column, clean up the text
        if (index === 3) {
          text = text.replace(/\s+/g, ' ').trim();
        }
        
        rowData.push(`"${text}"`);
      }
    });
    csv.push(rowData.join(','));
  });
  
  // Create and download CSV file
  const csvContent = csv.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Initialize PWA install prompt
 */
function initInstallPrompt() {
  let deferredPrompt;
  
  // Create install prompt elements if they don't exist
  if (!document.querySelector('.install-prompt')) {
    const promptContainer = document.createElement('div');
    promptContainer.className = 'install-prompt';
    promptContainer.innerHTML = `
      <div class="install-prompt-header">
        <h5 class="install-prompt-title">Install App</h5>
        <button class="install-prompt-close">&times;</button>
      </div>
      <div class="install-prompt-content">
        <p>Install this app on your device for quick access and offline use.</p>
      </div>
      <div class="install-prompt-buttons">
        <button class="btn btn-secondary btn-sm install-prompt-cancel">Not Now</button>
        <button class="btn btn-primary btn-sm install-prompt-accept">Install</button>
      </div>
    `;
    document.body.appendChild(promptContainer);
    
    // Add event listeners
    promptContainer.querySelector('.install-prompt-close').addEventListener('click', () => {
      promptContainer.style.display = 'none';
    });
    
    promptContainer.querySelector('.install-prompt-cancel').addEventListener('click', () => {
      promptContainer.style.display = 'none';
    });
    
    promptContainer.querySelector('.install-prompt-accept').addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          } else {
            console.log('User dismissed the install prompt');
          }
          deferredPrompt = null;
        });
      }
      promptContainer.style.display = 'none';
    });
  }
  
  // Wait for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show the install prompt
    document.querySelector('.install-prompt').style.display = 'block';
  });
  
  // Handle installed event
  window.addEventListener('appinstalled', (evt) => {
    console.log('App was installed', evt);
    document.querySelector('.install-prompt').style.display = 'none';
  });
}