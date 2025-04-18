import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  UserX, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  ShieldCheck, 
  UserPlus,
  Eye,
  Home,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  ArrowDownCircle,
  ArrowUpCircle,
  FolderKanban
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: number;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  permissions?: {
    [key: string]: boolean;
  };
}

// Create user form schema
const createUserSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  employeeId: z.string().min(1, { message: "Employee ID is required" }),
  role: z.string().min(1, { message: "Role is required" }),
});

export default function UsersPage() {
  const { toast } = useToast();
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<{[key: string]: boolean}>({});
  
  // Create user form
  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      employeeId: "",
      role: "viewer",
    },
  });
  
  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  // Get pending registrations (users with isActive = false)
  const pendingUsers = users.filter((user: User) => !user.isActive) || [];
  const activeUsers = users.filter((user: User) => user.isActive) || [];
  
  // Approve user registration
  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error("Failed to approve user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User approved",
        description: "User registration has been approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to approve user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Reject user registration
  const rejectMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error("Failed to reject user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User rejected",
        description: "User registration has been rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to reject user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to update user role");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "User role has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete user
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "User has been deleted successfully",
      });
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
      setUserToDelete(null);
    },
  });
  
  // Create user
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createUserSchema>) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "New user has been created successfully",
      });
      setIsAddUserOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });
  
  // Update user permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: number; permissions: object }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/permissions`, { permissions });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Permissions updated",
        description: "User permissions have been updated successfully",
      });
      setIsPermissionsOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update permissions",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Handle form submission for new user
  const onSubmit = (data: z.infer<typeof createUserSchema>) => {
    createUserMutation.mutate(data);
  };
  
  // Open permissions dialog
  const openPermissionsDialog = (user: User) => {
    setSelectedUser(user);
    setUserPermissions(user.permissions || {});
    setIsPermissionsOpen(true);
  };
  
  // Save permissions
  const savePermissions = () => {
    if (selectedUser) {
      updatePermissionsMutation.mutate({
        userId: selectedUser.id,
        permissions: userPermissions,
      });
    }
  };
  
  // Handle role change
  const handleRoleChange = (userId: number, role: string) => {
    updateRoleMutation.mutate({ userId, role });
  };
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-600 hover:bg-red-700">Admin</Badge>;
      case "hr":
        return <Badge className="bg-blue-600 hover:bg-blue-700">HR</Badge>;
      case "viewer":
        return <Badge className="bg-green-600 hover:bg-green-700">Viewer</Badge>;
      default:
        return <Badge className="bg-gray-600 hover:bg-gray-700">{role}</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D3748]">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage user accounts and permissions</p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2C5282] hover:bg-[#1A365D]">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[475px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system. All users start with basic permissions.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input placeholder="E12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddUserOpen(false)}
                    disabled={createUserMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Manage User Permissions</DialogTitle>
              <DialogDescription>
                {selectedUser && 
                  `Configure menu visibility permissions for ${selectedUser.fullName} (${selectedUser.role})`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <h3 className="text-sm font-medium mb-3">Menu Visibility</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="dashboard"
                      checked={userPermissions?.dashboard || false}
                      onCheckedChange={(checked) => 
                        setUserPermissions({ ...userPermissions, dashboard: !!checked })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="dashboard"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                        Dashboard
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="employees"
                      checked={userPermissions?.employees || false}
                      onCheckedChange={(checked) => 
                        setUserPermissions({ ...userPermissions, employees: !!checked })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="employees"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                        Employees
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="projects"
                      checked={userPermissions?.projects || false}
                      onCheckedChange={(checked) => 
                        setUserPermissions({ ...userPermissions, projects: !!checked })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="projects"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <FolderKanban className="h-4 w-4 mr-2 text-muted-foreground" />
                        Projects
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="attendance"
                      checked={userPermissions?.attendance || false}
                      onCheckedChange={(checked) => 
                        setUserPermissions({ ...userPermissions, attendance: !!checked })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="attendance"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        Attendance
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="payroll"
                      checked={userPermissions?.payroll || false}
                      onCheckedChange={(checked) => 
                        setUserPermissions({ ...userPermissions, payroll: !!checked })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="payroll"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                        Payroll
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="expenditures"
                      checked={userPermissions?.expenditures || false}
                      onCheckedChange={(checked) => 
                        setUserPermissions({ ...userPermissions, expenditures: !!checked })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="expenditures"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <ArrowDownCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                        Expenditures
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="incomes"
                      checked={userPermissions?.incomes || false}
                      onCheckedChange={(checked) => 
                        setUserPermissions({ ...userPermissions, incomes: !!checked })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="incomes"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <ArrowUpCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                        Cash Receive
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="reports"
                      checked={userPermissions?.reports || false}
                      onCheckedChange={(checked) => 
                        setUserPermissions({ ...userPermissions, reports: !!checked })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="reports"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                        Reports
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="settings"
                      checked={userPermissions?.settings || false}
                      onCheckedChange={(checked) => 
                        setUserPermissions({ ...userPermissions, settings: !!checked })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="settings"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
                        Settings
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPermissionsOpen(false)}
                disabled={updatePermissionsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={savePermissions}
                disabled={updatePermissionsMutation.isPending}
              >
                {updatePermissionsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Pending Registrations */}
      {pendingUsers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-medium text-yellow-800 mb-2 flex items-center">
            <ShieldAlert className="h-5 w-5 mr-2" />
            Pending User Registrations ({pendingUsers.length})
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Requested On</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => approveMutation.mutate(user.id)}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => rejectMutation.mutate(user.id)}
                        disabled={rejectMutation.isPending}
                      >
                        {rejectMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Active Users Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800 flex items-center">
            <ShieldCheck className="h-5 w-5 mr-2 text-[#2C5282]" />
            Active Users ({activeUsers.length})
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getRoleBadge(user.role)}
                    <Select
                      defaultValue={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger className="w-[110px] h-8 ml-2">
                        <SelectValue placeholder="Change role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      onClick={() => openPermissionsDialog(user)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Permissions
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => setUserToDelete(user.id)}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user account
                            and all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteMutation.mutate(user.id)}
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : null}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}