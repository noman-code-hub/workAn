import { useState, useEffect, useRef } from "react";
import { Trash2, MessageCircle, Heart, Search, Pencil } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import type { BlogPost } from '../types';
import { createPost, deletePost, subscribeToPosts, updatePost } from '../services/postService';

export const AdminPosts = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [postTitle, setPostTitle] = useState("");
    const [postContent, setPostContent] = useState("");
    const [postImage, setPostImage] = useState<File | null>(null);
    const [postType, setPostType] = useState<'community' | 'blog'>('community');
    const [isPublishingPost, setIsPublishingPost] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = subscribeToPosts(
            { type: 'community' },
            (postsData) => {
                setPosts(postsData);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading posts:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;
        try {
            await deletePost(id);
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post.");
        }
    };

    const handleEdit = async (post: BlogPost) => {
        const nextContent = window.prompt("Edit post content", post.content);
        if (nextContent === null) return;
        const trimmed = nextContent.trim();
        if (!trimmed) {
            alert("Post content cannot be empty.");
            return;
        }

        try {
            await updatePost(post.id, { content: trimmed });
        } catch (error) {
            console.error("Error updating post:", error);
            alert("Failed to update post.");
        }
    };

    const filteredPosts = posts.filter(post =>
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePublishPost = async () => {
        const hasContent = postContent.trim().length > 0;
        const hasTitle = postTitle.trim().length > 0;
        if (!hasContent && !hasTitle && !postImage) return;
        if (!user) {
            alert("You must be logged in to publish a post.");
            return;
        }

        try {
            setIsPublishingPost(true);
            await createPost(user, postTitle.trim(), postContent.trim(), postImage || undefined, postType);
            setPostTitle("");
            setPostContent("");
            setPostImage(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            alert("Post published successfully.");
        } catch (error) {
            console.error("Error publishing post:", error);
            alert("Failed to publish post.");
        } finally {
            setIsPublishingPost(false);
        }
    };

    if (loading) return <div className="admin-empty">Loading posts...</div>;

    return (
        <div className="admin-posts">
            <section className="admin-create-blog">
                <div>
                    <p className="admin-eyebrow">Publish</p>
                    <h2>Create Post</h2>
                    <p className="admin-subtitle">Publish community updates or blog articles from the admin panel.</p>
                </div>

                <div className="admin-create-blog-form">
                    <select
                        className="input"
                        value={postType}
                        onChange={(e) => setPostType(e.target.value as 'community' | 'blog')}
                    >
                        <option value="community">Community Post</option>
                        <option value="blog">Blog Article</option>
                    </select>
                    <input
                        type="text"
                        className="input"
                        placeholder="Title (optional)"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                    />
                    <textarea
                        className="input"
                        placeholder="Write your post content..."
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        rows={6}
                    />
                    {postImage && (
                        <div className="admin-selected-image">
                            <span>{postImage.name}</span>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                    setPostImage(null);
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
                        onChange={(e) => setPostImage(e.target.files?.[0] || null)}
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
                            onClick={handlePublishPost}
                            disabled={isPublishingPost || (!postTitle.trim() && !postContent.trim() && !postImage)}
                        >
                            {isPublishingPost ? "Publishing..." : "Publish Post"}
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
                                        {post.createdAt
                                            ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
                                            : 'Just now'}
                                    </span>
                                    {post.imageURL && (
                                        <span className="badge badge-primary">Image</span>
                                    )}
                                </div>
                                {post.title && (
                                    <p className="post-content"><strong>{post.title}</strong></p>
                                )}
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
                            <div className="post-actions">
                                <button
                                    onClick={() => handleEdit(post)}
                                    className="btn btn-secondary btn-sm icon-btn"
                                    title="Edit Post"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(post.id)}
                                    className="btn btn-danger btn-sm icon-btn"
                                    title="Delete Post"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
