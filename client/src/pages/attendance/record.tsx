import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AttendanceForm from "@/components/attendance/attendance-form";

export default function RecordAttendancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/attendance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Record Attendance</h1>
      </div>
      
      <AttendanceForm />
    </div>
  );
}
