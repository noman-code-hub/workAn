import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadImage } from './supabaseStorage';
import type { User, BlogPost } from '../types';

const POSTS_COLLECTION = 'blogs';

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

    const docRef = await addDoc(collection(db, POSTS_COLLECTION), newPostData);

    return {
        id: docRef.id,
        ...newPostData,
    } as BlogPost;
};

export const getUserPosts = async (userId: string, type?: 'blog' | 'community'): Promise<BlogPost[]> => {
    try {
        const q = query(
            collection(db, POSTS_COLLECTION),
            where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                authorAvatar: data.authorAvatar || data.authorPhoto || '',
                imageURL: data.imageURL || data.imageUrl || '',
                type: data.type || 'community', // Fallback for old posts
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
            } as BlogPost;
        });

        // Client-side filtering to support legacy posts without the 'type' field
        const filteredPosts = type
            ? posts.filter(p => p.type === type)
            : posts;

        return filteredPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
    }
};

export const getAllPosts = async (type?: 'blog' | 'community'): Promise<BlogPost[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, POSTS_COLLECTION));
        const posts = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                authorAvatar: data.authorAvatar || data.authorPhoto || '',
                imageURL: data.imageURL || data.imageUrl || '',
                type: data.type || 'community', // Fallback for old posts
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
            } as BlogPost;
        });

        // Client-side filtering to support legacy posts without the 'type' field
        const filteredPosts = type
            ? posts.filter(p => p.type === type)
            : posts;

        return filteredPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error("Error fetching all posts:", error);
        return [];
    }
};

export const deletePost = async (postId: string): Promise<void> => {
    await deleteDoc(doc(db, POSTS_COLLECTION, postId));
};
