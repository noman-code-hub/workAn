import type { User, UserRole } from '../types';

/**
 * Check if a user has a specific role
 */
export const hasRole = (user: User | null, role: UserRole): boolean => {
    return user?.role === role;
};

/**
 * Check if a user has any of the specified roles
 */
export const hasAnyRole = (user: User | null, roles: UserRole[]): boolean => {
    if (!user || !user.role) return false;
    return roles.includes(user.role);
};

/**
 * Check if a user is an admin
 */
export const isAdmin = (user: User | null): boolean => {
    return hasRole(user, 'admin');
};

/**
 * Check if a user is a recruiter or admin
 */
export const isRecruiterOrAdmin = (user: User | null): boolean => {
    return hasAnyRole(user, ['recruiter', 'admin']);
};

/**
 * Check if a user is a regular user (not admin or recruiter)
 */
export const isRegularUser = (user: User | null): boolean => {
    return hasRole(user, 'user');
};

/**
 * Get user role label for display
 */
export const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
        admin: 'Administrator',
        recruiter: 'Recruiter',
        user: 'User'
    };
    return labels[role];
};

/**
 * Get role color for UI
 */
export const getRoleColor = (role: UserRole): string => {
    const colors: Record<UserRole, string> = {
        admin: '#dc2626',
        recruiter: '#2563eb',
        user: '#10b981'
    };
    return colors[role];
};
