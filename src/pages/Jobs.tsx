import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  DollarSign,
  Clock,
  BookmarkPlus,
  Bookmark,
  ExternalLink,
  Filter,
  Briefcase,
  X,
  User,
} from 'lucide-react';

import type { Job } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { JobLogo } from '../components/JobLogo';
import { getApplyLink } from '../utils/jobUtils';

const getCompanyUrl = (company: string) => {
  const clean = company.toLowerCase()
    .replace(/[,.]/g, '')
    .replace(/\s+(inc|llc|ltd|corp|limited|company|co|plc)$/i, '')
    .trim()
    .replace(/\s+/g, '');
  return `https://www.${clean}.com`;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const Jobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayedQuery, setDisplayedQuery] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchJobs(1, true);
    }, 800);

    return () => clearTimeout(timer);
  }, [locationFilter, typeFilter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchJobs(1, true);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchJobs(1, true);
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchJobs = async (pageNum = 1, shouldReplace = false) => {
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
      const effectiveQuery = searchQuery.trim() || (user?.profession ? user.profession : 'jobs');

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

      const countryCode = getCountryCode(locationFilter);

      const params = new URLSearchParams();
      params.append('query', effectiveQuery);
      params.append('country', countryCode);
      params.append('page', pageNum.toString());
      params.append('results_per_page', '50');

      if (!shouldReplace && nextPageToken) {
        params.append('page_token', nextPageToken);
      }

      if (locationFilter) params.append('location', locationFilter);
      if (typeFilter) params.append('contract_type', typeFilter);

      const url = `${API_BASE_URL}/api/jobs/search?${params.toString()}`;
      console.log('Fetching jobs from:', url);

      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

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

  return (
    <div className="jobs-page-modern">
      <div className="jobs-glow jobs-glow-top" />
      <div className="jobs-glow jobs-glow-bottom" />

      {/* Hero Search Section */}
      <section className="search-hero panel fade-in delay-0">
        <div className="search-hero-content">
          <h1>Find Your <span className="highlight">Dream Job</span></h1>
          <p className="subtitle">AI-powered job recommendations matched to your skills and preferences</p>

          {/* Modern Search Bar */}
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

          <div className="hero-info-row">
            <span className="hero-chip">Live listings: {totalJobs.toLocaleString()}</span>
            <span className="hero-chip">Active filters: {activeFiltersCount}</span>
            <span className="hero-chip">Auto-scroll load enabled</span>
          </div>

          {/* Filter Toggle */}
          <div className="filter-toggle-row">
            <button
              className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>

            {displayedQuery && (
              <span className="results-count">
                {totalJobs.toLocaleString()} jobs found for "{displayedQuery}"
              </span>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="filters-panel-modern fade-in delay-1">
              <div className="filter-item">
                <label>Job Type</label>
                <select
                  className="filter-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="remote">Remote</option>
                </select>
              </div>

              <button
                className="clear-filters-btn"
                onClick={() => {
                  setSearchQuery('');
                  setLocationFilter('');
                  setTypeFilter('');
                }}
              >
                <X size={16} />
                Clear All
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Jobs List */}
      <div className="jobs-container">
        <div className="jobs-toolbar fade-in delay-1">
          <div className="jobs-toolbar-copy">
            <h2>Matched Opportunities</h2>
            <p>
              {displayedQuery
                ? `${totalJobs.toLocaleString()} results for "${displayedQuery}"`
                : 'Discover curated roles aligned with your profile'}
            </p>
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
        </div>

        {loading ? (
          <div className="jobs-list">
            {[1, 2, 3, 4, 5, 6].map((i, index) => (
              <div key={i} className="job-card-skeleton fade-in delay-2" style={staggerStyle(index, 120)}>
                <div className="skeleton-header"></div>
                <div className="skeleton-content"></div>
                <div className="skeleton-footer"></div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="empty-state-modern">
            <Briefcase size={64} className="empty-icon" />
            <h3>No jobs found</h3>
            <p>Try adjusting your search or filters</p>
            <button
              className="btn-primary-modern"
              onClick={() => {
                setSearchQuery('');
                setLocationFilter('');
                setTypeFilter('');
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="jobs-list">
              {filteredJobs.map((job, index) => (
                <div key={job.id} className="modern-job-card fade-in delay-2" style={staggerStyle(index, 80)}>
                  <div className="job-card-header-modern">
                    <a href={getCompanyUrl(job.company)} target="_blank" rel="noopener noreferrer">
                      <JobLogo company={job.company} />
                    </a>
                    <div className="job-header-info">
                      <h3 className="job-title-modern">{job.title}</h3>
                      <a
                        href={getCompanyUrl(job.company)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="company-name-modern"
                      >
                        {job.company}
                      </a>
                    </div>
                    <button
                      className={`bookmark-modern ${bookmarkedIds.has(job.id) ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(job.id);
                      }}
                    >
                      {bookmarkedIds.has(job.id) ? (
                        <Bookmark size={20} fill="currentColor" />
                      ) : (
                        <BookmarkPlus size={20} />
                      )}
                    </button>
                  </div>

                  {job.matchScore && (
                    <div className="match-badge">
                      {job.matchScore}% Match
                    </div>
                  )}

                  <div className="job-details-modern">
                    <div className="job-detail-item">
                      <MapPin size={16} />
                      <span>{job.location}</span>
                    </div>
                    <div className="job-detail-item">
                      <DollarSign size={16} />
                      <span>{formatSalary(job)}</span>
                    </div>
                    <div className="job-detail-item">
                      <Clock size={16} />
                      <span>{getTimeSince(job.postedDate)}</span>
                    </div>
                    <div className="job-detail-item">
                      <Briefcase size={16} />
                      <span className="capitalize">{job.type.replace('-', ' ')}</span>
                    </div>
                  </div>

                  <p className="job-description-modern">
                    {expandedDescriptions.has(job.id) || job.description.length <= 200
                      ? job.description
                      : `${job.description.substring(0, 200)}...`}
                  </p>

                  {job.description.length > 200 && (
                    <button
                      className="toggle-desc-btn"
                      onClick={() => toggleDescription(job.id)}
                    >
                      {expandedDescriptions.has(job.id) ? 'Show Less' : 'Show More'}
                    </button>
                  )}

                  <div className="job-skills-modern">
                    {job.skills.slice(0, 5).map((skill) => (
                      <span key={skill} className="skill-tag">
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 5 && (
                      <span className="skill-tag more">+{job.skills.length - 5}</span>
                    )}
                  </div>

                  <div className="job-actions-modern">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(job);
                      }}
                      className="btn-apply-modern"
                      disabled={applyingId === job.id}
                    >
                      {applyingId === job.id ? 'Checking...' : 'Apply Now'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/jobs/${job.id}`, { state: { returnTo: '/jobs', returnLabel: 'Back to Jobs' } });
                      }}
                      className="btn-details-modern"
                    >
                      <ExternalLink size={18} />
                      View Details
                    </button>
                  </div>
                </div>
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
      </div>

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
          min-height: 100vh;
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
        }

        .clear-filters-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        /* Jobs Container */
        .jobs-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px;
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
          padding: 44px 24px 28px;
          border-radius: 0;
          border: none;
          background:
            radial-gradient(circle at top right, rgba(45, 212, 191, 0.16), transparent 42%),
            linear-gradient(145deg, #ffffff, #f6fbff);
        }

        .search-hero-content {
          max-width: none;
          width: 100%;
          margin: 0;
          padding: 0 8px;
        }

        .search-hero h1 {
          font-family: 'Space Grotesk', var(--font-family);
          letter-spacing: -0.03em;
          font-size: clamp(2rem, 3.8vw, 3rem);
          margin-bottom: 12px;
          line-height: 1.05;
          color: #0f172a;
        }

        .highlight {
          background: linear-gradient(135deg, #0ea5e9, #0f766e);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .subtitle { font-size: 1.02rem; margin-bottom: 24px; }

        .modern-search-box {
          border: 1px solid #c8f2e9;
          border-radius: 18px;
          box-shadow: 0 18px 34px -28px rgba(15, 23, 42, 0.54);
          transition: border-color 220ms ease, box-shadow 220ms ease, transform 220ms var(--jobs-ease);
          width: min(100%, 760px);
          margin: 0 auto 14px;
          padding: 6px 8px 6px 14px;
        }

        .modern-search-box:focus-within {
          border-color: #14b8a6;
          box-shadow: 0 18px 36px -26px rgba(20, 184, 166, 0.42);
          transform: translateY(-1px);
        }

        .search-btn-modern {
          border-radius: 12px;
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          box-shadow: 0 12px 22px -14px rgba(15, 118, 110, 0.74);
          transition: transform 220ms var(--jobs-ease), box-shadow 220ms var(--jobs-ease);
          padding: 10px 18px;
          min-width: 124px;
        }

        .search-btn-modern:hover {
          transform: translateY(-2px);
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          box-shadow: 0 16px 26px -14px rgba(15, 118, 110, 0.8);
        }

        .search-input-group { gap: 8px; }
        .search-divider { margin: 0 10px; height: 28px; }
        .search-input { font-size: 0.9rem; }

        .hero-info-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .hero-chip {
          display: inline-flex;
          align-items: center;
          padding: 6px 11px;
          border-radius: 999px;
          border: 1px solid #dbeafe;
          background: #f8fafc;
          color: #334155;
          font-size: 0.74rem;
          font-weight: 600;
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
          .filters-panel-modern { grid-template-columns: 1fr; }
          .job-details-modern { grid-template-columns: 1fr; }
          .jobs-list { grid-template-columns: 1fr; }
          .jobs-toolbar { flex-direction: column; align-items: flex-start; }
          .jobs-toolbar-filters { justify-content: flex-start; }
        }

        @media (max-width: 640px) {
          .hero-info-row { display: none; }
          .jobs-container { padding: 16px; }
          .chat-assistant { right: 14px; bottom: 14px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .jobs-page-modern *,
          .jobs-glow { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
};
