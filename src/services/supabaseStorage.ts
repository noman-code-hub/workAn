import { supabase, isSupabaseConfigured } from '../lib/supabase';

const getSupabaseClient = () => {
    if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase storage is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    return supabase;
};

/**
 * Uploads a profile image (avatar, banner, or post media) to Supabase Storage.
 */
export const uploadImage = async (
    userId: string,
    file: File,
    bucket: 'avatars' | 'banners' | 'post'
): Promise<{ publicUrl: string }> => {
    const supabaseClient = getSupabaseClient();

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
        .from(bucket)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(fileName);

    return { publicUrl: data.publicUrl };
};

/**
 * Uploads a resume to Supabase Storage.
 */
export const uploadResume = async (userId: string, file: File): Promise<{ publicUrl: string }> => {
    const supabaseClient = getSupabaseClient();

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_resume.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
        .from('resumes')
        .upload(fileName, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabaseClient.storage
        .from('resumes')
        .getPublicUrl(fileName);

    return { publicUrl: data.publicUrl };
};
