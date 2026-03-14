import { Analytics } from '@vercel/analytics/react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { Layout } from './components/Layout';
import { RoleGuard } from './components/RoleGuard';
import { SeoManager } from './components/SeoManager';
import { AppLoader } from './components/AppLoader';
import { useAuth } from './contexts/AuthContext';
import { ResumeEditorLayout } from './components/ResumeEditorLayout';
import { useParams } from 'react-router-dom';

const LAST_ROUTE_STORAGE_KEY = 'careerpilot:last-route';
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const SelectRole = lazy(() => import('./pages/SelectRole').then((m) => ({ default: m.SelectRole })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminTemplates = lazy(() => import('./pages/AdminTemplates').then((m) => ({ default: m.AdminTemplates })));
const RecruiterDashboard = lazy(() => import('./pages/RecruiterDashboard').then((m) => ({ default: m.RecruiterDashboard })));
const Jobs = lazy(() => import('./pages/Jobs').then((m) => ({ default: m.Jobs })));
const MarketJobs = lazy(() => import('./pages/MarketJobs').then((m) => ({ default: m.MarketJobs })));
const JobDetails = lazy(() => import('./pages/JobDetails').then((m) => ({ default: m.JobDetails })));
const JobSearchTool = lazy(() => import('./pages/JobSearchTool').then((m) => ({ default: m.JobSearchTool })));
const JobSearchDetails = lazy(() => import('./pages/JobSearchDetails').then((m) => ({ default: m.JobSearchDetails })));
const SeoJobsPage = lazy(() => import('./pages/SeoJobsPage').then((m) => ({ default: m.SeoJobsPage })));
const Resume = lazy(() => import('./pages/Resume').then((m) => ({ default: m.Resume })));
const ResumeTemplates = lazy(() => import('./pages/ResumeTemplates').then((m) => ({ default: m.ResumeTemplates })));
const CareerTrends = lazy(() => import('./pages/CareerTrends').then((m) => ({ default: m.CareerTrends })));
const AICopilot = lazy(() => import('./pages/AICopilot').then((m) => ({ default: m.AICopilot })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Community = lazy(() => import('./pages/Community').then((m) => ({ default: m.Community })));
const BlogDetail = lazy(() => import('./pages/BlogDetail').then((m) => ({ default: m.BlogDetail })));
const JobApplicants = lazy(() => import('./pages/JobApplicants').then((m) => ({ default: m.JobApplicants })));

const LegacyResumeEditorRedirect = () => {
  const { templateId } = useParams();
  const to = useMemo(() => `/resume-editor/${templateId || ''}`, [templateId]);
  return <Navigate to={to} replace />;
};

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const initialPathRef = useRef(location.pathname);
  const routeRestoreAttemptedRef = useRef(false);

  // Suppress harmless AbortError and analytics-blocker noise.
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;

      // Handle AbortError from canceled fetch requests
      if (reason?.name === 'AbortError') {
        event.preventDefault();
        console.log('AbortError silently handled (component unmounted or request canceled)');
        return;
      }

      // Handle Google Analytics errors from ad blockers
      // Check multiple indicators that this is an analytics error
      if (reason?.message?.includes('Failed to fetch') || reason instanceof TypeError) {
        const currentStack = reason?.stack || '';
        const currentMessage = reason?.message || '';

        // Check if error originates from analytics code
        const isAnalyticsError =
          currentStack.includes('google-analytics.com') ||
          currentStack.includes('googletagmanager.com') ||
          currentStack.includes('analytics') ||
          currentStack.includes('gtag') ||
          currentStack.includes('frame_ant.js') || // GA iframe script
          currentStack.includes('dataLayer') ||
          currentStack.includes('js?l=dataLayer') || // GA tag manager script
          currentMessage.toLowerCase().includes('analytics');

        if (isAnalyticsError) {
          event.preventDefault();
          console.log('Google Analytics blocked by ad blocker - continuing without analytics');
          return;
        }

        // Catch-all for Failed to fetch from external/injected scripts
        if (currentMessage === 'Failed to fetch' && currentStack) {
          // If it's from an external source (not our app code), likely a blocked resource
          const isFromOurCode = currentStack.includes('/src/') || currentStack.includes('localhost:');

          if (!isFromOurCode) {
            event.preventDefault();
            console.log('External resource blocked (likely tracking/analytics) - continuing normally');
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
    if (initialPathRef.current === location.pathname) {
      initialPathRef.current = '';
    }
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

  // if (loading) {
  //   return <AppLoader variant="full" />;
  // }

  const homeRoute = !user
    ? '/landing'
    : !user.role
      ? '/select-role'
      : user.role === 'admin'
        ? '/admin-dashboard'
        : user.role === 'recruiter'
          ? '/recruiter'
          : '/jobs';

  return (
    <>
      <SeoManager />
      {/* {(bootLoading || routeLoading) && <AppLoader variant="overlay" />} */}
      <Suspense fallback={<AppLoader variant="full" />}>
        <Routes>
          <Route path="/" element={<Navigate to={homeRoute} replace />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/select-role" element={<SelectRole />} />

          {/* App Routes with Flat Layout (No Sidebar) */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/results" element={<Jobs />} />
            <Route path="/market-jobs" element={<MarketJobs />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/job-search" element={<JobSearchTool />} />
            <Route path="/job-search/:id" element={<JobSearchDetails />} />
            <Route path="/remote-software-engineer-jobs" element={<SeoJobsPage />} />
            <Route path="/truck-driver-jobs-usa" element={<SeoJobsPage />} />
            <Route path="/nurse-jobs-usa" element={<SeoJobsPage />} />
            <Route path="/government-jobs-usa" element={<SeoJobsPage />} />
            <Route path="/resume" element={<Navigate to="/resume/templates" replace />} />
            <Route path="/resume/templates" element={<ResumeTemplates />} />
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

          <Route
            path="/resume-editor/:templateId"
            element={
              <ResumeEditorLayout>
                <Resume />
              </ResumeEditorLayout>
            }
          />

          {/* Back-compat redirect */}
          <Route path="/resume/editor/:templateId" element={<LegacyResumeEditorRedirect />} />

          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      <Analytics />
    </>
  );
}

export default App;
