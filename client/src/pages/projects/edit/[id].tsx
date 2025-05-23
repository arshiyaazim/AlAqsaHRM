import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  startDate: z.date().optional().nullable(),
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

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id);
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  
  // Fetch employees for dropdown
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });
  
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch project");
      }
      return await res.json();
    },
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
      startDate: null,
      endDate: null,
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

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        employeeId: project.employeeId || "",
        employeeName: project.employeeName || "",
        clientName: project.clientName || "",
        vessel: project.vessel || "",
        lighter: project.lighter || "",
        startDate: project.startDate ? new Date(project.startDate) : null,
        endDate: project.endDate ? new Date(project.endDate) : null,
        duty: project.duty || "",
        salary: project.salary || "",
        releasePoint: project.releasePoint || "",
        conveyance: project.conveyance || "",
        loanAdvance: project.loanAdvance || "",
        due: project.due || "",
        active: project.active,
      });
      
      if (project.employeeId) {
        setSelectedEmployeeId(project.employeeId);
        setSelectedEmployeeName(project.employeeName || "");
      }
    }
  }, [project, form, employees]);

  async function onSubmit(data: ProjectFormValues) {
    setIsSubmitting(true);
    
    try {
      // Format dates for API submission
      const formattedData = {
        ...data,
        startDate: data.startDate ? data.startDate.toISOString().split('T')[0] : null,
        endDate: data.endDate ? data.endDate.toISOString().split('T')[0] : null,
      };
      
      await apiRequest("PATCH", `/api/projects/${projectId}`, formattedData);
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      
      toast({
        title: "Project Updated",
        description: "The project has been updated successfully.",
      });
      
      navigate("/projects");
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Error",
        description: "Failed to update the project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center mb-6">
          <Skeleton className="h-10 w-10 mr-4" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array(12).fill(0).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-4xl text-center">
        <p className="text-destructive mb-4">Failed to load project. The project may not exist.</p>
        <Link href="/projects">
          <Button>Return to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link href="/projects" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Project</h1>
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
                <Label>Start Date</Label>
                <DatePicker
                  date={form.watch("startDate")}
                  setDate={(date) => form.setValue("startDate", date)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <DatePicker
                  date={form.watch("endDate")}
                  setDate={(date) => form.setValue("endDate", date)}
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
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}