import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookmarkPlus,
  Briefcase,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  FileText,
  LineChart,
  MapPin,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Job } from '../types';
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

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [databaseJobs, setDatabaseJobs] = useState<Job[]>([]);
  const [hasMoreDatabaseJobs, setHasMoreDatabaseJobs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const isAuthenticated = Boolean(user);
  const firstName = user?.name?.trim()?.split(/\s+/)[0] || '';
  const score = Math.max(0, Math.min(user?.interviewReadinessScore || 0, 100));
  const scoreState = !isAuthenticated
    ? 'Guest mode'
    : score >= 80
      ? 'Strong'
      : score >= 60
        ? 'Improving'
        : 'Needs attention';
  const heroTitle = isAuthenticated ? `Welcome back, ${firstName}` : 'Welcome to workIn';
  const heroSubtitle = isAuthenticated
    ? 'A focused workspace to track progress, discover jobs, and improve readiness.'
    : 'Explore jobs and tools. Sign in to personalize your dashboard.';
  const professionLabel = isAuthenticated ? (user?.profession || 'Professional') : 'Guest mode';
  const countryLabel = isAuthenticated ? (user?.country || 'Location not set') : 'Global';
  const ringStyle = { ['--score' as string]: `${score}%` } as CSSProperties;
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  const staggerStyle = (index: number, delay = 0): CSSProperties => ({
    ['--i' as string]: index,
    ['--delay' as string]: `${delay}ms`,
  });
  const getCountryCode = (countryText?: string) => {
    const country = (countryText || '').toLowerCase();
    return country.includes('uk') || country.includes('britain')
      ? 'gb'
      : country.includes('canada')
        ? 'ca'
        : country.includes('australia')
          ? 'au'
          : country.includes('india')
            ? 'in'
            : 'us';
  };

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
    const run = async () => {
      setLoading(true);
      try {
        const profession = (user?.profession || '').trim();
        if (!profession) {
          setRecommendedJobs([]);
          return;
        }

        const countryCode = getCountryCode(user?.country);
        const params = new URLSearchParams({
          country: countryCode,
          limit: '3',
          q: profession,
          role: profession,
        });
        if (user?.country && !user.country.toLowerCase().includes('remote')) {
          params.append('q', `${profession} ${user.country}`);
        }
        const response = await fetch(apiUrl(`/jobs/market?${params.toString()}`), { signal: controller.signal });
        const data = await parseApiJson<any>(response);
        const incomingJobs: Job[] = data.success ? (data.results || []) : [];
        if (incomingJobs.length > 0) {
          setRecommendedJobs(incomingJobs.slice(0, 3));
        } else {
          const fallbackParams = new URLSearchParams({
            country: countryCode,
            limit: '3',
            q: profession,
          });
          const fallbackResponse = await fetch(apiUrl(`/jobs/market?${fallbackParams.toString()}`), { signal: controller.signal });
          const fallbackData = await parseApiJson<any>(fallbackResponse);
          setRecommendedJobs(fallbackData.success ? (fallbackData.results || []).slice(0, 3) : []);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setRecommendedJobs([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [user?.country, user?.profession]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setDbLoading(true);
      setDbError('');
      try {
        const countryCode = getCountryCode(user?.country);
        const params = new URLSearchParams({
          country: countryCode,
          limit: '6',
        });

        const response = await fetch(apiUrl(`/jobs/market?${params.toString()}`), { signal: controller.signal });
        const data = await parseApiJson<any>(response);
        const incomingJobs: Job[] = data.success ? (data.results || []) : [];
        const totalCount = typeof data.count === 'number' ? data.count : incomingJobs.length;
        setHasMoreDatabaseJobs(totalCount > 5 || incomingJobs.length > 5);
        setDatabaseJobs(incomingJobs.slice(0, 5));
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          const message = error instanceof Error ? error.message : 'Unable to load jobs right now.';
          setDbError(message);
          setDatabaseJobs([]);
          setHasMoreDatabaseJobs(false);
        }
      } finally {
        if (!controller.signal.aborted) setDbLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [user?.country]);

  const formatSalary = (job: Job) => {
    if (!job.salary?.min || !job.salary?.max) return 'Salary not listed';
    return `$${(job.salary.min / 1000).toFixed(0)}k - $${(job.salary.max / 1000).toFixed(0)}k`;
  };

  const getTimeSince = (date: Date | string) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const stats = [
    {
      label: 'Jobs Applied',
      value: isAuthenticated ? '12' : '--',
      text: isAuthenticated ? '+3 this week' : 'Sign in to track',
      icon: Briefcase,
    },
    {
      label: 'Resume Score',
      value: isAuthenticated && score ? `${score}%` : 'N/A',
      text: isAuthenticated ? (score ? `${scoreState} readiness` : 'Upload resume') : 'Sign in to analyze',
      icon: FileText,
    },
    {
      label: 'Interview Ready',
      value: isAuthenticated ? (score ? scoreState : 'Low') : 'N/A',
      text: isAuthenticated ? (score >= 80 ? 'Market-ready' : 'Use roadmap') : 'Sign in for insights',
      icon: Sparkles,
    },
    { label: 'Career Growth', value: '+25%', text: 'Next 3 years', icon: LineChart },
  ];

  const roadmap = [
    { title: 'Improve resume keywords', action: 'Open Resume Optimizer', path: '/resume', done: score >= 80, icon: FileText },
    { title: 'Apply to 3 matched jobs', action: 'Browse jobs', path: '/jobs', done: false, icon: Briefcase },
    { title: 'Review market trends', action: 'Open Career Trends', path: '/trends', done: false, icon: TrendingUp },
  ];

  const hasProfession = Boolean((user?.profession || '').trim());
  const showRecommendedJobsSection = hasProfession && (loading || recommendedJobs.length > 0);

  return (
    <div className="ov">
      <section className="ov-hero ov-card ov-fade ov-delay-0">
        <div>
          <p className="ov-kicker">Overview</p>
          <h1 className={!isAuthenticated ? 'ov-guest-title' : ''}>{heroTitle}</h1>
          <p className="ov-sub">{heroSubtitle}</p>
          <div className="ov-actions">
            <button className="btn btn-primary" onClick={() => navigate('/jobs')}>Explore Jobs <ArrowRight size={16} /></button>
            <button className="btn btn-secondary" onClick={() => navigate('/resume')}>Improve Resume</button>
          </div>
          <div className="ov-meta">
            <span><Compass size={14} /> {professionLabel}</span>
            <span><MapPin size={14} /> {countryLabel}</span>
            <span><Clock size={14} /> {today}</span>
          </div>
        </div>
        <aside className="ov-score">
          <p>Interview Readiness</p>
          <div className="ov-ring" style={ringStyle}>
            <div><strong>{score || 'N/A'}</strong><small>{score ? '%' : 'score'}</small></div>
          </div>
          <b>{scoreState}</b>
        </aside>
      </section>

      <section className="ov-stats">
        {stats.map((s, index) => {
          const Icon = s.icon;
          return (
            <article key={s.label} className="ov-card ov-stat ov-fade ov-delay-1" style={staggerStyle(index)}>
              <span className="ov-icon"><Icon size={18} /></span>
              <div><p>{s.label}</p><h3>{s.value}</h3><small>{s.text}</small></div>
            </article>
          );
        })}
      </section>

      <section className="ov-grid">
        <div className="ov-main">
          {showRecommendedJobsSection && (
            <div className="ov-card ov-jobs ov-fade ov-delay-2">
              <div className="ov-head"><h2>Recommended Jobs</h2><button className="btn btn-ghost btn-sm" onClick={() => navigate('/market-jobs')}>View All <ArrowRight size={15} /></button></div>
              {loading ? (
                <div className="ov-skeleton-wrap">{[1, 2, 3].map((i) => <div key={i} className="ov-skeleton" />)}</div>
              ) : (
                <div className="ov-list">
                  {recommendedJobs.map((job, index) => (
                    <article
                      key={job.id}
                      className="ov-job ov-fade ov-delay-2"
                      style={staggerStyle(index + 1, 120)}
                      onClick={() => navigate('/market-jobs')}
                    >
                      <div className="ov-job-top">
                        <div className="ov-logo" onClick={(e) => { e.stopPropagation(); window.open(getCompanyUrl(job.company), '_blank'); }}><JobLogo company={job.company} /></div>
                        <div className="ov-job-text">
                          <h3>{job.title}</h3>
                          <button className="ov-company" onClick={(e) => { e.stopPropagation(); window.open(getCompanyUrl(job.company), '_blank'); }}>{job.company}</button>
                        </div>
                        <div className="ov-match"><b>{job.matchScore || '--'}%</b><small>Match</small></div>
                      </div>
                      <div className="ov-line"><span><MapPin size={14} /> {job.location}</span><span><DollarSign size={14} /> {formatSalary(job)}</span><span><Clock size={14} /> {getTimeSince(job.postedDate)}</span></div>
                      <div className="ov-tags">{(job.tags || []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
                      <div className="ov-job-actions">
                        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleApply(job); }} disabled={applyingId === job.id}>{applyingId === job.id ? 'Applying...' : 'Apply Now'}</button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/market-jobs');
                          }}
                        >
                          Details
                        </button>
                        <button className="btn btn-ghost btn-sm ov-save" onClick={(e) => e.stopPropagation()}><BookmarkPlus size={15} /></button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="ov-card ov-jobs ov-db-jobs ov-fade ov-delay-2">
            <div className="ov-head">
              <h2>All Live Jobs</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/market-jobs')}>
                Open Market Jobs <ArrowRight size={15} />
              </button>
            </div>

            {dbLoading ? (
              <div className="ov-skeleton-wrap">{[1, 2, 3].map((i) => <div key={`db-${i}`} className="ov-skeleton" />)}</div>
            ) : dbError ? (
              <div className="ov-empty"><Target size={20} /><p>{dbError}</p></div>
            ) : databaseJobs.length === 0 ? (
              <div className="ov-empty"><Target size={20} /><p>No jobs found yet.</p></div>
            ) : (
              <>
                <div className="ov-list">
                  {databaseJobs.map((job, index) => (
                    <article
                      key={job.id}
                      className="ov-job ov-fade ov-delay-2"
                      style={staggerStyle(index + 1, 140)}
                      onClick={() => navigate('/market-jobs')}
                    >
                      <div className="ov-job-top">
                        <div className="ov-logo" onClick={(e) => { e.stopPropagation(); window.open(getCompanyUrl(job.company), '_blank'); }}><JobLogo company={job.company} /></div>
                        <div className="ov-job-text">
                          <h3>{job.title}</h3>
                          <button className="ov-company" onClick={(e) => { e.stopPropagation(); window.open(getCompanyUrl(job.company), '_blank'); }}>{job.company}</button>
                        </div>
                      </div>
                      <div className="ov-line"><span><MapPin size={14} /> {job.location}</span><span><DollarSign size={14} /> {formatSalary(job)}</span><span><Clock size={14} /> {getTimeSince(job.postedDate)}</span></div>
                      <div className="ov-tags">{(job.skills || []).slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div>
                      <div className="ov-job-actions">
                        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleApply(job); }} disabled={applyingId === job.id}>{applyingId === job.id ? 'Applying...' : 'Apply Now'}</button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/market-jobs');
                          }}
                        >
                          View More
                        </button>
                        <button className="btn btn-ghost btn-sm ov-save" onClick={(e) => e.stopPropagation()}><BookmarkPlus size={15} /></button>
                      </div>
                    </article>
                  ))}
                </div>
                {hasMoreDatabaseJobs && (
                  <button className="btn btn-secondary btn-sm ov-more-btn" onClick={() => navigate('/market-jobs')}>
                    View More Jobs <ArrowRight size={15} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="ov-side">
          <div className="ov-card ov-side-card ov-fade ov-delay-3">
            <div className="ov-head"><h2>Quick Actions</h2></div>
            <button className="ov-action ov-fade ov-delay-3" style={staggerStyle(0, 120)} onClick={() => navigate('/resume')}><FileText size={16} /> Resume Optimizer <ArrowRight size={14} /></button>
            <button className="ov-action ov-fade ov-delay-3" style={staggerStyle(1, 120)} onClick={() => navigate('/ai-copilot')}><Award size={16} /> AI Copilot <ArrowRight size={14} /></button>
            <button className="ov-action ov-fade ov-delay-3" style={staggerStyle(2, 120)} onClick={() => navigate('/trends')}><TrendingUp size={16} /> Career Trends <ArrowRight size={14} /></button>
          </div>
          <div className="ov-card ov-side-card ov-fade ov-delay-4">
            <div className="ov-head"><h2>Weekly Roadmap</h2></div>
            {roadmap.map((item, index) => {
              const Icon = item.icon;
              return (
                <button key={item.title} className="ov-road ov-fade ov-delay-4" style={staggerStyle(index)} onClick={() => navigate(item.path)}>
                  <span>{item.done ? <CheckCircle2 size={14} /> : <Icon size={14} />}</span>
                  <div><b>{item.title}</b><small>{item.action}</small></div>
                </button>
              );
            })}
          </div>
        </aside>
      </section>

      <style>{`
        .ov {
          --ov-ease: cubic-bezier(0.22, 1, 0.36, 1);
          display: grid;
          gap: 16px;
          position: relative;
        }

        .ov:before,
        .ov:after {
          content: '';
          position: absolute;
          width: 240px;
          height: 240px;
          border-radius: 999px;
          filter: blur(72px);
          z-index: -1;
          opacity: 0.35;
          pointer-events: none;
          animation: ov-drift 9s ease-in-out infinite alternate;
        }

        .ov:before {
          background: #67e8f9;
          right: 8%;
          top: -80px;
        }

        .ov:after {
          background: #5eead4;
          left: 2%;
          bottom: 8%;
          animation-delay: -3s;
        }

        .ov-fade {
          opacity: 0;
          transform: translateY(14px) scale(0.985);
          animation: ov-rise 620ms var(--ov-ease) forwards;
          animation-delay: calc(var(--delay, 0ms) + var(--i, 0) * 78ms);
        }

        .ov-delay-0 { --delay: 20ms; }
        .ov-delay-1 { --delay: 60ms; }
        .ov-delay-2 { --delay: 90ms; }
        .ov-delay-3 { --delay: 130ms; }
        .ov-delay-4 { --delay: 170ms; }

        .ov-card {
          background: linear-gradient(180deg, #fff, #f8fbff);
          border: 1px solid #dbe5ef;
          border-radius: 18px;
          box-shadow: 0 18px 32px -26px rgba(15, 23, 42, 0.6);
          transition: transform 260ms var(--ov-ease), box-shadow 260ms var(--ov-ease), border-color 220ms ease;
        }

        .ov h1,
        .ov h2,
        .ov h3,
        .ov b,
        .ov strong {
          font-family: var(--font-family);
        }

        .ov-hero {
          padding: 26px;
          display: grid;
          grid-template-columns: 1fr 250px;
          gap: 18px;
          background:
            radial-gradient(circle at top right, rgba(45, 212, 191, 0.16), transparent 42%),
            linear-gradient(155deg, #fff, #f6faff);
          overflow: hidden;
          position: relative;
        }

        .ov-kicker {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 0.75rem;
          color: var(--color-primary-dark);
          font-weight: 700;
        }

        .ov h1 {
          margin: 8px 0 14px;
          font-size: clamp(2.35rem, 5vw, 4rem);
          line-height: 1.02;
          letter-spacing: -0.038em;
          font-weight: 800;
          color: var(--color-text-primary);
          text-wrap: balance;
        }

        .ov h1.ov-guest-title {
          font-size: clamp(1.9rem, 3.6vw, 2.9rem);
          line-height: 1.08;
        }

        .ov-sub {
          margin: 0;
          color: #475569;
          max-width: 60ch;
        }

        .ov-actions {
          margin-top: 16px;
          display: flex;
          gap: 10px;
        }

        .ov-actions .btn {
          transition: transform 200ms var(--ov-ease), box-shadow 200ms var(--ov-ease);
        }

        .ov-actions .btn:hover {
          transform: translateY(-2px);
        }

        .ov-meta {
          margin-top: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ov-meta span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #d4dde8;
          background: #f8fafc;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 600;
          transition: transform 200ms var(--ov-ease), border-color 200ms ease;
        }

        .ov-meta span:hover {
          transform: translateY(-1px);
          border-color: #99f6e4;
        }

        .ov-score {
          background: linear-gradient(155deg, #0f172a, #1e293b);
          border-radius: 14px;
          color: #dbe7f5;
          padding: 16px;
          text-align: center;
          display: grid;
          place-items: center;
          gap: 8px;
        }

        .ov-score p {
          margin: 0;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.7rem;
        }

        .ov-ring {
          --score: 0%;
          width: 118px;
          height: 118px;
          border-radius: 999px;
          background: conic-gradient(var(--color-primary) var(--score), rgba(148, 163, 184, 0.25) 0);
          display: grid;
          place-items: center;
          animation: ov-ring-in 700ms var(--ov-ease) both;
        }

        .ov-ring div {
          width: 90px;
          height: 90px;
          border-radius: 999px;
          background: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.26);
          display: grid;
          place-content: center;
          line-height: 1;
        }

        .ov-ring strong {
          color: #f8fafc;
          font-size: 1.4rem;
        }

        .ov-ring small {
          color: #94a3b8;
          font-size: 0.72rem;
          margin-top: 3px;
        }

        .ov-score b {
          font-size: 0.85rem;
          color: #cbd5e1;
        }

        .ov-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .ov-stat {
          padding: 14px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .ov-stat:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 34px -26px rgba(15, 23, 42, 0.72);
        }

        .ov-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, var(--color-primary), var(--color-secondary));
          color: #fff;
          flex-shrink: 0;
          transition: transform 260ms var(--ov-ease);
        }

        .ov-stat:hover .ov-icon {
          transform: rotate(-7deg) scale(1.06);
        }

        .ov-stat p {
          margin: 0;
          color: #64748b;
          font-size: 0.78rem;
        }

        .ov-stat h3 {
          margin: 2px 0;
          color: #0f172a;
          font-size: 1.2rem;
        }

        .ov-stat small {
          color: #94a3b8;
          font-size: 0.72rem;
        }

        .ov-grid {
          display: grid;
          grid-template-columns: 1fr 330px;
          gap: 16px;
        }

        .ov-main {
          display: grid;
          gap: 16px;
        }

        .ov-jobs {
          padding: 18px;
        }

        .ov-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 10px;
        }

        .ov-head h2 {
          margin: 0;
          font-size: 1.05rem;
        }

        .ov-list,
        .ov-skeleton-wrap {
          display: grid;
          gap: 10px;
        }

        .ov-skeleton {
          height: 140px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: linear-gradient(110deg, #e2e8f0, #f8fafc, #e2e8f0);
          background-size: 200% 100%;
          animation: shim 1.2s linear infinite;
        }

        .ov-empty {
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 18px;
          text-align: center;
          color: #475569;
          display: grid;
          gap: 6px;
          place-items: center;
        }

        .ov-empty p {
          margin: 0;
        }

        .ov-job {
          border: 1px solid #dfe7f0;
          border-radius: 14px;
          background: linear-gradient(150deg, #fff, #f9fbff);
          padding: 12px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 240ms var(--ov-ease), border-color 220ms ease, box-shadow 240ms var(--ov-ease);
        }

        .ov-job:before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--color-primary-light), var(--color-secondary));
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 280ms var(--ov-ease);
        }

        .ov-job:hover {
          border-color: var(--color-primary);
          transform: translateY(-3px);
          box-shadow: 0 18px 30px -22px rgba(15, 23, 42, 0.65);
        }

        .ov-job:hover:before {
          transform: scaleX(1);
        }

        .ov-job-top {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
        }

        .ov-logo {
          flex-shrink: 0;
          transition: transform 220ms var(--ov-ease);
        }

        .ov-job:hover .ov-logo {
          transform: translateY(-1px);
        }

        .ov-job-text {
          flex: 1;
          min-width: 0;
        }

        .ov-job-text h3 {
          margin: 0;
          font-size: 0.98rem;
          color: #0f172a;
          line-height: 1.22;
        }

        .ov-company {
          margin-top: 4px;
          background: transparent;
          border: none;
          padding: 0;
          color: #64748b;
          font-size: 0.83rem;
          cursor: pointer;
          transition: color 180ms ease;
        }

        .ov-company:hover {
          color: var(--color-primary-dark);
        }

        .ov-match {
          min-width: 62px;
          border-radius: 10px;
          background: linear-gradient(165deg, rgba(23, 201, 176, 0.2), rgba(56, 215, 194, 0.2));
          text-align: center;
          padding: 7px 6px;
          animation: ov-pulse 3s ease-in-out infinite;
        }

        .ov-match b {
          display: block;
          font-size: 0.96rem;
          color: var(--color-primary-dark);
          line-height: 1;
        }

        .ov-match small {
          font-size: 0.67rem;
          color: #475569;
          font-weight: 600;
        }

        .ov-line {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 12px;
          color: #475569;
          font-size: 0.8rem;
          margin-bottom: 10px;
        }

        .ov-line span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .ov-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }

        .ov-tags span {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--color-primary-dark);
          border: 1px solid rgba(23, 201, 176, 0.25);
          background: rgba(23, 201, 176, 0.13);
        }

        .ov-job-actions {
          display: flex;
          gap: 8px;
        }

        .ov-job-actions .btn {
          flex: 1;
        }

        .ov-save {
          flex: 0 0 40px;
          padding: 0;
        }

        .ov-more-btn {
          width: 100%;
          margin-top: 8px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
        }

        .ov-side {
          display: grid;
          gap: 12px;
        }

        .ov-side-card {
          padding: 14px;
        }

        .ov-action,
        .ov-road {
          width: 100%;
          border: 1px solid #dfe7f0;
          border-radius: 11px;
          background: #fff;
          padding: 10px;
          display: grid;
          grid-template-columns: 18px 1fr 14px;
          gap: 8px;
          align-items: center;
          cursor: pointer;
          text-align: left;
          color: #0f172a;
          transition: transform 220ms var(--ov-ease), border-color 200ms ease, box-shadow 220ms var(--ov-ease);
          margin-top: 8px;
        }

        .ov-action svg:last-child {
          transition: transform 200ms var(--ov-ease);
        }

        .ov-action:hover,
        .ov-road:hover {
          border-color: var(--color-primary);
          transform: translateY(-2px);
          box-shadow: 0 14px 24px -22px rgba(15, 23, 42, 0.7);
        }

        .ov-action:hover svg:last-child {
          transform: translateX(2px);
        }

        .ov-road {
          grid-template-columns: 24px 1fr;
        }

        .ov-road span {
          width: 24px;
          height: 24px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: #ecfeff;
          color: #0e7490;
          transition: transform 220ms var(--ov-ease);
        }

        .ov-road:hover span {
          transform: scale(1.06);
        }

        .ov-road b {
          display: block;
          font-size: 0.8rem;
        }

        .ov-road small {
          color: #64748b;
          font-size: 0.72rem;
        }

        @keyframes ov-rise {
          from { opacity: 0; transform: translateY(14px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes ov-ring-in {
          from { transform: scale(0.84) rotate(-24deg); opacity: 0.4; }
          to { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes ov-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0); }
          50% { box-shadow: 0 0 0 7px rgba(20, 184, 166, 0.08); }
        }

        @keyframes ov-drift {
          0% { transform: translateY(0) translateX(0); }
          100% { transform: translateY(-14px) translateX(10px); }
        }

        @keyframes shim {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

        @media (max-width: 1100px) {
          .ov-grid { grid-template-columns: 1fr; }
          .ov-side { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 900px) {
          .ov-hero { grid-template-columns: 1fr; }
          .ov-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ov-side { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .ov-hero,
          .ov-jobs,
          .ov-side-card {
            padding: 12px;
            border-radius: 14px;
          }

          .ov-actions { flex-direction: column; }
          .ov-stats { grid-template-columns: 1fr; }
          .ov-job-actions { flex-direction: column; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ov *,
          .ov:before,
          .ov:after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};
