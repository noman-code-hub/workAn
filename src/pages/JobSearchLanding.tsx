import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, MapPin, Sparkles, Building2, Briefcase, 
  Users, TrendingUp, Heart, ChevronRight, Quote,
  MessageSquare,
  Globe, LayoutGrid, Filter, Bookmark,
  ArrowRight, Zap, Award, CheckCircle2, Star, Smile, CheckCheck, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useResumeTemplate } from '../hooks/useResumeTemplate';
import { fetchAggregatedJobs } from '../services/jobSearchService';
import type { AggregatedJob } from '../types/jobSearch';

const JOB_CATEGORIES = [
  { name: 'Real Estate', icon: <Building2 className="cat-icon" />, count: '1,200 jobs' },
  { name: 'Recruitment Agencies', icon: <Users className="cat-icon" />, count: '850 jobs' },
  { name: 'Remote', icon: <Globe className="cat-icon" />, count: '2,400 jobs' },
  { name: 'Technology', icon: <Zap className="cat-icon" />, count: '3,100 jobs' },
  { name: 'Healthcare', icon: <Heart className="cat-icon" />, count: '1,800 jobs' },
  { name: 'Finance', icon: <Award className="cat-icon" />, count: '950 jobs' },
  { name: 'Engineering', icon: <Briefcase className="cat-icon" />, count: '1,400 jobs' },
  { name: 'Other', icon: <LayoutGrid className="cat-icon" />, count: '500 jobs' },
];

const TESTIMONIALS = [
  {
    name: 'Ayesha Khan',
    role: 'Software Engineer @ Google',
    quote: "Hirevo's AI matching is truly next-level. I landed an interview within 3 days of creating my profile.",
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  },
  {
    name: 'Faisal Ahmed',
    role: 'Sr. Product Manager',
    quote: "The ease of use and quality of job matches is better than any other platform I've used.",
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  },
  {
    name: 'Mina Ali',
    role: 'UX Designer',
    quote: "As a designer, I appreciate the clean UI. The application process is seamless and very intuitive.",
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
  },
  {
    name: 'Omar Shah',
    role: 'Data Scientist',
    quote: "The personalized job recommendations are spot on. It saved me hours of manual searching.",
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  },
];

type BlogRow = {
  id: string;
  slug: string | null;
  title: string | null;
  description?: string | null;
  meta_description?: string | null;
  content?: string | null;
  category?: string | null;
  author_name?: string | null;
  cover_image?: string | null;
  image_url?: string | null;
  tags?: string[] | null;
  featured?: boolean | null;
  published_at?: string | null;
  created_at?: string | null;
};

type BlogPreview = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  authorName: string;
  coverImage: string;
  publishedAt: string;
  readTime: string;
  isFeatured: boolean;
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const formatDate = (value?: string) => {
  if (!value) return 'Unpublished';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unpublished';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const estimateReadTime = (content: string) => {
  const text = stripHtml(content || '');
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  if (!wordCount) return '';
  const minutes = Math.max(2, Math.round(wordCount / 200));
  return `${minutes} min read`;
};

const normalizeBlogPreview = (row: BlogRow): BlogPreview => {
  const title = row.title?.trim() || 'Untitled story';
  const descriptionSource = row.description || row.meta_description || stripHtml(row.content || '');
  const description = descriptionSource.trim().slice(0, 160);
  const category = row.category?.trim() || 'General';
  const authorName = row.author_name?.trim() || 'Workshour Editorial';
  const coverImage = row.cover_image || row.image_url || '';
  const publishedAt = row.published_at || row.created_at || '';
  const readTime = estimateReadTime(row.content || row.meta_description || '');
  const tags = Array.isArray(row.tags) ? row.tags : [];
  const isFeaturedTag = tags.some((tag) => tag.trim().toLowerCase() === 'featured');
  const isFeatured = Boolean(row.featured) || isFeaturedTag;

  return {
    id: row.id,
    slug: row.slug?.trim() || '',
    title,
    description,
    category,
    authorName,
    coverImage,
    publishedAt,
    readTime,
    isFeatured,
  };
};

const BLOG_FALLBACKS: BlogPreview[] = [
  {
    id: 'fallback-1',
    slug: '',
    title: 'How to Master Your Next Interview',
    description: 'Top 10 tips from hiring managers at Fortune 500 companies.',
    publishedAt: 'March 15, 2024',
    coverImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=600&q=80',
    category: 'Career Tips',
    readTime: '6 min read',
    authorName: 'Workshour Editorial',
    isFeatured: true,
  },
  {
    id: 'fallback-2',
    slug: '',
    title: 'Modernizing Your Resume for AI Screening',
    description: 'Learn how to make your resume pass ATS filters with expert-backed techniques.',
    publishedAt: 'March 12, 2024',
    coverImage: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
    category: 'AI & Tech',
    readTime: '4 min read',
    authorName: 'Workshour Editorial',
    isFeatured: false,
  },
  {
    id: 'fallback-3',
    slug: '',
    title: 'Remote Work: The New Normal',
    description: 'Why leading companies are permanently embracing distributed teams in 2024.',
    publishedAt: 'March 10, 2024',
    coverImage: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&w=600&q=80',
    category: 'Remote Work',
    readTime: '5 min read',
    authorName: 'Workshour Editorial',
    isFeatured: false,
  },
];

const RECOMMENDED_JOBS = [
  { id: 1, title: 'Senior Software Engineer', company: 'Google', location: 'Remote', salary: '$140k–$175k', type: 'Full-time', posted: '2h ago', logo: 'G', logoImg: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg', color: '#4285F4' },
  { id: 2, title: 'Product Designer', company: 'Meta', location: 'London, UK', salary: '$110k–$140k', type: 'Hybrid', posted: '5h ago', logo: 'M', logoImg: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg', color: '#0081FB' },
  { id: 3, title: 'Data Analyst', company: 'Amazon', location: 'Seattle, WA', salary: '$95k–$120k', type: 'Full-time', posted: '1d ago', logo: 'A', logoImg: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg', color: '#FF9900' },
  { id: 4, title: 'Marketing Specialist', company: 'Apple', location: 'California, US', salary: '$105k–$130k', type: 'On-site', posted: '3h ago', logo: 'A', logoImg: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', color: '#555' },
  { id: 5, title: 'DevOps Engineer', company: 'Microsoft', location: 'Remote', salary: '$125k–$155k', type: 'Remote', posted: '8h ago', logo: 'M', logoImg: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg', color: '#00A4EF' },
];


export const JobSearchLanding = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');

  const [featuredJobs, setFeaturedJobs] = useState<AggregatedJob[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [latestBlogs, setLatestBlogs] = useState<BlogPreview[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [blogsLoaded, setBlogsLoaded] = useState(false);
  const blogScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchAggregatedJobs({
      keyword: '',
      location: '',
      remote: false,
      salaryMin: 0,
      page: 1,
      limit: 9
    }).then(res => {
      if (mounted) setFeaturedJobs(res.results || []);
    }).catch(console.error)
    .finally(() => {
      if (mounted) setFeaturedLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadLatestBlogs = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (mounted) setBlogsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .eq('published', true)
          .order('published_at', { ascending: false })
          .limit(8);

        if (error) throw error;
        const normalized = (data || []).map((row: BlogRow) => normalizeBlogPreview(row));
        if (mounted) setLatestBlogs(normalized);
        if (mounted) setBlogsLoaded(true);
      } catch (err) {
        console.error('Failed to load latest blogs:', err);
      } finally {
        if (mounted) setBlogsLoading(false);
      }
    };

    void loadLatestBlogs();
    return () => {
      mounted = false;
    };
  }, []);

  const { templates, templateLoading } = useResumeTemplate(undefined, { autoSelectFirst: false });
  const showcaseTemplates = useMemo(() => {
    return templates.filter((t) => t.thumbnailUrl).slice(0, 3);
  }, [templates]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (location) params.set('location', location);
    navigate(`/jobs/results?${params.toString()}`);
  };

  const blogCards = latestBlogs.length > 0 ? latestBlogs : (blogsLoaded ? [] : BLOG_FALLBACKS);

  const handleBlogScroll = (direction: 'left' | 'right') => {
    if (!blogScrollRef.current) return;
    const scrollAmount = direction === 'left' ? -360 : 360;
    blogScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="jsl">

      {/* Hero Section */}
      <header className="jsl-hero">
        <div className="jsl-hero-bg">
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
          
          {/* Floating Avatars representing users/candidates */}
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" alt="User" className="hero-avatar ha-1" />
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" alt="User" className="hero-avatar ha-2" />
          <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80" alt="User" className="hero-avatar ha-3" />
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80" alt="User" className="hero-avatar ha-4" />
        </div>
        <div className="jsl-hero-content">
          <div className="hero-badge">
            <Sparkles size={12} /> AI-Powered Matching
          </div>
          <h1>Find the job that <span>fits you perfectly.</span></h1>
          <p className="hero-sub">
            Search thousands of jobs. Get matched by skills, location, and experience. Apply in one click.
          </p>
          

          <div className="jsl-search-box">
            <div className="search-field">
              <Search className="field-icon" size={20} />
              <input 
                type="text" 
                placeholder="Job title, skills, or keywords" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="search-divider"></div>
            <div className="search-field">
              <MapPin className="field-icon" size={20} />
              <input 
                type="text" 
                placeholder="City, state, or remote" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <button className="jsl-search-btn" onClick={handleSearch}>Search Jobs</button>
          </div>

          <div className="jsl-hero-popular">
            <span>Popular:</span>
            <div className="chips">
              <button onClick={() => { setSearchQuery('Remote Engineer'); navigate('/jobs/results?q=Remote Engineer'); }}>Remote Engineer</button>
              <button onClick={() => { setSearchQuery('Product Manager'); navigate('/jobs/results?q=Product Manager'); }}>Product Manager</button>
              <button onClick={() => { setSearchQuery('Data Scientist'); navigate('/jobs/results?q=Data Scientist'); }}>Data Scientist</button>
            </div>
          </div>

          <div className="jsl-hero-stats">
            <div className="stat-item">
              <div className="stat-icon"><Briefcase size={18} /></div>
              <div className="stat-text"><strong>28,000+</strong> active jobs</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><CheckCircle2 size={18} /></div>
              <div className="stat-text"><strong>98%</strong> placement rate</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><Building2 size={18} /></div>
              <div className="stat-text"><strong>1,200+</strong> top companies</div>
            </div>
          </div>
        </div>

        {/* Company Logo Strip */}
        <div className="jsl-logo-strip">
          <p>Trusted by world-class teams</p>
          <div className="logo-strip-inner">
            <img src="/trusted-logos.svg" alt="Trusted Companies" />
          </div>
        </div>
      </header>

      {/* Resume Banner CTA */}
      <section className="jsl-section" style={{ paddingBottom: '0' }}>
        <div className="resume-banner-cta">
          <div className="rb-content">
            <h2>Join over <span>56,693</span><br />resume makers</h2>
            <p>Start now and get hired faster.</p>
            <button 
              className="rb-btn" 
              onClick={() => navigate('/resume-builder')}
            >
              Create my resume
            </button>
          </div>
          
          <div className="rb-visual">
            <div className="rb-person-container">
              <div className="rb-image-card">
                <img src="/resume-banner-person.jpg" alt="Smiling person" />
              </div>
              <div className="rb-smile"><Smile size={32} color="#17c9b0" strokeWidth={2.5} /></div>
              <div className="rb-checks"><CheckCheck size={28} color="#17c9b0" strokeWidth={2.5} /></div>
            </div>
            
            <svg className="rb-connectors" width="60" height="224" viewBox="0 0 60 224" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 112 C 30 112, 30 32, 55 32" stroke="#17c9b0" strokeWidth="1.5" fill="none" opacity="0.6" />
              <path d="M48 27 L 55 32 L 48 37" stroke="#17c9b0" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
              
              <path d="M0 112 L 55 112" stroke="#17c9b0" strokeWidth="1.5" fill="none" opacity="0.6" />
              <path d="M48 107 L 55 112 L 48 117" stroke="#17c9b0" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
              
              <path d="M0 112 C 30 112, 30 192, 55 192" stroke="#17c9b0" strokeWidth="1.5" fill="none" opacity="0.6" />
              <path d="M48 187 L 55 192 L 48 197" stroke="#17c9b0" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </svg>

            <div className="rb-logos">
              <div className="rb-logo-box">
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg" alt="Amazon" />
              </div>
              <div className="rb-logo-box">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" />
              </div>
              <div className="rb-logo-box">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg" alt="Airbnb" className="airbnb-logo" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resume Showcase Section */}
      <section className="resume-showcase-section">
        <div className="rs-container">
          <div className="rs-categories">
            <button className="rs-pill active">All</button>
            <button className="rs-pill">Doctor</button>
            <button className="rs-pill">Architect</button>
            <button className="rs-pill">Civil Engineer</button>
            <button className="rs-pill">Driver</button>
            <button className="rs-pill">Teacher</button>
            <button className="rs-pill">Accountant</button>
            <button className="rs-pill">Retail</button>
            <button className="rs-pill">Human Resources</button>
            <button className="rs-pill">Administrative</button>
            <button className="rs-pill">Student</button>
            <button className="rs-pill">Legal</button>
            <button className="rs-chevron"><ChevronRight size={18} /></button>
          </div>

          <div className="rs-content-wrapper">
            <div className="rs-text-content">
              <h2>Get the interview with professional resume examples</h2>
              <p>Impress employers and recruiters. Choose from hundreds of professionally-designed resume examples. Download to Word or PDF.</p>
              <button 
                className="rs-btn-primary" 
                onClick={() => navigate('/resume-builder')}
              >
                See all resume examples
              </button>
              
              <div className="rs-trustpilot">
                <div className="stars">
                  <Star size={18} fill="#17c9b0" color="#17c9b0" />
                  <Star size={18} fill="#17c9b0" color="#17c9b0" />
                  <Star size={18} fill="#17c9b0" color="#17c9b0" />
                  <Star size={18} fill="#17c9b0" color="#17c9b0" />
                  <Star size={18} fill="#17c9b0" color="#17c9b0" />
                  <span className="rating">4.8 out of 5</span>
                </div>
                <p>based on 56,282 reviews on <strong>Trustpilot</strong></p>
              </div>
            </div>

            <div className="rs-templates">
              {templateLoading || showcaseTemplates.length < 3 ? (
                <>
                  <div className="rs-template-card t-left">
                     <img src="https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?auto=format&fit=crop&w=400&q=80" alt="Resume Placeholder" />
                  </div>
                  <div className="rs-template-card t-center">
                     <img src="https://images.unsplash.com/photo-1586282391129-76a6df230234?auto=format&fit=crop&w=400&q=80" alt="Resume Placeholder" />
                  </div>
                  <div className="rs-template-card t-right">
                     <img src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400&q=80" alt="Resume Placeholder" />
                  </div>
                </>
              ) : (
                <>
                  <div className="rs-template-card t-left">
                     <img src={showcaseTemplates[0]?.thumbnailUrl} alt={showcaseTemplates[0]?.name} />
                  </div>
                  <div className="rs-template-card t-center">
                     <img src={showcaseTemplates[1]?.thumbnailUrl} alt={showcaseTemplates[1]?.name} />
                  </div>
                  <div className="rs-template-card t-right">
                     <img src={showcaseTemplates[2]?.thumbnailUrl} alt={showcaseTemplates[2]?.name} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Jobs For You */}
      <section className="jsl-section">
        <div className="section-header">
          <h2>Jobs For You</h2>
          <button className="view-all">View all <ChevronRight size={16} /></button>
        </div>
        <div className="jsl-job-scroll">
          {RECOMMENDED_JOBS.map(job => (
            <div key={job.id} className="jsl-job-card-h">
              <div className="job-logo-box" style={{ background: job.logoImg ? '#fff' : job.color + '15', color: job.color, border: job.logoImg ? '1px solid var(--border)' : 'none' }}>
                {job.logoImg ? <img src={job.logoImg} alt={job.company} style={{ width: '28px', height: '28px', objectFit: 'contain' }} /> : job.logo}
              </div>
              <div className="job-info">
                <h3>{job.title}</h3>
                <p className="company">{job.company}</p>
                <div className="meta">
                  <span><MapPin size={12} /> {job.location}</span>
                  <span><TrendingUp size={12} /> {job.posted}</span>
                </div>
                <div className="card-h-footer">
                  <span className="salary">{job.salary}</span>
                  <span className="type-pill">{job.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Explore Categories */}
      <section className="jsl-section">
        <div className="section-header">
          <h2>Explore Categories</h2>
        </div>
        <div className="jsl-cat-grid">
          {JOB_CATEGORIES.map(cat => (
            <div key={cat.name} className="jsl-cat-card">
              <div className="cat-icon-wrap">{cat.icon}</div>
              <h3>{cat.name}</h3>
              <p>{cat.count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Success Stories */}
      <section className="jsl-section jsl-testimonials">
        <div className="section-header centered">
          <span className="badge">Success Stories</span>
          <h2>Real people. Real careers.</h2>
          <p>Read how our platform helped thousands land their dream roles.</p>
        </div>
        <div className="jsl-testi-scroll-wrapper">
          <div className="jsl-testi-scroll">
            {[...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
              <div key={t.name + idx} className="jsl-testi-card">
                <div className="quote-icon"><Quote size={40} /></div>
                <div className="star-row">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />)}
                </div>
                <p className="quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="author">
                  <img src={t.avatar} alt={t.name} />
                  <div className="author-meta">
                    <strong>{t.name} <CheckCircle2 size={14} color="#22c55e" style={{display:'inline',verticalAlign:'middle'}} /></strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Live Jobs */}
      <section className="jsl-section jsl-featured">
        <div className="section-header">
          <h2>All Live Jobs</h2>
          <div className="filters-mini">
            <div className="filter-input">
              <Search size={14} />
              <input type="text" placeholder="Job title..." />
            </div>
            <select><option>Location</option></select>
            <select><option>Industry</option></select>
            <select><option>Job Type</option></select>
            <button className="filter-btn"><Filter size={16} /> Filters</button>
          </div>
        </div>
        <div className="jsl-job-grid">
          {featuredLoading ? (
            <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '40px', color: '#64748b' }}>
              Loading real jobs...
            </div>
          ) : featuredJobs.length === 0 ? (
            <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '40px', color: '#64748b' }}>
              No jobs found.
            </div>
          ) : featuredJobs.map((job, idx) => {
            const letter = job.company ? job.company.charAt(0).toUpperCase() : 'J';
            const hash = Array.from(job.company || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const colors = ['#000', '#10a37f', '#635BFF', '#96BF48', '#F24E1E', '#FF5A5F', '#1DB954', '#F6821F', '#FF7A59'];
            const color = colors[hash % colors.length];
            const isFeatured = idx < 2; 
            const tags = job.tags && job.tags.length > 0 ? job.tags.slice(0, 3) : [];
            const salaryText = job.salaryText || (job.salary?.min ? `$${Math.round(job.salary.min / 1000)}k–$${Math.round(job.salary.max / 1000)}k / yr` : 'Competitive');
            const jobLocation = job.location || (job.remote ? 'Remote' : 'Anywhere');
            
            return (
              <div key={job.id} className={`jsl-job-card-v ${isFeatured ? 'featured-card' : ''}`}>
                {isFeatured && <div className="featured-ribbon">⭐ Featured</div>}
                <div className="card-top">
                  <div className="job-logo-box" style={{ background: color + '15', color: color, border: 'none' }}>
                    {letter}
                  </div>
                  <button className="save-btn"><Bookmark size={16} /></button>
                </div>
                <h3>{job.title}</h3>
                <p className="company" style={{ color: color }}>{job.company}</p>
                <div className="card-meta">
                  <span><MapPin size={14} /> {jobLocation}</span>
                  <span><Briefcase size={14} /> {job.type || 'Full-time'}</span>
                </div>
                <div className="card-salary">{salaryText}</div>
                <div className="card-tags">
                  {tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                </div>
                <div className="card-footer">
                  <button 
                    className={`apply-btn ${isFeatured ? 'apply-btn-featured' : 'apply-btn-outline'}`}
                    onClick={() => navigate(`/jobs/${encodeURIComponent(job.id)}`)}
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="jsl-load-more">
          <button className="jsl-btn-outline" onClick={() => navigate('/market-jobs')}>
            Browse All Live Jobs
          </button>
        </div>
      </section>

      {/* Blog Section */}
      <section className="jsl-section jsl-blog">
        <div className="section-header">
          <h2>Latest from Our Blog</h2>
          <div className="blog-actions">
            <div className="blog-slider-controls">
              <button
                type="button"
                className="blog-scroll-btn"
                onClick={() => handleBlogScroll('left')}
                aria-label="Scroll blog posts left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="blog-scroll-btn"
                onClick={() => handleBlogScroll('right')}
                aria-label="Scroll blog posts right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button className="view-all" onClick={() => navigate('/community')}>
              View articles <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="jsl-blog-carousel" ref={blogScrollRef}>
          {blogsLoading && latestBlogs.length === 0 ? (
            BLOG_FALLBACKS.map((post) => (
              <div key={post.id} className="jsl-blog-card is-loading" aria-hidden="true">
                <div className="blog-img" />
                <div className="blog-content">
                  <div className="blog-meta-row">
                    <span className="date">Loading...</span>
                  </div>
                  <h3>&nbsp;</h3>
                  <p>&nbsp;</p>
                  <span className="read-more">Read more <ArrowRight size={14} /></span>
                </div>
              </div>
            ))
          ) : (
            blogCards.map((post) => (
              <button
                key={post.id}
                type="button"
                className={`jsl-blog-card ${post.isFeatured ? 'featured' : ''}`}
                onClick={() => navigate(post.slug ? `/community/${post.slug}` : '/community')}
              >
                <div className="blog-img">
                  {post.coverImage ? <img src={post.coverImage} alt={post.title} loading="lazy" decoding="async" /> : null}
                  {post.isFeatured ? <span className="blog-featured">Featured</span> : null}
                  <span className="blog-category">{post.category}</span>
                </div>
                <div className="blog-content">
                  <div className="blog-meta-row">
                    <span className="date">{formatDate(post.publishedAt)}</span>
                    {post.readTime ? <span className="read-time">{post.readTime}</span> : null}
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>
                  <div className="blog-author">By {post.authorName}</div>
                  <span className="read-more">Read more <ArrowRight size={14} /></span>
                </div>
              </button>
            ))
          )}
        </div>
        {!blogsLoading && blogCards.length === 0 ? (
          <div className="jsl-blog-empty">No published blog posts yet.</div>
        ) : null}
      </section>



      {/* Floating Feedback */}
      <button className="jsl-feedback-btn">
        <MessageSquare size={18} /> Share Feedback
      </button>

      <style>{`
        .jsl {
          --primary: #17c9b0;
          --primary-dark: #0f9a87;
          --bg: #fdfdfd;
          --text: #020617;
          --muted: #64748b;
          --border: #f1f5f9;
          --card: #ffffff;
          --glow-1: rgba(34, 197, 94, 0.12);
          --glow-2: rgba(14, 165, 233, 0.12);
          
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: var(--text);
          background: var(--bg);
          overflow-x: hidden;
          letter-spacing: -0.01em;
        }


        /* BUTTONS */
        .jsl-btn-primary {
          background: var(--primary);
          color: #fff;
          padding: 10px 20px;
          border-radius: 999px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .jsl-btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); }
        .jsl-btn-ghost {
          padding: 10px 20px;
          color: var(--text);
          font-weight: 600;
        }
        .jsl-btn-outline {
          padding: 12px 24px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #fff;
          font-weight: 600;
          color: var(--text);
          transition: all 0.2s;
        }
        .jsl-btn-outline:hover { background: #f1f5f9; border-color: #cbd5e1; }

        /* HERO */
        .jsl-hero {
          padding: 100px 40px 80px;
          position: relative;
          text-align: center;
          overflow: hidden;
        }
        .jsl-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -2;
          background: #fafcff; /* Very slight cool white matching the clean tone */
        }
        .jsl-hero-bg {
          position: absolute;
          inset: 0;
          z-index: -1;
        }
        .glow {
          position: absolute;
          width: 700px;
          height: 700px;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.8;
          z-index: -1;
        }
        .glow-1 { top: -250px; left: calc(50% - 500px); background: rgba(23, 201, 176, 0.15); animation: glow-pulse 10s ease-in-out infinite; }
        .glow-2 { bottom: -200px; right: calc(50% - 500px); background: rgba(14, 165, 233, 0.12); animation: glow-pulse 10s ease-in-out infinite 5s; }
        @keyframes glow-pulse {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.8; }
          50% { transform: scale(1.1) translate(20px, 20px); opacity: 0.5; }
        }

        .hero-avatar {
          position: absolute;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #fff;
          box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.15);
          z-index: 10;
          opacity: 0;
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .ha-1 { top: 20%; left: 15%; width: 72px; height: 72px; animation-delay: 0.3s; transform: rotate(-5deg); }
        .ha-2 { top: 35%; right: 12%; width: 56px; height: 56px; animation-delay: 0.5s; transform: rotate(8deg); }
        .ha-3 { bottom: 35%; left: 10%; width: 48px; height: 48px; animation-delay: 0.7s; }
        .ha-4 { bottom: 25%; right: 18%; width: 64px; height: 64px; animation-delay: 0.9s; transform: rotate(-8deg); }
        
        @keyframes pop-in {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          background: transparent;
          border: 1px solid rgba(23, 201, 176, 0.4);
          color: var(--primary);
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }
        .hero-badge:hover {
          background: rgba(23, 201, 176, 0.05);
        }
        .jsl-hero h1 {
          font-size: clamp(3rem, 6vw, 5rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 16px;
          letter-spacing: -0.03em;
          color: #111827;
        }
        .jsl-hero h1 span { 
          color: var(--primary);
        }
        .hero-sub {
          font-size: 1.15rem;
          color: var(--muted);
          max-width: 580px;
          margin: 0 auto 40px;
          line-height: 1.6;
          font-weight: 500;
        }

        .jsl-search-box {
          max-width: 800px;
          margin: 0 auto 32px;
          background: #ffffff;
          padding: 8px;
          border-radius: 20px;
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(0, 0, 0, 0.04);
          transition: box-shadow 0.3s ease;
        }
        .jsl-search-box:focus-within {
          box-shadow: 0 15px 50px -10px rgba(23, 201, 176, 0.15);
        }
        .search-field {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px;
        }
        .field-icon { color: #cbd5e1; transition: color 0.3s; }
        .search-field:focus-within .field-icon { color: var(--primary); }
        .search-divider { width: 1px; height: 32px; background: rgba(0, 0, 0, 0.06); }
        .search-field input {
          width: 100%;
          border: none;
          outline: none;
          font-size: 1rem;
          font-weight: 500;
          color: var(--text);
          background: transparent;
        }
        .search-field input::placeholder { color: #94a3b8; font-weight: 400; }
        .jsl-search-btn {
          background: var(--primary);
          color: #fff;
          padding: 14px 28px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 1rem;
          transition: background 0.2s;
          border: none;
          cursor: pointer;
        }
        .jsl-search-btn:hover { background: var(--primary-dark); }

        .jsl-hero-popular {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 48px;
        }
        .jsl-hero-popular span { font-weight: 600; color: #64748b; font-size: 0.9rem; }
        .chips { display: flex; gap: 8px; }
        .chips button {
          background: transparent;
          border: 1px solid rgba(0,0,0,0.06);
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text);
          transition: border-color 0.2s;
        }
        .chips button:hover { border-color: var(--primary); color: var(--primary); }

        .jsl-hero-stats {
          display: flex;
          justify-content: center;
          gap: 32px;
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 16px;
        }
        .stat-icon {
          width: 32px;
          height: 32px;
          background: rgba(23, 201, 176, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }
        .stat-text { font-size: 0.85rem; color: #64748b; font-weight: 500; }
        .stat-text strong { color: #111827; font-weight: 800; }

        .jsl-logo-strip {
          margin-top: 80px;
          opacity: 0.8;
        }
        .jsl-logo-strip p {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--muted);
          margin-bottom: 24px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .logo-strip-inner {
          max-width: 800px;
          margin: 0 auto;
          overflow: hidden;
        }
        .logo-strip-inner img {
          width: 100%;
          height: auto;
          opacity: 0.5;
          filter: grayscale(1);
          transition: all 0.3s;
        }
        .logo-strip-inner img:hover { opacity: 0.8; filter: grayscale(0); }

        /* SECTION COMMON */
        .jsl-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 60px 40px;
        }
        .section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 32px;
        }
        .section-header h2 { font-size: 2rem; font-weight: 800; }
        .view-all {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--primary);
          font-weight: 700;
        }

        /* JOB SCROLL */
        .jsl-job-scroll {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          padding-bottom: 12px;
          scrollbar-width: thin;
        }
        .jsl-job-card-h {
          flex-shrink: 0;
          width: 300px;
          background: #fff;
          padding: 20px;
          border-radius: 16px;
          border: 1px solid var(--border);
          display: flex;
          gap: 16px;
          transition: all 0.3s;
          cursor: pointer;
        }
        .jsl-job-card-h:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); border-color: var(--primary); }
        .job-logo-box {
          width: 50px;
          height: 50px;
          background: #f1f5f9;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.2rem;
          color: var(--primary);
        }
        .job-info h3 { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
        .job-info .company { color: var(--muted); font-size: 0.9rem; margin-bottom: 8px; }
        .job-info .meta { display: flex; gap: 12px; color: var(--muted); font-size: 0.8rem; margin-bottom: 10px; }
        .job-info .meta span { display: flex; align-items: center; gap: 4px; }
        .card-h-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
        .salary { font-size: 0.85rem; font-weight: 700; color: var(--primary-dark); }
        .type-pill { font-size: 0.75rem; font-weight: 600; padding: 2px 10px; border-radius: 999px; background: rgba(23, 201, 176, 0.1); color: var(--primary-dark); border: 1px solid rgba(23, 201, 176, 0.3); }

        /* CATEGORIES */
        .jsl-cat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        .jsl-cat-card {
          background: #fff;
          padding: 24px;
          border-radius: 20px;
          border: 1px solid var(--border);
          transition: all 0.3s;
          cursor: pointer;
        }
        .jsl-cat-card:hover { border-color: var(--primary); background: #ffffff; transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); }
        .cat-icon-wrap {
          width: 52px;
          height: 52px;
          background: #f8fafc;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          color: var(--primary);
          transition: all 0.3s;
          border: 1px solid rgba(0,0,0,0.03);
        }
        .jsl-cat-card:hover .cat-icon-wrap { background: var(--primary); color: #fff; transform: rotate(-5deg); }
        .jsl-cat-card h3 { font-size: 1.15rem; font-weight: 700; margin-bottom: 6px; }
        .jsl-cat-card p { color: var(--muted); font-size: 0.9rem; font-weight: 500; }

        /* TESTIMONIALS */
        .section-header.centered { text-align: center; justify-content: center; flex-direction: column; align-items: center; }
        .section-header.centered h2 { margin-top: 12px; }
        .badge { background: rgba(23, 201, 176, 0.15); color: var(--primary-dark); padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; }
        .jsl-testi-scroll-wrapper {
          width: 100vw;
          margin-left: calc(-50vw + 50%); /* Break out of container to be full width */
          overflow: hidden;
          padding: 20px 0 40px;
        }
        .jsl-testi-scroll {
          display: flex;
          gap: 24px;
          width: max-content;
          padding-right: 24px; /* Exact match for the gap to make the 1/3 math perfect */
          animation: slide-testimonials 35s linear infinite;
        }
        .jsl-testi-scroll:hover {
          animation-play-state: paused;
        }
        @keyframes slide-testimonials {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333333%); }
        }
        .jsl-testi-card {
          width: 380px;
          flex-shrink: 0;
          background: #fff;
          padding: 40px;
          border-radius: 32px;
          border: 1px solid var(--border);
          position: relative;
          transition: all 0.3s;
        }
        .jsl-testi-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); border-color: var(--primary); }
        .quote-icon { color: var(--primary); opacity: 0.2; position: absolute; top: 32px; right: 32px; }
        .star-row { display: flex; gap: 3px; margin-bottom: 16px; }
        .quote { font-size: 1.05rem; font-weight: 500; color: var(--text); line-height: 1.7; margin-bottom: 28px; position: relative; z-index: 1; opacity: 0.9; }
        .author { display: flex; align-items: center; gap: 16px; }
        .author img { width: 56px; height: 56px; border-radius: 18px; object-fit: cover; border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .author-meta strong { display: block; font-size: 1rem; font-weight: 700; color: var(--text); }
        .author-meta span { color: var(--muted); font-size: 0.85rem; font-weight: 600; }

        /* FEATURED */
        .filters-mini { display: flex; gap: 12px; align-items: center; }
        .filter-input {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid var(--border);
          padding: 8px 16px;
          border-radius: 10px;
        }
        .filter-input input { border: none; outline: none; font-size: 0.9rem; width: 150px; }
        .filters-mini select {
          background: #fff;
          border: 1px solid var(--border);
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 0.9rem;
          color: var(--muted);
          outline: none;
        }
        .filter-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid var(--border);
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .jsl-job-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }
        .jsl-job-card-v {
          background: #fff;
          padding: 24px;
          border-radius: 24px;
          border: 1px solid var(--border);
          transition: all 0.3s;
        }
        .featured-card { border-color: rgba(23, 201, 176, 0.4); background: linear-gradient(135deg, #fff 0%, #f0fdfa 100%); }
        .featured-ribbon { position: absolute; top: 0; right: 0; background: linear-gradient(135deg, #17c9b0, #0f9a87); color: #fff; font-size: 0.7rem; font-weight: 800; padding: 4px 14px; border-radius: 0 24px 0 12px; letter-spacing: 0.02em; }
        .jsl-job-card-v { position: relative; background: #fff; padding: 24px; border-radius: 24px; border: 1px solid var(--border); transition: all 0.3s; overflow: hidden; }
        .card-salary { font-size: 1rem; font-weight: 800; color: var(--primary-dark); margin-bottom: 16px; }
        .jsl-job-card-v:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.06); border-color: var(--primary); }
        .card-top { display: flex; justify-content: space-between; margin-bottom: 16px; }
        .save-btn { color: var(--muted); transition: color 0.2s; }
        .save-btn:hover { color: var(--primary); }
        .jsl-job-card-v h3 { font-size: 1.2rem; font-weight: 800; margin-bottom: 4px; }
        .jsl-job-card-v .company { color: var(--primary); font-weight: 700; margin-bottom: 12px; }
        .card-meta { display: flex; gap: 16px; color: var(--muted); font-size: 0.9rem; margin-bottom: 16px; }
        .card-meta span { display: flex; align-items: center; gap: 6px; }
        .card-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .tag { background: #f1f5f9; padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: #475569; }
        .apply-btn { width: 100%; padding: 12px; border-radius: 12px; font-weight: 700; transition: all 0.2s; }
        .apply-btn-featured { background: var(--primary); color: #fff; }
        .apply-btn-featured:hover { background: var(--primary-dark); }
        .apply-btn-outline { background: transparent; border: 1.5px solid var(--border); color: var(--text); }
        .apply-btn-outline:hover { border-color: var(--primary); color: var(--primary); }
        .jsl-load-more { text-align: center; margin-top: 48px; }

        /* BLOG */
        .blog-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .blog-slider-controls {
          display: flex;
          gap: 8px;
        }
        .blog-scroll-btn {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .blog-scroll-btn:hover { border-color: var(--primary); color: var(--primary); }
        .jsl-blog-carousel {
          display: flex;
          gap: 24px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding-bottom: 6px;
          scrollbar-width: none;
        }
        .jsl-blog-carousel::-webkit-scrollbar { display: none; }
        .jsl-blog-card {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--border);
          transition: all 0.3s;
          padding: 0;
          text-align: left;
          cursor: pointer;
          font: inherit;
          min-width: 320px;
          max-width: 360px;
          scroll-snap-align: start;
        }
        .jsl-blog-card:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(0,0,0,0.08); }
        .jsl-blog-card.featured {
          border-color: rgba(23, 201, 176, 0.5);
          box-shadow: 0 18px 32px rgba(23, 201, 176, 0.18);
        }
        .blog-img { height: 220px; overflow: hidden; position: relative; background: #e5e7eb; }
        .blog-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .jsl-blog-card:hover .blog-img img { transform: scale(1.05); }
        .blog-featured {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(23, 201, 176, 0.95);
          color: #fff;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .blog-category {
          position: absolute; bottom: 12px; left: 12px;
          background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);
          color: #fff; font-size: 0.72rem; font-weight: 700;
          padding: 4px 12px; border-radius: 999px;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .blog-meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .blog-content .date { font-size: 0.8rem; color: var(--muted); font-weight: 600; }
        .read-time { font-size: 0.78rem; color: var(--muted); font-weight: 500; }
        .blog-content h3 { font-size: 1.2rem; font-weight: 800; margin-bottom: 10px; line-height: 1.4; }
        .blog-content p { color: var(--muted); font-size: 0.95rem; line-height: 1.6; margin-bottom: 20px; }
        .blog-author { font-size: 0.82rem; color: var(--muted); font-weight: 600; margin-bottom: 12px; }
        .read-more { display: flex; align-items: center; gap: 6px; color: var(--text); font-weight: 700; font-size: 0.9rem; }
        .read-more:hover { color: var(--primary); }
        .jsl-blog-empty {
          text-align: center;
          color: var(--muted);
          font-weight: 600;
          padding: 24px 0 4px;
        }
        .jsl-blog-card.is-loading { cursor: default; }
        .jsl-blog-card.is-loading .blog-img,
        .jsl-blog-card.is-loading h3,
        .jsl-blog-card.is-loading p,
        .jsl-blog-card.is-loading .blog-author,
        .jsl-blog-card.is-loading .read-more {
          background: linear-gradient(90deg, #eef2f7 25%, #f7f9fc 50%, #eef2f7 75%);
          background-size: 200% 100%;
          animation: shimmer 1.2s ease-in-out infinite;
          color: transparent;
        }
        .jsl-blog-card.is-loading .blog-img { height: 220px; }
        .jsl-blog-card.is-loading h3,
        .jsl-blog-card.is-loading p,
        .jsl-blog-card.is-loading .read-more,
        .jsl-blog-card.is-loading .blog-author { border-radius: 8px; }
        .jsl-blog-card.is-loading h3 { height: 22px; margin-bottom: 12px; }
        .jsl-blog-card.is-loading p { height: 44px; margin-bottom: 18px; }
        .jsl-blog-card.is-loading .read-more { height: 16px; width: 120px; }
        .jsl-blog-card.is-loading .blog-author { height: 14px; width: 140px; }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .jsl-footer { background: #fff; border-top: 1px solid var(--border); padding: 80px 40px 40px; }
        .jsl-footer-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.5fr 3fr; gap: 80px; margin-bottom: 60px; }
        .jsl-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .logo-icon { width: 34px; height: 34px; background: linear-gradient(135deg, #17c9b0, #0f9a87); color: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(23,201,176,0.3); }
        .jsl-logo span { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.03em; }
        .footer-brand p { color: var(--muted); margin: 20px 0 24px; line-height: 1.6; max-width: 300px; }
        .social-links { display: flex; gap: 16px; color: var(--muted); }
        .social-links svg { cursor: pointer; transition: color 0.2s; }
        .social-links svg:hover { color: var(--primary); }
        .footer-links { display: flex; justify-content: space-between; gap: 40px; }
        .link-col h4 { font-size: 1rem; font-weight: 700; margin-bottom: 20px; }
        .link-col { display: flex; flex-direction: column; gap: 12px; }
        .link-col a { color: var(--muted); font-weight: 500; transition: color 0.2s; }
        .link-col a:hover { color: var(--primary); }
        .jsl-footer-bottom { max-width: 1200px; margin: 0 auto; border-top: 1px solid var(--border); padding-top: 40px; display: flex; justify-content: space-between; align-items: center; color: var(--muted); font-size: 0.9rem; }
        .footer-bottom-links { display: flex; gap: 24px; }

        /* RESUME BANNER CTA */
        .resume-banner-cta {
          background: #f0fdfa; /* A very subtle teal tint */
          border-radius: 20px;
          padding: 60px 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }
        .rb-content {
          max-width: 450px;
        }
        .rb-content h2 {
          font-size: 3.2rem;
          font-weight: 500;
          color: #1f2937;
          line-height: 1.2;
          margin-bottom: 12px;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .rb-content h2 span {
          color: var(--primary); /* Teal mapping */
        }
        .rb-content p {
          font-size: 1.15rem;
          color: #374151;
          margin-bottom: 40px;
        }
        .rb-btn {
          background: var(--primary);
          color: #ffffff;
          font-size: 1.05rem;
          font-weight: 600;
          padding: 14px 28px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .rb-btn:hover {
          background: var(--primary-dark);
        }

        .rb-visual {
          display: flex;
          align-items: center;
          position: relative;
          margin-right: 20px;
        }
        .rb-person-container {
          position: relative;
        }
        .rb-image-card {
          width: 250px;
          height: 250px;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(23, 201, 176, 0.15); /* matching the primary color faintly */
          z-index: 2;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .rb-image-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .rb-smile {
          position: absolute;
          top: -15px;
          right: -15px;
          z-index: 3;
          background: #f0fdfa;
          border-radius: 50%;
          padding: 4px;
        }
        .rb-checks {
          position: absolute;
          bottom: 10px;
          right: -35px;
          z-index: 3;
        }
        .rb-connectors {
          margin: 0 16px;
          z-index: 1;
        }
        .rb-logos {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .rb-logo-box {
          width: 64px;
          height: 64px;
          background: #ffffff;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.04);
        }
        .rb-logo-box img {
          width: 36px;
          object-fit: contain;
        }
        .airbnb-logo { filter: invert(41%) sepia(50%) saturate(6015%) hue-rotate(331deg) brightness(97%) contrast(97%); }

        @media (max-width: 900px) {
          .resume-banner-cta {
            flex-direction: column;
            padding: 40px 24px;
            text-align: center;
            gap: 48px;
          }
          .rb-visual {
            margin-right: 0;
            transform: scale(0.9);
          }
        }

        /* RESUME SHOWCASE SECTION */
        .resume-showcase-section {
          background: #0f172a;
          padding: 80px 0;
          margin: 60px 0 0 0;
          width: 100%;
          color: #fff;
          overflow: hidden;
        }
        .rs-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
        }
        .rs-categories {
          display: flex;
          align-items: center;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 20px;
          margin-bottom: 60px;
          scrollbar-width: none;
        }
        .rs-categories::-webkit-scrollbar { display: none; }
        .rs-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 8px 20px;
          border-radius: 999px;
          font-size: 0.9rem;
          font-weight: 500;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rs-pill:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .rs-pill.active {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
          font-weight: 700;
        }
        .rs-chevron {
          background: transparent;
          border: none;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .rs-content-wrapper {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 60px;
          align-items: center;
        }
        .rs-text-content {
          max-width: 480px;
        }
        .rs-text-content h2 {
          font-size: 3rem;
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: 24px;
          letter-spacing: -0.02em;
        }
        .rs-text-content p {
          font-size: 1.1rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 32px;
        }
        .rs-btn-primary {
          background: var(--primary);
          color: #fff;
          font-size: 1.05rem;
          font-weight: 700;
          padding: 16px 32px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          margin-bottom: 48px;
        }
        .rs-btn-primary:hover {
          background: var(--primary-dark);
        }
        
        .rs-trustpilot .stars {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 8px;
        }
        .rs-trustpilot .rating {
          font-weight: 700;
          color: #fff;
          margin-left: 8px;
        }
        .rs-trustpilot p {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 0;
        }
        .rs-trustpilot strong {
          color: #fff;
        }

        .rs-templates {
          position: relative;
          height: 450px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .rs-template-card {
          position: absolute;
          width: 280px;
          height: 380px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          transition: all 0.4s ease;
          background: #fff;
        }
        .rs-template-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
        }
        .t-left {
          transform: translateX(-160px) scale(0.85);
          opacity: 0.6;
          z-index: 1;
        }
        .t-center {
          transform: translateX(0) scale(1);
          z-index: 3;
          box-shadow: 0 30px 60px -10px rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .t-right {
          transform: translateX(160px) scale(0.85);
          opacity: 0.6;
          z-index: 1;
        }
        
        @media (max-width: 900px) {
          .rs-content-wrapper {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .rs-text-content {
            max-width: 100%;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .rs-trustpilot {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .rs-templates {
            height: 350px;
            margin-top: 40px;
          }
          .t-left { transform: translateX(-100px) scale(0.8); }
          .t-right { transform: translateX(100px) scale(0.8); }
          .rs-template-card { width: 220px; height: 300px; }
        }

        /* FLOATING */
        .jsl-feedback-btn {
          position: fixed;
          bottom: 32px;
          right: 32px;
          background: #0f172a;
          color: #fff;
          padding: 12px 24px;
          border-radius: 999px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          z-index: 1000;
          transition: all 0.2s;
        }
        .jsl-feedback-btn:hover { transform: scale(1.05); background: #000; }

        /* SCROLL REVEAL ANIMATIONS */
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .jsl-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 60px 40px;
          animation: slide-up 0.6s ease both;
          animation-timeline: view();
          animation-range: entry 0% entry 25%;
        }
        .jsl-hero-content { animation: slide-up 0.8s ease 0.1s both; }

        /* SECTION HEADING ACCENT */
        .section-header h2 {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--text) 0%, #374151 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* HORIZONTAL SCROLL POLISH */
        .jsl-job-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .jsl-job-scroll::-webkit-scrollbar { display: none; }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .jsl-footer-inner { grid-template-columns: 1fr; gap: 40px; }
          .footer-links { flex-wrap: wrap; gap: 24px; }
          .jsl-hero h1 { font-size: 3rem; }
          .jsl-job-grid { grid-template-columns: repeat(2, 1fr); }
          .filters-mini { flex-wrap: wrap; }
          .jsl-blog-card { min-width: 280px; max-width: 320px; }
        }
        @media (max-width: 768px) {
          .hero-avatar { display: none; }
          .jsl-search-box { flex-direction: column; padding: 16px; border-radius: 20px; }
          .search-divider { display: none; }
          .search-field { padding: 8px 12px; }
          .jsl-hero-stats { flex-direction: column; gap: 8px; align-items: stretch; }
          .jsl-hero { padding: 60px 20px; }
          .jsl-hero h1 { font-size: 2.2rem; }
          .hero-sub { font-size: 1rem; }
          .jsl-job-card-h { width: 240px; }
          .jsl-search-btn { width: 100%; text-align: center; justify-content: center; margin-top: 8px; }
          .jsl-job-grid { grid-template-columns: 1fr; }
          .jsl-blog-card { min-width: 260px; max-width: 300px; }
          .jsl-testi-scroll-wrapper { padding: 20px 0; }
          .jsl-testi-card { width: 300px; padding: 30px; }
          .jsl-cat-grid { grid-template-columns: repeat(2, 1fr); }
          .section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .section-header h2 { font-size: 1.6rem; }
          .filters-mini { display: none; }
          .jsl-logo-strip { margin-top: 48px; }
          .jsl-hero-popular { flex-direction: column; align-items: center; gap: 12px; }
          .chips { flex-wrap: wrap; justify-content: center; }
          .jsl-feedback-btn { bottom: 16px; right: 16px; padding: 10px 18px; font-size: 0.85rem; }
          .jsl-footer { padding: 60px 20px 32px; }
          .jsl-footer-inner { gap: 32px; }
          .footer-links { gap: 20px; }
          .jsl-footer-bottom { flex-direction: column; gap: 16px; text-align: center; }
        }
        @media (max-width: 480px) {
          .jsl-cat-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .jsl-section { padding: 32px 16px; }
          .stat-item { padding: 10px 12px; }
        }
      `}</style>
    </div>
  );
};
