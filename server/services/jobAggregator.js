import axios from 'axios';
import crypto from 'crypto';

const DEFAULT_TIMEOUT_MS = 10000;
const CACHE_TTL_MS = Number(process.env.JOBS_CACHE_TTL_MS || 5 * 60 * 1000);
const MAX_RESULTS_PER_SOURCE = Number(process.env.JOBS_MAX_PER_SOURCE || 120);

const cacheStore = new Map();
const detailStore = new Map();

const nowMs = () => Date.now();

const cacheGet = (key) => {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < nowMs()) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value;
};

const cacheSet = (key, value, ttlMs = CACHE_TTL_MS) => {
  cacheStore.set(key, {
    value,
    expiresAt: nowMs() + ttlMs,
  });
};

const detailSet = (job) => {
  detailStore.set(job.id, {
    value: job,
    expiresAt: nowMs() + CACHE_TTL_MS,
  });
};

const detailGet = (jobId) => {
  const entry = detailStore.get(jobId);
  if (!entry) return null;
  if (entry.expiresAt < nowMs()) {
    detailStore.delete(jobId);
    return null;
  }
  return entry.value;
};

const safeString = (value) => (value == null ? '' : String(value).trim());

const stripHtml = (value = '') =>
  safeString(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const decodeXmlEntities = (value = '') =>
  safeString(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, '/');

const parseSalaryText = (salaryText, currency = 'USD') => {
  if (!salaryText) {
    return { min: 0, max: 0, currency };
  }

  const text = safeString(salaryText).toUpperCase().replace(/,/g, '');
  const numberMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(K)?/g)];

  if (!numberMatches.length) {
    return { min: 0, max: 0, currency };
  }

  const values = numberMatches.map((match) => {
    const raw = Number(match[1]);
    const hasK = Boolean(match[2]);
    return hasK ? raw * 1000 : raw;
  });

  let min = values[0] || 0;
  let max = values[1] || values[0] || 0;

  if (/HOUR|HR\b/.test(text)) {
    min *= 2080;
    max *= 2080;
  } else if (/WEEK/.test(text)) {
    min *= 52;
    max *= 52;
  } else if (/MONTH/.test(text)) {
    min *= 12;
    max *= 12;
  }

  return {
    min: Math.max(0, Math.round(min)),
    max: Math.max(0, Math.round(max)),
    currency,
  };
};

const parseDate = (value) => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const makeJobId = (source, rawIdParts) => {
  const seed = `${source}|${rawIdParts.filter(Boolean).join('|')}`;
  const hash = crypto.createHash('sha1').update(seed).digest('hex').slice(0, 20);
  return `${source}_${hash}`;
};

const isRemoteText = (value = '') => /\bremote\b/i.test(safeString(value));

const normalizeLocation = (value, fallback = 'Unknown') => {
  const location = safeString(value);
  return location || fallback;
};

const scoreKeywordMatch = (job, keyword) => {
  if (!keyword) return true;
  const haystack = `${job.title} ${job.company} ${job.location} ${job.description}`.toLowerCase();
  return keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
};

const dedupeJobs = (jobs) => {
  const seen = new Set();
  return jobs.filter((job) => {
    const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}|${job.location.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const parseIndeedRss = (xml) => {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch = itemRegex.exec(xml);

  while (itemMatch) {
    const chunk = itemMatch[1];
    const field = (tagName) => {
      const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
      const match = chunk.match(regex);
      return match ? decodeXmlEntities(match[1]) : '';
    };

    items.push({
      title: field('title'),
      link: field('link'),
      description: field('description'),
      pubDate: field('pubDate'),
      source: field('source'),
    });

    itemMatch = itemRegex.exec(xml);
  }

  return items;
};

const sourceError = (source, error) => ({
  source,
  ok: false,
  message: error?.message || 'Unknown source error',
});

const sourceOk = (source, count) => ({
  source,
  ok: true,
  count,
});

const fetchArbeitnowJobs = async ({ keyword, location }) => {
  const response = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
    timeout: DEFAULT_TIMEOUT_MS,
    params: { page: 1 },
  });

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  const normalized = rows.slice(0, MAX_RESULTS_PER_SOURCE).map((row) => {
    const description = stripHtml(row.description || '');
    const remoteFromTags = Array.isArray(row.tags) && row.tags.some((tag) => isRemoteText(tag));
    const remote = Boolean(row.remote) || remoteFromTags || isRemoteText(row.location);
    const salaryText = safeString(row.salary || '');

    return {
      id: makeJobId('arbeitnow', [row.slug, row.url, row.title, row.company_name]),
      source: 'arbeitnow',
      sourceJobId: safeString(row.slug) || safeString(row.url),
      title: safeString(row.title) || 'Untitled role',
      company: safeString(row.company_name) || 'Unknown company',
      location: normalizeLocation(row.location, remote ? 'Remote' : 'Unknown'),
      description,
      salary: parseSalaryText(salaryText, 'USD'),
      salaryText,
      url: safeString(row.url),
      type: safeString(Array.isArray(row.job_types) ? row.job_types[0] : row.job_type || 'full-time'),
      remote,
      tags: Array.isArray(row.tags) ? row.tags : [],
      postedDate: parseDate(row.created_at),
    };
  });

  return normalized.filter((job) => scoreKeywordMatch(job, keyword) && (!location || job.location.toLowerCase().includes(location.toLowerCase()) || job.remote));
};

const fetchRemotiveJobs = async ({ keyword, location }) => {
  const response = await axios.get('https://remotive.com/api/remote-jobs', {
    timeout: DEFAULT_TIMEOUT_MS,
    params: keyword ? { search: keyword } : {},
  });

  const rows = Array.isArray(response.data?.jobs) ? response.data.jobs : [];
  const normalized = rows.slice(0, MAX_RESULTS_PER_SOURCE).map((row) => {
    const salaryText = safeString(row.salary);
    const candidateUrl = safeString(row.url) || safeString(row.job_url);
    return {
      id: makeJobId('remotive', [row.id, candidateUrl, row.title, row.company_name]),
      source: 'remotive',
      sourceJobId: safeString(row.id) || candidateUrl,
      title: safeString(row.title) || 'Untitled role',
      company: safeString(row.company_name) || 'Unknown company',
      location: normalizeLocation(row.candidate_required_location, 'Remote'),
      description: stripHtml(row.description || ''),
      salary: parseSalaryText(salaryText, 'USD'),
      salaryText,
      url: candidateUrl,
      type: safeString(row.job_type || 'remote'),
      remote: true,
      tags: Array.isArray(row.tags) ? row.tags : [],
      postedDate: parseDate(row.publication_date),
    };
  });

  return normalized.filter((job) => scoreKeywordMatch(job, keyword) && (!location || job.location.toLowerCase().includes(location.toLowerCase()) || job.remote));
};

const fetchUsaJobs = async ({ keyword, location, page = 1 }) => {
  const authKey = safeString(process.env.USAJOBS_AUTH_KEY);
  const userAgent = safeString(process.env.USAJOBS_USER_AGENT);

  if (!authKey || !userAgent) {
    throw new Error('USAJOBS_AUTH_KEY and USAJOBS_USER_AGENT are required for USAJOBS API access');
  }

  const response = await axios.get('https://data.usajobs.gov/api/search', {
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      Host: 'data.usajobs.gov',
      'User-Agent': userAgent,
      'Authorization-Key': authKey,
    },
    params: {
      Keyword: keyword || undefined,
      LocationName: location || undefined,
      ResultsPerPage: Math.min(MAX_RESULTS_PER_SOURCE, 100),
      Page: Math.max(1, Number(page) || 1),
    },
  });

  const items = response.data?.SearchResult?.SearchResultItems;
  const rows = Array.isArray(items) ? items : [];

  return rows.map((item) => {
    const desc = item?.MatchedObjectDescriptor || {};
    const salaryMin = Number(desc?.PositionRemuneration?.[0]?.MinimumRange || 0);
    const salaryMax = Number(desc?.PositionRemuneration?.[0]?.MaximumRange || 0);
    const currency = 'USD';
    const locations = Array.isArray(desc?.PositionLocationDisplay) ? desc.PositionLocationDisplay : [];
    const locationText = locations.join(', ');
    const detailsUrl = safeString(desc?.PositionURI);
    const remote = isRemoteText(locationText) || isRemoteText(desc?.UserArea?.Details?.WhoMayApply?.Name);

    return {
      id: makeJobId('usajobs', [desc.PositionID, detailsUrl, desc.PositionTitle, desc.OrganizationName]),
      source: 'usajobs',
      sourceJobId: safeString(desc.PositionID) || detailsUrl,
      title: safeString(desc.PositionTitle) || 'Untitled role',
      company: safeString(desc.OrganizationName) || 'US Government',
      location: normalizeLocation(locationText, 'United States'),
      description: stripHtml(desc.UserArea?.Details?.JobSummary || ''),
      salary: {
        min: salaryMin,
        max: salaryMax || salaryMin,
        currency: currency || 'USD',
      },
      salaryText: safeString(desc.PositionRemuneration?.[0]?.Description),
      url: detailsUrl,
      type: safeString(desc.PositionSchedule?.[0]?.Name || 'full-time'),
      remote,
      tags: [safeString(desc.DepartmentName), safeString(desc.JobCategory?.[0]?.Name)].filter(Boolean),
      postedDate: parseDate(desc.PublicationStartDate),
    };
  });
};

const fetchIndeedRssJobs = async ({ keyword, location }) => {
  const response = await axios.get('https://www.indeed.com/rss', {
    timeout: DEFAULT_TIMEOUT_MS,
    params: {
      q: keyword || 'software engineer',
      l: location || 'United States',
    },
    responseType: 'text',
  });

  const items = parseIndeedRss(String(response.data || ''));

  return items.slice(0, MAX_RESULTS_PER_SOURCE).map((item) => {
    const descriptionText = stripHtml(item.description || '');
    const title = safeString(item.title);
    const [roleTitle, companyPart = 'Indeed Partner'] = title.split(' - ');
    const remote = isRemoteText(descriptionText) || isRemoteText(title);

    return {
      id: makeJobId('indeed_rss', [item.link, item.title]),
      source: 'indeed_rss',
      sourceJobId: safeString(item.link),
      title: safeString(roleTitle) || title || 'Untitled role',
      company: safeString(companyPart),
      location: normalizeLocation(location, remote ? 'Remote' : 'United States'),
      description: descriptionText,
      salary: parseSalaryText(descriptionText, 'USD'),
      salaryText: '',
      url: safeString(item.link),
      type: 'full-time',
      remote,
      tags: ['indeed', 'rss'],
      postedDate: parseDate(item.pubDate),
    };
  });
};

const filterJobs = (jobs, { remote, salaryMin, location }) => {
  return jobs.filter((job) => {
    if (remote && !job.remote) return false;
    if (salaryMin > 0 && (Number(job.salary?.max || 0) < salaryMin)) return false;
    if (location && !job.remote && !job.location.toLowerCase().includes(location.toLowerCase())) return false;
    return true;
  });
};

const sortJobs = (jobs) =>
  [...jobs].sort((a, b) => {
    const at = new Date(a.postedDate).getTime();
    const bt = new Date(b.postedDate).getTime();
    return bt - at;
  });

const makeCacheKey = ({ keyword, location, remote, salaryMin }) =>
  JSON.stringify({
    keyword: safeString(keyword).toLowerCase(),
    location: safeString(location).toLowerCase(),
    remote: Boolean(remote),
    salaryMin: Number(salaryMin || 0),
  });

export const searchJobs = async ({
  keyword = 'software engineer',
  location = '',
  remote = false,
  salaryMin = 0,
  page = 1,
  limit = 20,
}) => {
  const normalizedKeyword = safeString(keyword) || 'software engineer';
  const normalizedLocation = safeString(location);
  const normalizedRemote = Boolean(remote);
  const normalizedSalaryMin = Number(salaryMin || 0);

  const cacheKey = makeCacheKey({
    keyword: normalizedKeyword,
    location: normalizedLocation,
    remote: normalizedRemote,
    salaryMin: normalizedSalaryMin,
  });

  const cached = cacheGet(cacheKey);
  if (cached) {
    const pagedCachedResults = cached.jobs.slice((page - 1) * limit, page * limit);
    return {
      ...cached,
      page,
      limit,
      results: pagedCachedResults,
      totalPages: Math.max(1, Math.ceil(cached.total / limit)),
      cached: true,
    };
  }

  const sourceResults = await Promise.allSettled([
    fetchArbeitnowJobs({ keyword: normalizedKeyword, location: normalizedLocation }),
    fetchRemotiveJobs({ keyword: normalizedKeyword, location: normalizedLocation }),
    fetchUsaJobs({ keyword: normalizedKeyword, location: normalizedLocation, page }),
    fetchIndeedRssJobs({ keyword: normalizedKeyword, location: normalizedLocation }),
  ]);

  const status = [];
  const combined = [];

  sourceResults.forEach((entry, index) => {
    const sourceName = ['arbeitnow', 'remotive', 'usajobs', 'indeed_rss'][index];
    if (entry.status === 'fulfilled') {
      const list = Array.isArray(entry.value) ? entry.value : [];
      combined.push(...list);
      status.push(sourceOk(sourceName, list.length));
    } else {
      status.push(sourceError(sourceName, entry.reason));
    }
  });

  const deduped = dedupeJobs(combined);
  const filtered = filterJobs(deduped, {
    remote: normalizedRemote,
    salaryMin: normalizedSalaryMin,
    location: normalizedLocation,
  });
  const sorted = sortJobs(filtered);

  sorted.forEach(detailSet);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * limit;
  const results = sorted.slice(start, start + limit);

  const payload = {
    keyword: normalizedKeyword,
    location: normalizedLocation,
    remote: normalizedRemote,
    salaryMin: normalizedSalaryMin,
    total,
    jobs: sorted,
    sources: status,
  };

  cacheSet(cacheKey, payload);

  return {
    keyword: normalizedKeyword,
    location: normalizedLocation,
    remote: normalizedRemote,
    salaryMin: normalizedSalaryMin,
    page: safePage,
    limit,
    total,
    totalPages,
    results,
    sources: status,
    cached: false,
  };
};

export const getJobById = (jobId) => detailGet(jobId);

export const getSeoNicheConfig = (slug) => {
  const nicheMap = {
    'remote-software-engineer-jobs': {
      keyword: 'software engineer',
      location: 'United States',
      remote: true,
      title: 'Remote Software Engineer Jobs in the USA',
      description:
        'Explore remote software engineer jobs across the United States from multiple free job sources.',
    },
    'truck-driver-jobs-usa': {
      keyword: 'truck driver',
      location: 'United States',
      remote: false,
      title: 'Truck Driver Jobs in the USA',
      description:
        'Browse current truck driver opportunities in the United States aggregated from trusted public job feeds.',
    },
    'nurse-jobs-usa': {
      keyword: 'nurse',
      location: 'United States',
      remote: false,
      title: 'Nurse Jobs in the USA',
      description:
        'Find nurse jobs in the USA with live listings from government and private job APIs.',
    },
    'government-jobs-usa': {
      keyword: 'government',
      location: 'United States',
      remote: false,
      title: 'Government Jobs in the USA',
      description:
        'Search government jobs in the USA with data from USAJOBS and additional public job sources.',
    },
  };

  return nicheMap[slug] || null;
};

export const getSitemapPaths = () => {
  return [
    '/',
    '/job-search',
    '/remote-software-engineer-jobs',
    '/truck-driver-jobs-usa',
    '/nurse-jobs-usa',
    '/government-jobs-usa',
  ];
};
