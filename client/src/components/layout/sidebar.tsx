import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useCompanySettings } from "@/hooks/useCompanySettings";
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
  ArrowUpCircle,
  ShieldCheck
} from "lucide-react";

// Define navigation items with role-based access
const allNavigationItems = [
  { name: "Dashboard", href: "/", icon: Home, roles: ["admin", "hr", "viewer"] },
  { name: "Employees", href: "/employees", icon: Users, roles: ["admin", "hr", "viewer"] },
  { name: "Attendance", href: "/attendance", icon: Calendar, roles: ["admin", "hr", "viewer"] },
  { name: "Daily Expenditure", href: "/expenditures", icon: ArrowUpCircle, roles: ["admin", "hr", "viewer"] },
  { name: "Daily Income", href: "/incomes", icon: ArrowDownCircle, roles: ["admin", "hr", "viewer"] },
  { name: "Payroll", href: "/payroll", icon: DollarSign, roles: ["admin", "hr", "viewer"] },
  { name: "Reports", href: "/reports", icon: FileText, roles: ["admin"] },
  { name: "Users", href: "/users", icon: ShieldCheck, roles: ["admin"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { settings } = useCompanySettings();
  const [userRole, setUserRole] = useState('admin'); // Default to admin for now
  const [navigationItems, setNavigationItems] = useState(allNavigationItems);
  
  // Get user role from JWT
  useEffect(() => {
    
    // Get user role from localStorage or JWT
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        // Decode JWT token to get user role
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        if (tokenPayload && tokenPayload.role) {
          setUserRole(tokenPayload.role);
        }
      } catch (error) {
        console.error('Error decoding JWT token:', error);
      }
    }
  }, []);
  
  // Filter navigation items based on user role
  useEffect(() => {
    const filteredItems = allNavigationItems.filter(item => 
      item.roles.includes(userRole)
    );
    setNavigationItems(filteredItems);
  }, [userRole]);

  return (
    <div className="hidden md:block w-64 bg-white shadow-md overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <UserPlus className="h-6 w-6 mr-2 text-[#2C5282]" />
          <h1 className="text-xl font-bold text-[#2C5282]">
            {settings.companyName}
          </h1>
        </div>
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
