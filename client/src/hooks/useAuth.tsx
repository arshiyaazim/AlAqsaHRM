import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from "react";
import { useMutation, useQuery, UseMutationResult } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define User and Authentication Types
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  employeeId: string;
  role: string;
  isActive: boolean | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  employeeId: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginMutation: UseMutationResult<any, Error, LoginCredentials>;
  registerMutation: UseMutationResult<any, Error, RegisterCredentials>;
  logoutMutation: UseMutationResult<any, Error, void>;
}

// Create Authentication Context
const AuthContext = createContext<AuthContextType | null>(null);

// Login Mutation Hook
const useLoginMutation = () => {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }
      const data = await response.json();
      
      // Store the token in localStorage for future requests
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Store complete user data in localStorage for role-based access
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      } else if (data) {
        localStorage.setItem('user', JSON.stringify(data));
      }

      queryClient.setQueryData(["/api/auth/me"], data.user || data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Redirect to dashboard after successful login
      window.location.href = '/';
    },
  });
};

// Register Mutation Hook
const useRegisterMutation = () => {
  return useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const response = await apiRequest("POST", "/api/auth/register", credentials);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }
      const data = await response.json();
      
      // Store the token in localStorage if provided
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Store complete user data in localStorage for role-based access
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      } else if (data) {
        localStorage.setItem('user', JSON.stringify(data));
      }
      
      queryClient.setQueryData(["/api/auth/me"], data.user || data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Redirect to dashboard after successful registration
      window.location.href = '/';
    },
  });
};

// Logout Mutation Hook
const useLogoutMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Logout failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.setQueryData(["/api/auth/me"], null);
    },
  });
};

// AuthProvider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { toast } = useToast?.() ?? { toast: () => {} };
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch current user data with auth status management
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        // Check for token in localStorage to avoid unnecessary API calls
        const token = localStorage.getItem('token');
        if (!token) {
          // Don't call setState during render - will trigger in useEffect below
          return null;
        }
        
        const response = await apiRequest("GET", "/api/auth/me");
        if (response.status === 401) {
          // Clear token if invalid
          localStorage.removeItem('token');
          // Don't call setState during render - will trigger in useEffect below
          return null;
        }
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        
        const userData = await response.json();
        return userData;
      } catch (error) {
        // Don't call setState during render
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
  
  // Handle authentication state updates in a separate effect
  useEffect(() => {
    // Update authentication state based on user data
    if (user) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  // Hook instances
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();
  
  // Handle auth errors but with a reference check to prevent infinite updates
  useEffect(() => {
    // Only show auth error toast when we have an error
    if (error) {
      toast({
        title: "Authentication Error",
        description: "There was a problem with your authentication. Please log in again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const value = {
    user: user || null,
    isAuthenticated,
    isLoading,
    loginMutation,
    registerMutation,
    logoutMutation,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

// Custom Hook to use Auth Context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default useAuth;