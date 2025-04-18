import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Employee, Project, Attendance } from "@shared/schema";
import { getDaysInMonth } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Edit, 
  Pencil, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  BadgeCheck,
  Clock,
  Calendar as CalendarIcon,
  AlarmClock,
  Banknote,
  CreditCard,
  AlertCircle,
  Wallet
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function EmployeeDetails() {
  const { id } = useParams();
  const employeeId = parseInt(id);

  const { data: employee, isLoading: isLoadingEmployee } = useQuery({
    queryKey: [`/api/employees/${employeeId}`],
    enabled: !isNaN(employeeId),
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const getProjectName = (projectId: number | null | undefined) => {
    if (!projectId || !projects) return "Not Assigned";
    const project = projects.find((p: Project) => p.id === projectId);
    return project ? project.name : "Not Assigned";
  };
  
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/employees">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Employee Details</h1>
        </div>
        {!isLoadingEmployee && employee && (
          <Link href={`/employees/edit/${employeeId}`}>
            <Button className="flex items-center gap-1">
              <Edit className="h-4 w-4 mr-1" />
              Edit Employee
            </Button>
          </Link>
        )}
      </div>

      {isLoadingEmployee ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : employee ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage 
                  src={`https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=random&size=64`} 
                  alt={`${employee.firstName} ${employee.lastName}`} 
                />
                <AvatarFallback className="text-lg">{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{`${employee.firstName} ${employee.lastName}`}</CardTitle>
                <CardDescription>{employee.employeeId}</CardDescription>
                <div className="mt-2">
                  <Badge variant={employee.isActive ? "success" : "secondary"}>
                    {employee.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Briefcase className="h-4 w-4" /> Designation
                </div>
                <div className="text-lg">{employee.designation}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <BadgeCheck className="h-4 w-4" /> Project
                </div>
                <div className="text-lg">{getProjectName(employee.projectId)}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <DollarSign className="h-4 w-4" /> Daily Wage
                </div>
                <div className="text-lg">{formatCurrency(employee.dailyWage)}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Join Date
                </div>
                <div className="text-lg">{formatDate(employee.joinDate)}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Phone className="h-4 w-4" /> Mobile
                </div>
                <div className="text-lg">{employee.mobile}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Pencil className="h-4 w-4" /> ID Number
                </div>
                <div className="text-lg">{employee.idNumber || "Not provided"}</div>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Address
              </div>
              <div className="text-lg">{employee.address}</div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wallet className="h-5 w-5 mr-2 text-primary" />
                  <h3 className="text-lg font-medium">Salary Information</h3>
                </div>
                <Badge variant="outline" className="bg-blue-50">
                  Current Month
                </Badge>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Start Duty</TableHead>
                      <TableHead>End Duty</TableHead>
                      <TableHead>Total Duty</TableHead>
                      <TableHead>Conveyance</TableHead>
                      <TableHead>Earned Salary</TableHead>
                      <TableHead>Loan/Advance</TableHead>
                      <TableHead>Fines</TableHead>
                      <TableHead>Payable Salary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
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
                            <TableCell>{dutyInfo.totalDuty} days</TableCell>
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
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-1">
                      <Clock className="h-4 w-4" /> Start Duty
                    </div>
                    <div className="text-lg">{calculateDutyInfo(employee.id).startDuty}</div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-1">
                      <AlarmClock className="h-4 w-4" /> End Duty
                    </div>
                    <div className="text-lg">{calculateDutyInfo(employee.id).endDuty}</div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-1">
                      <CalendarIcon className="h-4 w-4" /> Total Duty
                    </div>
                    <div className="text-lg">{calculateDutyInfo(employee.id).totalDuty} days</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-1">
                      <Banknote className="h-4 w-4" /> Payable Salary
                    </div>
                    <div className="text-lg font-medium">
                      {formatCurrency(
                        calculatePayableSalary(
                          calculateEarnedSalary(
                            Number(employee.dailyWage),
                            calculateDutyInfo(employee.id).totalDuty
                          ),
                          Number(employee.loanAdvance) || 0
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-lg text-gray-500">Employee not found</div>
            <Link href="/employees">
              <Button className="mt-4">Back to Employees</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
