import { Pencil, ExternalLink, X, Camera, Heart, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '@/services/userService';
import axios from 'axios';
import { apiUrl } from '@/config/api';
import type { Job } from '@/types';

import { AboutSection } from '@/components/AboutSection';
import { BlogSection } from '@/components/BlogSection';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';

const FAVORITE_JOBS_STORAGE_PREFIX = 'careerpilot:favorite-jobs';

export const Profile = () => {
    const { user, updateProfile } = useAuth();
    const navigate = useNavigate();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);
    const [isUploadingResume, setIsUploadingResume] = useState(false);
    const [isSyncingScore, setIsSyncingScore] = useState(false);
    const [favoriteJobs, setFavoriteJobs] = useState<Job[]>([]);
    const [editName, setEditName] = useState(user?.name || '');
    const [editProfession, setEditProfession] = useState(user?.profession || '');
    const [editAbout, setEditAbout] = useState(user?.about || '');

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const resumeInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => avatarInputRef.current?.click();
    const handleBannerClick = () => bannerInputRef.current?.click();
    const handleResumeClick = () => resumeInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, path: 'avatars' | 'banners' | 'resumes') => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            if (path === 'avatars') setIsUploadingAvatar(true);
            else if (path === 'banners') setIsUploadingBanner(true);
            else setIsUploadingResume(true);

            const downloadURL = await uploadFile(user.id, file, path);
            const updates: Partial<any> = {};
            if (path === 'avatars') updates.photoURL = downloadURL;
            else if (path === 'banners') updates.bannerURL = downloadURL;
            else {
                updates.resumeURL = downloadURL;

                // Clear old score immediately to show we're re-analyzing
                if (user.analytics?.resumeScore) {
                    await updateProfile({
                        analytics: {
                            ...(user.analytics || {}),
                            resumeScore: undefined
                        }
                    });
                }

                // Analyze resume through our new Node.js endpoint
                setIsSyncingScore(true);
                try {
                    const formData = new FormData();
                    formData.append('resume', file);
                    const analysisRes = await axios.post(apiUrl('/upload-resume'), formData);

                    if (analysisRes.data && analysisRes.data.score !== undefined) {
                        const newScore = analysisRes.data.score;
                        const previousHistory = user.analytics?.scoreHistory || [];

                        updates.analytics = {
                            ...(user.analytics || {}),
                            resumeScore: newScore,
                            keywordsMatched: analysisRes.data.keywords_matched,
                            matchedSkills: analysisRes.data.keywords_matched, // Use same for now
                            missingSkills: analysisRes.data.missing_skills,
                            aiFeedback: analysisRes.data.summary,
                            lastAnalyzed: new Date(),
                            scoreHistory: [
                                ...previousHistory,
                                {
                                    score: newScore,
                                    date: new Date(),
                                    resumeUrl: downloadURL
                                }
                            ]
                        };
                    }
                } catch (err) {
                    console.error("Failed to analyze resume:", err);
                    // We still updated the resume URL, just couldn't get a score
                } finally {
                    setIsSyncingScore(false);
                }
            }

            await updateProfile(updates);

            // If resume was uploaded, ensure score is synced
            if (path === 'resumes' && !updates.analytics?.resumeScore) {
                // Fallback: If direct analysis failed, try syncing with the uploaded URL
                setTimeout(() => syncResumeScore(), 1000);
            }

        } catch (error) {
            console.error(`Error uploading ${path}:`, error);
            alert(`Failed to upload ${path}. Please try again.`);
        } finally {
            if (path === 'avatars') setIsUploadingAvatar(false);
            else if (path === 'banners') setIsUploadingBanner(false);
            else setIsUploadingResume(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        try {
            await updateProfile({
                name: editName,
                profession: editProfession,
                about: editAbout
            });
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile. Please try again.");
        }
    };

    const syncResumeScore = async () => {
        if (!user?.resumeURL) return;

        setIsSyncingScore(true);
        try {
            const response = await axios.post(apiUrl('/upload-resume'), {
                resumeUrl: user.resumeURL
            });

            if (response.data && response.data.score !== undefined) {
                await updateProfile({
                    analytics: {
                        ...(user.analytics || {}),
                        resumeScore: response.data.score
                    }
                });
            }
        } catch (error) {
            console.error("Failed to sync resume score:", error);
        } finally {
            setIsSyncingScore(false);
        }
    };

    // Auto-load resume score on component mount
    useEffect(() => {
        // Only fetch if user has a resume but no score yet
        if (user?.resumeURL && typeof user?.analytics?.resumeScore !== 'number' && !isSyncingScore) {
            syncResumeScore();
        }
    }, [user?.id, user?.resumeURL]); // Re-run if user changes or resume is uploaded

    useEffect(() => {
        if (!user?.id) {
            setFavoriteJobs([]);
            return;
        }

        try {
            const key = `${FAVORITE_JOBS_STORAGE_PREFIX}:${user.id}`;
            const raw = window.localStorage.getItem(key);
            if (!raw) {
                setFavoriteJobs([]);
                return;
            }

            const parsed = JSON.parse(raw) as unknown;
            const nextFavorites = Array.isArray(parsed) ? parsed as Job[] : [];
            setFavoriteJobs(nextFavorites.filter((item) => item && typeof item.id === 'string'));
        } catch {
            setFavoriteJobs([]);
        }
    }, [user?.id]);

    const removeFavoriteJob = (jobId: string) => {
        if (!user?.id) return;

        setFavoriteJobs((prev) => {
            const next = prev.filter((job) => job.id !== jobId);
            try {
                const key = `${FAVORITE_JOBS_STORAGE_PREFIX}:${user.id}`;
                window.localStorage.setItem(key, JSON.stringify(next));
            } catch {
                // Ignore localStorage write errors and keep UI state.
            }
            return next;
        });
    };

    // If not logged in, we can show a placeholder or empty state,
    // but the layout header/sidebar already handles login prompts.
    // We'll just render placeholder text if no user is present.
    const hasPhoto = user?.photoURL;
    const initial = user?.name?.charAt(0).toUpperCase() || 'U';
    const resumeScore = typeof user?.analytics?.resumeScore === 'number'
        ? Math.round(user.analytics.resumeScore)
        : null;
    const matchedSkillsCount = Array.isArray(user?.analytics?.matchedSkills)
        ? user.analytics.matchedSkills.length
        : typeof user?.analytics?.keywordsMatched === 'number'
            ? user.analytics.keywordsMatched
            : 0;
    const missingSkillsCount = Array.isArray(user?.analytics?.missingSkills)
        ? user.analytics.missingSkills.length
        : 0;
    const profileCompletion = Math.round(
        ([user?.name, user?.profession, user?.about, user?.country, user?.photoURL, user?.bannerURL, user?.resumeURL]
            .filter(Boolean).length / 7) * 100
    );
    const scoreStateClass = resumeScore === null
        ? 'score-neutral'
        : resumeScore >= 80
            ? 'score-strong'
            : resumeScore >= 60
                ? 'score-fair'
                : 'score-needs-work';

    return (
        <div className="profile-page">
            <div className="profile-container">

                {/* Main Profile Card */}
                <div className="profile-card">



                    {/* Banner */}
                    <div
                        className="profile-banner"
                        style={{
                            backgroundImage: user?.bannerURL ? `url(${user.bannerURL})` : undefined
                        }}
                    >
                        <div className="banner-content">
                            <div className="banner-text">
                                {user?.profession?.toUpperCase() || 'SET YOUR PROFESSION'}
                            </div>
                            <div className="banner-contact">
                                {user?.email || 'your.email@example.com'}
                            </div>
                        </div>
                        <button
                            className={`edit-banner-btn ${isUploadingBanner ? 'uploading' : ''}`}
                            onClick={handleBannerClick}
                            disabled={isUploadingBanner}
                        >
                            {isUploadingBanner ? <div className="spinner-small" /> : <Camera size={16} />}
                        </button>
                        <input
                            type="file"
                            ref={bannerInputRef}
                            className="hidden-input"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'banners')}
                        />
                    </div>

                    {/* Profile Content */}
                    <div className="profile-content">

                        <div className="profile-header-top">
                            <div className="profile-avatar-wrapper">
                                {hasPhoto ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.name ? `${user.name} avatar` : 'Profile avatar'}
                                        className="profile-avatar"
                                        loading="lazy"
                                        decoding="async"
                                        width={160}
                                        height={160}
                                    />
                                ) : (
                                    <div className="profile-avatar-fallback">
                                        {initial}
                                    </div>
                                )}
                                <button
                                    className={`edit-avatar-btn ${isUploadingAvatar ? 'uploading' : ''}`}
                                    onClick={handleAvatarClick}
                                    disabled={isUploadingAvatar}
                                >
                                    {isUploadingAvatar ? <div className="spinner-small" /> : <Camera size={16} />}
                                </button>
                                <input
                                    type="file"
                                    ref={avatarInputRef}
                                    className="hidden-input"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'avatars')}
                                />
                            </div>

                            <button
                                className="edit-intro-btn"
                                onClick={() => {
                                    setEditName(user?.name || '');
                                    setEditProfession(user?.profession || '');
                                    setEditAbout(user?.about || '');
                                    setIsEditModalOpen(true);
                                }}
                            >
                                <Pencil size={20} />
                            </button>
                        </div>

                        <div className="profile-info-grid">
                            {/* Left Side: Name & Headline */}
                            <div className="profile-main-info">
                                <div className="name-section">
                                    <h1 className="profile-name">{user?.name || 'Your Name'}</h1>
                                    <span className="verified-badge">
                                        <span className="verified-dot" />
                                        Profile status: active
                                    </span>
                                </div>

                                <p className="profile-headline">
                                    {user?.profession || 'Add your profession and expertise'}
                                    {user?.skills && user.skills.length > 0 && (
                                        <span> | {user.skills.join(' • ')}</span>
                                    )}
                                </p>

                                <div className="profile-location">
                                    {user?.country || 'Add your location'} <span className="dot">·</span> <span className="contact-info-link">{user?.email || 'Contact Info'}</span>
                                </div>

                                {/* <div className="profile-connections">
                                    <a href="#" className="connection-link">1,100 followers</a>
                                    <span className="dot">·</span>
                                    <a href="#" className="connection-link">500+ connections</a>
                                </div> */}
                            </div>

                            {/* Right Side: Company & Education */}
                            <div className="profile-sidebar-info">
                                <div className="quick-stats-card">
                                    <h3 className="quick-stats-title">Profile Snapshot</h3>
                                    <div className="quick-stat-item">
                                        <span>Profile completion</span>
                                        <strong>{profileCompletion}%</strong>
                                    </div>
                                    <div className="quick-stat-item">
                                        <span>Resume score</span>
                                        <strong className={scoreStateClass}>
                                            {isSyncingScore ? 'Syncing...' : resumeScore !== null ? `${resumeScore}/100` : 'Not analyzed'}
                                        </strong>
                                    </div>
                                    <div className="quick-stat-item">
                                        <span>Matched skills</span>
                                        <strong>{matchedSkillsCount}</strong>
                                    </div>
                                    <div className="quick-stat-item">
                                        <span>Missing skills</span>
                                        <strong>{missingSkillsCount}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="profile-actions">
                            {/* <button className="btn-primary-profile">Open to</button>
                            <button className="btn-outline-profile">Add profile section</button> */}
                            <button
                                className="btn-outline-profile"
                                onClick={() => {
                                    setEditName(user?.name || '');
                                    setEditProfession(user?.profession || '');
                                    setEditAbout(user?.about || '');
                                    setIsEditModalOpen(true);
                                }}
                            >
                                Enhance profile
                            </button>
                            <div className="resume-btn-wrapper">
                                <button
                                    className={`btn-outline-profile ${isUploadingResume ? 'uploading' : ''}`}
                                    onClick={handleResumeClick}
                                    disabled={isUploadingResume}
                                >
                                    {isUploadingResume ? 'Uploading...' : user?.resumeURL ? 'Update Resume' : 'Add Resume'}
                                </button>
                                {user?.resumeURL && (
                                    <a
                                        href={user.resumeURL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="view-resume-link"
                                    >
                                        <ExternalLink size={14} /> View
                                    </a>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={resumeInputRef}
                                className="hidden-input"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => handleFileChange(e, 'resumes')}
                            />
                        </div>

                        {/* Carousel Cards */}
                        <div className="status-carousel">
                            {/* Open to Work Card */}
                            <div className="status-card open-to-work">
                                <div className="status-header">
                                    <span className="status-title">Career focus</span>
                                    <button className="edit-status-btn"><Pencil size={14} /></button>
                                </div>
                                <p className="status-desc">
                                    {user?.profession
                                        ? `Targeting ${user.profession} opportunities with impact-focused teams.`
                                        : 'Add your role focus to attract the right opportunities.'}
                                </p>
                                <button
                                    className="status-link status-link-btn"
                                    onClick={() => {
                                        setEditName(user?.name || '');
                                        setEditProfession(user?.profession || '');
                                        setEditAbout(user?.about || '');
                                        setIsEditModalOpen(true);
                                    }}
                                >
                                    Refine details
                                </button>
                            </div>

                            {/* Hiring Card */}
                            <div className="status-card hiring">
                                <div className="status-header">
                                    <span className="status-title">Profile strength</span>
                                </div>
                                <p className="status-desc">
                                    {profileCompletion >= 80
                                        ? 'Your profile is in great shape. Keep it fresh with new projects and resume updates.'
                                        : 'Complete your profile to improve visibility and recommendation quality.'}
                                </p>
                                <button
                                    className="btn-status-action"
                                    onClick={() => {
                                        setEditName(user?.name || '');
                                        setEditProfession(user?.profession || '');
                                        setEditAbout(user?.about || '');
                                        setIsEditModalOpen(true);
                                    }}
                                >
                                    Improve profile
                                </button>
                            </div>
                        </div>

                        {/* Analytics Section */}
                        {/* Full Resume Analytics Dashboard */}
                        <div className="analytics-shell">
                            <AnalyticsDashboard />
                        </div>

                        <div className="favorite-jobs-shell">
                            <div className="favorite-jobs-header">
                                <h3>
                                    <Heart size={16} />
                                    Favorite Jobs
                                </h3>
                                <span>{favoriteJobs.length}</span>
                            </div>

                            {favoriteJobs.length === 0 ? (
                                <p className="favorite-jobs-empty">
                                    No favorite jobs yet. Add jobs from the results page using the heart button.
                                </p>
                            ) : (
                                <div className="favorite-jobs-list">
                                    {favoriteJobs.map((job) => (
                                        <article key={`favorite-${job.id}`} className="favorite-job-item">
                                            <div className="favorite-job-main">
                                                <h4>{job.title || 'Untitled role'}</h4>
                                                <p>{job.company || 'Unknown company'}</p>
                                                <div className="favorite-job-meta">
                                                    <span>
                                                        <MapPin size={13} />
                                                        {job.location || 'Unknown location'}
                                                    </span>
                                                    <span>{job.type ? String(job.type).replace('-', ' ') : 'job'}</span>
                                                </div>
                                            </div>

                                            <div className="favorite-job-actions">
                                                <button
                                                    className="favorite-job-btn"
                                                    onClick={() => navigate(`/jobs/${job.id}`, { state: { returnTo: '/profile', returnLabel: 'Back to Profile' } })}
                                                    type="button"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    className="favorite-job-btn remove"
                                                    onClick={() => removeFavoriteJob(job.id)}
                                                    type="button"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* About Section */}
                {user && (
                    <div className="profile-section-shell">
                        <AboutSection user={user} />
                    </div>
                )}

                {/* Activity/Blog Section */}
                {user && (
                    <div className="profile-section-shell">
                        <BlogSection user={user} limit={3} />
                    </div>
                )}

                {/* Edit Profile Modal */}
                {isEditModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content profile-edit-modal">
                            <div className="modal-header">
                                <h2>Edit Profile</h2>
                                <button className="close-modal" onClick={() => setIsEditModalOpen(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                {/* Banner Edit */}
                                <div className="edit-section-row">
                                    <label className="section-label">Profile Banner</label>
                                    <div
                                        className="modal-banner-preview"
                                        style={{ backgroundImage: user?.bannerURL ? `url(${user.bannerURL})` : 'linear-gradient(to right, #004182, #00d4aa)' }}
                                    >
                                        <button className="modal-edit-icon-btn" onClick={handleBannerClick}>
                                            <Camera size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Avatar Edit */}
                                <div className="edit-section-row">
                                    <label className="section-label">Profile Image</label>
                                    <div className="modal-avatar-preview-wrapper">
                                        {user?.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt={user?.name ? `${user.name} avatar` : 'Profile avatar'}
                                                className="modal-avatar-preview"
                                                loading="lazy"
                                                decoding="async"
                                                width={100}
                                                height={100}
                                            />
                                        ) : (
                                            <div className="modal-avatar-preview-fallback">{initial}</div>
                                        )}
                                        <button className="modal-edit-icon-btn avatar-edit" onClick={handleAvatarClick}>
                                            <Camera size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Name</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Your Name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Headline / Profession</label>
                                    <input
                                        type="text"
                                        value={editProfession}
                                        onChange={(e) => setEditProfession(e.target.value)}
                                        placeholder="e.g. Software Engineer"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Bio (About)</label>
                                    <textarea
                                        value={editAbout}
                                        onChange={(e) => setEditAbout(e.target.value)}
                                        placeholder="Write a few lines about yourself..."
                                        rows={4}
                                        className="modal-textarea"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                <button className="btn-primary" onClick={handleSaveProfile}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            <style>{`
        .profile-page {
            min-height: 100%;
            width: 100%;
            background-color: #f8fffe; /* Updated to match other pages */
            padding: 0px 0;
            font-family: var(--font-family);
            color: rgba(0,0,0,0.9);
        }

        .profile-container {
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0;
            min-height: 100%;
        }

        .profile-card {
            background: white;
            border-radius: 0;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
            overflow: hidden;
            position: relative;
            margin-bottom: 24px;
            min-height: calc(100dvh - 72px);
        }


        /* Banner */
        .profile-banner {
            height: 200px;
            background: radial-gradient(circle at 50% 50%, #333 0%, #1a1a1a 100%);
            position: relative;
            background-image: url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80'); /* Dark texture placeholder */
            background-size: cover;
            background-position: center;
        }
        
        /* Dark overlay for text readability */
        .profile-banner::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
        }

        .banner-content {
            position: absolute;
            right: 24px;
            bottom: 24px;
            text-align: right;
            color: white;
            z-index: 1;
        }

        .banner-text {
            font-weight: 700;
            font-size: 14px;
            letter-spacing: 1px;
            margin-bottom: 4px;
            text-transform: uppercase;
        }

        .banner-contact {
            font-size: 12px;
            opacity: 0.9;
        }

        .edit-banner-btn {
            position: absolute;
            top: 24px;
            left: 24px;
            background: white;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #00d4aa;
            z-index: 2;
            transition: all 0.2s;
        }
        .edit-banner-btn:hover {
            transform: scale(1.1);
            background: #f0f7ff;
        }
        .edit-banner-btn.uploading {
            cursor: not-allowed;
            opacity: 0.8;
        }

        .hidden-input {
            display: none;
        }

        .spinner-small {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(10, 102, 194, 0.2);
            border-top: 2px solid #00d4aa;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Profile Content */
        .profile-content {
            padding: 0 24px 24px;
            position: relative;
        }

        .profile-header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
        }

        .profile-avatar-wrapper {
            margin-top: -110px; /* Overlap banner */
            position: relative;
            width: 160px;
            height: 160px;
        }

        .profile-avatar {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 4px solid white;
            object-fit: cover;
            background: #fff;
        }
        
        .profile-avatar-fallback {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 4px solid white;
            background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 64px;
            font-weight: 700;
        }

        .edit-avatar-btn {
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: white;
            color: #111827;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s;
        }
        .edit-avatar-btn:hover {
            transform: scale(1.1);
            background: #f0f7ff;
        }
        .edit-avatar-btn.uploading {
            cursor: not-allowed;
            opacity: 0.8;
        }

        .edit-intro-btn {
            margin-top: 24px;
            background: none;
            border: none;
            cursor: pointer;
            color: #666;
            padding: 8px;
            border-radius: 50%;
        }
        .edit-intro-btn:hover {
            background-color: rgba(0,0,0,0.05);
        }

        /* Info Grid */
        .profile-info-grid {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 24px;
            margin-bottom: 24px;
        }

        .name-section {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
            flex-wrap: wrap;
        }

        .profile-name {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
            line-height: 1.25;
            color: rgba(0,0,0,0.9);
        }

        .verified-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 12px;
            background-color: #e8f3ee;
            color: #057642; /* LinkedIn Green-ish */
            font-size: 13px;
            font-weight: 600;
            border: 1px broken #e8f3ee; /* dashed? no */
            border: 1px dashed rgba(5, 118, 66, 0.3);
            text-decoration: none;
            cursor: pointer;
        }

        .profile-headline {
            font-size: 16px;
            color: rgba(0,0,0,0.9);
            margin: 4px 0 8px;
            line-height: 1.5;
        }

        .profile-location {
            font-size: 14px;
            color: #666;
            margin-bottom: 12px;
        }

        .contact-info-link {
            color: #00d4aa;
            text-decoration: none;
            font-weight: 600;
        }
        .contact-info-link:hover {
            text-decoration: underline;
        }

        .profile-connections {
            font-size: 14px;
            font-weight: 600;
            display: flex;
            gap: 4px;
        }

        .connection-link {
            color: #00d4aa;
            text-decoration: none;
        }
        .connection-link:hover {
            text-decoration: underline;
        }

        .dot {
            margin: 0 2px;
            color: #666;
        }

        /* Sidebar Info */
        .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            padding: 4px 0;
        }
        
        .info-logo {
            width: 32px;
            height: 32px;
            border-radius: 0;
        }

        .info-text {
            font-size: 14px;
            font-weight: 600;
            color: rgba(0,0,0,0.9);
        }
        .info-text:hover {
            color: #00d4aa;
            text-decoration: underline;
            cursor: pointer;
        }

        /* Actions */
        .profile-actions {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .btn-primary-profile {
            background-color: #00d4aa;
            color: white;
            border: none;
            border-radius: 24px;
            padding: 6px 16px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn-primary-profile:hover {
            background-color: #004182;
        }

        .btn-outline-profile {
            background-color: transparent;
            color: #00d4aa;
            border: 1px solid #00d4aa;
            border-radius: 24px;
            padding: 6px 16px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn-outline-profile:hover {
            background-color: rgba(10, 102, 194, 0.08); /* Light blue hover */
            box-shadow: inset 0 0 0 1px #00d4aa; /* Thicker border on hover */
        }

        .resume-btn-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .view-resume-link {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #00d4aa;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
        }

        .view-resume-link:hover {
            text-decoration: underline;
        }

        /* Carousel */
        .status-carousel {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
            overflow-x: auto;
            padding-bottom: 8px;
        }

        .status-card {
            background: #f9fafb;
            border-radius: 12px;
            padding: 16px;
            min-width: 300px;
            flex: 1;
            position: relative;
            border: 1px solid rgba(0,0,0,0.08);
        }

        .status-card.open-to-work {
            background-color: #e8f3ee; /* Light green tint */
        }
        
        .status-close {
            position: absolute;
            top: 12px;
            right: 12px;
            cursor: pointer;
            color: #666;
        }

        .status-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        .status-title {
            font-weight: 600;
            font-size: 14px;
            color: rgba(0,0,0,0.9);
        }

        .status-desc {
            font-size: 14px;
            color: rgba(0,0,0,0.9);
            margin-bottom: 8px;
            line-height: 1.4;
        }

        .status-link {
            font-size: 14px;
            font-weight: 600;
            color: #00d4aa;
            text-decoration: none;
        }
        .status-link:hover {
            text-decoration: underline;
        }
        
        .edit-status-btn {
            border: none;
            background: none;
            color: #666;
            cursor: pointer;
            padding: 4px;
            border-radius: 50%;
        }
        .edit-status-btn:hover {
            background: rgba(0,0,0,0.05);
        }

        .btn-status-action {
            display: inline-block;
            color: #00d4aa;
            font-weight: 600;
            border: none;
            background: none;
            padding: 0;
            font-size: 14px;
            cursor: pointer;
        }
        .btn-status-action:hover {
            text-decoration: underline;
        }
        @media (max-width: 768px) {
            .profile-info-grid {
                grid-template-columns: 1fr;
                text-align: center;
            }
            .profile-banner {
                height: 150px;
            }
            .profile-avatar-wrapper {
                width: 120px;
                height: 120px;
                margin: -60px auto 0;
            }
            .profile-header-top {
                flex-direction: column;
                align-items: center;
                margin-bottom: 24px;
            }
            .edit-intro-btn {
                margin-top: 12px;
            }
            .name-section {
                justify-content: center;
            }
            .profile-actions {
                justify-content: center;
            }
            .resume-btn-wrapper {
                width: 100%;
                justify-content: center;
            }
            .status-card {
                min-width: 260px;
            }
            .profile-name {
                font-size: 20px;
            }
        }

        /* Modal Styles */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.2s ease-out;
        }

        .modal-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 720px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
            animation: slideUp 0.3s ease-out;
        }

        .profile-edit-modal {
            max-width: 850px;
        }

        .modal-body {
            padding: 32px;
            overflow-y: auto;
            flex: 1;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
            padding: 16px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #111827;
        }

        .close-modal {
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
            transition: background 0.2s;
        }

        .close-modal:hover {
            background: #f3f4f6;
            color: #111827;
        }

        .modal-body {
            padding: 24px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 6px;
        }

        .form-group input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-group input:focus {
            outline: none;
            border-color: #00d4aa;
            box-shadow: 0 0 0 3px rgba(10, 102, 194, 0.1);
        }

        .modal-footer {
            padding: 16px 24px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }

        .btn-secondary {
            background: white;
            border: 1px solid #d1d5db;
            color: #374151;
            padding: 8px 16px;
            border-radius: 24px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }

        .btn-secondary:hover {
            background: #f3f4f6;
        }

        .btn-primary {
            background: #00d4aa;
            border: 1px solid #00d4aa;
            color: white;
            padding: 8px 16px;
            border-radius: 24px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }

        .btn-primary:hover {
            background: #004182;
        }

        /* Removed duplicate modal-body and profile-edit-modal styles */

        .edit-section-row {
            margin-bottom: 24px;
        }

        .section-label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
        }

        .modal-banner-preview {
            height: 200px;
            border-radius: 8px;
            background-size: cover;
            background-position: center;
            position: relative;
            border: 1px solid #e5e7eb;
        }

        .modal-edit-icon-btn {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background: white;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #00d4aa;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .modal-edit-icon-btn:hover {
            transform: scale(1.1);
        }

        .modal-avatar-preview-wrapper {
            position: relative;
            width: 100px;
            height: 100px;
        }

        .modal-avatar-preview {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid white;
            box-shadow: 0 0 0 1px #e5e7eb;
        }

        .modal-avatar-preview-fallback {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: linear-gradient(135deg, #00d4aa, #004182);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: 700;
        }

        .modal-edit-icon-btn.avatar-edit {
            bottom: 0;
            right: 0;
        }

        .modal-textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 16px;
            font-family: inherit;
            resize: vertical;
        }

        .modal-textarea:focus {
            outline: none;
            border-color: #00d4aa;
            box-shadow: 0 0 0 3px rgba(10, 102, 194, 0.1);
        }

        /* =============================================
           MOBILE RESPONSIVE STYLES - PROFILE PAGE
           ============================================= */

        /* Tablet - 1024px */
        @media (max-width: 1024px) {
            .profile-container {
                padding: 0;
            }
            
            .profile-info-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }
        }

        /* Tablet - 768px */
        @media (max-width: 768px) {
            .profile-banner {
                height: 160px;
            }

            .banner-content {
                right: 12px;
                bottom: 12px;
            }

            .banner-text {
                font-size: 11px;
                letter-spacing: 0.5px;
            }

            .banner-contact {
                font-size: 10px;
            }

            .profile-avatar-wrapper {
                width: 120px;
                height: 120px;
                margin-top: -80px;
            }

            .profile-avatar-fallback {
                font-size: 48px;
            }

            .edit-intro-btn {
                margin-top: 12px;
            }

            .profile-name {
                font-size: 20px;
            }

            .verified-badge {
                font-size: 12px;
                padding: 2px 6px;
            }

            .profile-headline {
                font-size: 14px;
            }

            .profile-location {
                font-size: 13px;
            }

            .profile-info-grid {
                gap: 12px;
            }

            .profile-actions {
                flex-wrap: wrap;
                justify-content: center;
                gap: 8px;
            }

            .btn-primary-profile,
            .btn-outline-profile {
                width: auto;
                flex: 0 1 auto;
                padding: 6px 14px;
                font-size: 12px;
            }
            
            .resume-btn-wrapper {
                width: auto;
                justify-content: center;
            }

            .status-carousel {
                flex-direction: column;
                gap: 12px;
            }

            .status-card {
                min-width: 100%;
            }

            .modal-content {
                width: 95%;
                max-height: 95vh;
            }
        }

        /* Mobile - 640px */
        @media (max-width: 640px) {
            .profile-page {
                padding: 0;
            }

            .profile-container {
                padding: 0;
            }

            .profile-banner {
                height: 140px;
            }

            .banner-content {
                right: 8px;
                bottom: 8px;
                max-width: 60%;
            }

            .banner-text {
                font-size: 10px;
                margin-bottom: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .banner-contact {
                font-size: 9px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .edit-banner-btn {
                top: 12px;
                left: 12px;
                width: 28px;
                height: 28px;
            }

            .profile-avatar-wrapper {
                width: 100px;
                height: 100px;
                margin-top: -60px;
            }

            .edit-avatar-btn {
                width: 28px;
                height: 28px;
                bottom: 5px;
                right: 5px;
            }

            .profile-content {
                padding: 0 12px 16px;
            }

            .profile-header-top {
                margin-bottom: 12px;
            }

            .edit-intro-btn {
                position: static;
                margin-top: 8px;
                align-self: flex-start;
            }

            .name-section {
                flex-direction: row;
                flex-wrap: wrap;
                align-items: center;
                gap: 6px;
                margin-bottom: 6px;
            }

            .profile-name {
                font-size: 18px;
                line-height: 1.3;
            }

            .verified-badge {
                font-size: 9px;
                padding: 2px 4px;
                margin-top: 0;
                gap: 2px;
            }

            .shield-icon {
                font-size: 9px;
            }

            .profile-headline {
                font-size: 13px;
                margin: 6px 0;
            }

            .profile-location {
                font-size: 12px;
                margin-bottom: 16px;
                word-break: break-word;
            }

            .contact-info-link {
                display: inline-block;
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                vertical-align: bottom;
            }

            .profile-actions {
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            .btn-primary-profile,
            .btn-outline-profile {
                flex: 0 1 auto;
                text-align: center;
                justify-content: center;
                padding: 6px 14px;
                font-size: 12px;
                font-weight: 600;
                white-space: nowrap;
                width: auto;
            }

            .resume-btn-wrapper {
                width: auto;
                display: flex;
                gap: 8px;
            }

            .resume-btn-wrapper .btn-outline-profile {
                flex: 0 1 auto;
            }

            .view-resume-link {
                flex-shrink: 0;
                padding: 8px 12px;
            }

            .status-carousel {
                display: flex;
                flex-direction: column;
                gap: 12px;
                overflow: visible;
            }

            .status-card {
                flex: none;
                width: 100%;
                min-width: 100%;
                margin-bottom: 0;
            }

            .status-card.open-to-work,
            .status-card.hiring {
                width: 100%;
            }

            .modal-content {
                width: 100%;
                max-height: 100vh;
                border-radius: 0;
            }

            .modal-banner-preview {
                height: 140px;
            }

            .modal-header {
                padding: 12px 16px;
            }

            .modal-header h2 {
                font-size: 18px;
            }

            .modal-body {
                padding: 12px 16px;
            }

            .modal-footer {
                padding: 12px 16px;
                flex-direction: column-reverse;
                gap: 8px;
            }

            .modal-footer .btn-secondary,
            .modal-footer .btn-primary {
                width: 100%;
            }
        }

        /* Small Mobile - 480px */
        @media (max-width: 480px) {
            .profile-banner {
                height: 120px;
            }

            .banner-content {
                max-width: 50%;
            }

            .banner-text {
                font-size: 9px;
                letter-spacing: 0.3px;
            }

            .banner-contact {
                font-size: 8px;
            }

            .profile-avatar-wrapper {
                width: 80px;
                height: 80px;
                margin-top: -50px;
            }

            .profile-avatar-fallback {
                font-size: 32px;
            }

            .edit-avatar-btn {
                width: 24px;
                height: 24px;
            }

            .profile-name {
                font-size: 16px;
            }

            .profile-headline {
                font-size: 12px;
            }

            .verified-badge {
                font-size: 10px;
                padding: 1px 4px;
                gap: 2px;
            }

            .shield-icon {
                font-size: 10px;
            }

            .profile-location {
                font-size: 11px;
            }

            .contact-info-link {
                max-width: 150px;
            }

            .profile-content {
                padding: 0 8px 12px;
            }


            /* Mobile size buttons */
            .btn-primary-profile,
            .btn-outline-profile {
                padding: 4px 10px !important;
                font-size: 11px !important;
                font-weight: 600;
                white-space: nowrap;
                min-height: 24px;
                width: auto !important;
                flex: 0 1 auto !important;
            }
            
            .profile-actions {
                justify-content: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .resume-btn-wrapper {
                width: auto !important;
                justify-content: center;
            }

            .status-card {
                padding: 12px;
            }

            .status-title {
                font-size: 13px;
            }

            .status-desc {
                font-size: 12px;
            }

            .btn-status-action {
                padding: 6px 12px;
                font-size: 13px;
            }
        }

        /* Extra Small Mobile - 375px */
        @media (max-width: 375px) {
            .banner-text {
                font-size: 8px;
            }

            .banner-contact {
                font-size: 7px;
            }

            .verified-badge {
                font-size: 9px;
                padding: 1px 3px;
                gap: 2px;
            }

            .shield-icon {
                font-size: 9px;
            }

            .profile-name {
                font-size: 15px;
            }

            .profile-headline {
                font-size: 11px;
            }

            .contact-info-link {
                max-width: 120px;
            }

            .btn-primary-profile,
            .btn-outline-profile {
                width: auto !important;
                flex: 0 1 auto !important;
                padding: 4px 8px !important;
                font-size: 10px !important;
                min-height: 22px !important;
            }
            
            .view-resume-link {
                padding: 4px 8px !important;
                font-size: 10px !important;
            }
            
            .profile-actions {
                justify-content: center;
                gap: 6px;
                flex-wrap: wrap;
            }
            
            .resume-btn-wrapper {
                width: auto !important;
                justify-content: center;
            }
        }

        /* ==================================================
           Profile UI Refresh
           ================================================== */
        .profile-page {
            --profile-ink: #0f172a;
            --profile-muted: #475569;
            --profile-border: rgba(15, 23, 42, 0.08);
            --profile-surface: #ffffff;
            --profile-shadow: 0 14px 36px rgba(15, 23, 42, 0.07);
            background:
                linear-gradient(180deg, #f3f6fa 0%, #eef2f7 100%);
            padding: 0;
            color: var(--profile-ink);
        }

        .profile-container {
            width: 100%;
            margin: 0;
            padding: 0;
            display: grid;
            gap: 22px;
        }

        .profile-card {
            border-radius: 0;
            border: none;
            box-shadow: none;
            margin-bottom: 0;
            min-height: calc(100dvh - 72px);
            background: transparent;
            animation: profileReveal 0.25s ease-out both;
        }

        .profile-banner {
            height: clamp(220px, 29vw, 340px);
            position: relative;
            isolation: isolate;
            overflow: hidden;
            background-position: center;
        }

        .profile-banner::before {
            background: linear-gradient(105deg, rgba(2, 8, 23, 0.7) 0%, rgba(2, 8, 23, 0.46) 48%, rgba(30, 64, 175, 0.28) 100%);
        }

        .profile-banner::after {
            content: none;
        }

        .banner-content {
            left: clamp(16px, 3vw, 36px);
            right: auto;
            bottom: clamp(16px, 3vw, 34px);
            text-align: left;
            max-width: min(640px, 86%);
        }

        .banner-text {
            font-size: clamp(12px, 1.1vw, 15px);
            letter-spacing: 0.14em;
            opacity: 0.95;
        }

        .banner-contact {
            font-size: clamp(11px, 0.9vw, 13px);
            opacity: 0.9;
        }

        .edit-banner-btn {
            top: 18px;
            left: 18px;
            width: 36px;
            height: 36px;
            border-radius: 10px;
            color: #0f172a;
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 8px 20px rgba(2, 8, 23, 0.16);
        }

        .edit-banner-btn:hover {
            transform: translateY(-1px);
            background: #ffffff;
        }

        .profile-content {
            width: min(1140px, 100%);
            margin: 0 auto;
            padding: 0 clamp(12px, 2.4vw, 30px) clamp(22px, 3vw, 36px);
            display: grid;
            gap: 18px;
        }

        .profile-header-top {
            margin-bottom: 0;
            align-items: flex-end;
        }

        .profile-avatar-wrapper {
            width: clamp(128px, 15vw, 168px);
            height: clamp(128px, 15vw, 168px);
            margin-top: calc(clamp(128px, 15vw, 168px) * -0.62);
            filter: drop-shadow(0 12px 26px rgba(2, 8, 23, 0.18));
        }

        .profile-avatar,
        .profile-avatar-fallback {
            border: 4px solid rgba(255, 255, 255, 0.92);
            box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
        }

        .profile-avatar-fallback {
            background: linear-gradient(135deg, #00d4aa, #006f78);
        }

        .edit-avatar-btn {
            border-radius: 10px;
            width: 34px;
            height: 34px;
            bottom: 6px;
            right: 4px;
            color: #0f172a;
            box-shadow: 0 8px 18px rgba(2, 8, 23, 0.2);
        }

        .edit-intro-btn {
            margin-top: 0;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid var(--profile-border);
            color: #0f172a;
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .edit-intro-btn:hover {
            background: #ffffff;
            transform: translateY(-1px);
        }

        .profile-info-grid {
            grid-template-columns: minmax(0, 1.5fr) minmax(260px, 0.8fr);
            gap: 20px;
            margin-bottom: 6px;
        }

        .profile-main-info {
            padding: clamp(16px, 2vw, 24px);
            border-radius: 16px;
            border: 1px solid var(--profile-border);
            background: var(--profile-surface);
            box-shadow: var(--profile-shadow);
        }

        .profile-name {
            font-size: clamp(1.5rem, 2.4vw, 2.1rem);
            line-height: 1.12;
            letter-spacing: -0.02em;
            margin-bottom: 0;
        }

        .verified-badge {
            border-radius: 999px;
            border: 1px solid rgba(15, 23, 42, 0.12);
            background: #f8fafc;
            color: #334155;
            font-size: 12px;
            padding: 4px 10px;
            gap: 6px;
        }

        .verified-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #16a34a;
        }

        .profile-headline {
            margin: 10px 0 12px;
            color: #1e293b;
            font-size: clamp(14px, 1.35vw, 17px);
        }

        .profile-location {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
            color: var(--profile-muted);
            margin-bottom: 0;
        }

        .profile-sidebar-info {
            display: block;
        }

        .quick-stats-card {
            border-radius: 16px;
            border: 1px solid var(--profile-border);
            background: #ffffff;
            box-shadow: var(--profile-shadow);
            padding: 18px;
        }

        .quick-stats-title {
            margin: 0 0 12px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #334155;
        }

        .quick-stat-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 0;
            font-size: 14px;
            color: #334155;
            border-top: 1px solid rgba(15, 23, 42, 0.08);
        }

        .quick-stat-item:first-of-type {
            border-top: none;
            padding-top: 0;
        }

        .quick-stat-item strong {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
        }

        .score-strong {
            color: #047857;
        }

        .score-fair {
            color: #0369a1;
        }

        .score-needs-work {
            color: #b45309;
        }

        .score-neutral {
            color: #475569;
        }

        .profile-actions {
            gap: 10px;
            margin-bottom: 0;
        }

        .btn-outline-profile {
            border-radius: 999px;
            border: 1px solid #0f172a;
            padding: 8px 16px;
            font-size: 13px;
            letter-spacing: 0.01em;
            color: #ffffff;
            background: #0f172a;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.2);
        }

        .btn-outline-profile:hover {
            background: #1e293b;
            transform: translateY(-1px);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
        }

        .resume-btn-wrapper {
            gap: 10px;
        }

        .view-resume-link {
            border-radius: 999px;
            padding: 8px 14px;
            border: 1px solid rgba(15, 23, 42, 0.16);
            color: #1e293b;
            background: #ffffff;
        }

        .status-carousel {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 0;
            overflow: visible;
            padding-bottom: 0;
        }

        .status-card {
            min-width: 0;
            border-radius: 16px;
            border: 1px solid var(--profile-border);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
            padding: 18px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .status-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1);
        }

        .status-card.open-to-work {
            background: #ffffff;
        }

        .status-card.hiring {
            background: #ffffff;
        }

        .status-title {
            font-size: 15px;
        }

        .status-desc {
            color: #334155;
            margin-bottom: 10px;
        }

        .status-link-btn {
            border: none;
            background: none;
            padding: 0;
            cursor: pointer;
            text-align: left;
        }

        .analytics-shell,
        .profile-section-shell {
            width: min(1140px, 100%);
            margin: 0 auto;
            border-radius: 16px;
            border: 1px solid var(--profile-border);
            background: var(--profile-surface);
            box-shadow: var(--profile-shadow);
            padding: clamp(12px, 2vw, 20px);
        }

        .favorite-jobs-shell {
            border-radius: 16px;
            border: 1px solid var(--profile-border);
            background: var(--profile-surface);
            box-shadow: var(--profile-shadow);
            padding: clamp(12px, 2vw, 20px);
            display: grid;
            gap: 12px;
        }

        .favorite-jobs-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .favorite-jobs-header h3 {
            margin: 0;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
            color: #0f172a;
        }

        .favorite-jobs-header span {
            min-width: 28px;
            height: 24px;
            border-radius: 999px;
            background: #ecfeff;
            color: #0f766e;
            border: 1px solid #99f6e4;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            padding: 0 8px;
        }

        .favorite-jobs-empty {
            margin: 0;
            font-size: 14px;
            color: #64748b;
            line-height: 1.5;
        }

        .favorite-jobs-list {
            display: grid;
            gap: 10px;
        }

        .favorite-job-item {
            border: 1px solid rgba(15, 23, 42, 0.12);
            border-radius: 12px;
            background: #f8fafc;
            padding: 12px;
            display: flex;
            justify-content: space-between;
            gap: 12px;
        }

        .favorite-job-main {
            min-width: 0;
        }

        .favorite-job-main h4 {
            margin: 0;
            font-size: 15px;
            color: #0f172a;
            line-height: 1.35;
        }

        .favorite-job-main p {
            margin: 3px 0 0;
            font-size: 13px;
            color: #475569;
        }

        .favorite-job-meta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px 12px;
            margin-top: 8px;
            font-size: 12px;
            color: #64748b;
        }

        .favorite-job-meta span {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.12);
            border-radius: 999px;
            padding: 3px 9px;
        }

        .favorite-job-actions {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .favorite-job-btn {
            border-radius: 9px;
            border: 1px solid rgba(14, 116, 144, 0.35);
            background: #ffffff;
            color: #0e7490;
            min-height: 34px;
            padding: 0 12px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
        }

        .favorite-job-btn.remove {
            border-color: rgba(185, 28, 28, 0.32);
            color: #b91c1c;
        }

        .modal-content {
            border-radius: 14px;
            border: 1px solid rgba(15, 23, 42, 0.08);
        }

        @keyframes profileReveal {
            from {
                opacity: 0;
                transform: translateY(14px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (max-width: 1024px) {
            .profile-info-grid {
                grid-template-columns: 1fr;
            }

            .quick-stats-card {
                padding: 16px;
            }
        }

        @media (max-width: 768px) {
            .profile-banner {
                height: 220px;
            }

            .profile-header-top {
                flex-direction: column;
                align-items: center;
                gap: 10px;
            }

            .profile-avatar-wrapper {
                margin-top: -80px;
            }

            .edit-intro-btn {
                align-self: flex-end;
            }

            .status-carousel {
                grid-template-columns: 1fr;
            }

            .analytics-shell,
            .profile-section-shell {
                border-radius: 16px;
            }
        }

        @media (max-width: 640px) {
            .profile-banner {
                height: 188px;
            }

            .banner-content {
                max-width: calc(100% - 24px);
            }

            .profile-content {
                padding: 0 10px 18px;
            }

            .profile-main-info,
            .quick-stats-card,
            .status-card {
                border-radius: 14px;
            }

            .profile-actions {
                justify-content: flex-start;
            }

            .btn-outline-profile,
            .view-resume-link {
                font-size: 12px;
                padding: 7px 12px;
            }

            .favorite-job-item {
                flex-direction: column;
            }

            .favorite-job-actions {
                width: 100%;
                justify-content: flex-end;
            }
        }
      `}</style>
        </div>
    );
};

