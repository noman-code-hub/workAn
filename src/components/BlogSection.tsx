import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Image as ImageIcon,
    Trash2,
    ChevronDown,
    ChevronUp,
    ArrowRight
} from 'lucide-react';
import type { User, BlogPost } from '@/types';
import { createPost, deletePost, subscribeToPosts } from '@/services/postService';

interface BlogSectionProps {
    user?: User;
    isOwnProfile?: boolean;
    viewMode?: 'grid' | 'list';
    limit?: number;
    type?: 'blog' | 'community';
    isFeed?: boolean;
}

export const BlogSection = ({ user, isOwnProfile = true, viewMode = 'grid', limit, type, isFeed = false }: BlogSectionProps) => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [postTitle, setPostTitle] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isTabletOrBelow, setIsTabletOrBelow] = useState(false);
    const [isPhone, setIsPhone] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let isMounted = true;
        let unsubscribe = () => {};

        setLoading(true);
        subscribeToPosts(
            { userId: (!user || isFeed) ? undefined : user.id, type },
            (postsData) => {
                if (!isMounted) return;
                setPosts(postsData);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching posts:", error);
                if (isMounted) setLoading(false);
            }
        )
            .then((unsub) => {
                if (!isMounted) {
                    unsub();
                    return;
                }
                unsubscribe = unsub;
            })
            .catch((error) => {
                console.error("Error initializing post subscription:", error);
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [user?.id, isFeed, type]);

    useEffect(() => {
        const handleResize = () => {
            setIsTabletOrBelow(window.innerWidth <= 768);
            setIsPhone(window.innerWidth <= 640);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !selectedImage && !postTitle.trim()) return;

        try {
            if (!user) return;
            setIsPosting(true);
            // Default to 'community' type if none specified for new posts via the feed creation box
            const postType = type || 'community';
            const newPost = await createPost(user, postTitle, newPostContent, selectedImage || undefined, postType);
            setPosts([newPost, ...posts]);
            setNewPostContent('');
            setPostTitle('');
            setSelectedImage(null);
            setShowCreateModal(false);
        } catch (error) {
            console.error("Failed to create post", error);
            alert("Failed to post. Please try again.");
        } finally {
            setIsPosting(false);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Are you sure you want to delete this post?")) return;

        try {
            await deletePost(postId);
            setPosts(posts.filter(p => p.id !== postId));
        } catch (error) {
            console.error("Failed to delete post", error);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImage(e.target.files[0]);
            if (!showCreateModal) setShowCreateModal(true);
        }
    };

    const displayedPosts = (limit && !showAll) ? posts.slice(0, limit) : posts;
    const isFeedMode = viewMode === 'list';
    const gridFeedStyle: React.CSSProperties = {
        ...styles.gridFeed,
        ...(isTabletOrBelow ? { gridTemplateColumns: '1fr' } : {}),
        ...(isPhone ? { gap: '16px' } : {}),
    };

    return (
        <div style={isFeedMode ? styles.listContainer : styles.gridContainer}>
            {isOwnProfile && (
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleImageSelect}
                />
            )}

            {/* LinkedIn-style Create Box for Feed */}
            {isFeed && user && (
                <div style={styles.createBox}>
                    <div style={styles.inputRow}>
                        <div style={styles.miniAvatar}>
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.name ? `${user.name} avatar` : 'User avatar'}
                                    style={styles.avatarImg}
                                    loading="lazy"
                                    decoding="async"
                                    width={48}
                                    height={48}
                                />
                            ) : (
                                user.name.charAt(0)
                            )}
                        </div>
                        <button 
                            style={styles.pillInput}
                            onClick={() => setShowCreateModal(true)}
                        >
                            Start a post
                        </button>
                    </div>
                    <div style={styles.createActions}>
                        <button style={styles.actionBtn} onClick={() => fileInputRef.current?.click()}>
                            <ImageIcon size={20} color="#378fe9" />
                            <span>Media</span>
                        </button>
                        <button style={styles.actionBtn} onClick={() => setShowCreateModal(true)}>
                            <div style={{ color: '#e7a33e', fontSize: '18px' }}>📄</div>
                            <span>Article</span>
                        </button>
                        <button style={styles.actionBtn} onClick={() => setShowCreateModal(true)}>
                            <div style={{ color: '#7fc15e', fontSize: '18px' }}>✨</div>
                            <span>Event</span>
                        </button>
                    </div>
                </div>
            )}

            {!isFeedMode && (
                <div style={styles.gridHeader}>
                    <h2 style={styles.gridTitle}>
                        {type === 'blog' ? 'Blog' : type === 'community' ? 'Community' : 'Activity'}
                    </h2>
                    {(isOwnProfile && user) && (
                        <button style={styles.gridCreateBtn} onClick={() => setShowCreateModal(true)}>
                            New {type === 'blog' ? 'Article' : 'Update'}
                        </button>
                    )}
                </div>
            )}

            {/* Public Post Prompt if in Feed Mode and not logged in */}
            {isFeedMode && !user && (
                <div style={styles.publicPromptBox}>
                    <p style={styles.publicPromptText}>
                        Want to share your {type === 'blog' ? 'articles' : 'career updates'}?
                        <a href="/login" style={styles.publicPromptLink}> Sign in</a> to join the community.
                    </p>
                </div>
            )}

            {/* Create Post Modal */}
            {showCreateModal && user && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3>Create a post</h3>
                            <button onClick={() => setShowCreateModal(false)} style={styles.closeBtn}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.modalUserRow}>
                                <div style={styles.miniAvatar}>
                                    {user.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            alt={user?.name ? `${user.name} avatar` : 'User avatar'}
                                            style={styles.avatarImg}
                                            loading="lazy"
                                            decoding="async"
                                            width={48}
                                            height={48}
                                        />
                                    ) : (
                                        user.name.charAt(0)
                                    )}
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ fontWeight: 600, fontSize: '16px', margin: 0 }}>{user.name}</p>
                                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Post to Anyone</p>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Article Title (optional)"
                                value={postTitle}
                                onChange={(e) => setPostTitle(e.target.value)}
                                style={styles.modalTitleInput}
                            />
                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="What do you want to talk about?"
                                style={styles.modalTextarea}
                                rows={8}
                            />
                            {selectedImage && (
                                <div style={styles.modalImagePreview}>
                                    <img
                                        src={URL.createObjectURL(selectedImage)}
                                        alt="Selected image preview"
                                        style={styles.previewImg}
                                        loading="lazy"
                                        decoding="async"
                                        width={1200}
                                        height={675}
                                    />
                                    <button onClick={() => setSelectedImage(null)} style={styles.removeImg}>×</button>
                                </div>
                            )}
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => fileInputRef.current?.click()} style={styles.footerIconBtn}>
                                <ImageIcon size={20} />
                            </button>
                            <button
                                onClick={handleCreatePost}
                                disabled={isPosting || (!newPostContent.trim() && !selectedImage && !postTitle.trim())}
                                style={styles.publishBtn}
                            >
                                {isPosting ? 'Publishing...' : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Posts Feed - NEW CARD STYLE */}
            {loading ? (
                <p style={styles.loading}>Loading posts...</p>
            ) : posts.length === 0 ? (
                <div style={styles.emptyBox}>No posts yet. Start sharing!</div>
            ) : (
                <div style={viewMode === 'grid' ? gridFeedStyle : styles.listFeed}>
                    {displayedPosts.map(post => (
                        <div key={post.id} style={styles.modernCard}>
                            {/* Card Media */}
                            {post.imageURL && (
                                <div style={styles.modernImageWrapper}>
                                    <img
                                        src={post.imageURL}
                                        alt={post.title || 'Blog image'}
                                        style={styles.modernImage}
                                        loading="lazy"
                                        decoding="async"
                                        width={1200}
                                        height={675}
                                    />
                                </div>
                            )}

                            {/* Card Content */}
                            <div style={styles.modernContent}>
                                {/* Author Actions (Shown for owner) */}
                                {(user && post.userId === user.id) && (
                                    <div style={styles.modernActions}>
                                        <button onClick={() => handleDeletePost(post.id)} style={styles.modernDeleteBtn} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}

                                <h3 style={styles.modernTitle}>{post.title || (post.type === 'community' ? "Update" : "Untitled Article")}</h3>

                                <p style={styles.modernExcerpt}>{post.content}</p>

                                <button
                                    style={styles.readMoreBtn}
                                    onClick={() => navigate(`/blog/${post.id}`)}
                                >
                                    Read More <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {limit && posts.length > limit && (
                <div style={styles.seeMoreContainer}>
                    <button onClick={() => setShowAll(!showAll)} style={styles.seeMoreFullBtn}>
                        {showAll ? <>Show less <ChevronUp size={20} /></> : <>Show all {posts.length} articles <ChevronDown size={20} /></>}
                    </button>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    // Containers
    listContainer: { display: 'flex', flexDirection: 'column', gap: '24px' },
    gridContainer: { backgroundColor: 'transparent', padding: 0 },

    // Create Box (LinkedIn Style stays for the Feed column)
    createBox: {
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        padding: '12px 16px 4px',
        marginBottom: '16px',
    },
    inputRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' },
    miniAvatar: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: '#a0b4b7',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
    },
    avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    pillInput: {
        flex: 1,
        height: '48px',
        borderRadius: '24px',
        border: '1px solid #666',
        backgroundColor: 'white',
        textAlign: 'left',
        padding: '0 16px',
        fontSize: '14px',
        color: 'rgba(0,0,0,0.6)',
        fontWeight: 600,
        cursor: 'pointer',
    },
    createActions: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' },
    actionBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#666' },

    //Feed Layouts
    listFeed: { display: 'flex', flexDirection: 'column', gap: '24px' },
    gridFeed: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px',
    },

    // --- MODERN CARD STYLE (The one in the image) ---
    modernCard: {
        backgroundColor: 'white',
        borderRadius: '24px',
        border: '2px solid #00ffcc', // Vibrant cyan/green border
        overflow: 'hidden',
        textAlign: 'left',
        boxShadow: '0 8px 32px rgba(0, 255, 204, 0.1)', // Subtle neon glow
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.2s',
    },
    modernImageWrapper: {
        width: '100%',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
    },
    modernImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        display: 'block',
    },
    modernContent: {
        padding: '28px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
    },
    modernActions: {
        position: 'absolute',
        top: '12px',
        right: '12px',
        display: 'flex',
        gap: '8px',
    },
    modernDeleteBtn: {
        background: 'rgba(255,255,255,0.8)',
        border: 'none',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ff4d4d',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    modernTitle: {
        fontSize: '22px',
        fontWeight: '700',
        color: '#1a2b4b', // Dark blueish black
        margin: '0 0 16px 0',
        lineHeight: '1.4',
    },
    modernMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
    },
    modernDate: {
        fontSize: '15px',
        color: '#6b7280',
        fontWeight: '500',
    },
    modernExcerpt: {
        fontSize: '15px',
        color: '#4f5e7b',
        lineHeight: '1.6',
        margin: '0 0 16px 0',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        flex: 1,
    },
    readMoreBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#00e699', // Matching the neon theme
        fontSize: '17px',
        fontWeight: '700',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        marginTop: 'auto',
    },

    // Author Info
    authorRow: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' },
    authorInfo: { display: 'flex', flexDirection: 'column' },
    authorName: { fontSize: '15px', fontWeight: 600, color: '#1a2b4b', margin: 0 },

    // UI/UX Utils
    gridHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' },
    gridTitle: { fontSize: '20px', fontWeight: 700, margin: 0 },
    gridCreateBtn: { background: 'none', border: '1px solid #0a66c2', color: '#0a66c2', borderRadius: '16px', padding: '6px 16px', fontWeight: 600, cursor: 'pointer' },

    // Modal (LinkedIn style stays)
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 5000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '80px 12px max(12px, env(safe-area-inset-bottom))', overflowY: 'auto' },
    modalContent: { backgroundColor: 'white', width: '100%', maxWidth: '552px', maxHeight: '90vh', borderRadius: '8px', display: 'flex', flexDirection: 'column' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f3f2f0' },
    closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' },
    modalBody: { padding: '16px 24px', overflowY: 'auto' },
    modalUserRow: { display: 'flex', gap: '12px', marginBottom: '16px' },
    modalTitleInput: { width: '100%', padding: '12px 0', border: 'none', fontSize: '18px', fontWeight: 600, outline: 'none' },
    modalTextarea: { width: '100%', border: 'none', fontSize: '16px', outline: 'none', resize: 'none', fontFamily: 'inherit' },
    modalFooter: { padding: '12px 16px max(12px, env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f2f0', backgroundColor: 'white', position: 'sticky', bottom: 0 },
    footerIconBtn: { padding: '12px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: '#666' },
    publishBtn: { backgroundColor: '#0a66c2', color: 'white', border: 'none', borderRadius: '24px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer' },
    modalImagePreview: { position: 'relative', marginTop: '12px' },
    previewImg: { width: '100%', borderRadius: '4px' },
    removeImg: { position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' },

    loading: { textAlign: 'center', padding: '40px', color: '#666' },
    emptyBox: { textAlign: 'center', padding: '40px', backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px' },
    seeMoreContainer: { textAlign: 'center', marginTop: '16px' },
    seeMoreFullBtn: { background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', fontSize: '14px', fontWeight: 600, color: '#666', cursor: 'pointer' },

    // Public Prompt
    publicPromptBox: { backgroundColor: 'white', border: '2px dashed #00d4aa', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '24px' },
    publicPromptText: { margin: 0, fontSize: '15px', fontWeight: 600, color: '#4b5563' },
    publicPromptLink: { color: '#00d4aa', textDecoration: 'none', borderBottom: '2px solid #00d4aa' }
};
