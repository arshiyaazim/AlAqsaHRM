import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { calculateDistance } from '@/lib/utils/googleMaps';
import { Button } from '@/components/ui/button';
import LocationTracker from '@/components/location-tracker';
import { MapPin as MapPinIcon, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface ProjectLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

// Sample project locations for testing
const sampleProjects: ProjectLocation[] = [
  { 
    id: 1, 
    name: "Main Office",
    latitude: 31.5204, 
    longitude: 74.3587, 
    radius: 100 // meters
  },
  { 
    id: 2, 
    name: "Site A Construction", 
    latitude: 31.5382, 
    longitude: 74.3073, 
    radius: 200 // meters
  },
  { 
    id: 3, 
    name: "Building Project B", 
    latitude: 31.5133, 
    longitude: 74.2938, 
    radius: 150 // meters
  }
];

const LocationTestPage: React.FC = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    distance?: number;
    project?: ProjectLocation;
  } | null>(null);
  const { toast } = useToast();

  const handleLocationCapture = (locationData: LocationData) => {
    setLocation(locationData);
    setVerificationResult(null);
  };

  const verifyLocation = () => {
    if (!location) return;

    // Find the closest project location
    let closestProject: ProjectLocation | null = null;
    let minDistance = Number.MAX_VALUE;

    sampleProjects.forEach(project => {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        project.latitude,
        project.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestProject = project;
      }
    });

    if (!closestProject) return;

    // Check if within the allowed radius
    const isWithinRadius = minDistance <= closestProject.radius;

    setVerificationResult({
      verified: isWithinRadius,
      distance: minDistance,
      project: closestProject
    });

    toast({
      title: isWithinRadius ? "Location Verified" : "Location Verification Failed",
      description: isWithinRadius 
        ? `You are at ${closestProject.name}, ${Math.round(minDistance)}m from center.` 
        : `You are ${Math.round(minDistance)}m away from ${closestProject.name}. Must be within ${closestProject.radius}m.`,
      variant: isWithinRadius ? "default" : "destructive",
    });
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Location Test</h1>
          <p className="text-muted-foreground">
            Test GPS location tracking and verification
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <LocationTracker onLocationCaptured={handleLocationCapture} />
          
          <div className="mt-4">
            <Button 
              onClick={verifyLocation} 
              disabled={!location} 
              className="w-full"
            >
              <MapPinIcon className="mr-2 h-4 w-4" />
              Verify Location Against Projects
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Locations</CardTitle>
              <CardDescription>
                Sample project locations for testing verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sampleProjects.map(project => (
                <div key={project.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {project.latitude.toFixed(4)}, {project.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-sm">
                    Radius: <span className="font-medium">{project.radius}m</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {verificationResult && (
            <Card>
              <CardHeader>
                <CardTitle>Verification Result</CardTitle>
              </CardHeader>
              <CardContent>
                {verificationResult.verified ? (
                  <Alert>
                    <MapPinIcon className="h-4 w-4" />
                    <AlertTitle>Location Verified</AlertTitle>
                    <AlertDescription>
                      You are currently at {verificationResult.project?.name}, 
                      approximately {Math.round(verificationResult.distance || 0)} meters
                      from the center point.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertTitle>Verification Failed</AlertTitle>
                    <AlertDescription>
                      You are approximately {Math.round(verificationResult.distance || 0)} meters 
                      away from {verificationResult.project?.name}. You must be within {verificationResult.project?.radius} meters
                      to verify your attendance.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationTestPage;