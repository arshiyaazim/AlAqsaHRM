import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PayrollForm from "@/components/payroll/payroll-form";

export default function ProcessPayrollPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/payroll">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Process Payroll</h1>
      </div>
      
      <PayrollForm />
    </div>
  );
}
