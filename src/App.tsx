import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Layout } from './components/Layout';
import { RoleGuard } from './components/RoleGuard';
import { AppLoader } from './components/AppLoader';
import { useAuth } from './contexts/AuthContext';

const LAST_ROUTE_STORAGE_KEY = 'careerpilot:last-route';
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const SelectRole = lazy(() => import('./pages/SelectRole').then((m) => ({ default: m.SelectRole })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminTemplates = lazy(() => import('./pages/AdminTemplates').then((m) => ({ default: m.AdminTemplates })));
const RecruiterDashboard = lazy(() => import('./pages/RecruiterDashboard').then((m) => ({ default: m.RecruiterDashboard })));
const Jobs = lazy(() => import('./pages/Jobs').then((m) => ({ default: m.Jobs })));
const MarketJobs = lazy(() => import('./pages/MarketJobs').then((m) => ({ default: m.MarketJobs })));
const JobDetails = lazy(() => import('./pages/JobDetails').then((m) => ({ default: m.JobDetails })));
const Resume = lazy(() => import('./pages/Resume').then((m) => ({ default: m.Resume })));
const CareerTrends = lazy(() => import('./pages/CareerTrends').then((m) => ({ default: m.CareerTrends })));
const AICopilot = lazy(() => import('./pages/AICopilot').then((m) => ({ default: m.AICopilot })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Community = lazy(() => import('./pages/Community').then((m) => ({ default: m.Community })));
const BlogDetail = lazy(() => import('./pages/BlogDetail').then((m) => ({ default: m.BlogDetail })));
const JobApplicants = lazy(() => import('./pages/JobApplicants').then((m) => ({ default: m.JobApplicants })));

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [routeLoading, setRouteLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const initialPathRef = useRef(location.pathname);
  const routeRestoreAttemptedRef = useRef(false);

  // Suppress harmless AbortError and Analytics warnings globally
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;

      // Handle AbortError from canceled fetch requests
      if (reason?.name === 'AbortError') {
        event.preventDefault();
        console.log('🟡 AbortError silently handled (component unmounted or request canceled)');
        return;
      }

      // Handle Google Analytics errors from ad blockers
      // Check multiple indicators that this is an analytics error
      if (reason?.message?.includes('Failed to fetch') || reason instanceof TypeError) {
        const stack = reason?.stack || '';
        const message = reason?.message || '';

        // Check if error originates from analytics code
        const isAnalyticsError =
          stack.includes('google-analytics.com') ||
          stack.includes('googletagmanager.com') ||
          stack.includes('analytics') ||
          stack.includes('gtag') ||
          stack.includes('frame_ant.js') || // GA iframe script
          stack.includes('dataLayer') ||
          stack.includes('js?l=dataLayer') || // GA tag manager script
          message.toLowerCase().includes('analytics');

        if (isAnalyticsError) {
          event.preventDefault();
          console.log('📊 Google Analytics blocked by ad blocker - continuing without analytics');
          return;
        }

        // Catch-all for Failed to fetch from external/injected scripts
        if (message === 'Failed to fetch' && stack) {
          // If it's from an external source (not our app code), likely a blocked resource
          const isFromOurCode = stack.includes('/src/') || stack.includes('localhost:');

          if (!isFromOurCode) {
            event.preventDefault();
            console.log('🔒 External resource blocked (likely tracking/analytics) - continuing normally');
            return;
          }
        }
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setBootLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialPathRef.current === location.pathname) {
      initialPathRef.current = '';
      return;
    }
    setRouteLoading(true);
    const timer = setTimeout(() => setRouteLoading(false), 450);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (loading || routeRestoreAttemptedRef.current) return;

    routeRestoreAttemptedRef.current = true;

    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isReload = navEntry?.type === 'reload';
    if (!isReload) return;

    const currentFullPath = `${location.pathname}${location.search}${location.hash}`;
    const savedFullPath = window.sessionStorage.getItem(LAST_ROUTE_STORAGE_KEY);

    if (!savedFullPath || savedFullPath === currentFullPath || !savedFullPath.startsWith('/')) return;

    const canRestoreFrom = ['/', '/login', '/register', '/select-role'];
    if (canRestoreFrom.includes(location.pathname)) {
      navigate(savedFullPath, { replace: true });
    }
  }, [loading, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    if (!routeRestoreAttemptedRef.current) return;

    const currentFullPath = `${location.pathname}${location.search}${location.hash}`;
    window.sessionStorage.setItem(LAST_ROUTE_STORAGE_KEY, currentFullPath);
  }, [location.pathname, location.search, location.hash]);

  if (loading) {
    return <AppLoader variant="full" message="Loading" />;
  }

  const homeRoute = !user
    ? '/dashboard'
    : !user.role
      ? '/select-role'
      : user.role === 'admin'
        ? '/admin-dashboard'
        : user.role === 'recruiter'
          ? '/recruiter'
          : '/dashboard';

  return (
    <>
      {(bootLoading || routeLoading) && <AppLoader variant="overlay" message="Loading" />}
      <Suspense fallback={<AppLoader variant="overlay" message="Loading" />}>
        <Routes>
          <Route path="/" element={<Navigate to={homeRoute} replace />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/select-role" element={<SelectRole />} />

          {/* App Routes with Flat Layout (No Sidebar) */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/market-jobs" element={<MarketJobs />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/trends" element={<CareerTrends />} />
            <Route path="/ai-copilot" element={<AICopilot />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/community" element={<Community />} />
            <Route path="/blog/:id" element={<BlogDetail />} />

            {/* Admin-Only Routes */}
            <Route
              path="/admin-dashboard"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AdminDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/templates"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AdminTemplates />
                </RoleGuard>
              }
            />
            {/* Legacy admin route redirects to dashboard */}
            <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />

            {/* Recruiter-Only Routes */}
            <Route
              path="/recruiter"
              element={
                <RoleGuard allowedRoles={['admin', 'recruiter']}>
                  <RecruiterDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/recruiter/job/:id/applicants"
              element={
                <RoleGuard allowedRoles={['admin', 'recruiter']}>
                  <JobApplicants />
                </RoleGuard>
              }
            />
          </Route>

          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
