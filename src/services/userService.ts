import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadResume, uploadImage } from './supabaseStorage';

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

const getSupabaseClient = () => {
    if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured.');
    }
    return supabase;
};

const saveToLocal = (user: User) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
};

const getFromLocal = (): Partial<User> | null => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
};

const isGithubProvider = (supabaseUser: SupabaseUser) =>
    supabaseUser.app_metadata?.provider === 'github' ||
    supabaseUser.identities?.some((provider) => provider.provider === 'github');

const getSupabaseProfileHints = (supabaseUser: SupabaseUser) => {
    const metadata = (supabaseUser.user_metadata || {}) as Record<string, any>;
    const rawName =
        (typeof metadata.full_name === 'string' && metadata.full_name) ||
        (typeof metadata.name === 'string' && metadata.name) ||
        (typeof metadata.user_name === 'string' && metadata.user_name) ||
        '';
    const name = rawName || supabaseUser.email?.split('@')[0] || 'User';
    const photoURL =
        (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
        (typeof metadata.picture === 'string' && metadata.picture) ||
        (typeof metadata.profile_image_url === 'string' && metadata.profile_image_url) ||
        undefined;
    const role = (metadata.role as UserRole | undefined) || undefined;
    return { name, photoURL, role };
};

type UserRow = {
    id: string;
    email: string;
    name: string;
    role: string | null;
    photo_url: string | null;
    banner_url: string | null;
    country: string | null;
    profession: string | null;
    skills: string[] | null;
    resume_url: string | null;
    interview_readiness_score: number | null;
    subscription: string | null;
    credits: number | null;
    about: string | null;
    analytics: Record<string, any> | null;
    created_at: string;
    updated_at: string;
};

const mapRowToUser = (row: UserRow): User => {
    const resolvedName = row.name || 'User';
    const resolvedPhoto = resolvePhotoURL(resolvedName, row.photo_url);
    return {
        id: row.id,
        email: row.email || '',
        name: resolvedName,
        role: (row.role as UserRole | null) || undefined,
        photoURL: resolvedPhoto,
        bannerURL: row.banner_url || undefined,
        country: row.country || undefined,
        profession: row.profession || undefined,
        skills: row.skills || [],
        resumeURL: row.resume_url || undefined,
        interviewReadinessScore: row.interview_readiness_score || undefined,
        subscription: (row.subscription as 'free' | 'premium') || 'free',
        credits: typeof row.credits === 'number' ? row.credits : 10,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        about: row.about || undefined,
        analytics: row.analytics || undefined,
    };
};

/**
 * Fetches an existing user profile from Supabase or creates a new one
 * based on the Supabase Auth user data.
 */
export const fetchOrCreateUserProfile = async (supabaseUser: SupabaseUser): Promise<User> => {
    const client = getSupabaseClient();
    const isGithubLogin = isGithubProvider(supabaseUser);
    const fallbackRole: UserRole | undefined = isGithubLogin ? 'user' : undefined;
    const { name: hintedName, photoURL: hintedPhotoURL, role: hintedRole } = getSupabaseProfileHints(supabaseUser);

    try {
        const { data, error } = await client
            .from('users')
            .select('*')
            .eq('id', supabaseUser.id)
            .maybeSingle<UserRow>();

        if (error) throw error;

        if (data) {
            const profile = mapRowToUser(data);
            const localData = getFromLocal();
            if (localData && localData.id === profile.id) {
                const { role, id, email, ...safeLocal } = localData;
                Object.assign(profile, safeLocal);
            }

            if (!profile.role && fallbackRole) {
                profile.role = fallbackRole;
            }

            if (!data.photo_url && !localData?.photoURL) {
                const defaultPhoto = buildDefaultAvatar(profile.name);
                profile.photoURL = defaultPhoto;
                void updateUserProfile(profile.id, { photoURL: defaultPhoto });
            }

            saveToLocal(profile);
            return profile;
        }

        const resolvedName = hintedName || 'User';
        const resolvedRole = hintedRole || fallbackRole;
        const newUser: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: resolvedName,
            role: resolvedRole,
            photoURL: resolvePhotoURL(resolvedName, hintedPhotoURL),
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

        const localData = getFromLocal();
        if (localData && localData.id === newUser.id) {
            const { role, id, email, ...safeLocal } = localData;
            Object.assign(newUser, safeLocal);
        }

        const insertPayload = {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role || null,
            photo_url: newUser.photoURL || null,
            banner_url: newUser.bannerURL || null,
            country: newUser.country || null,
            profession: newUser.profession || null,
            skills: newUser.skills,
            resume_url: newUser.resumeURL || null,
            interview_readiness_score: newUser.interviewReadinessScore || null,
            subscription: newUser.subscription,
            credits: newUser.credits,
            about: newUser.about || null,
            analytics: newUser.analytics || null,
        };

        const { error: insertError } = await client.from('users').insert(insertPayload);
        if (insertError) {
            console.error('Failed to create user profile in Supabase:', insertError);
        }

        saveToLocal(newUser);
        return newUser;
    } catch (error) {
        console.warn('Error accessing Supabase. Falling back to LocalStorage/Auth data.', error);

        const localData = getFromLocal();
        const resolvedName = hintedName || 'User';
        const transientUser: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: resolvedName,
            role: 'user',
            photoURL: resolvePhotoURL(resolvedName, hintedPhotoURL),
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
            const { role, id, email, ...safeLocal } = localData;
            Object.assign(transientUser, safeLocal);
        }

        saveToLocal(transientUser);
        return transientUser;
    }
};

/**
 * Updates a user's profile in Supabase
 */
export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
    const client = getSupabaseClient();
    const dbUpdates: Record<string, any> = {};

    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.photoURL !== undefined) dbUpdates.photo_url = updates.photoURL;
    if (updates.bannerURL !== undefined) dbUpdates.banner_url = updates.bannerURL;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    if (updates.profession !== undefined) dbUpdates.profession = updates.profession;
    if (updates.skills !== undefined) dbUpdates.skills = updates.skills;
    if (updates.resumeURL !== undefined) dbUpdates.resume_url = updates.resumeURL;
    if (updates.interviewReadinessScore !== undefined) dbUpdates.interview_readiness_score = updates.interviewReadinessScore;
    if (updates.subscription !== undefined) dbUpdates.subscription = updates.subscription;
    if (updates.credits !== undefined) dbUpdates.credits = updates.credits;
    if (updates.about !== undefined) dbUpdates.about = updates.about;
    if (updates.analytics !== undefined) dbUpdates.analytics = updates.analytics;

    if (Object.keys(dbUpdates).length > 0) {
        const { error } = await client.from('users').update(dbUpdates).eq('id', userId);
        if (error) {
            console.warn('Supabase update failed, but local state will persist.', error);
        }
    }

    const currentLocal = getFromLocal();
    if (currentLocal && currentLocal.id === userId) {
        saveToLocal({ ...currentLocal, ...updates } as User);
    } else {
        saveToLocal({ id: userId, ...updates } as User);
    }
};

/**
 * Creates a new user profile with specific initial data
 */
export const createUserProfile = async (userId: string, data: { email: string; name: string; role?: UserRole }) => {
    const client = getSupabaseClient();

    const newUser: User = {
        id: userId,
        email: data.email,
        name: data.name,
        role: data.role,
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

    const { error } = await client.from('users').insert({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role || null,
        photo_url: newUser.photoURL || null,
        banner_url: null,
        country: null,
        profession: null,
        skills: [],
        resume_url: null,
        interview_readiness_score: null,
        subscription: 'free',
        credits: 10,
        about: null,
        analytics: null,
    });

    if (error) {
        console.error('Error creating user profile in Supabase:', error);
    }

    saveToLocal(newUser);
    return newUser;
};

/**
 * Uploads a file to Supabase Storage and updates Supabase profile
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
            result = await uploadImage(userId, file, path);

            const updates: Partial<User> = {};
            if (path === 'avatars') updates.photoURL = result.publicUrl;
            if (path === 'banners') updates.bannerURL = result.publicUrl;

            await updateUserProfile(userId, updates);
        }

        console.log(`✅ ${path} uploaded and URL saved to Supabase`);
        return result.publicUrl;
    } catch (error: any) {
        console.error(`❌ ${path} upload to Supabase failed:`, error);

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
