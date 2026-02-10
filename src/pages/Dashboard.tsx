import { useState, useEffect } from 'react';
import {
  Briefcase,
  FileText,
  TrendingUp,
  Award,
  ArrowRight,
  Clock,
  MapPin,
  DollarSign,
  BookmarkPlus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Job } from '../types';
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

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

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
    const controller = new AbortController();

    const fetchJobs = async () => {
      setLoading(true);
      try {
        // Map user country to Adzuna API country code
        const getCountryCode = (country?: string) => {
          if (!country) return 'us'; // Default to US
          const countryLower = country.toLowerCase();
          if (countryLower.includes('united states') || countryLower.includes('usa') || countryLower.includes('america')) {
            return 'us';
          }
          if (countryLower.includes('united kingdom') || countryLower.includes('uk') || countryLower.includes('britain')) {
            return 'gb';
          }
          if (countryLower.includes('canada')) return 'ca';
          if (countryLower.includes('australia')) return 'au';
          if (countryLower.includes('india')) return 'in';
          // Default to US for remote or unknown countries
          return 'us';
        };

        const countryCode = getCountryCode(user?.country);

        // Fetch recommended jobs based on user profile
        const params = new URLSearchParams({
          query: user?.profession || 'Software Developer',
          results_per_page: '3',
          country: countryCode
        });

        // Only add location if it's not "Remote" to get broader results
        const location = user?.country || '';
        if (location && !location.toLowerCase().includes('remote')) {
          params.append('location', location);
        }

        const response = await fetch(`${API_BASE_URL}/api/jobs/search?${params.toString()}`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        const data = await response.json();

        if (data.success) {
          setRecommendedJobs(data.results || []);
        } else {
          throw new Error(data.message || 'API error');
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('🟡 Fetch aborted due to component unmount or re-render.');
        } else {
          console.error("Error connecting to server:", error);
          setRecommendedJobs([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchJobs();

    return () => controller.abort();
  }, [user]);

  const stats = [
    {
      label: 'Jobs Applied',
      value: '12',
      icon: Briefcase,
      color: 'primary',
      change: '+3 this week',
    },
    {
      label: 'Resume Score',
      value: user?.interviewReadinessScore ? `${user.interviewReadinessScore}%` : 'N/A',
      icon: FileText,
      color: 'success',
      change: 'Upload resume',
    },
    {
      label: 'Interview Ready',
      value: user?.interviewReadinessScore ? (user.interviewReadinessScore >= 80 ? 'High' : 'Medium') : 'Low',
      icon: Award,
      color: 'warning',
      change: 'Get feedback',
    },
    {
      label: 'Career Growth',
      value: '+25%',
      icon: TrendingUp,
      color: 'accent',
      change: 'Next 3 years',
    },
  ];

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
    <div className="dashboard">
      {/* Welcome Header */}
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.name}! 👋</h1>
          <p>Here's what's happening with your career journey today.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`stat-card stat-${stat.color}`}>
              <div className="stat-icon">
                <Icon size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">{stat.label}</p>
                <h2 className="stat-value">{stat.value}</h2>
                <p className="stat-change">{stat.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Recommended Jobs */}
        <div className="section jobs-section">
          <div className="section-header">
            <h2>Recommended Jobs</h2>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/jobs')}
            >
              View All
              <ArrowRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="skeleton-jobs">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 200 }} />
              ))}
            </div>
          ) : (
            <div className="jobs-list">
              {recommendedJobs.map((job) => (
                <div
                  key={job.id}
                  className="job-card cursor-pointer group"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <div className="job-header">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(getCompanyUrl(job.company), '_blank');
                      }}
                      className="company-logo-link"
                    >
                      <JobLogo company={job.company} />
                    </div>
                    <div className="job-meta">
                      <h3 className="group-hover:text-[#00d4aa] transition-colors">{job.title}</h3>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(getCompanyUrl(job.company), '_blank');
                        }}
                        style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}
                        className="hover:text-[#00d4aa] transition-colors cursor-pointer"
                      >
                        {job.company}
                      </div>
                    </div>
                    {job.matchScore && (
                      <div className="match-score">
                        <span>{job.matchScore}%</span>
                        <small>Match</small>
                      </div>
                    )}
                  </div>

                  <div className="job-details">
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
                  </div>

                  <div className="job-tags">
                    {job.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="badge badge-primary">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="job-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(job);
                      }}
                      className="btn btn-primary btn-sm"
                      disabled={applyingId === job.id}
                    >
                      {applyingId === job.id ? '...' : 'Apply Now'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/jobs/${job.id}`);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      View Details
                    </button>
                    <button
                      className="btn btn-ghost btn-sm icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        // bookmarking logic if needed
                      }}
                    >
                      <BookmarkPlus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="section quick-actions-section">
          <div className="section-header">
            <h2>Quick Actions</h2>
          </div>

          <div className="quick-actions">
            <button
              className="action-card"
              onClick={() => navigate('/resume')}
            >
              <div className="action-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <FileText size={24} />
              </div>
              <div>
                <h3>Upload Resume</h3>
                <p>Get AI-powered feedback</p>
              </div>
              <ArrowRight size={20} className="action-arrow" />
            </button>

            <button
              className="action-card"
              onClick={() => navigate('/trends')}
            >
              <div className="action-icon" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <h3>Career Trends</h3>
                <p>Explore future outlook</p>
              </div>
              <ArrowRight size={20} className="action-arrow" />
            </button>

            <button
              className="action-card"
              onClick={() => navigate('/ai-copilot')}
            >
              <div className="action-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Award size={24} />
              </div>
              <div>
                <h3>AI Copilot</h3>
                <p>Get career guidance</p>
              </div>
              <ArrowRight size={20} className="action-arrow" />
            </button>
          </div>

          {/* Recent Activity */}
          <div className="recent-activity">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon">
                  <Briefcase size={16} />
                </div>
                <div className="activity-content">
                  <p>Applied to <strong>Senior Developer</strong></p>
                  <small>2 hours ago</small>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">
                  <FileText size={16} />
                </div>
                <div className="activity-content">
                  <p>Updated resume</p>
                  <small>1 day ago</small>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">
                  <TrendingUp size={16} />
                </div>
                <div className="activity-content">
                  <p>Viewed career trends</p>
                  <small>2 days ago</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard {
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: var(--spacing-xl);
        }

        .dashboard-header h1 {
          font-size: var(--font-size-3xl);
          margin-bottom: var(--spacing-xs);
        }

        .dashboard-header p {
          font-size: var(--font-size-lg);
          color: var(--color-text-secondary);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
        }

        .stat-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          display: flex;
          gap: var(--spacing-md);
          transition: all var(--transition-base);
        }

        .stat-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .stat-primary .stat-icon {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
        }

        .stat-success .stat-icon {
          background: linear-gradient(135deg, var(--color-success), #34d399);
        }

        .stat-warning .stat-icon {
          background: linear-gradient(135deg, var(--color-warning), #fbbf24);
        }

        .stat-accent .stat-icon {
          background: linear-gradient(135deg, var(--color-accent), #22d3ee);
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-xs);
        }

        .stat-value {
          font-size: var(--font-size-2xl);
          font-weight: 700;
          margin-bottom: var(--spacing-xs);
        }

        .stat-change {
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary);
          margin: 0;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: var(--spacing-xl);
        }

        .section {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg);
        }

        .section-header h2 {
          font-size: var(--font-size-xl);
          margin: 0;
        }

        .jobs-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .job-card {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          transition: all var(--transition-base);
        }

        .job-card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary);
        }

        .job-header {
          display: flex;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }



        .job-meta {
          flex: 1;
        }

        .job-meta h3 {
          font-size: var(--font-size-base);
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
        }

        .job-meta p {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin: 0;
        }

        .match-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--spacing-sm);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
          border-radius: var(--radius-md);
          min-width: 60px;
        }

        .match-score span {
          font-size: var(--font-size-lg);
          font-weight: 700;
          color: var(--color-success);
        }

        .match-score small {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
        }

        .job-details {
          display: flex;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-md);
        }

        .job-detail-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .job-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }

        .job-actions {
          display: flex;
          gap: var(--spacing-sm);
        }

        .job-actions .btn {
          flex: 1;
        }

        .job-actions .icon-btn {
          flex: 0;
        }

        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-xl);
        }

        .action-card {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-base);
          text-align: left;
          width: 100%;
        }

        .action-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .action-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .action-card div:nth-child(2) {
          flex: 1;
        }

        .action-card h3 {
          font-size: var(--font-size-base);
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
        }

        .action-card p {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin: 0;
        }

        .action-arrow {
          color: var(--color-text-tertiary);
        }

        .recent-activity h3 {
          font-size: var(--font-size-base);
          margin-bottom: var(--spacing-md);
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .activity-item {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
        }

        .activity-icon {
          width: 32px;
          height: 32px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
        }

        .activity-content {
          flex: 1;
        }

        .activity-content p {
          font-size: var(--font-size-sm);
          margin-bottom: var(--spacing-xs);
        }

        .activity-content small {
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary);
        }

        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div >
  );
};
