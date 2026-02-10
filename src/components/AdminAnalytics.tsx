import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from '../types';
import { Users, Briefcase, FileText, MessageCircle } from 'lucide-react';

interface AdminAnalyticsProps {
    users: User[];
}

export const AdminAnalytics = ({ users }: AdminAnalyticsProps) => {
    const [jobCount, setJobCount] = useState(0);
    const [postCount, setPostCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Real-time listener for jobs collection
        const jobsQuery = query(collection(db, 'jobs'));
        const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
            setJobCount(snapshot.size);
        });

        // Real-time listener for posts collection
        const postsQuery = query(collection(db, 'posts'));
        const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
            setPostCount(snapshot.size);
            setLoading(false);
        });

        return () => {
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
