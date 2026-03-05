import express from 'express';
import { getSeoNicheConfig, getSitemapPaths, searchJobs } from '../services/jobAggregator.js';

const router = express.Router();

const SITE_URL = (process.env.SITE_URL || 'http://localhost:5000').replace(/\/+$/, '');

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toCurrency = (job) => {
  const min = Number(job?.salary?.min || 0);
  const max = Number(job?.salary?.max || 0);
  const currency = job?.salary?.currency || 'USD';
  if (!min && !max) return 'Salary not specified';
  if (min && max && min !== max) return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  return `${currency} ${(max || min).toLocaleString()}`;
};

const queryFromRequest = (req, defaults) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const remote = String(req.query.remote || (defaults.remote ? 'true' : 'false')).toLowerCase() === 'true';
  const salaryMin = Math.max(0, Number(req.query.salary_min || 0));
  const keyword = String(req.query.keyword || defaults.keyword || '').trim() || defaults.keyword;
  const location = String(req.query.location || defaults.location || '').trim() || defaults.location;

  return {
    keyword,
    location,
    remote,
    salaryMin,
    page,
    limit,
  };
};

const renderSeoJobsHtml = ({ slug, config, result, query }) => {
  const canonicalUrl = `${SITE_URL}/${slug}`;
  const pageTitle = `${config.title} | Hirevo Job Search`;
  const metaDescription = config.description;
  const paginationText = `Page ${result.page} of ${result.totalPages}`;

  const makePageLink = (targetPage) => {
    const params = new URLSearchParams();
    params.set('page', String(targetPage));
    params.set('limit', String(query.limit));
    if (query.remote) params.set('remote', 'true');
    if (query.salaryMin > 0) params.set('salary_min', String(query.salaryMin));
    if (query.keyword) params.set('keyword', query.keyword);
    if (query.location) params.set('location', query.location);
    return `/${slug}?${params.toString()}`;
  };

  const prevLink = result.page > 1 ? `<a href="${escapeHtml(makePageLink(result.page - 1))}">Previous</a>` : '';
  const nextLink = result.page < result.totalPages ? `<a href="${escapeHtml(makePageLink(result.page + 1))}">Next</a>` : '';

  const jobsMarkup = result.results
    .map((job) => {
      const detailPath = `/job-search/${encodeURIComponent(job.id)}`;
      return `
      <article class="job-card">
        <h2><a href="${escapeHtml(detailPath)}">${escapeHtml(job.title)}</a></h2>
        <p class="meta">${escapeHtml(job.company)} | ${escapeHtml(job.location)} | ${escapeHtml(job.source)}</p>
        <p class="salary">${escapeHtml(toCurrency(job))}</p>
        <p>${escapeHtml(job.description.slice(0, 240))}...</p>
        <p><a href="${escapeHtml(job.url || '#')}" target="_blank" rel="noopener noreferrer">Apply</a></p>
      </article>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(metaDescription)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <style>
    body { margin: 0; font-family: "Segoe UI", sans-serif; background: #f5f7fb; color: #1f2937; }
    .container { max-width: 980px; margin: 0 auto; padding: 20px; }
    .hero { background: #0b3d91; color: #fff; border-radius: 16px; padding: 20px; }
    .hero h1 { margin: 0 0 8px; }
    .hero p { margin: 0; opacity: 0.92; }
    form { margin-top: 14px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    input, select, button { padding: 10px; border-radius: 10px; border: 1px solid #d1d5db; }
    button { background: #111827; color: #fff; border: none; cursor: pointer; }
    .results { margin-top: 16px; display: grid; gap: 12px; }
    .job-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; }
    .job-card h2 { margin: 0 0 6px; font-size: 1.12rem; }
    .job-card .meta { margin: 0 0 4px; color: #6b7280; font-size: 0.9rem; }
    .job-card .salary { margin: 0 0 8px; color: #0f766e; font-weight: 700; }
    .pagination { margin-top: 16px; display: flex; gap: 12px; align-items: center; }
    @media (max-width: 760px) {
      form { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="container">
    <section class="hero">
      <h1>${escapeHtml(config.title)}</h1>
      <p>${escapeHtml(config.description)}</p>
      <form method="get" action="/${escapeHtml(slug)}">
        <input type="text" name="keyword" value="${escapeHtml(query.keyword)}" placeholder="Keyword" />
        <input type="text" name="location" value="${escapeHtml(query.location)}" placeholder="Location" />
        <input type="number" name="salary_min" min="0" value="${escapeHtml(String(query.salaryMin || ''))}" placeholder="Min salary" />
        <select name="remote">
          <option value="false"${query.remote ? '' : ' selected'}>Any</option>
          <option value="true"${query.remote ? ' selected' : ''}>Remote only</option>
        </select>
        <button type="submit">Filter jobs</button>
      </form>
    </section>
    <section class="results">
      <p>${escapeHtml(String(result.total))} jobs found. ${escapeHtml(paginationText)}</p>
      ${jobsMarkup || '<p>No jobs found for this query.</p>'}
    </section>
    <nav class="pagination">${prevLink}<span>${escapeHtml(paginationText)}</span>${nextLink}</nav>
  </main>
</body>
</html>`;
};

const seoSlugs = [
  'remote-software-engineer-jobs',
  'truck-driver-jobs-usa',
  'nurse-jobs-usa',
  'government-jobs-usa',
];

seoSlugs.forEach((slug) => {
  router.get(`/${slug}`, async (req, res) => {
    try {
      const config = getSeoNicheConfig(slug);
      if (!config) {
        return res.status(404).send('Page not found');
      }

      const query = queryFromRequest(req, config);
      const result = await searchJobs(query);
      const html = renderSeoJobsHtml({ slug, config, result, query });
      return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
    } catch (error) {
      console.error(`SEO route failed for ${slug}:`, error?.message || error);
      return res.status(500).send('Unable to render SEO jobs page');
    }
  });
});

router.get('/sitemap.xml', (req, res) => {
  const paths = getSitemapPaths();
  const now = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map(
    (path) => `  <url>
    <loc>${escapeHtml(`${SITE_URL}${path}`)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>${path === '/' ? '1.0' : '0.8'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml);
});

export default router;
