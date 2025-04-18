import { Bell, Search, Menu, LogOut, Camera, Upload, Settings } from "lucide-react";
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
import { useState, useEffect, useRef } from "react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [userInfo, setUserInfo] = useState({ name: 'Admin User' });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    
    // Try to get saved profile photo URL
    const savedProfilePhoto = localStorage.getItem('profilePhotoUrl');
    if (savedProfilePhoto) {
      setProfilePhotoUrl(savedProfilePhoto);
    }
  }, []);
  
  const handleProfilePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      // Create FormData object for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload to server
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload profile photo');
      }
      
      const data = await response.json();
      // Assuming the server returns a URL to the uploaded file
      setProfilePhotoUrl(data.url);
      localStorage.setItem('profilePhotoUrl', data.url);
      
      toast({
        title: "Profile photo updated",
        description: "Your profile photo has been updated successfully",
      });
      
      // Close dialog
      setShowUploadDialog(false);
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your profile photo",
        variant: "destructive",
      });
    }
  };
  
  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Get company settings from context
  const { settings } = useCompanySettings();
  
  return (
    <>
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
            <h1 className="text-lg font-medium md:hidden">{settings.companyName}</h1>
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
            
            <div className="relative">
              <div 
                className="relative cursor-pointer"
                onClick={() => setShowUploadDialog(true)}
              >
                <Avatar className="h-8 w-8 relative">
                  <AvatarImage 
                    src={profilePhotoUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(userInfo.name) + "&background=random"} 
                    alt="User profile" 
                  />
                  <AvatarFallback>{userInfo.name.charAt(0)}</AvatarFallback>
                  
                  {/* Camera Icon Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-20 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                </Avatar>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center cursor-pointer">
                    <span className="ml-2 text-sm font-medium text-gray-700 hidden md:block">{userInfo.name}</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowUploadDialog(true)}>
                    <Camera className="mr-2 h-4 w-4" />
                    <span>Update Profile Photo</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
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
      
      {/* Profile Photo Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Profile Photo</DialogTitle>
            <DialogDescription>
              Upload a new profile photo. Square images work best.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 flex flex-col items-center">
            {/* Current Profile Photo */}
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage 
                src={profilePhotoUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(userInfo.name) + "&background=random&size=96"} 
                alt="User profile" 
              />
              <AvatarFallback className="text-xl">{userInfo.name.charAt(0)}</AvatarFallback>
            </Avatar>
            
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleProfilePhotoUpload}
            />
            
            {/* File Upload Button */}
            <Button 
              onClick={handleTriggerFileInput}
              className="flex items-center"
            >
              <Upload className="mr-2 h-4 w-4" />
              Select Image
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
