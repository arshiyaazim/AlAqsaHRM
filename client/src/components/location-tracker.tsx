import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Check, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface LocationTrackerProps {
  employeeId?: number;
  onLocationCaptured?: (location: string, type: 'in' | 'out') => void;
}

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  error: string | null;
  loading: boolean;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ 
  employeeId,
  onLocationCaptured
}) => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);
  
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    address: null,
    error: null,
    loading: false
  });
  
  const [submitting, setSubmitting] = useState<{
    clockIn: boolean;
    clockOut: boolean;
  }>({
    clockIn: false,
    clockOut: false
  });
  
  // Load Google Maps API key
  useEffect(() => {
    const getApiKey = async () => {
      try {
        // Try to get the API key from the backend
        const token = localStorage.getItem('token');
        const response = await fetch('/api/maps/apikey', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setApiKey(data.apiKey);
        } else {
          console.error('Failed to load Google Maps API key');
          // Fallback to allow location capture without reverse geocoding
          setApiKey('PLACEHOLDER');
        }
      } catch (error) {
        console.error('Error loading Google Maps API key:', error);
        // Fallback to allow location capture without reverse geocoding
        setApiKey('PLACEHOLDER');
      }
    };
    
    getApiKey();
  }, []);
  
  // Capture the current location
  const captureLocation = async () => {
    setLocation(prev => ({ ...prev, loading: true, error: null }));
    
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: 'Geolocation is not supported by your browser'
      }));
      return;
    }
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      
      const { latitude, longitude, accuracy } = position.coords;
      
      // Store the location data
      setLocation(prev => ({
        ...prev,
        latitude,
        longitude,
        accuracy,
        loading: apiKey === null // Keep loading if we need to fetch the address
      }));
      
      // Get the address if API key is available
      if (apiKey && apiKey !== 'PLACEHOLDER') {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
              const address = data.results[0].formatted_address;
              setLocation(prev => ({
                ...prev,
                address,
                loading: false
              }));
            } else {
              setLocation(prev => ({
                ...prev,
                address: 'Location captured but address lookup failed',
                loading: false
              }));
            }
          } else {
            setLocation(prev => ({
              ...prev,
              address: 'Address lookup service unavailable',
              loading: false
            }));
          }
        } catch (error) {
          console.error('Error fetching address:', error);
          setLocation(prev => ({
            ...prev,
            address: 'Error fetching address',
            loading: false
          }));
        }
      } else {
        // If no API key, just use coordinates as the address
        setLocation(prev => ({
          ...prev,
          address: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
          loading: false
        }));
      }
    } catch (error: any) {
      console.error('Error getting location:', error);
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to get your location'
      }));
    }
  };
  
  // Handle clock in/out
  const handleAttendance = async (type: 'in' | 'out') => {
    // Make sure we have location data
    if (!location.latitude || !location.longitude) {
      toast({
        title: 'Location Required',
        description: 'Please capture your location first.',
        variant: 'destructive',
      });
      return;
    }
    
    // Set submitting state
    setSubmitting(prev => ({
      ...prev,
      [type === 'in' ? 'clockIn' : 'clockOut']: true
    }));
    
    try {
      // Prepare attendance data
      const attendanceData = {
        employeeId,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        type: type,
        timestamp: new Date().toISOString()
      };
      
      // Send attendance data to server
      const token = localStorage.getItem('token');
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(attendanceData)
      });
      
      if (response.ok) {
        // Success message
        toast({
          title: type === 'in' ? 'Clocked In Successfully' : 'Clocked Out Successfully',
          description: `Your attendance has been recorded at ${new Date().toLocaleTimeString()}`,
        });
        
        // Call the callback if provided
        if (onLocationCaptured) {
          onLocationCaptured(location.address || 'Unknown location', type);
        }
        
        // Reset location data for next entry
        setLocation({
          latitude: null,
          longitude: null,
          accuracy: null,
          address: null,
          error: null,
          loading: false
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record attendance');
      }
    } catch (error: any) {
      console.error(`Error recording ${type} attendance:`, error);
      toast({
        title: 'Attendance Recording Failed',
        description: error.message || 'An error occurred while recording attendance',
        variant: 'destructive',
      });
    } finally {
      // Reset submitting state
      setSubmitting(prev => ({
        ...prev,
        [type === 'in' ? 'clockIn' : 'clockOut']: false
      }));
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Location Tracker
        </CardTitle>
        <CardDescription>
          Track your field location for attendance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location status */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Current Location Status:</div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-3 w-3 rounded-full ${location.latitude ? 'bg-green-500' : 'bg-amber-500'}`}></span>
            {location.latitude 
              ? 'Location captured successfully' 
              : 'No location data - please capture your location'}
          </div>
          
          {location.accuracy && (
            <div className="text-xs text-muted-foreground">
              Accuracy: ±{Math.round(location.accuracy)} meters
            </div>
          )}
          
          {location.error && (
            <div className="text-sm text-destructive flex items-start gap-1 mt-1">
              <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{location.error}</span>
            </div>
          )}
        </div>
        
        {/* Address display */}
        {location.address && (
          <div className="p-3 bg-muted rounded-md">
            <div className="text-sm font-medium mb-1">Detected Location:</div>
            <div className="text-sm">{location.address}</div>
            
            {location.latitude && location.longitude && (
              <div className="text-xs text-muted-foreground mt-1">
                Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </div>
            )}
          </div>
        )}
        
        {/* Capture location button */}
        <Button 
          onClick={captureLocation} 
          variant="outline" 
          className="w-full"
          disabled={location.loading}
        >
          {location.loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting your location...
            </>
          ) : location.latitude ? (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Refresh Location
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Capture Location
            </>
          )}
        </Button>
      </CardContent>
      
      <Separator />
      
      <CardFooter className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          variant="default" 
          className="w-full" 
          onClick={() => handleAttendance('in')}
          disabled={!location.latitude || submitting.clockIn}
        >
          {submitting.clockIn ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Clocking In...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Clock In
            </>
          )}
        </Button>
        
        <Button 
          variant="outline"
          className="w-full"
          onClick={() => handleAttendance('out')}
          disabled={!location.latitude || submitting.clockOut}
        >
          {submitting.clockOut ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Clocking Out...
            </>
          ) : (
            <>
              <X className="mr-2 h-4 w-4" />
              Clock Out
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LocationTracker;