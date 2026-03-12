import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getDb } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { User, UserRole } from '../types';
import { Users, Shield, Briefcase, Search, Filter, BarChart2, MessageCircle, FileText } from 'lucide-react';
import { AdminAnalytics } from '../components/AdminAnalytics';
import { AdminPosts } from '../components/AdminPosts';
import { AdminTemplates } from './AdminTemplates';

export const AdminDashboard = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
    const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'posts' | 'templates'>('analytics');

    useEffect(() => {
        let isMounted = true;
        let unsubscribe = () => {};

        const initUsers = async () => {
            try {
                const db = await getDb();
                if (!isMounted) return;
                unsubscribe = onSnapshot(
                    collection(db, 'users'),
                    (snapshot) => {
                        const usersList = snapshot.docs.map(doc => ({
                            ...doc.data(),
                            id: doc.id,
                            createdAt: doc.data().createdAt?.toDate() || new Date(),
                            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
                        })) as User[];
                        if (isMounted) {
                            setUsers(usersList);
                            setLoading(false);
                        }
                    },
                    (error) => {
                        console.error('Error fetching users:', error);
                        if (isMounted) setLoading(false);
                    }
                );
            } catch (error) {
                console.error('Error initializing users listener:', error);
                if (isMounted) setLoading(false);
            }
        };

        initUsers();

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    const updateUserRole = async (userId: string, newRole: UserRole) => {
        // Confirmation for all changes
        if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
            return;
        }

        if (userId === currentUser?.id && newRole !== 'admin') {
            if (!window.confirm('WARNING: You are about to remove your own admin access. You will be redirected immediately and lose access to this page.')) {
                return;
            }
        }

        try {
            setUpdating(userId);
            const db = await getDb();
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, {
                role: newRole,
                updatedAt: new Date()
            });
            // No need to update local state manually, onSnapshot will handle it
        } catch (error) {
            console.error('Error updating user role:', error);
            alert('Failed to update user role');
        } finally {
            setUpdating(null);
        }
    };

    // Filter users based on search and role
    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()));
        const userRole = user.role || 'user';
        const matchesRole = roleFilter === 'all' || userRole === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case 'admin':
                return <Shield size={18} className="role-icon admin" />;
            case 'recruiter':
                return <Briefcase size={18} className="role-icon recruiter" />;
            default:
                return <Users size={18} className="role-icon user" />;
        }
    };

    const getRoleColor = (role: UserRole) => {
        switch (role) {
            case 'admin':
                return '#dc2626';
            case 'recruiter':
                return '#2563eb';
            default:
                return '#10b981';
        }
    };

    if (loading) {
        return (
            <div className="admin-dashboard">
                <div className="container admin-container">
                    <div className="loading-state">Loading users...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="container admin-container">
                <div className="dashboard-header">
                    <div>
                        <p className="admin-eyebrow">Admin Console</p>
                        <h1>User & Content Management</h1>
                        <p>Oversee roles, analytics, and community moderation in one place.</p>
                    </div>
                    {currentUser && (
                        <div className="header-chip">
                            Signed in as {currentUser.name || currentUser.email}
                        </div>
                    )}
                </div>

                <div className="tabs-container">
                    <button
                        className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analytics')}
                    >
                        <BarChart2 size={18} />
                        Analytics
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={18} />
                        Manage Users
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('posts')}
                    >
                        <MessageCircle size={18} />
                        Manage Posts
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
                        onClick={() => setActiveTab('templates')}
                    >
                        <FileText size={18} />
                        Resume Templates
                    </button>
                </div>

                {activeTab === 'analytics' && (
                    <AdminAnalytics users={users} />
                )}

                {activeTab === 'users' && (
                    <>
                        <div className="stats-grid">
                            <div className="stat-card stat-primary">
                                <div className="stat-icon">
                                    <Users size={22} />
                                </div>
                                <div className="stat-content">
                                    <p className="stat-label">Total Users</p>
                                    <h3 className="stat-value">{users.length}</h3>
                                    <p className="stat-change">All roles</p>
                                </div>
                            </div>
                            <div className="stat-card stat-danger">
                                <div className="stat-icon">
                                    <Shield size={22} />
                                </div>
                                <div className="stat-content">
                                    <p className="stat-label">Admins</p>
                                    <h3 className="stat-value">{users.filter(u => u.role === 'admin').length}</h3>
                                    <p className="stat-change">Platform owners</p>
                                </div>
                            </div>
                            <div className="stat-card stat-accent">
                                <div className="stat-icon">
                                    <Briefcase size={22} />
                                </div>
                                <div className="stat-content">
                                    <p className="stat-label">Recruiters</p>
                                    <h3 className="stat-value">{users.filter(u => u.role === 'recruiter').length}</h3>
                                    <p className="stat-change">Hiring teams</p>
                                </div>
                            </div>
                            <div className="stat-card stat-success">
                                <div className="stat-icon">
                                    <Users size={22} />
                                </div>
                                <div className="stat-content">
                                    <p className="stat-label">Regular Users</p>
                                    <h3 className="stat-value">{users.filter(u => u.role === 'user').length}</h3>
                                    <p className="stat-change">Job seekers</p>
                                </div>
                            </div>
                        </div>

                        <div className="users-table-container">
                            <div className="table-controls">
                                <div className="search-wrapper">
                                    <Search size={20} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="input search-input"
                                    />
                                </div>

                                <div className="filter-wrapper">
                                    <Filter size={20} className="filter-icon" />
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value as any)}
                                        className="filter-select"
                                    >
                                        <option value="all">All Roles</option>
                                        <option value="user">Users</option>
                                        <option value="recruiter">Recruiters</option>
                                        <option value="admin">Admins</option>
                                    </select>
                                </div>
                            </div>

                            <div className="table-wrapper">
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Email</th>
                                            <th>Current Role</th>
                                            <th>Change Role</th>
                                            <th>Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="no-users">
                                                    No users found matching your search.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map(user => (
                                                <tr key={user.id} className={user.id === currentUser?.id ? 'current-user' : ''}>
                                                    <td>
                                                        <div className="user-cell">
                                                            {user.photoURL ? (
                                                                <img
                                                                    src={user.photoURL}
                                                                    alt={user.name ? `${user.name} avatar` : 'User avatar'}
                                                                    className="user-avatar"
                                                                    loading="lazy"
                                                                    decoding="async"
                                                                    width={40}
                                                                    height={40}
                                                                />
                                                            ) : (
                                                                <div className="user-avatar-fallback">
                                                                    {user.name?.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="user-info">
                                                                <span className="user-name">{user.name}</span>
                                                                {user.id === currentUser?.id && (
                                                                    <span className="you-badge">You</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{user.email}</td>
                                                    <td>
                                                        <div className="role-badge" style={{ borderColor: getRoleColor(user.role || 'user') }}>
                                                            {getRoleIcon(user.role || 'user')}
                                                            <span style={{ color: getRoleColor(user.role || 'user') }}>
                                                                {(user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={user.role || 'user'}
                                                            onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                                                            disabled={updating === user.id}
                                                            className="role-select"
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="recruiter">Recruiter</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </td>
                                                    <td className="date-cell">
                                                        {user.createdAt.toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            )))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'posts' && (
                    <AdminPosts />
                )}

                {activeTab === 'templates' && (
                    <AdminTemplates />
                )}
            </div>
            <style>{`
                .admin-dashboard {
                    min-height: 100vh;
                    padding: var(--spacing-xl) 0;
                    background:
                        radial-gradient(1200px 600px at 10% -20%, rgba(0, 212, 170, 0.08), transparent 70%),
                        radial-gradient(900px 500px at 90% 0%, rgba(6, 182, 212, 0.08), transparent 70%),
                        var(--color-bg-primary);
                }

                .admin-container {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-lg);
                    min-height: 100vh;
                }

                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: var(--spacing-lg);
                    margin-bottom: var(--spacing-lg);
                }

                .admin-eyebrow {
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    font-size: 11px;
                    color: var(--color-text-tertiary);
                    margin-bottom: var(--spacing-xs);
                }

                .dashboard-header h1 {
                    font-size: clamp(1.8rem, 2vw + 1.2rem, 2.6rem);
                    margin: 0 0 var(--spacing-xs) 0;
                }

                .dashboard-header p {
                    font-size: var(--font-size-lg);
                    color: var(--color-text-secondary);
                    margin: 0;
                    max-width: 620px;
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

                .tabs-container {
                    display: inline-flex;
                    gap: 8px;
                    padding: 6px;
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-full);
                    width: fit-content;
                }

                .tab-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 18px;
                    border: none;
                    background: transparent;
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--color-text-secondary);
                    cursor: pointer;
                    border-radius: var(--radius-full);
                    transition: all var(--transition-base);
                }

                .tab-btn:hover {
                    color: var(--color-text-primary);
                    background: var(--color-bg-tertiary);
                }

                .tab-btn.active {
                    color: var(--color-text-inverse);
                    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
                    box-shadow: var(--shadow-sm);
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
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

                .stat-accent .stat-icon {
                    background: linear-gradient(135deg, var(--color-accent), #22d3ee);
                }

                .stat-danger .stat-icon {
                    background: linear-gradient(135deg, var(--color-danger), #f87171);
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

                .users-table-container {
                    background: var(--color-surface);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-lg);
                    box-shadow: var(--shadow-sm);
                    border: 1px solid var(--color-border);
                }

                .table-wrapper {
                    overflow-x: auto;
                }

                .users-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .users-table thead {
                    background: var(--color-bg-secondary);
                }

                .users-table th {
                    padding: 12px 16px;
                    text-align: left;
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--color-text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid var(--color-border);
                }

                .users-table td {
                    padding: 16px;
                    border-bottom: 1px solid var(--color-border-light);
                }

                .users-table tbody tr {
                    transition: background var(--transition-fast);
                }

                .users-table tbody tr:hover {
                    background: var(--color-bg-secondary);
                }

                .users-table tbody tr.current-user {
                    background: rgba(16, 185, 129, 0.08);
                }

                .user-cell {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .user-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    object-fit: cover;
                }

                .user-avatar-fallback {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 16px;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .user-name {
                    font-weight: 600;
                    color: var(--color-text-primary);
                }

                .you-badge {
                    padding: 2px 8px;
                    background: var(--color-success);
                    color: white;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 700;
                }

                .role-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 16px;
                    border: 2px solid;
                    font-size: 13px;
                    font-weight: 600;
                    background: var(--color-surface);
                }

                .role-select {
                    padding: 10px 12px;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    font-size: 14px;
                    font-weight: 500;
                    background: var(--color-surface);
                    cursor: pointer;
                    transition: border-color var(--transition-base), box-shadow var(--transition-base);
                }

                .role-select:hover {
                    border-color: var(--color-primary);
                }

                .role-select:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .date-cell {
                    color: var(--color-text-secondary);
                    font-size: var(--font-size-sm);
                }

                .table-controls {
                    display: flex;
                    gap: 16px;
                    margin-bottom: var(--spacing-lg);
                    align-items: center;
                }

                .search-wrapper {
                    position: relative;
                    flex: 1;
                }

                .search-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--color-text-tertiary);
                }

                .search-input {
                    padding-left: 40px;
                }

                .filter-wrapper {
                    position: relative;
                    min-width: 200px;
                }

                .filter-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--color-text-tertiary);
                    pointer-events: none;
                }

                .filter-select {
                    width: 100%;
                    padding: 10px 12px 10px 40px;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    font-size: 14px;
                    background: var(--color-surface);
                    cursor: pointer;
                    appearance: none;
                }

                .no-users {
                    text-align: center;
                    padding: 40px !important;
                    color: var(--color-text-secondary);
                    font-size: var(--font-size-sm);
                }

                .loading-state {
                    text-align: center;
                    padding: 48px;
                    color: var(--color-text-secondary);
                    font-size: var(--font-size-base);
                }

                .admin-posts {
                    background: var(--color-surface);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-lg);
                    border: 1px solid var(--color-border);
                    box-shadow: var(--shadow-sm);
                }

                .admin-create-blog {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-xl);
                    padding: var(--spacing-md);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    background: var(--color-bg-secondary);
                }

                .admin-create-blog-form {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .admin-create-blog-form textarea {
                    resize: vertical;
                    min-height: 140px;
                }

                .admin-selected-image {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 8px 10px;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    background: var(--color-surface);
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                }

                .admin-create-blog-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                }

                .admin-posts-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: var(--spacing-lg);
                    margin-bottom: var(--spacing-lg);
                }

                .admin-subtitle {
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                    margin: 0;
                }

                .count-chip {
                    padding: 6px 12px;
                    border-radius: var(--radius-full);
                    border: 1px solid var(--color-border);
                    background: var(--color-bg-secondary);
                    font-size: var(--font-size-xs);
                    color: var(--color-text-secondary);
                }

                .admin-posts-toolbar {
                    margin-bottom: var(--spacing-lg);
                }

                .posts-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                }

                .post-row {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: var(--spacing-md);
                    padding: var(--spacing-md);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--color-border);
                    background: var(--color-bg-secondary);
                    transition: box-shadow var(--transition-base), transform var(--transition-base);
                }

                .post-row:hover {
                    box-shadow: var(--shadow-sm);
                    transform: translateY(-1px);
                }

                .post-main {
                    flex: 1;
                    min-width: 0;
                }

                .post-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .post-author {
                    font-weight: 600;
                    color: var(--color-text-primary);
                }

                .post-time {
                    font-size: var(--font-size-xs);
                    color: var(--color-text-tertiary);
                }

                .post-content {
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                    margin: 0 0 10px 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .post-stats {
                    display: flex;
                    gap: 16px;
                    font-size: var(--font-size-xs);
                    color: var(--color-text-tertiary);
                }

                .post-stat {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }

                .post-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-danger {
                    background: var(--color-danger);
                    color: white;
                    border: none;
                }

                .btn-danger:hover:not(:disabled) {
                    background: #dc2626;
                }

                .icon-btn {
                    padding: 8px;
                    border-radius: var(--radius-md);
                }

                .admin-empty {
                    text-align: center;
                    padding: 32px;
                    color: var(--color-text-secondary);
                    font-size: var(--font-size-sm);
                }

                .admin-empty-card {
                    border: 1px dashed var(--color-border);
                    border-radius: var(--radius-lg);
                    background: var(--color-bg-secondary);
                }

                @media (max-width: 768px) {
                    .admin-dashboard {
                        padding: var(--spacing-lg) 0;
                    }

                    .dashboard-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .header-chip {
                        width: 100%;
                        text-align: left;
                    }

                    .tabs-container {
                        width: 100%;
                        overflow-x: auto;
                        white-space: nowrap;
                        display: flex; /* Override inline-flex to allow scroll */
                        padding: 8px;
                        border-radius: var(--radius-lg);
                        -webkit-overflow-scrolling: touch;
                    }

                    .tab-btn {
                        flex-shrink: 0;
                    }

                    .table-controls {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                    }

                    .search-wrapper,
                    .filter-wrapper {
                        width: 100%;
                    }

                    .users-table-container {
                        padding: var(--spacing-sm);
                    }

                    .user-cell {
                        gap: 8px;
                    }

                    .user-avatar, .user-avatar-fallback {
                        width: 32px;
                        height: 32px;
                        font-size: 14px;
                    }

                    .user-name {
                        font-size: 13px;
                    }

                    .role-badge {
                        padding: 4px 8px;
                        font-size: 11px;
                    }

                    .users-table {
                        font-size: 14px;
                    }

                    .users-table th,
                    .users-table td {
                        padding: 12px 8px;
                    }

                    .admin-selected-image {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .admin-create-blog-actions {
                        width: 100%;
                        justify-content: stretch;
                    }

                    .admin-create-blog-actions .btn {
                        flex: 1;
                    }
                }
            `}</style>
        </div>
    );
};
