import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Clock3, MapPin, Search, TriangleAlert } from 'lucide-react';
import type { Job } from '../types';
import { JobLogo } from '../components/JobLogo';
import { AppLoader } from '../components/AppLoader';
import { aggregatedJobToJob, fetchMarketJobsResponse } from '../services/jobSearchService';

const ROLE_GROUPS = [
  {
    label: 'Office & Business',
    roles: [
      'Manager',
      'Assistant Manager',
      'Supervisor',
      'HR Officer',
      'Accountant',
      'Finance Analyst',
      'Data Entry Operator',
      'Receptionist',
      'Admin Officer',
      'Executive Assistant',
    ],
  },
  {
    label: 'Technology & IT',
    roles: [
      'Software Developer',
      'Web Developer',
      'Mobile App Developer',
      'UI/UX Designer',
      'Graphic Designer',
      'Data Analyst',
      'Cybersecurity Specialist',
      'Network Engineer',
      'IT Support Officer',
      'Product Manager',
    ],
  },
  {
    label: 'Engineering',
    roles: [
      'Mechanical Engineer',
      'Electrical Engineer',
      'Civil Engineer',
      'Quality Control Officer',
      'Technician',
      'Machine Operator',
      'CAD Designer',
      'Maintenance Engineer',
    ],
  },
  {
    label: 'Medical & Health',
    roles: [
      'Doctor',
      'Nurse',
      'Pharmacist',
      'Lab Technician',
      'Medical Assistant',
      'Dentist',
      'Physiotherapist',
      'Radiologist',
    ],
  },
  {
    label: 'Education',
    roles: [
      'Teacher',
      'Lecturer',
      'Principal',
      'Tutor',
      'Academic Coordinator',
      'Librarian',
    ],
  },
  {
    label: 'Sales & Marketing',
    roles: [
      'Sales Executive',
      'Marketing Manager',
      'Social Media Manager',
      'Brand Ambassador',
      'Customer Service Representative',
      'Call Center Agent',
    ],
  },
  {
    label: 'Construction & Labor',
    roles: [
      'Site Supervisor',
      'Mason',
      'Plumber',
      'Electrician',
      'Carpenter',
      'Painter',
      'Laborer',
    ],
  },
  {
    label: 'Logistics & Transport',
    roles: [
      'Driver',
      'Delivery Rider',
      'Warehouse Manager',
      'Storekeeper',
      'Logistics Coordinator',
    ],
  },
  {
    label: 'Creative & Media',
    roles: [
      'Photographer',
      'Video Editor',
      'Content Creator',
      'Copywriter',
      'Animator',
      'Actor',
      'Director',
    ],
  },
];

const getTimeSince = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const days = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

const formatSalary = (job: Job) => {
  if (!job.salary?.min && !job.salary?.max) return 'Salary not listed';
  return `$${Math.round((job.salary.min || 0) / 1000)}k - $${Math.round((job.salary.max || 0) / 1000)}k`;
};

export const MarketJobs = () => {
  const navigate = useNavigate();
  const envSyncMs = Number(import.meta.env.VITE_MARKET_SYNC_MS || 5 * 60 * 1000);
  const marketSyncIntervalMs = Number.isFinite(envSyncMs) && envSyncMs >= 30_000
    ? envSyncMs
    : 5 * 60 * 1000;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [activeGroup, setActiveGroup] = useState('All');
  const hasInitializedFilterFetchRef = useRef(false);

  const allRoles = useMemo(() => ROLE_GROUPS.flatMap((group) => group.roles), []);

  const fetchJobs = async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setLoading(true);
    }

    try {
      setError('');
      const params = new URLSearchParams({
        country: 'us',
        limit: '150',
      });

      if (selectedRole) params.set('role', selectedRole);
      if (search.trim()) params.set('q', search.trim());

      const data = await fetchMarketJobsResponse(params);

      if (!data.success) {
        throw new Error('Failed to load market jobs.');
      }

      window.localStorage.setItem('aggregated_jobs_recent', JSON.stringify((data.results || []).slice(0, 200)));
      setJobs(Array.isArray(data.results) ? data.results.map(aggregatedJobToJob) : []);
      setLastUpdatedAt(data.updated_at || null);
      setSyncWarning(data.sync_error || '');
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load jobs right now.';
      setError(message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!hasInitializedFilterFetchRef.current) {
      hasInitializedFilterFetchRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      fetchJobs({ silent: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, selectedRole]);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchJobs({ silent: true });
    }, marketSyncIntervalMs);
    return () => window.clearInterval(interval);
  }, [search, selectedRole, marketSyncIntervalMs]);

  const groupRoles = activeGroup === 'All'
    ? allRoles
    : (ROLE_GROUPS.find((group) => group.label === activeGroup)?.roles || []);

  if (loading) {
    return <AppLoader variant="full" />;
  }

  return (
    <div className="market-jobs-page">
      <section className="hero">
        <div className="hero-copy">
          <h1>Weekly Market Jobs</h1>
          <p>Listings are refreshed every week. Old unavailable jobs are removed automatically.</p>
        </div>
      </section>

      <section className="filters">
        <div className="search-wrap">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, company or location"
          />
        </div>

        <select
          value={activeGroup}
          onChange={(event) => {
            const group = event.target.value;
            setActiveGroup(group);
            setSelectedRole('');
          }}
        >
          <option value="All">All role groups</option>
          {ROLE_GROUPS.map((group) => (
            <option key={group.label} value={group.label}>{group.label}</option>
          ))}
        </select>

        <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
          <option value="">All roles</option>
          {groupRoles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </section>

      <section className="status">
        <span><Briefcase size={15} /> {jobs.length} jobs loaded</span>
        <span><Clock3 size={15} /> Last update: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : 'Not synced yet'}</span>
      </section>

      {syncWarning && (
        <div className="warning"><TriangleAlert size={16} /> {syncWarning}</div>
      )}

      {error && (
        <div className="error"><TriangleAlert size={16} /> {error}</div>
      )}

      {jobs.length === 0 ? (
        <div className="placeholder">No jobs found for this filter yet.</div>
      ) : (
        <div className="grid">
          {jobs.map((job) => (
            <article key={job.id} className="card">
              <div className="card-head">
                <JobLogo company={job.company} />
                <div>
                  <h3>{job.title}</h3>
                  <p>{job.company}</p>
                </div>
              </div>

              <div className="meta">
                <span><MapPin size={14} /> {job.location}</span>
                <span>{formatSalary(job)}</span>
                <span>{getTimeSince(job.postedDate)}</span>
              </div>

              <p className="desc">{job.description}</p>

              <div className="skills">
                {(job.skills || []).slice(0, 6).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>

              <div className="card-actions">
                <button
                  type="button"
                  className="details-link"
                  onClick={() => navigate(`/job-search/${encodeURIComponent(job.id)}`, {
                    state: {
                      returnTo: '/market-jobs',
                      returnLabel: 'Back to Market Jobs',
                    },
                  })}
                >
                  Details
                </button>
                <a href={job.applyUrl || '#'} target="_blank" rel="noreferrer" className="apply-link">
                  Apply Now
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <style>{`
        .market-jobs-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          padding: 18px 20px 24px;
          background:
            radial-gradient(circle at 85% 18%, rgba(125, 211, 252, 0.24), transparent 42%),
            radial-gradient(circle at 8% 95%, rgba(165, 243, 252, 0.18), transparent 45%),
            #f3f8ff;
          border-radius: 18px;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          background: linear-gradient(140deg, #f7fbff, #effcf7);
          border: 1px solid #d5e6df;
          border-radius: 16px;
          padding: 18px 20px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(1.45rem, 2.2vw, 2rem);
          letter-spacing: -0.02em;
        }

        .hero p {
          margin: 6px 0 0;
          color: #475569;
          font-size: 0.98rem;
        }

        .hero-copy {
          min-width: 0;
        }

        .filters {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 240px 240px;
          gap: 12px;
        }

        .search-wrap {
          border: 1px solid #dbe5ef;
          border-radius: 12px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
        }

        .search-wrap input,
        .filters select {
          border: 0;
          outline: none;
          height: 46px;
          width: 100%;
          background: transparent;
          font-size: 0.97rem;
        }

        .filters select {
          border: 1px solid #dbe5ef;
          border-radius: 12px;
          padding: 0 12px;
          background: white;
        }

        .status {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          color: #334155;
          font-size: 0.92rem;
          border: 1px solid #dde6f0;
          background: #ffffff;
          border-radius: 12px;
          padding: 10px 12px;
        }

        .status span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .warning,
        .error,
        .placeholder {
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 0.92rem;
        }

        .warning {
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
          display: inline-flex;
          gap: 8px;
          align-items: center;
        }

        .error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          display: inline-flex;
          gap: 8px;
          align-items: center;
        }

        .placeholder {
          border: 1px dashed #cbd5e1;
          color: #475569;
          background: #f8fafc;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .card {
          border: 1px solid #d5e0eb;
          border-radius: 16px;
          padding: 16px;
          background: white;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 260px;
          box-shadow: 0 14px 30px -30px rgba(15, 23, 42, 0.7);
          transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
        }

        .card:hover {
          transform: translateY(-2px);
          border-color: #0f766e;
          box-shadow: 0 20px 34px -28px rgba(15, 23, 42, 0.75);
        }

        .card-head {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .card-head h3 {
          margin: 0;
          font-size: 1.28rem;
          color: #0f172a;
          line-height: 1.25;
        }

        .card-head p {
          margin: 2px 0 0;
          color: #475569;
          font-size: 0.92rem;
        }

        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          color: #334155;
          font-size: 0.84rem;
        }

        .meta span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          padding: 4px 9px;
        }

        .desc {
          margin: 0;
          color: #334155;
          font-size: 0.95rem;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .skills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .skills span {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          font-size: 0.76rem;
          border-radius: 999px;
          padding: 4px 8px;
        }

        .apply-link {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          border-radius: 12px;
          border: 1px solid #0f766e;
          color: #0f766e;
          text-decoration: none;
          padding: 10px 14px;
          font-weight: 600;
          flex: 1;
        }

        .card-actions {
          margin-top: auto;
          display: flex;
          gap: 10px;
        }

        .details-link {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #0f172a;
          text-decoration: none;
          padding: 10px 14px;
          font-weight: 600;
          cursor: pointer;
          flex: 1;
          transition: background 220ms ease, border-color 220ms ease, color 220ms ease;
        }

        .details-link:hover {
          background: #ecfeff;
          border-color: #0f766e;
          color: #0f766e;
        }

        .apply-link:hover {
          background: #0f766e;
          color: white;
        }

        [data-theme="dark"] .market-jobs-page {
          background:
            radial-gradient(circle at 85% 18%, rgba(56, 189, 248, 0.14), transparent 42%),
            radial-gradient(circle at 8% 95%, rgba(20, 184, 166, 0.12), transparent 45%),
            #0b1220;
        }

        [data-theme="dark"] .market-jobs-page .hero {
          background: linear-gradient(140deg, #0f172a, #111827);
          border-color: #334155;
        }

        [data-theme="dark"] .market-jobs-page .hero h1 {
          color: #f1f5f9;
        }

        [data-theme="dark"] .market-jobs-page .hero p {
          color: #94a3b8;
        }

        [data-theme="dark"] .market-jobs-page .search-wrap,
        [data-theme="dark"] .market-jobs-page .filters select {
          border-color: #334155;
          background: #0f172a;
          color: #e2e8f0;
        }

        [data-theme="dark"] .market-jobs-page .search-wrap svg {
          color: #94a3b8;
        }

        [data-theme="dark"] .market-jobs-page .search-wrap input,
        [data-theme="dark"] .market-jobs-page .search-wrap input::placeholder,
        [data-theme="dark"] .market-jobs-page .filters select {
          color: #cbd5e1;
        }

        [data-theme="dark"] .market-jobs-page .status {
          color: #cbd5e1;
          border-color: #334155;
          background: #0f172a;
        }

        [data-theme="dark"] .market-jobs-page .warning {
          background: rgba(245, 158, 11, 0.12);
          border-color: rgba(245, 158, 11, 0.4);
          color: #fcd34d;
        }

        [data-theme="dark"] .market-jobs-page .error {
          background: rgba(239, 68, 68, 0.14);
          border-color: rgba(248, 113, 113, 0.45);
          color: #fca5a5;
        }

        [data-theme="dark"] .market-jobs-page .placeholder {
          border-color: #334155;
          color: #94a3b8;
          background: #0f172a;
        }

        [data-theme="dark"] .market-jobs-page .card {
          border-color: #334155;
          background: linear-gradient(170deg, #111827, #0f172a);
          box-shadow: 0 16px 30px -24px rgba(2, 6, 23, 0.9);
        }

        [data-theme="dark"] .market-jobs-page .card:hover {
          border-color: #14b8a6;
          box-shadow: 0 20px 34px -24px rgba(2, 6, 23, 0.95);
        }

        [data-theme="dark"] .market-jobs-page .card-head h3 {
          color: #e2e8f0;
        }

        [data-theme="dark"] .market-jobs-page .card-head p,
        [data-theme="dark"] .market-jobs-page .desc,
        [data-theme="dark"] .market-jobs-page .meta {
          color: #94a3b8;
        }

        [data-theme="dark"] .market-jobs-page .meta span {
          background: #0b1220;
          border-color: #334155;
          color: #cbd5e1;
        }

        [data-theme="dark"] .market-jobs-page .skills span {
          background: rgba(59, 130, 246, 0.16);
          color: #93c5fd;
          border-color: rgba(96, 165, 250, 0.45);
        }

        [data-theme="dark"] .market-jobs-page .apply-link {
          border-color: #14b8a6;
          color: #5eead4;
          background: rgba(20, 184, 166, 0.08);
        }

        [data-theme="dark"] .market-jobs-page .details-link {
          border-color: #334155;
          background: #0b1220;
          color: #e2e8f0;
        }

        [data-theme="dark"] .market-jobs-page .details-link:hover {
          border-color: #14b8a6;
          background: rgba(20, 184, 166, 0.08);
          color: #5eead4;
        }

        [data-theme="dark"] .market-jobs-page .apply-link:hover {
          background: #0f766e;
          color: #ecfeff;
        }

        @media (max-width: 1180px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .market-jobs-page {
            padding: 12px;
            border-radius: 0;
          }

          .filters {
            grid-template-columns: 1fr;
          }

          .hero {
            flex-direction: column;
            align-items: flex-start;
            padding: 14px;
          }

          .status {
            font-size: 0.85rem;
            gap: 10px;
            padding: 10px;
          }
        }

        @media (max-width: 640px) {
          .market-jobs-page {
            padding: 10px;
          }

          .hero h1 {
            font-size: 1.3rem;
          }

          .hero p {
            font-size: 0.9rem;
          }

          .search-wrap input,
          .filters select {
            height: 44px;
            font-size: 0.92rem;
          }

          .card {
            padding: 12px;
            border-radius: 14px;
            min-height: 0;
          }

          .card-head h3 {
            font-size: 1.08rem;
          }

          .card-head p,
          .desc {
            font-size: 0.88rem;
          }

          .meta {
            font-size: 0.75rem;
            gap: 8px;
          }

          .apply-link {
            width: 100%;
          }

          .card-actions {
            flex-direction: column;
          }

          .details-link {
            width: 100%;
          }

          .status {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .card {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};
