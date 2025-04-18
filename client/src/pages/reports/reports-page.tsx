import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { MoreHorizontal, FileText, Download, Edit, Trash2, PlusCircle, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [filterFromDate, setFilterFromDate] = useState<Date | undefined>(undefined);
  const [filterToDate, setFilterToDate] = useState<Date | undefined>(undefined);
  const [selectedOutput, setSelectedOutput] = useState<string>("html");
  const { toast } = useToast();

  // Fetch all templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/reports/templates'],
    queryFn: async () => {
      const res = await fetch('/api/reports/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    }
  });

  // Generate report
  const handleGenerateReport = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select a report template",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare filters based on date range
      const filters: any = {};
      if (filterFromDate) {
        filters.fromDate = filterFromDate.toISOString();
      }
      if (filterToDate) {
        filters.toDate = filterToDate.toISOString();
      }

      // Determine data type from template
      const dataType = selectedTemplate.type;

      // Make the request to generate the report
      const response = await apiRequest('POST', '/api/reports/generate', {
        templateId: selectedTemplate.id,
        dataType,
        filters,
        format: selectedOutput
      });

      if (selectedOutput === 'html') {
        // For HTML reports, open the response in a new window
        const html = await response.text();
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
        } else {
          toast({
            title: "Warning",
            description: "Pop-up blocker may be preventing the report from opening. Please allow pop-ups for this site.",
            variant: "warning",
          });
        }
      } else if (selectedOutput === 'excel') {
        // For Excel, we would normally handle a file download
        const result = await response.json();
        toast({
          title: "Success",
          description: `Excel report would be downloaded with ${result.dataCount} records.`,
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await apiRequest('DELETE', `/api/reports/templates/${templateId}`);
      
      toast({
        title: "Success",
        description: "Report template deleted successfully",
      });
      
      // Invalidate the templates query to refresh the list
      // queryClient.invalidateQueries(['/api/reports/templates']);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template. It may be a default template that cannot be deleted.",
        variant: "destructive",
      });
    }
  };

  const groupTemplatesByType = (templates: any[] = []) => {
    const grouped: { [key: string]: any[] } = {};
    
    templates?.forEach(template => {
      const type = template.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(template);
    });
    
    return grouped;
  };

  const getTemplatesByType = (type: string) => {
    return templates?.filter(t => t.type === type) || [];
  };

  const renderTemplateCards = () => {
    if (templatesLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    const groupedTemplates = groupTemplatesByType(templates);
    
    if (!templates || templates.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No report templates found</p>
          <Button className="mt-4" asChild>
            <Link href="/reports/create">Create New Template</Link>
          </Button>
        </div>
      );
    }

    return (
      <div>
        {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
          <div key={type} className="mb-8">
            <h3 className="text-lg font-semibold mb-3 capitalize">{type} Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typeTemplates.map((template) => (
                <Card key={template.id} className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Options</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setSelectedTemplate(template)}>Select</DropdownMenuItem>
                          <DropdownMenuItem>
                            <Link href={`/reports/edit/${template.id}`}>Edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => {
                            if (template.isDefault) {
                              toast({
                                title: "Cannot Delete",
                                description: "Default templates cannot be deleted",
                                variant: "destructive",
                              });
                            }
                          }}>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <span className={template.isDefault ? "text-muted-foreground" : "text-destructive"}>
                                  Delete
                                </span>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the
                                    report template.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction disabled={template.isDefault} onClick={() => handleDeleteTemplate(template.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Created: </span>
                        <span className="text-muted-foreground">
                          {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Columns: </span>
                        <span className="text-muted-foreground">
                          {template.config.columns.length} fields
                        </span>
                      </div>
                      {template.isDefault && (
                        <Badge variant="outline" className="mt-2">Default Template</Badge>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between">
                    <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(template)}>
                      <FileText className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      <Link href={`/reports/edit/${template.id}`}>Edit</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and manage customizable reports</p>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link href="/reports/create">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Template
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
        </TabsList>
        <TabsContent value="templates" className="mt-6">
          {renderTemplateCards()}
        </TabsContent>
        <TabsContent value="generate" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Custom Report</CardTitle>
              <CardDescription>
                Select a template and set parameters to generate your report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                    <SelectTrigger id="reportType">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="attendance">Attendance</SelectItem>
                        <SelectItem value="payroll">Payroll</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="expenditure">Expenditure</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {selectedReportType && (
                  <div>
                    <Label htmlFor="template">Template</Label>
                    <Select 
                      value={selectedTemplate?.id} 
                      onValueChange={(id) => {
                        const template = templates?.find(t => t.id === id);
                        setSelectedTemplate(template);
                      }}
                    >
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Available Templates</SelectLabel>
                          {getTemplatesByType(selectedReportType).map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedTemplate && (
                  <div className="bg-muted/50 p-4 rounded-md">
                    <h4 className="font-medium mb-2">{selectedTemplate.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{selectedTemplate.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Columns: </span>
                        <span className="text-muted-foreground">{selectedTemplate.config.columns.length}</span>
                      </div>
                      <div>
                        <span className="font-medium">Group By: </span>
                        <span className="text-muted-foreground">{selectedTemplate.config.groupBy || 'None'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Show Totals: </span>
                        <span className="text-muted-foreground">{selectedTemplate.config.showTotals ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Orientation: </span>
                        <span className="text-muted-foreground capitalize">{selectedTemplate.config.orientation || 'Portrait'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Report Parameters */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Report Parameters</h3>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromDate">From Date</Label>
                    <DatePicker 
                      date={filterFromDate} 
                      setDate={setFilterFromDate} 
                      placeholder="Select start date" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toDate">To Date</Label>
                    <DatePicker 
                      date={filterToDate} 
                      setDate={setFilterToDate} 
                      placeholder="Select end date" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="outputFormat">Output Format</Label>
                  <Select value={selectedOutput} onValueChange={setSelectedOutput}>
                    <SelectTrigger id="outputFormat">
                      <SelectValue placeholder="Select output format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="html">HTML (View in Browser)</SelectItem>
                      <SelectItem value="excel">Excel (Download)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Reset</Button>
              <Button 
                onClick={handleGenerateReport}
                disabled={!selectedTemplate}
              >
                Generate Report
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}