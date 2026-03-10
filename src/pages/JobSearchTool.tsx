import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAggregatedJobs } from '../services/jobSearchService';
import type { AggregatedJobsResponse } from '../types/jobSearch';
import { JobResultsList } from '../components/job-search/JobResultsList';
import { applySeoMeta } from '../utils/seo';

const parseBool = (value: string | null) => value === 'true' || value === '1';

export const JobSearchTool = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<AggregatedJobsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filters = useMemo(() => {
    return {
      keyword: searchParams.get('keyword') || 'software engineer',
      location: searchParams.get('location') || 'United States',
      remote: parseBool(searchParams.get('remote')),
      salaryMin: Number(searchParams.get('salary_min') || 0),
      page: Number(searchParams.get('page') || 1),
      limit: Number(searchParams.get('limit') || 20),
    };
  }, [searchParams]);

  useEffect(() => {
    applySeoMeta(
      'Job Search Tool | Multi-Source US Jobs',
      'Search jobs from Arbeitnow, Remotive, USAJOBS, and Indeed RSS in one place.',
      '/job-search',
      {
        keywords: 'job search tool, multi-source jobs, USA jobs, workshour',
      }
    );
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchAggregatedJobs(filters);
        if (!active) return;
        setData(result);
        localStorage.setItem('aggregated_jobs_recent', JSON.stringify(result.results.slice(0, 200)));
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
    const merged = {
      ...filters,
      ...next,
    };

    const params = new URLSearchParams();
    params.set('keyword', merged.keyword);
    params.set('location', merged.location);
    params.set('page', String(merged.page || 1));
    params.set('limit', String(merged.limit || 20));
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
      <header
        style={{
          borderRadius: 18,
          padding: '20px 16px',
          color: '#fff',
          background: 'linear-gradient(135deg, #0b3d91 0%, #0f766e 100%)',
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: '0 0 8px' }}>Job Search Tool</h1>
        <p style={{ margin: 0 }}>
          Aggregated jobs from Arbeitnow, Remotive, USAJOBS, and Indeed RSS.
        </p>
      </header>

      <section
        style={{
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #dbe2ea',
          padding: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
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
            placeholder="Minimum salary"
          />
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={filters.remote}
              onChange={(e) => updateFilters({ remote: e.target.checked, page: 1 })}
            />
            Remote only
          </label>
        </div>
      </section>

      <JobResultsList
        jobs={data?.results || []}
        loading={loading}
        error={error}
        page={data?.page || filters.page}
        totalPages={data?.totalPages || 1}
        total={data?.total || 0}
        detailQuery={detailQuery}
        onPageChange={(nextPage) => updateFilters({ page: Math.max(1, nextPage) })}
      />

      {data?.sources && data.sources.length > 0 && (
        <section style={{ marginTop: 16, padding: 12, border: '1px solid #dbe2ea', borderRadius: 12, background: '#fff' }}>
          <strong>Source status</strong>
          <ul>
            {data.sources.map((item) => (
              <li key={item.source}>
                {item.source}: {item.ok ? `ok (${item.count || 0})` : `error (${item.message})`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
};
