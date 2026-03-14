import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Briefcase,
    Users,
    TrendingUp,
    Plus,
    Trash2,
    MapPin,
    DollarSign,
    ExternalLink,
    ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecruiterJob {
    id: string;
    title: string;
    company: string;
    description: string;
    location: string;
    salary: string;
    postedBy: string;
    applicantsCount: number;
    createdAt: string;
}

export const RecruiterDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<RecruiterJob[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [form, setForm] = useState({
        title: '',
        company: '',
        description: '',
        location: '',
        salary: ''
    });

    const [editingJobId, setEditingJobId] = useState<string | null>(null);

    // Fetch jobs posted by this recruiter (or all if admin)
    useEffect(() => {
        if (!user) return;

        let isMounted = true;
        let unsubscribe = () => {};

        const initJobs = async () => {
            if (!isSupabaseConfigured || !supabase) {
                throw new Error('Supabase is not configured.');
            }
            const sb = supabase;

            const fetchJobs = async () => {
                const query = sb
                    .from('jobs')
                    .select('*')
                    .order('created_at', { ascending: false });

                const { data, error } = user.role === 'admin'
                    ? await query
                    : await query.eq('posted_by', user.id);

                if (error) throw error;

                const mapped = (data || []).map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    company: row.company,
                    description: row.description || '',
                    location: row.location || '',
                    salary: row.salary_text || '',
                    postedBy: row.posted_by,
                    applicantsCount: row.applicants_count || 0,
                    createdAt: row.created_at,
                })) as RecruiterJob[];

                if (isMounted) setJobs(mapped);
            };

            await fetchJobs();

            const channel = sb
                .channel('recruiter-jobs')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchJobs)
                .subscribe();

            unsubscribe = () => {
                void sb.removeChannel(channel);
            };
        };

        initJobs().catch((error) => {
            console.error('Error loading recruiter jobs:', error);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [user]);

    const handleEdit = (job: RecruiterJob) => {
        setEditingJobId(job.id);
        setForm({
            title: job.title,
            company: job.company,
            description: job.description,
            location: job.location,
            salary: job.salary
        });
    };

    const handlePostJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !form.title.trim() || !form.company.trim()) return;

        setIsPosting(true);
        try {
            if (!isSupabaseConfigured || !supabase) {
                throw new Error('Supabase is not configured.');
            }

            if (editingJobId) {
                const { error } = await supabase.from('jobs').update({
                    title: form.title,
                    company: form.company,
                    description: form.description,
                    location: form.location,
                    salary_text: form.salary,
                }).eq('id', editingJobId);

                if (error) throw error;
                setEditingJobId(null);
            } else {
                const { error } = await supabase.from('jobs').insert({
                    title: form.title,
                    company: form.company,
                    description: form.description,
                    location: form.location,
                    salary_text: form.salary,
                    posted_by: user.id,
                    applicants_count: 0,
                });

                if (error) throw error;
            }

            setForm({
                title: '',
                company: '',
                description: '',
                location: '',
                salary: ''
            });
        } catch (error) {
            console.error("Error saving job:", error);
            alert("Failed to save job. Please try again.");
        } finally {
            setIsPosting(false);
        }
    };

    const handleDeleteJob = async (jobId: string) => {
        if (!window.confirm("Are you sure you want to delete this job listing? All applicant data for this job will remain in the system but the listing will be gone.")) return;

        try {
            if (!isSupabaseConfigured || !supabase) {
                throw new Error('Supabase is not configured.');
            }
            const { error } = await supabase.from('jobs').delete().eq('id', jobId);
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job.');
        }
    };

    const totalApplicants = jobs.reduce((sum, job) => sum + (job.applicantsCount || 0), 0);

    return (
        <div className="recruiter-dashboard">
            <div className="container recruiter-container">
                <header className="recruiter-header">
                    <div>
                        <p className="recruiter-eyebrow">Recruiter Workspace</p>
                        <h1>Recruiter Dashboard</h1>
                        <p>Track listings, manage applicants, and publish new roles with confidence.</p>
                    </div>
                    {user && (
                        <div className="header-chip">
                            Signed in as {user.name || user.email}
                        </div>
                    )}
                </header>

                <div className="stats-grid">
                    <div className="stat-card stat-primary">
                        <div className="stat-icon">
                            <Briefcase size={22} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Active Listings</p>
                            <h3 className="stat-value">{jobs.length}</h3>
                            <p className="stat-change">Open roles</p>
                        </div>
                    </div>
                    <div className="stat-card stat-success">
                        <div className="stat-icon">
                            <Users size={22} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Total Applicants</p>
                            <h3 className="stat-value">{totalApplicants}</h3>
                            <p className="stat-change">Across all jobs</p>
                        </div>
                    </div>
                    <div className="stat-card stat-warning">
                        <div className="stat-icon">
                            <TrendingUp size={22} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Response Rate</p>
                            <h3 className="stat-value">84%</h3>
                            <p className="stat-change">Target rate</p>
                        </div>
                    </div>
                </div>

                <div className="content-grid">
                    <section className="section form-section">
                        <div className="section-header">
                            <div>
                                <h2>{editingJobId ? 'Edit Job Listing' : 'Post New Job'}</h2>
                                <p>Share the role details and start receiving candidates instantly.</p>
                            </div>
                        </div>
                        <form onSubmit={handlePostJob} className="form-stack">
                            <div className="form-field">
                                <label className="field-label">Job Title</label>
                                <input
                                    required
                                    className="input"
                                    placeholder="e.g. Senior Frontend Engineer"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>
                            <div className="form-field">
                                <label className="field-label">Company</label>
                                <input
                                    required
                                    className="input"
                                    placeholder="e.g. Quantum Labs"
                                    value={form.company}
                                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                                />
                            </div>
                            <div className="form-grid">
                                <div className="form-field">
                                    <label className="field-label">Location</label>
                                    <input
                                        className="input"
                                        placeholder="e.g. Remote"
                                        value={form.location}
                                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="field-label">Salary</label>
                                    <input
                                        className="input"
                                        placeholder="e.g. 150k PKR/mo"
                                        value={form.salary}
                                        onChange={(e) => setForm({ ...form, salary: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-field">
                                <label className="field-label">Description</label>
                                <textarea
                                    className="input recruiter-textarea"
                                    placeholder="Describe the role and requirements..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                            <div className="form-actions">
                                <button
                                    type="submit"
                                    disabled={isPosting}
                                    className="btn btn-primary btn-block"
                                >
                                    {editingJobId ? <TrendingUp size={18} /> : <Plus size={18} />}
                                    {isPosting ? 'Saving...' : editingJobId ? 'Update Listing' : 'Publish Job'}
                                </button>
                                {editingJobId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingJobId(null);
                                            setForm({ title: '', company: '', description: '', location: '', salary: '' });
                                        }}
                                        className="btn btn-secondary btn-block"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>

                    <section className="section listings-section">
                        <div className="section-header">
                            <div>
                                <h2>Your Job Listings</h2>
                                <p>Manage active roles and keep applicants moving forward.</p>
                            </div>
                        </div>

                        {jobs.length === 0 ? (
                            <div className="empty-state">
                                <Briefcase size={40} />
                                <p>No jobs posted yet.</p>
                            </div>
                        ) : (
                            <div className="listings-grid">
                                {jobs.map((job) => (
                                    <div key={job.id} className="listing-card">
                                        <div className="listing-header">
                                            <div>
                                                <h3>{job.title}</h3>
                                                <div className="listing-meta">
                                                    <span className="badge badge-primary">{job.company}</span>
                                                    <span className="listing-time">
                                                        Posted {job.createdAt
                                                            ? formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })
                                                            : 'Just now'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteJob(job.id)}
                                                className="icon-btn danger"
                                                title="Delete listing"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <p className="listing-description">{job.description}</p>

                                        <div className="listing-details">
                                            <div className="detail-item">
                                                <MapPin size={14} />
                                                {job.location || 'N/A'}
                                            </div>
                                            <div className="detail-item">
                                                <DollarSign size={14} />
                                                {job.salary || 'N/A'}
                                            </div>
                                            <div className="detail-item">
                                                <Users size={14} />
                                                {job.applicantsCount || 0} Applicants
                                            </div>
                                            <div className="detail-item">
                                                <TrendingUp size={14} />
                                                Active
                                            </div>
                                        </div>

                                        <div className="listing-actions">
                                            <button
                                                onClick={() => navigate(`/recruiter/job/${job.id}/applicants`)}
                                                className="btn btn-primary"
                                            >
                                                View Applicants
                                                <ChevronRight size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(job)}
                                                className="btn btn-secondary"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-ghost icon-btn"
                                                title="Open Public Link"
                                                onClick={() => navigate(`/jobs/${job.id}`, { state: { returnTo: '/recruiter', returnLabel: 'Back to Recruiter' } })}
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
            <style>{`
                .recruiter-dashboard {
                    min-height: 100vh;
                    padding: var(--spacing-xl) 0;
                    background:
                        radial-gradient(1200px 600px at 15% -20%, rgba(0, 212, 170, 0.08), transparent 70%),
                        radial-gradient(900px 500px at 90% 0%, rgba(99, 102, 241, 0.08), transparent 70%),
                        var(--color-bg-primary);
                }

                .recruiter-container {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-xl);
                    min-height: 100vh;
                }

                .recruiter-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: var(--spacing-lg);
                }

                .recruiter-eyebrow {
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    font-size: 11px;
                    color: var(--color-text-tertiary);
                    margin-bottom: var(--spacing-xs);
                }

                .recruiter-header h1 {
                    font-size: clamp(1.8rem, 2vw + 1.2rem, 2.6rem);
                    margin: 0 0 var(--spacing-xs) 0;
                }

                .recruiter-header p {
                    font-size: var(--font-size-lg);
                    color: var(--color-text-secondary);
                    margin: 0;
                    max-width: 640px;
                }

                .header-chip {
                    padding: 8px 14px;
                    border-radius: var(--radius-full);
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    font-size: var(--font-size-xs);
                    color: var(--color-text-secondary);
                    box-shadow: var(--shadow-xs);
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: var(--spacing-lg);
                }

                .stat-card {
                    background: var(--color-surface);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-lg);
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    border: 1px solid var(--color-border);
                    box-shadow: var(--shadow-sm);
                    transition: transform var(--transition-base), box-shadow var(--transition-base);
                }

                .stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
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

                .stat-content {
                    flex: 1;
                }

                .stat-label {
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                    margin: 0 0 2px 0;
                }

                .stat-value {
                    font-size: var(--font-size-2xl);
                    font-weight: 700;
                    margin: 0 0 2px 0;
                }

                .stat-change {
                    font-size: var(--font-size-xs);
                    color: var(--color-text-tertiary);
                    margin: 0;
                }

                .content-grid {
                    display: grid;
                    grid-template-columns: minmax(280px, 360px) 1fr;
                    gap: var(--spacing-xl);
                }

                .section {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-lg);
                    box-shadow: var(--shadow-sm);
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-lg);
                }

                .section-header h2 {
                    font-size: var(--font-size-xl);
                    margin: 0 0 var(--spacing-xs) 0;
                }

                .section-header p {
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                    margin: 0;
                }

                .form-stack {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                }

                .form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .field-label {
                    font-size: var(--font-size-xs);
                    font-weight: 600;
                    color: var(--color-text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: var(--spacing-md);
                }

                .recruiter-textarea {
                    min-height: 140px;
                    resize: vertical;
                }

                .form-actions {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-sm);
                }

                .btn-block {
                    width: 100%;
                }

                .listings-grid {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-lg);
                }

                .listing-card {
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-lg);
                    background: var(--color-bg-secondary);
                    transition: box-shadow var(--transition-base), transform var(--transition-base);
                }

                .listing-card:hover {
                    box-shadow: var(--shadow-sm);
                    transform: translateY(-2px);
                }

                .listing-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-sm);
                }

                .listing-header h3 {
                    font-size: var(--font-size-lg);
                    margin: 0 0 6px 0;
                }

                .listing-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    align-items: center;
                }

                .listing-time {
                    font-size: var(--font-size-xs);
                    color: var(--color-text-tertiary);
                }

                .listing-description {
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                    margin: var(--spacing-sm) 0 var(--spacing-md) 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .listing-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                    gap: 12px;
                    margin-bottom: var(--spacing-md);
                    font-size: var(--font-size-xs);
                    color: var(--color-text-secondary);
                }

                .detail-item {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .listing-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: var(--spacing-sm);
                }

                .listing-actions .btn {
                    flex: 1;
                }

                .icon-btn {
                    padding: 8px;
                    border-radius: var(--radius-md);
                }

                .listing-actions .icon-btn {
                    flex: 0 0 auto;
                }

                .icon-btn.danger {
                    background: transparent;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: var(--color-danger);
                }

                .icon-btn.danger:hover {
                    background: rgba(239, 68, 68, 0.08);
                }

                .empty-state {
                    border: 1px dashed var(--color-border);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-xl);
                    text-align: center;
                    color: var(--color-text-secondary);
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                    align-items: center;
                }

                .empty-state svg {
                    color: var(--color-text-tertiary);
                }

                @media (max-width: 1024px) {
                    .content-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .recruiter-dashboard {
                        padding: var(--spacing-lg) 0;
                    }

                    .recruiter-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .header-chip {
                        width: 100%;
                        text-align: left;
                    }

                    .form-grid {
                        grid-template-columns: 1fr;
                    }

                    .listing-actions .btn {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};
