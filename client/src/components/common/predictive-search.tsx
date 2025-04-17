import React, { useState, useRef, useEffect } from "react";
import { 
  Search, 
  CalendarIcon,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Employee } from "@shared/schema";

interface PredictiveSearchProps {
  data: Employee[];
  onFilter: (filtered: Employee[]) => void;
  loading?: boolean;
}

export default function PredictiveSearch({ data, onFilter, loading = false }: PredictiveSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchField, setSearchField] = useState<string>("");
  const [searchValue, setSearchValue] = useState<string>("");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [activeFilters, setActiveFilters] = useState<{
    field: string;
    value: string;
  }[]>([]);

  // Available search fields
  const searchFields = [
    { id: "name", label: "Name" },
    { id: "mobile", label: "Mobile" },
    { id: "employeeId", label: "Employee ID" },
    { id: "projectId", label: "Project" },
    { id: "joinDate", label: "Join Date" },
  ];

  // Handle selection of a field to search on
  const handleFieldSelect = (value: string) => {
    setSearchField(value);
    setOpen(false);
  };

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  // Add a filter
  const addFilter = () => {
    if (!searchField || !searchValue) return;
    
    setActiveFilters([...activeFilters, { field: searchField, value: searchValue }]);
    setSearchField("");
    setSearchValue("");
  };

  // Add a date range filter
  const addDateRangeFilter = () => {
    if (!dateRange.from) return;
    
    const fromDate = format(dateRange.from, "yyyy-MM-dd");
    const toDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : fromDate;
    
    setActiveFilters([
      ...activeFilters, 
      { field: "dateRange", value: `${fromDate} to ${toDate}` }
    ]);
    
    setDateRange({ from: undefined, to: undefined });
  };

  // Remove a filter
  const removeFilter = (index: number) => {
    const newFilters = [...activeFilters];
    newFilters.splice(index, 1);
    setActiveFilters(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters([]);
    setSearchField("");
    setSearchValue("");
    setDateRange({ from: undefined, to: undefined });
  };

  // Apply filters whenever activeFilters changes
  useEffect(() => {
    let filteredData = [...data];
    
    // Apply each active filter
    activeFilters.forEach(filter => {
      switch (filter.field) {
        case "name":
          filteredData = filteredData.filter(item => 
            `${item.firstName} ${item.lastName}`.toLowerCase().includes(filter.value.toLowerCase())
          );
          break;
        case "mobile":
          filteredData = filteredData.filter(item => 
            item.mobile.toLowerCase().includes(filter.value.toLowerCase())
          );
          break;
        case "employeeId":
          filteredData = filteredData.filter(item => 
            item.employeeId.toLowerCase().includes(filter.value.toLowerCase())
          );
          break;
        case "projectId":
          const projectId = parseInt(filter.value);
          if (!isNaN(projectId)) {
            filteredData = filteredData.filter(item => item.projectId === projectId);
          }
          break;
        case "dateRange":
          // Parse date range "yyyy-MM-dd to yyyy-MM-dd"
          const [fromStr, toStr] = filter.value.split(" to ");
          if (fromStr && toStr) {
            const fromDate = new Date(fromStr);
            const toDate = new Date(toStr);
            
            // Filter by join date - assuming joinDate is a string in YYYY-MM-DD format
            filteredData = filteredData.filter(item => {
              const joinDate = new Date(item.joinDate);
              return joinDate >= fromDate && joinDate <= toDate;
            });
          }
          break;
      }
    });
    
    // Send filtered data to parent component
    onFilter(filteredData);
  }, [activeFilters, data]);

  // Get search suggestions based on current field and input
  const getSearchSuggestions = () => {
    if (!searchField || !searchValue || searchValue.length < 1) return [];
    
    const lowerValue = searchValue.toLowerCase();
    const suggestions: string[] = [];
    
    // Get unique values based on the selected field
    switch (searchField) {
      case "name":
        data.forEach(item => {
          const fullName = `${item.firstName} ${item.lastName}`;
          if (fullName.toLowerCase().includes(lowerValue) && !suggestions.includes(fullName)) {
            suggestions.push(fullName);
          }
        });
        break;
      case "mobile":
        data.forEach(item => {
          if (item.mobile.toLowerCase().includes(lowerValue) && !suggestions.includes(item.mobile)) {
            suggestions.push(item.mobile);
          }
        });
        break;
      case "employeeId":
        data.forEach(item => {
          if (item.employeeId.toLowerCase().includes(lowerValue) && !suggestions.includes(item.employeeId)) {
            suggestions.push(item.employeeId);
          }
        });
        break;
      case "projectId":
        const uniqueProjectIds = new Set<number>();
        data.forEach(item => {
          if (item.projectId !== null && !uniqueProjectIds.has(item.projectId)) {
            uniqueProjectIds.add(item.projectId);
          }
        });
        
        Array.from(uniqueProjectIds)
          .map(id => id.toString())
          .filter(id => id.includes(lowerValue))
          .forEach(id => suggestions.push(id));
        break;
    }
    
    // Limit to 5 suggestions
    return suggestions.slice(0, 5);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {/* Active filters */}
        {activeFilters.map((filter, index) => (
          <Badge key={index} className="flex items-center gap-1">
            <span className="font-semibold">{filter.field}:</span> {filter.value}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1"
              onClick={() => removeFilter(index)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Field selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-[200px] justify-start text-left font-normal"
            >
              <Search className="mr-2 h-4 w-4" />
              {searchField ? (
                searchFields.find(f => f.id === searchField)?.label
              ) : (
                <span>Search by...</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Command>
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Search Fields">
                  {searchFields.map((field) => (
                    <CommandItem
                      key={field.id}
                      value={field.id}
                      onSelect={handleFieldSelect}
                    >
                      {field.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Search input and date picker */}
        {searchField === "joinDate" ? (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, "LLL dd, y")} - ${format(
                        dateRange.to,
                        "LLL dd, y"
                      )}`
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>From - To</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange as any}
                />
              </PopoverContent>
            </Popover>
            
            <Button 
              variant="default" 
              onClick={addDateRangeFilter}
              disabled={!dateRange.from}
            >
              Add
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2">
            {searchField && (
              <>
                <div className="relative flex-1">
                  <Input
                    placeholder={`Search by ${searchFields.find(f => f.id === searchField)?.label}...`}
                    value={searchValue}
                    onChange={handleSearchChange}
                    className="pr-10"
                  />
                  
                  {/* Suggestions dropdown */}
                  {searchValue.length > 0 && (
                    <div className="absolute w-full z-10 mt-1 bg-white rounded-md shadow-lg border">
                      <Command>
                        <CommandList>
                          <CommandEmpty>No suggestions found</CommandEmpty>
                          <CommandGroup>
                            {getSearchSuggestions().map((suggestion, i) => (
                              <CommandItem
                                key={i}
                                value={suggestion}
                                onSelect={(value) => setSearchValue(value)}
                              >
                                {suggestion}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  )}
                </div>
                
                <Button 
                  variant="default" 
                  onClick={addFilter}
                  disabled={!searchValue}
                >
                  Add
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}