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
  if (filters.keyword.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.location.trim()) params.set('location', filters.location.trim());
  if (filters.remote) params.set('remote', 'true');
  if (filters.salaryMin > 0) params.set('salary_min', String(filters.salaryMin));
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit || 20));

  const response = await fetch(apiUrl(`/jobs?${params.toString()}`));
  return parseApiJson<AggregatedJobsResponse>(response);
};

export const fetchAggregatedJobById = async (
  jobId: string,
  options?: Partial<Pick<JobSearchFilters, 'keyword' | 'location' | 'remote' | 'salaryMin'>>
): Promise<AggregatedJob> => {
  const params = new URLSearchParams();
  if (options?.keyword) params.set('keyword', options.keyword);
  if (options?.location) params.set('location', options.location);
  if (options?.remote) params.set('remote', 'true');
  if (typeof options?.salaryMin === 'number' && options.salaryMin > 0) {
    params.set('salary_min', String(options.salaryMin));
  }
  if ([options?.keyword, options?.location, options?.remote, options?.salaryMin].some((value) => value != null)) {
    params.set('refresh', 'true');
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(apiUrl(`/jobs/${encodeURIComponent(jobId)}${suffix}`));
  const payload = await parseApiJson<{ success: boolean; job: AggregatedJob }>(response);
  return payload.job;
};
