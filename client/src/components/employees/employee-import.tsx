import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importEmployeesFromExcel, hasAllowedExtension, formatFileSize } from "@/lib/fileUtils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EmployeeImportProps {
  onComplete?: () => void;
}

export default function EmployeeImport({ onComplete }: EmployeeImportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [excelFilePath, setExcelFilePath] = useState<string>("");

  // Mutation for uploading a file
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await apiRequest("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        return response;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "File Uploaded",
        description: "The file was uploaded successfully.",
      });
      setExcelFilePath(data.filePath);
    },
    onError: (error: any) => {
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
    onSuccess: (data) => {
      toast({
        title: "Import Successful",
        description: data.message || "Employees were imported successfully.",
      });
      setImportResults(data);
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "There was an error importing employees.",
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

    importMutation.mutate(excelFilePath);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Import Employees</CardTitle>
        <CardDescription>
          Import employees from an Excel (.xlsx, .xls) or CSV file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
              Enter the path to an Excel file on the server
            </p>
          </div>

          {(uploadMutation.isError || importMutation.isError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {uploadMutation.error?.message || importMutation.error?.message || "An error occurred"}
              </AlertDescription>
            </Alert>
          )}

          {importResults && (
            <div className="space-y-4">
              <Alert variant={importResults.errors && importResults.errors.length > 0 ? "warning" : "default"}>
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
                    {importResults.errors.map((error: any, index: number) => (
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
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="secondary"
          onClick={() => {
            setSelectedFile(null);
            setImportResults(null);
            setExcelFilePath("");
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }}
        >
          Clear
        </Button>
        <Button 
          onClick={handleImport}
          disabled={!excelFilePath || importMutation.isPending}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Import Employees
        </Button>
      </CardFooter>
    </Card>
  );
}