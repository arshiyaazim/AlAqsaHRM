import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
      console.log("Login response:", data);
      
      // Store the token in localStorage
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        console.log("Login successful, response:", data);
        console.log("Token stored in localStorage");
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
      // Remove token from localStorage
      localStorage.removeItem('authToken');
      console.log("Logged out, token removed from localStorage");
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

  // Fetch current user data
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        // First check if we have a token
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.log("No auth token found in localStorage");
          setIsAuthenticated(false);
          return null;
        }
        
        console.log("Found auth token, fetching user data");
        const response = await fetch("/api/auth/me", {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.status === 401) {
          console.log("Auth token invalid or expired");
          localStorage.removeItem('authToken');
          setIsAuthenticated(false);
          return null;
        }
        
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        
        const userData = await response.json();
        console.log("User data fetched successfully:", userData);
        setIsAuthenticated(true);
        return userData;
      } catch (error) {
        console.error("Error fetching user data:", error);
        setIsAuthenticated(false);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  // Hook instances
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  // Update authentication state on data change
  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  // Handle auth errors
  useEffect(() => {
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
    console.error("useAuth is being called outside of AuthProvider");
    // Return a default value instead of throwing to prevent app crashes
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      loginMutation: {} as any,
      registerMutation: {} as any,
      logoutMutation: {} as any
    };
  }
  return context;
};

export default useAuth;