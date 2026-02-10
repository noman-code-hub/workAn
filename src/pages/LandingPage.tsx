import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, User, Briefcase, BookmarkPlus, Bookmark, CheckCircle, X } from 'lucide-react';
import type { Job } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useRoleBasedRedirect } from '../hooks/useRoleBasedRedirect';
import { JobLogo } from '../components/JobLogo';
import { Profile } from './Profile';
import { Header } from '../components/Header';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Redirect based on role if user is logged in
  useRoleBasedRedirect(user, authLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'jobs' | 'profile'>('home');

  // Job search state
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayedQuery, setDisplayedQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const abortControllerRef = useRef<AbortController | null>(null);
  const observerTarget = useRef(null);
  const jobsSectionRef = useRef<HTMLElement>(null);

  const popularSearches = [
    'Remote Engineer',
    'Product Manager',
    'Data Scientist'
  ];



  const scrollToJobs = () => {
    setTimeout(() => {
      jobsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (filteredJobs.length > 0) {
      localStorage.setItem('recentJobs', JSON.stringify(filteredJobs));
    }
  }, [filteredJobs]);

  useEffect(() => {
    if (!hasSearched) return;

    const timer = setTimeout(() => {
      setPage(1);
      fetchJobs(1, true);
    }, 800);

    return () => clearTimeout(timer);
  }, [locationQuery, typeFilter]);

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

      const countryCode = getCountryCode(locationQuery);

      const params = new URLSearchParams();
      params.append('query', effectiveQuery);
      params.append('country', countryCode);
      params.append('page', pageNum.toString());
      params.append('results_per_page', '50');

      if (!shouldReplace && nextPageToken) {
        params.append('page_token', nextPageToken);
      }

      if (locationQuery) params.append('location', locationQuery);
      if (typeFilter) params.append('contract_type', typeFilter);

      const url = `${API_BASE_URL}/api/jobs/search?${params.toString()}`;

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
      } else {
        throw new Error(data.message || 'API error');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🟡 Fetch aborted');
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    setActiveView('jobs');
    setPage(1);
    fetchJobs(1, true);
    scrollToJobs();
  };

  const handlePopularSearch = (tag: string) => {
    setSearchQuery(tag);
    setHasSearched(true);
    setActiveView('jobs');
    setPage(1);
    // Trigger search with the tag
    setTimeout(() => {
      fetchJobs(1, true);
    }, 0);
    scrollToJobs();
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchJobs(nextPage, false);
  };

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

  return (
    <div className="landing-page">
      <Header />



      {/* Hero Section - Only show when no search has been performed */}
      {activeView === 'home' && (
        <section className="hero" id="jobs">
          <div className="network-bg">
            <svg className="network-svg" viewBox="0 0 1200 600">
              <g className="network-lines">
                <line x1="100" y1="100" x2="300" y2="150" stroke="#00d4aa" strokeWidth="1" opacity="0.3" />
                <line x1="300" y1="150" x2="500" y2="100" stroke="#00d4aa" strokeWidth="1" opacity="0.3" />
                <line x1="500" y1="100" x2="700" y2="200" stroke="#00d4aa" strokeWidth="1" opacity="0.3" />
                <line x1="200" y1="300" x2="400" y2="350" stroke="#00d4aa" strokeWidth="1" opacity="0.3" />
                <line x1="400" y1="350" x2="600" y2="300" stroke="#00d4aa" strokeWidth="1" opacity="0.3" />
                <line x1="600" y1="300" x2="800" y2="400" stroke="#00d4aa" strokeWidth="1" opacity="0.3" />
                <line x1="100" y1="500" x2="300" y2="450" stroke="#00d4aa" strokeWidth="1" opacity="0.3" />
                <line x1="300" y1="450" x2="500" y2="500" stroke="#00d4aa" strokeWidth="1" opacity="0.3" />
                <line x1="100" y1="100" x2="200" y2="300" stroke="#00d4aa" strokeWidth="1" opacity="0.2" />
                <line x1="300" y1="150" x2="400" y2="350" stroke="#00d4aa" strokeWidth="1" opacity="0.2" />
              </g>
              <g className="network-nodes">
                <circle cx="100" cy="100" r="4" fill="#00d4aa" opacity="0.5" />
                <circle cx="300" cy="150" r="4" fill="#00d4aa" opacity="0.5" />
                <circle cx="500" cy="100" r="4" fill="#00d4aa" opacity="0.5" />
                <circle cx="700" cy="200" r="4" fill="#00d4aa" opacity="0.5" />
                <circle cx="200" cy="300" r="4" fill="#00d4aa" opacity="0.5" />
                <circle cx="400" cy="350" r="4" fill="#00d4aa" opacity="0.5" />
                <circle cx="600" cy="300" r="4" fill="#00d4aa" opacity="0.5" />
                <circle cx="800" cy="400" r="4" fill="#00d4aa" opacity="0.5" />
                <circle cx="100" cy="500" r="4" fill="#00d4aa" opacity="0.5" />
                <circle cx="300" cy="450" r="4" fill="#00d4aa" opacity="0.5" />
                <circle cx="500" cy="500" r="4" fill="#00d4aa" opacity="0.5" />
              </g>
            </svg>
          </div>

          <div className="container hero-content">


            <h1 className="hero-headline">
              Find the job that <span className="highlight-text">matches your DNA.</span>
            </h1>

            <p className="hero-subtitle">
              CareerPilot uses advanced AI to analyze your skills and preferences, matching you with opportunities where you'll truly thrive.
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-box">
                <div className="search-input-group">
                  <Search className="input-icon" size={20} />
                  <input
                    type="text"
                    placeholder="Job title, skills, or keywords"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>

                <div className="search-divider"></div>

                <div className="search-input-group">
                  <MapPin className="input-icon" size={20} />
                  <input
                    type="text"
                    placeholder="City, state, or remote"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="search-input"
                  />
                </div>

                <button type="submit" className="search-btn">
                  Search
                </button>
              </div>
            </form>

            {/* Popular Tags */}
            <div className="popular-tags">
              <span className="popular-label">Popular:</span>
              {popularSearches.map((tag) => (
                <button
                  key={tag}
                  className="tag-pill"
                  onClick={() => handlePopularSearch(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Filter Toggle - Only show after search */}

          </div>
        </section>
      )}

      {/* Profile Section */}
      {activeView === 'profile' && (
        <div style={{ paddingTop: '24px' }}>
          <Profile />
        </div>
      )}


      {/* Job Results Section */}
      {activeView === 'jobs' && (
        <section className="jobs-section" ref={jobsSectionRef}>

          <div className="container" style={{ marginBottom: '24px' }}>
            <form onSubmit={handleSearch} className="search-form" style={{ marginBottom: 0 }}>
              <div className="search-box-results">
                <div className="search-input-group">
                  <Search className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Job title, skills, or keywords"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="search-divider"></div>

                <div className="search-input-group">
                  <MapPin className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="City, state, or remote"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="search-input"
                  />
                  {locationQuery && (
                    <button
                      type="button"
                      onClick={() => setLocationQuery('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button type="submit" className="search-btn-results">
                  Search
                </button>
              </div>
            </form>
          </div>

          <div className="container jobs-layout">
            {/* Left Sidebar Filters */}
            <aside className="filters-sidebar">
              <div className="sidebar-header">
                <h3>Filters</h3>
                <button
                  className="clear-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setLocationQuery('');
                    setTypeFilter('');
                  }}
                >
                  Clear All
                </button>
              </div>

              <div className="filter-group">
                <h4>Job Type</h4>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={typeFilter === 'full-time'}
                      onChange={() => setTypeFilter(typeFilter === 'full-time' ? '' : 'full-time')}
                    />
                    <span>Full Time</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={typeFilter === 'part-time'}
                      onChange={() => setTypeFilter(typeFilter === 'part-time' ? '' : 'part-time')}
                    />
                    <span>Part Time</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={typeFilter === 'contract'}
                      onChange={() => setTypeFilter(typeFilter === 'contract' ? '' : 'contract')}
                    />
                    <span>Contract</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={typeFilter === 'remote'}
                      onChange={() => setTypeFilter(typeFilter === 'remote' ? '' : 'remote')}
                    />
                    <span>Remote</span>
                  </label>
                </div>
              </div>

              <div className="filter-group">
                <h4>Experience Level</h4>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" />
                    <span>Entry Level</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" />
                    <span>Intermediate</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" />
                    <span>Expert</span>
                  </label>
                </div>
              </div>

              <div className="filter-group">
                <h4>Price / Salary</h4>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" />
                    <span>Hourly</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" />
                    <span>Fixed Price</span>
                  </label>
                </div>
              </div>
            </aside>

            {/* Main Feed */}
            <div className="jobs-feed">
              <div className="feed-header">
                {displayedQuery && (
                  <h2 className="results-count-heading">
                    {totalJobs.toLocaleString()} jobs found for <span className="highlight-keyword">"{displayedQuery}"</span>
                  </h2>
                )}
                <div className="sort-box">
                  <span>Sort:</span>
                  <select className="sort-select">
                    <option>Best Match</option>
                    <option>Newest</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="jobs-list">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="job-card-skeleton">
                      <div className="skeleton-header"></div>
                      <div className="skeleton-content"></div>
                      <div className="skeleton-footer"></div>
                    </div>
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="empty-state">
                  <Briefcase size={64} className="empty-icon" />
                  <h3>No jobs found</h3>
                  <p>Try adjusting your search or filters</p>
                  <button
                    className="btn-primary-modern"
                    onClick={() => {
                      setSearchQuery('');
                      setLocationQuery('');
                      setTypeFilter('');
                    }}
                  >
                    Reset Search
                  </button>
                </div>
              ) : (
                <>
                  <div className="jobs-list-upwork">
                    {filteredJobs.map((job) => (
                      <div key={job.id} className="upwork-job-card">
                        <div className="card-top-row">
                          <div className="job-info-main">
                            <span className="posted-time">Posted {getTimeSince(job.postedDate)}</span>
                            <h3 className="job-title-upwork" onClick={() => navigate(`/jobs/${job.id}`)}>
                              {job.title}
                            </h3>
                          </div>
                          <div className="card-actions">
                            <JobLogo company={job.company} />

                            <button
                              className={`circle-btn dislike`}
                              title="Not interested"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 14h4v7h-4z" />
                                <path d="M7 14h10l1-9h-12z" />
                              </svg>
                            </button>
                            <button
                              className={`circle-btn heart ${bookmarkedIds.has(job.id) ? 'active' : ''}`}
                              onClick={() => toggleBookmark(job.id)}
                              title="Save job"
                            >
                              {bookmarkedIds.has(job.id) ? (
                                <Bookmark size={18} fill="currentColor" />
                              ) : (
                                <BookmarkPlus size={18} />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="job-meta-row">
                          <div className="meta-item">
                            <span className="meta-label">Fixed-price/Hourly</span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-label">Est. Budget: {formatSalary(job)}</span>
                          </div>
                          <div className="meta-item">
                            <Briefcase size={14} className="meta-icon" />
                            <span className="capitalize">{job.type.replace('-', ' ')}</span>
                          </div>
                        </div>

                        <div className="job-description-upwork">
                          {expandedDescriptions.has(job.id) || job.description.length <= 250
                            ? job.description
                            : `${job.description.substring(0, 250)}...`}
                          {job.description.length > 250 && (
                            <span
                              className="more-link"
                              onClick={() => toggleDescription(job.id)}
                            >
                              {expandedDescriptions.has(job.id) ? ' less' : ' more'}
                            </span>
                          )}
                        </div>

                        <div className="job-skills-upwork">
                          {job.skills.slice(0, 6).map((skill) => (
                            <span key={skill} className="upwork-skill-tag">
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="company-verification-row">
                          <CheckCircle size={14} className="verified-icon" />
                          <span className="verified-text">Payment verified</span>
                          <span className="separator">•</span>
                          <div className="stars">
                            ★★★★★ <span className="rating-num">5.0</span>
                          </div>
                          <span className="separator">•</span>
                          <span className="company-spend">$10k+ spent</span>
                          <span className="separator">•</span>
                          <div className="location-meta">
                            <MapPin size={14} />
                            <span>{job.location}</span>
                          </div>
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
          </div>
        </section>
      )}

      {/* Chat Button */}
      <button className="chat-btn" onClick={() => navigate('/ai-copilot')}>
        <div className="chat-icon">
          <User size={24} />
        </div>
        <span className="chat-text">Chat with AI</span>
      </button>

      <style>{`
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                .landing-page {
                    min-height: 100vh;
                    font-family: 'Neue Montreal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background: #fff;
                    position: relative;
                }

                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 24px;
                }

                /* Header */
                .top-header {
                    background: white;
                    border-bottom: 1px solid #e5e7eb;
                    padding: 16px 0;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }

                .header-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .logo {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 20px;
                    font-weight: 700;
                    color: #111827;
                    cursor: pointer;
                }

                .logo-icon {
                    width: 32px;
                    height: 32px;
                    background: linear-gradient(135deg, #00d4aa 0%, #00a389 100%);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .logo-text {
                    font-size: 18px;
                }

                .main-nav {
                    display: flex;
                    align-items: center;
                    gap: 32px;
                }

                .nav-link {
                    color: #6b7280;
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: 500;
                    transition: color 0.2s;
                }

                .nav-link:hover {
                    color: #111827;
                }

                /* Compact Search in Header */
                .compact-search-form {
                    flex: 1;
                    max-width: 500px;
                    margin: 0 24px;
                }

                .compact-search-box {
                    display: flex;
                    align-items: center;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 20px;
                    padding: 6px 16px;
                    transition: all 0.2s;
                }

                .compact-search-box:focus-within {
                    border-color: #00d4aa;
                    box-shadow: 0 0 0 4px rgba(0, 212, 170, 0.1);
                }

                .compact-icon {
                    color: #9ca3af;
                    margin-right: 8px;
                }

                .compact-search-input {
                    border: none;
                    outline: none;
                    font-size: 14px;
                    width: 100%;
                    color: #111827;
                }

                .compact-divider {
                    width: 1px;
                    height: 20px;
                    background: #e5e7eb;
                    margin: 0 12px;
                }

                .compact-search-btn {
                    display: none; /* Hidden visually, enables enter key */
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .icon-btn {
                    display: flex;
                    align-items: center;
                    background: none;
                    border: none;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 6px;
                }

                .btn-signin {
                    background: #111827;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                }

                /* Job Ticker */
                .job-ticker {
                    background: #1f2937;
                    color: white;
                    padding: 12px 0;
                    overflow: hidden;
                    position: relative;
                }

                .ticker-content {
                    display: flex;
                    gap: 48px;
                    animation: scroll 40s linear infinite;
                    white-space: nowrap;
                }

                @keyframes scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }

                .ticker-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 14px;
                }

                .ticker-badge {
                    background: rgba(239, 68, 68, 0.2);
                    color: #fca5a5;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .ticker-company {
                    color: #9ca3af;
                }

                .ticker-location {
                    color: #6b7280;
                    font-size: 13px;
                }

                /* Hero Section */
                .hero {
                    position: relative;
                    padding: 80px 0 60px;
                    min-height: 600px;
                    display: flex;
                    align-items: center;
                    overflow: hidden;
                }

                .network-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    overflow: hidden;
                    pointer-events: none;
                }

                .network-svg {
                    width: 100%;
                    height: 100%;
                    opacity: 0.4;
                }

                .hero-content {
                    position: relative;
                    z-index: 10;
                    text-align: center;
                    max-width: 900px;
                    margin: 0 auto;
                }

                .whatsapp-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: #25D366;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 24px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-bottom: 32px;
                    transition: transform 0.2s;
                }

                .whatsapp-btn:hover {
                    transform: scale(1.05);
                }

                .whatsapp-icon {
                    font-size: 18px;
                }

                .hero-headline {
                    font-size: 56px;
                    font-weight: 800;
                    line-height: 1.1;
                    color: #111827;
                    margin-bottom: 24px;
                }

                .highlight-text {
                    color: #00d4aa;
                    position: relative;
                }

                .hero-subtitle {
                    font-size: 18px;
                    color: #6b7280;
                    margin-bottom: 48px;
                    line-height: 1.6;
                    max-width: 700px;
                    margin-left: auto;
                    margin-right: auto;
                }

                /* Search Form - Hero */
                .search-form {
                    margin-bottom: 32px;
                }

                .search-box {
                    display: flex;
                    align-items: center;
                    background: white;
                    border: 2px solid #00d4aa;
                    border-radius: 50px;
                    padding: 8px 8px 8px 24px;
                    box-shadow: 0 10px 40px rgba(0, 212, 170, 0.15);
                    max-width: 800px;
                    margin: 0 auto;
                }

                /* Compact Search Box for Results */
                .search-box-results {
                    display: flex;
                    align-items: center;
                    background: white;
                    border: 1px solid #d1d5db; /* Lighter border */
                    border-radius: 50px;
                    padding: 4px 4px 4px 20px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    max-width: 740px; /* Decreased width */
                    margin: 0;        /* Left align */
                    transition: border-color 0.2s;
                }
                .search-box-results:focus-within {
                    border-color: #00d4aa;
                    box-shadow: 0 4px 12px rgba(0, 212, 170, 0.1);
                }

                .search-btn-results {
                    background: #00d4aa;
                    color: white;
                    border: none;
                    padding: 8px 24px;
                    border-radius: 40px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s;
                    flex-shrink: 0;
                }
                .search-btn-results:hover {
                    background: #00bd98;
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
                }
                
                .search-box-results .search-input {
                    font-size: 14px; /* Smaller font for results search */
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
                
                .search-box-results .search-divider {
                    height: 24px;
                    margin: 0 12px;
                }

                .search-btn {
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

                .search-btn:hover {
                    background: #00bd98;
                }

                /* Popular Tags */
                .popular-tags {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-bottom: 24px;
                }

                .popular-label {
                    color: #6b7280;
                    font-size: 14px;
                    font-weight: 500;
                }

                .tag-pill {
                    background: white;
                    border: 1px solid #e5e7eb;
                    color: #374151;
                    padding: 8px 20px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .tag-pill:hover {
                    border-color: #00d4aa;
                    color: #00d4aa;
                    background: #f0fdf9;
                }

                /* Jobs Section */
                .jobs-section {
                    padding: 60px 0;
                    background: #f8fffe;
                }

                /* Layout */
                .jobs-layout {
                    display: grid;
                    grid-template-columns: 260px 1fr;
                    gap: 40px;
                    padding-top: 32px;
                    align-items: start;
                }

                /* Sidebar Filters */
                .filters-sidebar {
                    position: sticky;
                    top: 100px;
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    border: 1px solid #e5e7eb;
                }

                .sidebar-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .sidebar-header h3 {
                    font-size: 18px;
                    font-weight: 700;
                    margin: 0;
                    color: #111827;
                }

                .clear-btn {
                    background: none;
                    border: none;
                    color: #00d4aa;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                .clear-btn:hover {
                    color: #00bd98;
                }

                .filter-group {
                    margin-bottom: 24px;
                    border-bottom: 1px solid #f3f4f6;
                    padding-bottom: 20px;
                }

                .filter-group:last-child {
                    border-bottom: none;
                    padding-bottom: 0;
                }

                .filter-group h4 {
                    font-size: 15px;
                    font-weight: 600;
                    margin-bottom: 16px;
                    color: #374151;
                }

                .checkbox-group {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                    color: #4b5563;
                    cursor: pointer;
                }

                .checkbox-label input[type="checkbox"] {
                    accent-color: #00d4aa;
                    width: 16px;
                    height: 16px;
                    flex-shrink: 0;
                }

                .checkbox-label span {
                    margin-top: 1px;
                }

                /* Main Feed */
                .jobs-feed {
                    min-width: 0; /* Allow content to shrink */
                }

                .feed-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .results-count-heading {
                    font-size: 22px;
                    font-weight: 500;
                    color: #111827;
                    margin: 0;
                }

                .highlight-keyword {
                    font-weight: 700;
                    color: #00d4aa;
                }

                .sort-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    color: #6b7280;
                }

                .sort-select {
                    border: none;
                    background: none;
                    font-weight: 600;
                    color: #111827;
                    cursor: pointer;
                    outline: none;
                    padding: 4px 8px;
                    border-radius: 6px;
                    transition: background 0.2s;
                }
                .sort-select:hover {
                    background: #f3f4f6;
                }

                /* Upwork-style Job Cards */
                .jobs-list-upwork {
                    display: flex;
                    flex-direction: column;
                }

                .upwork-job-card {
                    padding: 24px 0;
                    border-bottom: 1px solid #e5e7eb;
                    transition: background 0.2s;
                    position: relative;
                }

                .upwork-job-card:hover {
                    background: #fdfdfd;
                }

                .upwork-job-card:hover .job-title-upwork {
                    color: #00d4aa;
                    text-decoration: underline;
                }

                .card-top-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 8px;
                }

                .posted-time {
                    font-size: 12px;
                    color: #6b7280;
                    margin-bottom: 6px;
                    display: block;
                }

                .job-title-upwork {
                    font-size: 18px;
                    font-weight: 600;
                    color: #111827;
                    margin: 0;
                    cursor: pointer;
                    line-height: 1.4;
                }

                .card-actions {
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                    align-items: center;
                }
                
                /* Job Logo Styles */
                .job-company-logo {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #f3f4f6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    color: #6b7280;
                    overflow: hidden;
                    margin-right: 8px;
                    border: 1px solid #e5e7eb;
                }
                
                .job-company-logo-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    padding: 2px;
                }
                
                .job-company-logo.fallback {
                    background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
                    color: #4b5563;
                }

                .circle-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border: 1px solid #e5e7eb;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #6b7280;
                    transition: all 0.2s;
                }

                .circle-btn:hover {
                    border-color: #00d4aa;
                    color: #00d4aa;
                    background: #f0fdf9;
                }

                .circle-btn.heart.active {
                    background: #00d4aa;
                    border-color: #00d4aa;
                    color: white;
                }

                .job-meta-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    font-size: 13px;
                    color: #6b7280;
                    margin-bottom: 12px;
                }

                .meta-item {
                    display: flex;
                    align-items: center;
                }

                .meta-item:not(:last-child)::after {
                    content: "–";
                    margin: 0 8px;
                    color: #9ca3af;
                }

                .meta-icon {
                    margin-right: 4px;
                }

                .capitalize {
                    text-transform: capitalize;
                }

                .job-description-upwork {
                    font-size: 14px;
                    color: #374151;
                    line-height: 1.5;
                    margin-bottom: 16px;
                    max-width: 90%;
                }

                .more-link {
                    color: #00d4aa;
                    font-weight: 500;
                    cursor: pointer;
                }

                .more-link:hover {
                    text-decoration: underline;
                }

                .job-skills-upwork {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                .upwork-skill-tag {
                    background: #f3f4f6;
                    color: #4b5563;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s;
                    cursor: pointer;
                }

                .upwork-skill-tag:hover {
                    background: #e5e7eb;
                }

                .company-verification-row {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    color: #6b7280;
                }

                .verified-icon {
                    color: #3b82f6; /* Blue for verified like screenshot */
                }

                .verified-text {
                    color: #6b7280;
                    font-weight: 500;
                }

                .stars {
                    color: #f59e0b; /* Amber for stars */
                    font-weight: 700;
                }

                .rating-num {
                    color: #6b7280;
                    font-weight: 400;
                }

                .location-meta {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-weight: 500;
                }

                .separator {
                    color: #d1d5db;
                }

                /* Skeletons */
                .job-card-skeleton {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 24px;
                    margin-bottom: 16px;
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
                    height: 24px;
                    width: 60%;
                    margin-bottom: 16px;
                }

                .skeleton-content {
                    height: 60px;
                    width: 100%;
                    margin-bottom: 16px;
                }

                .skeleton-footer {
                    height: 20px;
                    width: 40%;
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
                .empty-state {
                    text-align: center;
                    padding: 60px 24px;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e5e7eb;
                    margin-top: 24px;
                }

                .empty-icon {
                    color: #9ca3af;
                    margin-bottom: 16px;
                }

                .empty-state h3 {
                    font-size: 24px;
                    color: #374151;
                    margin-bottom: 8px;
                }

                .empty-state p {
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
                    transition: background 0.2s;
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

                /* Chat Button */
                .chat-btn {
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

                .chat-btn:hover {
                    background: #00bd98;
                    box-shadow: 0 -6px 16px rgba(0, 212, 170, 0.4);
                }

                .chat-icon {
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
                @media (max-width: 900px) {
                    .jobs-layout {
                        grid-template-columns: 1fr;
                        gap: 24px;
                    }
                    .filters-sidebar {
                        position: static;
                        top: auto;
                        margin-bottom: 24px;
                    }
                    .hero-headline {
                        font-size: 36px;
                    }
                    .search-box {
                        flex-direction: column;
                        padding: 16px;
                        border-radius: 16px;
                    }
                    .search-divider {
                        width: 100%;
                        height: 1px;
                        margin: 12px 0;
                    }
                    .search-btn {
                        width: 100%;
                        border-radius: 12px;
                    }
                    .chat-btn {
                        right: 16px;
                        font-size: 12px;
                        padding: 10px 16px;
                    }
                    .ticker-item {
                        font-size: 12px;
                    }
                    .feed-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .results-count-heading {
                        font-size: 20px;
                    }
                    .upwork-job-card {
                        padding: 24px 0;
                    }
                    .card-top-row {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 8px;
                    }
                    .card-actions {
                        width: 100%;
                        justify-content: flex-end;
                    }
                    .job-meta-row {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 8px;
                    }
                    .job-meta-row .meta-item:not(:last-child)::after {
                        content: "";
                        margin: 0;
                    }
                    .company-verification-row {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 8px;
                    }
                    .company-verification-row .separator {
                        display: none;
                    }
                }

                @media (max-width: 768px) {
                    .main-nav {
                        display: none;
                    }
                    .compact-search-form {
                        display: none; /* Hide compact search on smaller screens if hero search is present */
                    }
                }
            `}</style>
    </div>
  );
};
