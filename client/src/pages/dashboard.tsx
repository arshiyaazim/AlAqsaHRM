import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Users, Clock, CalendarDays, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import useAuth from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import LocationTracker from '@/components/location-tracker';

const Dashboard = () => {
  // Check authentication state from token directly to avoid race conditions
  const token = localStorage.getItem('token');
  const isAuthenticatedFromToken = !!token;
  
  // Get the user info directly from localStorage to avoid hook issues
  const userStr = localStorage.getItem('user');
  let userFromStorage = null;
  if (userStr) {
    try {
      userFromStorage = JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }
  
  // Use try/catch to prevent hook errors if Auth context isn't available
  let authData = { user: userFromStorage, isAuthenticated: isAuthenticatedFromToken };
  try {
    const hookData = useAuth();
    // Only use hook data if it contains a user
    if (hookData && hookData.user) {
      authData = hookData;
    }
  } catch (error) {
    console.error('Auth context not available, using localStorage data instead');
  }
  
  const { user, isAuthenticated = isAuthenticatedFromToken } = authData;
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Redirect to login if not authenticated (with token fallback)
  useEffect(() => {
    if (!isAuthenticated && !isAuthenticatedFromToken) {
      navigate('/auth');
    }
  }, [isAuthenticated, isAuthenticatedFromToken, navigate]);

  // Fetch dashboard data with fallback values
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['/api/dashboard'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/dashboard', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (!response.ok) {
          console.log('Dashboard API response not OK, status:', response.status);
          // Return default data for all error cases
          return {
            id: 1,
            date: new Date().toISOString().split('T')[0],
            totalEmployees: 0,
            activeEmployees: 0,
            todayAttendance: 0,
            employee_count: 0,
            today_attendance: 0
          };
        }
        
        const data = await response.json();
        console.log('Dashboard data received:', data);
        return data;
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        // Return default data for any exception
        return {
          id: 1,
          date: new Date().toISOString().split('T')[0],
          totalEmployees: 0,
          activeEmployees: 0,
          todayAttendance: 0,
          employee_count: 0,
          today_attendance: 0
        };
      }
    },
    enabled: !!isAuthenticated,
    // Provide default/fallback data
    placeholderData: {
      id: 1,
      date: new Date().toISOString().split('T')[0],
      totalEmployees: 0,
      activeEmployees: 0,
      todayAttendance: 0,
      employee_count: 0,
      today_attendance: 0
    }
  });

  // Fetch company information
  const { data: companyData, isLoading: isCompanyLoading } = useQuery({
    queryKey: ['/api/company'],
    queryFn: async () => {
      const response = await fetch('/api/company');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load company data');
      }
      
      return response.json();
    },
  });

  // Handle dashboard data error
  useEffect(() => {
    if (dashboardError) {
      toast({
        title: 'Dashboard Error',
        description: (dashboardError as Error).message || 'Failed to load dashboard data',
        variant: 'destructive',
      });
    }
  }, [dashboardError, toast]);

  // Show skeleton while loading
  if (isDashboardLoading || isCompanyLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Skeleton className="h-10 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-1/3 mb-1" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-14 w-1/2 my-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {companyData?.name || 'Field Attendance Tracker'} Dashboard
        </h1>
        <p className="text-muted-foreground">
          {companyData?.tagline || 'Monitor and manage field attendance'}
        </p>
      </div>
      
      {user && (
        <div className="mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Welcome, {user.fullName || user.firstName}
              </CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <p><strong>Role:</strong> {user.role}</p>
                {user.employeeId && <p><strong>Employee ID:</strong> {user.employeeId}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Employees
            </CardTitle>
            <CardDescription>Total registered employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboardData?.employee_count || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Today's Attendance
            </CardTitle>
            <CardDescription>Employees checked in today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboardData?.today_attendance || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Date
            </CardTitle>
            <CardDescription>Current tracking period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Location Tracker Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Record Attendance</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LocationTracker 
            employeeId={user?.id} 
            onLocationCaptured={(location, type) => {
              toast({
                title: `${type === 'in' ? 'Checked In' : 'Checked Out'} Successfully`,
                description: `Your location has been recorded: ${location}`,
                variant: 'default',
              });
            }} 
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Location Information
              </CardTitle>
              <CardDescription>
                How location tracking works
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ul className="space-y-2">
                <li>Your location is only recorded when you check in or out</li>
                <li>GPS accuracy may vary based on your device and environment</li>
                <li>You can view your attendance history from the Attendance page</li>
                <li>For more detailed location testing, visit the Location Test page</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Quick Access Buttons */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Button onClick={() => navigate('/attendance')} variant="outline" className="h-auto py-4 justify-start">
            <Clock className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">View Attendance</div>
              <div className="text-xs text-muted-foreground">Check attendance records</div>
            </div>
          </Button>
          
          <Button onClick={() => navigate('/employees')} variant="outline" className="h-auto py-4 justify-start">
            <Users className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Employees</div>
              <div className="text-xs text-muted-foreground">Manage employee records</div>
            </div>
          </Button>
          
          <Button onClick={() => navigate('/location-test')} variant="outline" className="h-auto py-4 justify-start">
            <MapPin className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Location Test</div>
              <div className="text-xs text-muted-foreground">Test GPS location tracking</div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;