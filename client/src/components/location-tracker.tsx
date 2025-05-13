import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle as ExclamationTriangleIcon, MapPin as MapPinIcon, RefreshCcw as RefreshCcwIcon } from "lucide-react";
import { loadGoogleMapsApi, getCurrentPosition } from '@/lib/utils/googleMaps';
import { useToast } from "@/hooks/use-toast";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LocationTrackerProps {
  onLocationCaptured?: (location: LocationData) => void;
  required?: boolean;
  buttonText?: string;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({
  onLocationCaptured,
  required = true,
  buttonText = "Capture Location"
}) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState<boolean>(false);
  const { toast } = useToast();

  // Load Google Maps API on component mount
  useEffect(() => {
    const initMaps = async () => {
      try {
        await loadGoogleMapsApi();
        setMapsLoaded(true);
      } catch (error: any) {
        console.error('Failed to load Google Maps API:', error);
        setError(`Maps service unavailable: ${error.message || 'Unknown error'}`);
      }
    };

    initMaps();
  }, []);

  const captureLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const position = await getCurrentPosition();
      
      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };
      
      setLocation(locationData);
      
      if (onLocationCaptured) {
        onLocationCaptured(locationData);
      }
      
      toast({
        title: "Location captured",
        description: "Your current location has been successfully recorded.",
      });
    } catch (error: any) {
      console.error('Error getting location:', error);
      setError(error.message || 'Unknown error getting location');
      
      toast({
        title: "Location error",
        description: error.message || "Failed to capture your location. Please check permissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinIcon className="h-5 w-5 text-primary" />
          Location Tracker
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {location ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Latitude:</span>
              <span>{location.latitude.toFixed(6)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Longitude:</span>
              <span>{location.longitude.toFixed(6)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Accuracy:</span>
              <Badge variant={location.accuracy < 30 ? "default" : "secondary"}>
                {location.accuracy.toFixed(1)} meters
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Captured:</span>
              <span className="text-sm text-muted-foreground">
                {new Date(location.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            {required ? (
              <p>Location tracking is required for attendance verification.</p>
            ) : (
              <p>Capture your current location for verification.</p>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={captureLocation} 
          disabled={loading || (!mapsLoaded && !error)} 
          className="w-full"
        >
          {loading ? (
            <>
              <RefreshCcwIcon className="mr-2 h-4 w-4 animate-spin" />
              Capturing...
            </>
          ) : location ? (
            <>
              <RefreshCcwIcon className="mr-2 h-4 w-4" />
              Update Location
            </>
          ) : (
            <>
              <MapPinIcon className="mr-2 h-4 w-4" />
              {buttonText}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LocationTracker;