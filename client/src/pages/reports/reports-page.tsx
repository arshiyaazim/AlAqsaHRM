import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmployeeIdAutocomplete from '@/components/common/employee-id-autocomplete';
import { useLocation } from 'wouter';
import { FileText, Download, Pencil, Trash2, Plus, Filter, FileDown, RefreshCw, Copy } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
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
import { apiRequest, queryClient } from '@/lib/queryClient';

// Report template interface
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

// Type filter options
const typeOptions = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'employee', label: 'Employee' },
  { value: 'project', label: 'Project' },
  { value: 'expenditure', label: 'Expenditure' },
  { value: 'income', label: 'Income' }
];

// Format options
const formatOptions = [
  { value: 'html', label: 'HTML' },
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' }
];

export default function ReportsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('html');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Fetch templates
  const { data: templates = [], isLoading, isError, error } = useQuery({
    queryKey: ['/api/reports/templates'],
    queryFn: async () => {
      const response = await fetch('/api/reports/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch report templates');
      }
      return response.json();
    }
  });
  
  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiRequest('DELETE', `/api/reports/templates/${templateId}`);
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template deleted',
        description: 'The report template has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/templates'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete template',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Clone template mutation
  const cloneMutation = useMutation({
    mutationFn: async (template: ReportTemplate) => {
      // Create a clone with a new ID and name
      const clonedTemplate = {
        ...template,
        id: `cloned-${template.type}-${Date.now()}`,
        name: `Copy of ${template.name}`,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const response = await apiRequest('POST', '/api/reports/templates', clonedTemplate);
      
      if (!response.ok) {
        throw new Error('Failed to clone template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template cloned',
        description: 'A copy of the template has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/templates'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to clone template',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Filter templates by type
  const filteredTemplates = selectedType 
    ? templates.filter((template: ReportTemplate) => template.type === selectedType)
    : templates;
  
  // Handle generating a report
  const handleGenerateReport = (template: ReportTemplate) => {
    // Get filter query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('templateId', template.id);
    queryParams.append('format', selectedFormat);
    queryParams.append('dataType', template.type);
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    // Open in new window
    window.open(`/api/reports/generate?${queryParams.toString()}`, '_blank');
  };
  
  // Handle deleting a template
  const handleDeleteTemplate = () => {
    if (selectedTemplate) {
      deleteMutation.mutate(selectedTemplate.id);
    }
  };
  
  // Handle cloning a template
  const handleCloneTemplate = (template: ReportTemplate) => {
    cloneMutation.mutate(template);
  };
  
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Create, manage, and generate reports from templates
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
        </TabsList>
        
        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {typeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedType && (
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedType(undefined)}
                  size="sm"
                >
                  Clear
                </Button>
              )}
            </div>
            
            <Button onClick={() => navigate('/reports/template-editor')} className="flex items-center gap-2">
              <Plus size={16} />
              Create Template
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : isError ? (
            <Card className="p-6 text-center">
              <div className="text-destructive mb-2">Error loading templates</div>
              <p className="text-muted-foreground text-sm mb-4">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <Button 
                variant="outline" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/reports/templates'] })}
                className="mx-auto"
              >
                <RefreshCw size={16} className="mr-2" />
                Retry
              </Button>
            </Card>
          ) : filteredTemplates.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                {selectedType
                  ? `No ${selectedType} templates found`
                  : 'No templates found'
                }
              </p>
              <Button onClick={() => navigate('/reports/template-editor')}>
                Create Your First Template
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template: ReportTemplate) => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="mb-1">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                      <div className="flex items-center">
                        {template.isDefault && (
                          <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md mr-2">
                            Default
                          </span>
                        )}
                        <Badge
                          className="capitalize"
                          variant={typeOptions.find(t => t.value === template.type)?.value || undefined}
                        >
                          {template.type}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      <span className="font-medium">Last updated:</span>{' '}
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </div>
                    
                    <div className="bg-muted rounded-md p-3 text-xs">
                      <div className="font-medium mb-1">Column Preview:</div>
                      <div className="flex flex-wrap gap-1">
                        {template.config.columns
                          .filter(col => col.visible !== false)
                          .slice(0, 8)
                          .map((col, idx) => (
                            <div key={idx} className="bg-background px-2 py-1 rounded-sm">
                              {col.title}
                            </div>
                          ))}
                        {template.config.columns.length > 8 && (
                          <div className="bg-background px-2 py-1 rounded-sm">
                            +{template.config.columns.length - 8} more
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-between pt-2">
                    <div className="flex gap-2">
                      <AlertDialog open={isDeleteDialogOpen && selectedTemplate?.id === template.id}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={template.isDefault}
                            onClick={() => {
                              setSelectedTemplate(template);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the "{template.name}" template.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteTemplate}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleCloneTemplate(template)}
                      >
                        <Copy size={16} />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(`/reports/template-editor?id=${template.id}`)}
                      >
                        <Pencil size={16} />
                      </Button>
                    </div>
                    
                    <Sheet open={isFiltersOpen && selectedTemplate?.id === template.id}>
                      <SheetTrigger asChild>
                        <Button 
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsFiltersOpen(true);
                            // Reset filters
                            setFilters({});
                          }}
                        >
                          Generate
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-md">
                        <SheetHeader>
                          <SheetTitle>Generate Report</SheetTitle>
                          <SheetDescription>
                            Configure options for {template.name}
                          </SheetDescription>
                        </SheetHeader>
                        
                        <div className="py-6">
                          <div className="mb-4">
                            <Label htmlFor="format">Output Format</Label>
                            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                              <SelectTrigger id="format">
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
                          </div>
                          
                          <Separator className="my-4" />
                          
                          <div className="mb-4">
                            <h3 className="text-sm font-medium mb-2">Filters</h3>
                            
                            {template.config.filters.includes('dateRange') && (
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="startDate">Start Date</Label>
                                  <DatePicker
                                    placeholder="Select start date"
                                    onChange={(date) => 
                                      setFilters(prev => ({ 
                                        ...prev, 
                                        startDate: date?.toISOString().split('T')[0] 
                                      }))
                                    }
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="endDate">End Date</Label>
                                  <DatePicker
                                    placeholder="Select end date"
                                    onChange={(date) => 
                                      setFilters(prev => ({ 
                                        ...prev, 
                                        endDate: date?.toISOString().split('T')[0] 
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            )}
                            
                            {template.config.filters.includes('employeeId') && (
                              <div className="mt-4">
                                <Label htmlFor="employeeId">Employee</Label>
                                <EmployeeIdAutocomplete 
                                  value={filters.employeeId || ""}
                                  onChange={(value) => 
                                    setFilters(prev => ({ ...prev, employeeId: value }))
                                  }
                                  placeholder="Select employee ID"
                                  showEmployeeName={true}
                                />
                              </div>
                            )}
                            
                            {template.config.filters.includes('projectId') && (
                              <div className="mt-4">
                                <Label htmlFor="projectId">Project</Label>
                                <Input 
                                  id="projectId" 
                                  placeholder="Project ID"
                                  onChange={(e) => 
                                    setFilters(prev => ({ ...prev, projectId: e.target.value }))
                                  }
                                />
                              </div>
                            )}
                            
                            {/* Add other filters based on template.config.filters */}
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-4">
                          <Button 
                            variant="outline"
                            onClick={() => setIsFiltersOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => {
                              handleGenerateReport(template);
                              setIsFiltersOpen(false);
                            }}
                          >
                            <FileDown size={16} className="mr-2" />
                            Generate
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Generate a Report</CardTitle>
              <CardDescription>
                Select a template and configure options to generate a report
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-0 space-y-4">
              <div>
                <Label htmlFor="report-type">Report Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger id="report-type">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedType && (
                <div>
                  <Label htmlFor="template">Template</Label>
                  <Select 
                    value={selectedTemplate?.id} 
                    onValueChange={(value) => {
                      const template = templates.find((t: ReportTemplate) => t.id === value);
                      setSelectedTemplate(template || null);
                    }}
                  >
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates
                        .filter((template: ReportTemplate) => template.type === selectedType)
                        .map((template: ReportTemplate) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {selectedTemplate && (
                <>
                  <div>
                    <Label htmlFor="output-format">Output Format</Label>
                    <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                      <SelectTrigger id="output-format">
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
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Filters</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setFilters({})}
                      >
                        Clear All
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {selectedTemplate.config.filters.includes('dateRange') && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="startDate2">Start Date</Label>
                            <DatePicker
                              placeholder="Select start date"
                              onChange={(date) => 
                                setFilters(prev => ({ 
                                  ...prev, 
                                  startDate: date?.toISOString().split('T')[0] 
                                }))
                              }
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="endDate2">End Date</Label>
                            <DatePicker
                              placeholder="Select end date"
                              onChange={(date) => 
                                setFilters(prev => ({ 
                                  ...prev, 
                                  endDate: date?.toISOString().split('T')[0] 
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}
                      
                      {selectedTemplate.config.filters.includes('employeeId') && (
                        <div>
                          <Label htmlFor="employeeId2">Employee</Label>
                          <EmployeeIdAutocomplete 
                            value={filters.employeeId || ""}
                            onChange={(value) => 
                              setFilters(prev => ({ ...prev, employeeId: value }))
                            }
                            placeholder="Select employee ID"
                            showEmployeeName={true}
                          />
                        </div>
                      )}
                      
                      {selectedTemplate.config.filters.includes('projectId') && (
                        <div>
                          <Label htmlFor="projectId2">Project</Label>
                          <Input 
                            id="projectId2" 
                            placeholder="Project ID"
                            onChange={(e) => 
                              setFilters(prev => ({ ...prev, projectId: e.target.value }))
                            }
                          />
                        </div>
                      )}
                      
                      {/* Add other filters based on selectedTemplate.config.filters */}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            
            <CardFooter className="px-0 flex justify-end">
              <Button
                disabled={!selectedTemplate}
                onClick={() => {
                  if (selectedTemplate) {
                    handleGenerateReport(selectedTemplate);
                  }
                }}
              >
                <FileDown size={16} className="mr-2" />
                Generate Report
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Badge component with conditional colors based on template type
function Badge({ 
  children, 
  className, 
  variant 
}: { 
  children: React.ReactNode; 
  className?: string;
  variant?: string;
}) {
  let variantClass = 'bg-gray-100 text-gray-800';
  
  switch (variant) {
    case 'attendance':
      variantClass = 'bg-blue-100 text-blue-800';
      break;
    case 'payroll':
      variantClass = 'bg-green-100 text-green-800';
      break;
    case 'employee':
      variantClass = 'bg-purple-100 text-purple-800';
      break;
    case 'project':
      variantClass = 'bg-yellow-100 text-yellow-800';
      break;
    case 'expenditure':
      variantClass = 'bg-red-100 text-red-800';
      break;
    case 'income':
      variantClass = 'bg-emerald-100 text-emerald-800';
      break;
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${variantClass} ${className}`}>
      {children}
    </span>
  );
}