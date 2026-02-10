import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
    console.error('❌ Supabase configuration missing! Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

/**
 * Uploads a profile image (avatar or banner) to Supabase Storage
 */
export const uploadImage = async (userId: string, file: File, bucket: 'avatars' | 'banners' | 'post'): Promise<{ publicUrl: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

    return { publicUrl: data.publicUrl };
};

/**
 * Uploads a resume to Supabase Storage
 */
export const uploadResume = async (userId: string, file: File): Promise<{ publicUrl: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_resume.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

    return { publicUrl: data.publicUrl };
};
