import React, { useState, useEffect, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Employee } from "@shared/schema";
import { FormLabel } from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EmployeeIdAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showEmployeeName?: boolean;
  label?: string;
  error?: string;
  allowNewIds?: boolean; // Whether to allow IDs that don't exist in the database
  description?: string;
  required?: boolean;
}

export default function EmployeeIdAutocomplete({
  value,
  onChange,
  placeholder = "Enter or select employee ID",
  disabled = false,
  className,
  showEmployeeName = true,
  label,
  error,
  allowNewIds = true, // Default to true for backward compatibility
  description,
  required = false
}: EmployeeIdAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [directInputMode, setDirectInputMode] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Fetch all employees
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });
  
  // Track employee name (if showing names)
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>("");
  
  // Update input value when the external value changes
  useEffect(() => {
    if (value !== inputValue && !directInputMode) {
      setInputValue(value || "");
    }
  }, [value]);
  
  // Update the employee name whenever value changes
  useEffect(() => {
    if (showEmployeeName && employees && value) {
      const employee = employees.find(emp => emp.employeeId === value);
      if (employee) {
        setSelectedEmployeeName(`${employee.firstName} ${employee.lastName}`);
        setValidationError(null);
      } else {
        setSelectedEmployeeName("");
        if (!allowNewIds && value) {
          setValidationError("Employee ID does not exist");
        }
      }
    }
  }, [value, employees, showEmployeeName, allowNewIds]);

  // Handle direct input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setDirectInputMode(true);
    
    // Check if the entered ID exists when required
    if (employees && !allowNewIds) {
      const employeeExists = employees.some(emp => emp.employeeId === newValue);
      if (!employeeExists && newValue) {
        setValidationError("Employee ID does not exist");
      } else {
        setValidationError(null);
      }
    }
  };
  
  // Handle blur event to update the parent component's value
  const handleBlur = () => {
    // Only update the value if it's valid or if we allow new IDs
    if (allowNewIds || !validationError) {
      onChange(inputValue);
    }
    setDirectInputMode(false);
  };

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
  
  // Show at most 10 suggestions
  const displayEmployees = sortedEmployees.slice(0, 10);
  
  return (
    <div className="w-full space-y-2">
      {label && (
        <div className="flex items-center gap-1">
          <FormLabel className={`${required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}`}>
            {label}
          </FormLabel>
          
          {!allowNewIds && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Only existing Employee IDs are allowed</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <div className="relative w-full">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              className,
              "pr-10",
              validationError && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setOpen(!open)}
            disabled={disabled}
            tabIndex={-1}
          >
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </div>
        
        {showEmployeeName && selectedEmployeeName && (
          <div className="text-sm text-muted-foreground flex-1 truncate">
            {selectedEmployeeName}
          </div>
        )}
      </div>
      
      {(validationError || error) && (
        <p className="text-sm font-medium text-red-500">
          {validationError || error}
        </p>
      )}
      
      {description && !validationError && !error && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverContent 
          className="p-0 w-[300px]" 
          align="start"
          onInteractOutside={() => setOpen(false)}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandInput 
              placeholder={`Search employee ID${showEmployeeName ? " or name" : ""}`}
              value={inputValue}
              onValueChange={(value) => {
                setInputValue(value);
                setDirectInputMode(true);
              }}
              autoFocus={false}
            />
            <CommandEmpty>
              {allowNewIds 
                ? "No employee found. You can use this new ID." 
                : "No employee found. Please enter an existing ID."}
            </CommandEmpty>
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
                      setInputValue(employee.employeeId);
                      setDirectInputMode(false);
                      setOpen(false);
                      setValidationError(null);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === employee.employeeId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-medium">{employee.employeeId}</span>
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
    </div>
  );
}