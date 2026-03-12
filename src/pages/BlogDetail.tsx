import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '../config/firebase';
import { applySeoMeta } from '../utils/seo';
import type { BlogPost } from '@/types';

export const BlogDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPost = async () => {
            if (!id) return;

            try {
                const db = await getDb();
                const blogDoc = await getDoc(doc(db, 'blogs', id));
                const postDoc = blogDoc.exists() ? blogDoc : await getDoc(doc(db, 'posts', id));

                if (postDoc.exists()) {
                    const data = postDoc.data();
                    const title = data.title ? `${data.title} | Workshour` : 'Career Insights | Workshour';
                    const description = typeof data.content === 'string'
                        ? data.content.replace(/\s+/g, ' ').slice(0, 160)
                        : '';
                    const image = data.imageURL || data.imageUrl || '';
                    applySeoMeta(
                        title,
                        description,
                        `/blog/${postDoc.id}`,
                        {
                            ogType: 'article',
                            image: image || undefined,
                            keywords: data.title ? `${data.title}, career insights, workshour` : undefined,
                        }
                    );
                    setPost({
                        id: postDoc.id,
                        ...data,
                        userId: data.userId || data.authorId || '',
                        authorAvatar: data.authorAvatar || data.authorPhoto || '',
                        imageURL: data.imageURL || data.imageUrl || '',
                        type: data.type === 'blog' ? 'blog' : 'community',
                        createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : new Date()),
                        updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt ? new Date(data.updatedAt) : (data.createdAt?.toDate?.() || new Date()))
                    } as BlogPost);
                }
            } catch (error) {
                console.error('Error loading post:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPost();
    }, [id]);

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading...</div>
            </div>
        );
    }

    if (!post) {
        return (
            <div style={styles.container}>
                <div style={styles.error}>Post not found</div>
            </div>
        );
    }

    const readTime = Math.ceil(post.content.split(' ').length / 200); // Average reading speed

    return (
        <div style={styles.pageContainer}>
            <div style={styles.container}>
                {/* Back Navigation */}
                <button onClick={() => navigate(-1)} style={styles.backButton}>
                    <ArrowLeft size={16} />
                    <span>Back to Blog</span>
                </button>

                {/* Article Header */}
                <article style={styles.article}>
                    <h1 style={styles.title}>{post.title || 'Untitled Post'}</h1>

                    <div style={styles.meta}>
                        <div style={styles.metaItem}>
                            <Calendar size={16} color="#6b7280" />
                            <span>{new Date(post.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</span>
                        </div>
                        <div style={styles.metaItem}>
                            <Clock size={16} color="#6b7280" />
                            <span>{readTime} min read</span>
                        </div>
                    </div>

                    {/* Featured Image */}
                    {post.imageURL && (
                        <div style={styles.featuredImageWrapper}>
                            <img
                                src={post.imageURL}
                                alt={post.title || 'Blog featured image'}
                                style={styles.featuredImage}
                                loading="lazy"
                                decoding="async"
                                width={1200}
                                height={675}
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div style={styles.content}>
                        {/* Quick Answer Section */}
                        <div style={styles.quickAnswer}>
                            <h2 style={styles.quickAnswerTitle}>Quick Answer:</h2>
                            <p style={styles.quickAnswerText}>
                                {post.content.length > 250
                                    ? post.content.substring(0, 250) + '...'
                                    : post.content}
                            </p>
                        </div>

                        {/* Main Content */}
                        <div style={styles.mainContent}>
                            {post.content.split('\n\n').map((section, idx) => {
                                // Check if it's a heading (starts with #)
                                if (section.trim().startsWith('#')) {
                                    const headingText = section.replace(/^#+\s*/, '');
                                    return (
                                        <h2 key={idx} style={styles.sectionHeading}>
                                            {headingText}
                                        </h2>
                                    );
                                }

                                // Check if it's a list (multiple lines starting with - or *)
                                const lines = section.split('\n');
                                if (lines.length > 1 && lines.every(line =>
                                    line.trim().startsWith('-') || line.trim().startsWith('*') || !line.trim()
                                )) {
                                    return (
                                        <ul key={idx} style={styles.list}>
                                            {lines.filter(line => line.trim()).map((item, i) => (
                                                <li key={i} style={styles.listItem}>
                                                    {item.replace(/^[-*]\s*/, '')}
                                                </li>
                                            ))}
                                        </ul>
                                    );
                                }

                                // Regular paragraphs
                                return section.split('\n').map((paragraph, i) =>
                                    paragraph.trim() ? (
                                        <p key={`${idx}-${i}`} style={styles.paragraph}>
                                            {paragraph}
                                        </p>
                                    ) : null
                                );
                            })}
                        </div>
                    </div>
                </article>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    pageContainer: {
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        paddingTop: '40px',
        paddingBottom: '80px',
    },
    container: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '0 24px',
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'none',
        border: 'none',
        color: '#0066cc',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        marginBottom: '32px',
        padding: '8px 0',
        transition: 'color 0.2s',
    },
    article: {
        backgroundColor: 'white',
        borderRadius: '0',
        padding: '0',
        boxShadow: 'none',
    },
    title: {
        fontSize: '48px',
        fontWeight: 800,
        color: '#1a1a1a',
        lineHeight: '1.1',
        margin: '0 0 24px 0',
        letterSpacing: '-0.02em',
    },
    meta: {
        display: 'flex',
        gap: '20px',
        marginBottom: '32px',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#666666',
        fontWeight: 500,
    },
    featuredImageWrapper: {
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '40px',
        backgroundColor: '#f3f4f6',
        display: 'flex',
        justifyContent: 'center',
    },
    featuredImage: {
        width: '100%',
        height: 'auto',
        maxHeight: '70vh',
        objectFit: 'contain',
        display: 'block',
    },
    content: {
        fontSize: '17px',
        lineHeight: '1.7',
        color: '#333333',
    },
    quickAnswer: {
        backgroundColor: '#e8f5f3',
        borderLeft: '4px solid #00d4aa',
        padding: '24px 28px',
        marginBottom: '40px',
        borderRadius: '4px',
    },
    quickAnswerTitle: {
        fontSize: '18px',
        fontWeight: 700,
        color: '#1a1a1a',
        margin: '0 0 12px 0',
    },
    quickAnswerText: {
        margin: 0,
        fontSize: '16px',
        lineHeight: '1.7',
        color: '#1a1a1a',
    },
    mainContent: {
        marginTop: '40px',
    },
    sectionHeading: {
        fontSize: '28px',
        fontWeight: 700,
        color: '#1a1a1a',
        marginTop: '48px',
        marginBottom: '20px',
        lineHeight: '1.3',
    },
    contentText: {
        fontSize: '17px',
        lineHeight: '1.7',
        color: '#333333',
    },
    paragraph: {
        marginBottom: '20px',
        lineHeight: '1.7',
        color: '#333333',
    },
    list: {
        marginBottom: '24px',
        paddingLeft: '28px',
        color: '#333333',
    },
    listItem: {
        marginBottom: '12px',
        lineHeight: '1.7',
    },
    loading: {
        textAlign: 'center',
        padding: '80px 20px',
        fontSize: '16px',
        color: '#666666',
    },
    error: {
        textAlign: 'center',
        padding: '80px 20px',
        fontSize: '16px',
        color: '#ef4444',
        fontWeight: 600,
    },
};

