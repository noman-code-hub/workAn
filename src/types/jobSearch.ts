export interface AggregatedSalary {
  min: number;
  max: number;
  currency: string;
}

export interface AggregatedJob {
  id: string;
  source: 'arbeitnow' | 'remotive' | 'usajobs' | 'indeed_rss' | string;
  sourceJobId?: string;
  title: string;
  company: string;
  logoUrl?: string | null;
  location: string;
  description: string;
  salary: AggregatedSalary;
  salaryText?: string;
  url: string;
  type: string;
  remote: boolean;
  tags: string[];
  postedDate: string;
}

export interface AggregatedJobsResponse {
  success: boolean;
  endpoint?: string;
  keyword: string;
  location: string;
  remote: boolean;
  salaryMin: number;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  results: AggregatedJob[];
  cached?: boolean;
  sources?: Array<{
    source: string;
    ok: boolean;
    count?: number;
    message?: string;
  }>;
}
