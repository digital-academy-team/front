import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import RouteFallback from './components/RouteFallback';

// Eager: initial-load chrome, auth pages hit frequently after logout
import { Home } from './pages/Home';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import AuthCallback from './pages/auth/AuthCallback';
import SetInitialPassword from './pages/auth/SetInitialPassword';

// Lazy: post-auth pages and heavy content pages
const CourseListing = lazy(() =>
  import('./pages/CourseListing').then((m) => ({ default: m.CourseListing }))
);
const CourseDetail = lazy(() =>
  import('./pages/CourseDetail').then((m) => ({ default: m.CourseDetail }))
);
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const StudentDashboard = lazy(() => import('./pages/dashboard/StudentDashboard'));
const InstructorDashboard = lazy(() => import('./pages/instructor/InstructorDashboard'));
const Learn = lazy(() => import('./pages/Learn'));
const Search = lazy(() => import('./pages/Search'));
const Profile = lazy(() => import('./pages/Profile'));
const Certificate = lazy(() => import('./pages/Certificate'));
const Help = lazy(() => import('./pages/Help'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const QuizHistory = lazy(() => import('./pages/QuizHistory'));

export const router = createBrowserRouter([
  // Standalone pages (no Layout)
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/signup',
    Component: Signup,
  },
  {
    path: '/forgot-password',
    Component: ForgotPassword,
  },
  {
    path: '/auth/callback',
    Component: AuthCallback,
  },
  {
    path: '/auth/callback/',
    Component: AuthCallback,
  },
  {
    path: '/set-password/:userId',
    Component: SetInitialPassword,
  },
  {
    path: '/set-password/:userId/',
    Component: SetInitialPassword,
  },
  {
    path: '/learn/:courseId',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<RouteFallback />}>
          <Learn />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  // Pages with Layout
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        Component: Home,
      },
      {
        path: 'courses',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <CourseListing />
          </Suspense>
        ),
      },
      {
        path: 'course/:id',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <CourseDetail />
          </Suspense>
        ),
      },
      {
        path: 'search',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Search />
          </Suspense>
        ),
      },
      {
        path: 'cart',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Cart />
          </Suspense>
        ),
      },
      {
        path: 'checkout',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteFallback />}>
              <Checkout />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        // Legacy /dashboard → redirect to /profile
        path: 'dashboard',
        element: <Navigate to="/profile" replace />,
      },
      {
        path: 'instructor',
        element: (
          <ProtectedRoute requireRole="instructor">
            <Suspense fallback={<RouteFallback />}>
              <InstructorDashboard />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteFallback />}>
              <Profile />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'leaderboard',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteFallback />}>
              <Leaderboard />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile/quiz-history',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteFallback />}>
              <QuizHistory />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'certificate/:courseId',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteFallback />}>
              <Certificate />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'help',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Help />
          </Suspense>
        ),
      },
      {
        path: 'about',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <AboutUs />
          </Suspense>
        ),
      },
      {
        path: 'contact',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <ContactUs />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <NotFound />
          </Suspense>
        ),
      },
    ],
  },
]);
