import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Employee, Project } from "@shared/schema";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  EmployeeListSkeleton,
  EmployeeCardSkeleton,
  TableWithPaginationSkeleton
} from "@/components/skeletons";
import { Search, UserPlus, Edit, Eye, Trash2 } from "lucide-react";
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
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Daily Wage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingEmployees ? (
                  // Loading state with improved skeleton
                  <EmployeeListSkeleton count={5} />
                ) : filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee: Employee, index: number) => (
                    <TableRow key={employee.id}>
                      <TableCell>{index + 1}</TableCell>
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
                    <TableCell colSpan={8} className="text-center py-6 text-gray-500">
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
              filteredEmployees.map((employee: Employee) => (
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
