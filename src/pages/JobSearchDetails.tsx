import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Bookmark, Heart, Share2 } from 'lucide-react';
import { JobLogo } from '../components/JobLogo';
import { fetchAggregatedJobById } from '../services/jobSearchService';
import type { AggregatedJob } from '../types/jobSearch';
import { applySeoMeta } from '../utils/seo';
import { resolveApplyLink } from '../utils/jobUtils';

const SAVED_JOBS_KEY = 'job-search:saved-jobs';

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

const formatSource = (value: string) => {
  const normalized = (value || 'unknown').trim();
  if (!normalized || normalized === 'unknown') return 'Workshour Network';
  return normalized.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const getCompanyOverview = (job: AggregatedJob, sourceLabel: string) => {
  const workMode = job.remote ? 'remote-friendly' : 'location-based';
  return `${job.company} is currently hiring through ${sourceLabel}. This ${workMode} opening is listed for ${job.location}, and candidates should review the role scope, compensation, and application requirements before proceeding.`;
};

const getDisplayReference = (job: AggregatedJob) => {
  const raw = (job.sourceJobId || job.id || '').trim();
  if (!raw) return 'Not available';
  if (raw.length <= 28) return raw;
  return `${raw.slice(0, 16)}...${raw.slice(-8)}`;
};

export const JobSearchDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [job, setJob] = useState<AggregatedJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const applyHref = job ? resolveApplyLink(job) : null;
  const navState = (location.state as { returnTo?: string; returnLabel?: string; job?: AggregatedJob } | null) || null;
  const backTarget = navState?.returnTo || '/job-search';
  const backLabel = navState?.returnLabel || 'Back to search';

  useEffect(() => {
    if (!id) return;
    const decodedId = decodeURIComponent(id);

    if (navState?.job && navState.job.id === decodedId) {
      setJob({
        ...navState.job,
        url: resolveApplyLink(navState.job) || navState.job.url || '',
      });
      setLoading(false);
      applySeoMeta(
        `${navState.job.title} at ${navState.job.company} | Job Details`,
        navState.job.description.slice(0, 150),
        `/job-search/${encodeURIComponent(navState.job.id)}`,
        {
          keywords: `${navState.job.title}, ${navState.job.company}, job details, workshour`,
        }
      );
      return;
    }

    const cachedRaw = localStorage.getItem('aggregated_jobs_recent');
    if (cachedRaw) {
      try {
        const parsed = JSON.parse(cachedRaw) as AggregatedJob[];
        const localHit = parsed.find((entry) => entry.id === decodedId);
        if (localHit) {
          setJob({
            ...localHit,
            url: resolveApplyLink(localHit) || localHit.url || '',
          });
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
        setJob({
          ...payload,
          url: resolveApplyLink(payload) || payload.url || '',
        });
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

    void run();
    return () => {
      active = false;
    };
  }, [id, navState]);

  useEffect(() => {
    if (!job || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(SAVED_JOBS_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setSaved(parsed.includes(job.id));
    } catch {
      setSaved(false);
    }
  }, [job]);

  const toggleSaved = () => {
    if (!job || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(SAVED_JOBS_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      const next = parsed.includes(job.id) ? parsed.filter((item) => item !== job.id) : [...parsed, job.id];
      window.localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(next));
      setSaved(next.includes(job.id));
    } catch {
      // Ignore storage failures.
    }
  };

  const handleShare = async () => {
    if (!job || typeof window === 'undefined') return;
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${job.title} at ${job.company}`,
          text: `Check out this job: ${job.title} at ${job.company}`,
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Ignore share/copy failures.
    }
  };

  if (loading) {
    return (
      <main className="job-ref-shell">
        <section className="job-ref-state">Loading job details...</section>
        <style>{detailStyles}</style>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="job-ref-shell">
        <section className="job-ref-state">
          <p>{error || 'Job not found'}</p>
          <button type="button" className="job-ref-back-btn" onClick={() => navigate(backTarget)}>
            {backLabel}
          </button>
        </section>
        <style>{detailStyles}</style>
      </main>
    );
  }

  const sourceLabel = formatSource(job.source);
  const companyOverview = getCompanyOverview(job, sourceLabel);
  const referenceId = getDisplayReference(job);

  return (
    <main className="job-ref-shell">
      <section className="job-ref-content">
        <div className="job-ref-backline">
          <Link to={backTarget} className="job-ref-back-link">
            {backLabel}
          </Link>
        </div>

        <section className="job-ref-layout">
          <aside className="job-ref-sidebar">
            <h1>{job.title}</h1>
            <div className="job-ref-meta">
              <p><span>Company:</span> {job.company}</p>
              <p><span>Location:</span> {job.location}</p>
              <p><span>Salary:</span> {salaryText(job)}</p>
              <p><span>Job ID:</span> {referenceId}</p>
            </div>

            {applyHref ? (
              <a href={applyHref} target="_blank" rel="noopener noreferrer" className="job-ref-apply">
                Apply Now
              </a>
            ) : (
              <div className="job-ref-warning">Application link is currently unavailable for this listing.</div>
            )}

            <div className="job-ref-actions">
              <button type="button" className="job-ref-action" onClick={handleShare}>
                Share Job <Share2 size={18} />
              </button>
              <button type="button" className="job-ref-action" onClick={toggleSaved}>
                {saved ? 'Saved Job' : 'Save Job'} {saved ? <Heart size={18} fill="currentColor" /> : <Bookmark size={18} />}
              </button>
            </div>
          </aside>

          <section className="job-ref-main">
            <div className="job-ref-section">
              <div className="job-ref-company-header">
                <div className="job-ref-logo job-ref-logo-inline">
                  <JobLogo company={job.company} logoUrl={job.logoUrl} />
                </div>
                <div className="job-ref-company-copy">
                  <p className="job-ref-company-name">{job.company}</p>
                  <p className="job-ref-company-sub">{sourceLabel}</p>
                </div>
              </div>
            </div>

            <div className="job-ref-section">
              <h2>Company Overview</h2>
              <div className="job-ref-highlight">
                <p>{companyOverview}</p>
              </div>
            </div>

            <div className="job-ref-section">
              <h2>Job Overview</h2>
              <p className="job-ref-description">{job.description}</p>
            </div>

            <div className="job-ref-footnote">
              <span>{sourceLabel}</span>
              <span className="job-ref-dot" />
              <span>{job.remote ? 'Remote friendly' : 'On-site / hybrid'}</span>
              <span className="job-ref-dot" />
              <span>{job.type.replace(/[_-]+/g, ' ')}</span>
              {applyHref ? (
                <a href={applyHref} target="_blank" rel="noopener noreferrer">
                  Open application <ArrowRight size={16} />
                </a>
              ) : null}
            </div>
          </section>
        </section>
      </section>

      <style>{detailStyles}</style>
    </main>
  );
};

const detailStyles = `
  .job-ref-shell {
    width: 100%;
    min-height: calc(100vh - var(--header-height));
    background:
      radial-gradient(circle at top right, rgba(86, 221, 208, 0.12), transparent 26%),
      linear-gradient(180deg, #f9fdff 0%, var(--color-bg-secondary) 42%, var(--color-bg-primary) 100%);
    color: var(--color-text-primary);
  }

  .job-ref-content {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 44px clamp(24px, 3vw, 56px) 64px;
  }

  .job-ref-backline {
    margin-bottom: 28px;
  }

  .job-ref-back-link,
  .job-ref-back-btn {
    color: var(--color-primary-dark);
    text-decoration: none;
    font-weight: 600;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .job-ref-layout {
    display: grid;
    grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
    gap: clamp(36px, 5vw, 96px);
    align-items: start;
  }

  .job-ref-sidebar {
    padding-top: 6px;
  }

  .job-ref-sidebar h1 {
    margin: 0 0 20px;
    font-size: clamp(2.1rem, 4vw, 3.05rem);
    line-height: 1.04;
    letter-spacing: -0.04em;
    color: var(--color-text-primary);
    max-width: 11ch;
    overflow-wrap: anywhere;
  }

  .job-ref-logo {
    width: fit-content;
  }

  .job-ref-logo-inline {
    transform: scale(1.06);
    transform-origin: top left;
  }

  .job-ref-company-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 20px;
    border: 1px solid var(--color-border-light);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 252, 0.98));
    box-shadow: var(--shadow-sm);
  }

  .job-ref-company-copy {
    min-width: 0;
  }

  .job-ref-company-name,
  .job-ref-company-sub {
    margin: 0;
  }

  .job-ref-company-name {
    color: var(--color-text-primary);
    font-weight: 700;
    font-size: 1rem;
  }

  .job-ref-company-sub {
    color: var(--color-text-tertiary);
    font-size: 0.94rem;
  }

  .job-ref-meta {
    display: grid;
    gap: 10px;
    margin-bottom: 28px;
    color: var(--color-text-secondary);
    font-size: 1.02rem;
    padding: 22px 24px;
    border: 1px solid var(--color-border-light);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: var(--shadow-xs);
  }

  .job-ref-meta p {
    margin: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .job-ref-meta span {
    color: var(--color-text-tertiary);
  }

  .job-ref-apply {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: min(100%, 362px);
    min-height: 58px;
    margin-bottom: 24px;
    background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary));
    color: var(--color-text-inverse);
    text-decoration: none;
    border-radius: 12px;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    -webkit-text-fill-color: var(--color-text-inverse);
    box-shadow: 0 18px 34px -24px rgba(23, 201, 176, 0.7);
    transition: transform var(--transition-base), box-shadow var(--transition-base);
  }

  .job-ref-apply,
  .job-ref-apply:visited,
  .job-ref-apply:hover,
  .job-ref-apply:active {
    color: var(--color-text-inverse);
  }

  .job-ref-apply svg {
    color: currentColor;
    flex-shrink: 0;
  }

  .job-ref-apply:hover {
    transform: translateY(-1px);
    box-shadow: 0 20px 38px -24px rgba(23, 201, 176, 0.8);
  }

  .job-ref-warning {
    width: min(100%, 360px);
    margin-bottom: 24px;
    padding: 14px 16px;
    border: 1px solid #fed7aa;
    border-radius: 12px;
    background: #fff7ed;
    color: #9a3412;
    line-height: 1.55;
  }

  .job-ref-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px 16px;
    width: 100%;
    margin-top: 4px;
  }

  .job-ref-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-width: 168px;
    min-height: 54px;
    padding: 0 22px;
    border: 1px solid rgba(23, 201, 176, 0.32);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.92);
    color: var(--color-primary-dark);
    font-size: 0.98rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color var(--transition-base), color var(--transition-base), background var(--transition-base), transform var(--transition-base);
  }

  .job-ref-action:hover {
    border-color: var(--color-primary);
    color: var(--color-primary-dark);
    background: rgba(23, 201, 176, 0.08);
    transform: translateY(-1px);
  }

  .job-ref-action svg {
    color: var(--color-primary);
  }

  .job-ref-main {
    min-width: 0;
  }

  .job-ref-section + .job-ref-section {
    margin-top: 36px;
  }

  .job-ref-section h2 {
    margin: 0 0 18px;
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-text-primary);
  }

  .job-ref-highlight {
    padding-left: 20px;
    border-left: 10px solid transparent;
    border-image: linear-gradient(180deg, var(--color-primary-dark), var(--color-accent), var(--color-primary-light)) 1;
  }

  .job-ref-highlight p,
  .job-ref-description {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 1.08rem;
    line-height: 1.85;
    white-space: pre-wrap;
  }

  .job-ref-footnote {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 34px;
    color: var(--color-text-tertiary);
    font-size: 0.95rem;
  }

  .job-ref-footnote a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-primary-dark);
    text-decoration: none;
    font-weight: 600;
  }

  .job-ref-dot {
    width: 4px;
    height: 4px;
    border-radius: 999px;
    background: var(--color-primary-light);
  }

  .job-ref-state {
    max-width: 720px;
    margin: 40px auto;
    padding: 28px;
    border: 1px solid var(--color-border);
    border-radius: 16px;
    text-align: center;
    color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.92);
    box-shadow: var(--shadow-sm);
  }

  .job-ref-state p {
    margin: 0 0 14px;
    color: #b91c1c;
  }

  @media (max-width: 1180px) {
    .job-ref-layout {
      grid-template-columns: 1fr;
      gap: 40px;
    }

    .job-ref-sidebar h1 {
      max-width: none;
    }
  }

  @media (max-width: 640px) {
    .job-ref-content {
      padding: 24px 16px 36px;
    }

    .job-ref-sidebar h1 {
      font-size: clamp(1.8rem, 10vw, 2.4rem);
    }

    .job-ref-highlight p,
    .job-ref-description {
      font-size: 1rem;
      line-height: 1.75;
    }

    .job-ref-actions {
      width: 100%;
      flex-direction: column;
    }

    .job-ref-action,
    .job-ref-apply {
      width: 100%;
    }
  }
`;
