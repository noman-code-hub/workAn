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
            // Update role in Firestore and local state
            await updateProfile({ role });

            // Navigation will be handled by the effect above on next render
            // or explicit navigation here for faster feedback
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
            // Handle error (maybe show toast)
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
            <div className="container">
                <div className="header">
                    <h1>Select Your Role</h1>
                    <p>Tell us how you plan to use CareerPilot</p>
                </div>

                <div className="roles-grid">
                    <button
                        className="role-card"
                        onClick={() => handleRoleSelect('user')}
                    >
                        <div className="icon user">
                            <UserIcon size={48} />
                        </div>
                        <h3>Job Seeker</h3>
                        <p>I'm looking for job opportunities and career growth.</p>
                    </button>

                    <button
                        className="role-card"
                        onClick={() => handleRoleSelect('recruiter')}
                    >
                        <div className="icon recruiter">
                            <Briefcase size={48} />
                        </div>
                        <h3>Recruiter</h3>
                        <p>I want to post jobs and find great talent.</p>
                    </button>
                </div>
            </div>

            <style>{`
                .select-role-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                    padding: 20px;
                }

                .container {
                    max-width: 900px;
                    width: 100%;
                    text-align: center;
                }

                .header {
                    margin-bottom: 48px;
                }

                .header h1 {
                    font-size: 36px;
                    font-weight: 800;
                    color: #111827;
                    margin: 0 0 12px 0;
                }

                .header p {
                    font-size: 18px;
                    color: #6b7280;
                }

                .roles-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 32px;
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
                }

                .role-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                }

                .role-card:focus {
                    outline: none;
                    border-color: #00d4aa;
                }

                .icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 8px;
                }

                .icon.user {
                    background: #e0f2fe;
                    color: #0ea5e9;
                }

                .role-card:hover .icon.user {
                    background: #0ea5e9;
                    color: white;
                }

                .icon.recruiter {
                    background: #dcfce7;
                    color: #22c55e;
                }

                .role-card:hover .icon.recruiter {
                    background: #22c55e;
                    color: white;
                }

                .role-card h3 {
                    font-size: 24px;
                    font-weight: 700;
                    color: #111827;
                    margin: 0;
                }

                .role-card p {
                    font-size: 16px;
                    color: #6b7280;
                    margin: 0;
                    line-height: 1.5;
                }
            `}</style>
        </div>
    );
};
