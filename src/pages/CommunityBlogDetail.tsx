import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  findStaticCommunityArticle,
  filterStaticCommunityArticles,
} from '../data/communityArticles';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { applySeoMeta } from '../utils/seo';

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const formatDate = (value?: string) => {
  if (!value) return 'Unpublished';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unpublished';
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
};

type BlogRow = {
  id: string;
  slug: string | null;
  title: string | null;
  content: string | null;
  author_name: string | null;
  category: string | null;
  cover_image: string | null;
  image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  created_at: string | null;
  published?: boolean | null;
  faqs?: { question?: string | null; answer?: string | null }[] | null;
};

type BlogDetail = {
  id: string;
  slug: string;
  title: string;
  content: string;
  authorName: string;
  category: string;
  coverImage: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string;
  faqs: { question: string; answer: string }[];
};

type RelatedPost = {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
};

type RelatedPostRow = Pick<BlogRow, 'id' | 'slug' | 'title' | 'cover_image' | 'image_url'>;

const normalizeBlog = (row: BlogRow): BlogDetail => {
  const title = row.title?.trim() || 'Untitled story';
  const coverImage = row.cover_image || row.image_url || '';
  const descriptionSource = row.meta_description || stripHtml(row.content || '');

  return {
    id: row.id,
    slug: row.slug?.trim() || row.id,
    title,
    content: row.content || '',
    authorName: row.author_name?.trim() || 'Workshour Editorial',
    category: row.category?.trim() || 'General',
    coverImage,
    metaTitle: row.meta_title?.trim() || title,
    metaDescription: descriptionSource.trim().slice(0, 220),
    publishedAt: row.published_at || row.created_at || '',
    faqs: Array.isArray(row.faqs)
      ? row.faqs
          .map((item) => ({
            question: (item?.question || '').toString().trim(),
            answer: (item?.answer || '').toString().trim(),
          }))
          .filter((item) => item.question || item.answer)
      : [],
  };
};

export const CommunityBlogDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRelated = useCallback(async (category: string, currentSlug: string, currentId?: string) => {
    const staticRelated = filterStaticCommunityArticles('', category)
      .filter((article) => article.slug !== currentSlug)
      .map((article) => ({
        id: article.id,
        slug: article.slug,
        title: article.title,
        coverImage: article.coverImage,
      }));

    if (!isSupabaseConfigured || !supabase) {
      setRelated(staticRelated.slice(0, 3));
      return;
    }

    try {
      let builder = supabase
        .from('blogs')
        .select('id, slug, title, cover_image, image_url')
        .eq('published', true)
        .eq('category', category)
        .order('published_at', { ascending: false })
        .limit(3);

      if (currentId) {
        builder = builder.neq('id', currentId);
      }

      const { data, error: fetchError } = await builder;
      if (fetchError) throw fetchError;

      const normalized = ((data || []) as RelatedPostRow[])
        .map((row) => ({
          id: row.id,
          slug: row.slug?.trim() || row.id,
          title: row.title?.trim() || 'Untitled story',
          coverImage: row.cover_image || row.image_url || '',
        }))
        .filter((post) => post.slug !== currentSlug);

      const merged = [...staticRelated, ...normalized].filter(
        (post, index, array) => array.findIndex((item) => item.slug === post.slug) === index
      );
      setRelated(merged.slice(0, 3));
    } catch (err) {
      console.error('Error loading related posts:', err);
      setRelated(staticRelated.slice(0, 3));
    }
  }, []);

  useEffect(() => {
    const loadBlog = async () => {
      if (!slug) return;
      setLoading(true);
      setError('');
      setBlog(null);
      setRelated([]);

      const staticBlog = findStaticCommunityArticle(slug);

      if (staticBlog) {
        setBlog(staticBlog);
        setLoading(false);
        void loadRelated(staticBlog.category, staticBlog.slug);
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('blogs')
          .select('*')
          .eq('published', true)
          .eq('slug', slug)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Blog post not found.');
          setLoading(false);
          return;
        }

        const normalized = normalizeBlog(data as BlogRow);
        setBlog(normalized);
        if (normalized.category) {
          void loadRelated(normalized.category, normalized.slug, normalized.id);
        }
      } catch (err) {
        console.error('Error loading blog:', err);
        setError('Unable to load this article.');
      } finally {
        setLoading(false);
      }
    };

    void loadBlog();
  }, [slug, loadRelated]);

  const seoTitle = blog?.metaTitle || 'Community Blog | Workshour';
  const seoDescription = blog?.metaDescription || 'Read the latest insights from the Workshour community.';
  const seoImage = blog?.coverImage || undefined;

  const formattedDate = useMemo(() => formatDate(blog?.publishedAt), [blog?.publishedAt]);

  useEffect(() => {
    if (!slug || blog) return;
    applySeoMeta(
      'Community Article | Workshour',
      'Read the latest career insights and hiring guidance from the Workshour community.',
      `/community/${slug}`,
      {
        ogType: 'article',
      }
    );
  }, [slug, blog]);

  useEffect(() => {
    if (!blog) return;
    applySeoMeta(
      seoTitle,
      seoDescription,
      `/community/${blog.slug}`,
      {
        ogType: 'article',
        image: seoImage,
      }
    );

    if (typeof document === 'undefined') return;
    const scriptId = 'community-blog-jsonld';
    const canonicalUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/community/${blog.slug}`
      : `/community/${blog.slug}`;
    const graph: Record<string, any>[] = [];
    const blogJson: Record<string, any> = {
      '@type': 'BlogPosting',
      headline: blog.title,
      description: seoDescription,
      author: {
        '@type': 'Person',
        name: blog.authorName,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Workshour',
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl,
      },
    };

    if (blog.coverImage) {
      blogJson.image = [blog.coverImage];
    }
    if (blog.publishedAt) {
      blogJson.datePublished = blog.publishedAt;
      blogJson.dateModified = blog.publishedAt;
    }

    graph.push(blogJson);

    if (blog.faqs.length > 0) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: blog.faqs.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      });
    }

    const jsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@graph': graph,
    };

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = scriptId;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [blog, seoDescription, seoImage, seoTitle]);

  if (loading) {
    return <div className="blog-detail-loading">Loading article...</div>;
  }

  if (error || !blog) {
    return <div className="blog-detail-loading">{error || 'Blog post not found.'}</div>;
  }

  return (
    <div className="blog-detail">
      <article className="blog-detail-article">
        <Link className="blog-detail-back" to="/community">
          Back to Community Blog
        </Link>
        <header className="blog-detail-header">
          <p className="blog-detail-category">{blog.category}</p>
          <h1>{blog.title}</h1>
          <div className="blog-detail-meta">
            <span>{blog.authorName}</span>
            <span className="blog-detail-dot" aria-hidden="true" />
            <span>{formattedDate}</span>
          </div>
          {blog.coverImage ? (
            <div className="blog-detail-cover">
              <img
                src={blog.coverImage}
                alt={blog.title}
                loading="eager"
                decoding="async"
                width={1200}
                height={675}
              />
            </div>
          ) : null}
        </header>

        <section
          className="blog-detail-content"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {blog.faqs.length > 0 ? (
          <section className="blog-detail-faq">
            <h2>Frequently asked questions</h2>
            <div className="blog-detail-faq-list">
              {blog.faqs.map((faq, index) => (
                <div key={`faq-${index}`} className="blog-detail-faq-item">
                  <h3>{faq.question || 'FAQ question'}</h3>
                  <p>{faq.answer || ''}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="blog-detail-cta">
          <Link to="/jobs" className="blog-detail-cta-btn">
            Apply for Jobs
          </Link>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="blog-related">
          <h2>Related posts</h2>
          <div className="blog-related-grid">
            {related.map((post) => (
              <Link key={post.id} to={`/community/${post.slug}`} className="blog-related-card">
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    loading="lazy"
                    decoding="async"
                    width={480}
                    height={270}
                  />
                ) : (
                  <div className="blog-related-placeholder" aria-hidden="true" />
                )}
                <p>{post.title}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <style>{`
        .blog-detail {
          background: #ffffff;
          padding: 48px 16px 96px;
          color: #0f172a;
        }

        .blog-detail-article {
          max-width: 800px;
          margin: 0 auto;
        }

        .blog-detail-loading {
          min-height: 60vh;
          display: grid;
          place-items: center;
          color: #64748b;
          font-family: 'Manrope', 'Avenir Next', 'Trebuchet MS', sans-serif;
        }

        .blog-detail-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #0f766e;
          font-weight: 600;
          text-decoration: none;
          margin-bottom: 24px;
        }

        .blog-detail-header h1 {
          font-family: 'Newsreader', 'Iowan Old Style', 'Palatino Linotype', serif;
          font-size: clamp(2.4rem, 4vw, 3.4rem);
          line-height: 1.1;
          margin: 12px 0 16px;
        }

        .blog-detail-category {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.7rem;
          font-weight: 700;
          color: #0f766e;
          margin: 0;
        }

        .blog-detail-meta {
          display: flex;
          gap: 12px;
          align-items: center;
          font-size: 0.9rem;
          color: #64748b;
          font-family: 'Manrope', 'Avenir Next', 'Trebuchet MS', sans-serif;
          margin-bottom: 24px;
        }

        .blog-detail-dot {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #94a3b8;
        }

        .blog-detail-cover {
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          background: #e2e8f0;
        }

        .blog-detail-cover img {
          width: 100%;
          height: auto;
          display: block;
        }

        .blog-detail-content {
          margin-top: 32px;
          font-family: 'Manrope', 'Avenir Next', 'Trebuchet MS', sans-serif;
          font-size: 1.05rem;
          line-height: 1.8;
          color: #1f2937;
        }

        .blog-detail-content h1,
        .blog-detail-content h2,
        .blog-detail-content h3 {
          font-family: 'Newsreader', 'Iowan Old Style', 'Palatino Linotype', serif;
          color: #0f172a;
          margin-top: 2.2rem;
          margin-bottom: 1rem;
        }

        .blog-detail-content p {
          margin: 0 0 1.4rem;
        }

        .blog-detail-content ul,
        .blog-detail-content ol {
          margin: 0 0 1.5rem 1.5rem;
          padding: 0;
        }

        .blog-detail-content li {
          margin-bottom: 0.6rem;
        }

        .blog-detail-content img {
          display: block;
          max-width: 100%;
          border-radius: 12px;
          margin: 2rem auto;
        }

        .blog-detail-content a {
          color: #0f766e;
          text-decoration: underline;
        }

        .blog-detail-cta {
          margin-top: 40px;
        }

        .blog-detail-faq {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid rgba(15, 23, 42, 0.1);
        }

        .blog-detail-faq h2 {
          font-family: 'Newsreader', 'Iowan Old Style', 'Palatino Linotype', serif;
          font-size: 1.8rem;
          margin-bottom: 20px;
        }

        .blog-detail-faq-item {
          margin-bottom: 18px;
        }

        .blog-detail-faq-item h3 {
          margin: 0 0 8px 0;
          font-size: 1.05rem;
          color: #0f172a;
        }

        .blog-detail-faq-item p {
          margin: 0;
          color: #475569;
          line-height: 1.7;
        }

        .blog-detail-cta-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 28px;
          border-radius: 999px;
          background: #0f172a;
          color: #ffffff;
          font-weight: 600;
          text-decoration: none;
          font-family: 'Manrope', 'Avenir Next', 'Trebuchet MS', sans-serif;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .blog-detail-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 22px rgba(15, 23, 42, 0.2);
        }

        .blog-related {
          max-width: 1000px;
          margin: 72px auto 0;
          padding: 0 16px;
        }

        .blog-related h2 {
          font-family: 'Newsreader', 'Iowan Old Style', 'Palatino Linotype', serif;
          font-size: 2rem;
          margin-bottom: 24px;
        }

        .blog-related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .blog-related-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-decoration: none;
          color: inherit;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .blog-related-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 38px rgba(15, 23, 42, 0.12);
        }

        .blog-related-card img {
          width: 100%;
          height: 140px;
          object-fit: cover;
          display: block;
        }

        .blog-related-placeholder {
          height: 140px;
          background: linear-gradient(135deg, rgba(15, 118, 110, 0.2), rgba(15, 23, 42, 0.05));
        }

        .blog-related-card p {
          padding: 0 16px 18px;
          margin: 0;
          font-family: 'Manrope', 'Avenir Next', 'Trebuchet MS', sans-serif;
          font-weight: 600;
          color: #0f172a;
        }

        @media (max-width: 640px) {
          .blog-detail {
            padding-top: 32px;
          }
        }
      `}</style>
    </div>
  );
};
