import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles: UserRole[];
    redirectTo?: string;
}

/**
 * RoleGuard component - Protects routes based on user roles
 * Only renders children if user has one of the allowed roles
 */
export const RoleGuard = ({ children, allowedRoles, redirectTo = '/' }: RoleGuardProps) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                fontSize: '1.25rem',
                color: 'var(--color-text-secondary)'
            }}>
                Loading...
            </div>
        );
    }

    if (!user) {
        // If user is not logged in, redirect to landing page
        return <Navigate to="/" replace />;
    }

    if (!user.role || !allowedRoles.includes(user.role)) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
};
