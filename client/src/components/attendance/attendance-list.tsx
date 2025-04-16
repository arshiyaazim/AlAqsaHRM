import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Attendance, Employee, Project } from "@shared/schema";

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
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Search, 
  Edit, 
  Trash2,
  Clock,
  Plus
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function AttendanceList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split("T")[0]);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [attendanceToDelete, setAttendanceToDelete] = useState<Attendance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const { data: attendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["/api/attendance"],
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Helper function to get employee name by ID
  const getEmployeeName = (employeeId: number | null | undefined) => {
    if (!employeeId || !employees) return "Unknown";
    const employee = employees.find((e: Employee) => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";
  };

  // Helper function to get employee ID by employee ID
  const getEmployeeCode = (employeeId: number | null | undefined) => {
    if (!employeeId || !employees) return "";
    const employee = employees.find((e: Employee) => e.id === employeeId);
    return employee ? employee.employeeId : "";
  };

  // Helper function to get project name by ID
  const getProjectName = (projectId: number | null | undefined) => {
    if (!projectId || !projects) return "Unknown";
    const project = projects.find((p: Project) => p.id === projectId);
    return project ? project.name : "Unknown";
  };

  // Filter attendance records based on filters
  const filteredAttendance = attendance
    ? attendance.filter((record: Attendance) => {
        // Format the date for comparison
        const recordDate = new Date(record.date).toISOString().split("T")[0];
        
        const matchesDate = dateFilter === "" || recordDate === dateFilter;
        
        const matchesProject =
          projectFilter === "all" ||
          String(record.projectId) === projectFilter;
        
        const matchesStatus =
          statusFilter === "all" ||
          record.status.toLowerCase() === statusFilter.toLowerCase();
        
        // Check if employee name matches search term
        const employeeName = getEmployeeName(record.employeeId).toLowerCase();
        const employeeCode = getEmployeeCode(record.employeeId).toLowerCase();
        const matchesSearch =
          searchTerm === "" ||
          employeeName.includes(searchTerm.toLowerCase()) ||
          employeeCode.includes(searchTerm.toLowerCase());
        
        return matchesDate && matchesProject && matchesStatus && matchesSearch;
      })
    : [];

  // Handle delete attendance
  const handleDeleteAttendance = async () => {
    if (!attendanceToDelete) return;
    
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/attendance/${attendanceToDelete.id}`, undefined);
      
      toast({
        title: "Attendance deleted",
        description: "The attendance record has been removed.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    } catch (error) {
      console.error("Error deleting attendance:", error);
      toast({
        title: "Error",
        description: "Failed to delete attendance record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setAttendanceToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <CardTitle>Attendance Records</CardTitle>
          <Link href="/attendance/record">
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4 mr-1" />
              Record Attendance
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
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
            <div className="flex flex-wrap gap-2">
              <div className="w-full sm:w-auto">
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-9"
                />
              </div>
              
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {!isLoadingProjects && projects && projects.map((project: Project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="rounded-md border hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAttendance || isLoadingEmployees || isLoadingProjects ? (
                  // Loading state
                  Array(5).fill(0).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredAttendance.length > 0 ? (
                  filteredAttendance.map((record: Attendance, index: number) => (
                    <TableRow key={record.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getEmployeeName(record.employeeId)}</div>
                          <div className="text-xs text-gray-500">{getEmployeeCode(record.employeeId)}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getProjectName(record.projectId)}</TableCell>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </TableCell>
                      <TableCell>{record.checkInTime || "N/A"}</TableCell>
                      <TableCell>{record.checkOutTime || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-[#E53E3E]"
                            title="Delete"
                            onClick={() => {
                              setAttendanceToDelete(record);
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
                      No attendance records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {isLoadingAttendance || isLoadingEmployees || isLoadingProjects ? (
              // Loading state
              Array(3).fill(0).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-4 w-24 mt-1" />
                    </div>
                    <div className="flex justify-between mb-3">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <div className="text-gray-500">Project</div>
                        <Skeleton className="h-4 w-24 mt-1" />
                      </div>
                      <div>
                        <div className="text-gray-500">Check-in</div>
                        <Skeleton className="h-4 w-16 mt-1" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Skeleton className="h-9 w-9 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredAttendance.length > 0 ? (
              filteredAttendance.map((record: Attendance) => (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <div className="font-medium">{getEmployeeName(record.employeeId)}</div>
                      <div className="text-xs text-gray-500">{getEmployeeCode(record.employeeId)}</div>
                    </div>
                    <div className="flex justify-between mb-3">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        <span>{formatDate(record.date)}</span>
                      </div>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <div className="text-gray-500">Project</div>
                        <div>{getProjectName(record.projectId)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Check-in</div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 text-gray-400 mr-1" />
                          <span>{record.checkInTime || "N/A"}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Check-out</div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 text-gray-400 mr-1" />
                          <span>{record.checkOutTime || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="text-[#E53E3E]"
                        title="Delete"
                        onClick={() => {
                          setAttendanceToDelete(record);
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
                No attendance records found
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
              Are you sure you want to delete this attendance record? This action cannot be undone.
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
              onClick={handleDeleteAttendance}
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
