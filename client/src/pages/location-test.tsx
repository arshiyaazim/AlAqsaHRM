import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, MapPin, Compass } from 'lucide-react';
import { getCurrentPosition, calculateDistance } from '@/lib/utils/googleMaps';

// Location interface
interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

const LocationTestPage: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [previousLocation, setPreviousLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  // Get Google Maps API key
  const { data: mapsData, isLoading: isLoadingMaps, error: mapsError } = useQuery({
    queryKey: ['/api/maps/apikey'],
    queryFn: async () => {
      const response = await fetch('/api/maps/apikey');
      if (!response.ok) return { apiKey: '' };
      return response.json();
    },
  });

  // Function to get current location
  const getLocation = async () => {
    setIsLoading(true);
    setLocationError(null);
    
    try {
      const position = await getCurrentPosition();
      
      // Save previous location if exists
      if (currentLocation) {
        setPreviousLocation(currentLocation);
      }
      
      // Set new location
      const newLocation: Location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };
      
      setCurrentLocation(newLocation);
      
      // Calculate distance if we have previous location
      if (previousLocation) {
        const distanceInMeters = calculateDistance(
          previousLocation.latitude,
          previousLocation.longitude,
          newLocation.latitude,
          newLocation.longitude
        );
        setDistance(distanceInMeters);
      }
    } catch (error) {
      setLocationError((error as Error).message || 'Failed to get location');
      console.error('Geolocation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format coordinates for display
  const formatCoords = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Format distance for display
  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters.toFixed(1)} meters`;
    } else {
      return `${(meters / 1000).toFixed(2)} km`;
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Location Testing</h1>
      
      {/* API Key Status */}
      {mapsError && (
        <Alert variant="destructive">
          <AlertTitle>API Key Error</AlertTitle>
          <AlertDescription>
            Failed to fetch Google Maps API key. Some functionality may be limited.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Geolocation Test</CardTitle>
          <CardDescription>
            Test location tracking functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={getLocation} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {isLoading ? 'Getting Location...' : 'Get Current Location'}
          </Button>
          
          {locationError && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Location Error</AlertTitle>
              <AlertDescription>{locationError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Current Location */}
      {currentLocation && (
        <Card>
          <CardHeader>
            <CardTitle>Current Location</CardTitle>
            <CardDescription>
              Captured at {formatTimestamp(currentLocation.timestamp)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Coordinates:</p>
              <p className="font-medium">{formatCoords(currentLocation.latitude, currentLocation.longitude)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accuracy:</p>
              <p className="font-medium">{currentLocation.accuracy.toFixed(1)} meters</p>
            </div>
            
            {previousLocation && distance !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Distance from previous:</p>
                <p className="font-medium flex items-center gap-2">
                  <Compass className="h-4 w-4" />
                  {formatDistance(distance)}
                </p>
              </div>
            )}
          </CardContent>
          
          {/* Map preview (if API key is available) */}
          {mapsData?.apiKey && (
            <CardFooter className="flex flex-col items-stretch p-0">
              <div className="w-full h-64 bg-gray-100 rounded-b-lg overflow-hidden">
                <iframe
                  title="Location Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src={`https://www.google.com/maps/embed/v1/view?key=${mapsData.apiKey}&center=${currentLocation.latitude},${currentLocation.longitude}&zoom=18`}
                  allowFullScreen
                ></iframe>
              </div>
            </CardFooter>
          )}
        </Card>
      )}
      
      {/* Previous Location */}
      {previousLocation && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Location</CardTitle>
            <CardDescription>
              Captured at {formatTimestamp(previousLocation.timestamp)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Coordinates:</p>
              <p className="font-medium">{formatCoords(previousLocation.latitude, previousLocation.longitude)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accuracy:</p>
              <p className="font-medium">{previousLocation.accuracy.toFixed(1)} meters</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LocationTestPage;