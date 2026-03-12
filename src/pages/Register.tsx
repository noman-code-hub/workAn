import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoleBasedRedirect } from '../hooks/useRoleBasedRedirect';
import { Eye, EyeOff, Mail, Lock, AlertCircle, User as UserIcon, Briefcase, Github } from 'lucide-react';
import { BRAND } from '../config/brand';

export const Register = () => {

    const [name, setName] = useState('');
    const [role, setRole] = useState('user'); // Default to 'user'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, loginWithGoogle, loginWithGithub, user, loading: authLoading } = useAuth();

    // Auto-redirect when user logs in/registers
    useRoleBasedRedirect(user, authLoading);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const selectedRole = role === 'recruiter' ? 'recruiter' : 'user';
            await register(email, password, name, selectedRole);
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);

        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google signup failed.');
            setLoading(false);
        }
    };

    const handleGithubLogin = async () => {
        setError('');
        setLoading(true);

        try {
            await loginWithGithub();
        } catch (err: any) {
            setError(err.message || 'GitHub signup failed.');
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Left Side - Branding */}
                <div className="login-left">
                    <div className="branding">
                        <div className="brand-icon">
                            <img
                                src={BRAND.logo.glyph}
                                alt={`${BRAND.name} logo`}
                                className="brand-icon-img"
                                loading="lazy"
                                decoding="async"
                            />
                        </div>
                        <h1>Join {BRAND.name}</h1>
                        <p>Start your journey to the perfect career</p>
                    </div>
                    <div className="features">
                        <div className="feature-item">
                            <div className="feature-icon">🚀</div>
                            <div>
                                <h3>Launch Your Career</h3>
                                <p>Access thousands of curated job opportunities</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">📝</div>
                            <div>
                                <h3>Build Your Resume</h3>
                                <p>Create professional resumes with our AI builder</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">🌟</div>
                            <div>
                                <h3>Stand Out</h3>
                                <p>Get personalized tips to improve your profile</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Register Form */}
                <div className="login-right">
                    <div className="login-form-wrapper">
                        <div className="form-header">
                            <h2>Create Account</h2>
                            <p>Sign up to get started with Workshour</p>
                        </div>

                        {error && (
                            <div className="error-message">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleRegister}>
                            {/* Role Selection */}
                            <div className="form-group">
                                <label>I am a...</label>
                                <div className="role-selector">
                                    <button
                                        type="button"
                                        className={`role-btn ${role === 'user' ? 'active' : ''}`}
                                        onClick={() => setRole('user')}
                                    >
                                        <UserIcon size={18} />
                                        <span>Job Seeker</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`role-btn ${role === 'recruiter' ? 'active' : ''}`}
                                        onClick={() => setRole('recruiter')}
                                    >
                                        <Briefcase size={18} />
                                        <span>Recruiter</span>
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Full Name</label>
                                <div className="input-wrapper">
                                    <UserIcon size={20} />
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Email Address</label>
                                <div className="input-wrapper">
                                    <Mail size={20} />
                                    <input
                                        type="email"
                                        placeholder="your.email@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Password</label>
                                <div className="input-wrapper">
                                    <Lock size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Create a password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </form>

                        <div className="divider">
                            <span>OR</span>
                        </div>

                        <button
                            type="button"
                            className="btn-google"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20">
                                <path fill="#4285F4" d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z" />
                                <path fill="#34A853" d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z" />
                                <path fill="#FBBC05" d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z" />
                                <path fill="#EA4335" d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z" />
                            </svg>
                            Continue with Google
                        </button>

                        <button
                            type="button"
                            className="btn-github"
                            onClick={handleGithubLogin}
                            disabled={loading}
                        >
                            <Github size={20} />
                            Continue with GitHub
                        </button>

                        <div className="signup-link">
                            Already have an account? <Link to="/login">Sign in</Link>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .login-page {
                    min-height: 100vh;
                    min-height: 100svh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    padding: clamp(20px, 4vw, 40px);
                }

                .login-container {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    max-width: 1080px;
                    width: 100%;
                    background: white;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                }

                .login-left {
                    background: linear-gradient(135deg, #00d4aa 0%, #004182 100%);
                    color: white;
                    padding: 60px 40px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .branding {
                    text-align: center;
                }

                .brand-icon {
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #1dbf73 0%, #00d4aa 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
                }

                .brand-icon-img {
                    width: 52px;
                    height: 52px;
                    object-fit: contain;
                    filter: brightness(0) invert(1);
                }

                .branding h1 {
                    font-size: 36px;
                    font-weight: 800;
                    margin: 0 0 12px 0;
                }

                .branding p {
                    font-size: 18px;
                    opacity: 0.9;
                    margin: 0;
                }

                .features {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    margin-top: 40px;
                }

                .feature-item {
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 20px;
                    border-radius: 16px;
                    backdrop-filter: blur(10px);
                }

                .feature-icon {
                    font-size: 32px;
                    line-height: 1;
                }

                .feature-item h3 {
                    margin: 0 0 8px 0;
                    font-size: 18px;
                    font-weight: 700;
                }

                .feature-item p {
                    margin: 0;
                    opacity: 0.9;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .login-right {
                    padding: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .login-form-wrapper {
                    width: 100%;
                    max-width: 380px;
                }

                .form-header {
                    margin-bottom: 32px;
                }

                .form-header h2 {
                    font-size: 32px;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 8px 0;
                }

                .form-header p {
                    color: #6b7280;
                    margin: 0;
                    font-size: 16px;
                }

                .error-message {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #fee2e2;
                    color: #dc2626;
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    font-size: 14px;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-wrapper svg {
                    position: absolute;
                    left: 16px;
                    color: #9ca3af;
                    pointer-events: none;
                }

                .input-wrapper input {
                    width: 100%;
                    padding: 12px 16px 12px 48px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 15px;
                    transition: all 0.2s;
                }

                .input-wrapper input:focus {
                    outline: none;
                    border-color: #00d4aa;
                    box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.1);
                }

                .input-wrapper input:disabled {
                    background: #f9fafb;
                    cursor: not-allowed;
                }

                .toggle-password {
                    position: absolute;
                    right: 12px;
                    background: none;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                }

                .toggle-password:hover {
                    color: #6b7280;
                }

                .btn-primary {
                    width: 100%;
                    padding: 14px;
                    background: #00d4aa;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #00b894;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
                }

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .divider {
                    text-align: center;
                    margin: 24px 0;
                    position: relative;
                }

                .divider::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: #e5e7eb;
                }

                .divider span {
                    position: relative;
                    background: white;
                    padding: 0 16px;
                    color: #9ca3af;
                    font-size: 14px;
                    font-weight: 600;
                }

                .btn-google {
                    width: 100%;
                    padding: 14px;
                    background: white;
                    color: #374151;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    transition: all 0.2s;
                }

                .btn-google:hover:not(:disabled) {
                    background: #f9fafb;
                    border-color: #d1d5db;
                }

                .btn-google:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-github {
                    width: 100%;
                    padding: 14px;
                    margin-top: 12px;
                    background: #0f172a;
                    color: #ffffff;
                    border: 2px solid #0f172a;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    transition: all 0.2s;
                }

                .btn-github:hover:not(:disabled) {
                    background: #111827;
                    border-color: #111827;
                }

                .btn-github:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .signup-link {
                    text-align: center;
                    margin-top: 24px;
                    color: #6b7280;
                    font-size: 14px;
                }

                .signup-link a {
                    color: #00d4aa;
                    text-decoration: none;
                    font-weight: 700;
                }

                .signup-link a:hover {
                    text-decoration: underline;
                }

                @media (max-width: 1200px) {
                    .login-container {
                        max-width: 960px;
                    }

                    .login-left {
                        padding: 48px 40px;
                    }

                    .login-right {
                        padding: 48px 44px;
                    }

                    .login-form-wrapper {
                        max-width: 380px;
                    }
                }

                @media (max-width: 1024px) {
                    .login-container {
                        grid-template-columns: 1fr;
                    }

                    .login-left {
                        display: none;
                    }

                    .login-right {
                        padding: 40px 20px;
                    }

                    .login-form-wrapper {
                        max-width: 460px;
                    }
                }

                @media (max-width: 900px) {
                    .login-container {
                        max-width: 820px;
                    }

                    .login-left {
                        padding: 44px 34px;
                    }

                    .feature-item {
                        padding: 16px 18px;
                    }
                }

                @media (max-width: 768px) {
                    .login-right {
                        padding: 32px 18px;
                    }

                    .login-form-wrapper {
                        max-width: 100%;
                    }

                    .form-header h2 {
                        font-size: 26px;
                    }
                }

                @media (max-width: 640px) {
                    .login-container {
                        border-radius: 22px;
                    }

                    .form-header p {
                        font-size: 14px;
                    }
                }

                @media (max-width: 480px) {
                    .form-header h2 {
                        font-size: 24px;
                    }

                    .login-right {
                        padding: 30px 16px;
                    }

                    .role-selector {
                        grid-template-columns: 1fr;
                    }

                    .btn-primary,
                    .btn-google {
                        font-size: 15px;
                    }
                }

                @media (max-width: 360px) {
                    .login-page {
                        padding: 20px 12px;
                    }
                }

                @media (max-height: 760px) {
                    .login-page {
                        align-items: center;
                        padding-top: 16px;
                        padding-bottom: 16px;
                    }

                    .login-left {
                        padding: 40px 36px;
                    }

                    .brand-icon {
                        width: 68px;
                        height: 68px;
                        margin-bottom: 14px;
                    }

                    .brand-icon-img {
                        width: 44px;
                        height: 44px;
                    }

                    .branding h1 {
                        font-size: 28px;
                        margin-bottom: 8px;
                    }

                    .branding p {
                        font-size: 14px;
                    }

                    .features {
                        gap: 14px;
                        margin-top: 24px;
                    }

                    .feature-item {
                        padding: 12px 14px;
                    }

                    .feature-item h3 {
                        font-size: 15px;
                        margin-bottom: 6px;
                    }

                    .feature-item p {
                        font-size: 12px;
                    }

                    .login-right {
                        padding: 36px 36px;
                    }

                    .login-form-wrapper {
                        max-width: 420px;
                    }

                    .form-header {
                        margin-bottom: 20px;
                    }

                    .form-header h2 {
                        font-size: 24px;
                    }

                    .form-header p {
                        font-size: 14px;
                    }

                    .form-group {
                        margin-bottom: 14px;
                    }

                    .input-wrapper input {
                        padding: 10px 14px 10px 44px;
                        font-size: 14px;
                    }

                    .btn-primary,
                    .btn-google {
                        padding: 12px;
                        font-size: 14px;
                    }

                    .divider {
                        margin: 18px 0;
                    }

                    .signup-link {
                        margin-top: 18px;
                    }
                }


                /* Role Selector Styles */
                .role-selector {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 8px;
                }

                .role-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 10px;
                    background: #f9fafb;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    cursor: pointer;
                    color: #6b7280;
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.2s;
                }

                .role-btn:hover {
                    background: #f3f4f6;
                    border-color: #d1d5db;
                }

                .role-btn.active {
                    background: #f0fdf9;
                    border-color: #00d4aa;
                    color: #00d4aa;
                }
            `}</style>
        </div>
    );
};
