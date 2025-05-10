import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, FileText, Database, FileCog, Archive } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ExportOption {
  id: string;
  name: string;
  description: string;
  fileType: string;
  icon: React.ElementType;
}

export default function ExportDataPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("employees");
  const [currentDownloadUrl, setCurrentDownloadUrl] = useState<string | null>(null);

  const exportOptions: Record<string, ExportOption[]> = {
    employees: [
      {
        id: "employees_csv",
        name: "Employees CSV",
        description: "Export all employee records in CSV format",
        fileType: "CSV",
        icon: FileText
      },
      {
        id: "employees_json",
        name: "Employees JSON",
        description: "Export all employee records in JSON format",
        fileType: "JSON",
        icon: FileCog
      }
    ],
    attendance: [
      {
        id: "attendance_csv",
        name: "Attendance CSV",
        description: "Export all attendance records in CSV format",
        fileType: "CSV",
        icon: FileText
      },
      {
        id: "attendance_json",
        name: "Attendance JSON",
        description: "Export all attendance records in JSON format",
        fileType: "JSON",
        icon: FileCog
      }
    ],
    financial: [
      {
        id: "payroll_csv",
        name: "Payroll CSV",
        description: "Export all payroll records in CSV format",
        fileType: "CSV",
        icon: FileText
      },
      {
        id: "expenditures_csv",
        name: "Expenditures CSV",
        description: "Export all expenditure records in CSV format",
        fileType: "CSV",
        icon: FileText
      },
      {
        id: "incomes_csv",
        name: "Incomes CSV",
        description: "Export all income records in CSV format",
        fileType: "CSV",
        icon: FileText
      }
    ],
    database: [
      {
        id: "database",
        name: "Database Backup",
        description: "Export full database backup in SQL format",
        fileType: "SQL",
        icon: Database
      },
      {
        id: "all",
        name: "Complete Backup",
        description: "Export complete data backup (database + files) in ZIP format",
        fileType: "ZIP",
        icon: Archive
      }
    ]
  };

  const exportMutation = useMutation({
    mutationFn: async (exportType: string) => {
      const res = await apiRequest("POST", "/api/admin/export", { exportType });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Export successful",
        description: "Your export has been prepared successfully.",
      });
      setCurrentDownloadUrl(data.downloadUrl);
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExport = (exportType: string) => {
    setCurrentDownloadUrl(null);
    exportMutation.mutate(exportType);
  };

  const downloadExport = () => {
    if (currentDownloadUrl) {
      window.open(currentDownloadUrl, '_blank');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Export Data</h1>
          <p className="text-muted-foreground mt-2">
            Export your system data in various formats for backup or reporting.
          </p>
        </div>

        <Tabs defaultValue="employees" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
          </TabsList>

          {Object.entries(exportOptions).map(([tabId, options]) => (
            <TabsContent key={tabId} value={tabId} className="mt-0">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {options.map((option) => (
                  <Card key={option.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{option.name}</CardTitle>
                        <option.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardDescription>{option.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Format:</span>
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {option.fileType}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 flex justify-end gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        disabled={exportMutation.isPending}
                        onClick={() => handleExport(option.id)}
                      >
                        {exportMutation.isPending && option.id === exportMutation.variables ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          "Export"
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {currentDownloadUrl && (
          <div className="mt-8 p-4 border rounded-lg bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Your export is ready</h3>
                <p className="text-sm text-muted-foreground">
                  Click the button to download your exported data
                </p>
              </div>
              <Button onClick={downloadExport}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}