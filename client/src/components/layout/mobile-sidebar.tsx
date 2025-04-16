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
  X
} from "lucide-react";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Attendance", href: "/attendance", icon: Calendar },
  { name: "Payroll", href: "/payroll", icon: DollarSign },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const [location] = useLocation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-600 bg-opacity-75" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 flex max-w-xs w-full bg-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-12 pt-2">
          <button 
            className="flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <span className="sr-only">Close sidebar</span>
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
          <div className="px-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-[#2C5282] flex items-center">
              <UserPlus className="h-6 w-6 mr-2" />
              HR & Payroll
            </h1>
          </div>
          
          <div className="mt-5 flex-1">
            <nav className="px-2 space-y-1">
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
                    onClick={onClose}
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
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
