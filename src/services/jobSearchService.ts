import { apiUrl, parseApiJson } from '../config/api';
import type { AggregatedJob, AggregatedJobsResponse } from '../types/jobSearch';

export interface JobSearchFilters {
  keyword: string;
  location: string;
  remote: boolean;
  salaryMin: number;
  page: number;
  limit?: number;
}

export const fetchAggregatedJobs = async (filters: JobSearchFilters): Promise<AggregatedJobsResponse> => {
  const params = new URLSearchParams();
  if (filters.keyword.trim()) params.set('q', filters.keyword.trim());
  if (filters.location.trim()) params.set('location', filters.location.trim());
  if (filters.remote) params.set('remote', 'true');
  if (filters.salaryMin > 0) params.set('salary_min', String(filters.salaryMin));
  params.set('page', String(filters.page || 1));
  params.set('limit', String(filters.limit || 20));

  const response = await fetch(apiUrl(`/jobs/market?${params.toString()}`));
  return parseApiJson<AggregatedJobsResponse>(response);
};

export const fetchAggregatedJobById = async (
  jobId: string,
  options?: Partial<Pick<JobSearchFilters, 'keyword' | 'location' | 'remote' | 'salaryMin'>>
): Promise<AggregatedJob> => {
  // Edge function doesn't support /jobs/id natively yet, but we provide a dummy wrapper
  // We can fallback to fetching the exact id from market if necessary, but JobDetails.tsx fetches from supabase client directly anyway.
  const response = await fetch(apiUrl(`/jobs/market?q=${encodeURIComponent(jobId)}&limit=1`));
  const payload = await parseApiJson<{ success: boolean; results: AggregatedJob[] }>(response);
  if (payload.results && payload.results.length > 0) {
    return payload.results[0];
  }
  throw new Error('Job not found');
};
