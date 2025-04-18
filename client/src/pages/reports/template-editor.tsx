import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, Plus, Trash2, Eye, Save, LayoutGrid, GripVertical, Check, X } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Define schema for template form
const columnSchema = z.object({
  key: z.string(),
  title: z.string().min(1, "Title is required"),
  width: z.number().optional(),
  format: z.enum(["text", "number", "date", "currency", "percentage"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  visible: z.boolean().optional(),
  computeTotal: z.boolean().optional()
});

const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  type: z.enum(["attendance", "payroll", "employee", "project", "expenditure", "income"]),
  isDefault: z.boolean().default(false),
  config: z.object({
    columns: z.array(columnSchema),
    filters: z.array(z.string()),
    showTotals: z.boolean().default(true),
    orientation: z.enum(["portrait", "landscape"]).default("landscape"),
    pageSize: z.enum(["A4", "A3", "Letter", "Legal"]).default("A4"),
    pageMargin: z.object({
      top: z.number(),
      right: z.number(),
      bottom: z.number(),
      left: z.number()
    }).optional(),
    fontSize: z.number().min(8).max(16).optional(),
    fontFamily: z.string().optional(),
    includeDateRange: z.boolean().default(true)
  })
});

type TemplateFormValues = z.infer<typeof templateSchema>;

// Available column options for each report type
const availableColumns: Record<string, Array<{ key: string; title: string; format: string; width: number; visible: boolean; align: string; }>> = {
  attendance: [
    { key: "date", title: "Date", format: "date", width: 100, visible: true, align: "center" },
    { key: "employeeName", title: "Employee Name", format: "text", width: 150, visible: true, align: "left" },
    { key: "checkIn", title: "Check In", format: "text", width: 100, visible: true, align: "center" },
    { key: "checkOut", title: "Check Out", format: "text", width: 100, visible: true, align: "center" },
    { key: "hoursWorked", title: "Hours", format: "number", width: 80, visible: true, align: "center" },
    { key: "projectName", title: "Project", format: "text", width: 120, visible: true, align: "left" },
    { key: "status", title: "Status", format: "text", width: 100, visible: true, align: "center" },
    { key: "remarks", title: "Remarks", format: "text", width: 200, visible: true, align: "left" }
  ],
  payroll: [
    { key: "employeeName", title: "Employee Name", format: "text", width: 150, visible: true, align: "left" },
    { key: "periodStart", title: "Period Start", format: "date", width: 100, visible: true, align: "center" },
    { key: "periodEnd", title: "Period End", format: "date", width: 100, visible: true, align: "center" },
    { key: "basicSalary", title: "Basic Salary", format: "currency", width: 120, visible: true, align: "right" },
    { key: "allowances", title: "Allowances", format: "currency", width: 120, visible: true, align: "right" },
    { key: "deductions", title: "Deductions", format: "currency", width: 120, visible: true, align: "right" },
    { key: "tax", title: "Tax", format: "currency", width: 100, visible: true, align: "right" },
    { key: "netSalary", title: "Net Salary", format: "currency", width: 120, visible: true, align: "right" },
    { key: "status", title: "Status", format: "text", width: 100, visible: true, align: "center" },
    { key: "paymentDate", title: "Payment Date", format: "date", width: 100, visible: true, align: "center" }
  ],
  employee: [
    { key: "employeeId", title: "ID", format: "text", width: 80, visible: true, align: "center" },
    { key: "fullName", title: "Name", format: "text", width: 150, visible: true, align: "left" },
    { key: "designation", title: "Designation", format: "text", width: 120, visible: true, align: "left" },
    { key: "phone", title: "Phone", format: "text", width: 120, visible: true, align: "left" },
    { key: "email", title: "Email", format: "text", width: 150, visible: true, align: "left" },
    { key: "dailyWage", title: "Daily Wage", format: "currency", width: 120, visible: true, align: "right" },
    { key: "joinDate", title: "Join Date", format: "date", width: 100, visible: true, align: "center" },
    { key: "status", title: "Status", format: "text", width: 100, visible: true, align: "center" }
  ],
  project: [
    { key: "name", title: "Project Name", format: "text", width: 150, visible: true, align: "left" },
    { key: "clientName", title: "Client", format: "text", width: 150, visible: true, align: "left" },
    { key: "startDate", title: "Start Date", format: "date", width: 100, visible: true, align: "center" },
    { key: "endDate", title: "End Date", format: "date", width: 100, visible: true, align: "center" },
    { key: "status", title: "Status", format: "text", width: 100, visible: true, align: "center" },
    { key: "budget", title: "Budget", format: "currency", width: 120, visible: true, align: "right" },
    { key: "description", title: "Description", format: "text", width: 200, visible: true, align: "left" }
  ],
  expenditure: [
    { key: "date", title: "Date", format: "date", width: 100, visible: true, align: "center" },
    { key: "amount", title: "Amount", format: "currency", width: 120, visible: true, align: "right" },
    { key: "category", title: "Category", format: "text", width: 120, visible: true, align: "left" },
    { key: "description", title: "Description", format: "text", width: 200, visible: true, align: "left" },
    { key: "employeeName", title: "Employee", format: "text", width: 150, visible: true, align: "left" },
    { key: "projectName", title: "Project", format: "text", width: 150, visible: true, align: "left" }
  ],
  income: [
    { key: "date", title: "Date", format: "date", width: 100, visible: true, align: "center" },
    { key: "amount", title: "Amount", format: "currency", width: 120, visible: true, align: "right" },
    { key: "category", title: "Category", format: "text", width: 120, visible: true, align: "left" },
    { key: "description", title: "Description", format: "text", width: 200, visible: true, align: "left" },
    { key: "projectName", title: "Project", format: "text", width: 150, visible: true, align: "left" }
  ]
};

// Available filter options for each report type
const availableFilters: Record<string, Array<{ value: string; label: string }>> = {
  attendance: [
    { value: "dateRange", label: "Date Range" },
    { value: "employee", label: "Employee" },
    { value: "project", label: "Project" },
    { value: "status", label: "Status" }
  ],
  payroll: [
    { value: "dateRange", label: "Period Range" },
    { value: "employee", label: "Employee" },
    { value: "status", label: "Status" }
  ],
  employee: [
    { value: "designation", label: "Designation" },
    { value: "status", label: "Status" }
  ],
  project: [
    { value: "status", label: "Status" },
    { value: "clientName", label: "Client" }
  ],
  expenditure: [
    { value: "dateRange", label: "Date Range" },
    { value: "category", label: "Category" },
    { value: "employee", label: "Employee" },
    { value: "project", label: "Project" }
  ],
  income: [
    { value: "dateRange", label: "Date Range" },
    { value: "category", label: "Category" },
    { value: "project", label: "Project" }
  ]
};

// Mock data for preview table
const previewData: Record<string, any[]> = {
  attendance: [
    { 
      date: new Date().toISOString(), 
      employeeName: "John Doe", 
      checkIn: "09:00 AM", 
      checkOut: "05:00 PM", 
      hoursWorked: 8, 
      projectName: "Site A Construction", 
      status: "Present", 
      remarks: "On time" 
    },
    { 
      date: new Date().toISOString(), 
      employeeName: "Jane Smith", 
      checkIn: "08:45 AM", 
      checkOut: "04:30 PM", 
      hoursWorked: 7.75, 
      projectName: "Site B Maintenance", 
      status: "Present", 
      remarks: "Left early - approved" 
    },
  ],
  payroll: [
    { 
      employeeName: "John Doe", 
      periodStart: new Date(new Date().setDate(1)).toISOString(), 
      periodEnd: new Date().toISOString(), 
      basicSalary: 5000, 
      allowances: 500, 
      deductions: 300, 
      tax: 425, 
      netSalary: 4775, 
      status: "Paid", 
      paymentDate: new Date().toISOString() 
    },
    { 
      employeeName: "Jane Smith", 
      periodStart: new Date(new Date().setDate(1)).toISOString(), 
      periodEnd: new Date().toISOString(), 
      basicSalary: 6000, 
      allowances: 600, 
      deductions: 350, 
      tax: 510, 
      netSalary: 5740, 
      status: "Paid", 
      paymentDate: new Date().toISOString() 
    },
  ],
  employee: [
    { 
      employeeId: "EMP-001", 
      fullName: "John Doe", 
      designation: "Supervisor", 
      phone: "+1234567890", 
      email: "john@example.com", 
      dailyWage: 150, 
      joinDate: new Date().toISOString(), 
      status: "Active" 
    },
    { 
      employeeId: "EMP-002", 
      fullName: "Jane Smith", 
      designation: "Engineer", 
      phone: "+1987654321", 
      email: "jane@example.com", 
      dailyWage: 200, 
      joinDate: new Date().toISOString(), 
      status: "Active" 
    },
  ],
  project: [
    { 
      name: "Site A Construction", 
      clientName: "ABC Corporation", 
      startDate: new Date().toISOString(), 
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(), 
      status: "Active", 
      budget: 50000, 
      description: "Construction of new office building" 
    },
    { 
      name: "Site B Maintenance", 
      clientName: "XYZ Industries", 
      startDate: new Date().toISOString(), 
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(), 
      status: "Active", 
      budget: 25000, 
      description: "Regular maintenance and repairs" 
    },
  ],
  expenditure: [
    { 
      date: new Date().toISOString(), 
      amount: 1200, 
      category: "Materials", 
      description: "Purchase of construction materials", 
      employeeName: "John Doe", 
      projectName: "Site A Construction" 
    },
    { 
      date: new Date().toISOString(), 
      amount: 850, 
      category: "Tools", 
      description: "Equipment rental", 
      employeeName: "Jane Smith", 
      projectName: "Site B Maintenance" 
    },
  ],
  income: [
    { 
      date: new Date().toISOString(), 
      amount: 10000, 
      category: "Advance Payment", 
      description: "Initial payment for project", 
      projectName: "Site A Construction" 
    },
    { 
      date: new Date().toISOString(), 
      amount: 5000, 
      category: "Monthly Payment", 
      description: "Regular maintenance payment", 
      projectName: "Site B Maintenance" 
    },
  ]
};

// Default template configs for new templates
const defaultTemplates: Record<string, any> = {
  attendance: {
    name: "New Attendance Report",
    description: "Custom attendance report template",
    type: "attendance",
    isDefault: false,
    config: {
      columns: availableColumns.attendance.map(col => ({ ...col, computeTotal: col.format === "number" || col.format === "currency" })),
      filters: ["dateRange", "employee", "project", "status"],
      showTotals: true,
      orientation: "landscape",
      pageSize: "A4",
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: "Arial",
      includeDateRange: true
    }
  },
  payroll: {
    name: "New Payroll Report",
    description: "Custom payroll report template",
    type: "payroll",
    isDefault: false,
    config: {
      columns: availableColumns.payroll.map(col => ({ ...col, computeTotal: col.format === "number" || col.format === "currency" })),
      filters: ["dateRange", "employee", "status"],
      showTotals: true,
      orientation: "landscape",
      pageSize: "A4",
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: "Arial",
      includeDateRange: true
    }
  },
  employee: {
    name: "New Employee Directory",
    description: "Custom employee directory template",
    type: "employee",
    isDefault: false,
    config: {
      columns: availableColumns.employee.map(col => ({ ...col, computeTotal: col.format === "number" || col.format === "currency" })),
      filters: ["designation", "status"],
      showTotals: false,
      orientation: "landscape",
      pageSize: "A4",
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: "Arial",
      includeDateRange: false
    }
  },
  project: {
    name: "New Project List",
    description: "Custom project listing template",
    type: "project",
    isDefault: false,
    config: {
      columns: availableColumns.project.map(col => ({ ...col, computeTotal: col.format === "number" || col.format === "currency" })),
      filters: ["status", "clientName"],
      showTotals: true,
      orientation: "landscape",
      pageSize: "A4",
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: "Arial",
      includeDateRange: false
    }
  },
  expenditure: {
    name: "New Expenditure Report",
    description: "Custom expenditure report template",
    type: "expenditure",
    isDefault: false,
    config: {
      columns: availableColumns.expenditure.map(col => ({ ...col, computeTotal: col.format === "number" || col.format === "currency" })),
      filters: ["dateRange", "category", "employee", "project"],
      showTotals: true,
      orientation: "landscape",
      pageSize: "A4",
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: "Arial",
      includeDateRange: true
    }
  },
  income: {
    name: "New Income Report",
    description: "Custom income report template",
    type: "income",
    isDefault: false,
    config: {
      columns: availableColumns.income.map(col => ({ ...col, computeTotal: col.format === "number" || col.format === "currency" })),
      filters: ["dateRange", "category", "project"],
      showTotals: true,
      orientation: "landscape",
      pageSize: "A4",
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: "Arial",
      includeDateRange: true
    }
  }
};

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("design");
  const [selectedReportType, setSelectedReportType] = useState<string>("attendance");
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch template if editing
  const { data: templateData, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['/api/reports/templates', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const res = await fetch(`/api/reports/templates/${id}`);
        if (!res.ok) throw new Error("Failed to fetch template");
        return res.json();
      } catch (error) {
        console.error("Error fetching template:", error);
        toast({
          title: "Error",
          description: "Failed to load template data",
          variant: "destructive",
        });
        return null;
      }
    },
    enabled: !!id,
  });

  // Form setup
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "attendance",
      isDefault: false,
      config: {
        columns: [],
        filters: [],
        showTotals: true,
        orientation: "landscape",
        pageSize: "A4",
        pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
        fontSize: 10,
        fontFamily: "Arial",
        includeDateRange: true
      }
    }
  });

  const { fields, append, remove, move, replace } = useFieldArray({
    control: form.control,
    name: "config.columns"
  });

  // Initialize form with template data or default values
  useEffect(() => {
    if (id && templateData) {
      form.reset(templateData);
      setSelectedReportType(templateData.type);
      setIsEditing(true);
    } else if (!id) {
      // New template - use default for selected type
      const defaultTemplate = defaultTemplates[selectedReportType];
      form.reset({
        ...defaultTemplate,
        config: {
          ...defaultTemplate.config,
          columns: defaultTemplate.config.columns.map((col: any) => ({
            ...col,
            computeTotal: ['number', 'currency'].includes(col.format)
          }))
        }
      });
    }
  }, [id, templateData, form, selectedReportType]);

  // Handle report type change for new templates
  useEffect(() => {
    if (!isEditing && !id) {
      const defaultTemplate = defaultTemplates[selectedReportType];
      form.reset({
        ...defaultTemplate,
        config: {
          ...defaultTemplate.config,
          columns: defaultTemplate.config.columns.map((col: any) => ({
            ...col,
            computeTotal: ['number', 'currency'].includes(col.format)
          }))
        }
      });
    }
  }, [selectedReportType, form, isEditing, id]);

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async (templateData: TemplateFormValues) => {
      const url = id ? `/api/reports/templates/${id}` : '/api/reports/templates';
      const method = id ? 'PUT' : 'POST';
      
      const res = await apiRequest(method, url, templateData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save template');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports/templates'] });
      toast({
        title: "Template saved",
        description: "Report template has been saved successfully",
      });
      navigate("/reports/templates");
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving template",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: TemplateFormValues) => {
    // Ensure only visible columns are included in computations
    const updatedData = {
      ...data,
      config: {
        ...data.config,
        columns: data.config.columns.map(col => ({
          ...col,
          computeTotal: col.visible && ['number', 'currency'].includes(col.format || '') ? col.computeTotal : false
        }))
      }
    };
    
    saveMutation.mutate(updatedData);
  };

  // Handle drag and drop for columns
  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    move(result.source.index, result.destination.index);
  };

  if (isLoadingTemplate && id) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" className="mr-4" onClick={() => navigate("/reports/templates")}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {id ? "Edit Report Template" : "Create Report Template"}
          </h1>
          <p className="text-gray-600">
            {id ? "Modify an existing report template" : "Design a new customized report template"}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - template settings */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Template Settings</CardTitle>
                <CardDescription>
                  Configure the basic settings for your report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter template name"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter template description"
                    {...form.register("description")}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Report Type</Label>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        disabled={isEditing}
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (!isEditing) {
                            setSelectedReportType(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="attendance">Attendance Report</SelectItem>
                          <SelectItem value="payroll">Payroll Report</SelectItem>
                          <SelectItem value="employee">Employee Directory</SelectItem>
                          <SelectItem value="project">Project List</SelectItem>
                          <SelectItem value="expenditure">Expenditure Report</SelectItem>
                          <SelectItem value="income">Income Report</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <h3 className="font-medium">Format Options</h3>

                  <div className="space-y-2">
                    <Label>Page Orientation</Label>
                    <Controller
                      control={form.control}
                      name="config.orientation"
                      render={({ field }) => (
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="portrait" id="portrait" />
                            <Label htmlFor="portrait">Portrait</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="landscape" id="landscape" />
                            <Label htmlFor="landscape">Landscape</Label>
                          </div>
                        </RadioGroup>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pageSize">Page Size</Label>
                    <Controller
                      control={form.control}
                      name="config.pageSize"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select page size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A4">A4</SelectItem>
                            <SelectItem value="A3">A3</SelectItem>
                            <SelectItem value="Letter">Letter</SelectItem>
                            <SelectItem value="Legal">Legal</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fontSize">Font Size (pt)</Label>
                    <Controller
                      control={form.control}
                      name="config.fontSize"
                      render={({ field }) => (
                        <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select font size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="8">8pt</SelectItem>
                            <SelectItem value="9">9pt</SelectItem>
                            <SelectItem value="10">10pt</SelectItem>
                            <SelectItem value="11">11pt</SelectItem>
                            <SelectItem value="12">12pt</SelectItem>
                            <SelectItem value="14">14pt</SelectItem>
                            <SelectItem value="16">16pt</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fontFamily">Font Family</Label>
                    <Controller
                      control={form.control}
                      name="config.fontFamily"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select font family" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Arial">Arial</SelectItem>
                            <SelectItem value="Helvetica">Helvetica</SelectItem>
                            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                            <SelectItem value="Courier New">Courier New</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Controller
                      control={form.control}
                      name="config.showTotals"
                      render={({ field }) => (
                        <Checkbox
                          id="showTotals"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="showTotals">Show Totals</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Controller
                      control={form.control}
                      name="config.includeDateRange"
                      render={({ field }) => (
                        <Checkbox
                          id="includeDateRange"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="includeDateRange">Include Date Range</Label>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Available Filters</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {availableFilters[selectedReportType]?.map(filter => (
                        <div key={filter.value} className="flex items-center space-x-2">
                          <Controller
                            control={form.control}
                            name="config.filters"
                            render={({ field }) => (
                              <Checkbox
                                id={`filter-${filter.value}`}
                                checked={field.value?.includes(filter.value)}
                                onCheckedChange={(checked) => {
                                  const current = [...(field.value || [])];
                                  if (checked) {
                                    if (!current.includes(filter.value)) {
                                      field.onChange([...current, filter.value]);
                                    }
                                  } else {
                                    field.onChange(current.filter(value => value !== filter.value));
                                  }
                                }}
                              />
                            )}
                          />
                          <Label htmlFor={`filter-${filter.value}`}>{filter.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Columns & Preview */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="design">Column Design</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="design" className="space-y-4 pt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle>Report Columns</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm font-normal text-muted-foreground">
                          {fields.length} column{fields.length !== 1 ? 's' : ''} configured
                        </Label>
                      </div>
                    </div>
                    <CardDescription>
                      Configure the columns to display in your report. Drag to reorder.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="report-columns">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2"
                          >
                            {fields.length === 0 ? (
                              <div className="text-center py-8 border rounded-md border-dashed">
                                <p className="text-gray-500 mb-4">No columns configured</p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const defaultColumns = availableColumns[selectedReportType];
                                    replace(defaultColumns.map(col => ({
                                      ...col,
                                      computeTotal: ['number', 'currency'].includes(col.format)
                                    })));
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Default Columns
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-12 gap-4 py-2 px-4 font-medium text-sm text-muted-foreground bg-muted rounded-t-md">
                                  <div className="col-span-1"></div>
                                  <div className="col-span-4">Column</div>
                                  <div className="col-span-2">Format</div>
                                  <div className="col-span-2">Alignment</div>
                                  <div className="col-span-2">Width</div>
                                  <div className="col-span-1 text-right">Actions</div>
                                </div>
                                {fields.map((field, index) => (
                                  <Draggable key={field.id} draggableId={field.id} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={cn(
                                          "grid grid-cols-12 gap-4 items-center p-3 rounded-md border",
                                          !form.watch(`config.columns.${index}.visible`) && "opacity-50 bg-muted"
                                        )}
                                      >
                                        <div className="col-span-1">
                                          <div {...provided.dragHandleProps} className="cursor-move">
                                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                                          </div>
                                        </div>
                                        <div className="col-span-4">
                                          <div className="flex items-center gap-3">
                                            <Controller
                                              control={form.control}
                                              name={`config.columns.${index}.visible`}
                                              render={({ field: visibleField }) => (
                                                <Switch
                                                  checked={visibleField.value}
                                                  onCheckedChange={visibleField.onChange}
                                                />
                                              )}
                                            />
                                            <div>
                                              <p className="font-medium text-sm">
                                                {field.title}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {field.key}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="col-span-2">
                                          <Controller
                                            control={form.control}
                                            name={`config.columns.${index}.format`}
                                            render={({ field: formatField }) => (
                                              <Select
                                                value={formatField.value}
                                                onValueChange={formatField.onChange}
                                              >
                                                <SelectTrigger className="h-8">
                                                  <SelectValue placeholder="Format" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="text">Text</SelectItem>
                                                  <SelectItem value="number">Number</SelectItem>
                                                  <SelectItem value="date">Date</SelectItem>
                                                  <SelectItem value="currency">Currency</SelectItem>
                                                  <SelectItem value="percentage">Percentage</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            )}
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <Controller
                                            control={form.control}
                                            name={`config.columns.${index}.align`}
                                            render={({ field: alignField }) => (
                                              <Select
                                                value={alignField.value}
                                                onValueChange={alignField.onChange}
                                              >
                                                <SelectTrigger className="h-8">
                                                  <SelectValue placeholder="Align" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="left">Left</SelectItem>
                                                  <SelectItem value="center">Center</SelectItem>
                                                  <SelectItem value="right">Right</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            )}
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <Controller
                                            control={form.control}
                                            name={`config.columns.${index}.width`}
                                            render={({ field: widthField }) => (
                                              <Input
                                                type="number"
                                                className="h-8"
                                                value={widthField.value}
                                                onChange={widthField.onChange}
                                              />
                                            )}
                                          />
                                        </div>
                                        <div className="col-span-1 text-right">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        {form.watch(`config.columns.${index}.format`) === 'number' || 
                                         form.watch(`config.columns.${index}.format`) === 'currency' ? (
                                          <div className="col-span-12 -mt-1 pt-2 border-t flex items-center gap-2">
                                            <Controller
                                              control={form.control}
                                              name={`config.columns.${index}.computeTotal`}
                                              render={({ field: totalField }) => (
                                                <Checkbox
                                                  id={`compute-total-${index}`}
                                                  checked={totalField.value}
                                                  onCheckedChange={totalField.onChange}
                                                />
                                              )}
                                            />
                                            <Label htmlFor={`compute-total-${index}`} className="text-sm">
                                              Include in totals calculation
                                            </Label>
                                          </div>
                                        ) : null}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4 pt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>
                      This is how your report will look with the selected columns and settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          {fields
                            .filter(field => form.watch(`config.columns.${fields.indexOf(field)}.visible`))
                            .map((field, index) => (
                              <th
                                key={index}
                                className="border px-4 py-2 text-sm font-medium"
                                style={{
                                  width: `${field.width}px`,
                                  textAlign: field.align === 'left' ? 'left' : 
                                             field.align === 'right' ? 'right' : 'center'
                                }}
                              >
                                {field.title}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData[selectedReportType]?.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                            {fields
                              .filter(field => form.watch(`config.columns.${fields.indexOf(field)}.visible`))
                              .map((field, colIndex) => {
                                const value = row[field.key];
                                const format = form.watch(`config.columns.${fields.indexOf(field)}.format`);
                                const align = form.watch(`config.columns.${fields.indexOf(field)}.align`);
                                
                                let displayValue = value;
                                
                                // Format the value based on column format
                                if (format === 'date' && value) {
                                  displayValue = new Date(value).toLocaleDateString();
                                } else if (format === 'currency' && value != null) {
                                  displayValue = new Intl.NumberFormat('en-US', { 
                                    style: 'currency', 
                                    currency: 'USD' 
                                  }).format(value);
                                } else if (format === 'number' && value != null) {
                                  displayValue = new Intl.NumberFormat('en-US').format(value);
                                } else if (format === 'percentage' && value != null) {
                                  displayValue = new Intl.NumberFormat('en-US', { 
                                    style: 'percent', 
                                    minimumFractionDigits: 2 
                                  }).format(value / 100);
                                }
                                
                                return (
                                  <td
                                    key={colIndex}
                                    className="border px-4 py-2 text-sm"
                                    style={{
                                      textAlign: align === 'left' ? 'left' : 
                                                align === 'right' ? 'right' : 'center'
                                    }}
                                  >
                                    {displayValue}
                                  </td>
                                );
                              })}
                          </tr>
                        ))}
                        {form.watch('config.showTotals') && (
                          <tr className="bg-muted font-medium">
                            {fields
                              .filter(field => form.watch(`config.columns.${fields.indexOf(field)}.visible`))
                              .map((field, colIndex) => {
                                const format = form.watch(`config.columns.${fields.indexOf(field)}.format`);
                                const align = form.watch(`config.columns.${fields.indexOf(field)}.align`);
                                const computeTotal = form.watch(`config.columns.${fields.indexOf(field)}.computeTotal`);
                                
                                if (colIndex === 0) {
                                  return (
                                    <td
                                      key={colIndex}
                                      className="border px-4 py-2 text-sm"
                                      style={{ textAlign: 'left' }}
                                    >
                                      Total
                                    </td>
                                  );
                                }
                                
                                if (computeTotal && (format === 'number' || format === 'currency')) {
                                  // Calculate total for this column
                                  const total = previewData[selectedReportType]?.reduce((sum, row) => {
                                    const value = parseFloat(row[field.key]) || 0;
                                    return sum + value;
                                  }, 0);
                                  
                                  let displayTotal = total;
                                  if (format === 'currency') {
                                    displayTotal = new Intl.NumberFormat('en-US', { 
                                      style: 'currency', 
                                      currency: 'USD' 
                                    }).format(total);
                                  } else if (format === 'number') {
                                    displayTotal = new Intl.NumberFormat('en-US').format(total);
                                  }
                                  
                                  return (
                                    <td
                                      key={colIndex}
                                      className="border px-4 py-2 text-sm"
                                      style={{
                                        textAlign: align === 'left' ? 'left' : 
                                                  align === 'right' ? 'right' : 'center'
                                      }}
                                    >
                                      {displayTotal}
                                    </td>
                                  );
                                }
                                
                                return <td key={colIndex} className="border px-4 py-2 text-sm"></td>;
                              })}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/reports/templates")}
              >
                Cancel
              </Button>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab(activeTab === "design" ? "preview" : "design")}
                >
                  {activeTab === "design" ? (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </>
                  ) : (
                    <>
                      <LayoutGrid className="mr-2 h-4 w-4" />
                      Edit Design
                    </>
                  )}
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}