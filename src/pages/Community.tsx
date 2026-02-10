import { useAuth } from '../contexts/AuthContext';
import { BlogSection } from '../components/BlogSection';
import {
    Bookmark,
    Users,
    Newspaper,
    Calendar,
    ChevronDown,
    Plus,
    Info,
    MoreHorizontal
} from 'lucide-react';

export const Community = () => {
    const { user } = useAuth();



    return (
        <div style={styles.pageWrapper}>
            <div style={styles.contentContainer}>

                {/* --- LEFT SIDEBAR --- */}
                <aside style={styles.leftSidebar}>
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

                            {/* Analytics Card */}
                            <div style={styles.card}>
                                <div style={styles.analyticsRow}>
                                    <span style={styles.analyticsLabel}>Profile viewers</span>
                                    <span style={styles.analyticsValue}>39</span>
                                </div>
                                <div style={styles.analyticsRow}>
                                    <span style={styles.analyticsLabel}>Post impressions</span>
                                    <span style={styles.analyticsValue}>283</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={styles.card}>
                            <div style={{ padding: '24px', textAlign: 'center' }}>
                                <div style={{ width: '48px', height: '48px', backgroundColor: '#00d4aa', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Users size={24} />
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

                    {user && (
                        <div style={styles.card}>
                            <div style={{ padding: '12px' }}>
                                <p style={{ fontSize: '12px', color: '#666' }}>Unlock exclusive tools & insights</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <div style={{ width: '16px', height: '16px', backgroundColor: '#d1a15e', borderRadius: '4px' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 600, textDecoration: 'underline' }}>Try Premium for PKR0</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Nav Items Card */}
                    <div style={styles.card}>
                        <div style={styles.navItem}>
                            <Bookmark size={16} /> <span style={styles.navText}>Saved items</span>
                        </div>
                        <div style={styles.navItem}>
                            <Users size={16} /> <span style={styles.navText}>Groups</span>
                        </div>
                        <div style={styles.navItem}>
                            <Newspaper size={16} /> <span style={styles.navText}>Newsletters</span>
                        </div>
                        <div style={styles.navItem}>
                            <Calendar size={16} /> <span style={styles.navText}>Events</span>
                        </div>
                    </div>
                </aside>

                {/* --- MAIN FEED --- */}
                <main style={styles.mainContent}>
                    <div style={styles.feedHeaderContainer}>
                        <h1 style={styles.feedTitle}>Community Feed</h1>
                        <p style={styles.feedSubtitle}>Share your achievements, job updates, and career milestones with others.</p>
                    </div>
                    <BlogSection user={user || undefined} isOwnProfile={true} viewMode="list" type="community" isFeed={true} />
                </main>

                {/* --- RIGHT SIDEBAR --- */}
                <aside style={styles.rightSidebar}>
                    {/* Puzzle Games Card */}
                    <div style={styles.card}>
                        <div style={{ padding: '12px' }}>
                            <h3 style={styles.cardTitle}>Today's puzzle games</h3>
                            <div style={styles.gameItem}>
                                <div style={{ ...styles.gameIcon, backgroundColor: '#f15e22' }}>Z</div>
                                <div style={styles.gameInfo}>
                                    <p style={styles.gameName}>Zip <span style={{ color: '#666', fontWeight: 400 }}>#323</span></p>
                                    <p style={styles.gameDesc}>7 connections played</p>
                                </div>
                            </div>
                            <div style={styles.gameItem}>
                                <div style={{ ...styles.gameIcon, backgroundColor: '#4caf50' }}>M</div>
                                <div style={styles.gameInfo}>
                                    <p style={styles.gameName}>Mini Sudoku <span style={{ color: '#666', fontWeight: 400 }}>#176</span></p>
                                    <p style={styles.gameDesc}>3 connections played</p>
                                </div>
                            </div>
                            <button style={styles.showMoreBtn}>Show more <ChevronDown size={16} /></button>
                        </div>
                    </div>

                    {/* Add to Feed Card */}
                    <div style={styles.card}>
                        <div style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={styles.cardTitle}>Add to your feed</h3>
                                <Info size={14} color="#666" />
                            </div>

                            {/* Recommendation 1 */}
                            <div style={styles.recItem}>
                                <div style={styles.recAvatar}>C</div>
                                <div style={styles.recInfo}>
                                    <p style={styles.recName}>Cisco</p>
                                    <p style={styles.recDesc}>Company • Software Development</p>
                                    <button style={styles.followBtn}><Plus size={16} /> Follow</button>
                                </div>
                            </div>

                            {/* Recommendation 2 */}
                            <div style={styles.recItem}>
                                <div style={{ ...styles.recAvatar, backgroundColor: '#333' }}>MB</div>
                                <div style={styles.recInfo}>
                                    <p style={styles.recName}>Matt Burgess</p>
                                    <p style={styles.recDesc}>Social Media Content Creator</p>
                                    <button style={styles.followBtn}><Plus size={16} /> Follow</button>
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
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    pageWrapper: {
        backgroundColor: '#f3f2f0',
        minHeight: '100vh',
        paddingTop: '24px',
        fontFamily: 'var(--font-family)',
    },
    contentContainer: {
        maxWidth: '1128px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '225px 1fr 300px',
        gap: '24px',
        padding: '0 16px',
    },
    leftSidebar: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        position: 'sticky',
        top: '88px',
        alignSelf: 'start',
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
        position: 'sticky',
        top: '88px',
        alignSelf: 'start',
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
    gameItem: {
        display: 'flex',
        gap: '12px',
        marginBottom: '12px',
        alignItems: 'center',
    },
    gameIcon: {
        width: '40px',
        height: '40px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: '20px',
    },
    gameInfo: {
        flex: 1,
    },
    gameName: {
        fontSize: '14px',
        fontWeight: 600,
        margin: 0,
    },
    gameDesc: {
        fontSize: '12px',
        color: '#666',
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
    recItem: {
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
    },
    recAvatar: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#00d4aa',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
    },
    recInfo: {
        flex: 1,
    },
    recName: {
        fontSize: '14px',
        fontWeight: 600,
        margin: 0,
    },
    recDesc: {
        fontSize: '12px',
        color: '#666',
        margin: '2px 0 8px 0',
        lineHeight: '1.4',
    },
    followBtn: {
        background: 'none',
        border: '1px solid #666',
        borderRadius: '16px',
        padding: '4px 16px',
        fontSize: '14px',
        fontWeight: 600,
        color: '#666',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
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
