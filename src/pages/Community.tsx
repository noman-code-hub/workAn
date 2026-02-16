import { useAuth } from '../contexts/AuthContext';
import { BlogSection } from '../components/BlogSection';
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
                                    background: user.bannerURL ? `url(${user.bannerURL}) center/cover` : 'linear-gradient(to right, #a0b4b7, #d9e2e5)',
                                    borderRadius: '8px 8px 0 0'
                                }} />
                                <div style={styles.profileInfo}>
                                    <div style={styles.avatarWrapper}>
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt={user.name} style={styles.avatar} />
                                        ) : (
                                            <div style={styles.avatarPlaceholder}>{user.name.charAt(0)}</div>
                                        )}
                                    </div>
                                    <h3 style={styles.profileName}>{user.name}</h3>
                                    <p style={styles.profileHeadline}>{user.profession || 'Professional'}</p>
                                    <p style={styles.profileLocation}>{user.country || ''}</p>
                                </div>
                                <div style={styles.profileCompany}>
                                    <span style={{ color: '#00d4aa', fontWeight: 600 }}>🔍 {user.profession?.split(' ')[0] || 'Career'} Labs AI</span>
                                </div>
                            </div>

                            {/* Career Stats Card */}
                            <div style={styles.card}>
                                <div style={styles.analyticsRow}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TrendingUp size={16} color="#00d4aa" />
                                        <span style={styles.analyticsLabel}>Resume Score</span>
                                    </div>
                                    <span style={styles.analyticsValue}>{user.analytics?.resumeScore || 0}%</span>
                                </div>
                                <div style={styles.analyticsRow}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Target size={16} color="#00d4aa" />
                                        <span style={styles.analyticsLabel}>Job Matches</span>
                                    </div>
                                    <span style={styles.analyticsValue}>12</span>
                                </div>
                                <div style={styles.analyticsRow}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Award size={16} color="#00d4aa" />
                                        <span style={styles.analyticsLabel}>Skills Verified</span>
                                    </div>
                                    <span style={styles.analyticsValue}>{user.skills?.length || 0}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={styles.card}>
                            <div style={{ padding: '24px', textAlign: 'center' }}>
                                <div style={{ width: '48px', height: '48px', backgroundColor: '#00d4aa', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Briefcase size={24} />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>Join the community</h3>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 20px 0' }}>Connect with professionals and share your journey.</p>
                                <button
                                    onClick={() => window.location.href = '/login'}
                                    style={{ width: '100%', padding: '10px', backgroundColor: '#00d4aa', border: 'none', borderRadius: '20px', color: 'white', fontWeight: 700, cursor: 'pointer' }}
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
                    <div style={styles.card}>
                        <div style={{ padding: '12px' }}>
                            <h3 style={styles.cardTitle}>🚀 Trending Jobs</h3>
                            <div style={styles.jobItem}>
                                <div style={styles.jobInfo}>
                                    <p style={styles.jobTitle}>Senior React Developer</p>
                                    <p style={styles.jobCompany}>Tech Corp • Remote</p>
                                    <p style={styles.jobSalary}>$80k - $120k</p>
                                </div>
                            </div>
                            <div style={styles.jobItem}>
                                <div style={styles.jobInfo}>
                                    <p style={styles.jobTitle}>Full Stack Engineer</p>
                                    <p style={styles.jobCompany}>StartupXYZ • Hybrid</p>
                                    <p style={styles.jobSalary}>$70k - $100k</p>
                                </div>
                            </div>
                            <div style={styles.jobItem}>
                                <div style={styles.jobInfo}>
                                    <p style={styles.jobTitle}>Product Manager</p>
                                    <p style={styles.jobCompany}>Global Inc • On-site</p>
                                    <p style={styles.jobSalary}>$90k - $130k</p>
                                </div>
                            </div>
                            <button
                                style={styles.showMoreBtn}
                                onClick={() => window.location.href = '/jobs'}
                            >
                                View all jobs <ChevronDown size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Career Resources Card */}
                    <div style={styles.card}>
                        <div style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={styles.cardTitle}>📚 Career Resources</h3>
                                <Info size={14} color="#666" />
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
                <div style={styles.messagingButton}>
                    <div style={styles.msgAvatar}>
                        {user.photoURL ? <img src={user.photoURL} alt="" style={styles.msgAvatarImg} /> : 'U'}
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
                    overflow: hidden;
                    align-self: start;
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
                }
            `}</style>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    pageWrapper: {
        backgroundColor: '#f3f2f0',
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
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        marginBottom: '4px',
    },
    feedTitle: {
        fontSize: '24px',
        fontWeight: 700,
        color: '#111827',
        margin: '0 0 4px 0',
    },
    feedSubtitle: {
        fontSize: '14px',
        color: '#666',
        margin: 0,
    },
    rightSidebar: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
    },
    profileInfo: {
        textAlign: 'center',
        padding: '12px 12px 16px',
        borderBottom: '1px solid #f3f2f0',
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
        border: '2px solid white',
        objectFit: 'cover',
        backgroundColor: 'white',
    },
    avatarPlaceholder: {
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        border: '2px solid white',
        backgroundColor: '#a0b4b7',
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
        color: 'rgba(0,0,0,0.9)',
        margin: '0 0 4px 0',
    },
    profileHeadline: {
        fontSize: '12px',
        color: '#666',
        margin: '0 0 4px 0',
        lineHeight: '1.4',
    },
    profileLocation: {
        fontSize: '12px',
        color: '#666',
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
        color: '#666',
    },
    analyticsValue: {
        fontSize: '12px',
        fontWeight: 600,
        color: '#00d4aa',
    },
    navItem: {
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#666',
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
        color: 'rgba(0,0,0,0.9)',
    },
    // Job Alert Styles
    jobItem: {
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        marginBottom: '12px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    jobInfo: {
        flex: 1,
    },
    jobTitle: {
        fontSize: '14px',
        fontWeight: 600,
        margin: '0 0 4px 0',
        color: '#1a1a1a',
    },
    jobCompany: {
        fontSize: '12px',
        color: '#666',
        margin: '0 0 4px 0',
    },
    jobSalary: {
        fontSize: '12px',
        fontWeight: 600,
        color: '#00d4aa',
        margin: 0,
    },
    showMoreBtn: {
        width: '100%',
        background: 'none',
        border: 'none',
        padding: '8px 0 0 0',
        color: '#666',
        fontSize: '14px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        cursor: 'pointer',
        borderTop: '1px solid #f3f2f0',
        marginTop: '8px',
    },
    // Resource Styles
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
        color: '#1a1a1a',
    },
    resourceDesc: {
        fontSize: '12px',
        color: '#666',
        margin: '0 0 8px 0',
        lineHeight: '1.4',
    },
    resourceBtn: {
        background: '#00d4aa',
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
        backgroundColor: 'white',
        width: '288px',
        height: '48px',
        borderRadius: '8px 8px 0 0',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: '8px',
        zIndex: 1000,
        fontSize: '14px',
        fontWeight: 600,
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
