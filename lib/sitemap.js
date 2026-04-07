import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

export const PRIMARY_SITE_URL = 'https://workshour.com';

const DEFAULT_STATIC_LASTMOD = '2026-04-07';

const STATIC_SITEMAP_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/job-search', changefreq: 'daily', priority: '0.9' },
  { path: '/market-jobs', changefreq: 'daily', priority: '0.8' },
  { path: '/remote-software-engineer-jobs', changefreq: 'daily', priority: '0.8' },
  { path: '/truck-driver-jobs-usa', changefreq: 'daily', priority: '0.8' },
  { path: '/nurse-jobs-usa', changefreq: 'daily', priority: '0.8' },
  { path: '/government-jobs-usa', changefreq: 'daily', priority: '0.8' },
  { path: '/resume-builder', changefreq: 'weekly', priority: '0.8' },
  { path: '/resume-builder/templates', changefreq: 'weekly', priority: '0.7' },
  { path: '/trends', changefreq: 'weekly', priority: '0.7' },
  { path: '/ai-copilot', changefreq: 'weekly', priority: '0.7' },
  { path: '/community', changefreq: 'daily', priority: '0.8' },
];

let cachedFileEnv = null;

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const stripTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const normalizePath = (path = '/') => {
  if (!path || path === '/') return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

export const normalizeSiteUrl = (value = PRIMARY_SITE_URL) => {
  try {
    const url = new URL(value || PRIMARY_SITE_URL);

    if (url.hostname === 'workshour.com' || url.hostname === 'www.workshour.com') {
      return PRIMARY_SITE_URL;
    }

    return stripTrailingSlash(url.origin);
  } catch {
    return PRIMARY_SITE_URL;
  }
};

const buildAbsoluteUrl = (siteUrl, path) => `${normalizeSiteUrl(siteUrl)}${normalizePath(path)}`;

const toLastmodDate = (value, fallback = DEFAULT_STATIC_LASTMOD) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().slice(0, 10);
};

const uniqueEntries = (entries) => {
  const seen = new Set();

  return entries.filter((entry) => {
    if (!entry?.loc || seen.has(entry.loc)) return false;
    seen.add(entry.loc);
    return true;
  });
};

const readEnvFile = () => {
  if (cachedFileEnv) return cachedFileEnv;

  const envPath = resolve(process.cwd(), '.env');
  const values = {};

  if (!existsSync(envPath)) {
    cachedFileEnv = values;
    return values;
  }

  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) values[key] = value;
  }

  cachedFileEnv = values;
  return values;
};

export const getStaticSitemapEntries = ({ siteUrl = PRIMARY_SITE_URL, lastmod = DEFAULT_STATIC_LASTMOD } = {}) =>
  STATIC_SITEMAP_ROUTES.map((route) => ({
    loc: buildAbsoluteUrl(siteUrl, route.path),
    lastmod,
    changefreq: route.changefreq,
    priority: route.priority,
  }));

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

export const fetchPublishedBlogEntries = async ({ siteUrl = PRIMARY_SITE_URL } = {}) => {
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
      .select('id, slug, updated_at, published_at, created_at')
      .eq('published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.warn(`Sitemap blog query failed: ${error.message}`);
      return [];
    }

    return uniqueEntries(
      (data || []).map((row) => {
        const slug = typeof row.slug === 'string' && row.slug.trim() ? row.slug.trim() : row.id;
        const lastmod = toLastmodDate(row.updated_at || row.published_at || row.created_at);

        return {
          loc: buildAbsoluteUrl(siteUrl, `/community/${slug}`),
          lastmod,
          changefreq: 'weekly',
          priority: '0.7',
        };
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Sitemap blog fetch failed: ${message}`);
    return [];
  }
};

export const buildSitemapEntries = async ({ siteUrl = PRIMARY_SITE_URL, lastmod = DEFAULT_STATIC_LASTMOD } = {}) => {
  const [staticEntries, blogEntries] = await Promise.all([
    Promise.resolve(getStaticSitemapEntries({ siteUrl, lastmod })),
    fetchPublishedBlogEntries({ siteUrl }),
  ]);

  return uniqueEntries([...staticEntries, ...blogEntries]).sort((a, b) => a.loc.localeCompare(b.loc));
};

export const buildSitemapXml = (entries) => {
  const urlNodes = uniqueEntries(entries).map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod || DEFAULT_STATIC_LASTMOD)}</lastmod>
    <changefreq>${escapeXml(entry.changefreq || 'weekly')}</changefreq>
    <priority>${escapeXml(entry.priority || '0.5')}</priority>
  </url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes.join('\n')}
</urlset>
`;
};
