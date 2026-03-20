import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import * as userService from '../services/userService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    loginWithGithub: () => Promise<void>;
    register: (email: string, password: string, name: string, role?: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const getAppUrl = () => {
        const envUrl = (import.meta.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');
        if (envUrl) return envUrl;
        return window.location.origin.replace(/\/+$/, '');
    };

    const syncUser = async (supabaseUser: SupabaseUser | null, isMounted: () => boolean) => {
        if (!supabaseUser) {
            userService.clearLocalUserProfile();
            if (isMounted()) {
                setUser(null);
                setLoading(false);
            }
            return;
        }

        try {
            const userProfile = await userService.fetchOrCreateUserProfile(supabaseUser);
            if (isMounted()) setUser(userProfile);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            if (isMounted()) setUser(null);
        } finally {
            if (isMounted()) setLoading(false);
        }
    };

    // Listen to Supabase auth state changes
    useEffect(() => {
        let mounted = true;
        let unsubscribe: (() => void) | undefined;

        const isMounted = () => mounted;

        const initAuth = async () => {
            if (!isSupabaseConfigured || !supabase) {
                console.warn('Supabase auth is not configured.');
                if (isMounted()) setLoading(false);
                return;
            }

            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Failed to get Supabase session:', error);
            }

            if (!isMounted()) return;
            await syncUser(data?.session?.user ?? null, isMounted);

            const { data: subscriptionData } = supabase.auth.onAuthStateChange((event, session) => {
                if (!isMounted()) return;

                if (event === 'SIGNED_OUT') {
                    userService.clearLocalUserProfile();
                    setUser(null);
                    setLoading(false);
                    return;
                }

                setLoading(true);
                window.setTimeout(() => {
                    void syncUser(session?.user ?? null, isMounted);
                }, 0);
            });

            unsubscribe = subscriptionData?.subscription?.unsubscribe;
        };

        void initAuth();

        return () => {
            mounted = false;
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const requireSupabase = () => {
        if (!isSupabaseConfigured || !supabase) {
            throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        }
        return supabase;
    };

    const normalizeRole = (role?: string): UserRole | undefined => {
        if (role === 'admin' || role === 'recruiter' || role === 'user') return role;
        return undefined;
    };

    // Email/Password Login
    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const client = requireSupabase();
            const { error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (error: unknown) {
            setLoading(false);
            const err = error as any;
            throw new Error(err.message || 'Login failed');
        }
    };

    // Google Sign-In
    const loginWithGoogle = async () => {
        setLoading(true);
        try {
            const client = requireSupabase();
            const { error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${getAppUrl()}/login`,
                },
            });
            if (error) throw error;
        } catch (error: unknown) {
            setLoading(false);
            const err = error as any;
            console.error('Google sign-in error:', err);
            throw new Error(err.message || 'Google sign-in failed');
        }
    };

    // GitHub Sign-In
    const loginWithGithub = async () => {
        setLoading(true);
        try {
            const client = requireSupabase();
            const { error } = await client.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${getAppUrl()}/login`,
                },
            });
            if (error) throw error;
        } catch (error: unknown) {
            setLoading(false);
            const err = error as any;
            console.error('GitHub sign-in error:', err);
            throw new Error(err.message || 'GitHub sign-in failed');
        }
    };

    // Register with Email/Password
    const register = async (email: string, password: string, name: string, role: string = 'user') => {
        setLoading(true);
        try {
            const client = requireSupabase();
            const normalizedRole = normalizeRole(role);
            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        role: normalizedRole || 'user',
                    },
                },
            });

            if (error) throw error;

            // If email confirmation is required, no session will be created.
            if (!data.session) {
                setLoading(false);
            }
        } catch (error: unknown) {
            setLoading(false);
            const err = error as any;
            throw new Error(err.message || 'Registration failed');
        }
    };

    // Password reset
    const resetPassword = async (email: string) => {
        setLoading(true);
        try {
            const client = requireSupabase();
            const { error } = await client.auth.resetPasswordForEmail(email, {
                redirectTo: `${getAppUrl()}/reset-password`,
            });
            if (error) throw error;
            setLoading(false);
        } catch (error: unknown) {
            setLoading(false);
            const err = error as any;
            throw new Error(err.message || 'Password reset failed');
        }
    };

    // Logout
    const logout = async () => {
        try {
            const client = requireSupabase();
            const { error } = await client.auth.signOut();
            if (error) throw error;
        } catch (error: unknown) {
            const err = error as any;
            throw new Error(err.message || 'Logout failed');
        }
    };

    // Update User Profile
    const updateProfile = async (updates: Partial<User>) => {
        if (!user) return;

        try {
            await userService.updateUserProfile(user.id, updates);
            // Update local state
            setUser({ ...user, ...updates, updatedAt: new Date() });
        } catch (error) {
            console.error('Error updating profile:', error);
            throw new Error('Failed to update profile');
        }
    };

    const value = {
        user,
        loading,
        login,
        loginWithGoogle,
        loginWithGithub,
        register,
        resetPassword,
        logout,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
