import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Employee, Project } from "@shared/schema";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Edit, Pencil, Phone, MapPin, Calendar, Briefcase, DollarSign, BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
