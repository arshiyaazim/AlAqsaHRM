/**
 * Role-based access control utility functions
 * Used to control which pages and components users can access based on their role
 */

/**
 * Check if a user has the required role to access a resource
 * @param userRole - The user's role
 * @param requiredRoles - Array of roles allowed to access the resource
 * @returns boolean indicating if the user has access
 */
export const hasRequiredRole = (
  userRole: string | undefined, 
  requiredRoles: string[]
): boolean => {
  // If no roles are required, allow access
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }
  
  // If no user role is provided, deny access
  if (!userRole) {
    return false;
  }
  
  // Check if user's role is in the required roles list
  return requiredRoles.includes(userRole);
};

/**
 * Get the user's role from localStorage
 * @returns The user's role or undefined if not found
 */
export const getUserRole = (): string | undefined => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return undefined;
    
    const userData = JSON.parse(userStr);
    return userData?.role;
  } catch (error) {
    console.error('Error getting user role:', error);
    return undefined;
  }
};

/**
 * Filter navigation items based on user's role
 * @param navItems - Array of navigation items with role requirements
 * @param userRole - The user's role
 * @returns Filtered array of navigation items accessible to the user
 */
export const filterNavItemsByRole = <T extends { roles?: string[] }>(
  navItems: T[],
  userRole: string | undefined
): T[] => {
  return navItems.filter(item => {
    // If no roles are specified for the item, allow access to all users
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    
    // Otherwise, check if user has the required role
    return hasRequiredRole(userRole, item.roles);
  });
};

/**
 * Check if a component/page should be shown based on the user's role
 * @param userRole - The user's role
 * @param allowedRoles - Array of roles allowed to access the component/page
 * @returns boolean indicating if the component/page should be shown
 */
export const shouldShowComponent = (
  userRole: string | undefined,
  allowedRoles: string[]
): boolean => {
  return hasRequiredRole(userRole, allowedRoles);
};

/**
 * Check if current user has admin privileges
 * @returns boolean indicating if the user is an admin
 */
export const isAdmin = (): boolean => {
  const role = getUserRole();
  return role === 'admin';
};

/**
 * Check if current user has HR privileges
 * @returns boolean indicating if the user is HR
 */
export const isHR = (): boolean => {
  const role = getUserRole();
  return role === 'hr' || role === 'admin'; // Admins also have HR privileges
};

/**
 * Higher-order function that returns a guard function for a specific set of roles
 * @param allowedRoles - Array of roles allowed to access the resource
 * @returns A guard function that takes a user role and returns a boolean
 */
export const createRoleGuard = (allowedRoles: string[]) => {
  return (userRole: string | undefined): boolean => {
    return hasRequiredRole(userRole, allowedRoles);
  };
};

// Common role guards
export const adminGuard = createRoleGuard(['admin']);
export const hrGuard = createRoleGuard(['admin', 'hr']);
export const viewerGuard = createRoleGuard(['admin', 'hr', 'viewer']);