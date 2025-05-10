import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Check, Database, Download, FileDown, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ExportOption {
  id: string;
  name: string;
  description: string;
  fileType: string;
}

const attendanceOptions: ExportOption[] = [
  { 
    id: "attendance", 
    name: "Attendance Records", 
    description: "Export all attendance records with timestamps and locations",
    fileType: "CSV"
  },
  { 
    id: "attendance_json", 
    name: "Attendance Records (JSON)", 
    description: "Export attendance data in JSON format",
    fileType: "JSON"
  }
];

const employeeOptions: ExportOption[] = [
  { 
    id: "employees", 
    name: "Employee Directory", 
    description: "Export all employee data including contact information",
    fileType: "CSV"
  },
  { 
    id: "employees_json", 
    name: "Employee Directory (JSON)", 
    description: "Export employee data in JSON format",
    fileType: "JSON"
  }
];

const financeOptions: ExportOption[] = [
  { 
    id: "cash_receives", 
    name: "Cash Receives", 
    description: "Export all cash receive records",
    fileType: "CSV"
  },
  { 
    id: "cash_payments", 
    name: "Cash Payments", 
    description: "Export all cash payment records",
    fileType: "CSV"
  },
  { 
    id: "payroll", 
    name: "Payroll Records", 
    description: "Export all payroll records",
    fileType: "CSV"
  }
];

const backupOptions: ExportOption[] = [
  { 
    id: "database", 
    name: "Full Database Backup", 
    description: "Export the entire database as SQL statements",
    fileType: "SQL"
  },
  { 
    id: "all", 
    name: "Complete Data Archive", 
    description: "Export all tables in both CSV and JSON formats with SQL backup",
    fileType: "ZIP"
  }
];

export default function ExportDataPage() {
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({
    attendance: "attendance",
    employees: "employees",
    finance: "cash_receives",
    backup: "database"
  });

  const exportMutation = useMutation({
    mutationFn: async (exportType: string) => {
      const res = await apiRequest("POST", "/api/admin/export", { exportType });
      return await res.json();
    },
    onSuccess: (data) => {
      // Trigger download of the exported file
      if (data.downloadUrl) {
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = data.fileName || "export.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Export Successful",
          description: `${data.fileName} has been downloaded.`,
          variant: "default",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleExport = (category: string) => {
    const exportType = selectedOptions[category];
    exportMutation.mutate(exportType);
  };

  const handleOptionChange = (category: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [category]: value
    }));
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Export Data</h1>
          <p className="text-muted-foreground">
            Export data from the system in various formats for backup or analysis.
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            Exported files may contain sensitive information. Handle with care and ensure they are stored securely.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="backup">System Backup</TabsTrigger>
          </TabsList>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Data Export</CardTitle>
                <CardDescription>
                  Export attendance records for analysis or record-keeping.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={selectedOptions.attendance} 
                  onValueChange={(value) => handleOptionChange("attendance", value)}
                  className="space-y-4"
                >
                  {attendanceOptions.map((option) => (
                    <div key={option.id} className="flex items-start space-x-3 space-y-0">
                      <RadioGroupItem value={option.id} id={`attendance-${option.id}`} />
                      <div className="grid gap-1.5">
                        <Label htmlFor={`attendance-${option.id}`} className="font-medium">
                          {option.name} <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {option.fileType}
                          </span>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleExport("attendance")}
                  disabled={exportMutation.isPending}
                >
                  {exportMutation.isPending && selectedOptions.attendance === exportMutation.variables ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export Attendance Data
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle>Employee Data Export</CardTitle>
                <CardDescription>
                  Export employee information for HR purposes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={selectedOptions.employees} 
                  onValueChange={(value) => handleOptionChange("employees", value)}
                  className="space-y-4"
                >
                  {employeeOptions.map((option) => (
                    <div key={option.id} className="flex items-start space-x-3 space-y-0">
                      <RadioGroupItem value={option.id} id={`employees-${option.id}`} />
                      <div className="grid gap-1.5">
                        <Label htmlFor={`employees-${option.id}`} className="font-medium">
                          {option.name} <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {option.fileType}
                          </span>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleExport("employees")}
                  disabled={exportMutation.isPending}
                >
                  {exportMutation.isPending && selectedOptions.employees === exportMutation.variables ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Export Employee Data
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance">
            <Card>
              <CardHeader>
                <CardTitle>Financial Data Export</CardTitle>
                <CardDescription>
                  Export financial records for accounting and reporting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={selectedOptions.finance} 
                  onValueChange={(value) => handleOptionChange("finance", value)}
                  className="space-y-4"
                >
                  {financeOptions.map((option) => (
                    <div key={option.id} className="flex items-start space-x-3 space-y-0">
                      <RadioGroupItem value={option.id} id={`finance-${option.id}`} />
                      <div className="grid gap-1.5">
                        <Label htmlFor={`finance-${option.id}`} className="font-medium">
                          {option.name} <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {option.fileType}
                          </span>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleExport("finance")}
                  disabled={exportMutation.isPending}
                >
                  {exportMutation.isPending && selectedOptions.finance === exportMutation.variables ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export Financial Data
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* System Backup Tab */}
          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle>System Backup</CardTitle>
                <CardDescription>
                  Create complete backups of the system data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={selectedOptions.backup} 
                  onValueChange={(value) => handleOptionChange("backup", value)}
                  className="space-y-4"
                >
                  {backupOptions.map((option) => (
                    <div key={option.id} className="flex items-start space-x-3 space-y-0">
                      <RadioGroupItem value={option.id} id={`backup-${option.id}`} />
                      <div className="grid gap-1.5">
                        <Label htmlFor={`backup-${option.id}`} className="font-medium">
                          {option.name} <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {option.fileType}
                          </span>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>

                <Separator className="my-6" />

                <div className="rounded-md bg-slate-50 p-4 mt-2">
                  <div className="flex items-start">
                    <div className="mr-4">
                      <Database className="h-6 w-6 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="font-medium">Backup Recommendations</h4>
                      <ul className="mt-2 text-sm text-muted-foreground space-y-2">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Create regular full database backups
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Store backups in multiple secure locations
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Test backup restoration periodically
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleExport("backup")}
                  disabled={exportMutation.isPending}
                  variant="destructive"
                >
                  {exportMutation.isPending && selectedOptions.backup === exportMutation.variables ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="mr-2 h-4 w-4" />
                  )}
                  Create System Backup
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}