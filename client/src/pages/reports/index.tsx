import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, FileOutput, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("generate");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/reports/templates'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/reports/templates');
        if (!res.ok) throw new Error('Failed to fetch templates');
        return res.json();
      } catch (error) {
        // When API is not yet available, return empty array
        console.error("Error fetching templates:", error);
        return [];
      }
    }
  });

  // Group templates by type
  const groupedTemplates = templates ? groupTemplatesByType(templates) : {};

  function groupTemplatesByType(templates: any[] = []) {
    const grouped: { [key: string]: any[] } = {};
    
    templates.forEach(template => {
      const type = template.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(template);
    });
    
    return grouped;
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate and manage customizable reports</p>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link href="/reports/templates/create">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="templates">Manage Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Reports</CardTitle>
              <CardDescription>
                Select a template to generate a customized report
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.keys(groupedTemplates).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No report templates found</p>
                      <Button asChild variant="outline">
                        <Link href="/reports/templates/create">Create Your First Template</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {Object.entries(groupedTemplates).map(([type, typeTemplates]: [string, any[]]) => (
                        <div key={type} className="space-y-4">
                          <h3 className="text-lg font-medium capitalize">{type} Reports</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {typeTemplates.map((template) => (
                              <Card key={template.id} className="cursor-pointer hover:border-primary transition-colors"
                                onClick={() => {
                                  toast({
                                    title: "Generating Report",
                                    description: `Preparing ${template.name} report...`,
                                  });
                                  
                                  // In a real implementation, this would navigate to a form or directly generate the report
                                  window.open(`/api/reports/generate?templateId=${template.id}&format=html&dataType=${template.type}`, '_blank');
                                }}
                              >
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{template.name}</CardTitle>
                                    {template.isDefault && (
                                      <Badge variant="outline">Default</Badge>
                                    )}
                                  </div>
                                  <CardDescription>{template.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm">
                                  <div className="flex items-center text-gray-500 mb-1">
                                    <FileOutput className="h-4 w-4 mr-2" />
                                    <span>
                                      {template.config.columns?.length || 0} columns, 
                                      {template.config.showTotals ? ' with totals' : ' no totals'}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-gray-500">
                                    <Settings className="h-4 w-4 mr-2" />
                                    <span>
                                      {template.config.orientation || 'Portrait'}, 
                                      {template.config.pageSize || 'A4'}
                                    </span>
                                  </div>
                                </CardContent>
                                <CardFooter className="pt-2 border-t">
                                  <Button size="sm" variant="ghost" className="w-full">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Generate
                                  </Button>
                                </CardFooter>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Templates</CardTitle>
              <CardDescription>
                Create and manage your custom report templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Available Templates</h3>
                    <Button asChild size="sm">
                      <Link href="/reports/templates/create">
                        <Plus className="h-4 w-4 mr-2" />
                        New Template
                      </Link>
                    </Button>
                  </div>
                  <Separator />
                  
                  {Object.keys(groupedTemplates).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No report templates found</p>
                      <Button asChild variant="outline">
                        <Link href="/reports/templates/create">Create Your First Template</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {Object.entries(groupedTemplates).map(([type, typeTemplates]: [string, any[]]) => (
                        <div key={type} className="space-y-4">
                          <h3 className="text-lg font-medium capitalize">{type} Reports</h3>
                          <div className="grid gap-4">
                            {typeTemplates.map((template) => (
                              <Card key={template.id} className="overflow-hidden">
                                <div className="flex flex-col md:flex-row">
                                  <div className="p-6 flex-grow">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium text-lg">{template.name}</h4>
                                      {template.isDefault && (
                                        <Badge variant="outline">Default</Badge>
                                      )}
                                    </div>
                                    <p className="text-gray-500 text-sm mb-4">{template.description}</p>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <span className="font-medium">Type:</span>{" "}
                                        <span className="text-gray-600 capitalize">{template.type}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium">Columns:</span>{" "}
                                        <span className="text-gray-600">{template.config.columns?.length || 0}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium">Created:</span>{" "}
                                        <span className="text-gray-600">
                                          {new Date(template.createdAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gray-50 p-6 flex flex-row md:flex-col justify-center items-center gap-2 md:w-48">
                                    <Button asChild variant="outline" size="sm" className="w-full">
                                      <Link href={`/reports/templates/edit/${template.id}`}>
                                        Edit Template
                                      </Link>
                                    </Button>
                                    <Button variant="secondary" size="sm" className="w-full"
                                      onClick={() => {
                                        toast({
                                          title: "Generating Report",
                                          description: `Preparing ${template.name} report...`,
                                        });
                                        
                                        // In a real implementation, this would navigate to a form or directly generate the report
                                        window.open(`/api/reports/generate?templateId=${template.id}&format=html&dataType=${template.type}`, '_blank');
                                      }}
                                    >
                                      Generate
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}