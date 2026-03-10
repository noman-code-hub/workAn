import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BlogSection } from '../components/BlogSection';
import type { Job } from '../types';
import { apiUrl, parseApiJson } from '../config/api';
import {
    TrendingUp,
    Target,
    Award,
    Briefcase,
    ChevronDown,
    Info,
    MoreHorizontal
} from 'lucide-react';

export const Community = () => {
    const { user } = useAuth();
    const [trendingJobs, setTrendingJobs] = useState<Job[]>([]);
    const [jobsLoading, setJobsLoading] = useState(true);
    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        if (typeof document === 'undefined') return false;
        return document.documentElement.getAttribute('data-theme') === 'dark';
    });
    const styles = getStyles(isDarkTheme);

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

    const formatSalary = (job: Job) => {
        if (!job.salary?.min || !job.salary?.max) return 'Salary not listed';
        return `$${(job.salary.min / 1000).toFixed(0)}k - $${(job.salary.max / 1000).toFixed(0)}k`;
    };

    useEffect(() => {
        const controller = new AbortController();
        const run = async () => {
            setJobsLoading(true);
            try {
                const profession = (user?.profession || '').trim();
                if (!profession) {
                    setTrendingJobs([]);
                    return;
                }

                const countryCode = getCountryCode(user?.country);
                const params = new URLSearchParams({
                    country: countryCode,
                    limit: '2',
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
                    setTrendingJobs(incomingJobs.slice(0, 2));
                } else {
                    const fallbackParams = new URLSearchParams({
                        country: countryCode,
                        limit: '2',
                        q: profession,
                    });
                    const fallbackResponse = await fetch(apiUrl(`/jobs/market?${fallbackParams.toString()}`), { signal: controller.signal });
                    const fallbackData = await parseApiJson<any>(fallbackResponse);
                    setTrendingJobs(fallbackData.success ? (fallbackData.results || []).slice(0, 2) : []);
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    setTrendingJobs([]);
                }
            } finally {
                if (!controller.signal.aborted) setJobsLoading(false);
            }
        };

        run();
        return () => controller.abort();
    }, [user?.country, user?.profession]);

    useEffect(() => {
        if (typeof document === 'undefined') return undefined;

        const root = document.documentElement;
        const syncTheme = () => setIsDarkTheme(root.getAttribute('data-theme') === 'dark');
        syncTheme();

        const observer = new MutationObserver(syncTheme);
        observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);



    return (
        <div className="community-page" style={styles.pageWrapper}>
            <div className="community-layout" style={styles.contentContainer}>

                {/* --- LEFT SIDEBAR --- */}
                <aside className="community-sidebar community-left" style={styles.leftSidebar}>
                    {user ? (
                        <>
                            {/* Profile Card */}
                            <div style={styles.card}>
                                <div style={{
                                    height: '56px',
                                    background: user.bannerURL
                                        ? `url(${user.bannerURL}) center/cover`
                                        : (isDarkTheme
                                            ? 'linear-gradient(to right, #334155, #1e293b)'
                                            : 'linear-gradient(to right, #a0b4b7, #d9e2e5)'),
                                    borderRadius: '8px 8px 0 0'
                                }} />
                                <div style={styles.profileInfo}>
                                    <div style={styles.avatarWrapper}>
                                        {user.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt={user.name ? `${user.name} avatar` : 'User avatar'}
                                                style={styles.avatar}
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        ) : (
                                            <div style={styles.avatarPlaceholder}>{user.name.charAt(0)}</div>
                                        )}
                                    </div>
                                    <h3 style={styles.profileName}>{user.name}</h3>
                                    <p style={styles.profileHeadline}>{user.profession || 'Professional'}</p>
                                    <p style={styles.profileLocation}>{user.country || ''}</p>
                                </div>
                                <div style={styles.profileCompany}>
                                    <span style={{ color: isDarkTheme ? '#5eead4' : '#00d4aa', fontWeight: 600 }}>🔍 {user.profession?.split(' ')[0] || 'Career'} Labs AI</span>
                                </div>
                            </div>

                            {/* Career Stats Card */}
                            <div style={styles.card}>
                                <div style={styles.analyticsRow}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TrendingUp size={16} color={isDarkTheme ? '#5eead4' : '#00d4aa'} />
                                        <span style={styles.analyticsLabel}>Resume Score</span>
                                    </div>
                                    <span style={styles.analyticsValue}>{user.analytics?.resumeScore || 0}%</span>
                                </div>
                                <div style={styles.analyticsRow}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Target size={16} color={isDarkTheme ? '#5eead4' : '#00d4aa'} />
                                        <span style={styles.analyticsLabel}>Job Matches</span>
                                    </div>
                                    <span style={styles.analyticsValue}>12</span>
                                </div>
                                <div style={styles.analyticsRow}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Award size={16} color={isDarkTheme ? '#5eead4' : '#00d4aa'} />
                                        <span style={styles.analyticsLabel}>Skills Verified</span>
                                    </div>
                                    <span style={styles.analyticsValue}>{user.skills?.length || 0}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={styles.card}>
                            <div style={{ padding: '24px', textAlign: 'center' }}>
                                <div style={{ width: '48px', height: '48px', backgroundColor: isDarkTheme ? '#14b8a6' : '#00d4aa', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Briefcase size={24} />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: isDarkTheme ? '#e2e8f0' : '#111827' }}>Join the community</h3>
                                <p style={{ fontSize: '14px', color: isDarkTheme ? '#94a3b8' : '#666', margin: '0 0 20px 0' }}>Connect with professionals and share your journey.</p>
                                <button
                                    onClick={() => window.location.href = '/login'}
                                    style={{ width: '100%', padding: '10px', backgroundColor: isDarkTheme ? '#14b8a6' : '#00d4aa', border: 'none', borderRadius: '20px', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Sign In
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions Card */}
                    <div style={styles.card}>
                        <div style={styles.navItem} onClick={() => window.location.href = '/resume'}>
                            <TrendingUp size={16} /> <span style={styles.navText}>Build Resume</span>
                        </div>
                        <div style={styles.navItem} onClick={() => window.location.href = '/jobs'}>
                            <Briefcase size={16} /> <span style={styles.navText}>Browse Jobs</span>
                        </div>
                        <div style={styles.navItem} onClick={() => window.location.href = '/ai-copilot'}>
                            <Target size={16} /> <span style={styles.navText}>Career Advisor</span>
                        </div>
                        <div style={styles.navItem} onClick={() => window.location.href = '/trends'}>
                            <Award size={16} /> <span style={styles.navText}>Industry Trends</span>
                        </div>
                    </div>
                </aside>

                {/* --- MAIN FEED --- */}
                <main className="community-main" style={styles.mainContent}>
                    <div style={styles.feedHeaderContainer}>
                        <h1 style={styles.feedTitle}>Community Feed</h1>
                        <p style={styles.feedSubtitle}>Share your achievements, job updates, and career milestones with others.</p>
                    </div>
                    <BlogSection user={user || undefined} isOwnProfile={true} viewMode="list" type="community" isFeed={true} />
                </main>

                {/* --- RIGHT SIDEBAR --- */}
                <aside className="community-sidebar community-right" style={styles.rightSidebar}>
                    {/* Job Alerts Card */}
                    <div style={{ ...styles.card, ...styles.rightSidebarCard }}>
                        <div style={{ padding: '12px' }}>
                            <h3 style={styles.cardTitle}>🚀 Trending Jobs</h3>
                            {jobsLoading ? (
                                <p style={styles.jobEmptyText}>Loading recommendations...</p>
                            ) : trendingJobs.length === 0 ? (
                                <p style={styles.jobEmptyText}>
                                    {user?.profession ? 'No matching jobs right now.' : 'Add your profession in profile to get recommendations.'}
                                </p>
                            ) : (
                                trendingJobs.map((job) => (
                                    <div
                                        key={job.id}
                                        style={styles.jobItem}
                                        onClick={() => { window.location.href = '/market-jobs'; }}
                                    >
                                        <div style={styles.jobInfo}>
                                            <p style={styles.jobTitle}>{job.title}</p>
                                            <p style={styles.jobCompany}>{job.company} • {job.location}</p>
                                            <p style={styles.jobSalary}>{formatSalary(job)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <button
                                style={styles.showMoreBtn}
                                onClick={() => window.location.href = '/market-jobs'}
                            >
                                View all jobs <ChevronDown size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Career Resources Card */}
                    <div style={{ ...styles.card, ...styles.rightSidebarCard }}>
                        <div style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={styles.cardTitle}>📚 Career Resources</h3>
                                <Info size={14} color={isDarkTheme ? '#94a3b8' : '#666'} />
                            </div>

                            {/* Resource 1 */}
                            <div style={styles.resourceItem}>
                                <div style={{ ...styles.resourceIcon, backgroundColor: '#00d4aa' }}>📝</div>
                                <div style={styles.resourceInfo}>
                                    <p style={styles.resourceName}>Resume Builder</p>
                                    <p style={styles.resourceDesc}>Create ATS-optimized resumes</p>
                                    <button
                                        style={styles.resourceBtn}
                                        onClick={() => window.location.href = '/resume'}
                                    >
                                        Start Building
                                    </button>
                                </div>
                            </div>

                            {/* Resource 2 */}
                            <div style={styles.resourceItem}>
                                <div style={{ ...styles.resourceIcon, backgroundColor: '#4caf50' }}>🤖</div>
                                <div style={styles.resourceInfo}>
                                    <p style={styles.resourceName}>AI Career Copilot</p>
                                    <p style={styles.resourceDesc}>Get personalized career advice</p>
                                    <button
                                        style={styles.resourceBtn}
                                        onClick={() => window.location.href = '/ai-copilot'}
                                    >
                                        Chat Now
                                    </button>
                                </div>
                            </div>

                            {/* Resource 3 */}
                            <div style={styles.resourceItem}>
                                <div style={{ ...styles.resourceIcon, backgroundColor: '#f15e22' }}>📊</div>
                                <div style={styles.resourceInfo}>
                                    <p style={styles.resourceName}>Career Trends</p>
                                    <p style={styles.resourceDesc}>Explore industry insights</p>
                                    <button
                                        style={styles.resourceBtn}
                                        onClick={() => window.location.href = '/trends'}
                                    >
                                        Explore
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

            </div>

            {/* Global Messaging Widget Placeholder */}
            {user && (
                <div className="messaging-widget" style={styles.messagingButton}>
                    <div style={styles.msgAvatar}>
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.name ? `${user.name} avatar` : 'User avatar'}
                                style={styles.msgAvatarImg}
                                loading="lazy"
                                decoding="async"
                            />
                        ) : (
                            'U'
                        )}
                    </div>
                    <span>Messaging</span>
                    <MoreHorizontal size={18} />
                </div>
            )}

            <style>{`
                .community-page {
                    height: 100vh;
                    overflow: hidden;
                    background: linear-gradient(135deg, #e8f5f3 0%, #f0f8f7 50%, #e3f2f1 100%);
                    position: relative;
                }

                [data-theme="dark"] .community-page {
                    background: #0f172a;
                }
                
                .community-page::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: 
                        radial-gradient(circle at 20% 30%, rgba(0, 212, 170, 0.03) 0%, transparent 50%),
                        radial-gradient(circle at 80% 70%, rgba(0, 212, 170, 0.04) 0%, transparent 50%),
                        radial-gradient(circle at 40% 80%, rgba(0, 212, 170, 0.02) 0%, transparent 40%);
                    pointer-events: none;
                    z-index: 0;
                }

                [data-theme="dark"] .community-page::before {
                    display: none;
                }
                
                
                .community-layout {
                    position: relative;
                    z-index: 1;
                    display: grid;
                    grid-template-columns: 280px minmax(0, 1fr) 360px;
                    gap: 24px;
                    padding: 16px;
                    max-height: 100vh;
                    width: 100%;
                    overflow: hidden;
                }

                .community-sidebar {
                    position: sticky;
                    top: 0;
                    height: calc(100vh - 32px);
                    overflow-y: auto;
                    overflow-x: hidden;
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE and Edge */
                    align-self: start;
                }

                .community-right {
                    height: auto;
                    overflow: visible;
                }

                .community-sidebar::-webkit-scrollbar {
                    display: none; /* Chrome, Safari, Opera */
                }

                .community-main {
                    height: calc(100vh - 32px);
                    min-height: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE and Edge */
                }
                
                .community-main::-webkit-scrollbar {
                    display: none; /* Chrome, Safari, Opera */
                }

                @media (max-width: 1200px) {
                    .community-layout {
                        grid-template-columns: 240px minmax(0, 1fr) 320px;
                    }
                }

                @media (max-width: 1024px) {
                    .community-layout {
                        grid-template-columns: 200px minmax(0, 1fr);
                    }
                    .community-right {
                        display: none;
                    }
                }

                @media (max-width: 768px) {
                    .community-page {
                        height: auto;
                        overflow-y: auto;
                    }

                    .community-layout {
                        display: block;
                        height: auto;
                        max-height: none;
                        padding: 12px;
                        gap: 0;
                    }

                    .community-sidebar {
                        display: none !important;
                    }

                    .community-left {
                        display: none !important;
                    }

                    .community-right {
                        display: none !important;
                    }

                    .community-main {
                        height: auto;
                        overflow: visible;
                        width: 100%;
                        display: block;
                    }

                    .messaging-widget {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

const getStyles = (isDarkTheme: boolean): Record<string, React.CSSProperties> => {
    const palette = isDarkTheme
        ? {
            pageBg: 'transparent',
            cardBg: '#111827',
            cardBorder: '#334155',
            softBorder: '#1e293b',
            text: '#e2e8f0',
            muted: '#94a3b8',
            accent: '#5eead4',
            accentBtn: '#14b8a6',
            jobCardBg: '#0f172a',
            avatarBg: '#334155',
            msgShadow: '0 0 0 1px rgba(148,163,184,0.16), 0 8px 16px rgba(2,6,23,0.55)',
        }
        : {
            pageBg: '#f3f2f0',
            cardBg: 'white',
            cardBorder: '#e0e0e0',
            softBorder: '#f3f2f0',
            text: '#111827',
            muted: '#666',
            accent: '#00d4aa',
            accentBtn: '#00d4aa',
            jobCardBg: '#f9fafb',
            avatarBg: '#a0b4b7',
            msgShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.3)',
        };

    return {
        pageWrapper: {
            backgroundColor: palette.pageBg,
            paddingTop: 0,
            paddingBottom: 0,
            fontFamily: 'var(--font-family)',
            display: 'flex',
            flexDirection: 'column',
        },
        contentContainer: {
            flex: 1,
        },
        leftSidebar: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        },
        mainContent: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        },
        feedHeaderContainer: {
            backgroundColor: palette.cardBg,
            padding: '20px',
            borderRadius: '8px',
            border: `1px solid ${palette.cardBorder}`,
            marginBottom: '4px',
        },
        feedTitle: {
            fontSize: '24px',
            fontWeight: 700,
            color: palette.text,
            margin: '0 0 4px 0',
        },
        feedSubtitle: {
            fontSize: '14px',
            color: palette.muted,
            margin: 0,
        },
        rightSidebar: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        },
        rightSidebarCard: isDarkTheme
            ? {
                backgroundColor: 'transparent',
                boxShadow: 'none',
            }
            : {},
        card: {
            backgroundColor: palette.cardBg,
            borderRadius: '8px',
            border: `1px solid ${palette.cardBorder}`,
            overflow: 'hidden',
        },
        profileInfo: {
            textAlign: 'center',
            padding: '12px 12px 16px',
            borderBottom: `1px solid ${palette.softBorder}`,
        },
        avatarWrapper: {
            marginTop: '-38px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'center',
        },
        avatar: {
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            border: `2px solid ${palette.cardBg}`,
            objectFit: 'cover',
            backgroundColor: palette.cardBg,
        },
        avatarPlaceholder: {
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            border: `2px solid ${palette.cardBg}`,
            backgroundColor: palette.avatarBg,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: 700,
        },
        profileName: {
            fontSize: '16px',
            fontWeight: 600,
            color: palette.text,
            margin: '0 0 4px 0',
        },
        profileHeadline: {
            fontSize: '12px',
            color: palette.muted,
            margin: '0 0 4px 0',
            lineHeight: '1.4',
        },
        profileLocation: {
            fontSize: '12px',
            color: palette.muted,
            margin: 0,
        },
        profileCompany: {
            padding: '12px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
        },
        analyticsRow: {
            padding: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
        },
        analyticsLabel: {
            fontSize: '12px',
            fontWeight: 600,
            color: palette.muted,
        },
        analyticsValue: {
            fontSize: '12px',
            fontWeight: 600,
            color: palette.accent,
        },
        navItem: {
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: palette.muted,
            cursor: 'pointer',
        },
        navText: {
            fontSize: '12px',
            fontWeight: 600,
        },
        cardTitle: {
            fontSize: '16px',
            fontWeight: 600,
            margin: '0 0 12px 0',
            color: palette.text,
        },
        jobItem: {
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: palette.jobCardBg,
            marginBottom: '12px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            border: `1px solid ${palette.cardBorder}`,
        },
        jobInfo: {
            flex: 1,
        },
        jobTitle: {
            fontSize: '14px',
            fontWeight: 600,
            margin: '0 0 4px 0',
            color: palette.text,
        },
        jobCompany: {
            fontSize: '12px',
            color: palette.muted,
            margin: '0 0 4px 0',
        },
        jobSalary: {
            fontSize: '12px',
            fontWeight: 600,
            color: palette.accent,
            margin: 0,
        },
        jobEmptyText: {
            margin: '0 0 12px 0',
            fontSize: '12px',
            color: palette.muted,
            lineHeight: '1.4',
        },
        showMoreBtn: {
            width: '100%',
            background: 'none',
            border: 'none',
            padding: '8px 0 0 0',
            color: palette.muted,
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
            borderTop: `1px solid ${palette.softBorder}`,
            marginTop: '8px',
        },
        resourceItem: {
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            alignItems: 'flex-start',
        },
        resourceIcon: {
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            flexShrink: 0,
        },
        resourceInfo: {
            flex: 1,
        },
        resourceName: {
            fontSize: '14px',
            fontWeight: 600,
            margin: '0 0 4px 0',
            color: palette.text,
        },
        resourceDesc: {
            fontSize: '12px',
            color: palette.muted,
            margin: '0 0 8px 0',
            lineHeight: '1.4',
        },
        resourceBtn: {
            background: palette.accentBtn,
            border: 'none',
            borderRadius: '16px',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'white',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
        },
        messagingButton: {
            position: 'fixed',
            bottom: 0,
            right: '24px',
            backgroundColor: palette.cardBg,
            width: '288px',
            height: '48px',
            borderRadius: '8px 8px 0 0',
            boxShadow: palette.msgShadow,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: '8px',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: 600,
            color: palette.text,
            border: `1px solid ${palette.cardBorder}`,
            borderBottom: 'none',
        },
        msgAvatar: {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            overflow: 'hidden',
        },
        msgAvatarImg: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
        }
    };
};
