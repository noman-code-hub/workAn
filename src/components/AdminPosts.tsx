import { useState, useEffect, useRef } from "react";
import { deleteDoc, doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from '../config/firebase';
import { Trash2, MessageCircle, Heart, Search } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { createPost } from '../services/postService';

interface Post {
    id: string;
    authorName: string;
    content: string;
    imageUrl?: string;
    likes: number;
    commentsCount: number;
    createdAt: any;
}

export const AdminPosts = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [blogTitle, setBlogTitle] = useState("");
    const [blogContent, setBlogContent] = useState("");
    const [blogImage, setBlogImage] = useState<File | null>(null);
    const [isPublishingBlog, setIsPublishingBlog] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Post[];
            setPosts(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, "posts", id));
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post.");
        }
    };

    const filteredPosts = posts.filter(post =>
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.authorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePublishBlog = async () => {
        const hasContent = blogContent.trim().length > 0;
        const hasTitle = blogTitle.trim().length > 0;
        if (!hasContent && !hasTitle && !blogImage) return;
        if (!user) {
            alert("You must be logged in to publish a blog.");
            return;
        }

        try {
            setIsPublishingBlog(true);
            await createPost(user, blogTitle.trim(), blogContent.trim(), blogImage || undefined, 'blog');
            setBlogTitle("");
            setBlogContent("");
            setBlogImage(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            alert("Blog published successfully.");
        } catch (error) {
            console.error("Error publishing blog:", error);
            alert("Failed to publish blog.");
        } finally {
            setIsPublishingBlog(false);
        }
    };

    if (loading) return <div className="admin-empty">Loading posts...</div>;

    return (
        <div className="admin-posts">
            <section className="admin-create-blog">
                <div>
                    <p className="admin-eyebrow">Publish</p>
                    <h2>Create Blog Article</h2>
                    <p className="admin-subtitle">Post articles directly from the admin panel.</p>
                </div>

                <div className="admin-create-blog-form">
                    <input
                        type="text"
                        className="input"
                        placeholder="Blog title (optional)"
                        value={blogTitle}
                        onChange={(e) => setBlogTitle(e.target.value)}
                    />
                    <textarea
                        className="input"
                        placeholder="Write your blog content..."
                        value={blogContent}
                        onChange={(e) => setBlogContent(e.target.value)}
                        rows={6}
                    />
                    {blogImage && (
                        <div className="admin-selected-image">
                            <span>{blogImage.name}</span>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                    setBlogImage(null);
                                    if (fileInputRef.current) {
                                        fileInputRef.current.value = "";
                                    }
                                }}
                            >
                                Remove image
                            </button>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => setBlogImage(e.target.files?.[0] || null)}
                    />
                    <div className="admin-create-blog-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Add Image
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handlePublishBlog}
                            disabled={isPublishingBlog || (!blogTitle.trim() && !blogContent.trim() && !blogImage)}
                        >
                            {isPublishingBlog ? "Publishing..." : "Publish Blog"}
                        </button>
                    </div>
                </div>
            </section>

            <header className="admin-posts-header">
                <div>
                    <p className="admin-eyebrow">Content Moderation</p>
                    <h2>Community Posts</h2>
                    <p className="admin-subtitle">Review, search, and remove posts that violate guidelines.</p>
                </div>
                <div className="count-chip">{posts.length} Posts</div>
            </header>

            <div className="admin-posts-toolbar">
                <div className="search-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search posts by content or author..."
                        className="input search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="posts-list">
                {filteredPosts.length === 0 ? (
                    <div className="admin-empty admin-empty-card">
                        No posts found matching your search.
                    </div>
                ) : (
                    filteredPosts.map((post) => (
                        <div key={post.id} className="post-row">
                            <div className="post-main">
                                <div className="post-meta">
                                    <span className="post-author">{post.authorName}</span>
                                    <span className="post-time">
                                        {post.createdAt?.seconds
                                            ? formatDistanceToNow(new Date(post.createdAt.seconds * 1000), { addSuffix: true })
                                            : 'Just now'}
                                    </span>
                                    {post.imageUrl && (
                                        <span className="badge badge-primary">Image</span>
                                    )}
                                </div>
                                <p className="post-content">{post.content}</p>
                                <div className="post-stats">
                                    <span className="post-stat">
                                        <Heart size={14} /> {post.likes}
                                    </span>
                                    <span className="post-stat">
                                        <MessageCircle size={14} /> {post.commentsCount || 0}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(post.id)}
                                className="btn btn-danger btn-sm icon-btn"
                                title="Delete Post"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
