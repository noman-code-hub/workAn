import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    fetchSignInMethodsForEmail,
    linkWithCredential,
    GithubAuthProvider,
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../config/firebase';
import type { User, UserRole } from '../types';
import * as userService from '../services/userService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    loginWithGithub: () => Promise<void>;
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

    // GitHub Sign-In
    const loginWithGithub = async () => {
        setLoading(true);
        try {
            await signInWithPopup(auth, githubProvider);
            // User state will be updated by onAuthStateChanged listener
        } catch (error: unknown) {
            const err = error as any;
            if (err?.code === 'auth/account-exists-with-different-credential') {
                const email = err?.customData?.email as string | undefined;
                const pendingCred = GithubAuthProvider.credentialFromError(err);

                if (!email) {
                    setLoading(false);
                    throw new Error(
                        'Your GitHub account did not return an email. Please add a public email in GitHub or sign in with the method you used before.'
                    );
                }

                let methods: string[] = [];
                try {
                    methods = await fetchSignInMethodsForEmail(auth, email);
                } catch (lookupError: any) {
                    setLoading(false);
                    console.error('GitHub sign-in provider lookup error:', lookupError);
                    throw new Error('GitHub sign-in failed. Please try again.');
                }

                if (methods.includes('google.com')) {
                    const result = await signInWithPopup(auth, googleProvider);
                    if (pendingCred) {
                        await linkWithCredential(result.user, pendingCred);
                    }
                    return;
                }

                setLoading(false);

                if (methods.includes('password')) {
                    throw new Error(
                        'An account already exists with this email using password. Please sign in with email/password, then link GitHub in Settings.'
                    );
                }

                if (methods.length === 0) {
                    throw new Error(
                        'An account already exists with this email, but no sign-in method was returned. Please sign in with the method you used before (Google or Email/Password), then link GitHub in Settings.'
                    );
                }

                throw new Error(
                    `An account already exists with a different sign-in method (${methods.join(', ')}). Please use that method first, then link GitHub in Settings.`
                );
            }

            setLoading(false);
            console.error('GitHub sign-in error:', err);
            throw new Error(err.message || 'GitHub sign-in failed');
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
        loginWithGithub,
        register,
        logout,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
