import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Employee, Project, Attendance } from "@shared/schema";
import { getDaysInMonth } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  EmployeeListSkeleton,
  EmployeeCardSkeleton,
  TableWithPaginationSkeleton
} from "@/components/skeletons";
import { 
  Search, 
  UserPlus, 
  Edit, 
  Eye, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PredictiveSearch from "@/components/common/predictive-search";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function EmployeeList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "name", "designation", "project", "joinDate", "dailyWage", "status", "actions"
  ]);
  const itemsPerPage = 25;
  const { toast } = useToast();

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Helper function to get project name by ID
  const getProjectName = (projectId: number | null | undefined) => {
    if (!projectId || !projects) return "Not Assigned";
    const project = projects.find((p: Project) => p.id === projectId);
    return project ? project.name : "Not Assigned";
  };
  
  // Handle predictive search filter results
  const handlePredictiveSearchFilter = (filtered: Employee[]) => {
    // Apply additional filters (status and project)
    const withAdditionalFilters = filtered.filter((employee: Employee) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && employee.isActive) ||
        (statusFilter === "inactive" && !employee.isActive);

      const matchesProject =
        projectFilter === "all" ||
        (projectFilter === "none" && !employee.projectId) ||
        String(employee.projectId) === projectFilter;

      return matchesStatus && matchesProject;
    });
    
    setFilteredEmployees(withAdditionalFilters);
  };

  // Filter employees using basic search and filters
  const handleBasicSearch = () => {
    if (!employees) {
      setFilteredEmployees([]);
      return;
    }
    
    const filtered = employees.filter((employee: Employee) => {
      const matchesSearch =
        searchTerm === "" ||
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.designation.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && employee.isActive) ||
        (statusFilter === "inactive" && !employee.isActive);

      const matchesProject =
        projectFilter === "all" ||
        (projectFilter === "none" && !employee.projectId) ||
        String(employee.projectId) === projectFilter;

      return matchesSearch && matchesStatus && matchesProject;
    });
    
    setFilteredEmployees(filtered);
  };
  
  // Update filtered employees whenever basic search criteria change
  useEffect(() => {
    if (!useAdvancedSearch) {
      handleBasicSearch();
    }
  }, [searchTerm, statusFilter, projectFilter, employees, useAdvancedSearch]);

  // Get current page data
  const getCurrentPageData = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Calculate total pages
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  
  // Query attendance data to calculate duty days
  const { data: attendanceData = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance"],
  });

  // Helper functions for calculations
  const getCurrentMonth = () => {
    const now = new Date();
    return now.getMonth(); // 0-11 (January is 0)
  };

  const getCurrentYear = () => {
    const now = new Date();
    return now.getFullYear();
  };

  // Get the number of days in the current month
  const getDaysInCurrentMonth = () => {
    return getDaysInMonth(new Date(getCurrentYear(), getCurrentMonth()));
  };

  // Calculate start duty, end duty, and total duty days for an employee
  const calculateDutyInfo = (employeeId: number) => {
    if (!attendanceData || attendanceData.length === 0) {
      return { startDuty: "N/A", endDuty: "N/A", totalDuty: 0 };
    }

    // Filter attendance records for this employee and current month
    const currentMonthAttendance = attendanceData.filter(record => {
      const recordDate = new Date(record.date);
      return (
        record.employeeId === employeeId && 
        recordDate.getMonth() === getCurrentMonth() && 
        recordDate.getFullYear() === getCurrentYear() &&
        record.status === "Present"
      );
    });

    if (currentMonthAttendance.length === 0) {
      return { startDuty: "N/A", endDuty: "N/A", totalDuty: 0 };
    }

    // Sort attendance records by date
    const sortedAttendance = [...currentMonthAttendance].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const startDuty = formatDate(sortedAttendance[0].date);
    const endDuty = formatDate(sortedAttendance[sortedAttendance.length - 1].date);
    const totalDuty = currentMonthAttendance.length;

    return { startDuty, endDuty, totalDuty };
  };

  // Calculate earned salary based on daily wage, duty days, and conveyance
  const calculateEarnedSalary = (dailyWage: number, totalDuty: number, conveyance = 0) => {
    const daysInMonth = getDaysInCurrentMonth();
    // Formula: (Daily Wage / days in month) * Total Duty + Conveyance
    const earned = (Number(dailyWage) / daysInMonth) * totalDuty + conveyance;
    return Math.round(earned * 100) / 100; // Round to 2 decimal places
  };

  // Calculate payable salary
  const calculatePayableSalary = (earnedSalary: number, loanAdvance = 0, fines = 0) => {
    // Formula: Earned Salary - Loan/Advance - Fines
    const payable = earnedSalary - loanAdvance - fines;
    return Math.max(0, Math.round(payable * 100) / 100); // Ensure not negative and round to 2 decimal places
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle column selection
  const handleColumnToggle = (column: string) => {
    if (selectedColumns.includes(column)) {
      if (selectedColumns.length > 1) {
        setSelectedColumns(selectedColumns.filter(col => col !== column));
      }
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  // Handle delete employee
  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/employees/${employeeToDelete.id}`, undefined);
      
      toast({
        title: "Employee deleted",
        description: `${employeeToDelete.firstName} ${employeeToDelete.lastName} has been removed.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({
        title: "Error",
        description: "Failed to delete employee. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setEmployeeToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <CardTitle>Employees</CardTitle>
          <Link href="/employees/add">
            <Button className="flex items-center gap-1">
              <UserPlus className="h-4 w-4 mr-1" />
              Add Employee
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {useAdvancedSearch ? (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Advanced Search</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setUseAdvancedSearch(false)}
                >
                  Switch to Basic Search
                </Button>
              </div>
              
              {/* Predictive search component */}
              <PredictiveSearch
                data={employees}
                onFilter={handlePredictiveSearchFilter}
                loading={isLoadingEmployees}
              />
              
              <div className="flex gap-2 mt-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    <SelectItem value="none">Not Assigned</SelectItem>
                    {!isLoadingProjects && projects && projects.map((project: Project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search employees..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    <SelectItem value="none">Not Assigned</SelectItem>
                    {!isLoadingProjects && projects && projects.map((project: Project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => setUseAdvancedSearch(true)}
                >
                  Advanced Search
                </Button>
              </div>
            </div>
          )}

          {/* Desktop Table */}
          <div className="rounded-md border hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Daily Wage</TableHead>
                  <TableHead>Start Duty</TableHead>
                  <TableHead>End Duty</TableHead>
                  <TableHead>Total Duty</TableHead>
                  <TableHead>Conveyance</TableHead>
                  <TableHead>Earned Salary</TableHead>
                  <TableHead>Loan/Advance</TableHead>
                  <TableHead>Fines</TableHead>
                  <TableHead>Payable Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingEmployees ? (
                  // Loading state with improved skeleton
                  <EmployeeListSkeleton count={5} />
                ) : filteredEmployees.length > 0 ? (
                  getCurrentPageData().map((employee: Employee, index: number) => (
                    <TableRow key={employee.id}>
                      <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage 
                              src={`https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=random`} 
                              alt={`${employee.firstName} ${employee.lastName}`} 
                            />
                            <AvatarFallback>{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{`${employee.firstName} ${employee.lastName}`}</div>
                            <div className="text-xs text-gray-500">{employee.employeeId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.designation}</TableCell>
                      <TableCell>{getProjectName(employee.projectId)}</TableCell>
                      <TableCell>{formatDate(employee.joinDate)}</TableCell>
                      <TableCell>{formatCurrency(employee.dailyWage)}</TableCell>
                      {(() => {
                        // Calculate duty-related values
                        const dutyInfo = calculateDutyInfo(employee.id);
                        
                        // Conveyance (placeholder value for now)
                        const conveyance = 0;
                        
                        // Calculate earned salary
                        const earnedSalary = calculateEarnedSalary(
                          Number(employee.dailyWage), 
                          dutyInfo.totalDuty, 
                          conveyance
                        );
                        
                        // Get loan/advance from employee record
                        const loanAdvance = Number(employee.loanAdvance) || 0;
                        
                        // Fines (placeholder value for now)
                        const fines = 0;
                        
                        // Calculate payable salary
                        const payableSalary = calculatePayableSalary(earnedSalary, loanAdvance, fines);
                        
                        return (
                          <>
                            <TableCell>{dutyInfo.startDuty}</TableCell>
                            <TableCell>{dutyInfo.endDuty}</TableCell>
                            <TableCell>{dutyInfo.totalDuty}</TableCell>
                            <TableCell>{formatCurrency(conveyance)}</TableCell>
                            <TableCell>{formatCurrency(earnedSalary)}</TableCell>
                            <TableCell>{formatCurrency(loanAdvance)}</TableCell>
                            <TableCell>{formatCurrency(fines)}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(payableSalary)}
                            </TableCell>
                          </>
                        );
                      })()}
                      <TableCell>
                        <Badge className={employee.isActive ? "bg-green-500 hover:bg-green-600" : ""} variant={employee.isActive ? "outline" : "secondary"}>
                          {employee.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/employees/${employee.id}`}>
                            <Button variant="ghost" size="icon" title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/employees/edit/${employee.id}`}>
                            <Button variant="ghost" size="icon" title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-[#E53E3E]"
                            title="Delete"
                            onClick={() => {
                              setEmployeeToDelete(employee);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-6 text-gray-500">
                      No employees found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {isLoadingEmployees ? (
              // Loading state with improved skeleton
              <EmployeeCardSkeleton count={3} />
            ) : filteredEmployees.length > 0 ? (
              getCurrentPageData().map((employee: Employee) => (
                <Card key={employee.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage 
                            src={`https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=random`} 
                            alt={`${employee.firstName} ${employee.lastName}`} 
                          />
                          <AvatarFallback>{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{`${employee.firstName} ${employee.lastName}`}</div>
                          <div className="text-xs text-gray-500">{employee.employeeId}</div>
                        </div>
                      </div>
                      <Badge className={employee.isActive ? "bg-green-500 hover:bg-green-600" : ""} variant={employee.isActive ? "outline" : "secondary"}>
                        {employee.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <div className="text-gray-500">Designation</div>
                        <div>{employee.designation}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Project</div>
                        <div>{getProjectName(employee.projectId)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Join Date</div>
                        <div>{formatDate(employee.joinDate)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Daily Wage</div>
                        <div>{formatCurrency(employee.dailyWage)}</div>
                      </div>
                      
                      {(() => {
                        // Calculate duty-related values
                        const dutyInfo = calculateDutyInfo(employee.id);
                        
                        // Conveyance (placeholder value for now)
                        const conveyance = 0;
                        
                        // Calculate earned salary
                        const earnedSalary = calculateEarnedSalary(
                          Number(employee.dailyWage), 
                          dutyInfo.totalDuty, 
                          conveyance
                        );
                        
                        // Get loan/advance from employee record
                        const loanAdvance = Number(employee.loanAdvance) || 0;
                        
                        // Fines (placeholder value for now)
                        const fines = 0;
                        
                        // Calculate payable salary
                        const payableSalary = calculatePayableSalary(earnedSalary, loanAdvance, fines);
                        
                        return (
                          <>
                            <div>
                              <div className="text-gray-500">Total Duty</div>
                              <div>{dutyInfo.totalDuty} days</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Earned Salary</div>
                              <div>{formatCurrency(earnedSalary)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Loan/Advance</div>
                              <div>{formatCurrency(loanAdvance)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Payable Salary</div>
                              <div className="font-medium">{formatCurrency(payableSalary)}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Link href={`/employees/${employee.id}`}>
                        <Button variant="outline" size="icon" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/employees/edit/${employee.id}`}>
                        <Button variant="outline" size="icon" title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="text-[#E53E3E]"
                        title="Delete"
                        onClick={() => {
                          setEmployeeToDelete(employee);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                No employees found
              </div>
            )}
          </div>
        </CardContent>
        
        {/* Pagination Controls */}
        {filteredEmployees.length > 0 && (
          <CardFooter className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{Math.min(filteredEmployees.length, 1 + (currentPage - 1) * itemsPerPage)}</span> to{" "}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredEmployees.length)}</span> of{" "}
              <span className="font-medium">{filteredEmployees.length}</span> employees
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="h-8 w-8"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {employeeToDelete ? `${employeeToDelete.firstName} ${employeeToDelete.lastName}` : 'this employee'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEmployee}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
