import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UserPlus, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PasswordInput } from '@/components/ui/password-input';
import FormInputWithValidation from '@/components/ui/form-input-with-validation';
import CharacterResponse from '@/components/ui/character-response';

const AuthPage = () => {
  // Authentication hook
  const auth = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  // Form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    employeeId: '',
  });

  // Form validity state
  const [formState, setFormState] = useState({
    loginValid: false,
    registerValid: false,
    registerProgress: 0,
  });
  
  // Track form completion progress for registration
  useEffect(() => {
    let progress = 0;
    const fields = [
      registerData.firstName,
      registerData.lastName,
      registerData.email,
      registerData.password,
      registerData.employeeId,
    ];
    
    // Calculate progress as percentage of filled fields
    const filledFields = fields.filter(field => field.trim() !== '').length;
    progress = Math.floor((filledFields / fields.length) * 100);
    
    // Check if all required fields are valid
    const isValid = fields.every(field => field.trim() !== '');
    
    setFormState(prev => ({
      ...prev,
      registerValid: isValid,
      registerProgress: progress,
    }));
  }, [registerData]);
  
  // Check login form validity
  useEffect(() => {
    const isValid = loginData.email.trim() !== '' && 
                    loginData.password.trim() !== '' &&
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.email);
    
    setFormState(prev => ({
      ...prev,
      loginValid: isValid,
    }));
  }, [loginData]);
  
  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      navigate('/');
    }
  }, [auth.isAuthenticated, auth.user, navigate]);
  
  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.loginValid) {
      toast({
        title: 'Form Incomplete',
        description: 'Please fill in all the required fields correctly.',
        variant: 'destructive',
      });
      return;
    }
    
    // Prevent duplicate submissions - important for browser autofill
    if (auth.loginMutation.isPending) {
      return;
    }
    
    try {
      // Display loading toast
      toast({
        title: 'Logging in...',
        description: 'Please wait while we authenticate you.',
      });
      
      // Slight delay to ensure the form values are properly filled
      // This helps with browser autofill issues
      setTimeout(async () => {
        try {
          await auth.loginMutation.mutateAsync(loginData);
          toast({
            title: 'Login Successful',
            description: 'Welcome back!',
          });
        } catch (error) {
          console.error('Login error:', error);
        }
      }, 100);
    } catch (error) {
      console.error('Login error:', error);
      // Toast is handled in the mutation error handler
    }
  };
  
  // Handle register form submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.registerValid) {
      toast({
        title: 'Form Incomplete',
        description: 'Please fill in all the required fields correctly.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await auth.registerMutation.mutateAsync(registerData);
      toast({
        title: 'Registration Successful',
        description: 'Your account has been created.',
      });
    } catch (error) {
      console.error('Registration error:', error);
      // Toast is handled in the mutation error handler
    }
  };
  
  // Progress message for registration
  const getProgressMessage = () => {
    const progress = formState.registerProgress;
    
    if (progress === 0) {
      return "Let's get started! Fill in your details to create an account.";
    } else if (progress < 40) {
      return "Good start! Keep filling in your information.";
    } else if (progress < 80) {
      return "You're making great progress!";
    } else if (progress < 100) {
      return "Almost there! Just a few more fields to complete.";
    } else {
      return "Perfect! All set to create your account.";
    }
  };
  
  // Progress mood for character response
  const getProgressMood = (): 'happy' | 'thinking' | 'neutral' | 'success' => {
    const progress = formState.registerProgress;
    
    if (progress === 0) return 'neutral';
    if (progress < 50) return 'thinking';
    if (progress < 100) return 'happy';
    return 'success';
  };
  
  // Loading state
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
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
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <Card>
                <form onSubmit={handleLogin}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LogIn className="h-5 w-5" />
                      Account Login
                    </CardTitle>
                    <CardDescription>
                      Enter your credentials to access your account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormInputWithValidation
                      label="Email"
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={loginData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setLoginData({ ...loginData, email: e.target.value })}
                      validationRules={{
                        required: true,
                        email: true
                      }}
                      feedbackMessages={{
                        initial: "Enter your email address",
                        valid: "Great! Your email looks good.",
                        empty: "Email is required to log in.",
                        typing: "Checking your email format..."
                      }}
                      required
                    />
                    
                    <div className="space-y-2">
                      <FormInputWithValidation
                        label="Password"
                        id="login-password-wrapper"
                        type="password"
                        value={loginData.password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setLoginData({ ...loginData, password: e.target.value })}
                        validationRules={{
                          required: true,
                          minLength: 6
                        }}
                        feedbackMessages={{
                          initial: "Enter your password",
                          valid: "Password looks secure!",
                          empty: "Password is required to log in.",
                          typing: "Checking password..."
                        }}
                        containerClassName="hidden"
                      />
                      <PasswordInput
                        id="login-password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        placeholder="Enter your password"
                        required
                      />
                      {loginData.password && loginData.password.length < 6 && (
                        <CharacterResponse
                          mood="warning"
                          message="Password should be at least 6 characters long."
                          size="sm"
                        />
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={auth.loginMutation.isPending || !formState.loginValid}
                    >
                      {auth.loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        'Login'
                      )}
                    </Button>
                    
                    {!formState.loginValid && loginData.email && loginData.password && (
                      <CharacterResponse
                        mood="thinking"
                        message="Please make sure your email and password are entered correctly."
                        size="sm"
                      />
                    )}
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <Card>
                <form onSubmit={handleRegister}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Create Account
                    </CardTitle>
                    <CardDescription>
                      Register for a new account to access the system.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Registration progress indicator */}
                    <div className="w-full bg-muted rounded-full h-2.5 mb-2">
                      <div 
                        className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${formState.registerProgress}%` }}
                      ></div>
                    </div>
                    <CharacterResponse
                      mood={getProgressMood()}
                      message={getProgressMessage()}
                      size="sm"
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormInputWithValidation
                        label="First Name"
                        id="firstName"
                        value={registerData.firstName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setRegisterData({ ...registerData, firstName: e.target.value })}
                        validationRules={{
                          required: true,
                          minLength: 2
                        }}
                        feedbackMessages={{
                          initial: "Your first name",
                          valid: "Nice to meet you!",
                          empty: "First name is required.",
                          typing: "Typing first name..."
                        }}
                        required
                      />
                      
                      <FormInputWithValidation
                        label="Last Name"
                        id="lastName"
                        value={registerData.lastName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setRegisterData({ ...registerData, lastName: e.target.value })}
                        validationRules={{
                          required: true,
                          minLength: 2
                        }}
                        feedbackMessages={{
                          initial: "Your last name",
                          valid: "Great last name!",
                          empty: "Last name is required.",
                          typing: "Typing last name..."
                        }}
                        required
                      />
                    </div>
                    
                    <FormInputWithValidation
                      label="Email"
                      id="registerEmail"
                      type="email"
                      value={registerData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setRegisterData({ ...registerData, email: e.target.value })}
                      validationRules={{
                        required: true,
                        email: true
                      }}
                      feedbackMessages={{
                        initial: "Your email address for login",
                        valid: "Valid email format!",
                        empty: "Email is required for registration.",
                        typing: "Checking email format..."
                      }}
                      required
                    />
                    
                    <FormInputWithValidation
                      label="Employee ID"
                      id="employeeId"
                      value={registerData.employeeId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setRegisterData({ ...registerData, employeeId: e.target.value })}
                      validationRules={{
                        required: true
                      }}
                      feedbackMessages={{
                        initial: "Your employee ID number",
                        valid: "Employee ID received!",
                        empty: "Employee ID is required.",
                        typing: "Entering employee ID..."
                      }}
                      required
                    />
                    
                    <div className="space-y-2">
                      <FormInputWithValidation
                        label="Password"
                        id="register-password-wrapper"
                        type="password"
                        value={registerData.password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setRegisterData({ ...registerData, password: e.target.value })}
                        validationRules={{
                          required: true,
                          minLength: 8
                        }}
                        feedbackMessages={{
                          initial: "Create a secure password",
                          valid: "Strong password!",
                          empty: "Password is required.",
                          typing: "Checking password strength..."
                        }}
                        containerClassName="hidden"
                      />
                      <PasswordInput
                        id="registerPassword"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        placeholder="Create a secure password"
                        required
                      />
                      {registerData.password && (
                        <div className="mt-2">
                          {registerData.password.length < 8 ? (
                            <CharacterResponse
                              mood="warning"
                              message="Password should be at least 8 characters long for security."
                              size="sm"
                            />
                          ) : (
                            <CharacterResponse
                              mood="success"
                              message="Great! Your password meets security requirements."
                              size="sm"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={auth.registerMutation.isPending || !formState.registerValid}
                    >
                      {auth.registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        'Register'
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
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

export default AuthPage;