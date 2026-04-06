import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Globe, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileDropdown } from './ProfileDropdown';
import { BRAND } from '../config/brand';

type SupportedLanguage = 'EN' | 'ES';

const LANGUAGE_STORAGE_KEY = 'careerpilot:language';

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    if (typeof window === 'undefined') return 'EN';
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return savedLanguage === 'EN' || savedLanguage === 'ES' ? savedLanguage : 'EN';
  });

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }

    return () => document.body.classList.remove('no-scroll');
  }, [isMenuOpen]);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language === 'ES' ? 'es' : 'en';
  }, [language]);

  useEffect(() => {
    window.localStorage.removeItem('careerpilot:theme');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogoClick = () => {
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleLanguageToggle = () => {
    setLanguage((currentLanguage) => (currentLanguage === 'EN' ? 'ES' : 'EN'));
  };

  const overviewPath =
    user?.role === 'admin'
      ? '/admin-dashboard'
      : user?.role === 'recruiter'
        ? '/recruiter'
        : '/dashboard';

  const copy =
    language === 'ES'
      ? {
          jobSearch: 'Buscar Empleo',
          overview: 'Resumen',
          marketJobs: 'Empleos del Mercado',
          resumeOptimizer: 'Optimizador CV',
          community: 'Comunidad',
          trends: 'Tendencias',
          aiCopilot: 'Copiloto IA',
          signIn: 'Iniciar Sesion',
        }
      : {
          jobSearch: 'Job Search',
          overview: 'Overview',
          marketJobs: 'Market Jobs',
          resumeOptimizer: 'Resume Optimizer',
          community: 'Community',
          trends: 'Trends',
          aiCopilot: 'AI Copilot',
          signIn: 'Sign In',
        };

  const nextLanguageLabel = language === 'EN' ? 'Switch to Spanish' : 'Switch to English';
  const isJobsActive = location.pathname.startsWith('/jobs');
  const isResumeActive = location.pathname.startsWith('/resume');

  return (
    <header className="universal-header">
      <div className="header-inner">
        <div className="header-left">
          <div className="logo" onClick={handleLogoClick}>
            <span className="logo-text">{BRAND.name}</span>
            <span className="logo-dot" aria-hidden="true" />
          </div>
        </div>

        <nav className="header-nav">
          <button onClick={() => handleNavClick('/jobs')} className={`nav-link ${isJobsActive ? 'active' : ''}`}>
            {copy.jobSearch}
          </button>
          <button
            onClick={() => handleNavClick(overviewPath)}
            className={`nav-link ${location.pathname === overviewPath ? 'active' : ''}`}
          >
            {copy.overview}
          </button>
          <button
            onClick={() => handleNavClick('/market-jobs')}
            className={`nav-link ${location.pathname === '/market-jobs' ? 'active' : ''}`}
          >
            {copy.marketJobs}
          </button>
          <button onClick={() => handleNavClick('/resume')} className={`nav-link ${isResumeActive ? 'active' : ''}`}>
            {copy.resumeOptimizer}
          </button>
          <button
            onClick={() => handleNavClick('/community')}
            className={`nav-link ${location.pathname.startsWith('/community') ? 'active' : ''}`}
          >
            {copy.community}
          </button>
          <button
            onClick={() => handleNavClick('/trends')}
            className={`nav-link ${location.pathname === '/trends' ? 'active' : ''}`}
          >
            {copy.trends}
          </button>
          <button
            onClick={() => handleNavClick('/ai-copilot')}
            className={`nav-link ${location.pathname === '/ai-copilot' ? 'active' : ''}`}
          >
            {copy.aiCopilot}
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => handleNavClick('/admin')}
              className={`nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              Admin
            </button>
          )}
          {(user?.role === 'recruiter' || user?.role === 'admin') && (
            <button
              onClick={() => handleNavClick('/recruiter')}
              className={`nav-link recruiter-link ${location.pathname === '/recruiter' ? 'active' : ''}`}
            >
              Recruiter
            </button>
          )}
        </nav>

        <div className="header-right">
          <div className="header-actions">
            <button
              className="icon-btn-universal desktop-only"
              onClick={handleLanguageToggle}
              aria-label={nextLanguageLabel}
              title={nextLanguageLabel}
            >
              <Globe size={18} />
              <span>{language}</span>
            </button>
            {user ? (
              <ProfileDropdown />
            ) : (
              <button className="signin-btn-universal" onClick={() => handleNavClick('/login')}>
                {copy.signIn}
              </button>
            )}
            <button
              className="icon-btn-universal mobile-menu-btn"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-actions">
            <button
              className="mobile-utility-btn"
              onClick={handleLanguageToggle}
              aria-label={nextLanguageLabel}
              title={nextLanguageLabel}
            >
              <Globe size={18} />
              <span>{language}</span>
            </button>
          </div>

          <div className="mobile-nav-links">
            <button onClick={() => handleNavClick('/jobs')} className={`mobile-nav-link ${isJobsActive ? 'active' : ''}`}>
              {copy.jobSearch}
            </button>
            <button
              onClick={() => handleNavClick(overviewPath)}
              className={`mobile-nav-link ${location.pathname === overviewPath ? 'active' : ''}`}
            >
              {copy.overview}
            </button>
            <button
              onClick={() => handleNavClick('/market-jobs')}
              className={`mobile-nav-link ${location.pathname === '/market-jobs' ? 'active' : ''}`}
            >
              {copy.marketJobs}
            </button>
            <button onClick={() => handleNavClick('/resume')} className={`mobile-nav-link ${isResumeActive ? 'active' : ''}`}>
              {copy.resumeOptimizer}
            </button>
            <button
              onClick={() => handleNavClick('/community')}
              className={`mobile-nav-link ${location.pathname.startsWith('/community') ? 'active' : ''}`}
            >
              {copy.community}
            </button>
            <button
              onClick={() => handleNavClick('/trends')}
              className={`mobile-nav-link ${location.pathname === '/trends' ? 'active' : ''}`}
            >
              {copy.trends}
            </button>
            <button
              onClick={() => handleNavClick('/ai-copilot')}
              className={`mobile-nav-link ${location.pathname === '/ai-copilot' ? 'active' : ''}`}
            >
              {copy.aiCopilot}
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => handleNavClick('/admin')}
                className={`mobile-nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
              >
                Admin Dashboard
              </button>
            )}
            {(user?.role === 'recruiter' || user?.role === 'admin') && (
              <button
                onClick={() => handleNavClick('/recruiter')}
                className={`mobile-nav-link recruiter-link ${location.pathname === '/recruiter' ? 'active' : ''}`}
              >
                Recruiter Dashboard
              </button>
            )}
            {!user && (
              <button onClick={() => handleNavClick('/login')} className="mobile-nav-link highlight">
                {copy.signIn}
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .universal-header {
          background: rgba(255, 255, 255, 0.82);
          border-bottom: 1px solid var(--color-border-light);
          height: var(--header-height);
          display: flex;
          align-items: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          width: 100%;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }

        .header-inner {
          max-width: var(--page-max-width);
          width: 100%;
          margin: 0 auto;
          padding: 0 var(--page-gutter);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .header-left,
        .header-right,
        .header-actions {
          display: flex;
          align-items: center;
        }

        .header-actions {
          gap: 8px;
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

        .logo-text {
          font-size: 26px;
          font-weight: 800;
          color: var(--color-text-primary);
          font-family: var(--font-family-brand);
          letter-spacing: -0.6px;
          line-height: 1;
          text-transform: lowercase;
        }

        .logo-dot {
          width: 8px;
          height: 8px;
          background: #1dbf73;
          border-radius: 999px;
          margin-left: 4px;
          align-self: flex-end;
          margin-bottom: 4px;
          box-shadow: 0 0 0 2px rgba(29, 191, 115, 0.12);
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
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          padding: 8px 12px;
          border-radius: 8px;
          white-space: nowrap;
        }

        .nav-link:hover {
          color: var(--color-text-primary);
          background: var(--color-surface-hover);
        }

        .nav-link.active {
          color: var(--color-primary);
          background: rgba(23, 201, 176, 0.18);
        }

        .icon-btn-universal {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: var(--color-text-secondary);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .icon-btn-universal:hover {
          background: var(--color-surface-hover);
          color: var(--color-text-primary);
        }

        .signin-btn-universal {
          background: linear-gradient(135deg, var(--color-text-primary), #1f2937);
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .signin-btn-universal:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 22px rgba(15, 23, 42, 0.18);
        }

        .mobile-menu-btn {
          display: none;
        }

        .mobile-menu {
          position: fixed;
          top: var(--header-height);
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, rgba(248, 252, 255, 0.98) 0%, rgba(243, 247, 251, 0.98) 100%);
          z-index: 999;
          padding: 20px var(--page-gutter) 24px;
          overflow-y: auto;
          border-top: 1px solid var(--color-border-light);
        }

        .mobile-menu-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }

        .mobile-utility-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 48px;
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s, background 0.2s;
        }

        .mobile-utility-btn:hover {
          transform: translateY(-1px);
          border-color: var(--color-primary);
        }

        .mobile-nav-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mobile-nav-link {
          padding: 16px;
          border: none;
          background: var(--color-surface-hover);
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mobile-nav-link:hover,
        .mobile-nav-link.active {
          background: rgba(23, 201, 176, 0.18);
          color: var(--color-primary);
        }

        .mobile-nav-link.highlight {
          background: var(--color-text-primary);
          color: var(--color-text-inverse);
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

        @media (max-width: 768px) {
          .header-inner {
            gap: 10px;
          }

          .signin-btn-universal {
            padding: 8px 14px;
          }
        }

        @media (max-width: 640px) {
          .logo-text {
            font-size: 22px;
          }
        }
      `}</style>
    </header>
  );
};
