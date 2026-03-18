import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, DollarSign, ExternalLink, Globe2, MapPin } from 'lucide-react';
import { fetchAggregatedJobById } from '../services/jobSearchService';
import type { AggregatedJob } from '../types/jobSearch';
import { applySeoMeta } from '../utils/seo';

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

export const JobSearchDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<AggregatedJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const decodedId = decodeURIComponent(id);

    const cachedRaw = localStorage.getItem('aggregated_jobs_recent');
    if (cachedRaw) {
      try {
        const parsed = JSON.parse(cachedRaw) as AggregatedJob[];
        const localHit = parsed.find((entry) => entry.id === decodedId);
        if (localHit) {
          setJob(localHit);
          setLoading(false);
          applySeoMeta(
            `${localHit.title} at ${localHit.company} | Job Details`,
            localHit.description.slice(0, 150),
            `/job-search/${encodeURIComponent(localHit.id)}`,
            {
              keywords: `${localHit.title}, ${localHit.company}, job details, workshour`,
            }
          );
          return;
        }
      } catch {
        // Ignore local cache parse failures.
      }
    }

    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const payload = await fetchAggregatedJobById(decodedId);
        if (!active) return;
        setJob(payload);
        applySeoMeta(
          `${payload.title} at ${payload.company} | Job Details`,
          payload.description.slice(0, 150),
          `/job-search/${encodeURIComponent(payload.id)}`,
          {
            keywords: `${payload.title}, ${payload.company}, job details, workshour`,
          }
        );
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to fetch job details');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <main style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>Loading job details...</main>;

  if (error || !job) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <p style={{ color: '#b91c1c' }}>{error || 'Job not found'}</p>
        <button onClick={() => navigate(-1)}>Back</button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <p>
        <Link to="/job-search">Back to search</Link>
      </p>
      <section style={{ border: '1px solid #dbe2ea', borderRadius: 14, padding: 16, background: '#fff' }}>
        <h1 style={{ marginTop: 0 }}>{job.title}</h1>
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ display: 'inline-flex', gap: 8, alignItems: 'center', margin: 0 }}>
            <Building2 size={16} /> {job.company}
          </p>
          <p style={{ display: 'inline-flex', gap: 8, alignItems: 'center', margin: 0 }}>
            <MapPin size={16} /> {job.location}
          </p>
          <p style={{ display: 'inline-flex', gap: 8, alignItems: 'center', margin: 0 }}>
            <DollarSign size={16} /> {salaryText(job)}
          </p>
          <p style={{ display: 'inline-flex', gap: 8, alignItems: 'center', margin: 0 }}>
            <Globe2 size={16} /> Source: {job.source}
          </p>
        </div>

        <p style={{ marginTop: 16, lineHeight: 1.6 }}>{job.description}</p>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          Open application link <ExternalLink size={15} />
        </a>
      </section>
    </main>
  );
};
