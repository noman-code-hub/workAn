import { apiUrl, parseApiJson } from '../config/api';
import type { AggregatedJob, AggregatedJobsResponse } from '../types/jobSearch';
import type { Job } from '../types';

export interface JobSearchFilters {
  keyword: string;
  location: string;
  remote: boolean;
  salaryMin: number;
  page: number;
  pageToken?: string;
  limit?: number;
}

export interface MarketJobsApiResponse {
  success: boolean;
  endpoint?: string;
  keyword?: string;
  location?: string;
  remote?: boolean;
  salaryMin?: number;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  count?: number;
  nextPageToken?: string | null;
  next_page_token?: string | null;
  updated_at?: string | null;
  sync_error?: string | null;
  cached?: boolean;
  sources?: Array<{
    source: string;
    ok: boolean;
    count?: number;
    message?: string;
  }>;
  results: AggregatedJob[];
}

type RawAggregatedJob = Partial<AggregatedJob> & Record<string, unknown>;

const normalizeText = (value: unknown) => (value == null ? '' : String(value).trim());

const normalizeNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(item)).filter(Boolean);
};

const normalizeAggregatedJob = (job: RawAggregatedJob, index: number): AggregatedJob => {
  const salaryRecord = (job.salary && typeof job.salary === 'object' ? job.salary : {}) as Record<string, unknown>;
  const type = normalizeText(job.type ?? job.job_type) || 'full-time';
  const url =
    normalizeText(job.url) ||
    normalizeText(job.applyUrl) ||
    normalizeText(job.apply_url) ||
    normalizeText(job.redirect_url) ||
    '#';

  return {
    id: normalizeText(job.id) || `job-${index + 1}`,
    source: normalizeText(job.source) || 'unknown',
    sourceJobId: normalizeText(job.sourceJobId ?? job.source_job_id) || undefined,
    title: normalizeText(job.title) || 'Untitled role',
    company: normalizeText(job.company) || 'Unknown company',
    logoUrl:
      normalizeText(job.logoUrl) ||
      normalizeText(job.logo_url) ||
      normalizeText(job.thumbnail) ||
      null,
    location: normalizeText(job.location) || 'Unknown location',
    description: normalizeText(job.description) || 'No description available',
    salary: {
      min: normalizeNumber(salaryRecord.min ?? job.salary_min),
      max: normalizeNumber(salaryRecord.max ?? job.salary_max ?? salaryRecord.min ?? job.salary_min),
      currency: normalizeText(salaryRecord.currency ?? job.salary_currency) || 'USD',
    },
    salaryText: normalizeText(job.salaryText ?? job.salary_text) || undefined,
    url,
    type,
    remote: Boolean(job.remote) || type.toLowerCase().includes('remote'),
    tags: normalizeStringArray(job.tags),
    postedDate:
      normalizeText(job.postedDate ?? job.posted_at ?? job.updated_at) || new Date().toISOString(),
  };
};

const normalizeJobsResponse = (payload: MarketJobsApiResponse & { results?: unknown[] }): MarketJobsApiResponse => ({
  ...payload,
  nextPageToken: normalizeText(payload.nextPageToken ?? payload.next_page_token) || null,
  results: Array.isArray(payload.results)
    ? payload.results.map((item, index) => normalizeAggregatedJob((item || {}) as RawAggregatedJob, index))
    : [],
});

const buildCompatibleSearchParams = (params: URLSearchParams) => {
  const next = new URLSearchParams(params.toString());
  const keyword = next.get('keyword') || next.get('query') || next.get('q') || '';

  if (keyword) {
    next.set('keyword', keyword);
    next.set('query', keyword);
    next.set('q', keyword);
  }

  return next;
};

const MARKET_JOB_ENDPOINTS = ['/jobs/market', '/jobs/search', '/jobs'] as const;
const LIVE_JOB_SEARCH_ENDPOINTS = ['/jobs/search', '/jobs', '/jobs/market'] as const;

const fetchJobsFromEndpoints = async (
  params: URLSearchParams,
  endpoints: readonly string[],
  options: { signal?: AbortSignal } = {}
): Promise<MarketJobsApiResponse> => {
  const compatibleParams = buildCompatibleSearchParams(params);
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(apiUrl(`${endpoint}?${compatibleParams.toString()}`), { signal: options.signal });
      const payload = await parseApiJson<MarketJobsApiResponse & { results?: unknown[] }>(response);
      return normalizeJobsResponse(payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch market jobs.');
};

export const fetchMarketJobsResponse = async (
  params: URLSearchParams,
  options: { signal?: AbortSignal } = {}
): Promise<MarketJobsApiResponse> => fetchJobsFromEndpoints(params, MARKET_JOB_ENDPOINTS, options);

export const fetchLiveJobSearchResponse = async (
  params: URLSearchParams,
  options: { signal?: AbortSignal } = {}
): Promise<MarketJobsApiResponse> => fetchJobsFromEndpoints(params, LIVE_JOB_SEARCH_ENDPOINTS, options);

export const aggregatedJobToJob = (job: AggregatedJob): Job => ({
  id: job.id,
  title: job.title,
  company: job.company,
  location: job.location,
  type: (job.remote ? 'remote' : 'full-time'),
  salary: {
    min: Number(job.salary?.min || 0),
    max: Number(job.salary?.max || 0),
    currency: job.salary?.currency || 'USD',
  },
  salaryText: job.salaryText,
  description: job.description,
  requirements: [],
  skills: Array.isArray(job.tags) ? job.tags : [],
  tags: Array.isArray(job.tags) ? job.tags : [],
  postedDate: job.postedDate,
  applyUrl: job.url,
});

export const fetchAggregatedJobs = async (filters: JobSearchFilters): Promise<AggregatedJobsResponse> => {
  const params = new URLSearchParams();
  if (filters.keyword.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.location.trim()) params.set('location', filters.location.trim());
  if (filters.remote) params.set('remote', 'true');
  if (filters.salaryMin > 0) params.set('salary_min', String(filters.salaryMin));
  params.set('page', String(filters.page || 1));
  params.set('limit', String(filters.limit || 20));
  if (filters.pageToken?.trim()) params.set('page_token', filters.pageToken.trim());

  const payload = await fetchLiveJobSearchResponse(params);
  const page = Number(payload.page ?? filters.page ?? 1);
  const limit = Number(payload.limit ?? filters.limit ?? 20);
  const nextPageToken = normalizeText(payload.nextPageToken ?? payload.next_page_token) || null;
  const total = Number(payload.total ?? payload.count ?? payload.results.length);
  const totalPages = Number(payload.totalPages ?? (nextPageToken ? page + 1 : page));

  return {
    success: Boolean(payload.success),
    endpoint: payload.endpoint,
    keyword: payload.keyword || filters.keyword,
    location: payload.location || filters.location,
    remote: Boolean(payload.remote ?? filters.remote),
    salaryMin: Number(payload.salaryMin ?? filters.salaryMin),
    page,
    limit,
    total,
    totalPages,
    results: Array.isArray(payload.results) ? payload.results : [],
    nextPageToken,
    cached: payload.cached,
    sources: payload.sources,
  };
};

export const fetchAggregatedJobById = async (
  jobId: string
): Promise<AggregatedJob> => {
  const params = new URLSearchParams({
    keyword: jobId,
    limit: '1',
    page: '1',
  });
  const payload = await fetchMarketJobsResponse(params);
  if (payload.results && payload.results.length > 0) {
    return payload.results[0];
  }
  throw new Error('Job not found');
};
