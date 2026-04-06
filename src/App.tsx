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
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const SelectRole = lazy(() => import('./pages/SelectRole').then((m) => ({ default: m.SelectRole })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminTemplates = lazy(() => import('./pages/AdminTemplates').then((m) => ({ default: m.AdminTemplates })));
const AdminCommunity = lazy(() => import('./pages/AdminCommunity').then((m) => ({ default: m.AdminCommunity })));
const RecruiterDashboard = lazy(() => import('./pages/RecruiterDashboard').then((m) => ({ default: m.RecruiterDashboard })));
const Jobs = lazy(() => import('./pages/Jobs').then((m) => ({ default: m.Jobs })));
const MarketJobs = lazy(() => import('./pages/MarketJobs').then((m) => ({ default: m.MarketJobs })));
const JobDetails = lazy(() => import('./pages/JobDetails').then((m) => ({ default: m.JobDetails })));
const JobSearchTool = lazy(() => import('./pages/JobSearchTool').then((m) => ({ default: m.JobSearchTool })));
const JobSearchDetails = lazy(() => import('./pages/JobSearchDetails').then((m) => ({ default: m.JobSearchDetails })));
const SeoJobsPage = lazy(() => import('./pages/SeoJobsPage').then((m) => ({ default: m.SeoJobsPage })));
const Resume = lazy(() => import('./pages/Resume').then((m) => ({ default: m.Resume })));
const ResumeBuilderLanding = lazy(() => import('./pages/ResumeBuilderLanding').then((m) => ({ default: m.ResumeBuilderLanding })));
const ResumeBuilderTemplates = lazy(() => import('./pages/ResumeBuilderTemplates').then((m) => ({ default: m.ResumeBuilderTemplates })));
const JobSearchLanding = lazy(() => import('./pages/JobSearchLanding').then((m) => ({ default: m.JobSearchLanding })));

const CareerTrends = lazy(() => import('./pages/CareerTrends').then((m) => ({ default: m.CareerTrends })));
const AICopilot = lazy(() => import('./pages/AICopilot').then((m) => ({ default: m.AICopilot })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Community = lazy(() => import('./pages/Community').then((m) => ({ default: m.Community })));
const CommunityBlogDetail = lazy(() => import('./pages/CommunityBlogDetail').then((m) => ({ default: m.CommunityBlogDetail })));
const BlogDetail = lazy(() => import('./pages/BlogDetail').then((m) => ({ default: m.BlogDetail })));
const JobApplicants = lazy(() => import('./pages/JobApplicants').then((m) => ({ default: m.JobApplicants })));
const GA_MEASUREMENT_ID = 'G-0PEXF8E43Y';
let lastTrackedPagePath = '';
const isBrowserRuntime = typeof window !== 'undefined';
const isLocalBrowser =
  isBrowserRuntime && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const shouldEnableProductionAnalytics =
  import.meta.env.PROD &&
  import.meta.env.VITE_ENABLE_ANALYTICS === 'true' &&
  !isLocalBrowser;

const isInjectedScriptError = (filename = '', message = '', stack = '') => {
  const source = `${filename} ${stack}`.toLowerCase();

  if (source.includes('/src/') || source.includes('localhost:5173/src/')) {
    return false;
  }

  return (
    source.includes('chrome-extension://') ||
    source.includes('moz-extension://') ||
    source.includes('safari-extension://') ||
    source.includes('webextension.js') ||
    source.includes('share-modal.js') ||
    message.toLowerCase().includes('webextension.js') ||
    message.toLowerCase().includes('share-modal.js')
  );
};

const isAnalyticsNoise = (filename = '', message = '', stack = '') => {
  const source = `${filename} ${message} ${stack}`.toLowerCase();

  return (
    source.includes('google-analytics.com') ||
    source.includes('googletagmanager.com') ||
    source.includes('analytics') ||
    source.includes('gtag') ||
    source.includes('frame_ant.js') ||
    source.includes('datalayer') ||
    source.includes('js?l=datalayer')
  );
};

const GoogleAnalyticsPageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (!shouldEnableProductionAnalytics) return;

    window.dataLayer = window.dataLayer || [];

    if (typeof window.gtag !== 'function') {
      window.gtag = (...args: unknown[]) => {
        window.dataLayer.push(args);
      };
    }

    if (!document.querySelector(`script[data-ga-id="${GA_MEASUREMENT_ID}"]`)) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      script.dataset.gaId = GA_MEASUREMENT_ID;
      document.head.appendChild(script);
    }

    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
  }, []);

  useEffect(() => {
    if (!shouldEnableProductionAnalytics) return;
    if (typeof window.gtag !== 'function') return;
    const pagePath = `${location.pathname}${location.search}${location.hash}`;

    if (pagePath === lastTrackedPagePath) return;
    lastTrackedPagePath = pagePath;

    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: pagePath,
      send_to: GA_MEASUREMENT_ID,
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
};

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
    const handleWindowError = (event: ErrorEvent) => {
      const filename = event.filename || '';
      const message = typeof event.message === 'string' ? event.message : '';
      const stack = event.error?.stack || '';

      if (isInjectedScriptError(filename, message, stack) || isAnalyticsNoise(filename, message, stack)) {
        event.preventDefault();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const currentStack = reason?.stack || '';
      const currentMessage = reason?.message || '';

      // Handle AbortError from canceled fetch requests
      if (reason?.name === 'AbortError') {
        event.preventDefault();
        return;
      }

      if (reason?.message?.includes('Failed to fetch') || reason instanceof TypeError) {
        if (isInjectedScriptError('', currentMessage, currentStack) || isAnalyticsNoise('', currentMessage, currentStack)) {
          event.preventDefault();
          return;
        }

        // Catch-all for Failed to fetch from external/injected scripts
        if (currentMessage === 'Failed to fetch' && currentStack) {
          // If it's from an external source (not our app code), likely a blocked resource
          const isFromOurCode = currentStack.includes('/src/') || currentStack.includes('localhost:');

          if (!isFromOurCode) {
            event.preventDefault();
            return;
          }
        }
      }
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
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

    const canRestoreFrom = ['/', '/login', '/select-role'];
    if (canRestoreFrom.includes(location.pathname)) {
      navigate(savedFullPath, { replace: true });
    }
  }, [loading, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    if (!routeRestoreAttemptedRef.current) return;

    const currentFullPath = `${location.pathname}${location.search}${location.hash}`;
    window.sessionStorage.setItem(LAST_ROUTE_STORAGE_KEY, currentFullPath);
  }, [location.pathname, location.search, location.hash]);

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
      <GoogleAnalyticsPageTracker />
      <Suspense fallback={<AppLoader variant="full" />}>
        <Routes>
          <Route path="/" element={<Navigate to={homeRoute} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/select-role" element={<SelectRole />} />

          {/* App Routes with Flat Layout (No Sidebar) */}
          <Route element={<Layout />}>
            <Route path="/landing" element={<JobSearchLanding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs" element={<JobSearchLanding />} />
            <Route path="/jobs/results" element={<Jobs />} />
            <Route path="/market-jobs" element={<MarketJobs />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/job-search" element={<JobSearchTool />} />
            <Route path="/job-search/:id" element={<JobSearchDetails />} />
            <Route path="/remote-software-engineer-jobs" element={<SeoJobsPage />} />
            <Route path="/truck-driver-jobs-usa" element={<SeoJobsPage />} />
            <Route path="/nurse-jobs-usa" element={<SeoJobsPage />} />
            <Route path="/government-jobs-usa" element={<SeoJobsPage />} />
            <Route path="/resume" element={<Navigate to="/resume-builder" replace />} />
            <Route path="/resume/templates" element={<Navigate to="/resume-builder/templates" replace />} />
            <Route path="/resume-builder" element={<ResumeBuilderLanding />} />
            <Route path="/resume-builder/templates" element={<ResumeBuilderTemplates />} />
            <Route path="/trends" element={<CareerTrends />} />
            <Route path="/ai-copilot" element={<AICopilot />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/:slug" element={<CommunityBlogDetail />} />
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
            <Route
              path="/admin/community"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AdminCommunity />
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

          <Route
            path="/resume-builder/editor"
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
      {shouldEnableProductionAnalytics ? <Analytics /> : null}
    </>
  );
}

export default App;
