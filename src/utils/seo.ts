import { BRAND } from '../config/brand';

type MetaAttr = 'name' | 'property';

export type SeoMetaOptions = {
  keywords?: string;
  image?: string;
  imageAlt?: string;
  ogType?: string;
  ogUrl?: string;
  twitterCard?: string;
  twitterHandle?: string;
  robots?: string;
  canonicalUrl?: string;
};

export type SeoRouteConfig = {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  image?: string;
  ogType?: string;
};

const SITE_NAME = BRAND.name;
const DEFAULT_DESCRIPTION =
  `${BRAND.name} is an AI-powered career platform for job search, resume building, and career insights.`;
const DEFAULT_KEYWORDS =
  'AI career platform, job search, resume builder, resume templates, career insights, career trends, AI copilot, job matching, workshour';
const DEFAULT_OG_IMAGE = '/logo-wh-transparent.png';
const DEFAULT_TWITTER_CARD = 'summary_large_image';
const PRIMARY_SITE_URL = 'https://workshour.com';

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeSiteUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    if (url.hostname === 'workshour.com' || url.hostname === 'www.workshour.com') {
      return PRIMARY_SITE_URL;
    }

    return stripTrailingSlash(url.origin);
  } catch {
    return stripTrailingSlash(trimmed);
  }
};

const getSiteUrl = () => {
  const env = normalizeSiteUrl(import.meta.env.VITE_SITE_URL || '');
  if (env) return env;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeSiteUrl(window.location.origin);
  }
  return '';
};

const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

const buildAbsoluteUrl = (path: string) => {
  if (!path) return '';
  const siteUrl = getSiteUrl();
  if (!siteUrl) return path;
  return `${siteUrl}${ensureLeadingSlash(path)}`;
};

const upsertMeta = (name: string, content: string, attr: MetaAttr = 'name') => {
  let element = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const upsertCanonical = (href: string) => {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
};

export const DEFAULT_SEO: SeoRouteConfig = {
  title: 'Workshour | AI-Powered Career Platform',
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  canonicalPath: '/',
};

const ROUTE_SEO_CONFIGS: Record<string, SeoRouteConfig> = {
  '/': DEFAULT_SEO,
  '/landing': DEFAULT_SEO,
  '/jobs': {
    title: 'AI Job Finder | Workshour',
    description: 'Discover jobs with AI matching, smart filters, and curated recommendations.',
    keywords: 'job search, AI job matching, job listings, workshour',
    canonicalPath: '/',
  },
  '/jobs/results': {
    title: 'AI Job Finder | Workshour',
    description: 'Review matched jobs and apply with confidence.',
    keywords: 'job results, AI job matching, workshour',
  },
  '/market-jobs': {
    title: 'Weekly Market Jobs | Workshour',
    description: 'Track weekly job market activity and new opportunities in one place.',
    keywords: 'market jobs, weekly jobs, job trends, workshour',
  },
  '/job-search': {
    title: 'Multi-Source Job Search | Workshour',
    description: 'Search jobs from multiple sources with one fast, unified experience.',
    keywords: 'job search tool, multi-source jobs, workshour',
  },
  '/remote-software-engineer-jobs': {
    title: 'Remote Software Engineer Jobs | Workshour',
    description: 'Live remote software engineering roles across the United States.',
    keywords: 'remote software engineer jobs, software jobs, workshour',
  },
  '/truck-driver-jobs-usa': {
    title: 'Truck Driver Jobs USA | Workshour',
    description: 'Find current truck driver openings across the United States.',
    keywords: 'truck driver jobs, logistics jobs, workshour',
  },
  '/nurse-jobs-usa': {
    title: 'Nurse Jobs USA | Workshour',
    description: 'Browse nursing roles with filters for location and experience.',
    keywords: 'nurse jobs, healthcare jobs, workshour',
  },
  '/government-jobs-usa': {
    title: 'Government Jobs USA | Workshour',
    description: 'Explore public sector opportunities across the United States.',
    keywords: 'government jobs, public sector jobs, workshour',
  },
  '/resume': {
    title: 'Resume Builder and Templates | Workshour',
    description: 'Build an ATS-friendly resume with live preview and modern templates.',
    keywords: 'resume builder, resume templates, ATS resume, workshour',
    canonicalPath: '/resume-builder',
  },
  '/trends': {
    title: 'Career Trends and Insights | Workshour',
    description: 'Track in-demand skills, salaries, and industry growth signals.',
    keywords: 'career trends, job market insights, salary trends, workshour',
  },
  '/ai-copilot': {
    title: 'AI Career Copilot | Workshour',
    description: 'Get personalized career guidance and interview prep with AI.',
    keywords: 'AI career copilot, career guidance, interview prep, workshour',
  },
  '/community': {
    title: 'Career Community | Workshour',
    description: 'Connect with professionals and share career updates.',
    keywords: 'career community, networking, workshour',
  },
  '/login': {
    title: 'Login | Workshour',
    description: 'Sign in to access your Workshour dashboard and tools.',
    keywords: 'workshour login, sign in',
  },
  '/register': {
    title: 'Create an Account | Workshour',
    description: 'Join Workshour to access AI job matching and resume tools.',
    keywords: 'workshour signup, create account, AI career platform',
  },
  '/select-role': {
    title: 'Select Role | Workshour',
    description: 'Choose how you want to use Workshour to personalize your experience.',
    keywords: 'workshour role selection, onboarding',
  },
  '/dashboard': {
    title: 'Dashboard | Workshour',
    description: 'Your personalized career overview, recommendations, and next steps.',
    keywords: 'career dashboard, workshour',
  },
  '/profile': {
    title: 'Profile | Workshour',
    description: 'Manage your Workshour profile, skills, and career goals.',
    keywords: 'career profile, workshour',
  },
  '/settings': {
    title: 'Settings | Workshour',
    description: 'Update your preferences, notifications, and security settings.',
    keywords: 'account settings, workshour',
  },
  '/admin-dashboard': {
    title: 'Admin Dashboard | Workshour',
    description: 'Manage users, roles, and content across the platform.',
    keywords: 'admin dashboard, workshour',
  },
  '/admin/templates': {
    title: 'Resume Templates Admin | Workshour',
    description: 'Manage resume templates and template metadata.',
    keywords: 'resume templates admin, workshour',
  },
  '/recruiter': {
    title: 'Recruiter Dashboard | Workshour',
    description: 'Post jobs, review applicants, and track recruiting activity.',
    keywords: 'recruiter dashboard, hiring, workshour',
  },
};

export const getSeoConfig = (pathname: string): SeoRouteConfig => {
  if (ROUTE_SEO_CONFIGS[pathname]) {
    return {
      ...DEFAULT_SEO,
      ...ROUTE_SEO_CONFIGS[pathname],
      canonicalPath: ROUTE_SEO_CONFIGS[pathname].canonicalPath ?? pathname,
    };
  }

  if (pathname.startsWith('/jobs/')) {
    return {
      title: 'Job Details | Workshour',
      description: 'Review job details, requirements, and apply in minutes.',
      keywords: 'job details, job requirements, workshour',
      canonicalPath: pathname,
    };
  }

  if (pathname.startsWith('/job-search/')) {
    return {
      title: 'Job Search Result | Workshour',
      description: 'View detailed results from your multi-source job search.',
      keywords: 'job search result, job details, workshour',
      canonicalPath: pathname,
    };
  }

  if (pathname.startsWith('/blog/')) {
    return {
      title: 'Career Insights | Workshour',
      description: 'Read career tips, hiring trends, and professional growth insights.',
      keywords: 'career insights, career blog, workshour',
      canonicalPath: pathname,
    };
  }

  return {
    ...DEFAULT_SEO,
    canonicalPath: pathname || '/',
  };
};

export const applySeoMeta = (
  title: string,
  description: string,
  canonicalPath: string,
  options: SeoMetaOptions = {}
) => {
  if (typeof document === 'undefined') return;

  const safeTitle = title || DEFAULT_SEO.title;
  const safeDescription = description || DEFAULT_DESCRIPTION;
  const canonicalUrl = options.canonicalUrl || buildAbsoluteUrl(canonicalPath);
  const ogUrl = options.ogUrl || canonicalUrl;
  const imagePath = options.image || DEFAULT_OG_IMAGE;
  const ogImage = imagePath.startsWith('http') ? imagePath : buildAbsoluteUrl(imagePath);
  const imageAlt = options.imageAlt || `${SITE_NAME} logo`;
  const keywords = options.keywords || DEFAULT_KEYWORDS;
  const ogType = options.ogType || 'website';
  const twitterCard = options.twitterCard || DEFAULT_TWITTER_CARD;
  const twitterHandle = options.twitterHandle || (import.meta.env.VITE_TWITTER_HANDLE || '').trim();
  const robots = options.robots || 'index, follow';

  document.title = safeTitle;
  upsertMeta('description', safeDescription);
  upsertMeta('keywords', keywords);
  upsertMeta('robots', robots);
  upsertMeta('og:title', safeTitle, 'property');
  upsertMeta('og:description', safeDescription, 'property');
  upsertMeta('og:type', ogType, 'property');
  upsertMeta('og:url', ogUrl, 'property');
  upsertMeta('og:image', ogImage, 'property');
  upsertMeta('og:image:alt', imageAlt, 'property');
  upsertMeta('og:site_name', SITE_NAME, 'property');
  upsertMeta('twitter:card', twitterCard);
  upsertMeta('twitter:title', safeTitle);
  upsertMeta('twitter:description', safeDescription);
  upsertMeta('twitter:image', ogImage);
  upsertMeta('twitter:image:alt', imageAlt);
  if (twitterHandle) {
    upsertMeta('twitter:site', twitterHandle);
  }
  if (canonicalUrl) {
    upsertCanonical(canonicalUrl);
  }
};
