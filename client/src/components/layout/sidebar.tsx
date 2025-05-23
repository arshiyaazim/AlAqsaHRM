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
  ArrowLeftRight,
  ShieldCheck,
  FolderKanban,
  Anchor,
  Receipt,
  Palette,
  Download as FileDown,
  MapPin
} from "lucide-react";

// Define navigation items with role-based access
const allNavigationItems = [
  { name: "Dashboard", href: "/", icon: Home, roles: ["admin", "hr", "viewer"] },
  { name: "Employees", href: "/employees", icon: Users, roles: ["admin", "hr", "viewer"] },
  { name: "Attendance", href: "/attendance", icon: Calendar, roles: ["admin", "hr", "viewer"] },
  { name: "Location Test", href: "/location-test", icon: MapPin, roles: ["admin", "hr", "viewer"] },
  { name: "Projects", href: "/projects", icon: FolderKanban, roles: ["admin", "hr", "viewer"] },
  { name: "Ship Duty", href: "/ship-duties", icon: Anchor, roles: ["admin", "hr", "viewer"] },
  { name: "Bill Management", href: "/bills", icon: Receipt, roles: ["admin", "hr", "viewer"] },
  { name: "Daily Expenditure", href: "/expenditures", icon: ArrowUpCircle, roles: ["admin", "hr", "viewer"] },
  { name: "Cash Receive", href: "/incomes", icon: ArrowDownCircle, roles: ["admin", "hr", "viewer"] },
  { name: "Payroll", href: "/payroll", icon: DollarSign, roles: ["admin", "hr", "viewer"] },
  { name: "Reports", href: "/reports", icon: FileText, roles: ["admin", "hr", "viewer"] },
  { name: "Users", href: "/users", icon: ShieldCheck, roles: ["admin"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
  // Admin-only pages
  { name: "Admin Dashboard", href: "/admin/dashboard", icon: ShieldCheck, roles: ["admin"] },
  { name: "Customize Dashboard", href: "/admin/customize-dashboard", icon: Settings, roles: ["admin"] },
  { name: "Field Connections", href: "/admin/field-connections", icon: ArrowLeftRight, roles: ["admin"] },
  { name: "Theme Editor", href: "/admin/theme-editor", icon: Palette, roles: ["admin"] },
  { name: "Export Data", href: "/admin/export-data", icon: FileDown, roles: ["admin"] },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { settings } = useCompanySettings();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [navigationItems, setNavigationItems] = useState<typeof allNavigationItems>([]);
  
  // Get user role from localStorage and apply navigation filtering
  useEffect(() => {
    // First try to get user data from localStorage
    const userStr = localStorage.getItem('user');
    let role = null;
    
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData && userData.role) {
          role = userData.role;
          console.log("User role set from localStorage user data:", userData.role);
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
      }
    }
    
    // Fallback to token if no user data or role
    if (!role) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Decode JWT token to get user role
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          if (tokenPayload && tokenPayload.role) {
            role = tokenPayload.role;
            console.log("User role set from token:", tokenPayload.role);
          }
        } catch (error) {
          console.error('Error decoding JWT token:', error);
        }
      }
    }
    
    // Set user role and filter navigation items
    setUserRole(role);
    
    // Filter items based on role
    if (role) {
      const filteredItems = allNavigationItems.filter(item => 
        item.roles.includes(role)
      );
      setNavigationItems(filteredItems);
      console.log(`Filtered navigation items for role ${role}:`, filteredItems);
    } else {
      // If no role found, show public items only
      const publicItems = allNavigationItems.filter(item => 
        item.roles.includes('viewer')
      );
      setNavigationItems(publicItems);
    }
  }, []);

  // Group navigation items by category
  const renderNavItems = () => {
    // Separate admin-specific pages
    const adminPages = navigationItems.filter(item => 
      item.href.startsWith('/admin/')
    );
    
    // Regular pages
    const regularPages = navigationItems.filter(item => 
      !item.href.startsWith('/admin/')
    );
    
    return (
      <>
        {/* Regular navigation items */}
        <div className="space-y-1 mb-6">
          {regularPages.map((item) => {
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
        
        {/* Admin pages section */}
        {adminPages.length > 0 && (
          <>
            <div className="px-3 pt-2 pb-1">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Admin Tools
              </h3>
            </div>
            <div className="space-y-1">
              {adminPages.map((item) => {
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
          </>
        )}
      </>
    );
  };

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
        {renderNavItems()}
      </nav>
    </div>
  );
}
