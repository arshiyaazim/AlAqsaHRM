// googleMaps.ts
// Simplified implementation for Dokploy deployment

/**
 * Calculate distance between two coordinates in meters using the Haversine formula
 * @param lat1 First latitude
 * @param lon1 First longitude
 * @param lat2 Second latitude
 * @param lon2 Second longitude
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371e3; // Earth's radius in meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Define the window augmentation to handle Google Maps API
declare global {
  interface Window {
    initGoogleMapsApi?: () => Promise<void>;
    googleMapsLoaded?: boolean;
    googleMapsLoading?: boolean;
    googleMapsCallbacks?: Array<() => void>;
    google?: any; // Google Maps API object
  }
}

/**
 * Load the Google Maps API dynamically
 * This prevents API key from being exposed in client-side code
 * @returns Promise that resolves when the API is loaded
 */
export const loadGoogleMapsApi = async (): Promise<void> => {
  // If already loaded, return immediately
  if (window.googleMapsLoaded) {
    return Promise.resolve();
  }

  // If currently loading, return the existing promise
  if (window.googleMapsLoading) {
    return new Promise((resolve) => {
      if (!window.googleMapsCallbacks) {
        window.googleMapsCallbacks = [];
      }
      window.googleMapsCallbacks.push(() => resolve());
    });
  }

  // Start loading
  window.googleMapsLoading = true;
  window.googleMapsCallbacks = [];

  return new Promise((resolve, reject) => {
    // Create a function to be called when the API loads
    window.initGoogleMapsApi = () => {
      window.googleMapsLoaded = true;
      window.googleMapsLoading = false;
      
      // Call all callbacks
      if (window.googleMapsCallbacks) {
        window.googleMapsCallbacks.forEach((callback) => callback());
        window.googleMapsCallbacks = [];
      }
      
      resolve();
      return Promise.resolve();
    };

    // Fetch the API key from the server with proper authorization
    const token = localStorage.getItem('token');
    fetch('/api/maps/apikey', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load Google Maps API key');
        }
        return response.json();
      })
      .then(data => {
        // Create the script element
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places,geometry&callback=initGoogleMapsApi`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          window.googleMapsLoading = false;
          reject(new Error('Failed to load Google Maps API'));
        };
        document.head.appendChild(script);
      })
      .catch(error => {
        window.googleMapsLoading = false;
        reject(error);
      });
  });
};

/**
 * Utility function to get current geolocation
 * @returns Promise with the current position
 */
export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
};