import { collection, addDoc, query, where, getDocs, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadImage } from './supabaseStorage';
import type { User, BlogPost } from '../types';

const BLOGS_COLLECTION = 'blogs';
const LEGACY_POSTS_COLLECTION = 'posts';

const toDate = (value: unknown): Date => {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date;
        }
    }

    return new Date();
};

const normalizePost = (id: string, data: Record<string, unknown>): BlogPost => {
    const type = data.type === 'blog' ? 'blog' : 'community';

    return {
        id,
        userId: (typeof data.userId === 'string' && data.userId) || (typeof data.authorId === 'string' ? data.authorId : ''),
        authorName: (typeof data.authorName === 'string' && data.authorName) ? data.authorName : 'Unknown User',
        authorAvatar: (typeof data.authorAvatar === 'string' && data.authorAvatar) || (typeof data.authorPhoto === 'string' ? data.authorPhoto : ''),
        title: typeof data.title === 'string' ? data.title : '',
        content: typeof data.content === 'string' ? data.content : '',
        imageURL: (typeof data.imageURL === 'string' && data.imageURL) || (typeof data.imageUrl === 'string' ? data.imageUrl : ''),
        likes: typeof data.likes === 'number' ? data.likes : 0,
        commentsCount: typeof data.commentsCount === 'number' ? data.commentsCount : 0,
        type,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt ?? data.createdAt),
    };
};

const matchesType = (post: BlogPost, type?: 'blog' | 'community'): boolean => {
    if (!type) return true;
    if (type === 'blog') return post.type === 'blog';
    return post.type !== 'blog';
};

export const createPost = async (user: User, title: string, content: string, imageFile?: File, type: 'blog' | 'community' = 'community'): Promise<BlogPost> => {
    let imageURL = '';

    if (imageFile) {
        const result = await uploadImage(user.id, imageFile, 'post');
        imageURL = result.publicUrl;
    }

    const now = new Date();
    const newPostData = {
        userId: user.id,
        authorName: user.name,
        authorAvatar: user.photoURL || '',
        title: title,
        content: content,
        imageURL: imageURL,
        likes: 0,
        commentsCount: 0,
        type: type,
        createdAt: now,
        updatedAt: now,
    };

    const docRef = await addDoc(collection(db, BLOGS_COLLECTION), newPostData);

    return {
        id: docRef.id,
        ...newPostData,
    } as BlogPost;
};

export const getUserPosts = async (userId: string, type?: 'blog' | 'community'): Promise<BlogPost[]> => {
    try {
        const blogsQuery = query(collection(db, BLOGS_COLLECTION), where('userId', '==', userId));
        const legacyQuery = query(collection(db, LEGACY_POSTS_COLLECTION), where('authorId', '==', userId));
        const [blogsResult, legacyResult] = await Promise.allSettled([getDocs(blogsQuery), getDocs(legacyQuery)]);

        const posts = [
            ...(blogsResult.status === 'fulfilled'
                ? blogsResult.value.docs.map((snapshotDoc) => normalizePost(snapshotDoc.id, snapshotDoc.data() as Record<string, unknown>))
                : []),
            ...(legacyResult.status === 'fulfilled'
                ? legacyResult.value.docs.map((snapshotDoc) => normalizePost(snapshotDoc.id, snapshotDoc.data() as Record<string, unknown>))
                : []),
        ]
            .filter((post) => matchesType(post, type));

        return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
    }
};

export const getAllPosts = async (type?: 'blog' | 'community'): Promise<BlogPost[]> => {
    try {
        const [blogsResult, legacyResult] = await Promise.allSettled([
            getDocs(query(collection(db, BLOGS_COLLECTION))),
            getDocs(query(collection(db, LEGACY_POSTS_COLLECTION))),
        ]);

        const posts = [
            ...(blogsResult.status === 'fulfilled'
                ? blogsResult.value.docs.map((snapshotDoc) => normalizePost(snapshotDoc.id, snapshotDoc.data() as Record<string, unknown>))
                : []),
            ...(legacyResult.status === 'fulfilled'
                ? legacyResult.value.docs.map((snapshotDoc) => normalizePost(snapshotDoc.id, snapshotDoc.data() as Record<string, unknown>))
                : []),
        ]
            .filter((post) => matchesType(post, type));

        return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === 'permission-denied') {
            return [];
        }
        console.error("Error fetching all posts:", error);
        return [];
    }
};

export const deletePost = async (postId: string): Promise<void> => {
    await Promise.allSettled([
        deleteDoc(doc(db, BLOGS_COLLECTION, postId)),
        deleteDoc(doc(db, LEGACY_POSTS_COLLECTION, postId)),
    ]);
};

export const updatePost = async (
    postId: string,
    updates: Partial<Pick<BlogPost, 'title' | 'content' | 'imageURL' | 'type'>>
): Promise<void> => {
    const payload = {
        ...updates,
        updatedAt: new Date(),
    };

    await Promise.allSettled([
        updateDoc(doc(db, BLOGS_COLLECTION, postId), payload),
        updateDoc(doc(db, LEGACY_POSTS_COLLECTION, postId), payload),
    ]);
};

export const subscribeToPosts = (
    options: { userId?: string; type?: 'blog' | 'community' },
    onChange: (posts: BlogPost[]) => void,
    onError?: (error: Error) => void
): (() => void) => {
    let blogPosts: BlogPost[] = [];
    let legacyPosts: BlogPost[] = [];

    const emit = () => {
        const merged = [...blogPosts, ...legacyPosts]
            .filter((post) => matchesType(post, options.type))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        onChange(merged);
    };

    const blogsQuery = options.userId
        ? query(collection(db, BLOGS_COLLECTION), where('userId', '==', options.userId))
        : query(collection(db, BLOGS_COLLECTION));

    const legacyQuery = options.userId
        ? query(collection(db, LEGACY_POSTS_COLLECTION), where('authorId', '==', options.userId))
        : query(collection(db, LEGACY_POSTS_COLLECTION));

    const unsubscribeBlogs = onSnapshot(
        blogsQuery,
        (snapshot) => {
            blogPosts = snapshot.docs.map((snapshotDoc) => normalizePost(snapshotDoc.id, snapshotDoc.data() as Record<string, unknown>));
            emit();
        },
        (error) => {
            if (onError) onError(error as Error);
        }
    );

    const unsubscribeLegacy = onSnapshot(
        legacyQuery,
        (snapshot) => {
            legacyPosts = snapshot.docs.map((snapshotDoc) => normalizePost(snapshotDoc.id, snapshotDoc.data() as Record<string, unknown>));
            emit();
        },
        (error) => {
            if (onError) onError(error as Error);
        }
    );

    return () => {
        unsubscribeBlogs();
        unsubscribeLegacy();
    };
};
