import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';

import { useAuth } from '../contexts/AuthContext';
import { useRoleBasedRedirect } from '../hooks/useRoleBasedRedirect';

export const Layout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isCommunity = location.pathname === '/community';
  const isProfile = location.pathname === '/profile';
  const isJobs = location.pathname === '/jobs';

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
        </main>
      </div>

      <style>{`
        .layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--color-bg-primary);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
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
          height: calc(100vh - 72px);
          overflow: hidden;
        }

        .page-content-profile {
          max-width: none;
          padding: 0;
          min-height: calc(100vh - 72px);
        }

        .page-content-jobs {
          max-width: none;
          padding: 0;
          width: 100%;
          min-height: calc(100vh - 72px);
        }

        @media (max-width: 768px) {
          .page-content {
            padding: 16px;
          }

          .page-content-full {
            height: auto;
            min-height: calc(100vh - 72px);
            overflow: visible;
          }

          .page-content-profile {
            padding: 0;
          }

          .page-content-jobs {
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};
