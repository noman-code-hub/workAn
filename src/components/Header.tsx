import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Zap, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileDropdown } from './ProfileDropdown';

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="universal-header">
      <div className="header-inner">
        <div className="header-left">
          <div className="logo" onClick={handleLogoClick}>
            <div className="logo-icon">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="logo-text">CareerPilot</span>
          </div>
        </div>

        <nav className="header-nav">
          <button
            onClick={() => navigate('/dashboard')}
            className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            Overview
          </button>
          <button
            onClick={() => navigate('/jobs')}
            className={`nav-link ${location.pathname === '/jobs' ? 'active' : ''}`}
          >
            Job Search
          </button>
          <button
            onClick={() => navigate('/resume')}
            className={`nav-link ${location.pathname === '/resume' ? 'active' : ''}`}
          >
            Resume Optimizer
          </button>
          <button
            onClick={() => navigate('/community')}
            className={`nav-link ${location.pathname === '/community' ? 'active' : ''}`}
          >
            Community
          </button>
          <button
            onClick={() => navigate('/trends')}
            className={`nav-link ${location.pathname === '/trends' ? 'active' : ''}`}
          >
            Trends
          </button>
          <button
            onClick={() => navigate('/ai-copilot')}
            className={`nav-link ${location.pathname === '/ai-copilot' ? 'active' : ''}`}
          >
            AI Copilot
          </button>

          {/* Role-based navigation */}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className={`nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              👨‍💼 Admin
            </button>
          )}
          {(user?.role === 'recruiter' || user?.role === 'admin') && (
            <button
              onClick={() => navigate('/recruiter')}
              className={`nav-link recruiter-link ${location.pathname === '/recruiter' ? 'active' : ''}`}
            >
              💼 Recruiter
            </button>
          )}
        </nav>

        <div className="header-right">
          <div className="header-actions">
            <button className="icon-btn-universal">
              <Globe size={18} />
              <span>EN</span>
            </button>
            <button className="icon-btn-universal">
              <Sun size={18} />
            </button>
            {user ? (
              <ProfileDropdown />
            ) : (
              <button
                className="signin-btn-universal"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

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

        @media (max-width: 1024px) {
          .header-nav {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .header-inner {
            padding: 0 12px;
          }
          .icon-btn-universal span {
            display: none;
          }
          .logo-text {
            font-size: 18px;
          }
        }
      `}</style>
    </header>
  );
};
