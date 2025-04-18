import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ColorPicker } from "@/components/ui/color-picker";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, MoveUp, MoveDown, Save, Copy } from "lucide-react";

// Define the form schema
const templateFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().min(5, { message: "Description must be at least 5 characters" }),
  type: z.enum(["attendance", "payroll", "employee", "project", "expenditure", "income", "custom"]),
  config: z.object({
    title: z.string().min(1, { message: "Title is required" }),
    subtitle: z.string().optional(),
    columns: z.array(z.object({
      key: z.string().min(1, { message: "Field key is required" }),
      title: z.string().min(1, { message: "Column title is required" }),
      width: z.coerce.number().optional(),
      format: z.enum(["text", "date", "currency", "number", "percentage"]).optional(),
      visible: z.boolean().optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      computeTotal: z.boolean().optional(),
    })).min(1, { message: "At least one column is required" }),
    groupBy: z.string().optional(),
    sortBy: z.string().optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    showTotals: z.boolean().optional(),
    showAverages: z.boolean().optional(),
    pageSize: z.enum(["a4", "letter", "legal"]).optional(),
    orientation: z.enum(["portrait", "landscape"]).optional(),
    dateFormat: z.string().optional(),
    headerLogo: z.boolean().optional(),
    footerText: z.string().optional(),
    styles: z.object({
      headerBgColor: z.string().optional(),
      headerTextColor: z.string().optional(),
      rowBgColor: z.string().optional(),
      rowAltBgColor: z.string().optional(),
      rowTextColor: z.string().optional(),
      borderColor: z.string().optional(),
      footerBgColor: z.string().optional(),
      footerTextColor: z.string().optional(),
    }).optional(),
  }),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

// Default values for new templates
const defaultValues: TemplateFormValues = {
  name: "",
  description: "",
  type: "attendance",
  config: {
    title: "New Report",
    subtitle: "",
    columns: [
      {
        key: "date",
        title: "Date",
        format: "date",
        width: 15,
        visible: true,
        align: "left",
      },
    ],
    groupBy: "",
    sortBy: "date",
    sortDirection: "desc",
    showTotals: true,
    showAverages: false,
    pageSize: "a4",
    orientation: "landscape",
    dateFormat: "MM/DD/YYYY",
    headerLogo: true,
    footerText: "Generated on {currentDate}",
    styles: {
      headerBgColor: "#4e73df",
      headerTextColor: "#ffffff",
      rowBgColor: "#ffffff",
      rowAltBgColor: "#f8f9fc",
      rowTextColor: "#5a5c69",
      borderColor: "#e3e6f0",
      footerBgColor: "#f8f9fc",
      footerTextColor: "#5a5c69",
    },
  },
};

export default function TemplateEditorPage() {
  const params = useParams();
  const templateId = params?.id;
  const isEditing = Boolean(templateId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [availableFields, setAvailableFields] = useState<{ [key: string]: string[] }>({
    attendance: ["date", "employeeName", "employeeId", "projectName", "clockIn", "clockOut", "duration", "location", "notes"],
    payroll: ["period", "employeeName", "employeeId", "totalHours", "regularPay", "overtimePay", "deductions", "netPay", "status"],
    employee: ["employeeId", "firstName", "lastName", "designation", "dailyWage", "mobileNumber", "joinDate", "status"],
    project: ["projectId", "projectName", "clientName", "startDate", "endDate", "status", "employeeCount", "totalHours", "totalCost"],
    expenditure: ["date", "category", "description", "projectName", "employeeName", "amount", "paymentMethod", "status"],
    income: ["date", "source", "description", "projectName", "amount", "paymentMethod", "status"],
    custom: ["customField1", "customField2", "customField3"],
  });

  // Fetch template data if editing
  const { data: templateData, isLoading: isTemplateLoading } = useQuery({
    queryKey: ['/api/reports/templates', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const res = await fetch(`/api/reports/templates/${templateId}`);
      if (!res.ok) throw new Error('Failed to fetch template');
      return res.json();
    },
    enabled: isEditing,
  });

  // Form definition
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: isEditing ? undefined : defaultValues,
  });

  // Set form values when template data is loaded
  useEffect(() => {
    if (templateData) {
      form.reset(templateData);
      setActiveTab("general");
    }
  }, [templateData, form]);

  // Field array for columns
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "config.columns",
  });

  // Create or update mutation
  const mutation = useMutation({
    mutationFn: async (values: TemplateFormValues) => {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/reports/templates/${templateId}` : '/api/reports/templates';
      const response = await apiRequest(method, url, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Template Updated" : "Template Created",
        description: isEditing ? "The report template has been updated successfully." : "New report template has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/templates'] });
      navigate("/reports");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: TemplateFormValues) => {
    // If we're creating a new template, generate an ID
    if (!isEditing) {
      values.id = `template-${Date.now()}`;
    }
    
    // Fix any missing fields with defaults
    if (!values.config.styles) {
      values.config.styles = defaultValues.config.styles;
    }
    
    // Submit the form
    mutation.mutate(values);
  };

  if (isTemplateLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" className="mr-2" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEditing ? "Edit Report Template" : "Create Report Template"}</h1>
          <p className="text-muted-foreground">
            {isEditing ? "Modify an existing report template" : "Create a new customized report template"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="style">Style & Formatting</TabsTrigger>
            </TabsList>
            
            {/* General Tab */}
            <TabsContent value="general" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Configure basic template information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter template name" {...field} />
                        </FormControl>
                        <FormDescription>
                          Provide a descriptive name for this report template
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter template description" {...field} />
                        </FormControl>
                        <FormDescription>
                          Brief description of what this report will show
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Type</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // When type changes, update the default columns
                            if (fields.length === 0 || window.confirm("Changing the report type will reset your columns. Continue?")) {
                              const defaultColumns = getDefaultColumnsForType(value as any);
                              form.setValue("config.columns", defaultColumns);
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select report type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="attendance">Attendance</SelectItem>
                            <SelectItem value="payroll">Payroll</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                            <SelectItem value="expenditure">Expenditure</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The type of data this report will display
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="config.title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter report title" {...field} />
                        </FormControl>
                        <FormDescription>
                          Main title that will appear at the top of the report
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="config.subtitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtitle (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter report subtitle" {...field} />
                        </FormControl>
                        <FormDescription>
                          Additional subtitle text
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex flex-col gap-6 sm:flex-row">
                    <FormField
                      control={form.control}
                      name="config.pageSize"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Page Size</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select page size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="a4">A4</SelectItem>
                              <SelectItem value="letter">Letter</SelectItem>
                              <SelectItem value="legal">Legal</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="config.orientation"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Orientation</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select orientation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="portrait">Portrait</SelectItem>
                              <SelectItem value="landscape">Landscape</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="config.dateFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Format</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select date format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                            <SelectItem value="MMM DD, YYYY">MMM DD, YYYY</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How dates will be displayed in the report
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="config.footerText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Footer Text</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter footer text" {...field} />
                        </FormControl>
                        <FormDescription>
                          Text to display in the footer. Use {'{currentDate}'} to insert the current date.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="config.headerLogo"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Show Company Logo</FormLabel>
                          <FormDescription>
                            Display the company logo in the report header
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => navigate("/reports")}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("columns")}>
                    Next: Configure Columns
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Columns Tab */}
            <TabsContent value="columns" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configure Columns</CardTitle>
                  <CardDescription>Define the columns that will appear in the report</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Report Columns</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          append({
                            key: "",
                            title: "",
                            width: 15,
                            visible: true,
                            align: "left",
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Column
                      </Button>
                    </div>
                    <Separator />
                  </div>
                  
                  <div className="space-y-4">
                    {fields.length === 0 ? (
                      <div className="text-center py-8 border rounded-md bg-muted/20">
                        <p className="text-muted-foreground">No columns defined</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            const reportType = form.getValues("type");
                            const defaultColumns = getDefaultColumnsForType(reportType);
                            defaultColumns.forEach(column => append(column));
                          }}
                        >
                          Add Default Columns
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <Card key={field.id} className="overflow-hidden">
                            <div className="bg-muted p-2 flex justify-between items-center">
                              <h4 className="font-medium">Column {index + 1}</h4>
                              <div className="flex space-x-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => index > 0 && move(index, index - 1)}
                                  disabled={index === 0}
                                >
                                  <MoveUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => index < fields.length - 1 && move(index, index + 1)}
                                  disabled={index === fields.length - 1}
                                >
                                  <MoveDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (fields.length > 1) {
                                      remove(index);
                                    } else {
                                      toast({
                                        title: "Error",
                                        description: "You must have at least one column",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <CardContent className="p-4 pt-0 grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 pt-4">
                                <FormField
                                  control={form.control}
                                  name={`config.columns.${index}.key`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Field Key</FormLabel>
                                      <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select field key" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {availableFields[form.getValues("type") || "attendance"].map((key) => (
                                            <SelectItem key={key} value={key}>
                                              {key}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormDescription>
                                        The data field this column will display
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name={`config.columns.${index}.format`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Format</FormLabel>
                                      <Select 
                                        value={field.value || "text"} 
                                        onValueChange={field.onChange}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select format" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="text">Text</SelectItem>
                                          <SelectItem value="date">Date</SelectItem>
                                          <SelectItem value="currency">Currency</SelectItem>
                                          <SelectItem value="number">Number</SelectItem>
                                          <SelectItem value="percentage">Percentage</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <div className="space-y-2 pt-4">
                                <FormField
                                  control={form.control}
                                  name={`config.columns.${index}.title`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Column Title</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Enter column title" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        The heading displayed for this column
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <div className="flex items-center gap-4">
                                  <FormField
                                    control={form.control}
                                    name={`config.columns.${index}.width`}
                                    render={({ field }) => (
                                      <FormItem className="flex-1">
                                        <FormLabel>Width (%)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min={5}
                                            max={50}
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name={`config.columns.${index}.align`}
                                    render={({ field }) => (
                                      <FormItem className="flex-1">
                                        <FormLabel>Alignment</FormLabel>
                                        <Select value={field.value || "left"} onValueChange={field.onChange}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Align" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="left">Left</SelectItem>
                                            <SelectItem value="center">Center</SelectItem>
                                            <SelectItem value="right">Right</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                              
                              <div className="md:col-span-2 flex items-center space-x-6">
                                <FormField
                                  control={form.control}
                                  name={`config.columns.${index}.visible`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        Visible
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name={`config.columns.${index}.computeTotal`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        Calculate Total
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 pt-4">
                    <h3 className="text-lg font-medium">Data Organization</h3>
                    <Separator />
                    
                    <div className="grid gap-4 md:grid-cols-2 pt-2">
                      <FormField
                        control={form.control}
                        name="config.groupBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Group By</FormLabel>
                            <Select 
                              value={field.value || ""} 
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select grouping field (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">No Grouping</SelectItem>
                                {availableFields[form.getValues("type") || "attendance"].map((key) => (
                                  <SelectItem key={key} value={key}>
                                    {key}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Field to group records by
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="config.sortBy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sort By</FormLabel>
                              <Select 
                                value={field.value || ""} 
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select sorting field" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableFields[form.getValues("type") || "attendance"].map((key) => (
                                    <SelectItem key={key} value={key}>
                                      {key}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="config.sortDirection"
                          render={({ field }) => (
                            <FormItem>
                              <Select 
                                value={field.value || "asc"} 
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sort direction" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="asc">Ascending</SelectItem>
                                  <SelectItem value="desc">Descending</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <FormField
                        control={form.control}
                        name="config.showTotals"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Show Totals</FormLabel>
                              <FormDescription>
                                Display total row for numeric columns
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="config.showAverages"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Show Averages</FormLabel>
                              <FormDescription>
                                Display average values for numeric columns
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("general")}>
                    Back
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("style")}>
                    Next: Style & Formatting
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Style Tab */}
            <TabsContent value="style" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Style & Formatting</CardTitle>
                  <CardDescription>Customize the visual appearance of the report</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Color Scheme</h3>
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="config.styles.headerBgColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Header Background Color</FormLabel>
                            <FormControl>
                              <Input 
                                type="color" 
                                {...field} 
                                value={field.value || "#4e73df"}
                                className="h-10 w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="config.styles.headerTextColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Header Text Color</FormLabel>
                            <FormControl>
                              <Input 
                                type="color" 
                                {...field} 
                                value={field.value || "#ffffff"}
                                className="h-10 w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="config.styles.rowBgColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Row Background Color</FormLabel>
                            <FormControl>
                              <Input 
                                type="color" 
                                {...field} 
                                value={field.value || "#ffffff"}
                                className="h-10 w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="config.styles.rowAltBgColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alternate Row Background Color</FormLabel>
                            <FormControl>
                              <Input 
                                type="color" 
                                {...field} 
                                value={field.value || "#f8f9fc"}
                                className="h-10 w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="config.styles.rowTextColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Text Color</FormLabel>
                            <FormControl>
                              <Input 
                                type="color" 
                                {...field} 
                                value={field.value || "#5a5c69"}
                                className="h-10 w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="config.styles.borderColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Border Color</FormLabel>
                            <FormControl>
                              <Input 
                                type="color" 
                                {...field} 
                                value={field.value || "#e3e6f0"}
                                className="h-10 w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="config.styles.footerBgColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Footer Background Color</FormLabel>
                            <FormControl>
                              <Input 
                                type="color" 
                                {...field} 
                                value={field.value || "#f8f9fc"}
                                className="h-10 w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="config.styles.footerTextColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Footer Text Color</FormLabel>
                            <FormControl>
                              <Input 
                                type="color" 
                                {...field} 
                                value={field.value || "#5a5c69"}
                                className="h-10 w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-md bg-muted/30 mt-6">
                    <h3 className="text-lg font-medium mb-4">Preview</h3>
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full" style={{ 
                        borderCollapse: 'collapse',
                        border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` 
                      }}>
                        <thead>
                          <tr style={{ 
                            backgroundColor: form.watch("config.styles.headerBgColor") || "#4e73df", 
                            color: form.watch("config.styles.headerTextColor") || "#ffffff" 
                          }}>
                            <th style={{ padding: '10px', textAlign: 'left', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>Column 1</th>
                            <th style={{ padding: '10px', textAlign: 'left', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>Column 2</th>
                            <th style={{ padding: '10px', textAlign: 'left', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>Column 3</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ 
                            backgroundColor: form.watch("config.styles.rowBgColor") || "#ffffff", 
                            color: form.watch("config.styles.rowTextColor") || "#5a5c69" 
                          }}>
                            <td style={{ padding: '8px', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>Data 1</td>
                            <td style={{ padding: '8px', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>Data 2</td>
                            <td style={{ padding: '8px', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>Data 3</td>
                          </tr>
                          <tr style={{ 
                            backgroundColor: form.watch("config.styles.rowAltBgColor") || "#f8f9fc", 
                            color: form.watch("config.styles.rowTextColor") || "#5a5c69" 
                          }}>
                            <td style={{ padding: '8px', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>Data 4</td>
                            <td style={{ padding: '8px', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>Data 5</td>
                            <td style={{ padding: '8px', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>Data 6</td>
                          </tr>
                          {form.watch("config.showTotals") && (
                            <tr style={{ 
                              backgroundColor: "#f1f1f1", 
                              color: form.watch("config.styles.rowTextColor") || "#5a5c69",
                              fontWeight: 'bold' 
                            }}>
                              <td style={{ padding: '8px', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>Total</td>
                              <td style={{ padding: '8px', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>-</td>
                              <td style={{ padding: '8px', border: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}` }}>100</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      
                      {form.watch("config.footerText") && (
                        <div style={{ 
                          padding: '10px', 
                          borderTop: `1px solid ${form.watch("config.styles.borderColor") || "#e3e6f0"}`,
                          backgroundColor: form.watch("config.styles.footerBgColor") || "#f8f9fc",
                          color: form.watch("config.styles.footerTextColor") || "#5a5c69",
                          fontSize: '14px',
                          textAlign: 'center'
                        }}>
                          {form.watch("config.footerText").replace('{currentDate}', new Date().toLocaleDateString())}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("columns")}>
                    Back
                  </Button>
                  <div className="flex space-x-2">
                    <Button type="button" variant="ghost" onClick={() => navigate("/reports")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Template
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}

// Helper function to get default columns for each report type
function getDefaultColumnsForType(type: string) {
  switch (type) {
    case 'attendance':
      return [
        { key: "date", title: "Date", format: "date", width: 15, visible: true, align: "left" },
        { key: "employeeName", title: "Employee Name", width: 25, visible: true, align: "left" },
        { key: "employeeId", title: "Employee ID", width: 15, visible: true, align: "left" },
        { key: "projectName", title: "Project", width: 25, visible: true, align: "left" },
        { key: "clockIn", title: "Clock In", format: "date", width: 15, visible: true, align: "left" },
        { key: "clockOut", title: "Clock Out", format: "date", width: 15, visible: true, align: "left" },
        { key: "duration", title: "Duration (Hours)", format: "number", width: 15, visible: true, align: "right", computeTotal: true },
      ];
    case 'payroll':
      return [
        { key: "period", title: "Period", width: 15, visible: true, align: "left" },
        { key: "employeeName", title: "Employee Name", width: 25, visible: true, align: "left" },
        { key: "employeeId", title: "Employee ID", width: 15, visible: true, align: "left" },
        { key: "totalHours", title: "Hours Worked", format: "number", width: 15, visible: true, align: "right", computeTotal: true },
        { key: "regularPay", title: "Regular Pay", format: "currency", width: 15, visible: true, align: "right", computeTotal: true },
        { key: "overtimePay", title: "Overtime Pay", format: "currency", width: 15, visible: true, align: "right", computeTotal: true },
        { key: "deductions", title: "Deductions", format: "currency", width: 15, visible: true, align: "right", computeTotal: true },
        { key: "netPay", title: "Net Pay", format: "currency", width: 15, visible: true, align: "right", computeTotal: true },
        { key: "status", title: "Status", width: 15, visible: true, align: "left" },
      ];
    case 'employee':
      return [
        { key: "employeeId", title: "Employee ID", width: 15, visible: true, align: "left" },
        { key: "firstName", title: "First Name", width: 20, visible: true, align: "left" },
        { key: "lastName", title: "Last Name", width: 20, visible: true, align: "left" },
        { key: "designation", title: "Designation", width: 20, visible: true, align: "left" },
        { key: "dailyWage", title: "Daily Wage", format: "currency", width: 15, visible: true, align: "right" },
        { key: "mobileNumber", title: "Mobile Number", width: 15, visible: true, align: "left" },
        { key: "joinDate", title: "Join Date", format: "date", width: 15, visible: true, align: "left" },
        { key: "status", title: "Status", width: 15, visible: true, align: "left" },
      ];
    case 'project':
      return [
        { key: "projectId", title: "Project ID", width: 15, visible: true, align: "left" },
        { key: "projectName", title: "Project Name", width: 25, visible: true, align: "left" },
        { key: "clientName", title: "Client", width: 20, visible: true, align: "left" },
        { key: "startDate", title: "Start Date", format: "date", width: 15, visible: true, align: "left" },
        { key: "endDate", title: "End Date", format: "date", width: 15, visible: true, align: "left" },
        { key: "status", title: "Status", width: 10, visible: true, align: "left" },
        { key: "employeeCount", title: "Employees", width: 10, visible: true, align: "center" },
        { key: "totalHours", title: "Total Hours", format: "number", width: 15, visible: true, align: "right", computeTotal: true },
        { key: "totalCost", title: "Total Cost", format: "currency", width: 15, visible: true, align: "right", computeTotal: true },
      ];
    case 'expenditure':
      return [
        { key: "date", title: "Date", format: "date", width: 15, visible: true, align: "left" },
        { key: "category", title: "Category", width: 20, visible: true, align: "left" },
        { key: "description", title: "Description", width: 30, visible: true, align: "left" },
        { key: "projectName", title: "Project", width: 20, visible: true, align: "left" },
        { key: "employeeName", title: "Employee", width: 20, visible: true, align: "left" },
        { key: "amount", title: "Amount", format: "currency", width: 15, visible: true, align: "right", computeTotal: true },
        { key: "paymentMethod", title: "Payment Method", width: 15, visible: true, align: "left" },
        { key: "status", title: "Status", width: 15, visible: true, align: "left" },
      ];
    case 'income':
      return [
        { key: "date", title: "Date", format: "date", width: 15, visible: true, align: "left" },
        { key: "source", title: "Source", width: 20, visible: true, align: "left" },
        { key: "description", title: "Description", width: 30, visible: true, align: "left" },
        { key: "projectName", title: "Project", width: 20, visible: true, align: "left" },
        { key: "amount", title: "Amount", format: "currency", width: 15, visible: true, align: "right", computeTotal: true },
        { key: "paymentMethod", title: "Payment Method", width: 15, visible: true, align: "left" },
        { key: "status", title: "Status", width: 15, visible: true, align: "left" },
      ];
    case 'custom':
      return [
        { key: "customField1", title: "Custom Field 1", width: 20, visible: true, align: "left" },
        { key: "customField2", title: "Custom Field 2", width: 20, visible: true, align: "left" },
        { key: "customField3", title: "Custom Field 3", width: 20, visible: true, align: "left" },
      ];
    default:
      return [
        { key: "", title: "", width: 15, visible: true, align: "left" },
      ];
  }
}