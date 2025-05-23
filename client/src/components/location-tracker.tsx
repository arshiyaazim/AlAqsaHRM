import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock, Check, X } from 'lucide-react';
import { getCurrentPosition } from '@/lib/utils/googleMaps';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface LocationTrackerProps {
  employeeId?: number;
  onLocationCaptured?: (location: string, type: 'in' | 'out') => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ 
  employeeId, 
  onLocationCaptured 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [action, setAction] = useState<'in' | 'out' | null>(null);
  const { toast } = useToast();

  // Function to get current location
  const captureLocation = async (type: 'in' | 'out') => {
    setIsLoading(true);
    setAction(type);
    setErrorMessage(null);

    try {
      const position = await getCurrentPosition();
      
      // Create location data
      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };
      
      setLastLocation(locationData);
      
      // Format as string for database (Latitude,Longitude)
      const locationString = `${position.coords.latitude},${position.coords.longitude}`;
      
      // If callback provided, send the location
      if (onLocationCaptured) {
        onLocationCaptured(locationString, type);
      }
      
      // If employee ID provided, also record it to the API
      if (employeeId) {
        try {
          const response = await apiRequest('POST', '/api/attendance/record', {
            employeeId,
            type,
            location: locationString,
            timestamp: new Date().toISOString()
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to record attendance');
          }
          
          toast({
            title: `${type === 'in' ? 'Check In' : 'Check Out'} Successful`,
            description: `Your ${type === 'in' ? 'arrival' : 'departure'} has been recorded.`,
            variant: 'default',
          });
        } catch (apiError) {
          console.error('API error:', apiError);
          toast({
            title: 'Unable to Save',
            description: `Location captured but could not be saved. Please try again later.`,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      setErrorMessage((error as Error).message || 'Failed to capture location');
      toast({
        title: 'Location Error',
        description: (error as Error).message || 'Failed to capture your location',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format coordinates for display
  const formatCoords = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Attendance Location
        </CardTitle>
        <CardDescription>
          Record your location for attendance tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between gap-2">
          <Button
            variant="default"
            className="flex-1"
            onClick={() => captureLocation('in')}
            disabled={isLoading}
          >
            {isLoading && action === 'in' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Check In
          </Button>
          
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => captureLocation('out')}
            disabled={isLoading}
          >
            {isLoading && action === 'out' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            Check Out
          </Button>
        </div>
        
        {errorMessage && (
          <div className="text-destructive text-sm p-2 bg-destructive/10 rounded-md">
            {errorMessage}
          </div>
        )}
        
        {lastLocation && (
          <div className="text-sm space-y-2 mt-4 p-3 bg-muted rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">Location:</span>
              <span>{formatCoords(lastLocation.latitude, lastLocation.longitude)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Accuracy:</span>
              <span>{lastLocation.accuracy.toFixed(1)} meters</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Time:</span>
              <span>{new Date(lastLocation.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Status:</span>
              <Badge variant={action === 'in' ? 'default' : 'secondary'}>
                {action === 'in' ? 'Checked In' : 'Checked Out'}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationTracker;