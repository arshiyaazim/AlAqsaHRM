import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertCircle, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  Download, 
  Trash2, 
  ExternalLink,
  Eye,
  UserPlus,
  Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importEmployeesFromExcel, directImportEmployeesFromExcel, hasAllowedExtension, formatFileSize } from "@/lib/fileUtils";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

// Local version of uploadFile with proper types
async function uploadFile(file: File, endpoint: string): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Error uploading file");
  }
  
  return await response.json();
}

interface EmployeeImportProps {
  onComplete?: () => void;
}

interface UploadResponse {
  message: string;
  filePath: string;
  fileName: string;
}

interface ImportError {
  data: any;
  errors: string[];
}

interface ImportResults {
  message: string;
  imported: any[];
  errors?: ImportError[];
}

// Interface for file management
interface UploadedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  uploadDate: string;
}

export default function EmployeeImport({ onComplete }: EmployeeImportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [uploading, setUploading] = useState(false);
  const [excelFilePath, setExcelFilePath] = useState<string>("attached_assets/EmployeeDetails.xlsx");
  const [activeTab, setActiveTab] = useState<'import' | 'files'>('import');

  // Mutation for uploading a file
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      try {
        return await uploadFile(file, "/api/upload");
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (data: UploadResponse) => {
      toast({
        title: "File Uploaded",
        description: "The file was uploaded successfully.",
      });
      setExcelFilePath(data.filePath);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "There was an error uploading the file.",
        variant: "destructive",
      });
    },
  });

  // Mutation for importing employees from Excel
  const importMutation = useMutation({
    mutationFn: async (filePath: string) => {
      return await importEmployeesFromExcel(filePath);
    },
    onSuccess: (data: ImportResults) => {
      toast({
        title: "Import Successful",
        description: data.message || "Employees were imported successfully.",
      });
      setImportResults(data);
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      // Refresh the uploaded files list after a successful import
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "There was an error importing employees.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for directly importing employees from Excel to database
  const directImportMutation = useMutation({
    mutationFn: async (filePath: string) => {
      return await directImportEmployeesFromExcel(filePath);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Import to Employees Successful",
        description: data.message || "Employees were directly imported to database successfully.",
      });
      setImportResults(data);
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      // Refresh the uploaded files list after a successful import
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Direct Import Failed",
        description: error.message || "There was an error directly importing employees to database.",
        variant: "destructive",
      });
    },
  });
  
  // Query to fetch uploaded files
  const filesQuery = useQuery({
    queryKey: ['/api/files'],
    queryFn: async () => {
      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      return response.json() as Promise<UploadedFile[]>;
    }
  });
  
  // Mutation to delete a file
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "File Deleted",
        description: "The file was deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "There was an error deleting the file.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete all employees
  const deleteAllEmployeesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/employees/delete-all/confirm', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete all employees');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "All Employees Deleted",
        description: `Successfully deleted ${data.count} employees from the database.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "There was an error deleting all employees.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = files[0];
    if (!hasAllowedExtension(file, ["xlsx", "xls", "csv"])) {
      toast({
        title: "Invalid File",
        description: "Please select an Excel or CSV file (.xlsx, .xls, .csv).",
        variant: "destructive",
      });
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleManualPath = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExcelFilePath(e.target.value);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(selectedFile);
  };

  const handleImport = () => {
    if (!excelFilePath) {
      toast({
        title: "No File Path",
        description: "Please enter a file path or upload a file.",
        variant: "destructive",
      });
      return;
    }

    // Clean up the file path if needed
    let pathToUse = excelFilePath;
    
    // If the path starts with a slash, make it relative
    if (pathToUse.startsWith('/')) {
      pathToUse = pathToUse.substring(1);
    }
    
    console.log('Importing from file path:', pathToUse);
    importMutation.mutate(pathToUse);
  };
  
  const handleDirectImport = () => {
    if (!excelFilePath) {
      toast({
        title: "No File Path",
        description: "Please enter a file path or upload a file.",
        variant: "destructive",
      });
      return;
    }

    // Clean up the file path if needed
    let pathToUse = excelFilePath;
    
    // If the path starts with a slash, make it relative
    if (pathToUse.startsWith('/')) {
      pathToUse = pathToUse.substring(1);
    }
    
    console.log('Directly importing from file path:', pathToUse);
    
    if (confirm('Are you sure you want to directly import employees from this Excel file to the database? This will add or update employee records.')) {
      directImportMutation.mutate(pathToUse);
    }
  };

  // Handler for viewing file in new tab
  const handleViewFile = (filePath: string) => {
    window.open(`/uploads/${filePath}`, '_blank');
  };

  // Handler for downloading file
  const handleDownloadFile = (filePath: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = `/uploads/${filePath}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler for deleting file
  const handleDeleteFile = (fileId: string) => {
    if(confirm('Are you sure you want to delete this file?')) {
      deleteFileMutation.mutate(fileId);
    }
  };

  // Handler for using a file for import
  const handleUseForImport = (filePath: string) => {
    setExcelFilePath(filePath);
    setActiveTab('import');
  };
  
  // Handler for deleting all employees
  const handleDeleteAllEmployees = () => {
    if (confirm('WARNING: This will permanently delete ALL employees from the database. This action cannot be undone. Are you sure you want to proceed?')) {
      if (confirm('FINAL WARNING: All employee records will be permanently deleted. This is your last chance to cancel. Continue?')) {
        deleteAllEmployeesMutation.mutate();
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">Import Employees</CardTitle>
            <CardDescription>
              Import employees from an Excel (.xlsx, .xls) or CSV file
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={activeTab === 'import' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('import')}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button 
              variant={activeTab === 'files' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('files')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Manage Files
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeTab === 'import' ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Upload Excel File</Label>
              <div className="flex items-center mt-2 gap-2">
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Button 
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
              {selectedFile && (
                <p className="text-sm text-gray-500 mt-1">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-path">Or Enter File Path</Label>
              <Input
                id="file-path"
                placeholder="/path/to/excel/file.xlsx or ./attached_assets/EmployeeDetails.xlsx"
                value={excelFilePath}
                onChange={handleManualPath}
              />
              <p className="text-xs text-gray-500">
                Sample file pre-loaded: <span className="font-medium">attached_assets/EmployeeDetails.xlsx</span>. 
                This file has the correct column format (A→Mobile, B→Name, C→Salary, etc.)
              </p>
            </div>

            {(uploadMutation.isError || importMutation.isError) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {(uploadMutation.error as Error)?.message || 
                   (importMutation.error as Error)?.message || 
                   "An error occurred"}
                </AlertDescription>
              </Alert>
            )}

            {importResults && (
              <div className="space-y-4">
                <Alert variant={importResults.errors && importResults.errors.length > 0 ? "destructive" : "default"}>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Import Results</AlertTitle>
                  <AlertDescription>
                    {importResults.message}
                  </AlertDescription>
                </Alert>

                {importResults.errors && importResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Errors:</h4>
                    <div className="max-h-40 overflow-y-auto p-2 border rounded-md">
                      {importResults.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Uploaded Files</h3>
              <p className="text-sm text-gray-500">
                Manage your uploaded files for import
              </p>
            </div>
            
            {filesQuery.isLoading ? (
              <div className="p-4 border rounded-md flex justify-center">
                <p>Loading files...</p>
              </div>
            ) : filesQuery.isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load files: {(filesQuery.error as Error).message}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableCaption>List of uploaded files</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filesQuery.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No files uploaded yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      filesQuery.data?.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>{file.name}</TableCell>
                          <TableCell>{file.mimeType}</TableCell>
                          <TableCell>{formatFileSize(file.size)}</TableCell>
                          <TableCell>{format(new Date(file.uploadDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-fit">
                                  <div className="flex flex-col gap-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleViewFile(file.path)}
                                      className="flex justify-start"
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View in new tab
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleUseForImport(file.path)}
                                      className="flex justify-start"
                                    >
                                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                                      Use for import
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadFile(file.path, file.name)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDeleteFile(file.id)}
                                disabled={deleteFileMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {activeTab === 'import' ? (
          <>
            <div className="flex gap-2">
              <Button 
                variant="secondary"
                onClick={() => {
                  setSelectedFile(null);
                  setImportResults(null);
                  setExcelFilePath("attached_assets/EmployeeDetails.xlsx");
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                Clear
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteAllEmployees}
                disabled={deleteAllEmployeesMutation.isPending}
              >
                <Database className="h-4 w-4 mr-2" />
                {deleteAllEmployeesMutation.isPending ? "Deleting..." : "Delete All Employees"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleImport}
                disabled={!excelFilePath || importMutation.isPending}
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {importMutation.isPending ? "Parsing..." : "Parse Excel"}
              </Button>
              <Button 
                onClick={handleDirectImport}
                disabled={!excelFilePath || directImportMutation.isPending}
                variant="default"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {directImportMutation.isPending ? "Importing..." : "Import data to Employees"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button 
              onClick={() => setActiveTab('import')}
              variant="secondary"
            >
              Back to Import
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAllEmployees}
              disabled={deleteAllEmployeesMutation.isPending}
            >
              <Database className="h-4 w-4 mr-2" />
              {deleteAllEmployeesMutation.isPending ? "Deleting..." : "Delete All Employees"}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}