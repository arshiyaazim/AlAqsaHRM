import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { formatDate, formatCurrency } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileDown, 
  FileText, 
  Filter, 
  Calendar,
  Users,
  DollarSign
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ReportType = "attendance" | "payroll" | "employee";

export default function ReportGenerator() {
  const [reportType, setReportType] = useState<ReportType>("attendance");
  const [dateRange, setDateRange] = useState<{startDate: string; endDate: string}>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0]
  });
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Fetch needed data based on report type
  const { data: attendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["/api/attendance"],
    enabled: reportType === "attendance",
  });

  const { data: payrolls, isLoading: isLoadingPayrolls } = useQuery({
    queryKey: ["/api/payroll"],
    enabled: reportType === "payroll",
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Generate filtered data for reports
  const filteredAttendance = attendance
    ? attendance.filter((record) => {
        const recordDate = new Date(record.date);
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
        
        const matchesDateRange = 
          (!startDate || recordDate >= startDate) && 
          (!endDate || recordDate <= endDate);
        
        const matchesProject = 
          projectFilter === "all" || 
          String(record.projectId) === projectFilter;
        
        const matchesStatus = 
          statusFilter === "all" || 
          record.status.toLowerCase() === statusFilter.toLowerCase();
        
        return matchesDateRange && matchesProject && matchesStatus;
      })
    : [];

  const filteredPayrolls = payrolls
    ? payrolls.filter((record) => {
        const paymentDate = record.paymentDate ? new Date(record.paymentDate) : null;
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
        
        const matchesDateRange = 
          (!startDate || (paymentDate && paymentDate >= startDate)) && 
          (!endDate || (paymentDate && paymentDate <= endDate));
        
        const matchesStatus = 
          statusFilter === "all" || 
          record.status.toLowerCase() === statusFilter.toLowerCase();
        
        return matchesDateRange && matchesStatus;
      })
    : [];

  // Prepare attendance chart data
  const attendanceChartData = useMemo(() => {
    if (!filteredAttendance.length) return [];
    
    // Create an object to group attendance by date
    const attendanceByDate = filteredAttendance.reduce((acc, record) => {
      const dateStr = formatDate(record.date);
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, present: 0, absent: 0, late: 0 };
      }
      
      if (record.status.toLowerCase() === 'present') {
        acc[dateStr].present += 1;
      } else if (record.status.toLowerCase() === 'absent') {
        acc[dateStr].absent += 1;
      } else if (record.status.toLowerCase() === 'late') {
        acc[dateStr].late += 1;
      }
      
      return acc;
    }, {});
    
    // Convert to array and sort by date
    return Object.values(attendanceByDate).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredAttendance]);

  // Prepare payroll chart data
  const payrollChartData = useMemo(() => {
    if (!filteredPayrolls.length) return [];
    
    // Create an object to group payroll by date
    const payrollByDate = filteredPayrolls.reduce((acc, record) => {
      const dateStr = record.paymentDate ? formatDate(record.paymentDate) : "No Date";
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, amount: 0, count: 0 };
      }
      
      acc[dateStr].amount += parseFloat(record.totalAmount.toString());
      acc[dateStr].count += 1;
      
      return acc;
    }, {});
    
    // Convert to array and sort by date
    return Object.values(payrollByDate).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredPayrolls]);

  // Function to export report data as CSV
  const exportCSV = () => {
    setIsExporting(true);
    
    try {
      let csvContent = "";
      let fileName = "";
      
      if (reportType === "attendance") {
        // Headers for attendance CSV
        csvContent = "Date,Employee ID,Employee Name,Project,Status,Check-in,Check-out,Remarks\n";
        
        // Add data rows
        filteredAttendance.forEach(record => {
          const employee = employees?.find(e => e.id === record.employeeId);
          const project = projects?.find(p => p.id === record.projectId);
          
          csvContent += [
            formatDate(record.date),
            employee?.employeeId || "",
            employee ? `${employee.firstName} ${employee.lastName}` : "",
            project?.name || "",
            record.status,
            record.checkInTime || "",
            record.checkOutTime || "",
            record.remarks || ""
          ].join(",") + "\n";
        });
        
        fileName = `attendance_report_${new Date().toISOString().split("T")[0]}.csv`;
      } else if (reportType === "payroll") {
        // Headers for payroll CSV
        csvContent = "Employee ID,Employee Name,Start Date,End Date,Days Worked,Basic Amount,Conveyance Allowance,Advance Payment,Fines,Total Amount,Payment Date,Status\n";
        
        // Add data rows
        filteredPayrolls.forEach(record => {
          const employee = employees?.find(e => e.id === record.employeeId);
          
          csvContent += [
            employee?.employeeId || "",
            employee ? `${employee.firstName} ${employee.lastName}` : "",
            formatDate(record.startDate),
            formatDate(record.endDate),
            record.daysWorked,
            record.basicAmount,
            record.conveyanceAllowance || "0",
            record.advancePayment || "0",
            record.fines || "0",
            record.totalAmount,
            formatDate(record.paymentDate),
            record.status
          ].join(",") + "\n";
        });
        
        fileName = `payroll_report_${new Date().toISOString().split("T")[0]}.csv`;
      } else if (reportType === "employee") {
        // Headers for employee CSV
        csvContent = "Employee ID,First Name,Last Name,Designation,Daily Wage,Mobile,Address,ID Number,Join Date,Project,Status\n";
        
        // Add data rows
        employees?.forEach(employee => {
          const project = projects?.find(p => p.id === employee.projectId);
          
          csvContent += [
            employee.employeeId,
            employee.firstName,
            employee.lastName,
            employee.designation,
            employee.dailyWage,
            employee.mobile,
            `"${employee.address.replace(/"/g, '""')}"`, // Handle commas in address
            employee.idNumber || "",
            formatDate(employee.joinDate),
            project?.name || "Not Assigned",
            employee.isActive ? "Active" : "Inactive"
          ].join(",") + "\n";
        });
        
        fileName = `employee_report_${new Date().toISOString().split("T")[0]}.csv`;
      }
      
      // Create a download link and trigger the download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Summary statistics
  const attendanceSummary = useMemo(() => {
    if (!filteredAttendance.length) return { total: 0, present: 0, absent: 0, late: 0 };
    
    const total = filteredAttendance.length;
    const present = filteredAttendance.filter(r => r.status.toLowerCase() === 'present').length;
    const absent = filteredAttendance.filter(r => r.status.toLowerCase() === 'absent').length;
    const late = filteredAttendance.filter(r => r.status.toLowerCase() === 'late').length;
    
    return { total, present, absent, late };
  }, [filteredAttendance]);

  const payrollSummary = useMemo(() => {
    if (!filteredPayrolls.length) return { total: 0, count: 0, average: 0 };
    
    const count = filteredPayrolls.length;
    const total = filteredPayrolls.reduce((sum, record) => 
      sum + parseFloat(record.totalAmount.toString()), 0);
    const average = total / count;
    
    return { total, count, average };
  }, [filteredPayrolls]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Generator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="attendance" value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
          <TabsList className="mb-4">
            <TabsTrigger value="attendance" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="payroll" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Payroll
            </TabsTrigger>
            <TabsTrigger value="employee" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Employee
            </TabsTrigger>
          </TabsList>

          {/* Filter Controls */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              />
            </div>
            
            {reportType !== "employee" && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {reportType === "attendance" ? (
                      <>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {reportType === "attendance" && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Project
                </label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {!isLoadingProjects && projects && projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="lg:col-span-4 flex justify-end">
              <Button 
                onClick={exportCSV} 
                disabled={isExporting || (
                  (reportType === "attendance" && filteredAttendance.length === 0) ||
                  (reportType === "payroll" && filteredPayrolls.length === 0) ||
                  (reportType === "employee" && !employees?.length)
                )}
                className="flex items-center gap-1"
              >
                <FileDown className="h-4 w-4 mr-1" />
                {isExporting ? "Exporting..." : "Export CSV"}
              </Button>
            </div>
          </div>

          <TabsContent value="attendance">
            {isLoadingAttendance || isLoadingEmployees || isLoadingProjects ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <>
                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-500">Total Records</div>
                      <div className="text-2xl font-bold">{attendanceSummary.total}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-500">Present</div>
                      <div className="text-2xl font-bold text-[#48BB78]">
                        {attendanceSummary.present} 
                        <span className="text-sm font-normal ml-1">
                          ({attendanceSummary.total ? Math.round(attendanceSummary.present / attendanceSummary.total * 100) : 0}%)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-500">Absent</div>
                      <div className="text-2xl font-bold text-[#E53E3E]">
                        {attendanceSummary.absent}
                        <span className="text-sm font-normal ml-1">
                          ({attendanceSummary.total ? Math.round(attendanceSummary.absent / attendanceSummary.total * 100) : 0}%)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-500">Late</div>
                      <div className="text-2xl font-bold text-[#ED8936]">
                        {attendanceSummary.late}
                        <span className="text-sm font-normal ml-1">
                          ({attendanceSummary.total ? Math.round(attendanceSummary.late / attendanceSummary.total * 100) : 0}%)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Attendance Chart */}
                {attendanceChartData.length > 0 ? (
                  <div className="h-80 mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={attendanceChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" name="Present" fill="#48BB78" />
                        <Bar dataKey="absent" name="Absent" fill="#E53E3E" />
                        <Bar dataKey="late" name="Late" fill="#ED8936" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium">No attendance data available</h3>
                    <p className="mt-1">Try changing your filters or date range</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="payroll">
            {isLoadingPayrolls || isLoadingEmployees ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <>
                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-500">Total Payroll Records</div>
                      <div className="text-2xl font-bold">{payrollSummary.count}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-500">Total Amount</div>
                      <div className="text-2xl font-bold text-[#2C5282]">
                        {formatCurrency(payrollSummary.total)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-500">Average Payment</div>
                      <div className="text-2xl font-bold text-[#2C5282]">
                        {formatCurrency(payrollSummary.average)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Payroll Chart */}
                {payrollChartData.length > 0 ? (
                  <div className="h-80 mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={payrollChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'amount' 
                              ? formatCurrency(value) 
                              : value
                            , name === 'amount' 
                              ? 'Total Amount' 
                              : 'Number of Payments'
                          ]}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="amount" name="Amount" fill="#2C5282" />
                        <Bar yAxisId="right" dataKey="count" name="Payments" fill="#48BB78" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium">No payroll data available</h3>
                    <p className="mt-1">Try changing your filters or date range</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="employee">
            {isLoadingEmployees || isLoadingProjects ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <>
                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-500">Total Employees</div>
                      <div className="text-2xl font-bold">{employees?.length || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-500">Active Employees</div>
                      <div className="text-2xl font-bold text-[#48BB78]">
                        {employees?.filter(e => e.isActive).length || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-500">Inactive Employees</div>
                      <div className="text-2xl font-bold text-[#E53E3E]">
                        {employees?.filter(e => !e.isActive).length || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Employee Table */}
                {employees?.length ? (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Employee ID</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Designation</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Daily Wage</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Join Date</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {employees.map(employee => (
                          <tr key={employee.id}>
                            <td className="px-4 py-3">{employee.employeeId}</td>
                            <td className="px-4 py-3">{`${employee.firstName} ${employee.lastName}`}</td>
                            <td className="px-4 py-3">{employee.designation}</td>
                            <td className="px-4 py-3">{formatCurrency(employee.dailyWage)}</td>
                            <td className="px-4 py-3">{formatDate(employee.joinDate)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                employee.isActive 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {employee.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium">No employee data available</h3>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
