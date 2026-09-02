<<<<<<< HEAD
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protects routes by checking authentication and optional role.
 *
 * Usage:
 *   <ProtectedRoute><FarmerDashboard /></ProtectedRoute>
 *   <ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>
 *   <ProtectedRoute roles={["farmer", "business"]}><SomePage /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, role, roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Show nothing while checking auth (prevents flash of protected content)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mustard-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-navy-200 border-t-navy-800 rounded-full animate-spin" />
          <p className="text-sm text-navy-500 font-medium">Loading...</p>
=======
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protects routes by checking authentication on EVERY render.
 *
 * How this prevents Back/Forward exploits:
 * 1. React Router re-renders the component tree on every navigation (including Back/Forward).
 * 2. This component checks `useAuth()` on each render.
 * 3. If the user logged out, `user` is null → immediately redirects to /login.
 * 4. If the stored user ID no longer exists in the backend, user is null → redirect.
 * 5. The backend validation on mount (in AuthContext) catches stale/invalid sessions.
 *
 * Role-based routing:
 * - If a FARMER tries to access /business/* → redirect to /farmer
 * - If a BUSINESS tries to access /farmer/* → redirect to /business
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return; // Still validating — don't redirect yet

    if (!user) {
      // Not authenticated — redirect to login, pass current location so we can redirect back after login
      navigate('/login', { replace: true, state: { from: location.pathname } });
      return;
    }

    // Check role mismatch
    const userRole = user.role.toLowerCase();
    if (requiredRole && userRole !== requiredRole) {
      navigate(userRole === 'farmer' ? '/farmer' : '/business', { replace: true });
    }
  }, [user, loading, navigate, location, requiredRole]);

  // While loading, show nothing (or a spinner)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Verifying authentication...</p>
>>>>>>> 8842d0d097e028a5bf77b37e25309ec8041f382c
        </div>
      </div>
    );
  }

<<<<<<< HEAD
  // Not authenticated — redirect to login, save intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role if specified
  const userRole = user?.role?.toLowerCase();
  if (role && userRole !== role.toLowerCase()) {
    // User is authenticated but wrong role — redirect to their dashboard
    return <Navigate to={userRole === 'farmer' ? '/farmer' : '/business'} replace />;
  }
  if (roles && !roles.map((r) => r.toLowerCase()).includes(userRole)) {
    return <Navigate to={userRole === 'farmer' ? '/farmer' : '/business'} replace />;
  }
=======
  // If not authenticated, render nothing (redirect is happening via useEffect)
  if (!user) return null;

  // If role mismatch, render nothing (redirect is happening)
  const userRole = user.role.toLowerCase();
  if (requiredRole && userRole !== requiredRole) return null;
>>>>>>> 8842d0d097e028a5bf77b37e25309ec8041f382c

  return children;
}
