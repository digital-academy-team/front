import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { CourseListing } from './pages/CourseListing';
import { CourseDetail } from './pages/CourseDetail';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import AuthCallback from './pages/auth/AuthCallback';
import SetInitialPassword from './pages/auth/SetInitialPassword';
import NotFound from './pages/NotFound';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import Learn from './pages/Learn';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Certificate from './pages/Certificate';
import Help from './pages/Help';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';

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
        <Learn />
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
        Component: CourseListing,
      },
      {
        path: 'course/:id',
        Component: CourseDetail,
      },
      {
        path: 'search',
        Component: Search,
      },
      {
        path: 'cart',
        Component: Cart,
      },
      {
        path: 'checkout',
        element: (
          <ProtectedRoute>
            <Checkout />
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
            <InstructorDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'certificate/:courseId',
        element: (
          <ProtectedRoute>
            <Certificate />
          </ProtectedRoute>
        ),
      },
      {
        path: 'help',
        Component: Help,
      },
      {
        path: 'about',
        Component: AboutUs,
      },
      {
        path: 'contact',
        Component: ContactUs,
      },
      {
        path: '*',
        Component: NotFound,
      },
    ],
  },
]);
