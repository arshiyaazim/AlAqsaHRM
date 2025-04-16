import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertAttendanceSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const formSchema = insertAttendanceSchema.extend({
  date: z.string().min(1, "Date is required"),
});

interface AttendanceFormProps {
  onComplete?: () => void;
  projectId?: number;
  date?: string;
}

export default function AttendanceForm({ onComplete, projectId, date }: AttendanceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const today = new Date().toISOString().split("T")[0];
  
  // Fetch employees and projects
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["/api/employees"],
  });
  
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: undefined,
      projectId: projectId,
      date: date || today,
      status: "Present",
      checkInTime: undefined,
      checkOutTime: undefined,
      remarks: "",
    },
  });
  
  // Filter employees by project if a project is selected
  const filteredEmployees = form.watch("projectId") && employees 
    ? employees.filter(employee => employee.projectId === parseInt(form.watch("projectId").toString()))
    : employees;
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      // Convert string IDs to numbers
      const submissionData = {
        ...values,
        employeeId: parseInt(values.employeeId.toString()),
        projectId: parseInt(values.projectId.toString()),
      };
      
      await apiRequest("POST", "/api/attendance", submissionData);
      
      toast({
        title: "Attendance recorded",
        description: "The attendance has been successfully recorded.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      
      // Reset form or call the onComplete callback
      form.reset();
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "There was an error recording the attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Project */}
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select 
                      value={field.value?.toString()} 
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        // Reset employee selection when project changes
                        form.setValue("employeeId", undefined);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingProjects ? (
                          <div className="p-2">
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-full mt-2" />
                          </div>
                        ) : projects?.length ? (
                          projects.map((project) => (
                            <SelectItem 
                              key={project.id} 
                              value={project.id.toString()}
                            >
                              {project.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="0" disabled>
                            No projects available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Employee */}
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select 
                      value={field.value?.toString()} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      disabled={!form.watch("projectId")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={form.watch("projectId") ? "Select an employee" : "Select a project first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingEmployees ? (
                          <div className="p-2">
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-full mt-2" />
                          </div>
                        ) : filteredEmployees?.length ? (
                          filteredEmployees.map((employee) => (
                            <SelectItem 
                              key={employee.id} 
                              value={employee.id.toString()}
                            >
                              {`${employee.firstName} ${employee.lastName} (${employee.employeeId})`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="0" disabled>
                            {form.watch("projectId") 
                              ? "No employees assigned to this project" 
                              : "Select a project first"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Attendance Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Present" id="present" />
                          <Label htmlFor="present">Present</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Late" id="late" />
                          <Label htmlFor="late">Late</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Absent" id="absent" />
                          <Label htmlFor="absent">Absent</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Check-in Time - Only show if Present or Late */}
              {(form.watch("status") === "Present" || form.watch("status") === "Late") && (
                <FormField
                  control={form.control}
                  name="checkInTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-in Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Check-out Time - Only show if Present or Late */}
              {(form.watch("status") === "Present" || form.watch("status") === "Late") && (
                <FormField
                  control={form.control}
                  name="checkOutTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-out Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            {/* Remarks */}
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes here..." 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Form buttons */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Record Attendance"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
