import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Calendar, Clock, Camera, Upload, WifiOff, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Employee {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

interface Project {
  id: number;
  name: string;
}

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  errorMessage: string | null;
}

interface AttendanceRecord {
  id?: number;
  employeeId: string;
  projectId: number | null;
  action: 'checkIn' | 'checkOut';
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  photoUrl?: string | null;
  remarks: string | null;
  isOffline?: boolean;
}

export default function MobileAttendancePage() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [action, setAction] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [remarks, setRemarks] = useState<string>('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: null,
    longitude: null,
    accuracy: null,
    errorMessage: null,
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [offlineRecords, setOfflineRecords] = useState<AttendanceRecord[]>([]);
  const [apiError, setApiError] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Error handling helper for API errors
  const handleApiError = () => {
    if (!apiError) {
      setApiError(true);
      toast({
        title: "Connection Issue",
        description: "Having trouble connecting to the server. You can still record attendance offline.",
        variant: "destructive",
      });
    }
  };

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'You are online',
        description: 'Your attendance records will be synced to the server.',
      });
      syncOfflineRecords();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'You are offline',
        description: 'Your attendance will be saved locally and synced when you go online.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline records from localStorage
  useEffect(() => {
    const savedRecords = localStorage.getItem('offlineAttendanceRecords');
    if (savedRecords) {
      try {
        setOfflineRecords(JSON.parse(savedRecords));
      } catch (error) {
        console.error('Error parsing offline records:', error);
      }
    }
  }, []);

  // Update offline records in localStorage when they change
  useEffect(() => {
    if (offlineRecords.length > 0) {
      localStorage.setItem('offlineAttendanceRecords', JSON.stringify(offlineRecords));
    }
  }, [offlineRecords]);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationData({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            errorMessage: null,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationData({
            latitude: null,
            longitude: null,
            accuracy: null,
            errorMessage: `Error getting location: ${error.message}`,
          });
          toast({
            title: 'Location Error',
            description: `Please enable location services to use attendance tracking: ${error.message}`,
            variant: 'destructive',
          });
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationData({
        latitude: null,
        longitude: null,
        accuracy: null,
        errorMessage: 'Geolocation is not supported by this browser.',
      });
      toast({
        title: 'Location Error',
        description: 'Your device does not support location tracking, which is required for attendance.',
        variant: 'destructive',
      });
    }
  }, []);

  // Fetch employees with error handling
  const { data: employees = [], isError: isEmployeesError } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once
    refetchOnWindowFocus: false,
    enabled: navigator.onLine // Only fetch when online
  });

  // Fetch projects with error handling
  const { data: projects = [], isError: isProjectsError } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once
    refetchOnWindowFocus: false,
    enabled: navigator.onLine // Only fetch when online
  });
  
  // Handle any API errors
  useEffect(() => {
    if (isEmployeesError || isProjectsError) {
      handleApiError();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployeesError, isProjectsError]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setPhoto(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const syncOfflineRecords = async () => {
    if (!isOnline || offlineRecords.length === 0) return;
    
    const recordsToSync = [...offlineRecords];
    let successCount = 0;
    let errorCount = 0;
    
    for (const record of recordsToSync) {
      try {
        await apiRequest('POST', '/api/attendance', record);
        successCount++;
        setOfflineRecords(prev => prev.filter(r => 
          !(r.employeeId === record.employeeId && 
            r.timestamp === record.timestamp)
        ));
      } catch (error) {
        console.error('Error syncing record:', error);
        errorCount++;
      }
    }
    
    if (successCount > 0) {
      toast({
        title: 'Offline Records Synced',
        description: `Successfully synced ${successCount} attendance records.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    }
    
    if (errorCount > 0) {
      toast({
        title: 'Sync Error',
        description: `Failed to sync ${errorCount} records. They will be retried later.`,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!selectedEmployeeId) {
      toast({
        title: 'Input Required',
        description: 'Please select an employee ID',
        variant: 'destructive',
      });
      return;
    }
    
    if (!locationData.latitude || !locationData.longitude) {
      toast({
        title: 'Location Required',
        description: 'Please enable location services to record attendance',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create attendance record
      const timestamp = new Date().toISOString();
      const record: AttendanceRecord = {
        employeeId: selectedEmployeeId,
        projectId: selectedProjectId,
        action,
        timestamp,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        remarks,
      };
      
      // Handle the photo upload if there is one
      if (photo) {
        const formData = new FormData();
        formData.append('file', photo);
        
        if (isOnline) {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (uploadRes.ok) {
            const fileData = await uploadRes.json();
            record.photoUrl = fileData.url;
          }
        } else {
          // In offline mode, store base64 image temporarily
          record.photoUrl = photoPreview;
        }
      }
      
      if (isOnline) {
        try {
          // If online, attempt to send to the server
          await apiRequest('POST', '/api/attendance', record);
          queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
          
          toast({
            title: 'Success',
            description: `${action === 'checkIn' ? 'Check-in' : 'Check-out'} recorded successfully`,
          });
        } catch (error) {
          console.error('Error submitting to server, saving locally:', error);
          // If API call fails, store locally as fallback
          record.isOffline = true;
          setOfflineRecords(prev => [...prev, record]);
          toast({
            title: 'Saved Locally',
            description: 'Could not connect to server. Record saved locally and will sync later.',
            variant: 'destructive',
          });
        }
      } else {
        // If offline, store locally
        record.isOffline = true;
        setOfflineRecords(prev => [...prev, record]);
        toast({
          title: 'Saved Offline',
          description: `${action === 'checkIn' ? 'Check-in' : 'Check-out'} saved locally and will sync when online`,
        });
      }
      
      // Reset form
      setRemarks('');
      setPhoto(null);
      setPhotoPreview(null);
      
      // Switch action if necessary
      if (action === 'checkIn') {
        setAction('checkOut');
      } else {
        setAction('checkIn');
        setSelectedEmployeeId('');
        setSelectedProjectId(null);
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to record attendance. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Format location for display
  const formattedLocation = locationData.latitude && locationData.longitude
    ? `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`
    : 'Getting location...';

  const locationAccuracy = locationData.accuracy
    ? `±${Math.round(locationData.accuracy)} meters`
    : '';

  return (
    <div className="container py-6 max-w-md mx-auto">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Mobile Attendance</h1>
          <p className="text-muted-foreground text-sm">
            {isOnline ? (
              <span className="flex items-center justify-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" /> Online Mode
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1 text-amber-600">
                <WifiOff className="h-4 w-4" /> Offline Mode - Data will sync when online
              </span>
            )}
          </p>
        </div>
        
        {offlineRecords.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-1">
                <WifiOff className="h-4 w-4" /> Pending Offline Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-amber-700 mb-2">
                {offlineRecords.length} record(s) waiting to be synced when you're back online
              </p>
              {isOnline && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs" 
                  onClick={syncOfflineRecords}
                >
                  Sync Now
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee ID</Label>
            <Select 
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger id="employeeId">
                <SelectValue placeholder="Select Employee ID" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem 
                    key={employee.id} 
                    value={employee.employeeId}
                  >
                    {employee.employeeId} - {employee.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="projectId">Project</Label>
            <Select 
              value={selectedProjectId?.toString() || 'none'}
              onValueChange={(value) => setSelectedProjectId(value !== 'none' ? parseInt(value) : null)}
            >
              <SelectTrigger id="projectId">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                {projects.map((project) => (
                  <SelectItem 
                    key={project.id} 
                    value={project.id.toString()}
                  >
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="action">Action</Label>
            <Select 
              value={action}
              onValueChange={(value) => setAction(value as 'checkIn' | 'checkOut')}
            >
              <SelectTrigger id="action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checkIn">Check In</SelectItem>
                <SelectItem value="checkOut">Check Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Label>Current Location</Label>
            </div>
            <div className="text-sm bg-slate-50 p-2 rounded border">
              {locationData.errorMessage ? (
                <span className="text-red-500">{locationData.errorMessage}</span>
              ) : (
                <div className="flex flex-col">
                  <span>{formattedLocation}</span>
                  {locationAccuracy && (
                    <span className="text-xs text-muted-foreground">{locationAccuracy}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label>Date & Time</Label>
            </div>
            <div className="text-sm bg-slate-50 p-2 rounded border">
              {new Date().toLocaleString()}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="photo" className="flex items-center gap-1">
              <Camera className="h-4 w-4 text-muted-foreground" />
              Take Photo (Optional)
            </Label>
            <div className="flex flex-col items-center gap-2">
              {photoPreview && (
                <div className="relative w-full">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full h-auto max-h-48 object-cover rounded-md" 
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-1 right-1 bg-white rounded-full p-1"
                  >
                    <XCircle className="h-5 w-5 text-red-500" />
                  </button>
                </div>
              )}
              {!photoPreview && (
                <div className="w-full">
                  <label 
                    htmlFor="photo" 
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to capture</span>
                      </p>
                      <p className="text-xs text-gray-500">photo for verification</p>
                    </div>
                    <input 
                      id="photo" 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks (Optional)</Label>
            <Textarea
              id="remarks"
              placeholder="Add any additional notes..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="h-24"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !locationData.latitude || !locationData.longitude}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>{action === 'checkIn' ? 'Check In' : 'Check Out'}</span>
              </div>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}