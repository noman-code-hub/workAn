import { Link } from 'react-router-dom';
import { ExternalLink, MapPin, Building2, DollarSign, Globe2, Clock3 } from 'lucide-react';
import type { AggregatedJob } from '../../types/jobSearch';
import { JobLogo } from '../JobLogo';
import './JobResultsList.css';

interface JobResultsListProps {
  jobs: AggregatedJob[];
  loading: boolean;
  error: string;
  page: number;
  totalPages: number;
  total: number;
  hasNextPage?: boolean;
  detailQuery?: string;
  onPageChange: (nextPage: number) => void;
}

const salaryText = (job: AggregatedJob) => {
  const min = Number(job.salary?.min || 0);
  const max = Number(job.salary?.max || 0);
  const currency = job.salary?.currency || 'USD';
  if (!min && !max) return 'Salary not disclosed';
  if (min && max && min !== max) {
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  }
  return `${currency} ${(max || min).toLocaleString()}`;
};

const shortText = (value: string, maxLen = 240) => {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
};

const postedText = (value?: string) => {
  if (!value) return 'Recently posted';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently posted';

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

  if (diffHours < 1) return 'Posted just now';
  if (diffHours < 24) return `Posted ${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `Posted ${diffDays}d ago`;
  return `Posted ${date.toLocaleDateString()}`;
};

export const JobResultsList = ({
  jobs,
  loading,
  error,
  page,
  totalPages,
  total,
  hasNextPage,
  detailQuery,
  onPageChange,
}: JobResultsListProps) => {
  if (loading) {
    return <p className="job-results-feedback">Loading jobs...</p>;
  }

  if (error) {
    return <p className="job-results-feedback job-results-feedback-error">{error}</p>;
  }

  if (!jobs.length) {
    return <p className="job-results-feedback">No jobs found for this query.</p>;
  }

  return (
    <section className="job-results-list">
      <p className="job-results-summary">
        {total.toLocaleString()} jobs found | Page {page} of {totalPages}
      </p>

      <div className="job-results-cards">
        {jobs.map((job) => (
          <article key={job.id} className="job-results-card">
            <div className="job-results-card-main">
              <div className="job-results-card-logo">
                <JobLogo company={job.company} logoUrl={job.logoUrl} />
              </div>
              <div className="job-results-card-body">
                <div className="job-results-card-topline">
                  <span className="job-results-badge">{job.remote ? 'Remote friendly' : 'On-site or hybrid'}</span>
                  <span className="job-results-posted">
                    <Clock3 size={14} /> {postedText(job.postedDate)}
                  </span>
                </div>
                <h3 className="job-results-card-title">
                  <Link to={`/job-search/${encodeURIComponent(job.id)}${detailQuery || ''}`}>{job.title}</Link>
                </h3>
                <div className="job-results-meta">
                  <span>
                    <Building2 size={14} /> {job.company}
                  </span>
                  <span>
                    <MapPin size={14} /> {job.location}
                  </span>
                  <span>
                    <DollarSign size={14} /> {salaryText(job)}
                  </span>
                  <span>
                    <Globe2 size={14} /> {job.source}
                  </span>
                </div>
                {Array.isArray(job.tags) && job.tags.length > 0 ? (
                  <div className="job-results-tags">
                    {job.tags.slice(0, 4).map((tag) => (
                      <span key={`${job.id}-${tag}`}>{tag}</span>
                    ))}
                  </div>
                ) : null}
                <p className="job-results-description">{shortText(job.description)}</p>
                <div className="job-results-actions">
                  <Link to={`/job-search/${encodeURIComponent(job.id)}${detailQuery || ''}`}>View details</Link>
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    Apply <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="job-results-pagination">
        <button className="job-results-pagination-btn" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        <button
          className="job-results-pagination-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={hasNextPage === undefined ? page >= totalPages : !hasNextPage}
        >
          Next
        </button>
      </div>
    </section>
  );
};
