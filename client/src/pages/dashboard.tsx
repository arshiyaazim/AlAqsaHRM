import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Calendar, 
  Clock, 
  DollarSign
} from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import AttendanceChart from "@/components/dashboard/attendance-chart";
import RecentPayments from "@/components/dashboard/recent-payments";
import QuickActions from "@/components/dashboard/quick-actions";
import { QRCodeCard } from "@/components/dashboard/qr-code-card";
import { formatCurrency } from "@/lib/utils";
import { 
  DashboardSkeleton, 
  DashboardStatsSkeleton,
  AttendanceChartSkeleton,
  RecentPaymentsSkeleton,
  QuickActionsSkeleton
} from "@/components/skeletons";

export default function Dashboard() {
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  // Weekly attendance data (mocked for now)
  const weeklyAttendanceData = {
    present: dashboardStats?.presentEmployees || 75,
    absent: dashboardStats?.absentEmployees || 15,
    late: dashboardStats?.lateEmployees || 10,
    weeklyData: [
      { day: "Monday", shortDay: "Mon", percentage: 78 },
      { day: "Tuesday", shortDay: "Tue", percentage: 65 },
      { day: "Wednesday", shortDay: "Wed", percentage: 82 },
      { day: "Thursday", shortDay: "Thu", percentage: 75 },
      { day: "Friday", shortDay: "Fri", percentage: 68 },
      { day: "Saturday", shortDay: "Sat", percentage: 45 },
      { day: "Sunday", shortDay: "Sun", percentage: 30 },
    ],
  };

  // If loading, show the full dashboard skeleton
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D3748]">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of daily laborers' management system</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={dashboardStats?.totalEmployees?.toString() || "0"}
          percentageChange={7}
          icon={Users}
          iconBgColor="bg-[#2C5282] bg-opacity-10"
          iconColor="text-[#2C5282]"
        />
        <StatCard
          title="Today's Attendance"
          value={dashboardStats?.presentEmployees?.toString() || "0"}
          percentageChange={12}
          icon={Calendar}
          iconBgColor="bg-[#48BB78] bg-opacity-10"
          iconColor="text-[#48BB78]"
        />
        <StatCard
          title="Active Projects"
          value={dashboardStats?.activeProjects?.toString() || "0"}
          percentageChange={-2}
          icon={Clock}
          iconBgColor="bg-[#ED8936] bg-opacity-10"
          iconColor="text-[#ED8936]"
        />
        <StatCard
          title="Total Payroll (Today)"
          value={formatCurrency(dashboardStats?.totalPayroll || 0)}
          percentageChange={4}
          icon={DollarSign}
          iconBgColor="bg-[#2C5282] bg-opacity-10"
          iconColor="text-[#2C5282]"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attendance Overview */}
        <AttendanceChart data={weeklyAttendanceData} />
        
        {/* Recent Payments */}
        <RecentPayments />
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}
