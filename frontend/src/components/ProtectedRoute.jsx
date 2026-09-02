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
        </div>
      </div>
    );
  }

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

  return children;
}
