import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileDropdownProps {
    onViewProfile?: () => void;
}

export const ProfileDropdown = ({ onViewProfile }: ProfileDropdownProps) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            setIsOpen(false);
            // Navigate to landing page after successful logout
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    if (!user) return null;

    return (
        <div className="profile-dropdown-container" ref={dropdownRef}>
            <button
                className="topbar-profile-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                title="Account"
                style={{ cursor: 'pointer' }}
            >
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={user.name ? `${user.name} avatar` : 'User avatar'}
                        className="topbar-avatar"
                        loading="lazy"
                        decoding="async"
                        width={40}
                        height={40}
                    />
                ) : (
                    <div className="topbar-avatar-fallback">
                        {user.name?.charAt(0).toUpperCase()}
                    </div>
                )}
            </button>

            {/* Profile Dropdown */}
            {isOpen && (
                <div className="profile-dropdown">
                    <div className="dropdown-header-card">
                        <div className="dropdown-avatar-wrapper">
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.name ? `${user.name} avatar` : 'User avatar'}
                                    className="dropdown-avatar"
                                    loading="lazy"
                                    decoding="async"
                                    width={80}
                                    height={80}
                                />
                            ) : (
                                <div className="dropdown-avatar-fallback">
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <h4 className="dropdown-name">{user.name}</h4>
                        <p className="dropdown-email">{user.email}</p>
                    </div>

                    <div className="dropdown-menu-items">
                        <button
                            className="dropdown-item"
                            onClick={() => {
                                if (onViewProfile) {
                                    onViewProfile();
                                } else {
                                    navigate('/profile');
                                }
                                setIsOpen(false);
                            }}
                        >
                            <UserIcon size={18} />
                            <span>View Profile</span>
                        </button>

                        <button className="dropdown-item" onClick={handleLogout}>
                            <LogOut size={18} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .profile-dropdown-container {
                    position: relative;
                }

                .topbar-profile-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    border-radius: var(--radius-full);
                    transition: all var(--transition-base);
                }

                .topbar-profile-btn:hover {
                    opacity: 0.8;
                    transform: scale(1.05);
                }

                .topbar-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius-full);
                    object-fit: cover;
                    border: 2px solid var(--color-border);
                }

                .topbar-avatar-fallback {
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius-full);
                    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 16px;
                    border: 2px solid var(--color-border);
                }

                /* Mobile responsive styles */
                @media (max-width: 768px) {
                    .topbar-avatar {
                        width: 32px;
                        height: 32px;
                    }

                    .topbar-avatar-fallback {
                        width: 32px;
                        height: 32px;
                        font-size: 14px;
                    }
                }

                .profile-dropdown {
                    position: absolute;
                    top: 120%;
                    right: 0;
                    width: 350px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    z-index: 2000;
                    overflow: hidden;
                    border: 1px solid rgba(0,0,0,0.05);
                    animation: slideIn 0.2s ease-out;
                    transform-origin: top right;
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }

                .dropdown-header-card {
                    background-color: #e9eff5;
                    padding: 24px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin: 10px;
                    border-radius: 16px;
                }

                .dropdown-avatar-wrapper {
                    position: relative;
                    margin-bottom: 12px;
                }

                .dropdown-avatar {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    object-fit: cover;
                }

                .dropdown-avatar-fallback {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    font-weight: 700;
                }

                .dropdown-name {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0 0 4px 0;
                    color: #202124;
                }

                .dropdown-email {
                    font-size: 14px;
                    color: #5f6368;
                    margin: 0;
                }

                .dropdown-menu-items {
                    padding: 8px 0;
                    background: white;
                }

                .dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    padding: 12px 24px;
                    border: none;
                    background: none;
                    text-align: left;
                    font-size: 15px;
                    color: #333;
                    cursor: pointer;
                    transition: background 0.1s;
                }

                .dropdown-item:hover {
                    background-color: #f5f5f5;
                }

                .dropdown-item svg {
                    color: #5f6368;
                }
            `}</style>
        </div>
    );
};
