import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'your_supabase_anon_key_here'
);

if (!isSupabaseConfigured) {
    console.warn('Supabase storage is disabled: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);

const requireSupabaseConfig = () => {
    if (!isSupabaseConfigured) {
        throw new Error('Supabase storage is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
};

/**
 * Uploads a profile image (avatar, banner, or post media) to Supabase Storage.
 */
export const uploadImage = async (
    userId: string,
    file: File,
    bucket: 'avatars' | 'banners' | 'post'
): Promise<{ publicUrl: string }> => {
    requireSupabaseConfig();

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

    return { publicUrl: data.publicUrl };
};

/**
 * Uploads a resume to Supabase Storage.
 */
export const uploadResume = async (userId: string, file: File): Promise<{ publicUrl: string }> => {
    requireSupabaseConfig();

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_resume.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

    return { publicUrl: data.publicUrl };
};
