import { Link } from "wouter";
import { UserPlus, Calendar, DollarSign, FileText } from "lucide-react";

interface QuickActionItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  bgColor: string;
}

const quickActions: QuickActionItem[] = [
  {
    title: "Add Employee",
    description: "Create a new employee profile with all necessary details.",
    icon: <UserPlus className="h-6 w-6 text-[#2C5282]" />,
    href: "/employees/add",
    bgColor: "bg-[#2C5282] bg-opacity-10",
  },
  {
    title: "Mark Attendance",
    description: "Record today's worker attendance for all active projects.",
    icon: <Calendar className="h-6 w-6 text-[#48BB78]" />,
    href: "/attendance/record",
    bgColor: "bg-[#48BB78] bg-opacity-10",
  },
  {
    title: "Process Payroll",
    description: "Calculate and process payments for all active workers.",
    icon: <DollarSign className="h-6 w-6 text-[#2C5282]" />,
    href: "/payroll/process",
    bgColor: "bg-[#2C5282] bg-opacity-10",
  },
  {
    title: "Generate Reports",
    description: "Create detailed reports for attendance, payments, and more.",
    icon: <FileText className="h-6 w-6 text-[#ED8936]" />,
    href: "/reports",
    bgColor: "bg-[#ED8936] bg-opacity-10",
  },
];

export default function QuickActions() {
  return (
    <div>
      <h2 className="text-lg font-medium text-[#2D3748] mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {quickActions.map((action, index) => (
          <Link key={index} href={action.href}>
            <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow duration-300 cursor-pointer">
              <div className="flex items-center">
                <div className={`rounded-md p-3 ${action.bgColor}`}>
                  {action.icon}
                </div>
                <h3 className="ml-3 text-lg text-[#2D3748] font-medium">{action.title}</h3>
              </div>
              <p className="mt-2 text-sm text-gray-500">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
