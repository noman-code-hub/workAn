import { useState, useEffect, useRef, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Heart,
  ThumbsDown,
  FolderPlus,
  ExternalLink,
  Filter,
  Briefcase,
  Sparkles,
  TrendingUp,
  X,
  User,
} from 'lucide-react';

import type { Job } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { JobLogo } from '../components/JobLogo';
import { getApplyLink } from '../utils/jobUtils';
import { apiUrl, parseApiJson } from '../config/api';

const getCompanyUrl = (company: string) => {
  const clean = company.toLowerCase()
    .replace(/[,.]/g, '')
    .replace(/\s+(inc|llc|ltd|corp|limited|company|co|plc)$/i, '')
    .trim()
    .replace(/\s+/g, '');
  return `https://www.${clean}.com`;
};

const popularRoles = ['Remote Engineer', 'Product Manager', 'Data Scientist'];

const networkNodes = [
  { top: '12%', left: '11%' },
  { top: '21%', left: '31%' },
  { top: '12%', left: '47%' },
  { top: '31%', left: '63%' },
  { top: '57%', left: '31%' },
  { top: '68%', left: '47%' },
  { top: '45%', left: '20%' },
  { top: '45%', left: '58%' },
];

const networkLines = [
  { top: '14%', left: '12%', width: '18%', rotate: '15deg' },
  { top: '22%', left: '31%', width: '15%', rotate: '-13deg' },
  { top: '14%', left: '47%', width: '17%', rotate: '20deg' },
  { top: '24%', left: '31%', width: '18%', rotate: '63deg' },
  { top: '34%', left: '21%', width: '27%', rotate: '15deg' },
  { top: '45%', left: '20%', width: '10%', rotate: '-74deg' },
  { top: '58%', left: '31%', width: '16%', rotate: '17deg' },
  { top: '58%', left: '31%', width: '28%', rotate: '-14deg' },
];

export const Jobs = () => {
  const { user } = useAuth();
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const isResultsPage = routeLocation.pathname === '/jobs/results';
  const initialSearchParams = new URLSearchParams(routeLocation.search);
  const initialQueryFromUrl = (initialSearchParams.get('q') || '').trim();
  const initialLocationFromUrl = (initialSearchParams.get('location') || '').trim();
  const initialTypeFromUrl = (initialSearchParams.get('contract_type') || '').trim();
  const hasInitialSearchParams = Boolean(initialQueryFromUrl || initialLocationFromUrl || initialTypeFromUrl);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQueryFromUrl);
  const [locationFilter, setLocationFilter] = useState(initialLocationFromUrl);
  const [typeFilter, setTypeFilter] = useState<string>(initialTypeFromUrl);
  const [showFilters, setShowFilters] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState('');
  const [hasSearched, setHasSearched] = useState(isResultsPage && hasInitialSearchParams);

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayedQuery, setDisplayedQuery] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'best' | 'latest' | 'salary-high' | 'salary-low'>('best');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const handleApply = async (job: Job) => {
    setApplyingId(job.id);
    try {
      const url = await getApplyLink(job);
      window.open(url, '_blank');
    } catch (error) {
      window.open(job.applyUrl || '#', '_blank');
    } finally {
      setApplyingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSearch = () => {
    const queryValue = searchQuery.trim();
    const locationValue = locationFilter.trim();
    const params = new URLSearchParams();
    if (queryValue) params.set('q', queryValue);
    if (locationValue) params.set('location', locationValue);
    if (typeFilter) params.set('contract_type', typeFilter);
    const targetSearch = params.toString() ? `?${params.toString()}` : '';

    if (isResultsPage && routeLocation.search === targetSearch) {
      setHasSearched(Boolean(queryValue || locationValue || typeFilter));
      setPage(1);
      fetchJobs(1, true, {
        query: queryValue,
        location: locationValue,
        contractType: typeFilter,
      });
      return;
    }

    navigate(`/jobs/results${targetSearch}`);
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchJobs = async (
    pageNum = 1,
    shouldReplace = false,
    overrides?: {
      query?: string;
      location?: string;
      contractType?: string;
    }
  ) => {
    if (shouldReplace && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (shouldReplace) {
      setLoading(true);
      setNextPageToken(null);
    } else {
      setLoadingMore(true);
    }

    try {
      setErrorMessage('');
      const resolvedQuery = (overrides?.query ?? searchQuery).trim();
      const resolvedLocation = overrides?.location ?? locationFilter;
      const resolvedContractType = overrides?.contractType ?? typeFilter;
      const effectiveQuery = resolvedQuery || (user?.profession ? user.profession : 'jobs');

      const getCountryCode = (location: string) => {
        if (!location) return 'us';
        const locationLower = location.toLowerCase();
        if (locationLower.includes('united states') || locationLower.includes('usa') || locationLower.includes('america')) {
          return 'us';
        }
        if (locationLower.includes('united kingdom') || locationLower.includes('uk') || locationLower.includes('britain') || locationLower.includes('london')) {
          return 'gb';
        }
        if (locationLower.includes('canada')) return 'ca';
        if (locationLower.includes('australia')) return 'au';
        if (locationLower.includes('india')) return 'in';
        return 'us';
      };

      const countryCode = getCountryCode(resolvedLocation);

      const params = new URLSearchParams();
      params.append('query', effectiveQuery);
      params.append('country', countryCode);
      params.append('page', pageNum.toString());
      params.append('results_per_page', '50');

      if (!shouldReplace && nextPageToken) {
        params.append('page_token', nextPageToken);
      }

      if (resolvedLocation) params.append('location', resolvedLocation);
      if (resolvedContractType) params.append('contract_type', resolvedContractType);

      const url = apiUrl(`/jobs/search?${params.toString()}`);
      console.log('Fetching jobs from:', url);

      const response = await fetch(url, { signal: controller.signal });
      const data = await parseApiJson<any>(response);

      if (data.success) {
        if (shouldReplace) {
          const uniqueResults = data.results.filter((job: any, index: number, self: any[]) =>
            index === self.findIndex((t) => (
              t.company?.toLowerCase().trim() === job.company?.toLowerCase().trim() &&
              t.title?.toLowerCase().trim() === job.title?.toLowerCase().trim()
            ))
          );
          setFilteredJobs(uniqueResults);
          setDisplayedQuery(effectiveQuery);
        } else {
          setFilteredJobs(prev => {
            const seen = new Set(prev.map(j => `${j.company?.toLowerCase().trim()}-${j.title?.toLowerCase().trim()}`));
            const uniqueNew = data.results.filter((job: any) => {
              const key = `${job.company?.toLowerCase().trim()}-${job.title?.toLowerCase().trim()}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return [...prev, ...uniqueNew];
          });
        }

        if (data.next_page_token) {
          setNextPageToken(data.next_page_token);
        } else {
          setNextPageToken(null);
        }

        if (data.count) {
          const rawCount = data.count;
          const cleanCount = typeof rawCount === 'string'
            ? parseInt(rawCount.replace(/[^0-9]/g, ''), 10)
            : (typeof rawCount === 'number' ? rawCount : 0);
          setTotalJobs(cleanCount);
        }

        if (shouldReplace && data.results && data.results.length > 0) {
          localStorage.setItem('recentJobs', JSON.stringify(data.results));
        } else if (data.results && data.results.length > 0) {
          const existing = localStorage.getItem('recentJobs');
          const existingJobs = existing ? JSON.parse(existing) : [];
          const allJobs = [...existingJobs, ...data.results];
          const uniqueJobs = allJobs.filter((job: any, index: number, self: any[]) =>
            index === self.findIndex((t) => t.id === job.id)
          );
          localStorage.setItem('recentJobs', JSON.stringify(uniqueJobs.slice(-200)));
        }
      } else {
        throw new Error(data.message || 'API error');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🟡 Fetch aborted due to component unmount or new search.');
      } else {
        console.error("Error connecting to server:", error);
        const message = error instanceof Error ? error.message : 'Unable to load jobs right now.';
        setErrorMessage(message);
        if (shouldReplace) {
          setFilteredJobs([]);
          setTotalJobs(0);
        }
      }
    } finally {
      if (abortControllerRef.current === controller && !controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(routeLocation.search);
    const q = (params.get('q') || '').trim();
    const loc = (params.get('location') || '').trim();
    const contractType = (params.get('contract_type') || '').trim();
    const shouldSearch = isResultsPage && Boolean(q || loc || contractType);

    setSearchQuery(q);
    setLocationFilter(loc);
    setTypeFilter(contractType);
    setHasSearched(shouldSearch);
    setPage(1);

    if (!isResultsPage && (q || loc || contractType)) {
      navigate(`/jobs/results?${params.toString()}`, { replace: true });
      return;
    }

    if (!shouldSearch) {
      setFilteredJobs([]);
      setDisplayedQuery('');
      setTotalJobs(0);
      setNextPageToken(null);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    fetchJobs(1, true, {
      query: q,
      location: loc,
      contractType,
    });
  }, [isResultsPage, routeLocation.search]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchJobs(nextPage, false);
  };

  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore && nextPageToken) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadingMore, nextPageToken]);

  const toggleBookmark = (jobId: string) => {
    setBookmarkedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const toggleDescription = (jobId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const formatSalary = (job: Job) => {
    return `$${(job.salary.min / 1000).toFixed(0)}k - $${(job.salary.max / 1000).toFixed(0)}k`;
  };

  const getTimeSince = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const days = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const staggerStyle = (index: number, delay = 0): CSSProperties => ({
    ['--i' as string]: index,
    ['--delay' as string]: `${delay}ms`,
  });

  const activeFiltersCount = [locationFilter, typeFilter].filter(Boolean).length;
  const activeFilterPills = [
    locationFilter ? { key: 'location' as const, label: `Location: ${locationFilter}` } : null,
    typeFilter ? { key: 'type' as const, label: `Type: ${typeFilter.replace('-', ' ')}` } : null,
  ].filter(Boolean) as Array<{ key: 'location' | 'type'; label: string }>;

  const clearSingleFilter = (key: 'location' | 'type') => {
    if (key === 'location') setLocationFilter('');
    if (key === 'type') setTypeFilter('');
  };

  const renderHighlighted = (text: string, query: string) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return text;
    const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'ig');
    const parts = text.split(regex);
    return parts.map((part, index) => (
      part.toLowerCase() === cleanQuery.toLowerCase()
        ? <mark key={`${part}-${index}`} className="result-highlight">{part}</mark>
        : <span key={`${part}-${index}`}>{part}</span>
    ));
  };

  const visibleJobs = useMemo(() => {
    const min = budgetMin ? Number(budgetMin) : 0;
    const max = budgetMax ? Number(budgetMax) : 0;

    let next = filteredJobs.filter((job) => {
      const low = Number(job.salary.min || 0);
      const high = Number(job.salary.max || 0);
      if (min > 0 && high < min) return false;
      if (max > 0 && low > max) return false;
      return true;
    });

    if (sortBy === 'latest') {
      next = [...next].sort((a, b) => {
        const ta = new Date(a.postedDate).getTime();
        const tb = new Date(b.postedDate).getTime();
        return tb - ta;
      });
    } else if (sortBy === 'salary-high') {
      next = [...next].sort((a, b) => (b.salary.max || 0) - (a.salary.max || 0));
    } else if (sortBy === 'salary-low') {
      next = [...next].sort((a, b) => (a.salary.min || 0) - (b.salary.min || 0));
    }

    return next;
  }, [filteredJobs, budgetMin, budgetMax, sortBy]);

  const headlineQuery = displayedQuery || searchQuery;
  const showSearchPage = !isResultsPage;
  const showResultsSection = isResultsPage;

  return (
    <div className={`jobs-page-modern ${showSearchPage ? 'jobs-hero-only' : ''}`}>
      <div className="jobs-glow jobs-glow-top" />
      <div className="jobs-glow jobs-glow-bottom" />

      {/* Hero Search Section */}
      {showSearchPage && (
      <section className="search-hero fade-in delay-0">
        <div className="hero-network" aria-hidden="true">
          {networkLines.map((line, index) => (
            <span
              key={`line-${index}`}
              className="hero-network-line"
              style={{
                top: line.top,
                left: line.left,
                width: line.width,
                transform: `rotate(${line.rotate})`,
              }}
            />
          ))}
          {networkNodes.map((node, index) => (
            <span
              key={`node-${index}`}
              className="hero-network-node"
              style={{ top: node.top, left: node.left }}
            />
          ))}
        </div>

        <div className="search-hero-content">
          <div className="hero-kicker">
            <Sparkles size={16} />
            <span>AI Career Match Engine</span>
          </div>
          <h1 className="hero-title">
            Find the role that <span>fits your DNA.</span>
          </h1>
          <p className="hero-subtitle">
            workIn uses AI to analyze your skills and preferences, matching you
            with opportunities where you can truly thrive.
          </p>

          <div className="modern-search-box">
            <div className="search-input-group">
              <Search className="input-icon" size={20} />
              <input
                type="text"
                placeholder="Job title, skills, or keywords"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="search-input"
              />
            </div>

            <div className="search-divider"></div>

            <div className="search-input-group">
              <MapPin className="input-icon" size={20} />
              <input
                type="text"
                placeholder="City, state, or remote"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="search-input"
              />
            </div>

            <button onClick={handleSearch} className="search-btn-modern">
              Search
            </button>
          </div>

          <div className="hero-popular">
            <span className="hero-popular-label">Popular:</span>
            <div className="hero-popular-chips">
              {popularRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  className="hero-popular-chip"
                  onClick={() => setSearchQuery(role)}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-insights">
            <article className="insight-card">
              <div className="insight-icon">
                <Briefcase size={18} />
              </div>
              <div>
                <p className="insight-value">50k+</p>
                <p className="insight-label">roles indexed daily</p>
              </div>
            </article>
            <article className="insight-card">
              <div className="insight-icon">
                <TrendingUp size={18} />
              </div>
              <div>
                <p className="insight-value">91%</p>
                <p className="insight-label">higher relevance match</p>
              </div>
            </article>
          </div>
        </div>
      </section>
      )}

      {/* Jobs List */}
      {showResultsSection && (
      <div className="jobs-container">
        {!hasSearched ? (
          <div className="empty-state-modern">
            <Briefcase size={64} className="empty-icon" />
            <h3>Start with a search</h3>
            <p>Use the Jobs search page to enter your keyword and location first.</p>
            <button className="btn-primary-modern" onClick={() => navigate('/jobs')}>
              Go to Search
            </button>
          </div>
        ) : (
        <div className="jobs-market-layout">
          <aside className={`jobs-market-sidebar ${showFilters ? 'open' : ''}`}>
            <button
              className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              {showFilters ? 'Hide Filters' : `Show Filters (${activeFiltersCount})`}
            </button>

            <div className="market-filter-block">
              <div className="market-filter-title">Category</div>
              <select
                className="market-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Select Categories</option>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            <div className="market-filter-block">
              <div className="market-filter-title">Experience level</div>
              <label className="market-check"><input type="checkbox" /> Entry level</label>
              <label className="market-check"><input type="checkbox" /> Intermediate</label>
              <label className="market-check"><input type="checkbox" /> Expert</label>
            </div>

            <div className="market-filter-block">
              <div className="market-filter-title">Budget range</div>
              <div className="market-budget-row">
                <input
                  type="number"
                  className="market-budget-input"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="$ Min"
                />
                <input
                  type="number"
                  className="market-budget-input"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="$ Max"
                />
              </div>
            </div>

            {activeFilterPills.length > 0 && (
              <div className="jobs-toolbar-filters">
                {activeFilterPills.map((pill) => (
                  <button
                    key={pill.key}
                    className="active-filter-pill"
                    onClick={() => clearSingleFilter(pill.key)}
                  >
                    {pill.label}
                    <X size={14} />
                  </button>
                ))}
              </div>
            )}

            <button
              className="clear-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setLocationFilter('');
                setTypeFilter('');
                setBudgetMin('');
                setBudgetMax('');
              }}
            >
              <X size={16} />
              Clear Filters
            </button>
          </aside>

          <section className="jobs-market-results">
            <div className="jobs-market-toolbar">
              <div className="jobs-market-toolbar-left">
                <button className="save-search-btn">
                  <FolderPlus size={18} />
                  Save search
                </button>
                <span className="results-count">
                  {totalJobs.toLocaleString()} jobs found for "{displayedQuery || searchQuery || 'jobs'}"
                </span>
              </div>
              <div className="jobs-market-toolbar-right">
                <button className="saved-jobs-btn">
                  <Heart size={18} />
                  Saved jobs ({bookmarkedIds.size})
                </button>
                <select
                  className="market-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'best' | 'latest' | 'salary-high' | 'salary-low')}
                >
                  <option value="best">Sort by: Best Matches</option>
                  <option value="latest">Sort by: Latest</option>
                  <option value="salary-high">Sort by: Salary high to low</option>
                  <option value="salary-low">Sort by: Salary low to high</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="jobs-list">
                {[1, 2, 3, 4].map((i, index) => (
                  <div key={i} className="job-card-skeleton fade-in delay-2" style={staggerStyle(index, 120)}>
                    <div className="skeleton-header"></div>
                    <div className="skeleton-content"></div>
                    <div className="skeleton-footer"></div>
                  </div>
                ))}
              </div>
            ) : visibleJobs.length === 0 ? (
              <div className="empty-state-modern">
                <Briefcase size={64} className="empty-icon" />
                <h3>No jobs found</h3>
                <p>{errorMessage || 'Try adjusting your search or filters'}</p>
              </div>
            ) : (
              <>
                <div className="jobs-market-list">
                  {visibleJobs.map((job, index) => (
                    <article key={job.id} className="market-job-card fade-in delay-2" style={staggerStyle(index, 80)}>
                      <div className="market-job-headline">
                        <span className="market-posted">Posted {getTimeSince(job.postedDate).toLowerCase()}</span>
                        <div className="market-action-icons">
                          <button className="market-icon-btn" type="button">
                            <ThumbsDown size={18} />
                          </button>
                          <button
                            className={`market-icon-btn ${bookmarkedIds.has(job.id) ? 'active' : ''}`}
                            type="button"
                            onClick={() => toggleBookmark(job.id)}
                          >
                            <Heart size={18} fill={bookmarkedIds.has(job.id) ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </div>

                      <div className="market-company-row">
                        <a
                          href={getCompanyUrl(job.company)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="market-company-logo"
                          aria-label={`${job.company} company website`}
                        >
                          <JobLogo company={job.company} />
                        </a>
                        <a
                          href={getCompanyUrl(job.company)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="market-company-link"
                        >
                          {job.company}
                        </a>
                      </div>

                      <h3 className="market-job-title">{renderHighlighted(job.title, headlineQuery)}</h3>
                      <div className="market-job-meta">
                        <span className="verified-dot">Payment verified</span>
                        <span>4.7</span>
                        <span>{formatSalary(job)}</span>
                        <span><MapPin size={15} /> {job.location}</span>
                      </div>
                      <p className="market-budget-line">
                        {job.type.replace('-', ' ')} - Est. budget: {formatSalary(job)}
                      </p>

                      <p className="market-job-description">
                        {expandedDescriptions.has(job.id) || job.description.length <= 220
                          ? renderHighlighted(job.description, headlineQuery)
                          : renderHighlighted(`${job.description.substring(0, 220)}...`, headlineQuery)}
                      </p>

                      {job.description.length > 220 && (
                        <button
                          className="toggle-desc-btn"
                          onClick={() => toggleDescription(job.id)}
                        >
                          {expandedDescriptions.has(job.id) ? 'Show less' : 'Show more'}
                        </button>
                      )}

                      <div className="market-skill-row">
                        {(job.skills.length ? job.skills : job.tags).slice(0, 7).map((skill) => (
                          <span key={`${job.id}-${skill}`} className="market-skill-chip">
                            {renderHighlighted(skill, headlineQuery)}
                          </span>
                        ))}
                      </div>

                      <div className="market-job-footer">
                        <span className="proposal-count">
                          Proposals: {job.applicantsCount ? `${job.applicantsCount}+` : 'Open'}
                        </span>
                        <div className="job-actions-modern">
                          <button
                            onClick={() => handleApply(job)}
                            className="btn-apply-modern"
                            disabled={applyingId === job.id}
                          >
                            {applyingId === job.id ? 'Checking...' : 'Apply'}
                          </button>
                          <button
                            onClick={() => {
                              navigate(`/jobs/${job.id}`, { state: { returnTo: '/jobs/results', returnLabel: 'Back to Results' } });
                            }}
                            className="btn-details-modern"
                          >
                            <ExternalLink size={18} />
                            Details
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {nextPageToken && (
                  <div
                    ref={observerTarget}
                    className="load-more-trigger"
                  >
                    {loadingMore && (
                      <p className="loading-text">Loading more jobs...</p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
        )}
      </div>
      )}

      {/* Chat Assistant Button */}
      <button className="chat-assistant" onClick={() => navigate('/ai-copilot')}>
        <div className="chat-icon-modern">
          <User size={24} />
        </div>
        <span>Chat with AI</span>
      </button>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap');

        * {
          box-sizing: border-box;
        }

        .jobs-page-modern {
          min-height: 100%;
          background: #f8fffe;
          font-family: var(--font-family);
        }

        /* Search Hero */
        .search-hero {
          background: linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%);
          padding: 60px 24px 40px;
          border-bottom: 1px solid #e5e7eb;
        }

        .search-hero-content {
          max-width: 900px;
          margin: 0 auto;
        }

        .search-hero h1 {
          font-size: 42px;
          font-weight: 800;
          text-align: center;
          color: #111827;
          margin-bottom: 16px;
        }

        .highlight {
          color: #00d4aa;
        }

        .subtitle {
          text-align: center;
          font-size: 18px;
          color: #6b7280;
          margin-bottom: 40px;
        }

        /* Modern Search Box */
        .modern-search-box {
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid #00d4aa;
          border-radius: 50px;
          padding: 8px 8px 8px 24px;
          box-shadow: 0 10px 40px rgba(0, 212, 170, 0.15);
          margin-bottom: 24px;
        }

        .search-input-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .input-icon {
          color: #9ca3af;
          flex-shrink: 0;
        }

        .search-input {
          border: none;
          outline: none;
          font-size: 15px;
          width: 100%;
          color: #111827;
          background: transparent;
        }

        .search-input::placeholder {
          color: #9ca3af;
        }

        .search-divider {
          width: 1px;
          height: 32px;
          background: #e5e7eb;
          margin: 0 16px;
        }

        .search-btn-modern {
          background: #00d4aa;
          color: white;
          border: none;
          padding: 14px 40px;
          border-radius: 40px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .search-btn-modern:hover {
          background: #00bd98;
        }

        /* Filter Row */
        .filter-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin: 16px 0 12px;
        }

        .filter-toggle-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e5e7eb;
          color: #374151;
          padding: 10px 20px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-toggle-btn:hover {
          border-color: #00d4aa;
          color: #00d4aa;
        }

        .results-count {
          color: #6b7280;
          font-size: 14px;
          font-weight: 600;
        }

        /* Filters Panel */
        .filters-panel-modern {
          display: flex;
          align-items: end;
          gap: 16px;
          margin-top: 24px;
          padding: 20px;
          background: white;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
        }

        .filter-item {
          flex: 1;
        }

        .filter-item label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #374151;
        }

        .filter-select {
          width: 100%;
          padding: 10px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          color: #111827;
          background: white;
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: #00d4aa;
        }

        .clear-filters-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: 1px solid #e5e7eb;
          color: #6b7280;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          justify-content: center;
        }

        .clear-filters-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        /* Jobs Container */
        .jobs-container {
          max-width: 1460px;
          margin: 0 auto;
          padding: 34px 22px 28px;
          background:
            radial-gradient(circle at 85% 22%, rgba(125, 211, 252, 0.33), transparent 46%),
            radial-gradient(circle at 8% 90%, rgba(186, 230, 253, 0.42), transparent 48%),
            #eff7ff;
          border-radius: 18px;
        }

        .jobs-market-layout {
          display: grid;
          grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }

        .jobs-market-layout > * {
          min-width: 0;
        }

        .jobs-market-sidebar {
          position: sticky;
          top: 88px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 20px 18px 16px;
          display: grid;
          gap: 18px;
          width: 100%;
          max-width: 360px;
          overflow: hidden;
        }

        .jobs-market-sidebar.open {
          box-shadow: 0 12px 36px -28px rgba(15, 23, 42, 0.55);
        }

        .market-filter-block {
          display: grid;
          gap: 10px;
          padding-bottom: 14px;
          border-bottom: 1px solid #edf0f2;
        }

        .market-filter-title {
          font-size: 1.08rem;
          font-weight: 700;
          color: #0f172a;
        }

        .market-select {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          min-height: 44px;
          padding: 0 12px;
          font-size: 0.96rem;
          color: #334155;
          background: #fff;
          width: 100%;
          max-width: 100%;
        }

        .market-check {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          color: #111827;
        }

        .market-budget-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .market-budget-input {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          min-height: 40px;
          padding: 0 12px;
          font-size: 0.92rem;
          width: 100%;
          max-width: 100%;
        }

        .jobs-market-results {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 16px 24px 6px;
          overflow: hidden;
          min-width: 0;
        }

        .jobs-market-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #e8edf3;
          padding: 2px 0 14px;
          margin-bottom: 10px;
        }

        .jobs-market-toolbar-left,
        .jobs-market-toolbar-right {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .save-search-btn,
        .saved-jobs-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          background: none;
          color: #15803d;
          font-size: 1.08rem;
          cursor: pointer;
          padding: 0;
        }

        .saved-jobs-btn {
          color: #16a34a;
        }

        .market-sort-select {
          min-height: 52px;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 0 20px;
          min-width: 290px;
          font-size: 1.04rem;
          color: #0f172a;
          background: #fff;
        }

        .jobs-market-list {
          display: grid;
        }

        .market-job-card {
          border-bottom: 1px solid #e5e7eb;
          padding: 20px 0 24px;
        }

        .market-job-card:last-child {
          border-bottom: none;
        }

        .market-job-headline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .market-posted {
          color: #6b7280;
          font-size: 1rem;
        }

        .market-company-row {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: 6px;
          margin-bottom: 4px;
        }

        .market-company-logo {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .market-company-link {
          color: #334155;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 600;
        }

        .market-company-link:hover {
          color: #0f766e;
        }

        .market-action-icons {
          display: inline-flex;
          gap: 10px;
        }

        .market-icon-btn {
          width: 48px;
          height: 48px;
          border-radius: 999px;
          border: 1px solid #d1d5db;
          background: #fff;
          color: #4b5563;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .market-icon-btn.active {
          color: #16a34a;
          border-color: #86efac;
          background: #f0fdf4;
        }

        .market-job-title {
          margin: 8px 0;
          font-size: clamp(1.55rem, 2.1vw, 2.15rem);
          line-height: 1.14;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .market-job-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: center;
          color: #4b5563;
          font-size: 1.05rem;
          margin-bottom: 8px;
        }

        .market-job-meta span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .verified-dot {
          color: #2563eb;
          font-weight: 600;
        }

        .market-budget-line {
          margin: 0 0 8px;
          font-size: 1.03rem;
          color: #374151;
        }

        .market-job-description {
          color: #1f2937;
          line-height: 1.47;
          margin: 0 0 12px;
          font-size: 1.04rem;
          max-width: 92%;
        }

        .result-highlight {
          background: #a3e635;
          padding: 0 2px;
          border-radius: 4px;
          color: inherit;
        }

        .market-skill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 12px;
        }

        .market-skill-chip {
          background: #f2f4f7;
          border-radius: 999px;
          padding: 8px 14px;
          color: #0f172a;
          font-size: 0.92rem;
          font-weight: 500;
        }

        .market-job-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .proposal-count {
          color: #4b5563;
          font-size: 1rem;
        }

        .jobs-market-results .btn-apply-modern,
        .jobs-market-results .btn-details-modern {
          min-height: 50px;
          min-width: 162px;
          border-radius: 16px;
          font-size: 0.98rem;
          font-weight: 700;
        }

        .jobs-market-results .btn-details-modern {
          border: 1px solid #d1d5db;
          color: #334155;
          background: #ffffff;
        }

        @media (min-width: 1600px) {
          .jobs-container {
            max-width: 1720px;
            padding: 36px 28px 28px;
            border-radius: 20px;
          }

          .jobs-market-layout {
            grid-template-columns: minmax(320px, 390px) minmax(0, 1fr);
            gap: 24px;
          }

          .jobs-market-sidebar {
            border-radius: 22px;
            padding: 22px 20px 18px;
            gap: 20px;
            max-width: 390px;
          }

          .market-filter-title {
            font-size: 1.15rem;
          }

          .market-select,
          .market-budget-input {
            min-height: 46px;
            font-size: 1rem;
          }

          .market-check {
            font-size: 1.04rem;
          }

          .jobs-market-results {
            border-radius: 22px;
            padding: 18px 28px 8px;
          }

          .jobs-market-toolbar {
            padding: 2px 0 16px;
            margin-bottom: 10px;
          }

          .save-search-btn,
          .saved-jobs-btn {
            font-size: 1.15rem;
          }

          .market-sort-select {
            min-height: 54px;
            min-width: 320px;
            font-size: 1.08rem;
          }

          .market-job-card {
            padding: 22px 0 26px;
          }

          .market-posted {
            font-size: 1.03rem;
          }

          .market-company-logo {
            width: 48px;
            height: 48px;
          }

          .market-company-link {
            font-size: 1.03rem;
          }

          .market-icon-btn {
            width: 50px;
            height: 50px;
          }

          .market-job-title {
            font-size: clamp(1.75rem, 2.4vw, 2.35rem);
            line-height: 1.18;
            margin: 10px 0;
          }

          .market-job-meta {
            font-size: 1.11rem;
            gap: 16px;
            margin-bottom: 10px;
          }

          .market-budget-line {
            font-size: 1.08rem;
            margin-bottom: 10px;
          }

          .market-job-description {
            font-size: 1.08rem;
            line-height: 1.5;
            max-width: 95%;
          }

          .market-skill-row {
            gap: 10px;
            margin-bottom: 12px;
          }

          .market-skill-chip {
            font-size: 0.95rem;
            padding: 7px 13px;
          }

          .proposal-count {
            font-size: 1.04rem;
          }

          .jobs-market-results .btn-apply-modern,
          .jobs-market-results .btn-details-modern {
            min-height: 52px;
            min-width: 150px;
            border-radius: 14px;
            font-size: 1rem;
          }
        }

        @media (max-width: 1280px) {
          .jobs-container {
            max-width: 100%;
            padding: 20px 14px;
          }

          .jobs-market-layout {
            grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
            gap: 14px;
          }

          .jobs-market-sidebar {
            max-width: 300px;
          }

          .market-filter-title {
            font-size: 1.15rem;
          }

          .save-search-btn,
          .saved-jobs-btn,
          .market-posted,
          .market-company-link,
          .market-job-meta,
          .market-budget-line,
          .proposal-count {
            font-size: 0.98rem;
          }

          .market-sort-select {
            min-height: 50px;
            min-width: 250px;
            font-size: 0.97rem;
          }

          .market-job-title {
            font-size: clamp(1.45rem, 2.1vw, 1.95rem);
          }

          .market-job-description {
            font-size: 1.02rem;
          }

          .market-skill-chip {
            font-size: 0.86rem;
            padding: 6px 11px;
          }

          .market-icon-btn {
            width: 46px;
            height: 46px;
          }

          .jobs-market-results .btn-apply-modern,
          .jobs-market-results .btn-details-modern {
            min-height: 46px;
            min-width: 128px;
            border-radius: 12px;
            font-size: 0.94rem;
          }
        }

        @media (max-width: 1024px) {
          .jobs-container {
            padding: 18px 14px;
          }

          .jobs-market-layout {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .jobs-market-sidebar {
            position: static;
            top: auto;
            border-radius: 12px;
            padding: 12px;
            max-width: 100%;
          }

          .jobs-market-sidebar .market-filter-block,
          .jobs-market-sidebar .jobs-toolbar-filters,
          .jobs-market-sidebar .clear-filters-btn {
            display: none;
          }

          .jobs-market-sidebar.open .market-filter-block,
          .jobs-market-sidebar.open .jobs-toolbar-filters,
          .jobs-market-sidebar.open .clear-filters-btn {
            display: grid;
          }

          .jobs-market-sidebar.open .jobs-toolbar-filters {
            display: flex;
          }

          .filter-toggle-btn {
            width: 100%;
            justify-content: center;
            min-height: 46px;
          }

          .jobs-market-results {
            padding: 10px 14px 2px;
          }

          .jobs-market-toolbar {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .jobs-market-toolbar-left,
          .jobs-market-toolbar-right {
            width: 100%;
            justify-content: space-between;
          }

          .market-sort-select {
            min-width: 0;
            width: 100%;
          }
        }

        .jobs-list {
          display: grid;
          gap: 24px;
        }

        /* Modern Job Card */
        .modern-job-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s;
        }

        .modern-job-card:hover {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border-color: #00d4aa;
        }

        .job-card-header-modern {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .job-header-info {
          flex: 1;
        }

        .job-title-modern {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 6px 0;
        }

        .company-name-modern {
          color: #6b7280;
          text-decoration: none;
          font-size: 15px;
          transition: color 0.2s;
        }

        .company-name-modern:hover {
          color: #00d4aa;
        }

        .bookmark-modern {
          background: none;
          border: 1px solid #e5e7eb;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bookmark-modern:hover {
          background: #f0fdf9;
          border-color: #00d4aa;
          color: #00d4aa;
        }

        .bookmark-modern.active {
          background: #f0fdf9;
          border-color: #00d4aa;
          color: #00d4aa;
        }

        .match-badge {
          display: inline-block;
          background: linear-gradient(135deg, #00d4aa, #00a389);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .job-details-modern {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 16px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 12px;
        }

        .job-detail-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #6b7280;
        }

        .capitalize {
          text-transform: capitalize;
        }

        .job-description-modern {
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 12px;
          font-size: 15px;
        }

        .toggle-desc-btn {
          background: none;
          border: none;
          color: #00d4aa;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 16px;
        }

        .toggle-desc-btn:hover {
          text-decoration: underline;
        }

        .job-skills-modern {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }

        .skill-tag {
          background: #f0fdf9;
          color: #00a389;
          padding: 6px 14px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid #d1fae5;
        }

        .skill-tag.more {
          background: #f3f4f6;
          color: #6b7280;
          border-color: #e5e7eb;
        }

        .job-actions-modern {
          display: flex;
          gap: 12px;
        }

        .btn-apply-modern {
          flex: 1;
          background: #00d4aa;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-apply-modern:hover {
          background: #00bd98;
        }

        .btn-apply-modern:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-details-modern {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-details-modern:hover {
          border-color: #00d4aa;
          color: #00d4aa;
        }

        /* Skeletons */
        .job-card-skeleton {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 24px;
          min-height: 280px;
        }

        .skeleton-header,
        .skeleton-content,
        .skeleton-footer {
          background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 8px;
        }

        .skeleton-header {
          width: 70%;
          height: 24px;
          margin-bottom: 16px;
        }

        .skeleton-content {
          width: 100%;
          height: 120px;
          margin-bottom: 16px;
        }

        .skeleton-footer {
          width: 40%;
          height: 40px;
        }

        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        /* Empty State */
        .empty-state-modern {
          text-align: center;
          padding: 60px 24px;
        }

        .empty-icon {
          color: #9ca3af;
          margin-bottom: 16px;
        }

        .empty-state-modern h3 {
          font-size: 24px;
          color: #374151;
          margin-bottom: 8px;
        }

        .empty-state-modern p {
          color: #6b7280;
          margin-bottom: 24px;
        }

        .btn-primary-modern {
          background: #00d4aa;
          color: white;
          border: none;
          padding: 12px 32px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-primary-modern:hover {
          background: #00bd98;
        }

        /* Load More */
        .load-more-trigger {
          min-height: 40px;
          display: flex;
          justify-content: center;
          padding: 24px 0;
        }

        .loading-text {
          color: #6b7280;
          font-size: 14px;
        }

        /* Chat Assistant */
        .chat-assistant {
          position: fixed;
          right: 24px;
          top: 50%;
          transform: translateY(-50%) rotate(-90deg);
          transform-origin: right center;
          background: #00d4aa;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 24px 24px 0 0;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 50;
          box-shadow: 0 -4px 12px rgba(0, 212, 170, 0.3);
          transition: all 0.3s;
        }

        .chat-assistant:hover {
          background: #00bd98;
          box-shadow: 0 -6px 16px rgba(0, 212, 170, 0.4);
        }

        .chat-icon-modern {
          background: white;
          color: #00d4aa;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .search-hero h1 {
            font-size: 32px;
          }

          .modern-search-box {
            flex-direction: column;
            padding: 16px;
            border-radius: 16px;
          }

          .search-divider {
            width: 100%;
            height: 1px;
            margin: 12px 0;
          }

          .search-btn-modern {
            width: 100%;
            border-radius: 12px;
          }

          .job-actions-modern {
            flex-direction: column;
          }

          .filters-panel-modern {
            flex-direction: column;
            align-items: stretch;
          }
        }

        /* Professional Motion + Visual Upgrade */
        .jobs-page-modern {
          --jobs-ease: cubic-bezier(0.22, 1, 0.36, 1);
          position: relative;
          isolation: isolate;
          background:
            radial-gradient(circle at 15% -5%, rgba(186, 230, 253, 0.42), transparent 40%),
            radial-gradient(circle at 84% 12%, rgba(94, 234, 212, 0.3), transparent 46%),
            linear-gradient(180deg, #f7fbff 0%, #f4f7fb 100%);
        }

        .jobs-glow {
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 999px;
          filter: blur(82px);
          pointer-events: none;
          z-index: -1;
          opacity: 0.34;
          animation: jobs-drift 10s ease-in-out infinite alternate;
        }

        .jobs-glow-top { top: -120px; right: 6%; background: #67e8f9; }
        .jobs-glow-bottom { bottom: 4%; left: -80px; background: #5eead4; animation-delay: -3s; }

        .panel {
          border: 1px solid #dbe5ef;
          border-radius: 22px;
          box-shadow: 0 22px 42px -34px rgba(15, 23, 42, 0.45);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), #ffffff);
        }

        .fade-in {
          opacity: 0;
          transform: translateY(14px) scale(0.986);
          animation: jobs-rise 620ms var(--jobs-ease) forwards;
          animation-delay: calc(var(--delay, 0ms) + var(--i, 0) * 68ms);
        }

        .delay-0 { --delay: 20ms; }
        .delay-1 { --delay: 80ms; }
        .delay-2 { --delay: 120ms; }
        .delay-3 { --delay: 180ms; }

        .search-hero {
          max-width: none;
          width: 100%;
          margin: 0;
          padding: 52px 24px 34px;
          border-radius: 0;
          border: none;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at top right, rgba(45, 212, 191, 0.16), transparent 42%),
            linear-gradient(145deg, #ffffff, #f6fbff);
        }

        .jobs-page-modern.jobs-hero-only {
          min-height: calc(100vh - 72px);
          height: calc(100vh - 72px);
          overflow: hidden;
        }

        .jobs-page-modern.jobs-hero-only .search-hero {
          min-height: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-hero-content {
          max-width: 980px;
          width: min(100%, 980px);
          margin: 0 auto;
          padding: 0 8px;
          text-align: center;
          position: relative;
          z-index: 2;
        }

        .hero-network {
          position: absolute;
          inset: 24px 12px 0;
          pointer-events: none;
          opacity: 0.74;
          z-index: 1;
        }

        .hero-network-line {
          position: absolute;
          height: 1px;
          background: #c7eeea;
          transform-origin: left center;
        }

        .hero-network-node {
          position: absolute;
          width: 11px;
          height: 11px;
          margin-left: -5px;
          margin-top: -5px;
          border-radius: 50%;
          background: #c7eeea;
          box-shadow: 0 0 0 6px rgba(199, 238, 234, 0.25);
        }

        .hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #0d4f73;
          border: 1px solid #bfe6df;
          background: rgba(255, 255, 255, 0.72);
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 0.84rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          margin-bottom: 10px;
        }

        .hero-title {
          margin: 0;
          font-family: 'Space Grotesk', var(--font-family);
          font-size: clamp(2rem, 4.8vw, 4.1rem);
          line-height: 1.06;
          letter-spacing: -0.03em;
          font-weight: 800;
          color: #0d1532;
        }

        .hero-title span {
          background-image: linear-gradient(120deg, #0fc3a4 0%, #0aa7c9 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero-subtitle {
          max-width: 650px;
          margin: 14px auto 0;
          color: #53627a;
          font-size: clamp(1rem, 1.55vw, 1.25rem);
          line-height: 1.42;
          padding-left: 10px;
          border-left: 2px solid #d6e4f2;
          text-align: left;
        }

        .modern-search-box {
          border: 1px solid #b4dfd8;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          box-shadow: 0 12px 30px rgba(21, 129, 132, 0.14);
          transition: border-color 220ms ease, box-shadow 220ms ease, transform 220ms var(--jobs-ease);
          width: min(100%, 960px);
          margin: 20px auto 0;
          padding: 8px 8px 8px 24px;
        }

        .modern-search-box:focus-within {
          border-color: #0ea5a3;
          box-shadow: 0 14px 34px rgba(16, 185, 129, 0.22);
          transform: translateY(-1px);
        }

        .search-btn-modern {
          border-radius: 999px;
          background: linear-gradient(135deg, #14b8a6, #0f9cc0);
          box-shadow: 0 12px 20px -14px rgba(15, 118, 110, 0.74);
          transition: transform 220ms var(--jobs-ease), box-shadow 220ms var(--jobs-ease);
          padding: 14px 36px;
          min-width: 148px;
          font-size: 1.05rem;
        }

        .search-btn-modern:hover {
          transform: translateY(-2px);
          background: linear-gradient(135deg, #14b8a6, #0f9cc0);
          box-shadow: 0 16px 26px -14px rgba(15, 118, 110, 0.8);
        }

        .search-input-group { gap: 10px; }
        .search-divider { margin: 0 12px; height: 34px; background: #dbe7e7; }
        .search-input { font-size: 1.02rem; }

        .hero-popular {
          margin-top: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .hero-popular-label {
          color: #667085;
          font-weight: 700;
          font-size: 0.95rem;
        }

        .hero-popular-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }

        .hero-popular-chip {
          border: 1px solid #d8dee6;
          background: rgba(255, 255, 255, 0.76);
          color: #334155;
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hero-popular-chip:hover {
          border-color: #0fc3a4;
          color: #0f766e;
        }

        .hero-insights {
          margin-top: 16px;
          display: flex;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .insight-card {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 210px;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid #d9e7ef;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 10px 20px -22px rgba(15, 23, 42, 0.55);
        }

        .insight-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #14b8a6, #0f9cc0);
          color: #fff;
        }

        .insight-value {
          margin: 0;
          font-weight: 800;
          font-size: 1.6rem;
          line-height: 1;
          color: #0f172a;
        }

        .insight-label {
          margin: 2px 0 0;
          font-size: 0.9rem;
          color: #5a6b85;
        }

        .filter-toggle-btn {
          border-radius: 999px;
          font-weight: 600;
          transition: transform 180ms var(--jobs-ease), border-color 180ms ease, color 180ms ease;
        }

        .filter-toggle-btn.active,
        .filter-toggle-btn:hover {
          transform: translateY(-1px);
        }

        .filters-panel-modern {
          margin-top: 14px;
          border-radius: 14px;
          padding: 14px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 14px;
          border-color: #dbe5ef;
          animation: jobs-rise 420ms var(--jobs-ease) both;
        }

        .jobs-container {
          max-width: none;
          width: 100%;
          margin: 0;
          padding: 24px 32px 40px;
        }
        .jobs-list {
          gap: 16px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .jobs-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
          padding: 14px 16px;
          border: 1px solid #dbe5ef;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.84);
          backdrop-filter: blur(6px);
        }

        .jobs-toolbar-copy h2 {
          margin: 0;
          font-size: 1rem;
          font-family: 'Space Grotesk', var(--font-family);
          color: #0f172a;
        }

        .jobs-toolbar-copy p {
          margin: 2px 0 0;
          color: #64748b;
          font-size: 0.82rem;
        }

        .jobs-toolbar-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .active-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #bae6fd;
          background: #f0f9ff;
          color: #0c4a6e;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 0.74rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 160ms var(--jobs-ease), border-color 160ms ease;
        }

        .active-filter-pill:hover {
          transform: translateY(-1px);
          border-color: #7dd3fc;
        }

        .modern-job-card {
          border-color: #dbe5ef;
          border-radius: 18px;
          padding: 18px;
          background: linear-gradient(165deg, #ffffff, #f9fbff);
          box-shadow: none;
          position: relative;
          overflow: hidden;
          transition: transform 240ms var(--jobs-ease), border-color 220ms ease, box-shadow 240ms var(--jobs-ease);
        }

        .modern-job-card::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 2px;
          background: linear-gradient(90deg, #22d3ee, #14b8a6);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 280ms var(--jobs-ease);
        }

        .modern-job-card:hover {
          transform: translateY(-3px);
          border-color: #14b8a6;
          box-shadow: 0 24px 34px -30px rgba(15, 23, 42, 0.72);
        }

        .modern-job-card:hover::before { transform: scaleX(1); }

        .job-title-modern {
          font-family: 'Space Grotesk', var(--font-family);
          font-size: clamp(1.05rem, 2.4vw, 1.24rem);
          line-height: 1.2;
        }

        .bookmark-modern { width: 42px; height: 42px; border-radius: 11px; }

        .job-details-modern {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          gap: 10px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .match-badge {
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 0.72rem;
          animation: jobs-pulse 3s ease-in-out infinite;
        }

        .job-description-modern { font-size: 0.9rem; }
        .skill-tag { border-radius: 999px; font-size: 0.74rem; font-weight: 600; }
        .job-actions-modern { gap: 10px; }

        .btn-apply-modern,
        .btn-details-modern { border-radius: 11px; font-size: 0.9rem; }

        .btn-apply-modern {
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          box-shadow: 0 12px 22px -16px rgba(15, 118, 110, 0.78);
          transition: transform 220ms var(--jobs-ease), box-shadow 220ms var(--jobs-ease);
        }

        .btn-apply-modern:hover {
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          transform: translateY(-2px);
          box-shadow: 0 14px 24px -14px rgba(15, 118, 110, 0.84);
        }

        .btn-details-modern { transition: transform 200ms var(--jobs-ease), border-color 200ms ease, color 200ms ease; }
        .btn-details-modern:hover { transform: translateY(-2px); }

        .loading-text {
          position: relative;
          padding-left: 14px;
          font-size: 0.84rem;
        }

        .loading-text::before {
          content: '';
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #14b8a6;
          position: absolute;
          left: 0;
          top: 6px;
          animation: jobs-dot 1s ease-in-out infinite;
        }

        .chat-assistant {
          right: 20px;
          bottom: 20px;
          top: auto;
          transform: none;
          transform-origin: initial;
          padding: 8px 12px 8px 8px;
          border-radius: 999px;
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          box-shadow: 0 16px 24px -14px rgba(15, 118, 110, 0.78);
          transition: transform 220ms var(--jobs-ease), box-shadow 220ms var(--jobs-ease);
        }

        .chat-assistant:hover {
          transform: translateY(-2px);
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          box-shadow: 0 20px 28px -14px rgba(15, 118, 110, 0.85);
        }

        .chat-icon-modern {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          color: #0f766e;
        }

        @keyframes jobs-rise {
          from { opacity: 0; transform: translateY(14px) scale(0.986); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes jobs-drift {
          from { transform: translateY(0) translateX(0); }
          to { transform: translateY(-12px) translateX(10px); }
        }

        @keyframes jobs-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0); }
          50% { box-shadow: 0 0 0 6px rgba(20, 184, 166, 0.08); }
        }

        @keyframes jobs-dot {
          0%, 100% { transform: scale(0.92); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        @media (max-width: 900px) {
          .search-hero { margin-top: 0; padding: 24px 16px 18px; border-radius: 0; }
          .modern-search-box { border-radius: 14px; }
          .hero-subtitle { text-align: center; border-left: none; padding-left: 0; }
          .filters-panel-modern { grid-template-columns: 1fr; }
          .job-details-modern { grid-template-columns: 1fr; }
          .jobs-list { grid-template-columns: 1fr; }
          .jobs-toolbar { flex-direction: column; align-items: flex-start; }
          .jobs-toolbar-filters { justify-content: flex-start; }
        }

        @media (max-width: 640px) {
          .jobs-page-modern {
            background:
              radial-gradient(circle at 8% 75%, rgba(45, 212, 191, 0.2), transparent 42%),
              linear-gradient(180deg, #f7fbff 0%, #eef4fb 100%);
          }

          .jobs-glow {
            display: none;
          }

          .search-hero {
            padding: 16px 12px 14px;
            background: #f8fbff;
            border-bottom: 1px solid #e4edf7;
          }

          .jobs-page-modern.jobs-hero-only .search-hero {
            min-height: 100%;
            height: 100%;
          }

          .search-hero-content {
            padding: 0;
          }

          .hero-title {
            font-size: 1.7rem;
            line-height: 1.14;
            margin-bottom: 8px;
            text-align: center;
          }

          .hero-subtitle {
            font-size: 0.9rem;
            margin-bottom: 14px;
            text-align: center;
            color: #667085;
            border-left: none;
            padding-left: 0;
          }

          .modern-search-box {
            padding: 10px;
            border-radius: 14px;
            margin-bottom: 10px;
            border: 1px solid #bde5dc;
            box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.55);
          }

          .search-input-group {
            width: 100%;
            min-width: 0;
            background: #f1f5f9;
            border-radius: 10px;
            padding: 8px 10px;
          }

          .search-input {
            min-width: 0;
            font-size: 0.9rem;
          }

          .search-divider {
            display: none;
          }

          .search-btn-modern {
            width: 100%;
            min-height: 44px;
            border-radius: 12px;
          }

          .hero-insights {
            display: none;
          }

          .filter-toggle-row {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .filter-toggle-btn {
            width: 100%;
            justify-content: center;
            border-radius: 999px;
            min-height: 52px;
            border: 1px solid #d1dae5;
            background: #ffffff;
            font-size: 1rem;
          }

          .results-count {
            display: none;
          }

          .filters-panel-modern {
            padding: 12px;
            gap: 10px;
          }

          .clear-filters-btn {
            width: 100%;
            justify-content: center;
          }

          .jobs-container {
            padding: 12px;
          }

          .jobs-market-sidebar {
            padding: 10px;
            border-radius: 12px;
          }

          .jobs-market-results {
            border-radius: 12px;
            padding: 8px 10px 0;
          }

          .market-company-logo {
            width: 40px;
            height: 40px;
          }

          .jobs-market-toolbar-left,
          .jobs-market-toolbar-right {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .save-search-btn,
          .saved-jobs-btn {
            font-size: 0.96rem;
          }

          .market-sort-select {
            width: 100%;
            min-height: 44px;
            font-size: 0.95rem;
          }

          .market-job-card {
            padding: 14px 0;
          }

          .market-job-headline {
            align-items: flex-start;
          }

          .market-icon-btn {
            width: 40px;
            height: 40px;
          }

          .market-job-title {
            font-size: 1.12rem;
            line-height: 1.28;
          }

          .market-job-meta {
            gap: 10px;
            font-size: 0.9rem;
          }

          .market-budget-line,
          .proposal-count {
            font-size: 0.9rem;
          }

          .market-job-description {
            font-size: 0.94rem;
            line-height: 1.52;
          }

          .market-skill-chip {
            font-size: 0.82rem;
            padding: 5px 10px;
          }

          .market-job-footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .job-actions-modern {
            width: 100%;
            flex-direction: column;
          }

          .btn-apply-modern,
          .btn-details-modern {
            width: 100%;
            justify-content: center;
          }

          .jobs-toolbar {
            padding: 10px 12px;
            gap: 10px;
            margin-bottom: 10px;
            border-radius: 16px;
            background: #f8fbff;
          }

          .jobs-toolbar-copy h2 {
            font-size: 0.92rem;
          }

          .jobs-toolbar-copy p {
            font-size: 0.78rem;
          }

          .jobs-toolbar-filters {
            width: 100%;
          }

          .active-filter-pill {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .modern-job-card {
            padding: 14px;
            border-radius: 14px;
          }

          .job-card-header-modern {
            gap: 10px;
            align-items: flex-start;
            margin-bottom: 12px;
          }

          .job-title-modern {
            font-size: 1rem;
          }

          .company-name-modern {
            font-size: 0.84rem;
            word-break: break-word;
          }

          .bookmark-modern {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            flex-shrink: 0;
          }

          .match-badge {
            margin-bottom: 12px;
          }

          .job-details-modern {
            padding: 10px;
            gap: 8px;
          }

          .job-detail-item {
            font-size: 0.78rem;
          }

          .job-description-modern {
            font-size: 0.85rem;
            line-height: 1.45;
          }

          .job-skills-modern {
            margin-bottom: 14px;
            gap: 6px;
          }

          .skill-tag {
            padding: 5px 10px;
            font-size: 0.72rem;
          }

          .job-actions-modern {
            flex-direction: column;
            gap: 8px;
          }

          .btn-apply-modern,
          .btn-details-modern {
            width: 100%;
            justify-content: center;
            min-height: 42px;
            padding: 10px 12px;
            font-size: 0.85rem;
          }

          .empty-state-modern {
            padding: 64px 16px 36px;
          }

          .empty-state-modern .empty-icon {
            width: 72px;
            height: 72px;
            margin-bottom: 20px;
            color: #9aa5b8;
          }

          .empty-state-modern h3 {
            font-size: 2rem;
            margin-bottom: 8px;
            color: #334155;
          }

          .empty-state-modern p {
            font-size: 0.95rem;
            color: #64748b;
            margin-bottom: 18px;
          }

          .btn-primary-modern {
            min-width: 190px;
            min-height: 56px;
            border-radius: 16px;
            font-size: 1.05rem;
            font-weight: 700;
          }

          .chat-assistant {
            right: 10px;
            bottom: 10px;
            padding: 8px;
            width: 56px;
            height: 56px;
            border-radius: 999px;
            justify-content: center;
          }

          .chat-assistant span {
            display: none;
          }
        }

        @media (max-width: 420px) {
          .hero-title {
            font-size: 1.5rem;
          }

          .hero-subtitle {
            font-size: 0.84rem;
          }

          .jobs-container {
            padding: 10px;
          }

          .jobs-market-sidebar {
            padding: 8px;
          }

          .market-company-logo {
            width: 36px;
            height: 36px;
            border-radius: 8px;
          }

          .market-company-link {
            font-size: 0.88rem;
          }

          .market-filter-title {
            font-size: 0.98rem;
          }

          .market-job-title {
            font-size: 1.02rem;
          }

          .market-job-meta {
            font-size: 0.84rem;
            gap: 8px;
          }

          .market-job-description {
            font-size: 0.9rem;
          }

          .market-skill-chip {
            font-size: 0.78rem;
            padding: 5px 8px;
          }

          .modern-job-card {
            padding: 12px;
          }

          .job-title-modern {
            font-size: 0.94rem;
          }

          .empty-state-modern h3 {
            font-size: 1.85rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .jobs-page-modern *,
          .jobs-glow { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
};

