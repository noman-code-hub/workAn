import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { User } from '../types';
import { Users, Briefcase, FileText, MessageCircle } from 'lucide-react';
import { subscribeToPosts } from '../services/postService';

interface AdminAnalyticsProps {
    users: User[];
}

export const AdminAnalytics = ({ users }: AdminAnalyticsProps) => {
    const [jobCount, setJobCount] = useState(0);
    const [postCount, setPostCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let unsubscribeJobs = () => {};
        let unsubscribePosts = () => {};

        const initJobs = async () => {
            try {
                if (!isSupabaseConfigured || !supabase) {
                    throw new Error('Supabase is not configured.');
                }

                const fetchCount = async () => {
                    const { count, error } = await supabase
                        .from('jobs')
                        .select('id', { count: 'exact', head: true });
                    if (error) throw error;
                    if (isMounted) setJobCount(count || 0);
                };

                await fetchCount();

                const channel = supabase
                    .channel('jobs-count')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchCount)
                    .subscribe();

                unsubscribeJobs = () => {
                    void supabase.removeChannel(channel);
                };
            } catch (error) {
                console.error('Failed to load jobs count:', error);
                if (isMounted) setLoading(false);
            }
        };

        subscribeToPosts(
            { type: 'community' },
            (posts) => {
                if (!isMounted) return;
                setPostCount(posts.length);
                setLoading(false);
            },
            (error) => {
                console.error('Failed to load community posts count:', error);
                if (isMounted) setLoading(false);
            }
        )
            .then((unsub) => {
                if (!isMounted) {
                    unsub();
                    return;
                }
                unsubscribePosts = unsub;
            })
            .catch((error) => {
                console.error('Failed to initialize posts subscription:', error);
                if (isMounted) setLoading(false);
            });

        initJobs();

        return () => {
            isMounted = false;
            unsubscribeJobs();
            unsubscribePosts();
        };
    }, []);

    const stats = [
        { label: 'Total Users', value: users.length, icon: Users, variant: 'primary', meta: 'All roles' },
        { label: 'Resumes', value: users.filter(u => u.resumeURL).length, icon: FileText, variant: 'success', meta: 'With uploads' },
        { label: 'Job Posts', value: jobCount, icon: Briefcase, variant: 'warning', meta: 'All time' },
        { label: 'Community Posts', value: postCount, icon: MessageCircle, variant: 'accent', meta: 'All time' },
    ];

    if (loading) {
        return <div className="admin-empty">Loading analytics...</div>;
    }

    return (
        <div className="stats-grid admin-analytics-grid">
            {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                    <div key={idx} className={`stat-card stat-${stat.variant}`}>
                        <div className="stat-icon">
                            <Icon size={22} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">{stat.label}</p>
                            <h3 className="stat-value">{stat.value}</h3>
                            <p className="stat-change">{stat.meta}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
