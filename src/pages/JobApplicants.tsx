import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    ChevronLeft,
    Mail,
    FileText,
    ExternalLink,
    CheckCircle,
    XCircle,
    Clock,
    User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Applicant {
    id: string;
    userId: string;
    name: string;
    email: string;
    resumeUrl: string;
    appliedAt: string;
    status: 'pending' | 'shortlisted' | 'rejected';
}

interface Job {
    id: string;
    title: string;
    company: string;
}

export const JobApplicants = () => {
    const { id: jobId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!jobId || !user) return;

        // Fetch Job Details
        const fetchJob = async () => {
            if (!isSupabaseConfigured || !supabase) return;
            const { data, error } = await supabase.from('jobs').select('id, title, company').eq('id', jobId).maybeSingle();
            if (error) {
                console.error('Error loading job:', error);
                return;
            }
            if (data) {
                setJob({ id: data.id, title: data.title, company: data.company } as Job);
            }
        };
        fetchJob();

        // Fetch Applicants
        let isMounted = true;
        let unsubscribe = () => {};

        const initApplicants = async () => {
            if (!isSupabaseConfigured || !supabase) {
                setLoading(false);
                return;
            }

            const fetchApplicants = async () => {
                const { data, error } = await supabase
                    .from('job_applicants')
                    .select('*')
                    .eq('job_id', jobId)
                    .order('applied_at', { ascending: false });

                if (error) throw error;

                const mapped = (data || []).map((row: any) => ({
                    id: `${row.job_id}:${row.user_id}`,
                    userId: row.user_id,
                    name: row.name,
                    email: row.email,
                    resumeUrl: row.resume_url || '',
                    appliedAt: row.applied_at,
                    status: row.status || 'pending',
                })) as Applicant[];

                if (isMounted) {
                    setApplicants(mapped);
                    setLoading(false);
                }
            };

            await fetchApplicants();

            const channel = supabase
                .channel(`job-applicants-${jobId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'job_applicants', filter: `job_id=eq.${jobId}` },
                    fetchApplicants
                )
                .subscribe();

            unsubscribe = () => {
                void supabase.removeChannel(channel);
            };
        };

        initApplicants().catch((error) => {
            console.error('Error loading applicants:', error);
            if (isMounted) setLoading(false);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [jobId, user]);

    const handleUpdateStatus = async (applicantUserId: string, status: Applicant['status']) => {
        if (!jobId) return;
        try {
            if (!isSupabaseConfigured || !supabase) {
                throw new Error('Supabase is not configured.');
            }
            const { error } = await supabase
                .from('job_applicants')
                .update({ status })
                .eq('job_id', jobId)
                .eq('user_id', applicantUserId);
            if (error) throw error;
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update applicant status.");
        }
    };

    if (loading) {
        return (
            <div className="bg-[#F0F0E8] min-h-screen flex items-center justify-center font-mono uppercase">
                Loading Application Data...
            </div>
        );
    }

    return (
        <div className="bg-[#F0F0E8] min-h-screen py-10 px-4 font-sans">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/recruiter')}
                    className="group flex items-center gap-2 font-mono text-xs uppercase font-bold mb-8 hover:translate-x-[-2px] transition-transform"
                >
                    <ChevronLeft size={16} className="border border-black" />
                    Back to Dashboard
                </button>

                {/* Header */}
                <header className="mb-12 border-b-4 border-black pb-6">
                    <div className="font-mono text-xs uppercase font-bold text-blue-700 mb-2">Applicants For</div>
                    <h1 className="font-serif text-4xl font-bold uppercase tracking-tighter text-black mb-1">
                        {job?.title}
                    </h1>
                    <p className="font-mono text-sm uppercase text-gray-600 tracking-widest">
                        {job?.company} — Total {applicants.length}
                    </p>
                </header>

                {applicants.length === 0 ? (
                    <div className="bg-white border-2 border-black p-16 text-center shadow-[4px_4px_0px_0px_#000000]">
                        <User size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="font-serif text-xl font-bold mb-2">No Applicants Yet</h3>
                        <p className="font-mono text-sm uppercase text-gray-500">Your job listing is live. New candidates will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {applicants.map((applicant) => (
                            <div key={applicant.id} className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex gap-4 items-center">
                                            <div className="w-12 h-12 border-2 border-black bg-black text-white flex items-center justify-center font-serif text-xl font-bold">
                                                {applicant.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-xl font-bold border-b border-black inline-block">
                                                    {applicant.name}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className="font-mono text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock size={12} />
                                                        Applied {applicant.appliedAt
                                                            ? formatDistanceToNow(new Date(applicant.appliedAt), { addSuffix: true })
                                                            : 'Just now'}
                                                    </span>
                                                    <span className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 border border-black ${applicant.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                                                            applicant.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {applicant.status || 'Pending'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                                            <a
                                                href={`mailto:${applicant.email}`}
                                                className="bg-white border-2 border-black p-2 font-mono text-[10px] uppercase font-bold shadow-[2px_2px_0px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-2"
                                            >
                                                <Mail size={14} /> Email
                                            </a>
                                            <a
                                                href={applicant.resumeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-white border-2 border-black p-2 font-mono text-[10px] uppercase font-bold shadow-[2px_2px_0px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-2"
                                            >
                                                <FileText size={14} /> Resume <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex gap-4 border-t border-black pt-6">
                                        <button
                                            onClick={() => handleUpdateStatus(applicant.userId, 'shortlisted')}
                                            className={`flex-1 border-2 border-black p-3 font-mono text-xs uppercase font-bold transition-all flex items-center justify-center gap-2 ${applicant.status === 'shortlisted'
                                                    ? 'bg-green-700 text-white shadow-none'
                                                    : 'bg-white text-black shadow-[2px_2px_0px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]'
                                                }`}
                                        >
                                            <CheckCircle size={16} /> Shortlist
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(applicant.userId, 'rejected')}
                                            className={`flex-1 border-2 border-black p-3 font-mono text-xs uppercase font-bold transition-all flex items-center justify-center gap-2 ${applicant.status === 'rejected'
                                                    ? 'bg-red-700 text-white shadow-none'
                                                    : 'bg-white text-black shadow-[2px_2px_0px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]'
                                                }`}
                                        >
                                            <XCircle size={16} /> Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
