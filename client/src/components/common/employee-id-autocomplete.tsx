import React, { useState, useEffect } from "react";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Employee } from "@shared/schema";

interface EmployeeIdAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showEmployeeName?: boolean;
  label?: string;
}

export default function EmployeeIdAutocomplete({
  value,
  onChange,
  placeholder = "Select employee ID",
  disabled = false,
  className,
  showEmployeeName = true,
  label
}: EmployeeIdAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  // Fetch all employees
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });
  
  // Track employee name (if showing names)
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>("");
  
  // Update the employee name whenever value changes
  useEffect(() => {
    if (showEmployeeName && employees && value) {
      const employee = employees.find(emp => emp.employeeId === value);
      if (employee) {
        setSelectedEmployeeName(`${employee.firstName} ${employee.lastName}`);
      } else {
        setSelectedEmployeeName("");
      }
    }
  }, [value, employees, showEmployeeName]);

  // Filter employees based on input
  const filteredEmployees = employees
    ? employees.filter(employee => 
        employee.employeeId.toLowerCase().includes(inputValue.toLowerCase()) ||
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(inputValue.toLowerCase())
      )
    : [];
    
  // Sort by relevance (starting with the input value first)
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const aStarts = a.employeeId.toLowerCase().startsWith(inputValue.toLowerCase());
    const bStarts = b.employeeId.toLowerCase().startsWith(inputValue.toLowerCase());
    
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  });
  
  // Show at least 10 suggestions
  const displayEmployees = sortedEmployees.slice(0, Math.max(10, sortedEmployees.length));
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            className,
            !value && "text-muted-foreground"
          )}
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          {value 
            ? (showEmployeeName && selectedEmployeeName 
                ? `${value} - ${selectedEmployeeName}` 
                : value)
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px]">
        <Command>
          <CommandInput 
            placeholder={`Search employee ID${showEmployeeName ? " or name" : ""}`}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandEmpty>No employee found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {isLoadingEmployees ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2">Loading...</span>
              </div>
            ) : (
              displayEmployees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={employee.employeeId}
                  onSelect={() => {
                    onChange(employee.employeeId);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === employee.employeeId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {employee.employeeId}
                  {showEmployeeName && (
                    <span className="ml-2 text-muted-foreground">
                      - {employee.firstName} {employee.lastName}
                    </span>
                  )}
                </CommandItem>
              ))
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}