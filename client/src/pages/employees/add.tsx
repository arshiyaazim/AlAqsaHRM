import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmployeeForm from "@/components/employees/employee-form";

export default function AddEmployeePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Add New Employee</h1>
      </div>
      
      <EmployeeForm />
    </div>
  );
}
