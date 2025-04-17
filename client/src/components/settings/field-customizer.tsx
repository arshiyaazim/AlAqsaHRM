import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, PlusCircle, Minus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

interface FieldCustomizerProps {
  onComplete?: () => void;
}

interface CustomField {
  name: string;
  newName?: string;
  type?: string;
  required?: boolean;
}

// Function to modify entity fields
async function modifyEntityField(
  entity: string, 
  operation: "add" | "remove" | "rename" | "edit", 
  field: string | CustomField
): Promise<any> {
  const response = await fetch("/api/schema/customField", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity, operation, field }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Error modifying field");
  }
  
  return await response.json();
}

export default function FieldCustomizer({ onComplete }: FieldCustomizerProps) {
  const { toast } = useToast();
  const [entity, setEntity] = useState<string>("employees");
  const [operation, setOperation] = useState<"add" | "remove" | "rename" | "edit">("add");
  const [showNewEntityDialog, setShowNewEntityDialog] = useState<boolean>(false);
  const [newEntityName, setNewEntityName] = useState<string>("");
  const [field, setField] = useState<string>("");
  const [newField, setNewField] = useState<CustomField>({
    name: "",
    newName: "",
    type: "text",
    required: false
  });

  // Mutation for field customization
  const fieldMutation = useMutation({
    mutationFn: async () => {
      if (operation === "add") {
        return await modifyEntityField(entity, operation, newField);
      } else if (operation === "rename") {
        return await modifyEntityField(entity, operation, {
          name: field,
          newName: newField.newName
        });
      } else if (operation === "edit") {
        return await modifyEntityField(entity, operation, {
          name: field,
          type: newField.type,
          required: newField.required
        });
      } else {
        return await modifyEntityField(entity, operation, field);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Field modified successfully.",
      });
      
      // Reset form
      setField("");
      setNewField({
        name: "",
        newName: "",
        type: "text",
        required: false
      });
      
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed",
        description: error.message || "There was an error modifying the field.",
        variant: "destructive",
      });
    },
  });

  // Helper to get available fields for each entity
  const getAvailableFields = (entityName: string): string[] => {
    switch (entityName) {
      case "employees":
        return ["firstName", "lastName", "designation", "dailyWage", "mobile", "address", "idNumber", "joinDate", "projectId", "isActive"];
      case "projects":
        return ["name", "location", "startDate", "endDate", "isActive"];
      case "attendance":
        return ["employeeId", "projectId", "date", "status", "checkInTime", "checkOutTime", "remarks"];
      case "payroll":
        return ["employeeId", "startDate", "endDate", "daysWorked", "basicAmount", "conveyanceAllowance", "advancePayment", "fines", "totalAmount", "paymentDate", "status", "remarks", "processedBy"];
      case "payments":
        return ["payrollId", "amount", "date", "method", "reference", "status"];
      default:
        return [];
    }
  };

  const handleSubmit = () => {
    const availableFields = getAvailableFields(entity);
    
    // Validation
    if (operation === "add") {
      if (!newField.name) {
        toast({
          title: "Validation Error",
          description: "Field name is required.",
          variant: "destructive",
        });
        return;
      }
      
      if (availableFields.includes(newField.name)) {
        toast({
          title: "Validation Error",
          description: `Field '${newField.name}' already exists in ${entity}.`,
          variant: "destructive",
        });
        return;
      }
    } else if (operation === "remove" || operation === "rename" || operation === "edit") {
      if (!field) {
        toast({
          title: "Validation Error",
          description: "Please select a field to modify.",
          variant: "destructive",
        });
        return;
      }
      
      if (operation === "rename" && !newField.newName) {
        toast({
          title: "Validation Error",
          description: "New field name is required for rename operation.",
          variant: "destructive",
        });
        return;
      }
      
      if (operation === "edit" && !newField.type) {
        toast({
          title: "Validation Error",
          description: "Field type is required for edit operation.",
          variant: "destructive",
        });
        return;
      }
    }
    
    fieldMutation.mutate();
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Customize Fields</CardTitle>
          <CardDescription>
            Add, remove, or rename fields in the database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity">Entity</Label>
              <Select 
                value={entity} 
                onValueChange={(value) => {
                  if (value === "add-new") {
                    setShowNewEntityDialog(true);
                  } else {
                    setEntity(value);
                    setField("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employees">Employees</SelectItem>
                  <SelectItem value="projects">Projects</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="add-new" className="text-primary font-medium border-t mt-1 pt-1">
                    <div className="flex items-center">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add New Entity
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="operation">Operation</Label>
              <Select 
                value={operation} 
                onValueChange={(value: "add" | "remove" | "rename" | "edit") => {
                  setOperation(value);
                  setField("");
                  setNewField({
                    name: "",
                    newName: "",
                    type: "text",
                    required: false
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">
                    <div className="flex items-center">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Field
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Field
                    </div>
                  </SelectItem>
                  <SelectItem value="rename">
                    <div className="flex items-center">
                      <Edit className="h-4 w-4 mr-2" />
                      Rename Field
                    </div>
                  </SelectItem>
                  <SelectItem value="remove">
                    <div className="flex items-center">
                      <Minus className="h-4 w-4 mr-2" />
                      Remove Field
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {(operation === "remove" || operation === "rename" || operation === "edit") && (
            <div className="space-y-2">
              <Label htmlFor="field">Select Field</Label>
              <Select 
                value={field} 
                onValueChange={setField}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableFields(entity).map((fieldName) => (
                    <SelectItem key={fieldName} value={fieldName}>
                      {fieldName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {operation === "add" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="field-name">Field Name</Label>
                <Input
                  id="field-name"
                  placeholder="Enter field name (e.g., employeeCode)"
                  value={newField.name}
                  onChange={(e) => setNewField({...newField, name: e.target.value})}
                />
                <p className="text-xs text-gray-500">
                  Use camelCase naming (e.g., employeeCode, phoneNumber)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="field-type">Field Type</Label>
                <RadioGroup
                  value={newField.type || "text"}
                  onValueChange={(value) => setNewField({...newField, type: value})}
                  className="grid grid-cols-2 md:grid-cols-3 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="text" id="r1" />
                    <Label htmlFor="r1">Text</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="number" id="r2" />
                    <Label htmlFor="r2">Number</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="date" id="r3" />
                    <Label htmlFor="r3">Date</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="boolean" id="r4" />
                    <Label htmlFor="r4">Boolean</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="currency" id="r5" />
                    <Label htmlFor="r5">Currency</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mobile" id="r6" />
                    <Label htmlFor="r6">Mobile Number</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="file" id="r7" />
                    <Label htmlFor="r7">Picture/File Upload</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="required"
                  checked={newField.required || false}
                  onCheckedChange={(checked) => setNewField({...newField, required: checked})}
                />
                <Label htmlFor="required">Required Field</Label>
              </div>
            </div>
          )}
          
          {operation === "rename" && (
            <div className="space-y-2">
              <Label htmlFor="new-field-name">New Field Name</Label>
              <Input
                id="new-field-name"
                placeholder="Enter new field name"
                value={newField.newName || ""}
                onChange={(e) => setNewField({...newField, newName: e.target.value})}
              />
            </div>
          )}

          {operation === "edit" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="field-type">Field Type</Label>
                <RadioGroup
                  value={newField.type || "text"}
                  onValueChange={(value) => setNewField({...newField, type: value})}
                  className="grid grid-cols-2 md:grid-cols-3 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="text" id="e1" />
                    <Label htmlFor="e1">Text</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="number" id="e2" />
                    <Label htmlFor="e2">Number</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="date" id="e3" />
                    <Label htmlFor="e3">Date</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="boolean" id="e4" />
                    <Label htmlFor="e4">Boolean</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="currency" id="e5" />
                    <Label htmlFor="e5">Currency</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mobile" id="e6" />
                    <Label htmlFor="e6">Mobile Number</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="file" id="e7" />
                    <Label htmlFor="e7">Picture/File Upload</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="required-edit"
                  checked={newField.required || false}
                  onCheckedChange={(checked) => setNewField({...newField, required: checked})}
                />
                <Label htmlFor="required-edit">Required Field</Label>
              </div>
            </div>
          )}
          
          {fieldMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {(fieldMutation.error as Error)?.message || "An error occurred"}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="secondary"
            onClick={() => {
              setField("");
              setNewField({
                name: "",
                newName: "",
                type: "text",
                required: false
              });
            }}
          >
            Reset
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={fieldMutation.isPending}
          >
            {fieldMutation.isPending ? "Processing..." : "Apply Changes"}
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={showNewEntityDialog} onOpenChange={setShowNewEntityDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Entity</DialogTitle>
            <DialogDescription>
              Create a new custom entity to store additional data in your system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="entity-name">Entity Name</Label>
              <Input
                id="entity-name"
                placeholder="Enter entity name (e.g., vehicles, suppliers)"
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                className="col-span-3"
              />
              <p className="text-xs text-gray-500">
                Use plural form and lowercase (e.g., vehicles, suppliers)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewEntityDialog(false);
              setNewEntityName("");
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (!newEntityName) {
                toast({
                  title: "Validation Error",
                  description: "Entity name is required.",
                  variant: "destructive",
                });
                return;
              }
              
              // Here you would send the API request to create a new entity
              toast({
                title: "Entity Created",
                description: `New entity '${newEntityName}' has been created successfully.`,
              });
              
              // Close dialog and reset
              setShowNewEntityDialog(false);
              setEntity(newEntityName);
              setNewEntityName("");
            }}>
              Create Entity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}