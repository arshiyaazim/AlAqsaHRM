import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertDailyExpenditureSchema } from "@shared/schema";
import type { Employee } from "@shared/schema";

// Extend the schema with client-side validations
const formSchema = insertDailyExpenditureSchema.extend({
  date: z.date({
    required_error: "Date is required",
  }),
  employeeId: z.coerce.number({
    required_error: "Employee ID is required",
    invalid_type_error: "Employee ID must be a number",
  }),
  payment: z.string().min(1, "Payment amount is required"),
  loanAdvance: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddExpenditure() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch employees for the dropdown
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    refetchOnWindowFocus: false,
  });

  // Define form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      employeeId: undefined,
      payment: "",
      loanAdvance: "",
      remarks: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: FormValues) => {
      return apiRequest("/api/expenditures", {
        method: "POST",
        data: {
          ...data,
          date: format(data.date, "yyyy-MM-dd"),
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Expenditure Added",
        description: "The expenditure has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenditures"] });
      navigate("/expenditures");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add expenditure. Please try again.",
        variant: "destructive",
      });
      console.error("Error adding expenditure:", error);
    },
  });

  // Form submission handler
  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add Daily Expenditure</h1>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Expenditure Details</CardTitle>
          <CardDescription>
            Enter the details for the new daily expenditure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
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
                
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter employee ID" 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value ? parseInt(e.target.value) : undefined);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {employees && employees.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Available IDs: {employees.map(e => e.id).join(', ')}
                          </span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="payment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter payment amount" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="loanAdvance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan/Advance Amount</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter loan/advance amount (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter any additional remarks" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <CardFooter className="px-0 pt-6">
                <div className="flex justify-between w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/expenditures")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <span className="animate-spin mr-2">⧗</span>
                        Saving...
                      </>
                    ) : (
                      "Save Expenditure"
                    )}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}