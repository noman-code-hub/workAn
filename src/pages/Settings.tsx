import { useState } from 'react';
import { User, Mail, Briefcase, MapPin, Phone, Globe, Bell, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Settings = () => {
    const { user, updateProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');
    const [showPassword, setShowPassword] = useState(false);
    const [saved, setSaved] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        profession: user?.profession || '',
        location: (user as any)?.location || '',
        phone: '',
        website: '',
    });

    const [notifications, setNotifications] = useState({
        emailJobs: true,
        emailMessages: true,
        emailUpdates: false,
        pushJobs: true,
        pushMessages: true,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleNotificationChange = (key: string) => {
        setNotifications({
            ...notifications,
            [key]: !notifications[key as keyof typeof notifications],
        });
    };

    const handleSave = () => {
        updateProfile(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'preferences', label: 'Preferences', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
    ];

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1>Settings</h1>
                <p>Manage your account and preferences</p>
            </div>

            {/* Tabs */}
            <div className="settings-tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id as any)}
                        >
                            <Icon size={20} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="settings-content">
                    <div className="card">
                        <h2>Personal Information</h2>
                        <p className="card-subtitle">Update your personal details and profile information</p>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="name">
                                    <User size={18} />
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    className="input"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">
                                    <Mail size={18} />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className="input"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="profession">
                                    <Briefcase size={18} />
                                    Profession
                                </label>
                                <input
                                    type="text"
                                    id="profession"
                                    name="profession"
                                    className="input"
                                    value={formData.profession}
                                    onChange={handleInputChange}
                                    placeholder="Software Engineer"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="location">
                                    <MapPin size={18} />
                                    Location
                                </label>
                                <input
                                    type="text"
                                    id="location"
                                    name="location"
                                    className="input"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    placeholder="San Francisco, CA"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">
                                    <Phone size={18} />
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    className="input"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="website">
                                    <Globe size={18} />
                                    Website
                                </label>
                                <input
                                    type="url"
                                    id="website"
                                    name="website"
                                    className="input"
                                    value={formData.website}
                                    onChange={handleInputChange}
                                    placeholder="https://yourwebsite.com"
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button className="btn btn-primary" onClick={handleSave}>
                                {saved ? '✓ Saved!' : 'Save Changes'}
                            </button>
                            <button className="btn btn-ghost">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
                <div className="settings-content">
                    <div className="card">
                        <h2>Notification Preferences</h2>
                        <p className="card-subtitle">Choose how you want to be notified</p>

                        <div className="preferences-section">
                            <h3>Email Notifications</h3>
                            <div className="preference-item">
                                <div className="preference-info">
                                    <div className="preference-label">Job Recommendations</div>
                                    <div className="preference-desc">Get notified about new job matches</div>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={notifications.emailJobs}
                                        onChange={() => handleNotificationChange('emailJobs')}
                                    />
                                    <span className="toggle-slider" />
                                </label>
                            </div>

                            <div className="preference-item">
                                <div className="preference-info">
                                    <div className="preference-label">Messages & Updates</div>
                                    <div className="preference-desc">Notifications about messages and replies</div>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={notifications.emailMessages}
                                        onChange={() => handleNotificationChange('emailMessages')}
                                    />
                                    <span className="toggle-slider" />
                                </label>
                            </div>

                            <div className="preference-item">
                                <div className="preference-info">
                                    <div className="preference-label">Platform Updates</div>
                                    <div className="preference-desc">News and feature announcements</div>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={notifications.emailUpdates}
                                        onChange={() => handleNotificationChange('emailUpdates')}
                                    />
                                    <span className="toggle-slider" />
                                </label>
                            </div>
                        </div>

                        <div className="preferences-section">
                            <h3>Push Notifications</h3>
                            <div className="preference-item">
                                <div className="preference-info">
                                    <div className="preference-label">Job Alerts</div>
                                    <div className="preference-desc">Instant alerts for matching jobs</div>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={notifications.pushJobs}
                                        onChange={() => handleNotificationChange('pushJobs')}
                                    />
                                    <span className="toggle-slider" />
                                </label>
                            </div>

                            <div className="preference-item">
                                <div className="preference-info">
                                    <div className="preference-label">Direct Messages</div>
                                    <div className="preference-desc">Get notified of new messages</div>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={notifications.pushMessages}
                                        onChange={() => handleNotificationChange('pushMessages')}
                                    />
                                    <span className="toggle-slider" />
                                </label>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button className="btn btn-primary" onClick={handleSave}>
                                {saved ? '✓ Saved!' : 'Save Preferences'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="settings-content">
                    <div className="card">
                        <h2>Security Settings</h2>
                        <p className="card-subtitle">Manage your password and security preferences</p>

                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label htmlFor="current-password">Current Password</label>
                                <div className="password-input">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="current-password"
                                        className="input"
                                        placeholder="Enter current password"
                                    />
                                    <button
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="new-password">New Password</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="new-password"
                                    className="input"
                                    placeholder="Enter new password"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirm-password">Confirm Password</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="confirm-password"
                                    className="input"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button className="btn btn-primary">Update Password</button>
                        </div>
                    </div>

                    <div className="card">
                        <h2>Two-Factor Authentication</h2>
                        <p className="card-subtitle">Add an extra layer of security to your account</p>
                        <div className="security-option">
                            <div>
                                <div className="security-label">Enable 2FA</div>
                                <div className="security-desc">Protect your account with two-factor authentication</div>
                            </div>
                            <button className="btn btn-secondary">Enable</button>
                        </div>
                    </div>

                    <div className="card danger-zone">
                        <h2>Danger Zone</h2>
                        <p className="card-subtitle">Irreversible actions</p>
                        <div className="security-option">
                            <div>
                                <div className="security-label">Delete Account</div>
                                <div className="security-desc">Permanently delete your account and all data</div>
                            </div>
                            <button className="btn btn-danger">Delete Account</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .settings-page {
          max-width: 900px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: var(--spacing-xl);
        }

        .page-header h1 {
          font-size: var(--font-size-3xl);
          margin-bottom: var(--spacing-xs);
        }

        .page-header p {
          font-size: var(--font-size-lg);
          color: var(--color-text-secondary);
        }

        .settings-tabs {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-xl);
          border-bottom: 2px solid var(--color-border);
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md) var(--spacing-lg);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          color: var(--color-text-secondary);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .tab-button:hover {
          color: var(--color-primary);
        }

        .tab-button.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }

        .settings-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .card h2 {
          font-size: var(--font-size-2xl);
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
        }

        .card-subtitle {
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-xl);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-weight: 500;
          font-size: var(--font-size-sm);
        }

        .password-input {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: var(--spacing-md);
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--color-text-tertiary);
          cursor: pointer;
          padding: var(--spacing-xs);
        }

        .form-actions {
          display: flex;
          gap: var(--spacing-md);
          padding-top: var(--spacing-lg);
          border-top: 1px solid var(--color-border);
        }

        .preferences-section {
          margin-bottom: var(--spacing-xl);
        }

        .preferences-section h3 {
          font-size: var(--font-size-lg);
          font-weight: 600;
          margin-bottom: var(--spacing-md);
        }

        .preference-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-lg);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-md);
        }

        .preference-info {
          flex: 1;
        }

        .preference-label {
          font-weight: 500;
          margin-bottom: var(--spacing-xs);
        }

        .preference-desc {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
          cursor: pointer;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--color-border);
          transition: var(--transition-base);
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: var(--transition-base);
          border-radius: 50%;
        }

        .toggle input:checked + .toggle-slider {
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        }

        .toggle input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .security-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-lg);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-lg);
        }

        .security-label {
          font-weight: 500;
          margin-bottom: var(--spacing-xs);
        }

        .security-desc {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .danger-zone {
          border: 2px solid var(--color-danger);
        }

        .btn-danger {
          background: var(--color-danger);
          color: white;
          border: none;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        @media (max-width: 768px) {
          .settings-tabs {
            overflow-x: auto;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .form-actions .btn {
            width: 100%;
          }

          .preference-item {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-md);
          }

          .security-option {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-md);
          }

          .security-option .btn {
            width: 100%;
          }
        }
      `}</style>
        </div>
    );
};
