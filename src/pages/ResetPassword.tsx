import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setNotice('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (!isSupabaseConfigured || !supabase) {
            setError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
            return;
        }

        setLoading(true);
        try {
            const { data, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !data.session) {
                throw new Error('Reset link is invalid or expired. Please request a new one.');
            }

            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            setNotice('Password updated. You can sign in now.');
            setTimeout(() => navigate('/login', { replace: true }), 1200);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reset-page">
            <div className="reset-card">
                <h1>Reset password</h1>
                <p>Choose a new password for your account.</p>

                {error && (
                    <div className="message error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}
                {notice && (
                    <div className="message info">
                        <AlertCircle size={18} />
                        <span>{notice}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <label>New password</label>
                    <div className="input-row">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter a new password"
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className="toggle"
                            onClick={() => setShowPassword((prev) => !prev)}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <label>Confirm password</label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        required
                        disabled={loading}
                    />

                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? 'Updating...' : 'Update password'}
                    </button>
                </form>

                <div className="footer">
                    <Link to="/login">Back to login</Link>
                </div>
            </div>

            <style>{`
                .reset-page {
                    min-height: 100vh;
                    min-height: 100svh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 32px 16px;
                    background: linear-gradient(135deg, #0f2342 0%, #0d5f73 48%, #0b756f 100%);
                }

                .reset-card {
                    width: min(440px, 100%);
                    background: #ffffff;
                    border-radius: 18px;
                    padding: 32px;
                    box-shadow: 0 22px 50px rgba(15, 23, 42, 0.18);
                    border: 1px solid #e2e8f0;
                }

                .reset-card h1 {
                    margin: 0 0 8px 0;
                    font-size: 26px;
                    font-weight: 800;
                    color: #0f172a;
                }

                .reset-card p {
                    margin: 0 0 24px 0;
                    color: #64748b;
                    font-size: 14px;
                }

                form {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                label {
                    font-size: 13px;
                    font-weight: 700;
                    color: #0f172a;
                }

                input {
                    width: 100%;
                    padding: 12px 14px;
                    border: 1px solid #d6e0ea;
                    border-radius: 10px;
                    font-size: 14px;
                }

                .input-row {
                    position: relative;
                }

                .input-row input {
                    padding-right: 42px;
                }

                .toggle {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 4px;
                }

                .btn {
                    margin-top: 8px;
                    background: linear-gradient(135deg, #17c9b0 0%, #38d7c2 100%);
                    color: #ffffff;
                    border: none;
                    border-radius: 10px;
                    padding: 12px;
                    font-weight: 700;
                    font-size: 15px;
                    cursor: pointer;
                }

                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .message {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 14px;
                    border-radius: 10px;
                    font-size: 13px;
                    margin-bottom: 16px;
                }

                .message.error {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .message.info {
                    background: #dbeafe;
                    color: #1d4ed8;
                }

                .footer {
                    margin-top: 16px;
                    text-align: center;
                    font-size: 13px;
                }

                .footer a {
                    color: #17c9b0;
                    text-decoration: none;
                    font-weight: 700;
                }
            `}</style>
        </div>
    );
};
