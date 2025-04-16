import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPayrollSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { formatCurrency, calculateTotal } from "@/lib/utils";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = insertPayrollSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

interface PayrollFormProps {
  onComplete?: () => void;
}

export default function PayrollForm({ onComplete }: PayrollFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // Fetch employees
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["/api/employees"],
  });
  
  // Fetch attendance data for selected employee
  const selectedEmployeeId = useForm<z.infer<typeof formSchema>>().watch?.("employeeId");
  const { data: employeeAttendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["/api/attendance/employee", selectedEmployeeId],
    enabled: !!selectedEmployeeId,
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: undefined,
      startDate: "",
      endDate: "",
      daysWorked: 0,
      basicAmount: "0",
      conveyanceAllowance: "0",
      advancePayment: "0",
      fines: "0",
      totalAmount: "0",
      status: "Pending",
      paymentDate: new Date().toISOString().split("T")[0],
      processedBy: "Admin",
      remarks: "",
    },
  });
  
  // Calculate days worked and basic amount when employee, start date, or end date changes
  useEffect(() => {
    const employeeId = form.watch("employeeId");
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");
    
    if (employeeId && startDate && endDate && employees && employeeAttendance) {
      // Find the employee to get their daily wage
      const employee = employees.find(emp => emp.id === parseInt(employeeId.toString()));
      
      if (employee) {
        // Filter attendance records between start and end dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Ensure the dates are valid before proceeding
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
        
        const relevantAttendance = employeeAttendance.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= start && recordDate <= end && record.status === "Present";
        });
        
        // Update days worked
        const daysWorked = relevantAttendance.length;
        form.setValue("daysWorked", daysWorked);
        
        // Calculate basic amount (daily wage * days worked)
        const dailyWage = parseFloat(employee.dailyWage);
        const basicAmount = dailyWage * daysWorked;
        form.setValue("basicAmount", basicAmount.toFixed(2));
        
        // Update total amount
        updateTotalAmount();
      }
    }
  }, [form.watch("employeeId"), form.watch("startDate"), form.watch("endDate"), employees, employeeAttendance]);
  
  // Update total amount when any of the monetary values change
  useEffect(() => {
    updateTotalAmount();
  }, [
    form.watch("basicAmount"),
    form.watch("conveyanceAllowance"),
    form.watch("advancePayment"),
    form.watch("fines")
  ]);
  
  const updateTotalAmount = () => {
    const basicAmount = form.watch("basicAmount") || "0";
    const conveyanceAllowance = form.watch("conveyanceAllowance") || "0";
    const advancePayment = form.watch("advancePayment") || "0";
    const fines = form.watch("fines") || "0";
    
    const total = calculateTotal(basicAmount, conveyanceAllowance, advancePayment, fines);
    form.setValue("totalAmount", total.toFixed(2));
  };
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      // Convert string IDs to numbers
      const submissionData = {
        ...values,
        employeeId: parseInt(values.employeeId.toString()),
      };
      
      await apiRequest("POST", "/api/payroll", submissionData);
      
      // If the status is "Completed", create a payment record as well
      if (values.status === "Completed") {
        // Payroll ID will be returned from the server in a real implementation
        // Here we just create a placeholder payment record
        
        // Get the newest payroll (the one we just created)
        const payrolls = await fetch("/api/payroll").then(res => res.json());
        const newestPayroll = payrolls[payrolls.length - 1];
        
        if (newestPayroll) {
          await apiRequest("POST", "/api/payments", {
            payrollId: newestPayroll.id,
            amount: values.totalAmount,
            date: values.paymentDate,
            method: "Cash", // Default to cash
            status: "Completed",
            reference: `Payroll payment for ${newestPayroll.startDate} to ${newestPayroll.endDate}`
          });
        }
      }
      
      toast({
        title: "Payroll processed",
        description: "The payroll has been successfully processed.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      
      // Navigate or call onComplete
      if (onComplete) {
        onComplete();
      } else {
        navigate("/payroll");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "There was an error processing the payroll. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Payroll</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingEmployees ? (
                          <div className="p-2">
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-full mt-2" />
                          </div>
                        ) : employees?.length ? (
                          employees.map((employee) => (
                            <SelectItem 
                              key={employee.id} 
                              value={employee.id.toString()}
                            >
                              {`${employee.firstName} ${employee.lastName} (${employee.employeeId})`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="0" disabled>
                            No employees available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Payment Date */}
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* End Date */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Days Worked - Read only, calculated based on attendance */}
              <FormField
                control={form.control}
                name="daysWorked"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days Worked</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        min="0"
                        disabled
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      Calculated based on attendance records
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator className="my-4" />
            <h3 className="text-lg font-medium mb-4">Payment Calculation</h3>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Basic Amount */}
              <FormField
                control={form.control}
                name="basicAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Basic Amount ($)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        step="0.01"
                        min="0"
                        disabled
                      />
                    </FormControl>
                    <FormDescription>
                      Daily wage × Days worked
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Conveyance Allowance */}
              <FormField
                control={form.control}
                name="conveyanceAllowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conveyance Allowance ($)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        step="0.01"
                        min="0"
                        onChange={(e) => {
                          field.onChange(e);
                          updateTotalAmount();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Advance Payment (Deduction) */}
              <FormField
                control={form.control}
                name="advancePayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advance Payment ($)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        step="0.01"
                        min="0"
                        onChange={(e) => {
                          field.onChange(e);
                          updateTotalAmount();
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Deducted from total
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Fines/Deductions */}
              <FormField
                control={form.control}
                name="fines"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fines/Deductions ($)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        step="0.01"
                        min="0"
                        onChange={(e) => {
                          field.onChange(e);
                          updateTotalAmount();
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Deducted from total
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Total Amount */}
            <div className="bg-gray-50 p-4 rounded-md">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-lg">Total Amount</FormLabel>
                      <div className="text-xl font-bold text-[#2C5282]">
                        {formatCurrency(field.value)}
                      </div>
                    </div>
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                    <FormDescription>
                      Basic Amount + Conveyance Allowance - Advance Payment - Fines
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                onClick={() => navigate("/payroll")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Process Payroll"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
