import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  UserPlus,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle
} from "lucide-react";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Attendance", href: "/attendance", icon: Calendar },
  { name: "Daily Expenditure", href: "/expenditures", icon: ArrowUpCircle },
  { name: "Daily Income", href: "/incomes", icon: ArrowDownCircle },
  { name: "Payroll", href: "/payroll", icon: DollarSign },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="hidden md:block w-64 bg-white shadow-md overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-[#2C5282] flex items-center">
          <UserPlus className="h-6 w-6 mr-2" />
          HR & Payroll
        </h1>
      </div>
      
      <nav className="px-3 py-4">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = location === item.href || 
                             (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Link 
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md w-full",
                  isActive
                    ? "bg-[#2C5282] bg-opacity-10 border-l-4 border-[#2C5282] text-[#2C5282]"
                    : "text-[#2D3748] hover:bg-gray-100"
                )}
              >
                <item.icon 
                  className={cn(
                    "h-5 w-5 mr-3",
                    isActive ? "text-[#2C5282]" : "text-gray-500"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
