import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
    console.warn('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder'
);
