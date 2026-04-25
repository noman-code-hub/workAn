import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { AdSenseSlot } from './AdSenseSlot';

import { useAuth } from '../contexts/AuthContext';
import { useRoleBasedRedirect } from '../hooks/useRoleBasedRedirect';

export const Layout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === '/landing' || location.pathname === '/';
  const isCommunity = location.pathname.startsWith('/community');
  const isProfile = location.pathname === '/profile';
  const isJobs = location.pathname.startsWith('/jobs');
  const isJobsLanding = location.pathname === '/jobs';
  const isResume = location.pathname.startsWith('/resume-builder');
  const hideGlobalFooter = isJobs && !isJobsLanding;
  const adSlotMain = (import.meta.env.VITE_ADSENSE_SLOT_MAIN || '').trim();

  // Handle role-based redirects (e.g. users with no role -> /select-role)
  useRoleBasedRedirect(user, loading);

  return (
    <div className="layout">
      {/* Universal Header */}
      <Header />

      {/* Main Content */}
      <div className="main-content">
        {/* Page Content */}
        <main className={`page-content ${isProfile || isResume ? 'page-content-profile' : ''} ${isJobs || isLanding ? 'page-content-jobs' : ''}`}>
          <Outlet />
          {!isCommunity && !isJobs && !isLanding && (
            <section className="adsense-wrap" aria-label="Advertisement">
              <AdSenseSlot slot={adSlotMain} />
            </section>
          )}
        </main>
      </div>
      
      {!hideGlobalFooter && <Footer />}

      <style>{`
        .layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-height: 100svh;
          background: var(--color-bg-primary);
          width: 100%;
          overflow-x: hidden;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-top: var(--header-height);
          min-width: 0;
        }

        .page-content {
          flex: 1;
          padding: var(--page-section-space) var(--page-gutter);
          max-width: var(--page-max-width);
          margin: 0 auto;
          width: 100%;
          min-width: 0;
        }

        .page-content-full {
          max-width: none;
          padding: 0;
          height: calc(100vh - var(--header-height));
          overflow: hidden;
        }

        .page-content-profile {
          max-width: none;
          padding: 0;
          min-height: calc(100vh - var(--header-height));
        }

        .page-content-jobs {
          max-width: none;
          padding: 0;
          width: 100%;
          min-height: calc(100vh - var(--header-height));
        }

        .adsense-wrap {
          margin-top: clamp(16px, 2vw, 24px);
          border-top: 1px solid var(--color-border);
          padding-top: 16px;
        }

        @media (max-width: 1024px) {
          .page-content {
            padding: 24px var(--page-gutter);
          }
        }

        @media (max-width: 768px) {
          .page-content {
            padding: 16px var(--page-gutter) 20px;
          }

          .page-content-full {
            height: auto;
            min-height: calc(100vh - var(--header-height));
            overflow: visible;
          }

          .page-content-profile {
            padding: 0;
          }

          .page-content-jobs {
            padding: 0;
          }

          .adsense-wrap {
            margin-top: 16px;
            padding-top: 12px;
          }
        }
      `}</style>
    </div>
  );
};

