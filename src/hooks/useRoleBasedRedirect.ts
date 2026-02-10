import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';

/**
 * Hook to handle role-based navigation after login
 * Redirects users to their appropriate dashboard based on their role
 */
export const useRoleBasedRedirect = (user: User | null, loading: boolean) => {
    const navigate = useNavigate();

    useEffect(() => {
        // Don't redirect while still loading auth state
        if (loading || !user) return;

        // Get current path
        const currentPath = window.location.pathname;

        // If user has NO role, they must go to role selection
        if (!user.role) {
            if (currentPath !== '/select-role') {
                navigate('/select-role', { replace: true });
            }
            return;
        }

        // If user HAS role but is on /select-role, redirect to dashboard
        if (currentPath === '/select-role') {
            // fall through to switch/redirect logic below
        } else {
            // Only redirect from root/landing or login pages for normal users
            const shouldRedirect = currentPath === '/' || currentPath === '/login' || currentPath === '/register';
            if (!shouldRedirect) return;
        }

        // Redirect based on role
        switch (user.role) {
            case 'admin':
                navigate('/admin-dashboard', { replace: true });
                break;
            case 'recruiter':
                navigate('/recruiter', { replace: true });
                break;
            case 'user':
            default:
                navigate('/dashboard', { replace: true });
                break;
        }
    }, [user, loading, navigate]);
};

/**
 * Get the default dashboard path for a user's role
 */
export const getDefaultDashboard = (role: 'user' | 'recruiter' | 'admin'): string => {
    switch (role) {
        case 'admin':
            return '/admin';
        case 'recruiter':
            return '/recruiter';
        default:
            return '/dashboard';
    }
};
