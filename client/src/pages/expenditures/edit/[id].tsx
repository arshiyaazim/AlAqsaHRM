import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
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
import { CalendarIcon, ChevronLeft } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { insertDailyExpenditureSchema, DailyExpenditure, Employee } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

// Extend the schema with UI-specific validation
const formSchema = insertDailyExpenditureSchema.extend({
  date: z.string(),
  employeeId: z.coerce.number({
    required_error: "Employee is required",
  }),
  payment: z.string().optional(),
  loanAdvance: z.string().optional(),
  remarks: z.string().optional().nullable(),
}).refine(data => {
  // Ensure at least one of payment or loanAdvance is provided
  return !!data.payment || !!data.loanAdvance;
}, {
  message: "Either payment or loan/advance must be provided",
  path: ["payment"],
});

export default function EditExpenditure() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch employees for the dropdown
  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  // Fetch the expenditure to edit
  const { data: expenditure, isLoading: expenditureLoading } = useQuery<DailyExpenditure>({
    queryKey: ["/api/expenditures", id],
    queryFn: async () => {
      const response = await fetch(`/api/expenditures/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch expenditure");
      }
      return response.json();
    },
    enabled: !!id,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: "",
      employeeId: undefined,
      payment: "",
      loanAdvance: "",
      remarks: "",
    },
  });

  // Update form values when expenditure data is loaded
  useEffect(() => {
    if (expenditure) {
      form.reset({
        date: expenditure.date,
        employeeId: expenditure.employeeId,
        payment: expenditure.payment || "",
        loanAdvance: expenditure.loanAdvance || "",
        remarks: expenditure.remarks || "",
      });
    }
  }, [expenditure, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/expenditures/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update expenditure");
      }

      toast({
        title: "Expenditure updated",
        description: "The expenditure record has been updated successfully.",
      });

      // Invalidate the expenditures query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/expenditures"] });
      
      // Navigate back to the expenditures list
      navigate("/expenditures");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while updating the expenditure",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (expenditureLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">Loading expenditure data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/expenditures")}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to Expenditures
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Daily Expenditure</CardTitle>
          <CardDescription>
            Update the expenditure or loan/advance payment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                formatDate(field.value)
                              ) : (
                                <span>Select date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) =>
                              field.onChange(date ? format(date, "yyyy-MM-dd") : "")
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
                      <FormLabel>Employee</FormLabel>
                      <Select
                        disabled={employeesLoading}
                        onValueChange={field.onChange}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map((employee) => (
                            <SelectItem 
                              key={employee.id}
                              value={employee.id.toString()}
                            >
                              {employee.firstName} {employee.lastName} ({employee.employeeId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Daily payment amount
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="loanAdvance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan/Advance</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Loan or advance payment
                      </FormDescription>
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
                      <Textarea
                        placeholder="Enter any additional notes or remarks"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Update Expenditure"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}