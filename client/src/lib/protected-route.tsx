import { ReactNode } from 'react';
import { Route, useLocation } from 'wouter';
import useAuth from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
  roles?: string[];
}

export const ProtectedRoute = ({ path, component: Component, roles }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <Route path={path}>
      {() => {
        // Show loading state while checking authentication
        if (isLoading) {
          return (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        // Redirect to login if not authenticated
        if (!isAuthenticated) {
          setLocation('/auth');
          return null;
        }

        // Check role-based access if roles are specified
        if (roles && user && !roles.includes(user.role)) {
          return (
            <div className="flex h-full flex-col items-center justify-center p-4">
              <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
              <p className="mt-2 text-center text-gray-600">
                You don't have permission to access this page
              </p>
              <button
                onClick={() => setLocation('/')}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
              >
                Back to Dashboard
              </button>
            </div>
          );
        }

        // If authenticated and authorized, render the component
        return <Component />;
      }}
    </Route>
  );
};

interface RouteGuardProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export const RouteGuard = ({ children, requiredRoles }: RouteGuardProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Use useEffect to handle redirects to avoid setState during render
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/auth');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Wait for authentication check before rendering anything
  if (!isAuthenticated) {
    return null;
  }

  // Check role-based access if roles are specified
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
        <p className="mt-2 text-center text-gray-600">
          You don't have permission to access this page
        </p>
        <button
          onClick={() => setLocation('/')}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // If authenticated and authorized, render the children
  return <>{children}</>;
};