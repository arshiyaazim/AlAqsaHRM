import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  ResponderProvided,
} from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2, Undo, Save, ArrowLeft, Eye } from 'lucide-react';
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

// Interface definitions for report templates
interface ColumnConfig {
  key: string;
  title: string;
  format?: 'text' | 'number' | 'date' | 'currency' | 'percentage';
  align?: 'left' | 'center' | 'right';
  width?: number;
  visible?: boolean;
  computeTotal?: boolean;
}

interface ReportConfig {
  columns: ColumnConfig[];
  filters: string[];
  showTotals: boolean;
  orientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  pageMargin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fontSize?: number;
  fontFamily?: string;
  headerImageUrl?: string;
  footerText?: string;
  includeDateRange?: boolean;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'attendance' | 'payroll' | 'employee' | 'project' | 'expenditure' | 'income';
  config: ReportConfig;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Validation schema
const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  type: z.enum(['attendance', 'payroll', 'employee', 'project', 'expenditure', 'income']),
  config: z.object({
    showTotals: z.boolean(),
    orientation: z.enum(['portrait', 'landscape']),
    pageSize: z.enum(['A4', 'A3', 'Letter', 'Legal']),
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
    headerImageUrl: z.string().optional(),
    footerText: z.string().optional(),
    includeDateRange: z.boolean().optional(),
    filters: z.array(z.string()),
    columns: z.array(
      z.object({
        key: z.string(),
        title: z.string(),
        format: z.enum(['text', 'number', 'date', 'currency', 'percentage']).optional(),
        align: z.enum(['left', 'center', 'right']).optional(),
        width: z.number().optional(),
        visible: z.boolean().optional(),
        computeTotal: z.boolean().optional(),
      })
    ),
    pageMargin: z
      .object({
        top: z.number(),
        right: z.number(),
        bottom: z.number(),
        left: z.number(),
      })
      .optional(),
  }),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

// Column options based on report type
const columnOptions = {
  attendance: [
    { key: 'date', title: 'Date', format: 'date' },
    { key: 'employeeId', title: 'Employee ID', format: 'text' },
    { key: 'employeeName', title: 'Employee Name', format: 'text' },
    { key: 'checkIn', title: 'Check In', format: 'text' },
    { key: 'checkOut', title: 'Check Out', format: 'text' },
    { key: 'hoursWorked', title: 'Hours Worked', format: 'number' },
    { key: 'projectName', title: 'Project', format: 'text' },
    { key: 'location', title: 'Location', format: 'text' },
    { key: 'remarks', title: 'Remarks', format: 'text' },
  ],
  payroll: [
    { key: 'periodStart', title: 'Period Start', format: 'date' },
    { key: 'periodEnd', title: 'Period End', format: 'date' },
    { key: 'employeeId', title: 'Employee ID', format: 'text' },
    { key: 'employeeName', title: 'Employee Name', format: 'text' },
    { key: 'designation', title: 'Designation', format: 'text' },
    { key: 'daysWorked', title: 'Days Worked', format: 'number' },
    { key: 'basicSalary', title: 'Basic Salary', format: 'currency' },
    { key: 'allowances', title: 'Allowances', format: 'currency' },
    { key: 'overtime', title: 'Overtime', format: 'currency' },
    { key: 'deductions', title: 'Deductions', format: 'currency' },
    { key: 'tax', title: 'Tax', format: 'currency' },
    { key: 'netSalary', title: 'Net Salary', format: 'currency' },
    { key: 'paymentStatus', title: 'Payment Status', format: 'text' },
    { key: 'paymentDate', title: 'Payment Date', format: 'date' },
    { key: 'paymentMethod', title: 'Payment Method', format: 'text' },
  ],
  employee: [
    { key: 'employeeId', title: 'Employee ID', format: 'text' },
    { key: 'firstName', title: 'First Name', format: 'text' },
    { key: 'lastName', title: 'Last Name', format: 'text' },
    { key: 'fullName', title: 'Full Name', format: 'text' },
    { key: 'designation', title: 'Designation', format: 'text' },
    { key: 'department', title: 'Department', format: 'text' },
    { key: 'joinDate', title: 'Join Date', format: 'date' },
    { key: 'dailyWage', title: 'Daily Wage', format: 'currency' },
    { key: 'mobileNumber', title: 'Mobile Number', format: 'text' },
    { key: 'nidPassport', title: 'NID/Passport', format: 'text' },
    { key: 'address', title: 'Address', format: 'text' },
    { key: 'email', title: 'Email', format: 'text' },
    { key: 'status', title: 'Status', format: 'text' },
  ],
  project: [
    { key: 'name', title: 'Project Name', format: 'text' },
    { key: 'clientName', title: 'Client Name', format: 'text' },
    { key: 'vessel', title: 'Vessel', format: 'text' },
    { key: 'lighter', title: 'Lighter', format: 'text' },
    { key: 'startDate', title: 'Start Date', format: 'date' },
    { key: 'endDate', title: 'End Date', format: 'date' },
    { key: 'salary', title: 'Salary', format: 'currency' },
    { key: 'releasePoint', title: 'Release Point', format: 'text' },
    { key: 'conveyance', title: 'Conveyance', format: 'text' },
    { key: 'loanAdvance', title: 'Loan/Advance', format: 'currency' },
    { key: 'due', title: 'Due', format: 'currency' },
    { key: 'status', title: 'Status', format: 'text' },
    { key: 'description', title: 'Description', format: 'text' },
    { key: 'employeeCount', title: 'Employee Count', format: 'number' },
    { key: 'totalExpenditure', title: 'Total Expenditure', format: 'currency' },
  ],
  expenditure: [
    { key: 'date', title: 'Date', format: 'date' },
    { key: 'projectName', title: 'Project', format: 'text' },
    { key: 'category', title: 'Category', format: 'text' },
    { key: 'description', title: 'Description', format: 'text' },
    { key: 'amount', title: 'Amount', format: 'currency' },
    { key: 'paymentMethod', title: 'Payment Method', format: 'text' },
    { key: 'recordedBy', title: 'Recorded By', format: 'text' },
    { key: 'attachmentUrl', title: 'Attachment', format: 'text' },
    { key: 'remarks', title: 'Remarks', format: 'text' },
  ],
  income: [
    { key: 'date', title: 'Date', format: 'date' },
    { key: 'projectName', title: 'Project', format: 'text' },
    { key: 'source', title: 'Source', format: 'text' },
    { key: 'description', title: 'Description', format: 'text' },
    { key: 'amount', title: 'Amount', format: 'currency' },
    { key: 'paymentMethod', title: 'Payment Method', format: 'text' },
    { key: 'recordedBy', title: 'Recorded By', format: 'text' },
    { key: 'attachmentUrl', title: 'Attachment', format: 'text' },
    { key: 'remarks', title: 'Remarks', format: 'text' },
  ],
};

// Filter options based on report type
const filterOptions = {
  attendance: ['dateRange', 'employeeId', 'projectId'],
  payroll: ['dateRange', 'employeeId', 'paymentStatus'],
  employee: ['designation', 'department', 'status'],
  project: ['status', 'clientName', 'dateRange'],
  expenditure: ['dateRange', 'projectId', 'category'],
  income: ['dateRange', 'projectId', 'source'],
};

// Format options for columns
const formatOptions = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
];

// Align options for columns
const alignOptions = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

// Report type options
const reportTypeOptions = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'employee', label: 'Employee' },
  { value: 'project', label: 'Project' },
  { value: 'expenditure', label: 'Expenditure' },
  { value: 'income', label: 'Income' },
];

// Page size options
const pageSizeOptions = [
  { value: 'A4', label: 'A4' },
  { value: 'A3', label: 'A3' },
  { value: 'Letter', label: 'Letter' },
  { value: 'Legal', label: 'Legal' },
];

// Orientation options
const orientationOptions = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];

// Sortable column item component
function SortableColumnItem({ 
  column, 
  index, 
  onEdit, 
  onDelete 
}: { 
  column: ColumnConfig; 
  index: number; 
  onEdit: (index: number, column: ColumnConfig) => void; 
  onDelete: (index: number) => void; 
}) {
  return (
    <Draggable draggableId={`column-${index}`} index={index}>
      {(provided) => (
        <div 
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="flex items-center space-x-4 p-3 border rounded-md bg-background mb-2"
        >
          <div className="cursor-grab" {...provided.dragHandleProps}>
            <GripVertical size={20} className="text-muted-foreground" />
          </div>
          
          <div className="flex-1 space-y-1">
            <div className="font-medium">{column.title}</div>
            <div className="text-xs text-muted-foreground">
              {column.key} • {column.format || 'text'} 
              {column.computeTotal && ' • Total'}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onEdit(index, column)}
            >
              Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(index)}
            >
              <Trash2 size={16} className="text-destructive" />
            </Button>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function TemplateEditor() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [location] = useLocation();
  
  // Extract template ID from URL if editing
  const templateId = new URLSearchParams(location.split('?')[1]).get('id');
  const isEditing = !!templateId;
  
  // State management
  const [activeTab, setActiveTab] = useState('basic');
  const [editingColumn, setEditingColumn] = useState<ColumnConfig | null>(null);
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  
  // DnD handler for column reordering
  const onDragEnd = (result: DropResult, provided?: ResponderProvided) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    const newColumns = [...watchColumns];
    const [moved] = newColumns.splice(sourceIndex, 1);
    newColumns.splice(destinationIndex, 0, moved);
    
    form.setValue('config.columns', newColumns, { shouldDirty: true });
  };
  
  // Form setup
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'attendance',
      config: {
        columns: [],
        filters: [],
        showTotals: true,
        orientation: 'landscape',
        pageSize: 'A4',
        fontSize: 12,
        includeDateRange: true,
      },
    },
  });
  
  // Get current values for conditional rendering
  const watchType = form.watch('type');
  const watchColumns = form.watch('config.columns');
  
  // Query to get template if editing
  const {
    data: templateData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['/api/reports/templates', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const response = await fetch(`/api/reports/templates/${templateId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch template details');
      }
      return response.json();
    },
    enabled: !!templateId,
  });
  
  // Initialize form with template data if editing
  useEffect(() => {
    if (templateData && isEditing) {
      form.reset({
        name: templateData.name,
        description: templateData.description,
        type: templateData.type,
        config: templateData.config,
      });
    }
  }, [templateData, isEditing, form]);
  
  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async (templateData: TemplateFormValues) => {
      const payload = {
        ...templateData,
        id: templateId || `template-${Date.now()}`,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing 
        ? `/api/reports/templates/${templateId}` 
        : '/api/reports/templates';
      
      const response = await apiRequest(method, url, payload);
      
      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} template`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: `Template ${isEditing ? 'updated' : 'created'} successfully`,
        description: `Report template has been ${isEditing ? 'updated' : 'created'}.`,
      });
      
      // Invalidate queries and navigate back
      queryClient.invalidateQueries({ queryKey: ['/api/reports/templates'] });
      navigate('/reports');
    },
    onError: (error: Error) => {
      toast({
        title: `Failed to ${isEditing ? 'update' : 'create'} template`,
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: TemplateFormValues) => {
    saveMutation.mutate(data);
  };
  
  // Reset columns when report type changes
  useEffect(() => {
    if (form.formState.isDirty && !isEditing) {
      form.setValue('config.columns', []);
      form.setValue('config.filters', []);
    }
  }, [watchType, form, isEditing]);
  
  // This function is no longer needed since we're using the @hello-pangea/dnd
  // onDragEnd handler instead for column reordering
  const handleDragEnd = () => {
    // Empty as we're now using onDragEnd from DragDropContext
  };
  
  // Handle adding or editing a column
  const handleColumnChange = (column: ColumnConfig) => {
    if (editingColumnIndex !== null) {
      // Edit existing column
      const updatedColumns = [...watchColumns];
      updatedColumns[editingColumnIndex] = column;
      form.setValue('config.columns', updatedColumns, { shouldDirty: true });
    } else {
      // Add new column
      form.setValue('config.columns', [...watchColumns, column], { shouldDirty: true });
    }
    
    setEditingColumn(null);
    setEditingColumnIndex(null);
    setIsAddingColumn(false);
  };
  
  // Initialize column edit
  const handleEditColumn = (index: number, column: ColumnConfig) => {
    setEditingColumn({ ...column });
    setEditingColumnIndex(index);
    setIsAddingColumn(true);
  };
  
  // Handle column deletion
  const handleDeleteColumn = (index: number) => {
    const updatedColumns = [...watchColumns];
    updatedColumns.splice(index, 1);
    form.setValue('config.columns', updatedColumns, { shouldDirty: true });
  };
  
  // Check for default columns to add
  const getDefaultColumns = () => {
    const type = form.getValues('type');
    if (columnOptions[type as keyof typeof columnOptions]) {
      return columnOptions[type as keyof typeof columnOptions].map(col => ({
        ...col,
        // Explicitly cast the format to our allowed union type
        format: (col.format as 'text' | 'number' | 'date' | 'currency' | 'percentage'),
        visible: true,
        computeTotal: ['number', 'currency'].includes(col.format),
        width: 100,
        // Explicitly cast the align to our allowed union type
        align: (col.format === 'number' || col.format === 'currency' ? 'right' : 'left') as 'left' | 'center' | 'right',
      }));
    }
    return [];
  };
  
  // Add default columns
  const handleAddDefaultColumns = () => {
    form.setValue('config.columns', getDefaultColumns(), { shouldDirty: true });
    
    // Also set default filters
    const type = form.getValues('type');
    if (filterOptions[type as keyof typeof filterOptions]) {
      form.setValue('config.filters', [...filterOptions[type as keyof typeof filterOptions]], { shouldDirty: true });
    }
  };
  
  // Handle filter checkbox change
  const handleFilterChange = (filterId: string, checked: boolean) => {
    const currentFilters = form.getValues('config.filters');
    
    if (checked) {
      form.setValue('config.filters', [...currentFilters, filterId], { shouldDirty: true });
    } else {
      form.setValue(
        'config.filters',
        currentFilters.filter(id => id !== filterId),
        { shouldDirty: true }
      );
    }
  };
  
  // Preview the report template
  const handlePreview = () => {
    // Get current form data
    const formData = form.getValues();
    
    // Build the preview URL with template data
    const previewData = {
      id: templateId || `preview-${Date.now()}`,
      name: formData.name || 'Preview Template',
      description: formData.description || '',
      type: formData.type,
      config: formData.config,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Open preview in new window
    const queryParams = new URLSearchParams();
    queryParams.append('templateId', previewData.id);
    queryParams.append('format', 'html');
    queryParams.append('dataType', previewData.type);
    
    window.open(`/api/reports/generate?${queryParams.toString()}`, '_blank');
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  // Error state
  if (isError && isEditing) {
    return (
      <div className="container py-6">
        <Card className="p-6 text-center">
          <CardTitle className="text-destructive mb-2">Error Loading Template</CardTitle>
          <CardDescription className="mb-4">
            {error instanceof Error ? error.message : 'Failed to load template data'}
          </CardDescription>
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Reports
          </Button>
        </Card>
      </div>
    );
  }
  
  // Column form for adding/editing columns
  const ColumnForm = () => (
    <Card className="border-t-0 rounded-t-none">
      <CardHeader>
        <CardTitle>{editingColumnIndex !== null ? 'Edit Column' : 'Add Column'}</CardTitle>
        <CardDescription>Configure the column properties</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormLabel htmlFor="column-key">Column ID</FormLabel>
            <Input
              id="column-key"
              value={editingColumn?.key || ''}
              onChange={e => setEditingColumn({ ...editingColumn!, key: e.target.value })}
              placeholder="e.g., employeeName"
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for the column
            </p>
          </div>
          
          <div className="space-y-2">
            <FormLabel htmlFor="column-title">Display Title</FormLabel>
            <Input
              id="column-title"
              value={editingColumn?.title || ''}
              onChange={e => setEditingColumn({ ...editingColumn!, title: e.target.value })}
              placeholder="e.g., Employee Name"
            />
            <p className="text-xs text-muted-foreground">
              The title displayed in the report
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormLabel htmlFor="column-format">Format</FormLabel>
            <Select
              value={editingColumn?.format || 'text'}
              onValueChange={value => 
                setEditingColumn({ 
                  ...editingColumn!, 
                  format: value as 'text' | 'number' | 'date' | 'currency' | 'percentage' 
                })
              }
            >
              <SelectTrigger id="column-format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How to format the column data
            </p>
          </div>
          
          <div className="space-y-2">
            <FormLabel htmlFor="column-align">Alignment</FormLabel>
            <Select
              value={editingColumn?.align || 'left'}
              onValueChange={value => 
                setEditingColumn({ 
                  ...editingColumn!, 
                  align: value as 'left' | 'center' | 'right' 
                })
              }
            >
              <SelectTrigger id="column-align">
                <SelectValue placeholder="Select alignment" />
              </SelectTrigger>
              <SelectContent>
                {alignOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Text alignment in the column
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormLabel htmlFor="column-width">Width (px)</FormLabel>
            <Input
              id="column-width"
              type="number"
              value={editingColumn?.width || 100}
              onChange={e => 
                setEditingColumn({ 
                  ...editingColumn!, 
                  width: parseInt(e.target.value) || 100
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Column width in pixels
            </p>
          </div>
          
          <div className="space-y-4 pt-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="column-visible"
                checked={editingColumn?.visible !== false}
                onCheckedChange={checked => 
                  setEditingColumn({ 
                    ...editingColumn!, 
                    visible: checked === true
                  })
                }
              />
              <label
                htmlFor="column-visible"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Visible
              </label>
            </div>
            
            {(editingColumn?.format === 'number' || editingColumn?.format === 'currency') && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="column-total"
                  checked={editingColumn.computeTotal === true}
                  onCheckedChange={checked => 
                    setEditingColumn({ 
                      ...editingColumn, 
                      computeTotal: checked === true
                    })
                  }
                />
                <label
                  htmlFor="column-total"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Calculate Total
                </label>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setEditingColumn(null);
            setEditingColumnIndex(null);
            setIsAddingColumn(false);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (!editingColumn) return;
            if (!editingColumn.key || !editingColumn.title) {
              toast({
                title: 'Invalid column',
                description: 'Column ID and Title are required',
                variant: 'destructive',
              });
              return;
            }
            handleColumnChange(editingColumn);
          }}
        >
          {editingColumnIndex !== null ? 'Update Column' : 'Add Column'}
        </Button>
      </CardFooter>
    </Card>
  );
  
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Report Template' : 'Create New Report Template'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing 
              ? 'Modify an existing report template'
              : 'Build a custom report template to use across your reports'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {form.formState.isDirty && (
            <AlertDialog open={isDiscardDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" onClick={() => setIsDiscardDialogOpen(true)}>
                  <Undo size={16} className="mr-2" />
                  Discard Changes
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You have unsaved changes that will be lost. Are you sure you want to discard them?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsDiscardDialogOpen(false)}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    setIsDiscardDialogOpen(false);
                    navigate('/reports');
                  }}>
                    Discard Changes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="columns">
                Columns {watchColumns.length > 0 && `(${watchColumns.length})`}
              </TabsTrigger>
              <TabsTrigger value="options">Layout & Options</TabsTrigger>
            </TabsList>
            
            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Enter the basic details for your report template
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Monthly Attendance Report" {...field} />
                        </FormControl>
                        <FormDescription>
                          A descriptive name for your report template
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
                          <Textarea 
                            placeholder="e.g., Detailed monthly report showing employee attendance records"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          A brief description of what this report template is used for
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
                          disabled={isEditing}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select report type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {reportTypeOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {isEditing
                            ? "Report type cannot be changed after creation"
                            : "The type of data this report will display"
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Columns Tab */}
            <TabsContent value="columns" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Report Columns</CardTitle>
                    <CardDescription>
                      Configure the columns that will appear in your report
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    {watchColumns.length === 0 && (
                      <Button 
                        variant="outline" 
                        onClick={handleAddDefaultColumns}
                        type="button"
                      >
                        Add Default Columns
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setEditingColumn({
                          key: '',
                          title: '',
                          format: 'text',
                          align: 'left',
                          width: 100,
                          visible: true,
                        });
                        setEditingColumnIndex(null);
                        setIsAddingColumn(true);
                      }}
                      type="button"
                      className="flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Column
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {watchColumns.length === 0 ? (
                    <div className="p-8 text-center border rounded-md">
                      <p className="text-muted-foreground mb-4">
                        No columns added yet. Add columns to define your report structure.
                      </p>
                      <Button
                        onClick={() => {
                          setEditingColumn({
                            key: '',
                            title: '',
                            format: 'text',
                            align: 'left',
                            width: 100,
                            visible: true,
                          });
                          setEditingColumnIndex(null);
                          setIsAddingColumn(true);
                        }}
                        type="button"
                      >
                        Add Your First Column
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="columns-list">
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                            >
                              {watchColumns.map((column, index) => (
                                <SortableColumnItem
                                  key={`column-${index}`}
                                  column={column}
                                  index={index}
                                  onEdit={handleEditColumn}
                                  onDelete={handleDeleteColumn}
                                />
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {isAddingColumn && editingColumn && <ColumnForm />}
              
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                  <CardDescription>
                    Select the filters users can apply to this report
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filterOptions[watchType as keyof typeof filterOptions]?.map((filterId) => {
                      const currentFilters = form.watch('config.filters');
                      const isChecked = currentFilters.includes(filterId);
                      
                      let label = filterId;
                      if (filterId === 'dateRange') label = 'Date Range';
                      if (filterId === 'employeeId') label = 'Employee';
                      if (filterId === 'projectId') label = 'Project';
                      if (filterId === 'paymentStatus') label = 'Payment Status';
                      if (filterId === 'designation') label = 'Designation';
                      if (filterId === 'department') label = 'Department';
                      if (filterId === 'status') label = 'Status';
                      if (filterId === 'clientName') label = 'Client';
                      if (filterId === 'category') label = 'Category';
                      if (filterId === 'source') label = 'Source';
                      
                      return (
                        <div key={filterId} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-${filterId}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => 
                              handleFilterChange(filterId, checked === true)
                            }
                          />
                          <label
                            htmlFor={`filter-${filterId}`}
                            className="text-sm font-medium leading-none"
                          >
                            {label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Layout & Options Tab */}
            <TabsContent value="options" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Layout Options</CardTitle>
                  <CardDescription>
                    Configure page layout and formatting options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="config.orientation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orientation</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select orientation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {orientationOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Page orientation for the report
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="config.pageSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page Size</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select page size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {pageSizeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Standard page size for the report
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="config.fontSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Font Size (px)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 12)}
                            />
                          </FormControl>
                          <FormDescription>
                            Base font size for the report
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="config.fontFamily"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Font Family</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Arial, sans-serif" 
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Font family for the report (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="config.headerImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Header Image URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., https://example.com/logo.png" 
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            URL for header image (optional)
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
                            <Input 
                              placeholder="e.g., Confidential Report" 
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Custom text for report footer (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Display Options</CardTitle>
                  <CardDescription>
                    Configure display behavior and additional options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="config.showTotals"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Show Totals</FormLabel>
                          <FormDescription>
                            Show totals row for number/currency columns
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
                    name="config.includeDateRange"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Include Date Range</FormLabel>
                          <FormDescription>
                            Show the date range in the report header
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
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={watchColumns.length === 0}
              className="flex items-center gap-2"
            >
              <Eye size={16} />
              Preview
            </Button>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/reports')}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={!form.formState.isDirty || watchColumns.length === 0 || saveMutation.isPending}
                className="flex items-center gap-2"
              >
                {saveMutation.isPending && (
                  <div className="animate-spin w-4 h-4 border-2 border-background border-t-transparent rounded-full mr-2" />
                )}
                <Save size={16} className="mr-2" />
                {isEditing ? 'Update Template' : 'Save Template'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}