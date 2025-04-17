import { Bell, Search, Menu, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [userInfo, setUserInfo] = useState({ name: 'Admin User' });
  
  const handleLogout = async () => {
    try {
      // Remove the auth token
      localStorage.removeItem('authToken');
      
      // Call logout API endpoint
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of the system",
        });
        
        // Redirect to login page
        setLocation('/auth');
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was a problem logging out",
        variant: "destructive",
      });
    }
  };
  
  // Get user info from API or localStorage
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        // Decode JWT token to get user info
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        if (tokenPayload) {
          setUserInfo({
            name: tokenPayload.fullName || tokenPayload.email || 'User'
          });
        }
      } catch (error) {
        console.error('Error decoding JWT token:', error);
      }
    }
  }, []);
  
  // Company name from localStorage (will be implemented in settings)
  const companyName = localStorage.getItem('companyName') || 'HR & Payroll';
  
  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            className="md:hidden mr-2 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-medium md:hidden">{companyName}</h1>
          <div className="relative max-w-md w-full md:ml-0 hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input 
              type="text" 
              placeholder="Search" 
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-gray-500 hover:text-gray-900 focus:outline-none">
            <Bell className="h-6 w-6" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User profile" />
                  <AvatarFallback>AU</AvatarFallback>
                </Avatar>
                <span className="ml-2 text-sm font-medium text-gray-700 hidden md:block">{userInfo.name}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation('/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="hidden sm:flex items-center text-red-600 hover:bg-red-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
