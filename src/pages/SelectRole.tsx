import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Briefcase } from 'lucide-react';

export const SelectRole = () => {
    const { user, updateProfile, loading } = useAuth();
    const navigate = useNavigate();

    // If user already has a role, redirect to appropriate dashboard
    if (!loading && user?.role) {
        switch (user.role) {
            case 'admin':
                navigate('/admin-dashboard', { replace: true });
                break;
            case 'recruiter':
                navigate('/recruiter', { replace: true });
                break;
            case 'user':
            default:
                navigate('/dashboard', { replace: true });
                break;
        }
        return null;
    }

    // Redirect to login if not authenticated
    if (!loading && !user) {
        navigate('/login', { replace: true });
        return null;
    }

    const handleRoleSelect = async (role: 'user' | 'recruiter') => {
        if (!user) return;

        try {
            await updateProfile({ role });

            switch (role) {
                case 'recruiter':
                    navigate('/recruiter', { replace: true });
                    break;
                case 'user':
                default:
                    navigate('/dashboard', { replace: true });
                    break;
            }
        } catch (error) {
            console.error('Failed to update role:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Loading...
            </div>
        );
    }

    return (
        <div className="select-role-page">
            <div className="sr-container">
                <div className="sr-header">
                    <h1>Select Your Role</h1>
                    <p>Tell us how you plan to use Workshour</p>
                </div>

                <div className="roles-grid">
                    <button
                        className="role-card"
                        onClick={() => handleRoleSelect('user')}
                    >
                        <div className="role-icon role-icon-user">
                            <UserIcon size={40} />
                        </div>
                        <div className="role-card-text">
                            <h3>Job Seeker</h3>
                            <p>I'm looking for job opportunities and career growth.</p>
                        </div>
                    </button>

                    <button
                        className="role-card"
                        onClick={() => handleRoleSelect('recruiter')}
                    >
                        <div className="role-icon role-icon-recruiter">
                            <Briefcase size={40} />
                        </div>
                        <div className="role-card-text">
                            <h3>Recruiter</h3>
                            <p>I want to post jobs and find great talent.</p>
                        </div>
                    </button>
                </div>
            </div>

            <style>{`
                .select-role-page {
                    min-height: 100vh;
                    min-height: 100svh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                    padding: clamp(16px, 4vw, 40px);
                }

                .sr-container {
                    max-width: 860px;
                    width: 100%;
                    text-align: center;
                }

                .sr-header {
                    margin-bottom: 48px;
                }

                .sr-header h1 {
                    font-size: clamp(1.75rem, 5vw, 2.5rem);
                    font-weight: 800;
                    color: #111827;
                    margin: 0 0 12px 0;
                }

                .sr-header p {
                    font-size: clamp(1rem, 2.5vw, 1.125rem);
                    color: #6b7280;
                    margin: 0;
                }

                .roles-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 28px;
                }

                .role-card {
                    background: white;
                    border: 2px solid transparent;
                    border-radius: 24px;
                    padding: 40px 32px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                    min-height: 200px;
                }

                .role-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                }

                .role-card:focus {
                    outline: none;
                    border-color: #00d4aa;
                }

                .role-card:focus-visible {
                    outline: 3px solid #00d4aa;
                    outline-offset: 2px;
                }

                .role-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: background 0.2s, color 0.2s;
                }

                .role-icon-user {
                    background: #e0f2fe;
                    color: #0ea5e9;
                }

                .role-card:hover .role-icon-user {
                    background: #0ea5e9;
                    color: white;
                }

                .role-icon-recruiter {
                    background: #dcfce7;
                    color: #22c55e;
                }

                .role-card:hover .role-icon-recruiter {
                    background: #22c55e;
                    color: white;
                }

                .role-card-text h3 {
                    font-size: 1.4rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 8px 0;
                }

                .role-card-text p {
                    font-size: 1rem;
                    color: #6b7280;
                    margin: 0;
                    line-height: 1.5;
                }

                /* ── RESPONSIVE ─────────────────────────────── */
                @media (max-width: 640px) {
                    .sr-header {
                        margin-bottom: 32px;
                    }

                    .roles-grid {
                        gap: 16px;
                    }
                }

                @media (max-width: 480px) {
                    .select-role-page {
                        align-items: flex-start;
                        padding-top: 48px;
                    }

                    .roles-grid {
                        grid-template-columns: 1fr;
                    }

                    .role-card {
                        flex-direction: row;
                        text-align: left;
                        padding: 24px 20px;
                        gap: 16px;
                        min-height: 80px;
                    }

                    .role-icon {
                        width: 56px;
                        height: 56px;
                        border-radius: 14px;
                    }
                }

                @media (max-width: 375px) {
                    .select-role-page {
                        padding-top: 36px;
                    }

                    .role-icon {
                        width: 48px;
                        height: 48px;
                    }

                    .role-card-text h3 {
                        font-size: 1.2rem;
                    }

                    .role-card-text p {
                        font-size: 0.9rem;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .role-card {
                        transition: none !important;
                    }
                }
            `}</style>
        </div>
    );
};
