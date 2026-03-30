import { apiUrl, API_BASE, parseApiJson } from '../config/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const getSupabaseClient = () => {
    if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase storage is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    return supabase;
};

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
};

const resolveContentType = (file: File, fileExt?: string) => {
    if (file.type) return file.type;
    if (fileExt) {
        const normalizedExt = fileExt.toLowerCase();
        if (MIME_TYPE_BY_EXTENSION[normalizedExt]) {
            return MIME_TYPE_BY_EXTENSION[normalizedExt];
        }
    }
    return 'application/octet-stream';
};

const canUseLocalResumeFallback = () => {
    try {
        const resolved = new URL(API_BASE);
        return resolved.hostname === 'localhost' || resolved.hostname === '127.0.0.1';
    } catch {
        return false;
    }
};

const uploadResumeViaApi = async (userId: string, file: File): Promise<{ publicUrl: string }> => {
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('userId', userId);

    const response = await fetch(apiUrl('/store-resume'), {
        method: 'POST',
        body: formData,
    });

    return parseApiJson<{ publicUrl: string }>(response);
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
            contentType: resolveContentType(file, fileExt),
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
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: resolveContentType(file, fileExt),
        });

    if (uploadError) {
        if (canUseLocalResumeFallback()) {
            console.warn('Supabase resume upload failed, falling back to local Node storage.', uploadError);
            return uploadResumeViaApi(userId, file);
        }
        throw uploadError;
    }

    const { data } = supabaseClient.storage
        .from('resumes')
        .getPublicUrl(fileName);

    return { publicUrl: data.publicUrl };
};
