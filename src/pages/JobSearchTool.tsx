import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, DollarSign } from 'lucide-react';
import { fetchAggregatedJobs } from '../services/jobSearchService';
import type { AggregatedJobsResponse } from '../types/jobSearch';
import { JobResultsList } from '../components/job-search/JobResultsList';
import { applySeoMeta } from '../utils/seo';
import './JobSearchTool.css';

const parseBool = (value: string | null) => value === 'true' || value === '1';
const PAGE_TOKEN_CACHE_PREFIX = 'job-search:page-tokens';
const getSearchParamValue = (params: URLSearchParams, key: string, fallback = '') =>
  params.has(key) ? (params.get(key) ?? '') : fallback;

export const JobSearchTool = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<AggregatedJobsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filters = useMemo(() => {
    return {
      keyword: getSearchParamValue(searchParams, 'keyword'),
      location: getSearchParamValue(searchParams, 'location'),
      remote: parseBool(searchParams.get('remote')),
      salaryMin: Number(searchParams.get('salary_min') || 0),
      page: Number(searchParams.get('page') || 1),
      pageToken: searchParams.get('page_token') || '',
      limit: Number(searchParams.get('limit') || 20),
    };
  }, [searchParams]);

  const pageTokenCacheKey = useMemo(
    () =>
      [
        PAGE_TOKEN_CACHE_PREFIX,
        filters.keyword.trim().toLowerCase(),
        filters.location.trim().toLowerCase(),
        filters.remote ? 'remote' : 'onsite',
        String(filters.salaryMin || 0),
        String(filters.limit || 20),
      ].join(':'),
    [filters.keyword, filters.location, filters.remote, filters.salaryMin, filters.limit]
  );

  const readPageTokenCache = useCallback(() => {
    if (typeof window === 'undefined') return {} as Record<string, string>;
    try {
      const raw = window.sessionStorage.getItem(pageTokenCacheKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }, [pageTokenCacheKey]);

  const writePageTokenCache = useCallback((cache: Record<string, string>) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(pageTokenCacheKey, JSON.stringify(cache));
  }, [pageTokenCacheKey]);

  const getCachedPageToken = useCallback((page: number) => {
    if (page <= 1) return '';
    const cache = readPageTokenCache();
    return cache[String(page)] || '';
  }, [readPageTokenCache]);

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
        const effectivePageToken =
          filters.page > 1 ? (filters.pageToken || getCachedPageToken(filters.page)) : '';
        const result = await fetchAggregatedJobs({
          ...filters,
          pageToken: effectivePageToken,
        });
        if (!active) return;
        setData(result);
        localStorage.setItem('aggregated_jobs_recent', JSON.stringify(result.results.slice(0, 200)));

        const cache = readPageTokenCache();
        cache['1'] = '';
        if (filters.page > 1 && effectivePageToken) {
          cache[String(filters.page)] = effectivePageToken;
        }
        if (result.nextPageToken) {
          cache[String((result.page || filters.page || 1) + 1)] = result.nextPageToken;
        }
        writePageTokenCache(cache);
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
  }, [filters, getCachedPageToken, readPageTokenCache, writePageTokenCache]);

  const updateFilters = (next: Partial<typeof filters>) => {
    const merged = {
      ...filters,
      ...next,
    };

    const params = new URLSearchParams();
    if (merged.keyword.trim()) params.set('keyword', merged.keyword.trim());
    if (merged.location.trim()) params.set('location', merged.location.trim());
    params.set('page', String(merged.page || 1));
    params.set('limit', String(merged.limit || 20));
    if ((merged.page || 1) > 1 && merged.pageToken) params.set('page_token', merged.pageToken);
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
    <main className="job-search-tool-page">
      <div className="job-search-tool-shell">
        <header className="job-search-tool-header">
          <span className="job-search-tool-kicker">Search results</span>
          <h1>Find jobs that match your search</h1>
          <p>
            Search across multiple job sources with a cleaner marketplace-style results view.
          </p>
        </header>

        <section className="job-search-tool-filters" aria-label="Job search filters">
          <div className="job-search-tool-filter-grid">
            <label className="job-search-tool-field">
              <span className="job-search-tool-field-icon" aria-hidden="true">
                <Search size={16} />
              </span>
              <input
                value={filters.keyword}
                onChange={(e) => updateFilters({ keyword: e.target.value, page: 1 })}
                placeholder="Search by title, keyword, or company"
              />
            </label>

            <label className="job-search-tool-field">
              <span className="job-search-tool-field-icon" aria-hidden="true">
                <MapPin size={16} />
              </span>
              <input
                value={filters.location}
                onChange={(e) => updateFilters({ location: e.target.value, page: 1 })}
                placeholder="United States"
              />
            </label>

            <label className="job-search-tool-field">
              <span className="job-search-tool-field-icon" aria-hidden="true">
                <DollarSign size={16} />
              </span>
              <input
                type="number"
                min={0}
                value={filters.salaryMin || ''}
                onChange={(e) => updateFilters({ salaryMin: Number(e.target.value || 0), page: 1 })}
                placeholder="Minimum salary"
              />
            </label>

            <label className="job-search-tool-remote">
              <input
                type="checkbox"
                checked={filters.remote}
                onChange={(e) => updateFilters({ remote: e.target.checked, page: 1 })}
              />
              <span>Remote only</span>
            </label>
          </div>
        </section>

        <div className="job-search-tool-toolbar">
          <div className="job-search-tool-toolbar-copy">
            <strong>Top matches</strong>
            <span>Live listings from Arbeitnow, Remotive, USAJOBS, and Indeed RSS.</span>
          </div>
          <div className="job-search-tool-toolbar-pills">
            {filters.keyword ? <span>{filters.keyword}</span> : null}
            {filters.location ? <span>{filters.location}</span> : null}
            {filters.remote ? <span>Remote</span> : null}
          </div>
        </div>

        <JobResultsList
          jobs={data?.results || []}
          loading={loading}
          error={error}
          page={data?.page || filters.page}
          totalPages={data?.totalPages || 1}
          total={data?.total || 0}
          hasNextPage={Boolean(data?.nextPageToken) || (data?.page || filters.page) < (data?.totalPages || 1)}
          detailQuery={detailQuery}
          onPageChange={(nextPage) => {
            const safeNextPage = Math.max(1, nextPage);
            if (safeNextPage <= 1) {
              updateFilters({ page: 1, pageToken: '' });
              return;
            }

            if (safeNextPage > filters.page) {
              const nextPageToken = data?.nextPageToken || getCachedPageToken(safeNextPage);
              if (!nextPageToken) return;
              updateFilters({ page: safeNextPage, pageToken: nextPageToken });
              return;
            }

            updateFilters({ page: safeNextPage, pageToken: getCachedPageToken(safeNextPage) });
          }}
        />

        {data?.sources && data.sources.length > 0 && (
          <section className="job-search-tool-sources">
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
      </div>
    </main>
  );
};
