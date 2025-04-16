import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmployeeForm from "@/components/employees/employee-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditEmployeePage() {
  const { id } = useParams();
  const employeeId = parseInt(id);

  const { data: employee, isLoading } = useQuery({
    queryKey: [`/api/employees/${employeeId}`],
    enabled: !isNaN(employeeId),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Edit Employee</h1>
      </div>
      
      {isLoading ? (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      ) : employee ? (
        <EmployeeForm 
          employeeId={employeeId}
          defaultValues={{
            ...employee,
            joinDate: employee.joinDate instanceof Date 
              ? employee.joinDate.toISOString().split("T")[0] 
              : new Date(employee.joinDate).toISOString().split("T")[0]
          }}
          isEditMode={true}
        />
      ) : (
        <div className="bg-white overflow-hidden shadow rounded-lg p-6 text-center">
          <h2 className="text-lg font-medium text-gray-900">Employee not found</h2>
          <p className="mt-1 text-sm text-gray-500">
            The employee you're trying to edit doesn't exist or has been deleted.
          </p>
          <Link href="/employees">
            <Button className="mt-4">Back to Employees</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
