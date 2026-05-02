import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, MapPin, Sparkles, Building2, Briefcase,
  TrendingUp, ChevronRight, Quote,
  MessageSquare,
  Filter, Bookmark,
  ArrowRight, CheckCircle2, Star, Smile, CheckCheck, ChevronLeft,
  FileEdit, BrainCircuit, Map, MousePointerClick, UserCheck, BellRing
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useResumeTemplate } from '../hooks/useResumeTemplate';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { fetchAggregatedJobs } from '../services/jobSearchService';
import type { AggregatedJob } from '../types/jobSearch';
import { STATIC_COMMUNITY_ARTICLES } from '../data/communityArticles';

const WORKSHOUR_AUDIENCES = [
  {
    name: 'Fresh Graduates',
    icon: Sparkles,
    description:
      'Ideal for students entering the job market. They can use free resume builder and AI resume builder free tools to create professional resumes easily.',
  },
  {
    name: 'Experienced Professionals',
    icon: TrendingUp,
    description:
      'Perfect for professionals who want career growth using ATS resume builder, LinkedIn profile optimizer, and resume review service.',
  },
  {
    name: 'Employers',
    icon: Building2,
    description:
      'Helps companies find better candidates using AI job application tracker and job search CRM tools for smarter hiring.',
  },
];

const WORKSHOUR_FEATURES = [
  {
    title: 'AI Job Matching',
    icon: BrainCircuit,
    iconColor: '#8b5cf6',
    iconBg: '#ede9fe',
    description:
      'Smart system that connects users with relevant jobs by reading skills, goals, and experience to reduce guesswork and improve search quality.',
  },
  {
    title: 'Smart Resume Builder',
    icon: FileEdit,
    iconColor: '#3b82f6',
    iconBg: '#eff6ff',
    description:
      'Build an ATS friendly resume using AI resume builder guidance, stronger formatting, and role-specific language that employers can scan quickly.',
  },
  {
    title: 'Career Roadmap',
    icon: Map,
    iconColor: '#10b981',
    iconBg: '#ecfdf5',
    description:
      'Plan your next move using career management platform insights that show which skills to build and which opportunities are worth pursuing.',
  },
  {
    title: 'One-Click Apply',
    icon: MousePointerClick,
    iconColor: '#f59e0b',
    iconBg: '#fffbeb',
    description:
      'Apply faster with job application autofill, organized submissions, and a job tracker that keeps your search moving without losing momentum.',
  },
  {
    title: 'Interview Preparation',
    icon: UserCheck,
    iconColor: '#f43f5e',
    iconBg: '#fff1f2',
    description:
      'Improve performance using resume vs job description analysis so you can prepare better examples, clearer stories, and stronger answers.',
  },
  {
    title: 'Real-time Job Alerts',
    icon: BellRing,
    iconColor: '#17c9b0',
    iconBg: '#e6f9f5',
    description:
      'Stay updated with job search organizer notifications for new openings, saved searches, and follow-ups that deserve your attention.',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    title: 'Create Profile',
    icon: Sparkles,
    description:
      'Build your resume using AI resume builder tools, add your skills, and set your preferences so Workshour understands your career direction.',
  },
  {
    title: 'AI Matches You',
    icon: Search,
    description:
      'The system uses ATS resume checker logic, resume keyword checker signals, and AI job application tracker insights to suggest better matches.',
  },
  {
    title: 'Apply & Get Hired',
    icon: CheckCheck,
    description:
      'Use one-click apply and improve your resume match score so every application is faster, stronger, and easier to track from one place.',
  },
];

const TRUST_STATS = [
  { value: '10,000+', label: 'Jobs' },
  { value: '5,000+', label: 'Hired' },
  { value: '500+', label: 'Companies' },
];

const TESTIMONIALS = [
  {
    name: 'Sarah Khan',
    role: 'Marketing Specialist',
    quote: 'Workshour helped me improve my ATS friendly resume and I got interviews quickly.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  },
  {
    name: 'Ahmed Ali',
    role: 'Operations Manager',
    quote: 'Best Jobscan alternative I have used. AI cover letter generator is amazing.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  },
  {
    name: 'John Smith',
    role: 'Project Coordinator',
    quote: 'Great platform for job tracking and resume optimization.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
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
  coverImagePosition?: string;
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

const formatCompactSalary = (job: AggregatedJob) => {
  if (job.salaryText?.trim()) return job.salaryText.trim();

  const min = Number(job.salary?.min || 0);
  const max = Number(job.salary?.max || 0);
  if (!min && !max) return 'Competitive';
  if (min && max) return `$${Math.round(min / 1000)}k-$${Math.round(max / 1000)}k`;
  return `$${Math.round((max || min) / 1000)}k`;
};

const formatRelativePostedDate = (value?: string) => {
  if (!value) return 'Recently posted';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently posted';
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(value);
};

const LOGO_COLORS = ['#000', '#10a37f', '#635BFF', '#96BF48', '#F24E1E', '#FF5A5F', '#1DB954', '#F6821F', '#FF7A59'];

const getCompanyAccent = (company: string) => {
  const hash = Array.from(company || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return LOGO_COLORS[hash % LOGO_COLORS.length];
};

const getCompanyInitial = (company: string) => (company ? company.charAt(0).toUpperCase() : 'J');

const LandingJobLogo = ({
  company,
  logoUrl,
  color,
}: {
  company: string;
  logoUrl?: string | null;
  color: string;
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(logoUrl) && !imageFailed;

  return (
    <div
      className={`job-logo-box${showImage ? ' has-image' : ''}`}
      style={showImage ? undefined : { background: `${color}15`, color, border: 'none' }}
    >
      {showImage ? (
        <img
          src={logoUrl || ''}
          alt={`${company} logo`}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        getCompanyInitial(company)
      )}
    </div>
  );
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

const STATIC_BLOG_PREVIEWS: BlogPreview[] = STATIC_COMMUNITY_ARTICLES.map((article, index) => ({
  id: article.id,
  slug: article.slug,
  title: article.title,
  description: article.description,
  category: article.category,
  authorName: article.authorName,
  coverImage: article.coverImage,
  coverImagePosition: article.coverImagePosition,
  publishedAt: article.publishedAt,
  readTime: estimateReadTime(article.content),
  isFeatured: index === 0,
}));

const mergeBlogPreviews = (posts: BlogPreview[]) =>
  posts
    .filter((post) => Boolean(post.slug))
    .filter((post, index, array) => array.findIndex((item) => item.slug === post.slug) === index)
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());

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

const LANDING_FAQS = [
  {
    question: 'What is Workshour?',
    answer:
      'Workshour is an AI-powered career platform that combines job search, resume building, ATS optimization, and job tracking so users can manage their complete career workflow in one place.',
  },
  {
    question: 'How does the AI resume builder help job seekers?',
    answer:
      'The AI resume builder helps you write stronger summaries, organize experience clearly, and tailor your resume with more relevant keywords for the jobs you want.',
  },
  {
    question: 'What does the ATS resume checker do?',
    answer:
      'The ATS resume checker reviews formatting, keyword coverage, and job-description alignment so your resume is easier for applicant tracking systems and recruiters to understand.',
  },
  {
    question: 'Is Workshour useful for fresh graduates?',
    answer:
      'Yes. Fresh graduates can build a first professional resume, discover entry-level jobs, and organize applications without needing separate resume, tracking, and job-search tools.',
  },
  {
    question: 'Can Workshour track my job applications?',
    answer:
      'Workshour supports a job application tracker workflow that helps you monitor saved jobs, submitted applications, interview progress, and follow-up tasks in one dashboard.',
  },
  {
    question: 'Does Workshour help with cover letters and interview prep?',
    answer:
      'Yes. Workshour supports stronger cover letter writing, resume vs job description analysis, and interview preparation so you can apply with more confidence.',
  },
];


const CountUpStat = ({ endValue }: { endValue: string }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const numStr = endValue.replace(/[^0-9]/g, '');
  const endNum = parseInt(numStr, 10) || 0;
  const suffix = endValue.replace(/[0-9,]/g, '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          
          let startTimestamp: number | null = null;
          const duration = 2000;

          const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            
            setCount(Math.floor(easeProgress * endNum));
            
            if (progress < 1) {
              window.requestAnimationFrame(step);
            }
          };
          
          window.requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [endNum, hasAnimated]);

  return (
    <strong ref={ref}>
      {count.toLocaleString()}{suffix}
    </strong>
  );
};

export const JobSearchLanding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { templates } = useResumeTemplate(user, { autoSelectFirst: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');

  const [featuredJobs, setFeaturedJobs] = useState<AggregatedJob[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState('');
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
      limit: 12
    }).then(res => {
      if (!mounted) return;
      const nextJobs = Array.isArray(res.results) ? res.results : [];
      setFeaturedJobs(nextJobs);
      setFeaturedError('');
      window.localStorage.setItem('aggregated_jobs_recent', JSON.stringify(nextJobs.slice(0, 200)));
    }).catch((error) => {
      console.error(error);
      if (mounted) setFeaturedError(error instanceof Error ? error.message : 'Failed to load live jobs.');
    })
    .finally(() => {
      if (mounted) setFeaturedLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadLatestBlogs = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (mounted) {
          setLatestBlogs(STATIC_BLOG_PREVIEWS);
          setBlogsLoaded(true);
          setBlogsLoading(false);
        }
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
        const merged = mergeBlogPreviews([...STATIC_BLOG_PREVIEWS, ...normalized]);
        if (mounted) setLatestBlogs(merged);
        if (mounted) setBlogsLoaded(true);
      } catch (err) {
        console.error('Failed to load latest blogs:', err);
        if (mounted) {
          setLatestBlogs(STATIC_BLOG_PREVIEWS);
          setBlogsLoaded(true);
        }
      } finally {
        if (mounted) setBlogsLoading(false);
      }
    };

    void loadLatestBlogs();
    return () => {
      mounted = false;
    };
  }, []);

  const showcaseTemplates = useMemo(() => {
    return templates
      .filter((template) => template.thumbnailUrl)
      .slice(0, 3)
      .map((template) => ({
        name: template.displayName,
        thumbnailUrl: template.thumbnailUrl,
      }));
  }, [templates]);

  const jobsForYou = useMemo(() => featuredJobs.slice(0, Math.max(5, RECOMMENDED_JOBS.length)), [featuredJobs]);

  const openJobSearch = (keyword?: string, nextLocation?: string) => {
    const params = new URLSearchParams();
    if (keyword?.trim()) params.set('keyword', keyword.trim());
    if (nextLocation?.trim()) params.set('location', nextLocation.trim());
    params.set('page', '1');
    const query = params.toString();
    navigate(query ? `/job-search?${query}` : '/job-search');
  };

  const openJobApplication = (job: AggregatedJob) => {
    const applyUrl = job.url?.trim();

    if (applyUrl) {
      window.open(applyUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate(`/job-search/${encodeURIComponent(job.id)}`);
  };

  const handleSearch = () => {
    openJobSearch(searchQuery, location);
  };

  const blogCards = latestBlogs.length > 0 ? latestBlogs : (blogsLoaded ? [] : BLOG_FALLBACKS);

  const handleBlogScroll = (direction: 'left' | 'right') => {
    if (!blogScrollRef.current) return;
    const scrollAmount = direction === 'left' ? -360 : 360;
    blogScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const scriptId = 'job-search-landing-faq-jsonld';
    const canonicalUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${routeLocation.pathname}`
      : routeLocation.pathname;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: LANDING_FAQS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
      url: canonicalUrl,
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
      if (script?.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [routeLocation.pathname]);

  return (
    <div className={`jsl ${routeLocation.pathname === '/jobs' ? 'jsl-full-bleed' : ''}`}>

      {/* Hero Section */}
      <header className="jsl-hero">
        <div className="jsl-hero-bg">
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
          
          {/* Floating Avatars representing users/candidates */}
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" alt="Fresh graduate creating a Workshour profile" className="hero-avatar ha-1" />
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" alt="Experienced professional exploring AI matched jobs" className="hero-avatar ha-2" />
          <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80" alt="Job seeker improving an ATS friendly resume" className="hero-avatar ha-3" />
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80" alt="Hiring manager reviewing candidate matches on Workshour" className="hero-avatar ha-4" />
        </div>
        <div className="jsl-hero-content">
          <div className="hero-badge">
            <Sparkles size={12} /> AI-Powered Career Platform
          </div>
          <h1>Find Your Dream Job with <span>AI-Powered Career Matching</span></h1>
          <p className="hero-sub">
            Workshour is an AI-powered career platform that helps job seekers find better opportunities using smart automation. It offers tools like AI resume builder, ATS resume checker, and AI cover letter generator to improve your chances of getting hired. Whether you are a fresher or an experienced professional, Workshour helps you build a strong career path.
          </p>

          <div className="hero-actions">
            <button className="jsl-btn-primary hero-cta-primary" onClick={() => navigate('/login')}>
              Get Started Free
            </button>
            <button className="jsl-btn-outline hero-cta-secondary" onClick={() => navigate('/job-search')}>
              Browse Jobs
            </button>
          </div>

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
            <div className="chips">
              <button onClick={() => { setSearchQuery('Software Engineer'); openJobSearch('Software Engineer', location); }}>Software Engineer</button>
              <button onClick={() => { setSearchQuery('UX/UI Designer'); openJobSearch('UX/UI Designer', location); }}>UX/UI Designer</button>
              <button onClick={() => { setSearchQuery('Data Analyst'); openJobSearch('Data Analyst', location); }}>Data Analyst</button>
            </div>
          </div>

          <div className="jsl-hero-stats">
            <div className="stat-item">
              <div className="stat-icon"><Briefcase size={20} strokeWidth={2.2} /></div>
              <div className="stat-text"><strong>AI Resume Builder</strong> for ATS ready resumes</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><CheckCircle2 size={20} strokeWidth={2.2} /></div>
              <div className="stat-text"><strong>ATS Resume Checker</strong> for smarter optimization</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><Building2 size={20} strokeWidth={2.2} /></div>
              <div className="stat-text"><strong>Job Tracker</strong> for organized applications</div>
            </div>
          </div>
        </div>

        {/* Company Logo Strip */}
        <div className="jsl-logo-strip">
          <p>Trusted by job seekers and hiring teams</p>
          <div className="logo-strip-flex">
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg" alt="Microsoft" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" alt="Amazon" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg" alt="Meta" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" alt="Netflix" />
          </div>
        </div>
      </header>

      {/* Resume Banner CTA */}
      <section className="jsl-section" style={{ paddingBottom: '0' }}>
        <div className="resume-banner-cta">
          <div className="rb-content">
            <span className="section-eyebrow">Career Platform Overview</span>
            <h2>What is <span>Workshour?</span></h2>
            <p>
              Workshour is a modern career management platform designed to simplify job searching using artificial intelligence. It combines multiple tools like AI resume builder, job application tracker, and career guidance into one system. Instead of using different websites, users can manage everything in one place including resume building, job tracking, and applications.
            </p>
            <p>
              The platform also helps users improve their ATS friendly resume using ATS optimization, resume keyword scanner, and resume match score analysis. It is built for job seekers who want better visibility in hiring systems, faster job applications, and smarter career decisions. Workshour acts as a complete job search organizer and job search CRM for modern professionals.
            </p>
            <button 
              className="rb-btn" 
              onClick={() => navigate('/resume-builder')}
            >
              Explore Resume Tools
            </button>
          </div>
          
          <div className="rb-visual">
            <div className="rb-person-container">
              <div className="rb-image-card">
                <img src="/resume-banner-person.jpg" alt="Job seeker celebrating a stronger ATS friendly resume" />
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
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg" alt="Amazon employer logo" />
              </div>
              <div className="rb-logo-box">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google employer logo" />
              </div>
              <div className="rb-logo-box">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg" alt="Airbnb employer logo" className="airbnb-logo" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who Is Workshour For */}
      <section className="jsl-section">
        <div className="section-header">
          <div className="section-copy">
            <h2>Who is Workshour For?</h2>
            <p>Workshour supports job seekers at different stages and helps employers build a more organized hiring workflow with AI-powered tools.</p>
          </div>
        </div>
        <div className="jsl-cat-grid audience-grid">
          {WORKSHOUR_AUDIENCES.map((audience) => {
            const Icon = audience.icon;

            return (
              <article key={audience.name} className="jsl-cat-card audience-card">
                <div className="cat-icon-wrap"><Icon size={24} /></div>
                <h3>{audience.name}</h3>
                <p>{audience.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Resume Showcase Section */}
      <section className="resume-showcase-section">
        <div className="rs-container">
          <div className="rs-content-wrapper">
            <div className="rs-text-content">
              <h2>Build a Winning Resume with Workshour</h2>
              <p>Your resume is your first impression - make it count. Workshour's AI-powered resume builder helps you create polished, professional resumes tailored to every job description in minutes. Choose from expertly designed ATS-friendly resume templates that pass automated screening systems and capture recruiter attention instantly. Simply paste a job posting and let Workshour's intelligent engine suggest the right resume keywords, structure, and content to maximize your chances of landing an interview. Whether you're writing your first resume or refreshing an existing one, Workshour ensures every application you send is targeted, compelling, and professionally formatted.</p>
              <button 
                className="rs-btn-primary" 
                onClick={() => navigate('/resume-builder')}
              >
                See resume builder tools
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
              {showcaseTemplates.length < 3 ? (
                <>
                  <div className="rs-template-card t-left">
                     <img src="https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?auto=format&fit=crop&w=400&q=80" alt="AI resume builder dashboard interface" loading="lazy" decoding="async" />
                  </div>
                  <div className="rs-template-card t-center">
                     <img src="https://images.unsplash.com/photo-1586282391129-76a6df230234?auto=format&fit=crop&w=400&q=80" alt="ATS resume checker analyzing resume score" loading="lazy" decoding="async" />
                  </div>
                  <div className="rs-template-card t-right">
                     <img src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400&q=80" alt="Job application tracker dashboard view" loading="lazy" decoding="async" />
                  </div>
                </>
              ) : (
                <>
                  <div className="rs-template-card t-left">
                     <img src={showcaseTemplates[0]?.thumbnailUrl} alt={`Resume template preview in Workshour AI resume builder: ${showcaseTemplates[0]?.name}`} loading="lazy" decoding="async" />
                  </div>
                  <div className="rs-template-card t-center">
                     <img src={showcaseTemplates[1]?.thumbnailUrl} alt={`Resume template preview in Workshour AI resume builder: ${showcaseTemplates[1]?.name}`} loading="lazy" decoding="async" />
                  </div>
                  <div className="rs-template-card t-right">
                     <img src={showcaseTemplates[2]?.thumbnailUrl} alt={`Resume template preview in Workshour AI resume builder: ${showcaseTemplates[2]?.name}`} loading="lazy" decoding="async" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="jsl-section jsl-features">
        <div className="section-header centered">
          <span className="badge">Platform Features</span>
          <h2>Why Choose Workshour?</h2>
          <p>Workshour brings job search, resume optimization, and career planning together so you can spend less time managing tools and more time moving forward.</p>
        </div>
        <div className="feature-grid">
          {WORKSHOUR_FEATURES.map((feature) => {
            const Icon = feature.icon;

            return (
              <article key={feature.title} className="feature-card">
                <div className="feature-icon" style={{ backgroundColor: feature.iconBg, color: feature.iconColor }}>
                  <Icon size={24} strokeWidth={2.1} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="jsl-section jsl-how-it-works">
        <div className="section-header centered">
          <span className="badge">Simple Workflow</span>
          <h2>How It Works</h2>
          <p>Workshour turns a scattered job hunt into a clear process that helps you build, match, and apply with more confidence.</p>
        </div>
        <div className="how-grid">
          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const Icon = step.icon;

            return (
              <article key={step.title} className="how-card">
                <div className="how-step-top">
                  <span className="how-step-number">0{index + 1}</span>
                  <div className="feature-icon">
                    <Icon size={22} />
                  </div>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Trust Stats */}
      <section className="jsl-section jsl-trust">
        <div className="section-header centered">
          <span className="badge">Proof of Momentum</span>
          <h2>Trusted by Job Seekers</h2>
          <p>From resume creation to application tracking, Workshour helps people take practical action and stay consistent throughout the hiring journey.</p>
        </div>
        <div className="trust-stats-grid">
          {TRUST_STATS.map((stat) => (
            <article key={stat.label} className="trust-stat-card">
              <CountUpStat endValue={stat.value} />
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </section>

      {/* Jobs For You */}
      <section className="jsl-section jobs-shell jobs-shell-spotlight">
        <div className="section-header jobs-section-header">
          <div className="section-copy">
            <span className="section-eyebrow">Curated Matches</span>
            <h2>Jobs For You</h2>
            <p>Fresh roles with clear compensation, hiring signals, and faster paths to apply.</p>
          </div>
          <button className="view-all" onClick={() => navigate('/job-search')}>View all <ChevronRight size={16} /></button>
        </div>
        <div className="jsl-job-scroll">
          {featuredLoading ? (
            <div style={{ width: '100%', textAlign: 'center', padding: '32px', color: '#64748b' }}>
              Loading real jobs...
            </div>
          ) : jobsForYou.length === 0 ? (
            <div style={{ width: '100%', textAlign: 'center', padding: '32px', color: '#64748b' }}>
              {featuredError || 'No live jobs available right now.'}
            </div>
          ) : jobsForYou.map((job) => {
            const color = getCompanyAccent(job.company || '');
            const jobLocation = job.location || (job.remote ? 'Remote' : 'Anywhere');

            return (
              <button
                key={job.id}
                type="button"
                className="jsl-job-card-h"
                onClick={() => navigate(`/job-search/${encodeURIComponent(job.id)}`)}
              >
                <div className="job-card-h-top">
                  <LandingJobLogo company={job.company} logoUrl={job.logoUrl} color={color} />
                  <span className="job-card-h-badge">Recommended</span>
                </div>
                <div className="job-info">
                  <h3>{job.title}</h3>
                  <p className="company">{job.company}</p>
                  <div className="meta">
                    <span><MapPin size={12} /> {jobLocation}</span>
                    <span><TrendingUp size={12} /> {formatRelativePostedDate(job.postedDate)}</span>
                  </div>
                  <div className="card-h-footer">
                    <div className="salary-stack">
                      <span className="salary-label">Compensation</span>
                      <span className="salary">{formatCompactSalary(job)}</span>
                    </div>
                    <span className="type-pill">{job.type || (job.remote ? 'Remote' : 'Full-time')}</span>
                  </div>
                </div>
                <div className="job-card-h-cta">
                  <span>View role</span>
                  <ChevronRight size={16} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Success Stories */}
      <section className="jsl-section jsl-testimonials">
        <div className="section-header centered">
          <span className="badge">User Testimonials</span>
          <h2>What Our Users Say</h2>
          <p>Real feedback from professionals using Workshour to improve resume quality, apply faster, and organize their job search with more clarity.</p>
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
                  <img src={t.avatar} alt={`${t.name} testimonial portrait on Workshour`} />
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
      <section className="jsl-section jsl-featured jobs-shell jobs-shell-board">
        <div className="section-header jobs-section-header">
          <div className="section-copy">
            <span className="section-eyebrow">Live Hiring Board</span>
            <h2>All Live Jobs</h2>
            <p>A polished live board with role, location, employment type, pay range, and recent activity.</p>
          </div>
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
              {featuredError || 'No jobs found.'}
            </div>
          ) : featuredJobs.map((job, idx) => {
            const color = getCompanyAccent(job.company || '');
            const isFeatured = idx < 2; 
            const tags = job.tags && job.tags.length > 0 ? job.tags.slice(0, 3) : [];
            const salaryText = job.salaryText || (job.salary?.min ? `$${Math.round(job.salary.min / 1000)}k–$${Math.round(job.salary.max / 1000)}k / yr` : 'Competitive');
            const jobLocation = job.location || (job.remote ? 'Remote' : 'Anywhere');
            const displayTags = tags.length > 0 ? tags : [job.remote ? 'Remote ready' : 'Live opportunity'];
            
            return (
              <div key={job.id} className={`jsl-job-card-v ${isFeatured ? 'featured-card' : ''}`}>
                {isFeatured && <div className="featured-ribbon">Featured Pick</div>}
                <div className="card-top">
                  <div className="card-brand">
                    <LandingJobLogo company={job.company} logoUrl={job.logoUrl} color={color} />
                    <div className="card-brand-copy">
                      <span className="card-brand-label">Company</span>
                      <p className="company" style={{ color }}>{job.company}</p>
                    </div>
                  </div>
                  <button className="save-btn" type="button" aria-label={`Save ${job.title}`}>
                    <Bookmark size={16} />
                  </button>
                </div>
                <h3>{job.title}</h3>
                <div className="card-meta card-meta-grid">
                  <span><MapPin size={14} /> {jobLocation}</span>
                  <span><Briefcase size={14} /> {job.type || 'Full-time'}</span>
                  <span><TrendingUp size={14} /> {formatRelativePostedDate(job.postedDate)}</span>
                </div>
                <div className="card-bottom-row">
                  <div className="card-salary-block">
                    <span className="salary-caption">Estimated pay</span>
                    <div className="card-salary">{salaryText}</div>
                  </div>
                  <span className="job-posted-pill">{formatRelativePostedDate(job.postedDate)}</span>
                </div>
                <div className="card-tags">
                  {displayTags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                </div>
                <div className="card-footer">
                  <button 
                    className={`apply-btn ${isFeatured ? 'apply-btn-featured' : 'apply-btn-outline'}`}
                    onClick={() => openJobApplication(job)}
                  >
                    Apply Now <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="jsl-load-more">
          <button className="jsl-btn-outline" onClick={() => navigate('/job-search')}>
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
                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      loading="lazy"
                      decoding="async"
                      style={{ objectPosition: post.coverImagePosition || 'center center' }}
                    />
                  ) : null}
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

      <section className="jsl-section jsl-faq" aria-labelledby="job-search-faq-heading">
        <div className="section-header centered">
          <span className="badge">FAQ</span>
          <h2 id="job-search-faq-heading">Frequently Asked Questions</h2>
          <p>Key answers about Workshour, AI resume tools, ATS optimization, job application tracking, and how the platform supports a more organized job search.</p>
        </div>
        <div className="jsl-faq-list">
          {LANDING_FAQS.map((item) => (
            <article key={item.question} className="jsl-faq-item">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="jsl-section footer-cta-section">
        <div className="footer-cta-shell">
          <span className="section-eyebrow">Free To Start</span>
          <h2>Ready to Start Your Career Journey?</h2>
          <p>Join Workshour to build a stronger resume, discover better-fit jobs, and manage your career search with practical AI support.</p>
          <button className="rb-btn footer-cta-button" onClick={() => navigate('/login')}>
            Join Workshour Free
          </button>
        </div>
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
          padding: 25px 40px 80px;
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
          font-size: 0.76rem;
          font-weight: 700;
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }
        .hero-badge:hover {
          background: rgba(23, 201, 176, 0.05);
        }
        .jsl-hero h1 {
          font-size: clamp(2.7rem, 5.5vw, 4.6rem);
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
          font-size: 1.05rem;
          color: var(--muted);
          max-width: 580px;
          margin: 0 auto 28px;
          line-height: 1.6;
          font-weight: 500;
        }
        .hero-actions {
          display: flex;
          justify-content: center;
          gap: 14px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .hero-cta-primary,
        .hero-cta-secondary {
          min-width: 170px;
        }

        .jsl-search-box {
          max-width: 800px;
          margin: 0 auto 22px;
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
          font-size: 0.95rem;
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
          font-size: 0.95rem;
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
          margin-bottom: 32px;
        }
        .jsl-hero-popular span { font-weight: 600; color: #64748b; font-size: 0.84rem; }
        .chips { display: flex; gap: 8px; }
        .chips button {
          background: transparent;
          border: 1px solid rgba(0,0,0,0.06);
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text);
          transition: border-color 0.2s;
        }
        .chips button:hover { border-color: var(--primary); color: var(--primary); }

        .jsl-hero-stats {
          display: flex;
          justify-content: center;
          gap: 24px;
        }
        .stat-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 6px 16px;
          max-width: 240px;
        }
        .stat-icon {
          width: 36px;
          height: 36px;
          background: rgba(23, 201, 176, 0.12);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }
        .stat-text { font-size: 0.8rem; color: #64748b; font-weight: 500; line-height: 1.5; text-align: left; }
        .stat-text strong { color: #111827; font-weight: 800; }

        .jsl-logo-strip {
          margin-top: 60px;
        }
        .jsl-logo-strip p {
          font-size: 0.82rem;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 32px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .logo-strip-flex {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: clamp(24px, 5vw, 48px);
          max-width: 900px;
          margin: 0 auto;
        }
        .logo-strip-flex img {
          max-height: 28px;
          width: auto;
          max-width: 120px;
          object-fit: contain;
          opacity: 0.9;
          transition: all 0.3s ease;
        }
        .logo-strip-flex img:hover {
          opacity: 1;
          transform: translateY(-2px);
        }

        /* SECTION COMMON */
        .jsl-section {
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 60px clamp(24px, 4vw, 80px);
        }
        .section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .section-header h2 { font-size: 1.82rem; font-weight: 800; }
        .view-all {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--primary);
          font-weight: 700;
          font-size: 0.88rem;
        }
        .jobs-shell {
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          background: linear-gradient(180deg, #ffffff 0%, #fbfeff 100%);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.05);
        }
        .jobs-shell-spotlight {
          background:
            radial-gradient(circle at top left, rgba(23, 201, 176, 0.1), transparent 32%),
            linear-gradient(180deg, #ffffff 0%, #fbfffe 100%);
        }
        .jobs-shell-board {
          background:
            radial-gradient(circle at top right, rgba(14, 165, 233, 0.09), transparent 28%),
            linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        }
        .jsl.jsl-full-bleed .jsl-section.jobs-shell-board {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 60px 24px;
        }
        .jobs-section-header {
          gap: 24px;
        }
        .section-copy {
          max-width: 640px;
        }
        .section-copy p {
          margin: 10px 0 0;
          color: var(--muted);
          line-height: 1.7;
          font-size: 0.92rem;
        }
        .section-eyebrow {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(23, 201, 176, 0.1);
          color: var(--primary-dark);
          font-size: 0.66rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }

        /* JOB SCROLL */
        .jsl-job-scroll {
          display: flex;
          gap: 22px;
          overflow-x: auto;
          padding: 4px 2px 12px;
          scrollbar-width: thin;
          scroll-snap-type: x proximity;
        }
        .jsl-job-card-h {
          flex-shrink: 0;
          width: 320px;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
          padding: 22px;
          border-radius: 24px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
          gap: 18px;
          transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
          cursor: pointer;
          text-align: left;
          scroll-snap-align: start;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.05);
        }
        .jsl-job-card-h:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 42px rgba(15, 23, 42, 0.1);
          border-color: rgba(23, 201, 176, 0.45);
        }
        .job-card-h-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .job-card-h-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 12px;
          background: rgba(15, 118, 110, 0.08);
          color: #0f766e;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .job-logo-box {
          width: 56px;
          height: 56px;
          background: #f1f5f9;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1rem;
          color: var(--primary);
          overflow: hidden;
          flex-shrink: 0;
        }
        .job-logo-box.has-image {
          background: #fff;
          padding: 8px;
          border: 1px solid var(--border);
        }
        .job-logo-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .job-info h3 {
          font-size: 1.08rem;
          font-weight: 800;
          line-height: 1.45;
          margin-bottom: 6px;
        }
        .job-info .company {
          color: #334155;
          font-size: 0.86rem;
          font-weight: 700;
          margin-bottom: 14px;
        }
        .job-info .meta {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          color: var(--muted);
          font-size: 0.8rem;
          margin-bottom: 16px;
        }
        .job-info .meta span {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .card-h-footer {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-top: 6px;
          padding-top: 16px;
          border-top: 1px solid rgba(15, 23, 42, 0.08);
        }
        .salary-stack {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .salary-label {
          font-size: 0.68rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #94a3b8;
          font-weight: 700;
        }
        .salary {
          font-size: 0.94rem;
          font-weight: 800;
          color: var(--primary-dark);
        }
        .type-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(23, 201, 176, 0.1);
          color: var(--primary-dark);
          border: 1px solid rgba(23, 201, 176, 0.22);
          white-space: nowrap;
        }
        .job-card-h-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: #0f172a;
          font-size: 0.84rem;
          font-weight: 700;
          padding-top: 2px;
        }

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
        .jsl-cat-card h3 { font-size: 1.05rem; font-weight: 700; margin-bottom: 6px; }
        .jsl-cat-card p { color: var(--muted); font-size: 0.85rem; font-weight: 500; line-height: 1.7; }
        .audience-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .audience-card {
          min-height: 100%;
        }

        .feature-grid,
        .how-grid,
        .trust-stats-grid {
          display: grid;
          gap: 22px;
        }
        .feature-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .how-grid,
        .trust-stats-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .feature-card,
        .how-card,
        .trust-stat-card,
        .footer-cta-shell {
          background: linear-gradient(180deg, #ffffff 0%, #f9fffe 100%);
          border: 1px solid rgba(23, 201, 176, 0.12);
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.04);
        }
        .feature-card,
        .how-card {
          padding: 28px;
        }
        .feature-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          transition: transform 0.3s;
        }
        .feature-card:hover .feature-icon {
          transform: scale(1.05) rotate(-3deg);
        }
        .feature-card h3,
        .how-card h3 {
          font-size: 1.02rem;
          font-weight: 800;
          margin-bottom: 10px;
        }
        .feature-card p,
        .how-card p {
          color: var(--muted);
          font-size: 0.92rem;
          line-height: 1.75;
          margin: 0;
        }
        .how-step-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }
        .how-step-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          height: 42px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.04);
          color: var(--text);
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }
        .trust-stat-card {
          padding: 30px 24px;
          text-align: center;
        }
        .trust-stat-card strong {
          display: block;
          font-size: clamp(1.85rem, 3.6vw, 2.7rem);
          line-height: 1;
          color: var(--primary-dark);
          margin-bottom: 10px;
        }
        .trust-stat-card span {
          color: var(--muted);
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        /* TESTIMONIALS */
        .section-header.centered { text-align: center; justify-content: center; flex-direction: column; align-items: center; }
        .section-header.centered h2 { margin-top: 12px; }
        .badge { background: rgba(23, 201, 176, 0.15); color: var(--primary-dark); padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 0.7rem; text-transform: uppercase; }
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
        .quote { font-size: 0.96rem; font-weight: 500; color: var(--text); line-height: 1.7; margin-bottom: 28px; position: relative; z-index: 1; opacity: 0.9; }
        .author { display: flex; align-items: center; gap: 16px; }
        .author img { width: 56px; height: 56px; border-radius: 18px; object-fit: cover; border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .author-meta strong { display: block; font-size: 0.94rem; font-weight: 700; color: var(--text); }
        .author-meta span { color: var(--muted); font-size: 0.8rem; font-weight: 600; }

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
        .filter-input input { border: none; outline: none; font-size: 0.84rem; width: 150px; }
        .filters-mini select {
          background: #fff;
          border: 1px solid var(--border);
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 0.84rem;
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
          font-size: 0.84rem;
        }
        .jsl-job-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }
        .featured-card {
          border-color: rgba(23, 201, 176, 0.38);
          background: linear-gradient(180deg, #ffffff 0%, #f3fffb 100%);
        }
        .featured-ribbon {
          position: absolute;
          top: 16px;
          right: 16px;
          background: linear-gradient(135deg, #17c9b0, #0f9a87);
          color: #fff;
          font-size: 0.64rem;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 999px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          box-shadow: 0 10px 20px rgba(15, 154, 135, 0.2);
        }
        .jsl-job-card-v {
          position: relative;
          background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
          padding: 24px;
          border-radius: 28px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          overflow: hidden;
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.05);
          display: flex;
          flex-direction: column;
        }
        .jsl-job-card-v:hover {
          transform: translateY(-8px);
          box-shadow: 0 26px 56px rgba(15, 23, 42, 0.1);
          border-color: rgba(23, 201, 176, 0.45);
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
        }
        .card-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .card-brand-copy {
          min-width: 0;
        }
        .card-brand-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .save-btn {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.92);
          color: var(--muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .save-btn:hover { color: var(--primary); border-color: rgba(23, 201, 176, 0.35); background: #fff; }
        .jsl-job-card-v h3 {
          font-size: 1.16rem;
          font-weight: 800;
          line-height: 1.4;
          margin-bottom: 16px;
          max-width: calc(100% - 20px);
        }
        .jsl-job-card-v .company {
          color: var(--primary);
          font-weight: 800;
          margin: 0;
          font-size: 0.9rem;
        }
        .card-meta {
          color: var(--muted);
          font-size: 0.84rem;
        }
        .card-meta span {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .card-meta-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px 16px;
          margin-bottom: 18px;
          padding: 0px 0;
          border-top: 1px solid rgba(15, 23, 42, 0.08);
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }
        .card-bottom-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }
        .card-salary-block {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .salary-caption {
          font-size: 0.68rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #94a3b8;
          font-weight: 700;
        }
        .card-salary {
          font-size: 1rem;
          font-weight: 800;
          color: var(--primary-dark);
        }
        .job-posted-pill {
          font-size: 0.74rem;
          font-weight: 700;
          padding: 7px 12px;
          border-radius: 999px;
          background: #f8fafc;
          color: #475569;
          border: 1px solid rgba(15, 23, 42, 0.08);
          white-space: nowrap;
        }
        .card-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .tag {
          background: #f8fafc;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          border: 1px solid rgba(15, 23, 42, 0.06);
        }
        .card-footer {
          margin-top: auto;
        }
        .apply-btn {
          width: 100%;
          padding: 13px 16px;
          border-radius: 14px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .apply-btn-featured { background: var(--primary); color: #fff; }
        .apply-btn-featured:hover { background: var(--primary-dark); }
        .apply-btn-outline { background: transparent; border: 1.5px solid rgba(15, 23, 42, 0.1); color: var(--text); }
        .apply-btn-outline:hover { border-color: var(--primary); color: var(--primary); background: rgba(23, 201, 176, 0.04); }
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
          display: flex;
          flex-direction: column;
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
          color: #fff; font-size: 0.68rem; font-weight: 700;
          padding: 4px 12px; border-radius: 999px;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .blog-content {
          padding: 18px 20px 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 290px;
        }
        .blog-meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .blog-content .date { font-size: 0.76rem; color: var(--muted); font-weight: 600; }
        .read-time { font-size: 0.74rem; color: var(--muted); font-weight: 500; }
        .blog-content h3 {
          font-size: 1.08rem;
          font-weight: 800;
          margin-bottom: 10px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .blog-content p {
          color: var(--muted);
          font-size: 0.88rem;
          line-height: 1.6;
          margin-bottom: 20px;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .blog-author { font-size: 0.78rem; color: var(--muted); font-weight: 600; margin-bottom: 12px; }
        .read-more { display: flex; align-items: center; gap: 6px; color: var(--text); font-weight: 700; font-size: 0.84rem; margin-top: auto; }
        .read-more:hover { color: var(--primary); }
        .jsl-blog-empty {
          text-align: center;
          color: var(--muted);
          font-weight: 600;
          padding: 24px 0 4px;
        }
        .jsl-faq {
          padding-top: 24px;
        }
        .jsl-faq-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-top: 28px;
        }
        .jsl-faq-item {
          background: linear-gradient(180deg, #ffffff 0%, #f8fffd 100%);
          border: 1px solid rgba(23, 201, 176, 0.12);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.04);
        }
        .jsl-faq-item h3 {
          font-size: 0.98rem;
          font-weight: 800;
          line-height: 1.4;
          margin-bottom: 10px;
          color: #0f172a;
        }
        .jsl-faq-item p {
          color: var(--muted);
          line-height: 1.7;
          margin: 0;
        }
        .footer-cta-section {
          padding-top: 12px;
        }
        .footer-cta-shell {
          text-align: center;
          padding: 48px 28px;
          max-width: 860px;
          margin: 0 auto;
          background:
            radial-gradient(circle at top, rgba(23, 201, 176, 0.12), transparent 52%),
            linear-gradient(180deg, #ffffff 0%, #f8fffd 100%);
        }
        .footer-cta-shell h2 {
          font-size: clamp(1.85rem, 3.6vw, 2.7rem);
          font-weight: 800;
          margin: 16px 0 14px;
          letter-spacing: -0.03em;
        }
        .footer-cta-shell p {
          color: var(--muted);
          max-width: 650px;
          margin: 0 auto 28px;
          line-height: 1.75;
          font-size: 0.94rem;
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
        .jsl-logo span { font-size: 1.28rem; font-weight: 800; letter-spacing: -0.03em; }
        .footer-brand p { color: var(--muted); margin: 20px 0 24px; line-height: 1.6; max-width: 300px; }
        .social-links { display: flex; gap: 16px; color: var(--muted); }
        .social-links svg { cursor: pointer; transition: color 0.2s; }
        .social-links svg:hover { color: var(--primary); }
        .footer-links { display: flex; justify-content: space-between; gap: 40px; }
        .link-col h4 { font-size: 0.94rem; font-weight: 700; margin-bottom: 20px; }
        .link-col { display: flex; flex-direction: column; gap: 12px; }
        .link-col a { color: var(--muted); font-weight: 500; transition: color 0.2s; }
        .link-col a:hover { color: var(--primary); }
        .jsl-footer-bottom { max-width: 1200px; margin: 0 auto; border-top: 1px solid var(--border); padding-top: 40px; display: flex; justify-content: space-between; align-items: center; color: var(--muted); font-size: 0.84rem; }
        .footer-bottom-links { display: flex; gap: 24px; }

        /* RESUME BANNER CTA */
        .resume-banner-cta {
          background: #f0fdfa; /* A very subtle teal tint */
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 60px 80px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          justify-content: space-between;
          gap: clamp(28px, 5vw, 72px);
          position: relative;
          overflow: hidden;
        }
        .rb-content {
          max-width: 480px;
        }
        .rb-content h2 {
          font-size: 2.95rem;
          font-weight: 700;
          color: #1f2937;
          line-height: 1.08;
          letter-spacing: -0.04em;
          margin-bottom: 12px;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .rb-content h2 span {
          color: var(--primary); /* Teal mapping */
        }
        .rb-content p {
          font-size: 1.04rem;
          color: #374151;
          line-height: 1.65;
          max-width: 58ch;
          margin-bottom: 16px;
        }
        .rb-content p:last-of-type {
          margin-bottom: 32px;
        }
        .rb-btn {
          background: var(--primary);
          color: #ffffff;
          font-size: 0.96rem;
          font-weight: 600;
          padding: 14px 28px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          box-shadow: 0 12px 22px -16px rgba(23, 201, 176, 0.48);
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .rb-btn:hover {
          background: var(--primary-dark);
          transform: translateY(-1px);
          box-shadow: 0 14px 24px -16px rgba(23, 201, 176, 0.56);
        }

        .rb-visual {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 16px;
          position: relative;
        }
        .rb-person-container {
          position: relative;
          flex-shrink: 0;
        }
        .rb-image-card {
          width: 280px;
          height: 320px;
          border-radius: 28px;
          overflow: hidden;
          background: rgba(23, 201, 176, 0.15); /* matching the primary color faintly */
          border: 1px solid rgba(23, 201, 176, 0.18);
          z-index: 2;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.1);
        }
        .rb-image-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }
        .rb-smile {
          position: absolute;
          top: -18px;
          right: -18px;
          z-index: 3;
          background: #f0fdfa;
          border-radius: 50%;
          padding: 8px;
          border: 4px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 8px 18px -16px rgba(15, 23, 42, 0.3);
        }
        .rb-checks {
          position: absolute;
          bottom: 14px;
          right: -22px;
          z-index: 3;
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(240, 253, 250, 0.95);
          box-shadow: 0 8px 18px -16px rgba(15, 23, 42, 0.3);
        }
        .rb-connectors {
          margin: 0 4px;
          z-index: 1;
          flex-shrink: 0;
        }
        .rb-logos {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .rb-logo-box {
          width: 72px;
          height: 72px;
          background: #ffffff;
          border: 1px solid rgba(203, 213, 225, 0.9);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 18px -18px rgba(15, 23, 42, 0.18);
        }
        .rb-logo-box img {
          width: 36px;
          object-fit: contain;
        }
        .airbnb-logo { filter: invert(41%) sepia(50%) saturate(6015%) hue-rotate(331deg) brightness(97%) contrast(97%); }

        @media (max-width: 900px) {
          .resume-banner-cta {
            grid-template-columns: 1fr;
            padding: 40px 24px;
            text-align: center;
            gap: 48px;
          }
          .rb-content {
            max-width: none;
          }
          .rb-content p {
            max-width: none;
            margin-left: auto;
            margin-right: auto;
          }
          .rb-visual {
            justify-content: center;
            transform: scale(0.92);
          }
        }
        @media (max-width: 640px) {
          .rb-content h2 {
            font-size: 2.28rem;
          }
          .rb-content p {
            font-size: 0.94rem;
            margin-bottom: 28px;
          }
          .rb-visual {
            flex-direction: column;
            gap: 20px;
            transform: none;
          }
          .rb-image-card {
            width: min(100%, 280px);
            height: 320px;
          }
          .rb-connectors {
            display: none;
          }
          .rb-logos {
            flex-direction: row;
            justify-content: center;
            flex-wrap: wrap;
          }
        }

        /* RESUME SHOWCASE SECTION */
        .resume-showcase-section {
          background: #0f172a;
          padding: 0px 0;
          margin: 60px 0 0 0;
          width: 100%;
          color: #fff;
          overflow: hidden;
        }
        .rs-container {
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 60px clamp(24px, 4vw, 80px);
        }
        .rs-content-wrapper {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 60px;
          align-items: center;
          padding: 16px 0;
        }
        .rs-text-content {
          max-width: 480px;
        }
        .rs-text-content h2 {
          color: #fff;
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: 24px;
          letter-spacing: -0.02em;
        }
        .rs-text-content p {
          font-size: 1rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 32px;
        }
        .rs-btn-primary {
          background: var(--primary);
          color: #fff;
          font-size: 0.96rem;
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
          font-size: 0.8rem;
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
            padding: 0px 0;
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
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 60px clamp(24px, 4vw, 80px);
          animation: slide-up 0.6s ease both;
          animation-timeline: view();
          animation-range: entry 0% entry 25%;
        }
        .jsl.jsl-full-bleed .jsl-section {
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 60px clamp(24px, 4vw, 80px);
        }
        .jsl.jsl-full-bleed .resume-showcase-section {
          width: 100%;
        }
        .jsl.jsl-full-bleed .rs-container {
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 60px clamp(24px, 4vw, 80px);
        }
        .jsl-hero-content { animation: slide-up 0.8s ease 0.1s both; }

        /* SECTION HEADING ACCENT */
        .section-header h2 {
          font-size: 1.82rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--text) 0%, #374151 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* HORIZONTAL SCROLL POLISH */
        .jsl-job-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .jsl-job-scroll::-webkit-scrollbar { display: none; }

        [data-theme="dark"] .jsl {
          --bg: #0b1220;
          --text: #e5eef8;
          --muted: #94a3b8;
          --border: #243244;
          --card: #111827;
          background: linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
        }

        [data-theme="dark"] .jsl-hero::before {
          background:
            radial-gradient(circle at top left, rgba(45, 212, 191, 0.08), transparent 30%),
            linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
        }

        [data-theme="dark"] .jsl-hero h1,
        [data-theme="dark"] .stat-text strong,
        [data-theme="dark"] .job-info h3,
        [data-theme="dark"] .section-header h2,
        [data-theme="dark"] .jsl-faq-item h3,
        [data-theme="dark"] .blog-content h3,
        [data-theme="dark"] .rb-content h2 {
          color: #e5eef8;
        }

        [data-theme="dark"] .hero-badge,
        [data-theme="dark"] .section-eyebrow {
          background: rgba(15, 23, 42, 0.72);
          border-color: rgba(45, 212, 191, 0.28);
          color: #5eead4;
        }

        [data-theme="dark"] .jsl-search-box,
        [data-theme="dark"] .jobs-shell,
        [data-theme="dark"] .jsl-job-card-h,
        [data-theme="dark"] .jsl-cat-card,
        [data-theme="dark"] .feature-card,
        [data-theme="dark"] .how-card,
        [data-theme="dark"] .trust-stat-card,
        [data-theme="dark"] .jsl-blog-card,
        [data-theme="dark"] .jsl-faq-item,
        [data-theme="dark"] .resume-banner-cta,
        [data-theme="dark"] .blog-scroll-btn,
        [data-theme="dark"] .footer-cta-shell {
          background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
          border-color: #243244;
          box-shadow: 0 10px 24px rgba(2, 6, 23, 0.22);
        }

        [data-theme="dark"] .jobs-shell-spotlight {
          background:
            radial-gradient(circle at top left, rgba(23, 201, 176, 0.12), transparent 32%),
            linear-gradient(180deg, #111827 0%, #0f172a 100%);
        }

        [data-theme="dark"] .jobs-shell-board {
          background:
            radial-gradient(circle at top right, rgba(14, 165, 233, 0.11), transparent 28%),
            linear-gradient(180deg, #111827 0%, #0f172a 100%);
        }

        [data-theme="dark"] .search-divider,
        [data-theme="dark"] .hero-search-location,
        [data-theme="dark"] .card-h-footer,
        [data-theme="dark"] .jsl-footer-bottom {
          border-color: #243244;
          background: transparent;
        }

        [data-theme="dark"] .search-field input {
          background: transparent !important;
          color: #e5eef8 !important;
        }

        [data-theme="dark"] .search-field input::placeholder {
          color: #7c8ea5 !important;
        }

        [data-theme="dark"] .field-icon,
        [data-theme="dark"] .jsl-hero-popular span,
        [data-theme="dark"] .stat-text,
        [data-theme="dark"] .section-copy p,
        [data-theme="dark"] .feature-card p,
        [data-theme="dark"] .how-card p,
        [data-theme="dark"] .trust-stat-card span,
        [data-theme="dark"] .job-info .meta,
        [data-theme="dark"] .salary-label,
        [data-theme="dark"] .blog-content p,
        [data-theme="dark"] .blog-content .date,
        [data-theme="dark"] .read-time,
        [data-theme="dark"] .blog-author,
        [data-theme="dark"] .jsl-faq-item p,
        [data-theme="dark"] .footer-brand p,
        [data-theme="dark"] .link-col a,
        [data-theme="dark"] .jsl-footer-bottom,
        [data-theme="dark"] .rb-content p,
        [data-theme="dark"] .rs-text-content p,
        [data-theme="dark"] .rs-trustpilot p {
          color: #94a3b8 !important;
        }

        [data-theme="dark"] .chips button,
        [data-theme="dark"] .job-logo-box.has-image,
        [data-theme="dark"] .rb-logo-box {
          background: #0f172a;
          border-color: #243244;
          color: #e5eef8;
        }

        [data-theme="dark"] .resume-banner-cta {
          background: linear-gradient(180deg, #101827 0%, #0b1220 100%);
        }

        [data-theme="dark"] .rb-image-card {
          background: linear-gradient(180deg, rgba(34, 197, 164, 0.14) 0%, rgba(15, 23, 42, 0.42) 100%);
          border-color: rgba(74, 222, 128, 0.16);
          box-shadow: 0 12px 24px -20px rgba(2, 6, 23, 0.5);
        }

        [data-theme="dark"] .rb-smile,
        [data-theme="dark"] .rb-checks {
          background: rgba(15, 23, 42, 0.95);
          border-color: rgba(45, 212, 191, 0.24);
          box-shadow: 0 10px 18px -18px rgba(2, 6, 23, 0.55);
        }

        [data-theme="dark"] .rb-connectors {
          opacity: 0.92;
        }

        [data-theme="dark"] .rb-btn {
          box-shadow: 0 12px 22px -18px rgba(45, 212, 191, 0.32);
        }

        [data-theme="dark"] .job-card-h-badge,
        [data-theme="dark"] .type-pill {
          background: rgba(45, 212, 191, 0.12);
          color: #67e8f9;
          border-color: rgba(45, 212, 191, 0.22);
        }

        [data-theme="dark"] .job-card-h-cta,
        [data-theme="dark"] .read-more,
        [data-theme="dark"] .view-all,
        [data-theme="dark"] .job-info .company,
        [data-theme="dark"] .feature-card h3,
        [data-theme="dark"] .how-card h3,
        [data-theme="dark"] .footer-cta-shell h2,
        [data-theme="dark"] .how-step-number {
          color: #dbe7f5;
        }

        [data-theme="dark"] .feature-icon {
          background: rgba(45, 212, 191, 0.14);
          color: #5eead4;
        }

        [data-theme="dark"] .trust-stat-card strong {
          color: #5eead4;
        }

        [data-theme="dark"] .resume-showcase-section {
          background: linear-gradient(180deg, #07111f 0%, #0b1220 100%);
        }

        [data-theme="dark"] .rs-template-card {
          background: #0f172a;
          border: 1px solid #243244;
        }

        [data-theme="dark"] .jsl-feedback-btn {
          background: linear-gradient(135deg, #111827, #0f172a);
          box-shadow: 0 18px 34px rgba(2, 6, 23, 0.42);
        }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .jsl-footer-inner { grid-template-columns: 1fr; gap: 40px; }
          .footer-links { flex-wrap: wrap; gap: 24px; }
          .jsl-hero h1 { font-size: 2.75rem; }
          .jsl-job-grid { grid-template-columns: repeat(2, 1fr); }
          .feature-grid,
          .how-grid,
          .trust-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .audience-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .filters-mini { flex-wrap: wrap; }
          .jsl-blog-card { min-width: 280px; max-width: 320px; }
          .card-meta-grid { grid-template-columns: 1fr; }
          .jsl-section { padding: 48px clamp(20px, 3vw, 60px); }
          .rs-container { padding: 48px clamp(20px, 3vw, 60px); }
        }
        @media (max-width: 768px) {
          .hero-avatar { display: none; }
          .jsl-search-box { flex-direction: column; padding: 16px; border-radius: 20px; }
          .search-divider { display: none; }
          .search-field { padding: 8px 12px; }
          .jsl-hero-stats { flex-direction: column; gap: 8px; align-items: stretch; }
          .jsl-hero { padding: 32px 20px 60px; }
          .jsl-hero h1 { font-size: 2.2rem; }
          .hero-sub { font-size: 0.9rem; }
          .jsl-job-card-h { width: 280px; }
          .jsl-search-btn { width: 100%; text-align: center; justify-content: center; margin-top: 8px; }
          .jsl-job-grid { grid-template-columns: 1fr; }
          .jsl-blog-card { min-width: 260px; max-width: 300px; }
          .jsl-testi-scroll-wrapper { padding: 20px 0; }
          .jsl-testi-card { width: 300px; padding: 30px; }
          .jsl-cat-grid { grid-template-columns: repeat(2, 1fr); }
          .audience-grid { grid-template-columns: 1fr; }
          .feature-grid,
          .how-grid,
          .trust-stats-grid { grid-template-columns: 1fr; }
          .section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .section-header h2 { font-size: 1.48rem; }
          .jsl-section { padding: 40px 20px; }
          .rs-container { padding: 40px 20px; }
          .jsl.jsl-full-bleed .jsl-section { padding: 40px 20px; }
          .jsl.jsl-full-bleed .rs-container { padding: 40px 20px; }
          .jsl.jsl-full-bleed .jsl-section.jobs-shell-board { padding: 40px 20px; }
          .filters-mini { display: none; }
          .jsl-logo-strip { margin-top: 48px; }
          .jsl-hero-popular { flex-direction: column; align-items: center; gap: 12px; }
          .chips { flex-wrap: wrap; justify-content: center; }
          .jsl-feedback-btn { bottom: 16px; right: 16px; padding: 10px 18px; font-size: 0.85rem; }
          .jsl-footer { padding: 60px 20px 32px; }
          .jsl-footer-inner { gap: 32px; }
          .footer-links { gap: 20px; }
          .jsl-footer-bottom { flex-direction: column; gap: 16px; text-align: center; }
          .jsl-faq-list { grid-template-columns: 1fr; }
          .jobs-shell { border-radius: 24px; }
          .card-bottom-row { flex-direction: column; align-items: flex-start; }
          .job-posted-pill { white-space: normal; }
        }
        @media (max-width: 480px) {
          .jsl-cat-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .audience-grid { grid-template-columns: 1fr; }
          .jsl-section { padding: 28px 16px; }
          .rs-container { padding: 28px 16px; }
          .jsl.jsl-full-bleed .jsl-section { padding: 28px 16px; }
          .jsl.jsl-full-bleed .rs-container { padding: 28px 16px; }
          .jsl.jsl-full-bleed .jsl-section.jobs-shell-board { padding: 28px 16px; }
          .stat-item { padding: 10px 12px; }
          .hero-actions { width: 100%; }
          .hero-cta-primary,
          .hero-cta-secondary { width: 100%; min-height: 48px; }
          .jsl-job-card-h { width: 250px; padding: 18px; }
          .job-card-h-badge { padding: 5px 10px; font-size: 0.66rem; }
          .jsl-job-card-v { padding: 20px; border-radius: 22px; }
          .search-field input,
          .search-field select { font-size: 16px !important; }
          .jsl-hero h1 { font-size: clamp(1.7rem, 7vw, 2.2rem); }
        }
        @media (max-width: 375px) {
          .jsl-hero { padding: 24px 12px 48px; }
          .jsl-section { padding: 24px 12px; }
          .rs-container { padding: 24px 12px; }
          .jsl.jsl-full-bleed .jsl-section { padding: 24px 12px; }
          .jsl.jsl-full-bleed .rs-container { padding: 24px 12px; }
          .jsl-hero h1 { font-size: clamp(1.55rem, 8vw, 1.9rem); }
          .hero-sub { font-size: 0.84rem; }
          .jsl-feedback-btn span { display: none; }
          .jsl-feedback-btn { padding: 12px; min-width: 44px; min-height: 44px; }
          .jsl-footer { padding: 40px 12px 24px; }
          .footer-bottom-links { flex-direction: column; gap: 10px; }
        }
        @media (max-width: 320px) {
          .jsl-section { padding: 20px 10px; }
          .rs-container { padding: 20px 10px; }
          .jsl.jsl-full-bleed .jsl-section { padding: 20px 10px; }
          .jsl.jsl-full-bleed .rs-container { padding: 20px 10px; }
          .jsl-cat-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
        }
      `}</style>
    </div>
  );
};
