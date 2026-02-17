import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Zap, Globe, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileDropdown } from './ProfileDropdown';

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [isMenuOpen]);

  const handleLogoClick = () => {
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const overviewPath =
    user?.role === 'admin'
      ? '/admin-dashboard'
      : user?.role === 'recruiter'
        ? '/recruiter'
        : '/dashboard';

  return (
    <header className="universal-header">
      <div className="header-inner">
        <div className="header-left">
          <div className="logo" onClick={handleLogoClick}>
            <div className="logo-icon">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="logo-text">workIn</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="header-nav">
          <button
            onClick={() => handleNavClick(overviewPath)}
            className={`nav-link ${location.pathname === overviewPath ? 'active' : ''}`}
          >
            Overview
          </button>
          <button
            onClick={() => handleNavClick('/jobs')}
            className={`nav-link ${location.pathname === '/jobs' ? 'active' : ''}`}
          >
            Job Search
          </button>
          <button
            onClick={() => handleNavClick('/resume')}
            className={`nav-link ${location.pathname === '/resume' ? 'active' : ''}`}
          >
            Resume Optimizer
          </button>
          <button
            onClick={() => handleNavClick('/community')}
            className={`nav-link ${location.pathname === '/community' ? 'active' : ''}`}
          >
            Community
          </button>
          <button
            onClick={() => handleNavClick('/trends')}
            className={`nav-link ${location.pathname === '/trends' ? 'active' : ''}`}
          >
            Trends
          </button>
          <button
            onClick={() => handleNavClick('/ai-copilot')}
            className={`nav-link ${location.pathname === '/ai-copilot' ? 'active' : ''}`}
          >
            AI Copilot
          </button>

          {/* Role-based navigation */}
          {user?.role === 'admin' && (
            <button
              onClick={() => handleNavClick('/admin')}
              className={`nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              👨‍💼 Admin
            </button>
          )}
          {(user?.role === 'recruiter' || user?.role === 'admin') && (
            <button
              onClick={() => handleNavClick('/recruiter')}
              className={`nav-link recruiter-link ${location.pathname === '/recruiter' ? 'active' : ''}`}
            >
              💼 Recruiter
            </button>
          )}
        </nav>

        <div className="header-right">
          <div className="header-actions">
            <button className="icon-btn-universal desktop-only">
              <Globe size={18} />
              <span>EN</span>
            </button>
            <button className="icon-btn-universal desktop-only">
              <Sun size={18} />
            </button>
            {user ? (
              <ProfileDropdown />
            ) : (
              <button
                className="signin-btn-universal"
                onClick={() => handleNavClick('/login')}
              >
                Sign In
              </button>
            )}
            {/* Mobile Menu Toggle */}
            <button
              className="icon-btn-universal mobile-menu-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-nav-links">
            <button
              onClick={() => handleNavClick(overviewPath)}
              className={`mobile-nav-link ${location.pathname === overviewPath ? 'active' : ''}`}
            >
              Overview
            </button>
            <button
              onClick={() => handleNavClick('/jobs')}
              className={`mobile-nav-link ${location.pathname === '/jobs' ? 'active' : ''}`}
            >
              Job Search
            </button>
            <button
              onClick={() => handleNavClick('/resume')}
              className={`mobile-nav-link ${location.pathname === '/resume' ? 'active' : ''}`}
            >
              Resume Optimizer
            </button>
            <button
              onClick={() => handleNavClick('/community')}
              className={`mobile-nav-link ${location.pathname === '/community' ? 'active' : ''}`}
            >
              Community
            </button>
            <button
              onClick={() => handleNavClick('/trends')}
              className={`mobile-nav-link ${location.pathname === '/trends' ? 'active' : ''}`}
            >
              Trends
            </button>
            <button
              onClick={() => handleNavClick('/ai-copilot')}
              className={`mobile-nav-link ${location.pathname === '/ai-copilot' ? 'active' : ''}`}
            >
              AI Copilot
            </button>

            {/* Role-based navigation */}
            {user?.role === 'admin' && (
              <button
                onClick={() => handleNavClick('/admin')}
                className={`mobile-nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
              >
                👨‍💼 Admin Dashboard
              </button>
            )}
            {(user?.role === 'recruiter' || user?.role === 'admin') && (
              <button
                onClick={() => handleNavClick('/recruiter')}
                className={`mobile-nav-link recruiter-link ${location.pathname === '/recruiter' ? 'active' : ''}`}
              >
                💼 Recruiter Dashboard
              </button>
            )}

            {!user && (
              <button
                onClick={() => handleNavClick('/login')}
                className="mobile-nav-link highlight"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .universal-header {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          height: 72px;
          display: flex;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
        }

        .header-inner {
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .logo:hover {
          transform: scale(1.02);
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #00d4aa 0%, #00a389 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 212, 170, 0.2);
        }

        .logo-text {
          font-size: 20px;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.5px;
        }

        .header-nav {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .nav-link {
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          padding: 8px 12px;
          border-radius: 8px;
          white-space: nowrap;
        }

        .nav-link:hover {
          color: #111827;
          background: #f9fafb;
        }

        .nav-link.active {
          color: #00d4aa;
          background: #f0fdf9;
        }

        .header-right {
          display: flex;
          align-items: center;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icon-btn-universal {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .icon-btn-universal:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .signin-btn-universal {
          background: #111827;
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .signin-btn-universal:hover {
          background: #1f2937;
        }

        .mobile-menu-btn {
          display: none;
        }
        
        /* Mobile Menu Styles */
        .mobile-menu {
          position: fixed;
          top: 72px;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 999;
          padding: 24px;
          overflow-y: auto;
          border-top: 1px solid #e5e7eb;
        }

        .mobile-nav-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mobile-nav-link {
          padding: 16px;
          border: none;
          background: #f9fafb;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mobile-nav-link:hover, .mobile-nav-link.active {
          background: #f0fdf9;
          color: #00d4aa;
        }
        
        .mobile-nav-link.highlight {
           background: #111827;
           color: white;
           text-align: center;
           margin-top: 16px;
        }

        @media (max-width: 1024px) {
          .header-nav {
            display: none;
          }
          .mobile-menu-btn {
            display: flex;
          }
          .desktop-only {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .header-inner {
            padding: 0 12px;
          }
          .logo-text {
            font-size: 18px;
          }
        }
      `}</style>
    </header>
  );
};
