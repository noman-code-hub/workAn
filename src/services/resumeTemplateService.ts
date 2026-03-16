import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
    ResumeTemplateDefinition,
    ResumeTemplateRecord,
    ResumeTemplateRow,
    ResumeTemplateUpsert,
} from '../types/resumeTemplate';

const TABLE_NAME = 'resume_template_definitions';

const getSupabaseClient = () => {
    if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    return supabase;
};

const mapTemplateRow = (row: ResumeTemplateRow): ResumeTemplateRecord => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    thumbnailUrl: row.thumbnail_url,
    isActive: row.is_active,
    definition: row.definition as ResumeTemplateDefinition,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

export const listResumeTemplateDefinitions = async (options?: { activeOnly?: boolean }) => {
    const supabaseClient = getSupabaseClient();
    const activeOnly = options?.activeOnly ?? true;

    let query = supabaseClient.from(TABLE_NAME).select('*').order('created_at', { ascending: false });
    if (activeOnly) {
        query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => mapTemplateRow(row as ResumeTemplateRow));
};

export const getResumeTemplateDefinitionBySlug = async (slug: string) => {
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient
        .from(TABLE_NAME)
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapTemplateRow(data as ResumeTemplateRow);
};

export const upsertResumeTemplateDefinition = async (payload: ResumeTemplateUpsert) => {
    const supabaseClient = getSupabaseClient();

    const { data, error } = await supabaseClient
        .from(TABLE_NAME)
        .upsert(
            {
                id: payload.id,
                slug: payload.slug,
                name: payload.name,
                description: payload.description ?? null,
                category: payload.category ?? null,
                thumbnail_url: payload.thumbnailUrl ?? null,
                is_active: payload.isActive ?? true,
                definition: payload.definition,
                created_by: payload.createdBy ?? null,
            },
            { onConflict: 'slug' }
        )
        .select('*')
        .single();

    if (error) throw error;
    return mapTemplateRow(data as ResumeTemplateRow);
};

export const deleteResumeTemplateDefinition = async (id: string) => {
    const supabaseClient = getSupabaseClient();
    const { error } = await supabaseClient.from(TABLE_NAME).delete().eq('id', id);
    if (error) throw error;
};
