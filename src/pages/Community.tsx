import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { applySeoMeta } from '../utils/seo';

const PAGE_SIZE = 9;

type BlogRow = {
  id: string;
  slug: string | null;
  title: string | null;
  description?: string | null;
  meta_description?: string | null;
  meta_title?: string | null;
  content?: string | null;
  category?: string | null;
  author_name?: string | null;
  cover_image?: string | null;
  image_url?: string | null;
  published?: boolean | null;
  published_at?: string | null;
  created_at?: string | null;
};

type BlogCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  authorName: string;
  coverImage: string;
  publishedAt: string;
  metaTitle: string;
  metaDescription: string;
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const formatDate = (value?: string) => {
  if (!value) return 'Unpublished';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unpublished';
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
};

const normalizeBlogRow = (row: BlogRow): BlogCard => {
  const title = row.title?.trim() || 'Untitled story';
  const descriptionSource = row.description || row.meta_description || stripHtml(row.content || '');
  const description = descriptionSource.trim().slice(0, 220);
  const category = row.category?.trim() || 'General';
  const authorName = row.author_name?.trim() || 'Workshour Editorial';
  const coverImage = row.cover_image || row.image_url || '';
  const publishedAt = row.published_at || row.created_at || '';

  return {
    id: row.id,
    slug: row.slug?.trim() || row.id,
    title,
    description,
    category,
    authorName,
    coverImage,
    publishedAt,
    metaTitle: row.meta_title?.trim() || title,
    metaDescription: row.meta_description?.trim() || description,
  };
};

export const Community = () => {
  const [blogs, setBlogs] = useState<BlogCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  const fetchCategories = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('blogs')
        .select('category')
        .eq('published', true);

      if (fetchError) throw fetchError;

      const unique = new Set<string>();
      (data || []).forEach((row: { category?: string | null }) => {
        const value = row.category?.trim();
        if (value) unique.add(value);
      });
      setCategories(Array.from(unique));
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, []);

  const fetchBlogs = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (!isSupabaseConfigured || !supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const from = (targetPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const normalizedQuery = query.trim();

        let builder = supabase
          .from('blogs')
          .select('*', { count: 'exact' })
          .eq('published', true)
          .order('published_at', { ascending: false })
          .range(from, to);

        if (normalizedQuery) {
          builder = builder.ilike('title', `%${normalizedQuery}%`);
        }

        if (category !== 'All') {
          builder = builder.eq('category', category);
        }

        const { data, error: fetchError, count } = await builder;
        if (fetchError) throw fetchError;

        const normalized = (data || []).map((row: BlogRow) => normalizeBlogRow(row));
        setBlogs((prev) => (replace ? normalized : [...prev, ...normalized]));

        const total = count ?? normalized.length + (replace ? 0 : (targetPage - 1) * PAGE_SIZE);
        setHasMore(from + normalized.length < total);
      } catch (err) {
        console.error('Error loading blogs:', err);
        setError('Unable to load blog posts right now.');
      } finally {
        setLoading(false);
      }
    },
    [category, query]
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    applySeoMeta(
      'Community Blog | Workshour',
      'Discover career insights, hiring trends, and job search advice from the Workshour community.',
      '/community',
      { ogType: 'website' }
    );
  }, []);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setBlogs([]);
  }, [query, category]);

  useEffect(() => {
    void fetchBlogs(page, page === 1);
  }, [page, fetchBlogs]);

  const categoryOptions = useMemo(() => ['All', ...categories], [categories]);

  return (
    <div className="community-blog">
      <section className="blog-hero">
        <div className="blog-hero-inner">
          <p className="blog-eyebrow">Workshour Community</p>
          <h1>Stories, strategies, and career moves that matter.</h1>
          <p className="blog-hero-sub">
            Explore expert-led articles, hiring insights, and practical guidance to level up your career.
          </p>
          <div className="blog-filters">
            <div className="blog-search">
              <input
                type="search"
                placeholder="Search by title"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search blog posts by title"
              />
            </div>
            <div className="blog-category">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter blog posts by category"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="blog-list">
        {error ? <div className="blog-empty">{error}</div> : null}
        {!error && !loading && blogs.length === 0 ? (
          <div className="blog-empty">No stories found. Try another search or category.</div>
        ) : null}

        <div className="blog-grid">
          {blogs.map((blog) => (
            <Link key={blog.id} to={`/community/${blog.slug}`} className="blog-card">
              <div className="blog-card-image">
                {blog.coverImage ? (
                  <img
                    src={blog.coverImage}
                    alt={blog.title}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={360}
                  />
                ) : (
                  <div className="blog-card-placeholder" aria-hidden="true" />
                )}
              </div>
              <div className="blog-card-body">
                <div className="blog-card-meta">
                  <span>{blog.category}</span>
                  <span className="blog-card-dot" aria-hidden="true" />
                  <span>{formatDate(blog.publishedAt)}</span>
                </div>
                <h3>{blog.title}</h3>
                <p>{blog.description}</p>
                <div className="blog-card-author">By {blog.authorName}</div>
              </div>
            </Link>
          ))}
        </div>

        {loading ? <div className="blog-loading">Loading stories...</div> : null}

        {!loading && hasMore ? (
          <button
            className="blog-load-more"
            onClick={() => setPage((prev) => prev + 1)}
            type="button"
          >
            Load more stories
          </button>
        ) : null}
      </section>

      <style>{`
        .community-blog {
          background: linear-gradient(180deg, #f6f4ef 0%, #ffffff 35%, #ffffff 100%);
          min-height: 100vh;
          color: #111827;
        }

        .blog-hero {
          padding: 72px 20px 32px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          background: radial-gradient(circle at top left, rgba(17, 148, 112, 0.08), transparent 55%);
        }

        .blog-hero-inner {
          max-width: 1100px;
          margin: 0 auto;
        }

        .blog-eyebrow {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          color: #0f766e;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .blog-hero h1 {
          font-family: 'Newsreader', 'Iowan Old Style', 'Palatino Linotype', serif;
          font-size: clamp(2.4rem, 5vw, 3.8rem);
          line-height: 1.1;
          margin: 0 0 18px 0;
          font-weight: 600;
        }

        .blog-hero-sub {
          font-family: 'Manrope', 'Avenir Next', 'Trebuchet MS', sans-serif;
          font-size: 1.05rem;
          max-width: 640px;
          color: #475569;
          margin-bottom: 28px;
        }

        .blog-filters {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 16px;
          align-items: center;
        }

        .blog-search input,
        .blog-category select {
          width: 100%;
          padding: 12px 16px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #fff;
          font-family: 'Manrope', 'Avenir Next', 'Trebuchet MS', sans-serif;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .blog-search input:focus,
        .blog-category select:focus {
          border-color: rgba(15, 118, 110, 0.55);
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
        }

        .blog-list {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }

        .blog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 28px;
        }

        .blog-card {
          display: flex;
          flex-direction: column;
          border-radius: 18px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
          text-decoration: none;
          color: inherit;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .blog-card:hover {
          transform: translateY(-6px);
          border-color: rgba(13, 148, 136, 0.35);
          box-shadow: 0 28px 60px rgba(15, 23, 42, 0.15);
        }

        .blog-card-image {
          height: 190px;
          background: #e2e8f0;
          position: relative;
        }

        .blog-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .blog-card-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.15), rgba(15, 23, 42, 0.05));
        }

        .blog-card-body {
          padding: 20px 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .blog-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #0f766e;
          font-weight: 600;
        }

        .blog-card-dot {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #0f766e;
        }

        .blog-card h3 {
          font-family: 'Newsreader', 'Iowan Old Style', 'Palatino Linotype', serif;
          font-size: 1.4rem;
          margin: 0;
          color: #0f172a;
          font-weight: 600;
        }

        .blog-card p {
          margin: 0;
          color: #475569;
          line-height: 1.6;
          font-size: 0.95rem;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }

        .blog-card-author {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1f2937;
        }

        .blog-loading,
        .blog-empty {
          text-align: center;
          padding: 32px 0;
          color: #64748b;
          font-family: 'Manrope', 'Avenir Next', 'Trebuchet MS', sans-serif;
        }

        .blog-load-more {
          margin: 32px auto 0;
          display: block;
          background: #0f172a;
          color: #fff;
          border: none;
          padding: 12px 28px;
          border-radius: 999px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Manrope', 'Avenir Next', 'Trebuchet MS', sans-serif;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .blog-load-more:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.18);
        }

        @media (max-width: 900px) {
          .blog-filters {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .blog-hero {
            padding: 56px 16px 24px;
          }

          .blog-list {
            padding: 32px 16px 64px;
          }
        }
      `}</style>
    </div>
  );
};
