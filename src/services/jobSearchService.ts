import { apiUrl, parseApiJson } from '../config/api';
import type { AggregatedJob, AggregatedJobsResponse } from '../types/jobSearch';
import type { Job } from '../types';

export interface JobSearchFilters {
  keyword: string;
  location: string;
  remote: boolean;
  salaryMin: number;
  page: number;
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

export const fetchMarketJobsResponse = async (
  params: URLSearchParams,
  options: { signal?: AbortSignal } = {}
): Promise<MarketJobsApiResponse> => {
  const compatibleParams = buildCompatibleSearchParams(params);
  let lastError: unknown;

  for (const endpoint of MARKET_JOB_ENDPOINTS) {
    try {
      const response = await fetch(apiUrl(`${endpoint}?${compatibleParams.toString()}`), { signal: options.signal });
      return await parseApiJson<MarketJobsApiResponse>(response);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch market jobs.');
};

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

  const payload = await fetchMarketJobsResponse(params);
  return {
    success: Boolean(payload.success),
    endpoint: payload.endpoint,
    keyword: payload.keyword || filters.keyword,
    location: payload.location || filters.location,
    remote: Boolean(payload.remote ?? filters.remote),
    salaryMin: Number(payload.salaryMin ?? filters.salaryMin),
    page: Number(payload.page ?? filters.page ?? 1),
    limit: Number(payload.limit ?? filters.limit ?? 20),
    total: Number(payload.total ?? payload.count ?? payload.results.length),
    totalPages: Number(payload.totalPages ?? 1),
    results: Array.isArray(payload.results) ? payload.results : [],
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
