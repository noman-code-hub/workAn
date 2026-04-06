import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="global-footer">
      <div className="footer-container">
        <div className="footer-brand-section">
          <Link to="/" className="footer-logo">
            <Sparkles size={20} className="logo-icon" />
            <span>Workshour</span>
          </Link>
          <p className="footer-tagline">
            The AI-powered career platform that helps you build a better resume and land your dream job faster.
          </p>
        </div>
        
        <div className="footer-nav">
          <div className="footer-col">
            <h4>Resume</h4>
            <Link to="/resume-builder">Resume Builder</Link>
            <Link to="/resume-builder/templates">Templates</Link>
            <Link to="/resume">Examples</Link>
          </div>
          <div className="footer-col">
            <h4>Career</h4>
            <Link to="/jobs">Job Search</Link>
            <Link to="/ai-copilot">Interview Prep</Link>
            <Link to="/trends">Salary Guide</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p className="copyright">© {new Date().getFullYear()} Workshour. All rights reserved.</p>
          <div className="footer-legal">
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </div>

      <style>{`
        .global-footer {
          background: var(--color-surface, #ffffff);
          border-top: 1px solid var(--color-border, #e5e7eb);
          padding: 56px var(--page-gutter) 28px;
          margin-top: auto;
          width: 100%;
        }

        .footer-container {
          max-width: var(--page-max-width);
          margin: 0 auto;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 48px;
        }

        .footer-brand-section {
          max-width: 320px;
          flex: 1 1 300px;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--color-text-primary, #0f172a);
          text-decoration: none;
          margin-bottom: 16px;
        }

        .logo-icon {
          color: var(--color-primary, #17c9b0);
        }

        .footer-tagline {
          color: var(--color-text-secondary, #64748b);
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .footer-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 40px;
          flex: 2 1 400px;
          justify-content: flex-end;
        }

        .footer-col {
          min-width: 120px;
        }

        .footer-col h4 {
          color: var(--color-text-primary, #0f172a);
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .footer-col a {
          display: block;
          color: var(--color-text-secondary, #64748b);
          text-decoration: none;
          margin-bottom: 12px;
          font-size: 0.9rem;
          transition: color 0.2s;
        }

        .footer-col a:hover {
          color: var(--color-primary, #17c9b0);
        }

        .footer-bottom {
          max-width: var(--page-max-width);
          margin: 48px auto 0;
          padding-top: 32px;
          border-top: 1px solid var(--color-border, #e5e7eb);
        }

        .footer-bottom-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .copyright {
          color: var(--color-text-secondary, #64748b);
          font-size: 0.85rem;
        }

        .footer-legal {
          display: flex;
          gap: 24px;
        }

        .footer-legal a {
          color: var(--color-text-secondary, #64748b);
          text-decoration: none;
          font-size: 0.85rem;
          transition: color 0.2s;
        }

        .footer-legal a:hover {
          color: var(--color-primary, #17c9b0);
        }

        @media (max-width: 1024px) {
          .footer-nav {
            justify-content: flex-start;
          }
        }

        @media (max-width: 768px) {
          .global-footer {
            padding: 44px var(--page-gutter) 28px;
          }

          .footer-container {
            flex-direction: column;
            gap: 40px;
          }

          .footer-nav {
            justify-content: flex-start;
            gap: 32px;
          }

          .footer-bottom-inner {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 480px) {
          .footer-legal {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>
    </footer>
  );
};
