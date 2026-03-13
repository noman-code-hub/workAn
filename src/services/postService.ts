import type { User, BlogPost } from '../types';
import { uploadImage } from './supabaseStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const BLOGS_TABLE = 'blogs';
const POSTS_TABLE = 'posts';

const getSupabaseClient = () => {
    if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured.');
    }
    return supabase;
};

type BlogRow = {
    id: string;
    user_id: string | null;
    author_name: string | null;
    author_avatar: string | null;
    title: string | null;
    content: string | null;
    image_url: string | null;
    likes: number | null;
    comments_count: number | null;
    type: string | null;
    created_at: string;
    updated_at: string | null;
};

type PostRow = {
    id: string;
    author_id: string | null;
    author_name: string | null;
    author_photo: string | null;
    content: string | null;
    image_url: string | null;
    likes: number | null;
    comments_count: number | null;
    created_at: string;
    updated_at: string | null;
};

const normalizeBlogRow = (row: BlogRow): BlogPost => ({
    id: row.id,
    userId: row.user_id || '',
    authorName: row.author_name || 'Unknown User',
    authorAvatar: row.author_avatar || '',
    title: row.title || '',
    content: row.content || '',
    imageURL: row.image_url || '',
    likes: row.likes || 0,
    commentsCount: row.comments_count || 0,
    type: row.type === 'blog' ? 'blog' : 'community',
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : row.created_at ? new Date(row.created_at) : new Date(),
});

const normalizePostRow = (row: PostRow): BlogPost => ({
    id: row.id,
    userId: row.author_id || '',
    authorName: row.author_name || 'Unknown User',
    authorAvatar: row.author_photo || '',
    title: '',
    content: row.content || '',
    imageURL: row.image_url || '',
    likes: row.likes || 0,
    commentsCount: row.comments_count || 0,
    type: 'community',
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : row.created_at ? new Date(row.created_at) : new Date(),
});

const matchesType = (post: BlogPost, type?: 'blog' | 'community'): boolean => {
    if (!type) return true;
    if (type === 'blog') return post.type === 'blog';
    return post.type !== 'blog';
};

export const createPost = async (
    user: User,
    title: string,
    content: string,
    imageFile?: File,
    type: 'blog' | 'community' = 'community'
): Promise<BlogPost> => {
    const client = getSupabaseClient();
    let imageURL = '';

    if (imageFile) {
        const result = await uploadImage(user.id, imageFile, 'post');
        imageURL = result.publicUrl;
    }

    const payload = {
        user_id: user.id,
        author_name: user.name,
        author_avatar: user.photoURL || '',
        title,
        content,
        image_url: imageURL,
        likes: 0,
        comments_count: 0,
        type,
    };

    const { data, error } = await client.from(BLOGS_TABLE).insert(payload).select('*').single<BlogRow>();
    if (error || !data) {
        throw error || new Error('Failed to create post');
    }

    return normalizeBlogRow(data);
};

export const getUserPosts = async (userId: string, type?: 'blog' | 'community'): Promise<BlogPost[]> => {
    try {
        const client = getSupabaseClient();
        const [blogsResult, legacyResult] = await Promise.allSettled([
            client.from(BLOGS_TABLE).select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            client.from(POSTS_TABLE).select('*').eq('author_id', userId).order('created_at', { ascending: false }),
        ]);

        const posts = [
            ...(blogsResult.status === 'fulfilled' && !blogsResult.value.error
                ? blogsResult.value.data.map((row) => normalizeBlogRow(row as BlogRow))
                : []),
            ...(legacyResult.status === 'fulfilled' && !legacyResult.value.error
                ? legacyResult.value.data.map((row) => normalizePostRow(row as PostRow))
                : []),
        ].filter((post) => matchesType(post, type));

        return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
};

export const getAllPosts = async (type?: 'blog' | 'community'): Promise<BlogPost[]> => {
    try {
        const client = getSupabaseClient();
        const [blogsResult, legacyResult] = await Promise.allSettled([
            client.from(BLOGS_TABLE).select('*').order('created_at', { ascending: false }),
            client.from(POSTS_TABLE).select('*').order('created_at', { ascending: false }),
        ]);

        const posts = [
            ...(blogsResult.status === 'fulfilled' && !blogsResult.value.error
                ? blogsResult.value.data.map((row) => normalizeBlogRow(row as BlogRow))
                : []),
            ...(legacyResult.status === 'fulfilled' && !legacyResult.value.error
                ? legacyResult.value.data.map((row) => normalizePostRow(row as PostRow))
                : []),
        ].filter((post) => matchesType(post, type));

        return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error('Error fetching all posts:', error);
        return [];
    }
};

export const deletePost = async (postId: string): Promise<void> => {
    const client = getSupabaseClient();
    await Promise.allSettled([
        client.from(BLOGS_TABLE).delete().eq('id', postId),
        client.from(POSTS_TABLE).delete().eq('id', postId),
    ]);
};

export const updatePost = async (
    postId: string,
    updates: Partial<Pick<BlogPost, 'title' | 'content' | 'imageURL' | 'type'>>
): Promise<void> => {
    const client = getSupabaseClient();
    const payload: Record<string, unknown> = {};

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.imageURL !== undefined) payload.image_url = updates.imageURL;
    if (updates.type !== undefined) payload.type = updates.type;

    await Promise.allSettled([
        client.from(BLOGS_TABLE).update(payload).eq('id', postId),
        client.from(POSTS_TABLE).update(payload).eq('id', postId),
    ]);
};

export const subscribeToPosts = async (
    options: { userId?: string; type?: 'blog' | 'community' },
    onChange: (posts: BlogPost[]) => void,
    onError?: (error: Error) => void
): Promise<() => void> => {
    if (!isSupabaseConfigured || !supabase) {
        onChange([]);
        return () => {};
    }

    const client = supabase;

    const fetchPosts = async () => {
        try {
            const posts = await getAllPosts(options.type);
            const filtered = options.userId ? posts.filter((post) => post.userId === options.userId) : posts;
            onChange(filtered);
        } catch (error) {
            if (onError) onError(error as Error);
        }
    };

    await fetchPosts();

    const channel = client
        .channel('posts-feed')
        .on('postgres_changes', { event: '*', schema: 'public', table: BLOGS_TABLE }, fetchPosts)
        .on('postgres_changes', { event: '*', schema: 'public', table: POSTS_TABLE }, fetchPosts)
        .subscribe();

    return () => {
        void client.removeChannel(channel);
    };
};
