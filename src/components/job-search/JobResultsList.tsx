import { Link } from 'react-router-dom';
import { ExternalLink, MapPin, Building2, DollarSign, Globe2 } from 'lucide-react';
import type { AggregatedJob } from '../../types/jobSearch';

interface JobResultsListProps {
  jobs: AggregatedJob[];
  loading: boolean;
  error: string;
  page: number;
  totalPages: number;
  total: number;
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

export const JobResultsList = ({
  jobs,
  loading,
  error,
  page,
  totalPages,
  total,
  detailQuery,
  onPageChange,
}: JobResultsListProps) => {
  if (loading) {
    return <p>Loading jobs...</p>;
  }

  if (error) {
    return <p style={{ color: '#b91c1c' }}>{error}</p>;
  }

  if (!jobs.length) {
    return <p>No jobs found for this query.</p>;
  }

  return (
    <section>
      <p style={{ marginBottom: 12 }}>
        {total.toLocaleString()} jobs found | Page {page} of {totalPages}
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        {jobs.map((job) => (
          <article
            key={job.id}
            style={{
              border: '1px solid #dbe2ea',
              borderRadius: 14,
              background: '#fff',
              padding: 14,
            }}
          >
            <h3 style={{ margin: '0 0 8px' }}>
              <Link to={`/job-search/${encodeURIComponent(job.id)}${detailQuery || ''}`}>{job.title}</Link>
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, color: '#4b5563', fontSize: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={14} /> {job.company}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} /> {job.location}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <DollarSign size={14} /> {salaryText(job)}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Globe2 size={14} /> {job.source}
              </span>
            </div>
            <p style={{ margin: '10px 0' }}>{shortText(job.description)}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to={`/job-search/${encodeURIComponent(job.id)}${detailQuery || ''}`}>View details</Link>
              <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                Apply <ExternalLink size={14} />
              </a>
            </div>
          </article>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Next
        </button>
      </div>
    </section>
  );
};
