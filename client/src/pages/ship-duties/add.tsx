import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { insertShipDutySchema, InsertShipDuty, Project, Employee } from "@shared/schema";

// Extend the ship duty schema with validation
const shipDutyFormSchema = insertShipDutySchema.extend({
  dutyDate: z.coerce.date(),
  dutyHours: z.coerce.number().positive("Duty hours must be positive"),
  salaryRate: z.coerce.number().positive("Salary rate must be positive"),
  conveyanceAmount: z.coerce.number().min(0, "Conveyance amount must be non-negative"),
});

type ShipDutyFormValues = z.infer<typeof shipDutyFormSchema>;

export default function AddShipDutyPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch projects for dropdown
  const { data: projects, isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    onError: (error) => {
      toast({
        title: "Error loading projects",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch employees for dropdown
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    onError: (error) => {
      toast({
        title: "Error loading employees",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize form
  const form = useForm<ShipDutyFormValues>({
    resolver: zodResolver(shipDutyFormSchema),
    defaultValues: {
      projectId: undefined,
      employeeId: undefined,
      vesselName: "",
      lighterName: "",
      dutyDate: new Date(),
      dutyHours: 0,
      releasePoint: "",
      salaryRate: 0,
      conveyanceAmount: 0,
      remarks: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertShipDuty) => {
      const response = await apiRequest(
        "POST",
        "/api/ship-duties",
        data
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ship duty created",
        description: "Ship duty record has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ship-duties"] });
      navigate("/ship-duties");
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating ship duty",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ShipDutyFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Add New Ship Duty</CardTitle>
          <CardDescription>
            Record a new ship duty entry for employee attendance and payment calculation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Selection */}
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select
                        disabled={isLoadingProjects}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            {isLoadingProjects ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue placeholder="Select a project" />
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects?.map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Employee Selection */}
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select
                        disabled={isLoadingEmployees}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            {isLoadingEmployees ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue placeholder="Select an employee" />
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id.toString()}>
                              {employee.firstName} {employee.lastName} ({employee.employeeId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vessel Name */}
                <FormField
                  control={form.control}
                  name="vesselName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vessel Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter vessel name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Lighter Name */}
                <FormField
                  control={form.control}
                  name="lighterName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lighter Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter lighter name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Duty Date */}
                <FormField
                  control={form.control}
                  name="dutyDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Duty Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Duty Hours */}
                <FormField
                  control={form.control}
                  name="dutyHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duty Hours</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Release Point */}
                <FormField
                  control={form.control}
                  name="releasePoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Release Point (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter release point" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Salary Rate */}
                <FormField
                  control={form.control}
                  name="salaryRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary Rate (৳)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conveyance Amount */}
                <FormField
                  control={form.control}
                  name="conveyanceAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conveyance Amount (৳)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Remarks */}
                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Remarks (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional notes or remarks"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/ship-duties")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Ship Duty"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}