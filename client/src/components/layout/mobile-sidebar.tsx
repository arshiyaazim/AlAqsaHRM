import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useState, useEffect } from "react";
import {
  Home,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  UserPlus,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  ShieldCheck,
  FolderKanban,
  Anchor,
  Receipt,
  Palette,
  Download as FileDown
} from "lucide-react";

// Define navigation items with role-based access - same as in sidebar.tsx
const allNavigationItems = [
  { name: "Dashboard", href: "/", icon: Home, roles: ["admin", "hr", "viewer"] },
  { name: "Employees", href: "/employees", icon: Users, roles: ["admin", "hr", "viewer"] },
  { name: "Attendance", href: "/attendance", icon: Calendar, roles: ["admin", "hr", "viewer"] },
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
  { name: "Field Connections", href: "/admin/field-connections", icon: ArrowLeftRight, roles: ["admin"] },
  { name: "Theme Editor", href: "/admin/theme-editor", icon: Palette, roles: ["admin"] },
  { name: "Export Data", href: "/admin/export-data", icon: FileDown, roles: ["admin"] },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const [location] = useLocation();
  const { settings } = useCompanySettings();
  const [navigationItems, setNavigationItems] = useState<typeof allNavigationItems>([]);

  // Get user role from localStorage and apply navigation filtering - same logic as sidebar.tsx
  useEffect(() => {
    // First try to get user data from localStorage
    const userStr = localStorage.getItem('user');
    let role = null;
    
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData && userData.role) {
          role = userData.role;
          console.log("[Mobile] User role set from localStorage user data:", userData.role);
        }
      } catch (error) {
        console.error('[Mobile] Error parsing user data from localStorage:', error);
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
            console.log("[Mobile] User role set from token:", tokenPayload.role);
          }
        } catch (error) {
          console.error('[Mobile] Error decoding JWT token:', error);
        }
      }
    }
    
    // Filter items based on role
    if (role) {
      const filteredItems = allNavigationItems.filter(item => 
        item.roles.includes(role)
      );
      setNavigationItems(filteredItems);
      console.log(`[Mobile] Filtered navigation items for role ${role}:`, filteredItems.length);
    } else {
      // If no role found, show public items only
      const publicItems = allNavigationItems.filter(item => 
        item.roles.includes('viewer')
      );
      setNavigationItems(publicItems);
    }
  }, []);

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
            <div className="flex items-center">
              <UserPlus className="h-6 w-6 mr-2 text-[#2C5282]" />
              <h1 className="text-xl font-bold text-[#2C5282]">
                {settings.companyName}
              </h1>
            </div>
          </div>
          
          <div className="mt-5 flex-1">
            <nav className="px-2">
              {/* Separate admin and regular pages */}
              {(() => {
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
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
