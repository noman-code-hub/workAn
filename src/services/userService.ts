import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadResume, uploadImage } from './supabaseStorage';
import type { User, UserRole } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';

const LOCAL_STORAGE_KEY = 'hirevo_user_profile';

const saveToLocal = (user: User) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
};

const getFromLocal = (): Partial<User> | null => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
};

/**
 * Fetches an existing user profile from Firestore or creates a new one
 * based on the Firebase Auth user data.
 */
export const fetchOrCreateUserProfile = async (firebaseUser: FirebaseUser): Promise<User> => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);

    try {
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            // User profile exists, return it
            const data = userDoc.data();
            const localData = getFromLocal();

            const profile: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: data.name || firebaseUser.displayName || 'User',
                role: data.role || undefined, // Undefined if not set (redirect to selection)
                photoURL: data.photoURL || firebaseUser.photoURL || undefined,
                bannerURL: data.bannerURL || undefined,
                country: data.country,
                profession: data.profession,
                skills: data.skills || [],
                resumeURL: data.resumeURL,
                interviewReadinessScore: data.interviewReadinessScore,
                subscription: data.subscription || 'free',
                credits: data.credits || 10,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                about: data.about || undefined,
                analytics: data.analytics || undefined,
            };

            // Merge with local data if it's for the same user
            if (localData && localData.id === profile.id) {
                Object.assign(profile, localData);
            }

            saveToLocal(profile);
            return profile;
        } else {
            // User doesn't exist - create new user profile in Firestore
            console.log('📝 Creating new user profile in Firestore for:', firebaseUser.uid);

            const newUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'User',
                role: undefined, // No default role for new users (redirect to selection)
                photoURL: firebaseUser.photoURL || undefined,
                bannerURL: undefined,
                country: undefined,
                profession: undefined,
                skills: [],
                resumeURL: undefined,
                interviewReadinessScore: undefined,
                subscription: 'free',
                credits: 10,
                createdAt: new Date(),
                updatedAt: new Date(),
                analytics: undefined,
            };

            // Check local data
            const localData = getFromLocal();
            if (localData && localData.id === newUser.id) {
                Object.assign(newUser, localData);
            }

            // ✅ SAVE TO FIRESTORE
            try {
                await setDoc(userDocRef, {
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.role || null,
                    photoURL: newUser.photoURL || null,
                    bannerURL: newUser.bannerURL || null,
                    country: newUser.country || null,
                    profession: newUser.profession || null,
                    skills: newUser.skills,
                    resumeURL: newUser.resumeURL || null,
                    interviewReadinessScore: newUser.interviewReadinessScore || null,
                    subscription: newUser.subscription,
                    credits: newUser.credits,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    analytics: null,
                });
                console.log('✅ New user profile created in Firestore successfully!');
            } catch (firestoreError) {
                console.error('❌ Failed to create user in Firestore:', firestoreError);
            }

            saveToLocal(newUser);
            return newUser;
        }
    } catch (error) {
        console.warn('Error accessing Firestore. Falling back to LocalStorage/Auth data.', error);

        const localData = getFromLocal();
        const transientUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role: 'user', // Default role for transient users
            photoURL: firebaseUser.photoURL || undefined,
            bannerURL: undefined,
            country: undefined,
            profession: undefined,
            skills: [],
            resumeURL: undefined,
            interviewReadinessScore: undefined,
            subscription: 'free',
            credits: 10,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        if (localData && localData.id === transientUser.id) {
            Object.assign(transientUser, localData);
        }

        saveToLocal(transientUser);
        return transientUser;
    }
};

/**
 * Updates a user's profile in Firestore
 */
export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
    const userDocRef = doc(db, 'users', userId);
    const firestoreUpdates: any = { ...updates };

    Object.keys(firestoreUpdates).forEach(key => {
        if (firestoreUpdates[key] === undefined) {
            delete firestoreUpdates[key];
        }
    });

    firestoreUpdates.updatedAt = serverTimestamp();

    try {
        await setDoc(userDocRef, firestoreUpdates, { merge: true });
    } catch (e) {
        console.warn("Firestore update failed, but local state will persist.", e);
    }

    const currentLocal = getFromLocal();
    if (currentLocal && currentLocal.id === userId) {
        saveToLocal({ ...currentLocal, ...updates } as User);
    } else {
        // @ts-ignore
        saveToLocal({ id: userId, ...updates } as User);
    }
};

/**
 * Creates a new user profile with specific initial data
 */
export const createUserProfile = async (userId: string, data: { email: string; name: string; role?: UserRole }) => {
    const userDocRef = doc(db, 'users', userId);

    const newUser: User = {
        id: userId,
        email: data.email,
        name: data.name,
        role: data.role, // Role provided or undefined
        photoURL: undefined,
        country: undefined,
        profession: undefined,
        skills: [],
        resumeURL: undefined,
        interviewReadinessScore: undefined,
        subscription: 'free',
        credits: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        analytics: undefined,
    };

    try {
        await setDoc(userDocRef, {
            email: newUser.email,
            name: newUser.name,
            role: newUser.role || null,
            photoURL: null,
            bannerURL: null,
            country: null,
            profession: null,
            skills: [],
            resumeURL: null,
            interviewReadinessScore: null,
            subscription: 'free',
            credits: 10,
            about: null,
            analytics: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating user profile in Firestore:", error);
    }

    saveToLocal(newUser);
    return newUser;
};

/**
 * Uploads a file to Supabase Storage and updates Firestore
 * Handles: 'avatars', 'banners', 'resumes'
 */
export const uploadFile = async (userId: string, file: File, path: 'avatars' | 'banners' | 'resumes'): Promise<string> => {
    try {
        console.log(`📤 Uploading ${path} to Supabase Storage...`);
        let result;

        if (path === 'resumes') {
            result = await uploadResume(userId, file);
            await updateUserProfile(userId, { resumeURL: result.publicUrl });
        } else {
            // Avatars and Banners
            result = await uploadImage(userId, file, path);

            // Update the specific field based on path
            const updates: Partial<User> = {};
            if (path === 'avatars') updates.photoURL = result.publicUrl;
            if (path === 'banners') updates.bannerURL = result.publicUrl;

            await updateUserProfile(userId, updates);
        }

        console.log(`✅ ${path} uploaded and URL saved to Firestore`);
        return result.publicUrl;

    } catch (error: any) {
        console.error(`❌ ${path} upload to Supabase failed:`, error);

        // Fallback to Base64 (only for images) if upload fails
        if (path !== 'resumes') {
            console.warn('Falling back to Base64 for local display');
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(file);
            });
        }

        throw new Error(`Failed to upload ${path}: ${error.message}`);
    }
};
