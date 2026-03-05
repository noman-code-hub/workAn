import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { AdSenseSlot } from './AdSenseSlot';

import { useAuth } from '../contexts/AuthContext';
import { useRoleBasedRedirect } from '../hooks/useRoleBasedRedirect';

export const Layout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isCommunity = location.pathname === '/community';
  const isProfile = location.pathname === '/profile';
  const isJobs = location.pathname.startsWith('/jobs');
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
        <main className={`page-content ${isCommunity ? 'page-content-full' : ''} ${isProfile ? 'page-content-profile' : ''} ${isJobs ? 'page-content-jobs' : ''}`}>
          <Outlet />
          {!isCommunity && !isJobs && (
            <section className="adsense-wrap" aria-label="Advertisement">
              <AdSenseSlot slot={adSlotMain} />
            </section>
          )}
        </main>
      </div>

      <style>{`
        .layout {
          --header-height: 72px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--color-bg-primary);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-top: var(--header-height);
        }

        .page-content {
          flex: 1;
          padding: 32px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
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
          margin-top: 24px;
          border-top: 1px solid #e5e7eb;
          padding-top: 16px;
        }

        @media (max-width: 768px) {
          .page-content {
            padding: 16px;
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

