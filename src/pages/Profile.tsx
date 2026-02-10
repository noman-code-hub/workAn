import { Pencil, ExternalLink, X, Camera, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '@/services/userService';
import axios from 'axios';

import { AboutSection } from '@/components/AboutSection';
import { BlogSection } from '@/components/BlogSection';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';

export const Profile = () => {
    const { user, logout, updateProfile } = useAuth();
    const navigate = useNavigate();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);
    const [isUploadingResume, setIsUploadingResume] = useState(false);
    const [isSyncingScore, setIsSyncingScore] = useState(false);
    const [editName, setEditName] = useState(user?.name || '');
    const [editProfession, setEditProfession] = useState(user?.profession || '');
    const [editAbout, setEditAbout] = useState(user?.about || '');

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const resumeInputRef = useRef<HTMLInputElement>(null);

    const handleLogout = async () => {
        try {
            await logout();
            // Navigate to landing page after successful logout
            navigate('/');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

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
                    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                    const analysisRes = await axios.post(`${baseUrl}/api/upload-resume`, formData);

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
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const response = await axios.post(`${baseUrl}/api/upload-resume`, {
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

    // If not logged in, we can show a placeholder or empty state,
    // but the layout header/sidebar already handles login prompts.
    // We'll just render placeholder text if no user is present.
    const hasPhoto = user?.photoURL;
    const initial = user?.name?.charAt(0).toUpperCase() || 'U';

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
                                        alt={user.name || 'Profile'}
                                        className="profile-avatar"
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
                                        <span className="shield-icon">🛡️</span> Add verification badge
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
                                {/* <div className="info-item">
                                    <img src="https://ui-avatars.com/api/?name=Quantum+Labs+AI&background=0ea5e9&color=fff&size=40" alt="Quantum Labs" className="info-logo" />
                                    <span className="info-text">Quantum Labs AI</span>
                                </div>
                                <div className="info-item">
                                    <img src="https://ui-avatars.com/api/?name=University+of+Swat&background=15803d&color=fff&size=40" alt="University of Swat" className="info-logo" />
                                    <span className="info-text">University of Swat</span>
                                </div> */}
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
                                    <span className="status-title">Open to work</span>
                                    <button className="edit-status-btn"><Pencil size={14} /></button>
                                </div>
                                <p className="status-desc">Mobile Application Developer and Web Developer roles</p>
                                <a href="#" className="status-link">Show details</a>
                            </div>

                            {/* Hiring Card */}
                            <div className="status-card hiring">
                                <div className="status-close"><X size={16} /></div>
                                <div className="status-header">
                                    <span className="status-title">Share that you're hiring</span>
                                </div>
                                <p className="status-desc">and attract qualified candidates.</p>
                                <button className="btn-status-action">Get started</button>
                            </div>
                        </div>

                        {/* Analytics Section */}
                        {/* Full Resume Analytics Dashboard */}
                        <AnalyticsDashboard />


                    </div>
                </div>

                {/* About Section */}
                {user && <AboutSection user={user} />}

                {/* Activity/Blog Section */}
                {user && <BlogSection user={user} limit={3} />}

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
                                            <img src={user.photoURL} alt="Avatar" className="modal-avatar-preview" />
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

                {/* Logout Button Footer */}
                <div className="profile-footer-logout">
                    <button className="btn-logout-bottom" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>

            <style>{`
        .profile-page {
            min-height: 100vh;
            background-color: #f8fffe; /* Updated to match other pages */
            padding: 0px 0;
            font-family: var(--font-family);
            color: rgba(0,0,0,0.9);
        }

        .profile-container {
            max-width: 1128px;
            margin: 0 auto;
            padding: 0 16px;
        }

        .profile-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
            overflow: hidden;
            position: relative;
            margin-bottom: 24px;
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



        .profile-footer-logout {
            margin-top: 48px;
            padding: 32px 0;
            display: flex;
            justify-content: center;
            border-top: 1px solid rgba(0,0,0,0.08);
        }

        .btn-logout-bottom {
            display: flex;
            align-items: center;
            gap: 12px;
            background: linear-gradient(135deg, #ff4b2b 0%, #ff416c 100%);
            color: white;
            border: none;
            border-radius: 30px;
            padding: 14px 40px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 10px 20px -5px rgba(255, 75, 43, 0.3);
            letter-spacing: 0.5px;
        }

        .btn-logout-bottom:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 15px 30px -8px rgba(255, 75, 43, 0.4);
            filter: brightness(1.1);
        }

        .btn-logout-bottom:active {
            transform: translateY(-1px);
        }

        .btn-logout-bottom svg {
            transition: transform 0.3s ease;
        }

        .btn-logout-bottom:hover svg {
            transform: translateX(3px);
        }

        @media (max-width: 768px) {
            .profile-info-grid {
                grid-template-columns: 1fr;
            }
            .profile-banner {
                height: 150px;
            }
            .profile-avatar-wrapper {
                width: 120px;
                height: 120px;
                margin-top: -80px;
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
      `}</style>
        </div>
    );
};
