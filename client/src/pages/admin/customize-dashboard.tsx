import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield, Settings, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import useAuth from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Widget } from '@/components/admin/widget-builder';
// Import WidgetBuilder directly from file since export was changed
import WidgetBuilder from '@/components/admin/widget-builder';

export default function CustomizeDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('widgets');

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "This page is only accessible to admin users.",
        variant: "destructive"
      });
      navigate('/dashboard');
    }
  }, [user, navigate, toast]);

  // Fetch current dashboard configuration
  const { data: dashboardConfig, isLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/config'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/dashboard/config');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard configuration');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching dashboard config:', error);
        // Return default configuration if API endpoint doesn't exist yet
        return {
          widgets: [],
          settings: {
            refreshInterval: 60,
            defaultLayout: 'grid',
            theme: 'light'
          }
        };
      }
    },
    enabled: !!user && user.role === 'admin'
  });

  // Fetch available data sources for widgets
  const { data: dataSources = [] } = useQuery({
    queryKey: ['/api/admin/dashboard/data-sources'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/dashboard/data-sources');
        if (!response.ok) {
          throw new Error('Failed to fetch data sources');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching data sources:', error);
        // Return default data sources if API endpoint doesn't exist yet
        return [
          { id: 'employees', name: 'Employees', type: 'collection' },
          { id: 'attendance', name: 'Attendance', type: 'collection' },
          { id: 'projects', name: 'Projects', type: 'collection' },
          { id: 'payroll', name: 'Payroll', type: 'collection' },
          { id: 'system', name: 'System Stats', type: 'metrics' }
        ];
      }
    },
    enabled: !!user && user.role === 'admin'
  });

  // Save dashboard configuration
  const saveMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await apiRequest('POST', '/api/admin/dashboard/config', config);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save dashboard configuration');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard/config'] });
      toast({
        title: 'Dashboard Updated',
        description: 'Your dashboard configuration has been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Save Failed',
        description: (error as Error).message || 'An error occurred while saving the dashboard',
        variant: 'destructive'
      });
    }
  });

  // Handle saving widgets configuration
  const handleSaveWidgets = async (widgets: Widget[]) => {
    if (!dashboardConfig) return;
    
    await saveMutation.mutateAsync({
      ...dashboardConfig,
      widgets: widgets
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center space-x-4 mb-8">
          <div className="animate-pulse w-8 h-8 rounded-full bg-gray-200" />
          <div>
            <div className="animate-pulse h-6 w-40 bg-gray-200 rounded mb-2" />
            <div className="animate-pulse h-4 w-60 bg-gray-100 rounded" />
          </div>
        </div>
        
        <div className="animate-pulse h-8 w-full max-w-md bg-gray-200 rounded mb-8" />
        
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-40 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Access Restricted
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">This page is only accessible to users with admin privileges.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center space-x-4 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Dashboard Customization</h1>
          <p className="text-muted-foreground">
            Customize the dashboard experience for all users
          </p>
        </div>
      </div>

      <Tabs defaultValue={activeTab} className="space-y-8">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="widgets" className="flex-1" onClick={() => setActiveTab('widgets')}>
            Widgets
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex-1" onClick={() => setActiveTab('layout')}>
            Layout Options
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex-1" onClick={() => setActiveTab('permissions')}>
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="widgets" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Widget Configuration
              </CardTitle>
              <CardDescription>
                Add, remove, and configure dashboard widgets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WidgetBuilder 
                widgets={dashboardConfig?.widgets || []}
                onSave={handleSaveWidgets}
                availableDataSources={dataSources}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Layout Configuration</CardTitle>
              <CardDescription>
                Configure the overall dashboard layout
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Configure the layout options for the dashboard. These settings will apply to all users.
              </p>
              <p className="text-center text-sm text-muted-foreground italic">
                Layout configuration options will be implemented in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Widget Permissions</CardTitle>
              <CardDescription>
                Configure which user roles can see which widgets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Set visibility permissions for widgets based on user roles.
              </p>
              <p className="text-center text-sm text-muted-foreground italic">
                Permissions configuration will be implemented in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}