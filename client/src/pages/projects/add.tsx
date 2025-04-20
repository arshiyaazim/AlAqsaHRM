import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmployeeIdAutocomplete from "@/components/common/employee-id-autocomplete";

// Type for the employee list
interface Employee {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
}

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  clientName: z.string().optional(),
  vessel: z.string().optional(),
  lighter: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  startDate: z.date().min(new Date("1900-01-01"), "Valid start date is required"),
  endDate: z.date().optional().nullable(),
  duty: z.string().optional(),
  salary: z.string().optional(),
  releasePoint: z.string().optional(),
  conveyance: z.string().optional(),
  loanAdvance: z.string().optional(),
  due: z.string().optional(),
  active: z.boolean().default(true),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function AddProjectPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  
  // Fetch employees for dropdown
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });
  
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      employeeId: "",
      employeeName: "",
      clientName: "",
      vessel: "",
      lighter: "",
      location: "",
      startDate: new Date(), // Set to current date by default
      endDate: undefined,
      duty: "",
      salary: "",
      releasePoint: "",
      conveyance: "",
      loanAdvance: "",
      due: "",
      active: true,
    },
  });

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    
    if (employeeId && employeeId !== "none") {
      const selectedEmployee = employees?.find(emp => emp.employeeId === employeeId);
      if (selectedEmployee) {
        const fullName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`;
        setSelectedEmployeeName(fullName);
        form.setValue("employeeId", employeeId);
        form.setValue("employeeName", fullName);
      }
    } else {
      setSelectedEmployeeName("");
      form.setValue("employeeId", "");
      form.setValue("employeeName", "");
    }
  };

  async function onSubmit(data: ProjectFormValues) {
    setIsSubmitting(true);
    
    try {
      // Format dates for API submission
      const formattedData = {
        ...data,
        // Convert boolean to PostgreSQL-friendly format
        isActive: data.active,
        // Convert dates to YYYY-MM-DD format
        startDate: data.startDate.toISOString().split('T')[0],
        endDate: data.endDate ? data.endDate.toISOString().split('T')[0] : null,
      };
      
      // Remove fields not matching the database schema
      const {
        active, 
        employeeName, 
        duty, 
        salary, 
        releasePoint, 
        conveyance, 
        loanAdvance, 
        due,
        ...projectData
      } = formattedData;
      
      console.log("Submitting project data:", projectData);
      
      await apiRequest("POST", "/api/projects", projectData);
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      toast({
        title: "Project Created",
        description: "The project has been created successfully.",
      });
      
      navigate("/projects");
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create the project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link href="/projects" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add New Project</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter project name"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="Enter project location"
                  {...form.register("location")}
                />
                {form.formState.errors.location && (
                  <p className="text-sm text-red-500">{form.formState.errors.location.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee">Employee ID</Label>
                <EmployeeIdAutocomplete 
                  value={selectedEmployeeId}
                  onChange={handleEmployeeChange}
                  placeholder="Select employee ID"
                  showEmployeeName={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeName">Employee Name</Label>
                <Input
                  id="employeeName"
                  placeholder="Employee name (auto-filled)"
                  value={selectedEmployeeName}
                  readOnly
                  disabled
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="Enter client name"
                  {...form.register("clientName")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vessel">Vessel</Label>
                <Input
                  id="vessel"
                  placeholder="Enter vessel name"
                  {...form.register("vessel")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lighter">Lighter</Label>
                <Input
                  id="lighter"
                  placeholder="Enter lighter"
                  {...form.register("lighter")}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <DatePicker
                  date={form.watch("startDate") as Date}
                  onChange={(date?: Date) => form.setValue("startDate", date || new Date())}
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <DatePicker
                  date={form.watch("endDate") as Date | undefined}
                  onChange={(date?: Date) => form.setValue("endDate", date)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duty">Duty</Label>
                <Input
                  id="duty"
                  placeholder="Enter duty details"
                  {...form.register("duty")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="salary">Salary</Label>
                <Input
                  id="salary"
                  placeholder="Enter salary amount"
                  {...form.register("salary")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="releasePoint">Release Point</Label>
                <Input
                  id="releasePoint"
                  placeholder="Enter release point"
                  {...form.register("releasePoint")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="conveyance">Conveyance</Label>
                <Input
                  id="conveyance"
                  placeholder="Enter conveyance"
                  {...form.register("conveyance")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loanAdvance">Loan / Advance</Label>
                <Input
                  id="loanAdvance"
                  placeholder="Enter loan or advance amount"
                  {...form.register("loanAdvance")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="due">Due</Label>
                <Input
                  id="due"
                  placeholder="Enter due amount"
                  {...form.register("due")}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-6">
              <Checkbox
                id="active"
                checked={form.watch("active")}
                onCheckedChange={(checked) =>
                  form.setValue("active", checked as boolean)
                }
              />
              <Label htmlFor="active" className="cursor-pointer">Active Project</Label>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <Link href="/projects">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}