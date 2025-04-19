import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCompanySettings } from "@/hooks/useCompanySettings";

// Login form schema
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

// Forgot Password form schema
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

// Register form schema
const registerSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  employeeId: z.string().min(1, { message: "Employee ID is required" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { settings } = useCompanySettings();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      employeeId: "",
    },
  });

  // Form submission handlers
  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoggingIn(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      // Get response data first
      const responseData = await response.json();
      console.log("Login response:", responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || "Login failed");
      }
      
      console.log("Login successful, response:", responseData);
      
      // Store token in localStorage
      if (responseData.token) {
        localStorage.setItem("token", responseData.token);
        console.log("Token stored in localStorage");
        
        // Store user data if available
        if (responseData.user) {
          localStorage.setItem("user", JSON.stringify(responseData.user));
        }
      } else {
        console.error("No token received from server");
      }
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      setLocation("/");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsRegistering(true);
    try {
      // Remove confirmPassword as it's not needed for API
      const { confirmPassword, ...registerData } = data;
      
      const response = await apiRequest("POST", "/api/auth/register", registerData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }
      
      toast({
        title: "Registration successful",
        description: "Your request is pending. We will send a confirmation email after your request is approved.",
      });
      
      // Show success dialog instead of redirecting
      setActiveTab("registration-pending");
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "There was a problem creating your account",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {settings.companyName}
            </CardTitle>
            <CardDescription className="text-center">
              {settings.companyTagline || "Login or create a new account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="text-right">
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-normal text-xs text-primary"
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full mt-4" 
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </form>
                </Form>
                
                {/* Forgot Password Dialog */}
                {showForgotPassword && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                      <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Enter your email address and we'll send you instructions to reset your password.
                      </p>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const email = (e.target as HTMLFormElement).email.value;
                        
                        // Form validation
                        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
                          toast({
                            title: "Invalid email",
                            description: "Please enter a valid email address",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        setIsRequestingReset(true);
                        
                        // Call the server API to send password reset email
                        apiRequest("POST", "/api/auth/forgot-password", { email })
                          .then(async (response) => {
                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(errorData.message || "Failed to send reset email");
                            }
                            
                            toast({
                              title: "Password reset email sent",
                              description: "Check your email for instructions to reset your password",
                            });
                            setShowForgotPassword(false);
                          })
                          .catch((error) => {
                            toast({
                              title: "Failed to send reset email",
                              description: error instanceof Error ? error.message : "Please try again later",
                              variant: "destructive",
                            });
                          })
                          .finally(() => {
                            setIsRequestingReset(false);
                          });
                      }}>
                        <Input 
                          type="email" 
                          name="email" 
                          placeholder="your.email@example.com" 
                          className="mb-4" 
                          required 
                        />
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowForgotPassword(false)}
                            disabled={isRequestingReset}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={isRequestingReset}
                          >
                            {isRequestingReset ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              "Send Reset Link"
                            )}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee ID</FormLabel>
                          <FormControl>
                            <Input placeholder="EMP-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full mt-6" 
                      disabled={isRegistering}
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              {/* Registration Pending Screen */}
              <TabsContent value="registration-pending" className="text-center">
                <div className="flex flex-col items-center justify-center space-y-4 py-6">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="w-10 h-10"
                    >
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                      <path d="m9 12 2 2 4-4"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold">Registration Pending</h3>
                  <p className="text-muted-foreground max-w-md">
                    Your account registration has been submitted successfully. An administrator will review your request.
                  </p>
                  <p className="text-muted-foreground">
                    You will receive an email notification once your account is approved.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setActiveTab("login")}
                  >
                    Return to Login
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            {activeTab === "login" ? (
              <p>Don't have an account? <Button variant="link" className="p-0" onClick={() => setActiveTab("register")}>Sign up</Button></p>
            ) : activeTab === "register" ? (
              <p>Already have an account? <Button variant="link" className="p-0" onClick={() => setActiveTab("login")}>Log in</Button></p>
            ) : (
              <p></p> /* Empty for registration-pending tab */
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Right side - Hero section */}
      <div className="flex-1 bg-primary p-6 hidden md:flex flex-col justify-center items-center text-white">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-6">{settings.companyName}</h1>
          <p className="mb-8">
            A comprehensive solution for managing daily labor workforce, tracking attendance, calculating wages, and streamlining HR operations.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-primary-foreground/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Employee Management</h3>
              <p className="text-sm opacity-80">Manage all employee information in one centralized database</p>
            </div>
            <div className="bg-primary-foreground/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Attendance Tracking</h3>
              <p className="text-sm opacity-80">Easily record and monitor daily attendance of workers</p>
            </div>
            <div className="bg-primary-foreground/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Payroll Processing</h3>
              <p className="text-sm opacity-80">Automatically calculate wages based on attendance and rates</p>
            </div>
            <div className="bg-primary-foreground/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Financial Reporting</h3>
              <p className="text-sm opacity-80">Generate comprehensive reports on labor costs and expenses</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}