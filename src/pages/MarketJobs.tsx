import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Clock3, MapPin, RefreshCcw, Search, TriangleAlert } from 'lucide-react';
import type { Job } from '../types';
import { JobLogo } from '../components/JobLogo';
import { apiUrl, parseApiJson } from '../config/api';

type MarketJobsResponse = {
  success: boolean;
  count: number;
  results: Job[];
  updated_at?: string | null;
  sync_error?: string | null;
};

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [activeGroup, setActiveGroup] = useState('All');

  const allRoles = useMemo(() => ROLE_GROUPS.flatMap((group) => group.roles), []);

  const fetchJobs = async (options: { forceSync?: boolean; silent?: boolean } = {}) => {
    const { forceSync = false, silent = false } = options;
    if (forceSync) {
      setSyncing(true);
    } else if (!silent) {
      setLoading(true);
    }

    try {
      setError('');
      const params = new URLSearchParams({
        country: 'us',
        limit: '150',
      });

      if (forceSync) params.set('force_sync', '1');
      if (selectedRole) params.set('role', selectedRole);
      if (search.trim()) params.set('q', search.trim());

      const response = await fetch(apiUrl(`/jobs/market?${params.toString()}`));
      const data = await parseApiJson<MarketJobsResponse>(response);

      if (!data.success) {
        throw new Error('Failed to load market jobs.');
      }

      setJobs(Array.isArray(data.results) ? data.results : []);
      setLastUpdatedAt(data.updated_at || null);
      setSyncWarning(data.sync_error || '');
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load jobs right now.';
      setError(message);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs({ silent: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, selectedRole]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const groupRoles = activeGroup === 'All'
    ? allRoles
    : (ROLE_GROUPS.find((group) => group.label === activeGroup)?.roles || []);

  return (
    <div className="market-jobs-page">
      <section className="hero">
        <div>
          <h1>Weekly Market Jobs</h1>
          <p>Listings are refreshed every week. Old unavailable jobs are removed automatically.</p>
        </div>
        <button
          type="button"
          className="sync-btn"
          onClick={() => fetchJobs({ forceSync: true })}
          disabled={syncing}
        >
          <RefreshCcw size={16} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
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

      {loading ? (
        <div className="placeholder">Loading jobs...</div>
      ) : jobs.length === 0 ? (
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

              <a href={job.applyUrl || '#'} target="_blank" rel="noreferrer" className="apply-link">
                Apply Now
              </a>
            </article>
          ))}
        </div>
      )}

      <style>{`
        .market-jobs-page {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          background: linear-gradient(145deg, #f8fbff, #eefbf7);
          border: 1px solid #d9e9e2;
          border-radius: 16px;
          padding: 16px;
        }

        .hero h1 {
          margin: 0;
          font-size: 1.45rem;
        }

        .hero p {
          margin: 6px 0 0;
          color: #475569;
          font-size: 0.9rem;
        }

        .sync-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          border-radius: 10px;
          background: #0f766e;
          color: white;
          padding: 10px 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .sync-btn:disabled {
          opacity: 0.75;
          cursor: wait;
        }

        .filters {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px 220px;
          gap: 10px;
        }

        .search-wrap {
          border: 1px solid #dbe5ef;
          border-radius: 10px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
        }

        .search-wrap input,
        .filters select {
          border: 0;
          outline: none;
          height: 42px;
          width: 100%;
          background: transparent;
        }

        .filters select {
          border: 1px solid #dbe5ef;
          border-radius: 10px;
          padding: 0 10px;
          background: white;
        }

        .status {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          color: #334155;
          font-size: 0.85rem;
        }

        .status span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .warning,
        .error,
        .placeholder {
          border-radius: 10px;
          padding: 12px;
          font-size: 0.9rem;
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
          gap: 12px;
        }

        .card {
          border: 1px solid #dbe5ef;
          border-radius: 14px;
          padding: 14px;
          background: white;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .card-head {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .card-head h3 {
          margin: 0;
          font-size: 1rem;
          color: #0f172a;
        }

        .card-head p {
          margin: 2px 0 0;
          color: #475569;
          font-size: 0.85rem;
        }

        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          color: #334155;
          font-size: 0.8rem;
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
          font-size: 0.88rem;
          line-height: 1.45;
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
          font-size: 0.72rem;
          border-radius: 999px;
          padding: 4px 8px;
        }

        .apply-link {
          margin-top: auto;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          border-radius: 10px;
          border: 1px solid #0f766e;
          color: #0f766e;
          text-decoration: none;
          padding: 9px 12px;
          font-weight: 600;
        }

        .apply-link:hover {
          background: #0f766e;
          color: white;
        }

        @media (max-width: 900px) {
          .filters {
            grid-template-columns: 1fr;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .hero {
            flex-direction: column;
          }

          .sync-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
