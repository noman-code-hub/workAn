import { Outlet } from 'react-router-dom';
import { Header } from './Header';

import { useAuth } from '../contexts/AuthContext';
import { useRoleBasedRedirect } from '../hooks/useRoleBasedRedirect';

export const Layout = () => {
  const { user, loading } = useAuth();

  // Handle role-based redirects (e.g. users with no role -> /select-role)
  useRoleBasedRedirect(user, loading);

  return (
    <div className="layout">
      {/* Universal Header */}
      <Header />

      {/* Main Content */}
      <div className="main-content">
        {/* Page Content */}
        <main className="page-content"><Outlet /></main>
      </div>

      <style>{`
        .layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #f8f9fb;
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

        @media (max-width: 768px) {
          .page-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};
