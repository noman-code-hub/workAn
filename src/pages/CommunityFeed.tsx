import { useState, useEffect, useRef } from 'react';
import {
    collection,
    addDoc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    doc,
    query,
    orderBy,
    deleteDoc,
    where
} from 'firebase/firestore';
import { getDb } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { uploadImage } from '../services/supabaseStorage';
import {
    Heart,
    MessageCircle,
    Share2,
    Image as ImageIcon,
    Send,
    Trash2,
    X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    content: string;
    createdAt: any;
}

interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    content: string;
    imageUrl?: string;
    likes: number;
    likedBy: string[];
    commentsCount: number;
    createdAt: any;
}

export const CommunityFeed = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [content, setContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for managing expanded comments section per post
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let unsubscribe = () => {};

        const initPosts = async () => {
            try {
                const db = await getDb();
                if (!isMounted) return;
                const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Post[];
                    if (isMounted) setPosts(data);
                });
            } catch (error) {
                console.error("Error loading posts:", error);
            }
        };

        initPosts();
        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    // Load comments when a post is expanded
    useEffect(() => {
        if (!expandedPostId) {
            setComments([]);
            return;
        }

        let isMounted = true;
        let unsubscribe = () => {};

        const initComments = async () => {
            setLoadingComments(true);
            try {
                const db = await getDb();
                if (!isMounted) return;
                const q = query(
                    collection(db, 'comments'),
                    where('postId', '==', expandedPostId),
                    orderBy('createdAt', 'asc')
                );

                unsubscribe = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Comment[];
                    if (isMounted) {
                        setComments(data);
                        setLoadingComments(false);
                    }
                });
            } catch (error) {
                console.error("Error loading comments:", error);
                if (isMounted) setLoadingComments(false);
            }
        };

        initComments();

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [expandedPostId]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImage(e.target.files[0]);
        }
    };

    const handlePost = async () => {
        if ((!content.trim() && !selectedImage) || !user) return;

        setIsPosting(true);
        try {
            const db = await getDb();
            let imageUrl = '';
            if (selectedImage) {
                const result = await uploadImage(user.id, selectedImage, 'post');
                imageUrl = result.publicUrl;
            }

            await addDoc(collection(db, 'posts'), {
                authorId: user.id,
                authorName: user.name,
                authorPhoto: user.photoURL || '',
                content,
                imageUrl,
                likes: 0,
                likedBy: [],
                commentsCount: 0,
                createdAt: serverTimestamp(),
            });

            setContent('');
            setSelectedImage(null);
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Failed to post. Please try again.");
        } finally {
            setIsPosting(false);
        }
    };

    const handleLike = async (post: Post) => {
        if (!user) return;

        const db = await getDb();
        const postRef = doc(db, 'posts', post.id);
        const hasLiked = post.likedBy?.includes(user.id);

        try {
            await updateDoc(postRef, {
                likedBy: hasLiked
                    ? post.likedBy.filter(id => id !== user.id)
                    : [...(post.likedBy || []), user.id],
                likes: hasLiked ? Math.max(0, post.likes - 1) : post.likes + 1
            });
        } catch (error) {
            console.error("Error updating like:", error);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!window.confirm("Delete this post?")) return;
        try {
            const db = await getDb();
            await deleteDoc(doc(db, 'posts', postId));
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post.");
        }
    };

    const handleComment = async (postId: string) => {
        if (!newComment.trim() || !user) return;

        try {
            const db = await getDb();
            await addDoc(collection(db, 'comments'), {
                postId,
                authorId: user.id,
                authorName: user.name,
                authorPhoto: user.photoURL || '',
                content: newComment,
                createdAt: serverTimestamp()
            });

            // Update comment count on post
            const postRef = doc(db, 'posts', postId);
            const post = posts.find(p => p.id === postId);
            if (post) {
                await updateDoc(postRef, {
                    commentsCount: (post.commentsCount || 0) + 1
                });
            }

            setNewComment('');
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    const handleDeleteComment = async (commentId: string, postId: string) => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            const db = await getDb();
            await deleteDoc(doc(db, 'comments', commentId));

            // Decrement comment count
            const postRef = doc(db, 'posts', postId);
            const post = posts.find(p => p.id === postId);
            if (post) {
                await updateDoc(postRef, {
                    commentsCount: Math.max(0, (post.commentsCount || 0) - 1)
                });
            }
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
    };

    const toggleComments = (postId: string) => {
        if (expandedPostId === postId) {
            setExpandedPostId(null);
        } else {
            setExpandedPostId(postId);
        }
    };

    return (
        <div className="bg-[#F0F0E8] min-h-screen py-10 px-4">
            <div className="max-w-2xl mx-auto">
                <header className="mb-12 border-b-4 border-black pb-6">
                    <h1 className="font-serif text-5xl font-bold uppercase tracking-tighter text-black mb-2">
                        Community Feed
                    </h1>
                    <p className="font-mono text-sm uppercase text-gray-600 tracking-widest">
                        Network / Achieve / Connect
                    </p>
                </header>

                {/* Create Post Widget */}
                <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-6 mb-12">
                    <div className="flex gap-4 mb-4">
                        <div className="w-12 h-12 border-2 border-black flex-shrink-0 bg-gray-100 overflow-hidden">
                            {user?.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user?.name ? `${user.name} avatar` : 'User avatar'}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                    width={48}
                                    height={48}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-black text-white font-bold">
                                    {user?.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <textarea
                            className="flex-1 border border-black p-3 font-sans focus:outline-none focus:ring-1 focus:ring-blue-700 h-24 resize-none"
                            placeholder="Share your latest achievement, job update, or thoughts..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    {selectedImage && (
                        <div className="relative mb-4 ml-16 max-w-xs border border-black">
                            <img
                                src={URL.createObjectURL(selectedImage)}
                                alt="Post image preview"
                                className="w-full"
                                loading="lazy"
                                decoding="async"
                                width={1200}
                                height={675}
                            />
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute -top-3 -right-3 bg-red-600 text-white border-2 border-black p-1 hover:bg-red-700 transition-colors shadow-[2px_2px_0px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    <div className="flex justify-between items-center pl-16">
                        <div className="flex gap-4">
                            <button
                                className="font-mono text-xs uppercase font-bold flex items-center gap-2 border border-black px-3 py-2 hover:bg-gray-100 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <ImageIcon size={16} />
                                Photo
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleImageSelect}
                            />
                        </div>
                        <button
                            className="bg-[#1D4ED8] text-white border-2 border-black px-8 py-2 font-mono text-sm uppercase font-bold shadow-[2px_2px_0px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handlePost}
                            disabled={isPosting || (!content.trim() && !selectedImage)}
                        >
                            {isPosting ? 'Sending...' : 'Post'}
                        </button>
                    </div>
                </div>

                {/* Posts Feed */}
                <div className="space-y-8">
                    {posts.map(post => (
                        <article key={post.id} className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
                            <div className="p-6">
                                <header className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-10 h-10 border-2 border-black bg-gray-100 overflow-hidden">
                                            {post.authorPhoto ? (
                                                <img
                                                    src={post.authorPhoto}
                                                    alt={post.authorName ? `${post.authorName} avatar` : 'Author avatar'}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                    decoding="async"
                                                    width={40}
                                                    height={40}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-black text-white font-bold">
                                                    {post.authorName.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-lg font-bold text-black border-b border-black inline-block">
                                                {post.authorName}
                                            </h3>
                                            <div className="font-mono text-[10px] uppercase text-gray-500 mt-1">
                                                {post.createdAt?.seconds
                                                    ? formatDistanceToNow(new Date(post.createdAt.seconds * 1000), { addSuffix: true })
                                                    : 'Just now'}
                                            </div>
                                        </div>
                                    </div>

                                    {(user?.id === post.authorId || user?.role === 'admin') && (
                                        <button
                                            className="text-gray-400 hover:text-red-600 transition-colors"
                                            onClick={() => handleDeletePost(post.id)}
                                            title="Delete Post"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </header>

                                <div className="mb-6">
                                    <p className="font-sans text-lg text-black leading-relaxed mb-4">
                                        {post.content}
                                    </p>
                                    {post.imageUrl && (
                                        <div className="border border-black overflow-hidden bg-gray-50">
                                            <img
                                                src={post.imageUrl}
                                                alt={post.content ? `Post image: ${post.content.slice(0, 60)}` : 'Post image'}
                                                className="w-full h-auto"
                                                loading="lazy"
                                                decoding="async"
                                                width={1200}
                                                height={675}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center border-t border-black pt-4">
                                    <div className="flex gap-6">
                                        <button
                                            className={`flex items-center gap-2 font-mono text-xs uppercase font-bold transition-colors ${post.likedBy?.includes(user?.id || '') ? 'text-red-600' : 'text-gray-600 hover:text-black'}`}
                                            onClick={() => handleLike(post)}
                                        >
                                            <Heart size={18} fill={post.likedBy?.includes(user?.id || '') ? "currentColor" : "none"} />
                                            <span>{post.likes} Likes</span>
                                        </button>
                                        <button
                                            className="flex items-center gap-2 font-mono text-xs uppercase font-bold text-gray-600 hover:text-black transition-colors"
                                            onClick={() => toggleComments(post.id)}
                                        >
                                            <MessageCircle size={18} />
                                            <span>{post.commentsCount || 0} Comments</span>
                                        </button>
                                    </div>
                                    <button className="text-gray-600 hover:text-black transition-colors">
                                        <Share2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Comments Section */}
                            {expandedPostId === post.id && (
                                <div className="bg-gray-50 border-t-2 border-black p-6">
                                    <div className="flex gap-3 mb-8">
                                        <div className="w-8 h-8 border border-black bg-white overflow-hidden flex-shrink-0">
                                            {user?.photoURL ? (
                                                <img
                                                    src={user.photoURL}
                                                    alt={user?.name ? `${user.name} avatar` : 'User avatar'}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                    decoding="async"
                                                    width={32}
                                                    height={32}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-black text-white text-xs font-bold">
                                                    {user?.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 border border-black p-2 font-sans text-sm focus:outline-none focus:ring-1 focus:ring-blue-700 bg-white"
                                                placeholder="Add a comment..."
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                                            />
                                            <button
                                                onClick={() => handleComment(post.id)}
                                                disabled={!newComment.trim()}
                                                className="bg-black text-white p-2 border border-black hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-[2px_2px_0px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {loadingComments ? (
                                            <p className="font-mono text-xs uppercase text-center py-4">Loading comments...</p>
                                        ) : comments.length === 0 ? (
                                            <p className="font-mono text-xs uppercase text-center py-4 text-gray-500">No comments yet.</p>
                                        ) : (
                                            comments.map(comment => (
                                                <div key={comment.id} className="flex gap-3">
                                                    <div className="w-8 h-8 border border-black bg-white overflow-hidden flex-shrink-0">
                                                        {comment.authorPhoto ? (
                                                            <img
                                                                src={comment.authorPhoto}
                                                                alt={comment.authorName ? `${comment.authorName} avatar` : 'Comment author avatar'}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                                decoding="async"
                                                                width={32}
                                                                height={32}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-black text-white text-xs font-bold">
                                                                {comment.authorName.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 bg-white border border-black p-3 shadow-[2px_2px_0px_0px_#000000]">
                                                        <header className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <span className="font-serif text-sm font-bold border-b border-black">{comment.authorName}</span>
                                                                <span className="font-mono text-[10px] uppercase text-gray-500 ml-3">
                                                                    {comment.createdAt?.seconds
                                                                        ? formatDistanceToNow(new Date(comment.createdAt.seconds * 1000), { addSuffix: true })
                                                                        : 'Just now'}
                                                                </span>
                                                            </div>
                                                            {(user?.id === comment.authorId || user?.role === 'admin') && (
                                                                <button
                                                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                                                    onClick={() => handleDeleteComment(comment.id, post.id)}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </header>
                                                        <p className="font-sans text-sm text-black leading-relaxed">
                                                            {comment.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
};
