import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadResume, uploadImage } from './supabaseStorage';
import type { User, UserRole } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';

const LOCAL_STORAGE_KEY = 'hirevo_user_profile';

const AVATAR_COLORS = ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

const getInitial = (name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'U';
    return trimmed.charAt(0).toUpperCase();
};

const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

const buildDefaultAvatar = (name: string) => {
    const initial = getInitial(name);
    const color = AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
            <rect width="128" height="128" rx="64" fill="${color}" />
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
                font-family="Arial, sans-serif" font-size="64" font-weight="600" fill="#ffffff">
                ${initial}
            </text>
        </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const resolvePhotoURL = (name: string, photoURL?: string | null) => {
    if (photoURL && photoURL.trim()) return photoURL;
    return buildDefaultAvatar(name);
};

const isGithubProvider = (firebaseUser: FirebaseUser) =>
    firebaseUser.providerData?.some((provider) => provider.providerId === 'github.com');

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
    const isGithubLogin = isGithubProvider(firebaseUser);
    const fallbackRole: UserRole | undefined = isGithubLogin ? 'user' : undefined;

    try {
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            // User profile exists, return it
            const data = userDoc.data();
            const localData = getFromLocal();
            const resolvedName = data.name || firebaseUser.displayName || 'User';
            const storedPhotoURL = data.photoURL || firebaseUser.photoURL || undefined;

            const profile: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: resolvedName,
                role: data.role || fallbackRole, // Undefined if not set (redirect to selection)
                photoURL: resolvePhotoURL(resolvedName, storedPhotoURL),
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

            if (!profile.role && fallbackRole) {
                profile.role = fallbackRole;
            }

            const hadStoredPhoto = Boolean(storedPhotoURL);
            const localPhoto = localData?.photoURL;
            const needsDefaultPhoto = !profile.photoURL;
            if (needsDefaultPhoto) {
                profile.photoURL = buildDefaultAvatar(profile.name);
            }

            saveToLocal(profile);

            if (!data.role && fallbackRole) {
                void updateUserProfile(profile.id, { role: fallbackRole });
            }

            if (!hadStoredPhoto && !localPhoto && needsDefaultPhoto) {
                void updateUserProfile(profile.id, { photoURL: profile.photoURL });
            }

            return profile;
        } else {
            // User doesn't exist - create new user profile in Firestore
            console.log('📝 Creating new user profile in Firestore for:', firebaseUser.uid);
            const resolvedName = firebaseUser.displayName || 'User';

            const newUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: resolvedName,
                role: fallbackRole, // Default role for GitHub users
                photoURL: resolvePhotoURL(resolvedName, firebaseUser.photoURL),
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
        const resolvedName = firebaseUser.displayName || 'User';
        const transientUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: resolvedName,
            role: 'user', // Default role for transient users
            photoURL: resolvePhotoURL(resolvedName, firebaseUser.photoURL),
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
        photoURL: resolvePhotoURL(data.name, undefined),
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
            photoURL: newUser.photoURL || null,
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
