import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://workshour.com';
const DIST_INDEX_PATH = resolve(process.cwd(), 'dist', 'index.html');
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo-wh-transparent.png`;
const DEFAULT_IMAGE_ALT = 'Workshour logo';

let cachedEnv = null;

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const stripHtml = (value = '') =>
  String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|br)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();

const normalizePath = (path = '/') => {
  if (!path || path === '/') return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const buildAbsoluteUrl = (path = '/') => `${SITE_URL}${normalizePath(path)}`;

const toAbsoluteImageUrl = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${SITE_URL}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const splitIntoParagraphs = (value = '', maxParagraphs = 4) => {
  const cleaned = String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const blocks = cleaned
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (blocks.length > 0) {
    return blocks.slice(0, maxParagraphs);
  }

  const fallbackText = stripHtml(cleaned);
  const sentences = fallbackText.match(/[^.!?]+[.!?]+/g) || [fallbackText];
  const grouped = [];

  for (let index = 0; index < sentences.length; index += 2) {
    const chunk = sentences.slice(index, index + 2).join(' ').trim();
    if (chunk) grouped.push(chunk);
    if (grouped.length >= maxParagraphs) break;
  }

  return grouped.filter(Boolean);
};

const readEnvFile = () => {
  if (cachedEnv) return cachedEnv;

  const envPath = resolve(process.cwd(), '.env');
  const values = {};

  if (!existsSync(envPath)) {
    cachedEnv = values;
    return values;
  }

  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) values[key] = value;
  }

  cachedEnv = values;
  return values;
};

const getSupabaseConfig = () => {
  const fileEnv = readEnvFile();
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    fileEnv.SUPABASE_URL ||
    fileEnv.VITE_SUPABASE_URL ||
    ''
  ).trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    fileEnv.SUPABASE_SERVICE_ROLE_KEY ||
    fileEnv.SUPABASE_ANON_KEY ||
    fileEnv.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return { url, key };
};

const normalizeFaqs = (value) => {
  const raw = typeof value === 'string'
    ? (() => {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      })()
    : value;

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim(),
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 4);
};

const fetchPublishedBlogs = async () => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return [];

  try {
    const supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase
      .from('blogs')
      .select('id, slug, title, meta_title, meta_description, content, author_name, category, cover_image, image_url, published_at, created_at, faqs')
      .eq('published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.warn(`SEO prerender blog query failed: ${error.message}`);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`SEO prerender blog fetch failed: ${message}`);
    return [];
  }
};

const humanizeSlug = (slug = '') =>
  String(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const readFallbackBlogsFromSitemap = async () => {
  const sitemapCandidates = [
    resolve(process.cwd(), 'public', 'sitemap.xml'),
    resolve(process.cwd(), 'dist', 'sitemap.xml'),
  ];
  const slugs = new Set();

  for (const sitemapPath of sitemapCandidates) {
    if (!existsSync(sitemapPath)) continue;
    const xml = await readFile(sitemapPath, 'utf8');
    const matches = xml.matchAll(/<loc>https?:\/\/[^<]+\/community\/([^<]+)<\/loc>/gi);
    for (const match of matches) {
      const rawSlug = (match[1] || '').trim().replace(/\/+$/, '');
      if (rawSlug) slugs.add(decodeURIComponent(rawSlug));
    }
  }

  return Array.from(slugs).map((slug) => ({
    id: slug,
    slug,
    title: humanizeSlug(slug) || 'Community Article',
    meta_description: 'Read the latest career insights and practical hiring guidance from the Workshour community.',
    content: '',
    author_name: 'Workshour Editorial',
    category: 'Career Insights',
    cover_image: '',
    image_url: '',
    published_at: '',
    created_at: '',
    faqs: [],
  }));
};

const mergeBlogs = (primaryBlogs, fallbackBlogs) => {
  const merged = new Map();

  for (const blog of [...fallbackBlogs, ...primaryBlogs]) {
    const slug = String(blog?.slug || blog?.id || '').trim();
    if (!slug) continue;
    merged.set(slug, blog);
  }

  return Array.from(merged.values());
};

const buildJobPage = ({ path, title, description, keyword, audience, bullets }) => ({
  path,
  title: `${title} | Workshour`,
  description,
  keywords: `${keyword} jobs, ${keyword} careers, ${keyword} openings, workshour`,
  eyebrow: 'AI-Powered Job Discovery',
  h1: title,
  intro: [
    `${title} on Workshour brings together searchable listings, faster filtering, and a cleaner application workflow for people who want relevant opportunities without wasting time across multiple job boards.`,
    `This page is designed for ${audience}. You can review roles, refine searches by location or salary, and move from discovery to application with stronger organization and better visibility into your job search progress.`,
  ],
  highlights: bullets.map((bullet) => ({
    title: bullet,
    text: `Use Workshour to explore ${bullet.toLowerCase()} with a faster, more focused workflow.`,
  })),
  sections: [
    {
      heading: `Why use Workshour for ${title.toLowerCase()}?`,
      paragraphs: [
        `Instead of opening multiple tabs and repeating the same search, Workshour gives job seekers one place to find opportunities, compare roles, and track next steps. The platform is built to reduce friction when you are searching at scale and trying to keep every promising lead organized.`,
        `You can pair live job discovery with resume tools, ATS-friendly resume support, and application tracking so your search feels more deliberate. That matters for competitive categories where speed, relevance, and consistency all influence interview outcomes.`,
      ],
    },
    {
      heading: 'What you can do on this page',
      bullets: [
        `Search ${keyword} openings with location-aware filters`,
        'Review opportunities from multiple public job feeds in one experience',
        'Track applications and prepare stronger follow-ups with Workshour tools',
      ],
    },
  ],
  ctas: [
    { href: path, label: 'Browse Jobs', variant: 'primary' },
    { href: '/resume-builder', label: 'Build Your Resume', variant: 'secondary' },
  ],
});

const buildStaticPages = (recentBlogs) => {
  const communityHighlights = recentBlogs.slice(0, 6).map((blog) => ({
    title: blog.title?.trim() || 'Community article',
    text: (blog.meta_description || stripHtml(blog.content || '') || 'Read the latest Workshour career insight.')
      .trim()
      .slice(0, 140),
    href: `/community/${blog.slug?.trim() || blog.id}`,
  }));

  return [
    {
      path: '/ai-copilot',
      title: 'AI Career Copilot | Workshour',
      description: 'Get personalized career guidance and interview prep with AI.',
      keywords: 'AI career copilot, career guidance, interview prep, workshour',
      eyebrow: 'AI Career Guidance',
      h1: 'AI Career Copilot for Smarter Job Decisions',
      intro: [
        'Workshour AI Copilot helps job seekers think more clearly about their next move. Instead of generic advice, the assistant supports resume improvements, interview preparation, skill planning, and job-search strategy in one focused experience.',
        'Whether you are switching careers, preparing for interviews, or trying to understand what employers want, the copilot gives practical guidance that is easier to apply immediately. It works best alongside Workshour resume tools and job discovery features so every decision connects back to a stronger application process.',
      ],
      highlights: [
        {
          title: 'Resume Feedback',
          text: 'Get help improving structure, clarity, and ATS relevance before you apply.',
        },
        {
          title: 'Interview Support',
          text: 'Prepare stronger stories, sharper examples, and more confident answers.',
        },
        {
          title: 'Career Planning',
          text: 'Use AI guidance to identify skills, roles, and next steps that fit your goals.',
        },
      ],
      sections: [
        {
          heading: 'What the copilot can help you do',
          bullets: [
            'Understand which jobs match your profile and current strengths',
            'Improve resume language for clarity, impact, and ATS compatibility',
            'Prepare for interviews with better questions, answers, and examples',
            'Turn broad career goals into a more realistic action plan',
          ],
        },
        {
          heading: 'Why this matters during a job search',
          paragraphs: [
            'Many job seekers lose momentum because they are trying to solve everything at once: resume updates, applications, interview preparation, and career planning. Workshour AI Copilot gives that process structure so you can move with more confidence and less guesswork.',
            'For Google and other search engines, this page now ships with crawlable HTML that explains the real value of the tool before client-side code loads. That makes the route stronger as a standalone landing page while keeping the interactive chat experience intact for users.',
          ],
        },
      ],
      ctas: [
        { href: '/ai-copilot', label: 'Open AI Copilot', variant: 'primary' },
        { href: '/job-search', label: 'Browse Jobs', variant: 'secondary' },
      ],
    },
    {
      path: '/community',
      title: 'Career Community | Workshour',
      description: 'Connect with professionals and share career updates.',
      keywords: 'career community, career blog, hiring insights, workshour',
      eyebrow: 'Workshour Community',
      h1: 'Career Insights and Community Stories',
      intro: [
        'The Workshour community brings together practical career advice, hiring insights, resume guidance, and job-search strategies for modern professionals. It is designed for people who want useful content they can apply right away.',
        'Instead of lightweight posts with little substance, the community section helps readers understand hiring trends, improve application materials, and make better decisions about interviews, networking, and career growth.',
      ],
      highlights: communityHighlights,
      sections: [
        {
          heading: 'What you will find in the community',
          bullets: [
            'Resume and ATS optimization guidance that supports better visibility in hiring systems',
            'Interview preparation advice based on real job-search friction points',
            'Career growth articles covering role changes, market trends, and professional development',
          ],
        },
        {
          heading: 'Why the community matters',
          paragraphs: [
            'A strong content section gives Workshour more than a tool-only presence. It creates topical depth around job search, resumes, and career management, which helps both users and search engines understand the platform as a serious career resource.',
            'This prerendered snapshot makes the route easier for Google to crawl because the page now includes meaningful headings, summaries, and internal links before hydration. That is especially useful for content hubs that previously depended on client-side data fetching.',
          ],
        },
      ],
      ctas: [
        { href: '/community', label: 'Read Community Posts', variant: 'primary' },
        { href: '/resume-builder', label: 'Build Your Resume', variant: 'secondary' },
      ],
    },
    {
      path: '/job-search',
      title: 'Multi-Source Job Search | Workshour',
      description: 'Search jobs from multiple sources with one fast, unified experience.',
      keywords: 'job search tool, multi-source jobs, remote jobs, workshour',
      eyebrow: 'Job Search Platform',
      h1: 'Search Jobs Across Multiple Sources',
      intro: [
        'Workshour makes job search easier by bringing together opportunities from multiple public job sources in one cleaner interface. Instead of searching each site separately, you can compare roles, refine filters, and keep your process organized from a single page.',
        'The route is built for speed and clarity. Job seekers can search by title, company, salary, or location, then pair discoveries with resume improvements, AI guidance, and application tracking for a more complete career workflow.',
      ],
      highlights: [
        {
          title: 'Unified Search',
          text: 'Review live openings from multiple sources without repeating the same search across different websites.',
        },
        {
          title: 'Faster Filtering',
          text: 'Narrow results by keyword, location, salary, and remote preferences with less friction.',
        },
        {
          title: 'Better Follow-Through',
          text: 'Move directly from discovery to resume updates, tracking, and application planning.',
        },
      ],
      sections: [
        {
          heading: 'Why this page is important for SEO',
          paragraphs: [
            'Job-search routes often struggle in single-page apps because the most useful content only appears after JavaScript runs. This route now ships with real, crawlable HTML that explains what the page does and why it is helpful before the app hydrates.',
            'That stronger first response helps search engines understand the purpose of the page, allocate crawl attention more confidently, and reduce the risk that it gets treated like a thin or duplicate route.',
          ],
        },
        {
          heading: 'How Workshour supports job seekers',
          bullets: [
            'Discover opportunities across multiple job feeds in one place',
            'Connect job search with AI resume builder and ATS support',
            'Track applications and keep your career workflow organized',
          ],
        },
      ],
      ctas: [
        { href: '/job-search', label: 'Search Jobs', variant: 'primary' },
        { href: '/ai-copilot', label: 'Use AI Copilot', variant: 'secondary' },
      ],
    },
    buildJobPage({
      path: '/remote-software-engineer-jobs',
      title: 'Remote Software Engineer Jobs',
      description: 'Live remote software engineering roles in the USA from multiple free job APIs and RSS feeds.',
      keyword: 'software engineer',
      audience: 'developers who want remote opportunities and a faster way to evaluate live openings',
      bullets: ['Remote engineering roles', 'Flexible work options', 'Technical career growth'],
    }),
    buildJobPage({
      path: '/truck-driver-jobs-usa',
      title: 'Truck Driver Jobs USA',
      description: 'Current truck driver jobs across the United States aggregated from public job feeds.',
      keyword: 'truck driver',
      audience: 'drivers looking for national, regional, or local openings with better search organization',
      bullets: ['Regional routes', 'National driving roles', 'Local logistics opportunities'],
    }),
    buildJobPage({
      path: '/nurse-jobs-usa',
      title: 'Nurse Jobs USA',
      description: 'Find nurse openings across the USA with filters and pagination.',
      keyword: 'nurse',
      audience: 'healthcare professionals comparing openings across hospitals, clinics, and care teams',
      bullets: ['Registered nurse roles', 'Clinical care opportunities', 'Healthcare career growth'],
    }),
    buildJobPage({
      path: '/government-jobs-usa',
      title: 'Government Jobs USA',
      description: 'Browse government job opportunities in the United States from USAJOBS and other public sources.',
      keyword: 'government',
      audience: 'candidates exploring public-sector roles with clearer search and stronger application support',
      bullets: ['Public-sector openings', 'Federal and local roles', 'Structured career pathways'],
    }),
    {
      path: '/resume-builder/templates',
      title: 'Resume Templates | Workshour',
      description: 'Browse ATS-friendly resume templates and start building a stronger application faster.',
      keywords: 'resume templates, ATS-friendly resume templates, resume builder, workshour',
      eyebrow: 'Resume Templates',
      h1: 'ATS-Friendly Resume Templates for Faster Applications',
      intro: [
        'The Workshour template library helps job seekers start with cleaner, more professional resume layouts that are easier to customize and easier for recruiters to review. Every template is designed to support readability, stronger structure, and faster editing.',
        'Instead of starting from a blank page, users can choose a layout, open the editor, and continue building with AI-assisted resume support. That makes the templates route a meaningful entry point for job seekers who need quick momentum and a better resume workflow.',
      ],
      highlights: [
        {
          title: 'Professional Layouts',
          text: 'Choose from modern, simple, and professional templates built for real-world applications.',
        },
        {
          title: 'Faster Customization',
          text: 'Open a template directly in the editor and tailor it to your target role without starting over.',
        },
        {
          title: 'ATS Support',
          text: 'Pair templates with Workshour resume tools to improve keyword targeting and readability.',
        },
      ],
      sections: [
        {
          heading: 'Why template pages matter',
          paragraphs: [
            'Template galleries often get discovered by search engines before the deeper interactive editor experience. Giving this route standalone HTML helps search engines understand that the page offers real value, not just a loading state or client-only shell.',
            'It also creates a stronger landing page for users who search for resume templates, ATS-friendly resume formats, or faster ways to start a professional resume.',
          ],
        },
        {
          heading: 'What you can do next',
          bullets: [
            'Browse layouts that match different experience levels and industries',
            'Open the editor and customize your resume with AI-guided improvements',
            'Move from template selection to job applications in one connected workflow',
          ],
        },
      ],
      ctas: [
        { href: '/resume-builder/templates', label: 'Browse Templates', variant: 'primary' },
        { href: '/resume-builder', label: 'Open Resume Builder', variant: 'secondary' },
      ],
    },
  ];
};

const buildBlogPages = (blogs) =>
  blogs
    .map((blog) => {
      const slug = String(blog.slug || blog.id || '').trim();
      const title = String(blog.title || '').trim() || 'Community Article';
      if (!slug) return null;

      const metaDescription = String(blog.meta_description || '').trim();
      const excerpt = metaDescription || stripHtml(blog.content || '').slice(0, 220);
      const paragraphs = splitIntoParagraphs(blog.content || metaDescription || title, 5);
      const category = String(blog.category || 'Career Insights').trim();
      const authorName = String(blog.author_name || 'Workshour Editorial').trim();
      const publishedAt = blog.published_at || blog.created_at || '';
      const faqs = normalizeFaqs(blog.faqs);
      const rawCoverImage = String(blog.cover_image || blog.image_url || '').trim();
      const coverImage = rawCoverImage ? toAbsoluteImageUrl(rawCoverImage) : '';

      return {
        path: `/community/${slug}`,
        title: `${String(blog.meta_title || title).trim() || title} | Workshour`,
        description: excerpt || 'Read the latest career insights from Workshour.',
        keywords: `${category.toLowerCase()}, career insights, workshour community, workshour`,
        eyebrow: category,
        h1: title,
        intro: excerpt ? [excerpt] : [],
        article: {
          authorName,
          publishedAt: formatDate(publishedAt),
          category,
        },
        image: coverImage || undefined,
        imageAlt: title,
        ogType: 'article',
        highlights: [],
        sections: [
          {
            heading: 'Article overview',
            paragraphs,
          },
          ...(faqs.length > 0
            ? [
                {
                  heading: 'Frequently asked questions',
                  faqs,
                },
              ]
            : []),
        ],
        ctas: [
          { href: '/community', label: 'More Community Posts', variant: 'secondary' },
          { href: '/job-search', label: 'Browse Jobs', variant: 'primary' },
        ],
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: title,
          description: excerpt || title,
          author: {
            '@type': 'Person',
            name: authorName,
          },
          publisher: {
            '@type': 'Organization',
            name: 'Workshour',
            url: SITE_URL,
          },
          mainEntityOfPage: buildAbsoluteUrl(`/community/${slug}`),
          image: coverImage || DEFAULT_OG_IMAGE,
          ...(publishedAt ? { datePublished: publishedAt, dateModified: publishedAt } : {}),
        },
      };
    })
    .filter(Boolean);

const renderSnapshot = (page) => {
  const introMarkup = (page.intro || [])
    .map((paragraph, index) => `<p class="${index === 0 ? 'seo-lede' : 'seo-copy'}">${escapeHtml(paragraph)}</p>`)
    .join('\n');

  const actionsMarkup = (page.ctas || [])
    .map(
      (cta) =>
        `<a class="seo-btn ${cta.variant === 'secondary' ? 'seo-btn-secondary' : 'seo-btn-primary'}" href="${escapeHtml(
          cta.href
        )}">${escapeHtml(cta.label)}</a>`
    )
    .join('\n');

  const highlightMarkup = (page.highlights || []).length
    ? `
        <div class="seo-grid">
          ${(page.highlights || [])
            .map(
              (item) => `
                <article class="seo-card">
                  ${item.href ? `<a class="seo-card-link" href="${escapeHtml(item.href)}">` : ''}
                  <h2>${escapeHtml(item.title)}</h2>
                  <p>${escapeHtml(item.text)}</p>
                  ${item.href ? '<span class="seo-card-cta">Read more</span></a>' : ''}
                </article>
              `
            )
            .join('\n')}
        </div>
      `
    : '';

  const articleMetaMarkup = page.article
    ? `
        <div class="seo-meta" aria-label="Article metadata">
          <span>${escapeHtml(page.article.authorName)}</span>
          ${page.article.publishedAt ? `<span>${escapeHtml(page.article.publishedAt)}</span>` : ''}
          <span>${escapeHtml(page.article.category)}</span>
        </div>
      `
    : '';

  const imageMarkup = page.image
    ? `
        <figure class="seo-figure">
          <img src="${escapeHtml(page.image)}" alt="${escapeHtml(page.imageAlt || page.h1 || DEFAULT_IMAGE_ALT)}" loading="eager" decoding="async" />
        </figure>
      `
    : '';

  const sectionsMarkup = (page.sections || [])
    .map((section) => {
      const paragraphs = (section.paragraphs || [])
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join('\n');
      const bullets = (section.bullets || []).length
        ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '';
      const faqs = (section.faqs || []).length
        ? `
            <div class="seo-faqs">
              ${section.faqs
                .map(
                  (faq) => `
                    <article class="seo-faq">
                      <h3>${escapeHtml(faq.question)}</h3>
                      <p>${escapeHtml(faq.answer)}</p>
                    </article>
                  `
                )
                .join('\n')}
            </div>
          `
        : '';

      return `
        <section class="seo-section">
          <h2>${escapeHtml(section.heading)}</h2>
          ${paragraphs}
          ${bullets}
          ${faqs}
        </section>
      `;
    })
    .join('\n');

  return `
    <div class="seo-prerender" data-prerendered="true">
      <div class="seo-shell">
        <p class="seo-kicker">${escapeHtml(page.eyebrow || 'Workshour')}</p>
        <h1>${escapeHtml(page.h1 || page.title)}</h1>
        ${articleMetaMarkup}
        ${introMarkup}
        <div class="seo-actions">${actionsMarkup}</div>
        ${imageMarkup}
        ${highlightMarkup}
        ${sectionsMarkup}
      </div>
    </div>
  `;
};

const renderSnapshotStyles = () => `
  <style id="seo-prerender-styles">
    .seo-prerender {
      background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
      color: #0f172a;
      font-family: Manrope, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      min-height: 100vh;
    }
    .seo-shell {
      max-width: 980px;
      margin: 0 auto;
      padding: 56px 20px 72px;
    }
    .seo-kicker {
      display: inline-flex;
      align-items: center;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(23, 201, 176, 0.12);
      color: #0f766e;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin: 0 0 18px;
    }
    .seo-shell h1 {
      font-size: clamp(2.2rem, 5vw, 4rem);
      line-height: 1.05;
      letter-spacing: -0.04em;
      margin: 0 0 14px;
      color: #0f172a;
    }
    .seo-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      color: #64748b;
      font-size: 0.95rem;
      margin: 0 0 16px;
    }
    .seo-meta span::after {
      content: "\\2022";
      margin-left: 12px;
      color: #94a3b8;
    }
    .seo-meta span:last-child::after {
      content: "";
      margin: 0;
    }
    .seo-lede,
    .seo-copy,
    .seo-section p,
    .seo-card p,
    .seo-faq p {
      font-size: 1rem;
      line-height: 1.8;
      color: #475569;
      margin: 0 0 14px;
    }
    .seo-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 28px 0 32px;
    }
    .seo-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 46px;
      padding: 0 22px;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.95rem;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .seo-btn:hover {
      transform: translateY(-1px);
    }
    .seo-btn-primary {
      background: linear-gradient(135deg, #17c9b0 0%, #10bfa8 100%);
      color: #ffffff;
      box-shadow: 0 18px 34px rgba(23, 201, 176, 0.18);
    }
    .seo-btn-secondary {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid rgba(148, 163, 184, 0.35);
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
    }
    .seo-figure {
      margin: 0 0 28px;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 24px 40px rgba(15, 23, 42, 0.12);
    }
    .seo-figure img {
      display: block;
      width: 100%;
      height: auto;
    }
    .seo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 18px;
      margin: 10px 0 32px;
    }
    .seo-card {
      background: #ffffff;
      border: 1px solid rgba(226, 232, 240, 0.9);
      border-radius: 20px;
      padding: 22px;
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
    }
    .seo-card-link {
      color: inherit;
      text-decoration: none;
      display: block;
    }
    .seo-card h2,
    .seo-section h2,
    .seo-faq h3 {
      color: #0f172a;
      margin: 0 0 10px;
      line-height: 1.25;
    }
    .seo-card h2,
    .seo-section h2 {
      font-size: 1.28rem;
    }
    .seo-card-cta {
      display: inline-flex;
      margin-top: 8px;
      color: #0f766e;
      font-weight: 700;
      font-size: 0.94rem;
    }
    .seo-section {
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(226, 232, 240, 0.9);
      border-radius: 24px;
      padding: 28px;
      margin-bottom: 20px;
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
    }
    .seo-section ul {
      margin: 0;
      padding-left: 20px;
      color: #334155;
    }
    .seo-section li {
      margin-bottom: 10px;
      line-height: 1.7;
    }
    .seo-faqs {
      display: grid;
      gap: 14px;
    }
    .seo-faq {
      padding: 18px;
      border-radius: 16px;
      background: #f8fafc;
      border: 1px solid rgba(226, 232, 240, 0.9);
    }
    @media (max-width: 640px) {
      .seo-shell {
        padding: 36px 16px 56px;
      }
      .seo-section {
        padding: 22px 18px;
      }
      .seo-actions {
        flex-direction: column;
      }
      .seo-btn {
        width: 100%;
      }
    }
  </style>
`;

const renderDefaultJsonLd = (page) =>
  JSON.stringify(
    page.jsonLd || {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.title,
      description: page.description,
      url: buildAbsoluteUrl(page.path),
    }
  );

const upsertTag = (html, pattern, markup, fallback = '</head>') => {
  if (pattern.test(html)) {
    return html.replace(pattern, markup);
  }
  return html.replace(fallback, `${markup}\n  ${fallback}`);
};

const applyHeadMetadata = (html, page) => {
  const canonicalUrl = buildAbsoluteUrl(page.path);
  const ogImage = toAbsoluteImageUrl(page.image || '');
  const imageAlt = page.imageAlt || DEFAULT_IMAGE_ALT;
  const ogType = page.ogType || 'website';

  let next = html;
  next = upsertTag(next, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  next = upsertTag(
    next,
    /<meta\s+[^>]*name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(page.description)}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*name=["']keywords["'][^>]*>/i,
    `<meta name="keywords" content="${escapeHtml(page.keywords || '')}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*name=["']robots["'][^>]*>/i,
    '<meta name="robots" content="index, follow" />'
  );
  next = upsertTag(
    next,
    /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*property=["']og:type["'][^>]*>/i,
    `<meta property="og:type" content="${escapeHtml(ogType)}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*property=["']og:image["'][^>]*>/i,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*property=["']og:image:alt["'][^>]*>/i,
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*name=["']twitter:image["'][^>]*>/i,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
  );
  next = upsertTag(
    next,
    /<meta\s+[^>]*name=["']twitter:image:alt["'][^>]*>/i,
    `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`
  );

  next = next.replace(/<style id="seo-prerender-styles">[\s\S]*?<\/style>/i, '');
  next = next.replace(/<script id="seo-prerender-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/i, '');

  next = next.replace(
    '</head>',
    `${renderSnapshotStyles()}\n  <script id="seo-prerender-jsonld" type="application/ld+json">${renderDefaultJsonLd(page)}</script>\n  </head>`
  );

  return next;
};

const injectSnapshotIntoRoot = (html, snapshot) => {
  if (/<div id="root">[\s\S]*?<\/div>/i.test(html)) {
    return html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${snapshot}</div>`);
  }
  return html;
};

const writePage = async (baseHtml, page) => {
  const targetFile = resolve(process.cwd(), 'dist', page.path.replace(/^\/+/, ''), 'index.html');
  const snapshot = renderSnapshot(page);
  const html = injectSnapshotIntoRoot(applyHeadMetadata(baseHtml, page), snapshot);
  await mkdir(dirname(targetFile), { recursive: true });
  await writeFile(targetFile, html, 'utf8');
  return targetFile;
};

if (!existsSync(DIST_INDEX_PATH)) {
  console.warn('Skipping SEO prerender snapshots because dist/index.html was not found.');
  process.exit(0);
}

const baseHtml = await readFile(DIST_INDEX_PATH, 'utf8');
const fetchedBlogs = await fetchPublishedBlogs();
const fallbackBlogs = await readFallbackBlogsFromSitemap();
const blogs = mergeBlogs(fetchedBlogs, fallbackBlogs);
const pages = [...buildStaticPages(blogs), ...buildBlogPages(blogs)];

const writtenFiles = [];
for (const page of pages) {
  const file = await writePage(baseHtml, page);
  writtenFiles.push(file);
}

console.log(`Generated ${writtenFiles.length} SEO prerendered route snapshots.`);
