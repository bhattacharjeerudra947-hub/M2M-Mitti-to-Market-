import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protects routes by checking authentication and optional role.
 * In guest mode, renders children for farmer/business routes.
 *
 * Usage:
 *   <ProtectedRoute><FarmerDashboard /></ProtectedRoute>
 *   <ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>
 *   <ProtectedRoute roles={["farmer", "business"]}><SomePage /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, role, roles }) {
  const { isAuthenticated, loading, user, guestRole } = useAuth();
  const location = useLocation();

  // Show nothing while checking auth (prevents flash of protected content)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mustard-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-navy-200 border-t-navy-800 rounded-full animate-spin" />
          <p className="text-sm text-navy-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow guest mode for farmer/business routes
  if (!isAuthenticated && guestRole) {
    // If a specific role is required, check it matches the guest role
    if (role && guestRole !== role.toLowerCase()) {
      // Wrong guest role — redirect to their guest dashboard
      const fallback = guestRole === 'farmer' ? '/farmer' : '/business';
      return <Navigate to={fallback} replace />;
    }
    if (roles && !roles.map((r) => r.toLowerCase()).includes(guestRole)) {
      const fallback = guestRole === 'farmer' ? '/farmer' : '/business';
      return <Navigate to={fallback} replace />;
    }
    return children;
  }

  // Not authenticated and not in guest mode — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role if specified (for authenticated users)
  const userRole = user?.role?.toLowerCase();
  const fallback = userRole === 'farmer' ? '/farmer' : '/business';
  if (role && userRole !== role.toLowerCase()) {
    return <Navigate to={fallback} replace />;
  }
  if (roles && !roles.map((r) => r.toLowerCase()).includes(userRole)) {
    return <Navigate to={fallback} replace />;
  }

  return children;
}
