import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PasswordInput } from '@/components/ui/password-input';

const AuthLogin: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  
  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Show success message
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      
      // Store token in localStorage - simulated
      localStorage.setItem('token', 'sample-token-for-demonstration');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        email: loginData.email
      }));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: 'Invalid credentials. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Side - Authentication Form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Al-Aqsa HRM</h1>
            <p className="text-muted-foreground mt-2">
              Log in to access the Field Attendance Tracker
            </p>
          </div>
          
          <Card>
            <form onSubmit={handleLogin}>
              <CardHeader>
                <CardTitle>Account Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="your.email@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
          
          {/* Default credentials */}
          <div className="mt-4 p-3 bg-muted rounded-md text-sm">
            <p className="font-medium mb-2">Default Accounts:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li><strong>Admin:</strong> admin@example.com / admin123</li>
              <li><strong>HR:</strong> hr@example.com / hr1234</li>
              <li><strong>Viewer:</strong> viewer@example.com / view789</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Right Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground">
        <div className="flex flex-col justify-center p-12 max-w-lg mx-auto">
          <h1 className="text-4xl font-bold mb-6">
            Field Attendance Tracker
          </h1>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">GPS Location Tracking</h3>
              <p>Accurately track field employee locations in real-time with our GPS-enabled system.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Time Management</h3>
              <p>Effortlessly record check-in and check-out times for better workforce management.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Comprehensive Reporting</h3>
              <p>Generate detailed reports on attendance, hours, and project assignments.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Mobile Friendly</h3>
              <p>Access the system from any device, optimized for both desktop and mobile use.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLogin;