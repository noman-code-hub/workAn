import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { JobResultsList } from '../components/job-search/JobResultsList';
import { fetchAggregatedJobs } from '../services/jobSearchService';
import type { AggregatedJobsResponse } from '../types/jobSearch';
import { applySeoMeta } from '../utils/seo';

type SeoPageConfig = {
  title: string;
  description: string;
  keyword: string;
  location: string;
  remote: boolean;
};

const seoConfigs: Record<string, SeoPageConfig> = {
  '/remote-software-engineer-jobs': {
    title: 'Remote Software Engineer Jobs',
    description: 'Live remote software engineering roles in the USA from multiple free job APIs and RSS feeds.',
    keyword: 'software engineer',
    location: 'United States',
    remote: true,
  },
  '/truck-driver-jobs-usa': {
    title: 'Truck Driver Jobs USA',
    description: 'Current truck driver jobs across the United States aggregated from public job feeds.',
    keyword: 'truck driver',
    location: 'United States',
    remote: false,
  },
  '/nurse-jobs-usa': {
    title: 'Nurse Jobs USA',
    description: 'Find nurse openings across the USA with filters and pagination.',
    keyword: 'nurse',
    location: 'United States',
    remote: false,
  },
  '/government-jobs-usa': {
    title: 'Government Jobs USA',
    description: 'Browse government job opportunities in the United States from USAJOBS and other public sources.',
    keyword: 'government',
    location: 'United States',
    remote: false,
  },
};

export const SeoJobsPage = () => {
  const routeLocation = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<AggregatedJobsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const config = seoConfigs[routeLocation.pathname] || seoConfigs['/remote-software-engineer-jobs'];

  const filters = useMemo(() => {
    return {
      keyword: searchParams.get('keyword') || config.keyword,
      location: searchParams.get('location') || config.location,
      remote: searchParams.get('remote') ? searchParams.get('remote') === 'true' : config.remote,
      salaryMin: Number(searchParams.get('salary_min') || 0),
      page: Number(searchParams.get('page') || 1),
      limit: 20,
    };
  }, [searchParams, config]);

  useEffect(() => {
    applySeoMeta(
      `${config.title} | Workshour`,
      config.description,
      routeLocation.pathname,
      {
        keywords: `${config.keyword} jobs, ${config.location} jobs, workshour`,
      }
    );
  }, [config, routeLocation.pathname]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchAggregatedJobs(filters);
        if (!active) return;
        setData(response);
        localStorage.setItem('aggregated_jobs_recent', JSON.stringify(response.results.slice(0, 100)));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [filters]);

  const updateFilters = (next: Partial<typeof filters>) => {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.keyword) params.set('keyword', merged.keyword);
    if (merged.location) params.set('location', merged.location);
    params.set('page', String(merged.page || 1));
    if (merged.remote) params.set('remote', 'true');
    if (merged.salaryMin > 0) params.set('salary_min', String(merged.salaryMin));
    setSearchParams(params);
  };

  const detailQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.location) params.set('location', filters.location);
    if (filters.remote) params.set('remote', 'true');
    if (filters.salaryMin > 0) params.set('salary_min', String(filters.salaryMin));
    const value = params.toString();
    return value ? `?${value}` : '';
  }, [filters.keyword, filters.location, filters.remote, filters.salaryMin]);

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 32px' }}>
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ marginBottom: 8 }}>{config.title}</h1>
        <p style={{ margin: 0, color: '#4b5563' }}>{config.description}</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
        <input
          value={filters.keyword}
          onChange={(e) => updateFilters({ keyword: e.target.value, page: 1 })}
          placeholder="Keyword"
        />
        <input
          value={filters.location}
          onChange={(e) => updateFilters({ location: e.target.value, page: 1 })}
          placeholder="Location"
        />
        <input
          type="number"
          min={0}
          value={filters.salaryMin || ''}
          onChange={(e) => updateFilters({ salaryMin: Number(e.target.value || 0), page: 1 })}
          placeholder="Min salary"
        />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={filters.remote}
            onChange={(e) => updateFilters({ remote: e.target.checked, page: 1 })}
          />
          Remote only
        </label>
      </section>

      <JobResultsList
        jobs={data?.results || []}
        loading={loading}
        error={error}
        page={data?.page || 1}
        totalPages={data?.totalPages || 1}
        total={data?.total || 0}
        detailQuery={detailQuery}
        onPageChange={(nextPage) => updateFilters({ page: Math.max(1, nextPage) })}
      />
    </main>
  );
};
