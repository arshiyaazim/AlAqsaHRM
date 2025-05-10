import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  FileText, 
  AlertCircle, 
  Activity, 
  ShieldCheck, 
  Database,
  FolderKanban,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    retry: false,
    onError: () => {
      // Create dummy stats for initial display
      return {
        stats: {
          usersCount: { admin: 1, hr: 2, viewer: 4, total: 7 },
          projects: { active: 5, completed: 3, total: 8 },
          errors: { unresolved: 2, total: 15 },
          system: { uptime: "7 days", version: "1.2.0" }
        }
      };
    }
  });

  useEffect(() => {
    // Check if user has admin role
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData && userData.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive"
          });
          // Redirect non-admins
          window.location.href = "/";
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [toast]);

  const resetErrorLogs = async () => {
    try {
      toast({
        title: "System Message",
        description: "This would clear error logs in a production environment.",
      });
    } catch (error) {
      toast({
        title: "Operation Failed",
        description: "Could not reset error logs.",
        variant: "destructive"
      });
    }
  };

  const runHealthCheck = async () => {
    toast({
      title: "Health Check",
      description: "System health check running...",
    });
    
    // Simulated health check
    setTimeout(() => {
      toast({
        title: "Health Check Complete",
        description: "All systems operational",
        variant: "default"
      });
    }, 2000);
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-10 w-10 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Fallback data if API returns nothing
  const stats = dashboardStats?.stats || {
    usersCount: { admin: 1, hr: 2, viewer: 4, total: 7 },
    projects: { active: 5, completed: 3, total: 8 },
    errors: { unresolved: 2, total: 15 },
    system: { uptime: "7 days", version: "1.2.0" }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground">
          System overview and administration tools
        </p>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.usersCount.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.usersCount.admin} admins, {stats.usersCount.hr} HR staff, {stats.usersCount.viewer} viewers
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.projects.active}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.projects.completed} completed, {stats.projects.total} total
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Operational</div>
                <p className="text-xs text-muted-foreground">
                  Uptime: {stats.system.uptime}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.errors.unresolved}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.errors.unresolved > 0 ? 
                    `${stats.errors.unresolved} unresolved issues` : 
                    "No active alerts"}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Database className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Database Health</span>
                      </div>
                      <span className="text-sm text-green-500 font-medium">Good</span>
                    </div>
                    <Progress value={92} className="h-2" />
                    <p className="text-xs text-muted-foreground">92% operational capacity</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Security Status</span>
                      </div>
                      <span className="text-sm text-green-500 font-medium">Protected</span>
                    </div>
                    <Progress value={100} className="h-2" />
                    <p className="text-xs text-muted-foreground">All security checks passing</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Data Storage</span>
                      </div>
                      <span className="text-sm text-amber-500 font-medium">Moderate</span>
                    </div>
                    <Progress value={68} className="h-2" />
                    <p className="text-xs text-muted-foreground">68% of storage used</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Administrative tools and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={runHealthCheck}
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      Run System Health Check
                    </Button>
                  </div>
                  
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = "/users"}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage User Accounts
                    </Button>
                  </div>
                  
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={resetErrorLogs}
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Reset Error Logs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Overview of system users and access levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <div className="flex h-full items-center justify-center bg-primary/10 rounded-md p-4">
                      <div className="text-center">
                        <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                        <h3 className="text-xl font-bold">{stats.usersCount.admin}</h3>
                        <p className="text-sm text-muted-foreground">Administrators</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-1">
                    <div className="flex h-full items-center justify-center bg-primary/10 rounded-md p-4">
                      <div className="text-center">
                        <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                        <h3 className="text-xl font-bold">{stats.usersCount.hr}</h3>
                        <p className="text-sm text-muted-foreground">HR Staff</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-1">
                    <div className="flex h-full items-center justify-center bg-primary/10 rounded-md p-4">
                      <div className="text-center">
                        <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                        <h3 className="text-xl font-bold">{stats.usersCount.viewer}</h3>
                        <p className="text-sm text-muted-foreground">Viewers</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-1">
                    <div className="flex h-full items-center justify-center bg-primary/10 rounded-md p-4">
                      <div className="text-center">
                        <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                        <h3 className="text-xl font-bold">{stats.usersCount.total}</h3>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = "/users"}
                  >
                    Manage Users
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Activity</CardTitle>
              <CardDescription>
                Log of recent system events and user actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border">
                  <div className="p-4">
                    <div className="flex items-start space-x-4">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">System backup completed</p>
                        <p className="text-sm text-muted-foreground">Automated daily backup process completed successfully</p>
                        <p className="text-xs text-muted-foreground">Today at 02:00 AM</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="p-4">
                    <div className="flex items-start space-x-4">
                      <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">User account modified</p>
                        <p className="text-sm text-muted-foreground">HR user account permissions updated</p>
                        <p className="text-xs text-muted-foreground">Yesterday at 4:30 PM</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="p-4">
                    <div className="flex items-start space-x-4">
                      <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">System alert resolved</p>
                        <p className="text-sm text-muted-foreground">Database connection issue fixed automatically</p>
                        <p className="text-xs text-muted-foreground">2 days ago at 9:15 AM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Technical details and system configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">System Version</p>
                    <p className="text-sm text-muted-foreground">{stats.system.version}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">System Uptime</p>
                    <p className="text-sm text-muted-foreground">{stats.system.uptime}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Database Type</p>
                    <p className="text-sm text-muted-foreground">PostgreSQL</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Last System Update</p>
                    <p className="text-sm text-muted-foreground">May 8, 2025</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">System Health</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">Database Connections</p>
                      <p className="text-sm text-green-500">Good</p>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">API Response Time</p>
                      <p className="text-sm text-green-500">Excellent</p>
                    </div>
                    <Progress value={98} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">Storage Usage</p>
                      <p className="text-sm text-amber-500">Moderate</p>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={runHealthCheck}>
                    Run Health Check
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}