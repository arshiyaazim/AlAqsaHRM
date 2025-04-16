import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { Payroll, Employee } from "@shared/schema";

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
  Search, 
  Eye, 
  Trash2,
  DollarSign,
  Calendar,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function PayrollList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [payrollToDelete, setPayrollToDelete] = useState<Payroll | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const { data: payrolls, isLoading: isLoadingPayrolls } = useQuery({
    queryKey: ["/api/payroll"],
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["/api/employees"],
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

  // Filter payroll records based on filters
  const filteredPayrolls = payrolls
    ? payrolls.filter((record: Payroll) => {
        const employeeName = getEmployeeName(record.employeeId).toLowerCase();
        const employeeCode = getEmployeeCode(record.employeeId).toLowerCase();
        
        const matchesSearch =
          searchTerm === "" ||
          employeeName.includes(searchTerm.toLowerCase()) ||
          employeeCode.includes(searchTerm.toLowerCase());
        
        const matchesStatus =
          statusFilter === "all" ||
          record.status.toLowerCase() === statusFilter.toLowerCase();
        
        // Check if payment date matches filter
        const matchesDate = dateFilter === "" || 
          (record.paymentDate && new Date(record.paymentDate).toISOString().split("T")[0] === dateFilter);
        
        return matchesSearch && matchesStatus && matchesDate;
      })
    : [];

  // Handle delete payroll
  const handleDeletePayroll = async () => {
    if (!payrollToDelete) return;
    
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/payroll/${payrollToDelete.id}`, undefined);
      
      toast({
        title: "Payroll deleted",
        description: "The payroll record has been removed.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
    } catch (error) {
      console.error("Error deleting payroll:", error);
      toast({
        title: "Error",
        description: "Failed to delete payroll record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setPayrollToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <CardTitle>Payroll Records</CardTitle>
          <Link href="/payroll/process">
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4 mr-1" />
              Process Payroll
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
                  placeholder="Filter by date"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
                  <TableHead>Period</TableHead>
                  <TableHead>Days Worked</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPayrolls || isLoadingEmployees ? (
                  // Loading state
                  Array(5).fill(0).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16 mt-1" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredPayrolls.length > 0 ? (
                  filteredPayrolls.map((record: Payroll, index: number) => (
                    <TableRow key={record.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage 
                              src={`https://ui-avatars.com/api/?name=${getEmployeeName(record.employeeId).replace(" ", "+")}&background=random`} 
                              alt={getEmployeeName(record.employeeId)} 
                            />
                            <AvatarFallback>
                              {getEmployeeName(record.employeeId)
                                .split(" ")
                                .map(n => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{getEmployeeName(record.employeeId)}</div>
                            <div className="text-xs text-gray-500">{getEmployeeCode(record.employeeId)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(record.startDate)} - {formatDate(record.endDate)}
                      </TableCell>
                      <TableCell>{record.daysWorked}</TableCell>
                      <TableCell>{formatCurrency(record.totalAmount)}</TableCell>
                      <TableCell>{formatDate(record.paymentDate)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-[#E53E3E]"
                            title="Delete"
                            onClick={() => {
                              setPayrollToDelete(record);
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
                      No payroll records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {isLoadingPayrolls || isLoadingEmployees ? (
              // Loading state
              Array(3).fill(0).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <div className="text-gray-500">Period</div>
                        <Skeleton className="h-4 w-36 mt-1" />
                      </div>
                      <div>
                        <div className="text-gray-500">Days Worked</div>
                        <Skeleton className="h-4 w-8 mt-1" />
                      </div>
                      <div>
                        <div className="text-gray-500">Amount</div>
                        <Skeleton className="h-4 w-20 mt-1" />
                      </div>
                      <div>
                        <div className="text-gray-500">Payment Date</div>
                        <Skeleton className="h-4 w-24 mt-1" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Skeleton className="h-9 w-9 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredPayrolls.length > 0 ? (
              filteredPayrolls.map((record: Payroll) => (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage 
                            src={`https://ui-avatars.com/api/?name=${getEmployeeName(record.employeeId).replace(" ", "+")}&background=random`} 
                            alt={getEmployeeName(record.employeeId)} 
                          />
                          <AvatarFallback>
                            {getEmployeeName(record.employeeId)
                              .split(" ")
                              .map(n => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{getEmployeeName(record.employeeId)}</div>
                          <div className="text-xs text-gray-500">{getEmployeeCode(record.employeeId)}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <div className="text-gray-500">Period</div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                          <span>{formatDate(record.startDate)} - {formatDate(record.endDate)}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Days Worked</div>
                        <div>{record.daysWorked}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Amount</div>
                        <div className="flex items-center">
                          <DollarSign className="h-3 w-3 text-gray-400 mr-1" />
                          <span className="font-medium">{formatCurrency(record.totalAmount)}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Payment Date</div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                          <span>{formatDate(record.paymentDate)}</span>
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
                          setPayrollToDelete(record);
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
                No payroll records found
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
              Are you sure you want to delete this payroll record? This action cannot be undone.
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
              onClick={handleDeletePayroll}
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
