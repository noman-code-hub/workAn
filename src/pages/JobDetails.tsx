import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Clock,
  Briefcase,
  Building2,
  ExternalLink,
  Bookmark,
  BookmarkPlus,
} from 'lucide-react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Job } from '../types';
import { JobLogo } from '../components/JobLogo';
import { getApplyLink } from '../utils/jobUtils';
import { applySeoMeta } from '../utils/seo';

const getCompanyUrl = (company: string) => {
  const clean = company.toLowerCase()
    .replace(/[,.]/g, '')
    .replace(/\s+(inc|llc|ltd|corp|limited|company|co|plc)$/i, '')
    .trim()
    .replace(/\s+/g, '');
  return `https://www.${clean}.com`;
};

export const JobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const navState = (location.state as { returnTo?: string; returnLabel?: string } | null) || null;
  const backTarget = navState?.returnTo || '/jobs';
  const backLabel = navState?.returnLabel || 'Back to Jobs';

  const handleBack = () => {
    navigate(backTarget);
  };

  useEffect(() => {
    if (!id) return;

    // Try to get job from localStorage first (from recent searches)
    const cachedJobs = localStorage.getItem('recentJobs');
    if (cachedJobs) {
      const jobs: Job[] = JSON.parse(cachedJobs);
      const foundJob = jobs.find((j) => j.id === id);
      if (foundJob) {
        setJob(foundJob);
        setLoading(false);
        return;
      }
    }

    // If not in cache, fetch from API or Firestore
    fetchJobDetails();
  }, [id]);

  useEffect(() => {
    if (!job) return;
    const description = job.description
      ? job.description.replace(/\s+/g, ' ').slice(0, 160)
      : 'View job details, requirements, and apply in minutes.';
    applySeoMeta(
      `${job.title} at ${job.company} | Workshour`,
      description,
      `/jobs/${job.id}`,
      {
        keywords: `${job.title}, ${job.company}, job details, workshour`,
      }
    );
  }, [job]);

  const fetchJobDetails = async () => {
    if (!id) return;
    try {
      // Check Firestore for internal jobs
      const jobDoc = await getDoc(doc(db, 'jobs', id));
      if (jobDoc.exists()) {
        const data = jobDoc.data();
        setJob({
          id: jobDoc.id,
          title: data.title,
          company: data.company,
          description: data.description,
          location: data.location,
          salary: typeof data.salary === 'string'
            ? { min: parseInt(data.salary) || 0, max: parseInt(data.salary) || 0, currency: 'PKR' }
            : data.salary,
          type: data.type || 'full-time',
          requirements: data.requirements || [],
          skills: data.skills || [],
          tags: data.tags || [],
          postedDate: data.createdAt?.toDate() || new Date(),
          postedBy: data.postedBy
        } as Job);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching job details:', error);
      setLoading(false);
    }
  };

  const [hasApplied, setHasApplied] = useState(false);

  const handleApply = async (job: Job) => {
    if (!user) {
      alert("Please sign in to apply for this job.");
      navigate('/login');
      return;
    }

    setApplyingId(job.id);
    try {
      // Check if it's an internal job (has postedBy)
      if (job.postedBy) {
        const applicantRef = doc(db, 'jobs', job.id, 'applicants', user.id);
        const applicantDoc = await getDoc(applicantRef);

        if (applicantDoc.exists()) {
          alert("You have already applied for this job.");
          setHasApplied(true);
        } else {
          await setDoc(applicantRef, {
            userId: user.id,
            name: user.name,
            email: user.email,
            resumeUrl: user.resumeURL || '',
            appliedAt: serverTimestamp(),
            status: 'pending'
          });

          // Increment applicant count
          await updateDoc(doc(db, 'jobs', job.id), {
            applicantsCount: increment(1)
          });

          alert("Application submitted successfully!");
          setHasApplied(true);
        }
      } else {
        // External job
        const url = await getApplyLink(job);
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error("Error applying for job:", error);
      window.open(job.applyUrl || '#', '_blank');
    } finally {
      setApplyingId(null);
    }
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

  if (loading) {
    return (
      <div className="job-details-page">
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="job-details-page">
        <div className="empty-state">
          <Briefcase size={64} />
          <h3>Job not found</h3>
          <p>The job you're looking for doesn't exist or has been removed.</p>
          <button className="btn btn-primary" onClick={handleBack}>
            {backLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="job-details-page">
      {/* Back Button */}
      <button className="back-button" onClick={handleBack}>
        <ArrowLeft size={20} />
        {backLabel}
      </button>

      {/* Job Header */}
      <div className="job-details-header">
        <div className="job-header-content">
          <a href={getCompanyUrl(job.company)} target="_blank" rel="noopener noreferrer">
            <JobLogo company={job.company} />
          </a>
          <div className="job-header-info">
            <h1>{job.title}</h1>
            <a
              href={getCompanyUrl(job.company)}
              target="_blank"
              rel="noopener noreferrer"
              className="company-link"
            >
              <Building2 size={18} />
              {job.company}
            </a>
          </div>
        </div>
        <button
          className={`bookmark-btn-large ${isBookmarked ? 'active' : ''}`}
          onClick={() => setIsBookmarked(!isBookmarked)}
        >
          {isBookmarked ? (
            <Bookmark size={24} fill="currentColor" />
          ) : (
            <BookmarkPlus size={24} />
          )}
        </button>
      </div>

      {/* Match Score */}
      {job.matchScore && (
        <div className="match-indicator-large">
          <div className="match-bar" style={{ width: `${job.matchScore}%` }} />
          <span className="match-text">{job.matchScore}% Match</span>
        </div>
      )}

      {/* Job Meta Info */}
      <div className="job-meta-grid">
        <div className="meta-item">
          <MapPin size={20} />
          <div>
            <span className="meta-label">Location</span>
            <span className="meta-value">{job.location}</span>
          </div>
        </div>
        <div className="meta-item">
          <DollarSign size={20} />
          <div>
            <span className="meta-label">Salary</span>
            <span className="meta-value">{formatSalary(job)}</span>
          </div>
        </div>
        <div className="meta-item">
          <Clock size={20} />
          <div>
            <span className="meta-label">Posted</span>
            <span className="meta-value">{getTimeSince(job.postedDate)}</span>
          </div>
        </div>
        <div className="meta-item">
          <Briefcase size={20} />
          <div>
            <span className="meta-label">Job Type</span>
            <span className="meta-value text-capitalize">{job.type.replace('-', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="job-actions">
        <button
          onClick={() => handleApply(job)}
          className={`btn btn-primary btn-large ${hasApplied ? 'btn-success' : ''}`}
          disabled={applyingId === job.id || hasApplied}
        >
          {applyingId === job.id ? 'Processing...' : hasApplied ? 'Applied ✓' : 'Apply Now'}
        </button>
        {job.applyUrl && (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-large"
          >
            <ExternalLink size={20} />
            Open External Link
          </a>
        )}
      </div>

      {/* Job Description */}
      <div className="job-section">
        <h2>Job Description</h2>
        <p className="job-description-full">{job.description}</p>
      </div>

      {/* Requirements */}
      {job.requirements && job.requirements.length > 0 && (
        <div className="job-section">
          <h2>Requirements</h2>
          <ul className="requirements-list">
            {job.requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div className="job-section">
          <h2>Required Skills</h2>
          <div className="skills-grid">
            {job.skills.map((skill) => (
              <span key={skill} className="badge badge-primary">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {job.tags && job.tags.length > 0 && (
        <div className="job-section">
          <h2>Tags</h2>
          <div className="skills-grid">
            {job.tags.map((tag) => (
              <span key={tag} className="badge">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .job-details-page {
          max-width: 900px;
          margin: 0 auto;
          padding-bottom: var(--spacing-2xl);
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          background: none;
          border: none;
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          cursor: pointer;
          padding: var(--spacing-sm) 0;
          margin-bottom: var(--spacing-lg);
          transition: color var(--transition-fast);
        }

        .back-button:hover {
          color: var(--color-primary);
        }

        .job-details-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
        }

        .job-header-content {
          display: flex;
          gap: var(--spacing-lg);
          flex: 1;
        }

        .job-header-info {
          flex: 1;
        }

        .job-header-info h1 {
          font-size: var(--font-size-2xl);
          margin-bottom: var(--spacing-sm);
        }

        .company-link {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          color: var(--color-text-secondary);
          text-decoration: none;
          font-size: var(--font-size-lg);
          transition: color var(--transition-fast);
        }

        .company-link:hover {
          color: var(--color-primary);
        }

        .bookmark-btn-large {
          background: none;
          border: 1px solid var(--color-border);
          width: 50px;
          height: 50px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-base);
          flex-shrink: 0;
        }

        .bookmark-btn-large:hover {
          background: var(--color-bg-tertiary);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .bookmark-btn-large.active {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .match-indicator-large {
          position: relative;
          height: 8px;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-full);
          margin-bottom: var(--spacing-xl);
          overflow: hidden;
        }

        .match-bar {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: linear-gradient(90deg, var(--color-success), #34d399);
          border-radius: var(--radius-full);
          transition: width var(--transition-slow);
        }

        .match-text {
          position: absolute;
          right: 0;
          top: -28px;
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--color-success);
        }

        .job-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-lg);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          margin-bottom: var(--spacing-xl);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .meta-item svg {
          color: var(--color-primary);
          flex-shrink: 0;
        }

        .meta-item > div {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .meta-label {
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .meta-value {
          font-size: var(--font-size-md);
          font-weight: 500;
          color: var(--color-text-primary);
        }

        .text-capitalize {
          text-transform: capitalize;
        }

        .job-actions {
          display: flex;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-2xl);
        }

        .btn-large {
          padding: var(--spacing-md) var(--spacing-xl);
          font-size: var(--font-size-md);
          flex: 1;
        }

        .job-section {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          margin-bottom: var(--spacing-lg);
        }

        .job-section h2 {
          font-size: var(--font-size-xl);
          margin-bottom: var(--spacing-md);
        }

        .job-description-full {
          color: var(--color-text-secondary);
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .requirements-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .requirements-list li {
          padding: var(--spacing-sm) 0;
          padding-left: var(--spacing-lg);
          position: relative;
          color: var(--color-text-secondary);
          line-height: 1.6;
        }

        .requirements-list li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--color-success);
          font-weight: 600;
        }

        .skills-grid {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
        }

        .empty-state {
          text-align: center;
          padding: var(--spacing-2xl);
          background: var(--color-surface);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-lg);
          margin-top: var(--spacing-2xl);
        }

        .empty-state svg {
          color: var(--color-text-tertiary);
          margin-bottom: var(--spacing-lg);
        }

        .empty-state h3 {
          font-size: var(--font-size-xl);
          margin-bottom: var(--spacing-sm);
        }

        .empty-state p {
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-lg);
        }

        @media (max-width: 768px) {
          .job-details-header {
            flex-direction: column;
          }

          .job-header-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .job-meta-grid {
            grid-template-columns: 1fr;
          }

          .job-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};
