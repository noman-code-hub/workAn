import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import type { User, UserRole } from '../types';
import * as userService from '../services/userService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    register: (email: string, password: string, name: string, role?: string) => Promise<void>;
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

    // Listen to Firebase auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userProfile = await userService.fetchOrCreateUserProfile(firebaseUser);
                    setUser(userProfile);
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Email/Password Login
    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
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
            await signInWithPopup(auth, googleProvider);
            // User state will be updated by onAuthStateChanged listener
        } catch (error: unknown) {
            setLoading(false);
            const err = error as any;
            console.error('Google sign-in error:', err);
            throw new Error(err.message || 'Google sign-in failed');
        }
    };

    // Register with Email/Password
    const register = async (email: string, password: string, name: string, role: string = 'user') => {
        setLoading(true);
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Create user profile in Firestore via service
            const newUser = await userService.createUserProfile(result.user.uid, {
                email: result.user.email || email,
                name: name,
                role: role as UserRole // explicit role assignment
            });

            // Update local state immediately
            setUser(newUser);
        } catch (error: unknown) {
            setLoading(false);
            const err = error as any;
            throw new Error(err.message || 'Registration failed');
        }
    };

    // Logout
    const logout = async () => {
        try {
            await signOut(auth);
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
        register,
        logout,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
