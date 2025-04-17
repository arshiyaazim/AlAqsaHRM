import { create } from 'zustand';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: 'admin' | 'hr' | 'viewer';
  employeeId: string;
  isActive: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  employeeId: string;
  role?: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  isAuthenticated: boolean;
}

const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('token'),
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
    // Clear all queries when logging out
    queryClient.clear();
  },
}));

// Custom hook that combines zustand store with react-query
const useAuth = () => {
  const { token, user, setAuth, clearAuth, isAuthenticated } = useAuthStore();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      const res = await apiRequest('POST', '/api/auth/login', credentials);
      return await res.json();
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData): Promise<AuthResponse> => {
      const res = await apiRequest('POST', '/api/auth/register', userData);
      return await res.json();
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout');
      clearAuth();
    },
  });

  // Current user query
  const {
    data: currentUser,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      if (!token) return null;
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          if (res.status === 401) {
            clearAuth();
            return null;
          }
          throw new Error('Failed to fetch user data');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching current user:', error);
        return null;
      }
    },
    enabled: !!token,
  });

  // Add authorization header to all requests when token exists
  if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      const token = localStorage.getItem('token');
      if (token) {
        init = init || {};
        init.headers = {
          ...init.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return originalFetch(input, init);
    };
  }

  return {
    user: currentUser || user,
    token,
    isAuthenticated,
    isLoading,
    isError,
    loginMutation,
    registerMutation,
    logoutMutation,
    logout: clearAuth,
    refetchUser: refetch,
  };
};

export default useAuth;