import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Link, 
  ArrowLeftRight,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  Calculator
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define the schema for field connection forms
const connectionFormSchema = z.object({
  sourceField: z.string({
    required_error: "Please select a source field",
  }),
  targetField: z.string({
    required_error: "Please select a target field",
  }),
  connectionType: z.string({
    required_error: "Please select a connection type",
  }),
  formula: z.string().optional(),
  description: z.string().optional(),
});

// Sample connection types
const connectionTypes = [
  { id: "direct", name: "Direct Copy", description: "Copy value directly" },
  { id: "add", name: "Addition", description: "Add source to target" },
  { id: "subtract", name: "Subtraction", description: "Subtract source from target" },
  { id: "multiply", name: "Multiplication", description: "Multiply target by source" },
  { id: "divide", name: "Division", description: "Divide target by source" },
  { id: "custom", name: "Custom Formula", description: "Custom calculation formula" },
];

export default function FieldConnectionsPage() {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingConnection, setEditingConnection] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");

  const form = useForm<z.infer<typeof connectionFormSchema>>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      sourceField: "",
      targetField: "",
      connectionType: "direct",
      formula: "",
      description: "",
    },
  });

  // Mock field data until API is available
  const fields = [
    { id: "1", name: "Employee Name", form: "employees", type: "text" },
    { id: "2", name: "Employee ID", form: "employees", type: "text" },
    { id: "3", name: "Salary", form: "payroll", type: "number" },
    { id: "4", name: "Bonus", form: "payroll", type: "number" },
    { id: "5", name: "Total Pay", form: "payroll", type: "number" },
    { id: "6", name: "Hours Worked", form: "attendance", type: "number" },
    { id: "7", name: "Overtime Hours", form: "attendance", type: "number" },
  ];

  // Initial connections data
  const initialConnections = [
    { 
      id: "1", 
      sourceField: "3", 
      targetField: "5", 
      connectionType: "add", 
      formula: "", 
      description: "Add salary to total pay",
      active: true
    },
    { 
      id: "2", 
      sourceField: "4", 
      targetField: "5", 
      connectionType: "add", 
      formula: "", 
      description: "Add bonus to total pay",
      active: true
    },
    { 
      id: "3", 
      sourceField: "6", 
      targetField: "7", 
      connectionType: "custom", 
      formula: "IF(src {'>'} 8, src - 8, 0)", 
      description: "Calculate overtime hours",
      active: false
    },
  ];

  // Query for connections data
  const { data: connectionsData, isLoading } = useQuery({
    queryKey: ['/api/admin/field-connections'],
    onError: () => {
      // Return mock data if API fails
      return { connections: initialConnections };
    }
  });

  // Connections data - use mock if API fails
  const connections = connectionsData?.connections || initialConnections;

  // Mutations for connections
  const addConnectionMutation = useMutation({
    mutationFn: async (connectionData: any) => {
      return await apiRequest('POST', '/api/admin/field-connections', connectionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/field-connections'] });
      toast({
        title: "Connection Added",
        description: "Field connection has been created successfully.",
      });
      setOpenDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create connection. " + (error as Error).message,
        variant: "destructive",
      });
    }
  });

  const updateConnectionMutation = useMutation({
    mutationFn: async (connectionData: any) => {
      return await apiRequest('PATCH', `/api/admin/field-connections/${connectionData.id}`, connectionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/field-connections'] });
      toast({
        title: "Connection Updated",
        description: "Field connection has been updated successfully.",
      });
      setOpenDialog(false);
      setEditingConnection(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update connection. " + (error as Error).message,
        variant: "destructive",
      });
    }
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/field-connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/field-connections'] });
      toast({
        title: "Connection Deleted",
        description: "Field connection has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete connection. " + (error as Error).message,
        variant: "destructive",
      });
    }
  });

  const toggleConnectionMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return await apiRequest('PATCH', `/api/admin/field-connections/${id}/toggle`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/field-connections'] });
      toast({
        title: "Connection Updated",
        description: "Connection status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update connection status. " + (error as Error).message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: z.infer<typeof connectionFormSchema>) => {
    if (editingConnection) {
      updateConnectionMutation.mutate({
        id: editingConnection.id,
        ...values
      });
    } else {
      addConnectionMutation.mutate(values);
    }
  };

  const handleEdit = (connection: any) => {
    setEditingConnection(connection);
    form.reset({
      sourceField: connection.sourceField,
      targetField: connection.targetField,
      connectionType: connection.connectionType,
      formula: connection.formula || "",
      description: connection.description || "",
    });
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this connection?")) {
      deleteConnectionMutation.mutate(id);
    }
  };

  const toggleConnectionStatus = (id: string, currentStatus: boolean) => {
    toggleConnectionMutation.mutate({ id, active: !currentStatus });
  };

  // Filter connections based on active tab
  const filteredConnections = connections.filter(connection => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return connection.active;
    if (activeTab === "inactive") return !connection.active;
    return true;
  });

  // Check admin access
  useEffect(() => {
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
          window.location.href = "/";
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else {
      toast({
        title: "Authentication Required",
        description: "Please log in to access this page.",
        variant: "destructive"
      });
      window.location.href = "/auth";
    }
  }, [toast]);

  // Reset form when dialog is closed
  useEffect(() => {
    if (!openDialog) {
      setEditingConnection(null);
      form.reset();
    }
  }, [openDialog, form]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Field Connections</h2>
          <p className="text-muted-foreground">
            Manage data flow between form fields
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingConnection ? "Edit Connection" : "Create Connection"}</DialogTitle>
              <DialogDescription>
                Define how data flows between fields in different forms.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sourceField"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Field</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source field" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fields.map(f => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name} ({f.form})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Field that provides the data
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetField"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Field</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select target field" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fields.map(f => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name} ({f.form})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Field that receives the data
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="connectionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Connection Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select connection type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {connectionTypes.map(type => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How the source field's value affects the target field
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.watch("connectionType") === "custom" && (
                  <FormField
                    control={form.control}
                    name="formula"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Formula</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., IF(src {'>'} 40, src * 1.5, src)" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Use 'src' for source value and 'tgt' for target value
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Add description of this connection" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Optional description to explain this connection
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpenDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={addConnectionMutation.isPending || updateConnectionMutation.isPending}
                  >
                    {editingConnection ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Field Connections</CardTitle>
              <CardDescription>
                Define how data flows between fields across different forms
              </CardDescription>
            </div>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">
              <Link className="h-10 w-10 text-primary animate-pulse mx-auto mb-4" />
              <p className="text-muted-foreground">Loading connections...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Source Field</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Target Field</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConnections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="space-y-2">
                        <Link className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p>No field connections found.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setOpenDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" /> 
                          Create your first connection
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConnections.map((connection) => {
                    const sourceField = fields.find(f => f.id === connection.sourceField);
                    const targetField = fields.find(f => f.id === connection.targetField);
                    const connectionType = connectionTypes.find(t => t.id === connection.connectionType);
                    
                    return (
                      <TableRow key={connection.id}>
                        <TableCell>
                          <Badge 
                            variant={connection.active ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleConnectionStatus(connection.id, connection.active)}
                          >
                            {connection.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sourceField ? (
                            <div>
                              <p className="font-medium">{sourceField.name}</p>
                              <p className="text-sm text-muted-foreground">{sourceField.form}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Unknown field</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {connectionType ? connectionType.name : connection.connectionType}
                            </span>
                            {connection.connectionType === "custom" && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Calculator className="h-3 w-3" />
                                Formula
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {targetField ? (
                            <div>
                              <p className="font-medium">{targetField.name}</p>
                              <p className="text-sm text-muted-foreground">{targetField.form}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Unknown field</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {connection.description || (
                            <span className="text-muted-foreground italic">No description</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEdit(connection)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDelete(connection.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Understanding Field Connections</CardTitle>
          <CardDescription>
            How data flows between fields in your forms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-yellow-50 flex items-start space-x-4">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium mb-1">Important Notes</h4>
                <ul className="text-sm space-y-2 list-disc pl-4">
                  <li>Connections are processed in creation order</li>
                  <li>Circular dependencies may cause unexpected results</li>
                  <li>When using custom formulas, be careful with division operations (check for zero values)</li>
                  <li>All connections can be temporarily disabled without deleting them</li>
                </ul>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Connection Types</h4>
                <ul className="space-y-2">
                  {connectionTypes.map(type => (
                    <li key={type.id} className="flex items-start space-x-2">
                      <Calculator className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Custom Formula Examples</h4>
                <ul className="space-y-2 text-sm">
                  <li className="p-2 border rounded-md">
                    <code className="bg-slate-100 px-1">IF(src {'>'} 40, src * 1.5, src)</code> 
                    <p className="text-muted-foreground mt-1">If source is greater than 40, apply 1.5x multiplier</p>
                  </li>
                  <li className="p-2 border rounded-md">
                    <code className="bg-slate-100 px-1">src * 0.1 + tgt</code> 
                    <p className="text-muted-foreground mt-1">Add 10% of source to the target value</p>
                  </li>
                  <li className="p-2 border rounded-md">
                    <code className="bg-slate-100 px-1">ROUND(src / 8, 1)</code> 
                    <p className="text-muted-foreground mt-1">Divide source by 8 and round to 1 decimal place</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}