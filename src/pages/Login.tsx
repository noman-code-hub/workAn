import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRoleBasedRedirect } from '../hooks/useRoleBasedRedirect';
import { AlertCircle, Github } from 'lucide-react';
import { BRAND } from '../config/brand';

export const Login = () => {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { loginWithGoogle, loginWithGithub, user, loading: authLoading } = useAuth();

    // Auto-redirect when user logs in
    useRoleBasedRedirect(user, authLoading);

    useEffect(() => {
        if (!authLoading) {
            setLoading(false);
        }
    }, [authLoading]);

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);

        try {
            await loginWithGoogle();
            // Navigation will be handled by AuthContext after user data is loaded
        } catch (err: any) {
            setError(err.message || 'Google login failed.');
            setLoading(false);
        }
    };

    const handleGithubLogin = async () => {
        setError('');
        setLoading(true);

        try {
            await loginWithGithub();
            // Navigation will be handled by AuthContext after user data is loaded
        } catch (err: any) {
            setError(err.message || 'GitHub login failed.');
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-atmo login-atmo-1" aria-hidden="true" />
            <div className="login-atmo login-atmo-2" aria-hidden="true" />
            <div className="login-container">
                {/* Left Side - Branding */}
                <div className="login-left">
                    <div className="branding">
                        <div className="brand-icon">
                            <img
                                src={BRAND.logo.glyph}
                                srcSet={`${BRAND.logo.glyph} 52w, ${BRAND.logo.glyph2x} 104w`}
                                sizes="52px"
                                alt={`${BRAND.name} logo`}
                                className="brand-icon-img"
                                loading="lazy"
                                decoding="async"
                                width={52}
                                height={52}
                            />
                        </div>
                        <h1>{BRAND.name}</h1>
                        <p>{BRAND.tagline}</p>
                    </div>
                    <div className="features">
                        <div className="feature-item">
                            <div className="feature-icon">✨</div>
                            <div>
                                <h3>Smart Job Matching</h3>
                                <p>AI-powered job recommendations tailored to your profile</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">📊</div>
                            <div>
                                <h3>Resume Analytics</h3>
                                <p>Get detailed insights and optimization suggestions</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">🤖</div>
                            <div>
                                <h3>AI Career Copilot</h3>
                                <p>24/7 career guidance powered by advanced AI</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="login-right">
                    <div className="login-form-wrapper">
                        <div className="form-header">
                            <h2>Welcome Back</h2>
                            <p>Sign in to continue your career journey</p>
                        </div>

                        {error && (
                            <div className="error-message">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className="oauth-intro">
                            Sign in with your Google or GitHub account to continue.
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
                    </div>
                </div>
            </div>

            <style>{`
                .login-page {
                    min-height: 100vh;
                    min-height: 100svh;
                    position: relative;
                    overflow: hidden;
                    background:
                        radial-gradient(circle at 18% 18%, rgba(23, 201, 176, 0.18), transparent 42%),
                        radial-gradient(circle at 85% 12%, rgba(59, 130, 246, 0.16), transparent 38%),
                        linear-gradient(180deg, #f7fcff 0%, #eef7fb 50%, #e7f5f2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: clamp(20px, 4vw, 40px);
                }

                .login-atmo {
                    position: absolute;
                    width: 420px;
                    height: 420px;
                    border-radius: 50%;
                    filter: blur(20px);
                    opacity: 0.45;
                    pointer-events: none;
                }

                .login-atmo-1 {
                    background: radial-gradient(circle, rgba(20, 184, 166, 0.4), transparent 60%);
                    top: -120px;
                    left: -120px;
                }

                .login-atmo-2 {
                    background: radial-gradient(circle, rgba(14, 116, 144, 0.28), transparent 60%);
                    bottom: -140px;
                    right: -140px;
                }

                .login-container {
                    display: grid;
                    grid-template-columns: 1.05fr 0.95fr;
                    max-width: 1080px;
                    width: 100%;
                    background: var(--color-surface);
                    border-radius: 28px;
                    overflow: hidden;
                    border: 1px solid rgba(208, 219, 234, 0.9);
                    box-shadow: 0 28px 70px rgba(15, 23, 42, 0.14);
                    position: relative;
                    z-index: 1;
                }

                .login-left {
                    background:
                        radial-gradient(circle at 20% 15%, rgba(255, 255, 255, 0.42), transparent 35%),
                        radial-gradient(circle at 80% 0%, rgba(45, 212, 191, 0.28), transparent 40%),
                        linear-gradient(155deg, #0e7490 0%, #2dd4bf 55%, #0f766e 100%);
                    color: white;
                    padding: 56px 48px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    position: relative;
                    overflow: hidden;
                }

                .login-left::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
                    background-size: 18px 18px;
                    opacity: 0.25;
                    pointer-events: none;
                }

                .branding {
                    text-align: center;
                    position: relative;
                    z-index: 1;
                }

                .brand-icon {
                    width: 80px;
                    height: 80px;
                    background: radial-gradient(circle at 30% 30%, #35e0c2 0%, #16c3a9 45%, #0c7c76 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    box-shadow:
                        0 12px 26px rgba(6, 22, 41, 0.28),
                        0 0 0 6px rgba(255, 255, 255, 0.08);
                }

                .brand-icon-img {
                    width: 52px;
                    height: 52px;
                    object-fit: contain;
                    filter: brightness(0) invert(1);
                }

                .branding h1 {
                    font-size: 34px;
                    font-weight: 800;
                    font-family: var(--font-family-brand);
                    letter-spacing: -0.02em;
                    margin: 0 0 12px 0;
                }

                .branding p {
                    font-size: 16px;
                    opacity: 0.88;
                    margin: 0;
                }

                .features {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    margin-top: 40px;
                    position: relative;
                    z-index: 1;
                }

                .feature-item {
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                    background: rgba(255, 255, 255, 0.12);
                    padding: 18px 20px;
                    border-radius: 18px;
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    backdrop-filter: blur(12px);
                    box-shadow: 0 12px 20px rgba(6, 22, 41, 0.18);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .feature-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 16px 24px rgba(6, 22, 41, 0.22);
                }

                .feature-icon {
                    font-size: 28px;
                    line-height: 1;
                }

                .feature-item h3 {
                    margin: 0 0 8px 0;
                    font-size: 17px;
                    font-weight: 700;
                }

                .feature-item p {
                    margin: 0;
                    opacity: 0.88;
                    font-size: 13px;
                    line-height: 1.5;
                }

                .login-right {
                    padding: 56px 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(180deg, #ffffff 0%, #f8fcff 100%);
                }

                .login-form-wrapper {
                    width: 100%;
                    max-width: 400px;
                    background: #ffffff;
                    border-radius: 22px;
                    padding: 32px 34px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
                }

                .form-header {
                    margin-bottom: 32px;
                }

                .form-header h2 {
                    font-size: 30px;
                    font-weight: 800;
                    font-family: var(--font-family-brand);
                    color: #111827;
                    margin: 0 0 8px 0;
                }

                .form-header p {
                    color: #64748b;
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

                .oauth-intro {
                    font-size: 14px;
                    line-height: 1.6;
                    color: #64748b;
                    margin-bottom: 24px;
                }

                .btn-google {
                    width: 100%;
                    padding: 14px;
                    background: #ffffff;
                    color: #374151;
                    border: 1px solid #dfe7f0;
                    border-radius: 12px;
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
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
                }

                .btn-google:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-github {
                    width: 100%;
                    padding: 14px;
                    margin-top: 12px;
                    background: linear-gradient(135deg, #0f766e, #0ea5a3);
                    color: #ffffff;
                    border: 1px solid #0f766e;
                    border-radius: 12px;
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
                    border-color: #0f766e;
                    box-shadow: 0 10px 18px rgba(15, 118, 110, 0.22);
                }

                .btn-github:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                [data-theme="dark"] .login-page {
                    background:
                        radial-gradient(circle at 18% 18%, rgba(23, 201, 176, 0.16), transparent 42%),
                        radial-gradient(circle at 85% 12%, rgba(59, 130, 246, 0.16), transparent 38%),
                        linear-gradient(180deg, #07111f 0%, #0b1220 48%, #0f172a 100%);
                }

                [data-theme="dark"] .login-container,
                [data-theme="dark"] .login-form-wrapper {
                    background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
                    border-color: #243244;
                    box-shadow: 0 24px 60px rgba(2, 6, 23, 0.45);
                }

                [data-theme="dark"] .login-right {
                    background: linear-gradient(180deg, #0f172a 0%, #0b1220 100%);
                }

                [data-theme="dark"] .form-header h2,
                [data-theme="dark"] .branding h1,
                [data-theme="dark"] .feature-item h3 {
                    color: #e5eef8;
                }

                [data-theme="dark"] .form-header p,
                [data-theme="dark"] .oauth-intro {
                    color: #94a3b8;
                }

                [data-theme="dark"] .btn-google {
                    background: #0f172a;
                    color: #e5eef8;
                    border-color: #243244;
                }

                [data-theme="dark"] .btn-google:hover:not(:disabled) {
                    background: #111827;
                    border-color: #334155;
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
                        max-width: 400px;
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
                        padding: 36px 24px;
                    }

                    .login-form-wrapper {
                        padding: 28px;
                        max-width: 460px;
                    }

                    .login-atmo {
                        width: 320px;
                        height: 320px;
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
                        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
                    }

                    .form-header h2 {
                        font-size: 26px;
                    }

                    .login-atmo {
                        width: 280px;
                        height: 280px;
                    }
                }

                @media (max-width: 640px) {
                    .login-container {
                        border-radius: 22px;
                    }

                    .login-form-wrapper {
                        padding: 22px 20px;
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
                        padding: 28px 14px;
                    }

                    .login-form-wrapper {
                        padding: 20px 18px;
                        border-radius: 18px;
                    }

                    .login-container {
                        border-radius: 20px;
                    }

                    .btn-google {
                        font-size: 15px;
                    }

                    .login-atmo {
                        width: 240px;
                        height: 240px;
                    }
                }

                @media (max-width: 360px) {
                    .login-page {
                        padding: 20px 12px;
                    }

                    .login-form-wrapper {
                        padding: 18px 16px;
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
                        padding: 22px 24px;
                        border-radius: 18px;
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

                    .btn-google {
                        padding: 12px;
                        font-size: 14px;
                    }
                }
            `}</style>
        </div>
    );
};
