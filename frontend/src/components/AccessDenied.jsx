import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import M2MLogo from './M2MLogo';

export default function AccessDenied({ requiredRole }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userRole = user?.role?.toUpperCase() || 'USER';
  const roleDisplay = userRole === 'FARMER' ? 'Farmer' : userRole === 'BUSINESS' ? 'Business / Buyer' : userRole === 'ADMIN' ? 'Administrator' : userRole;
  const dashboardPath = userRole === 'ADMIN' ? '/admin' : userRole === 'FARMER' ? '/farmer' : '/business';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="mb-8">
        <M2MLogo />
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-100 shadow-xl text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-200 mb-4">
          HTTP 403 Forbidden
        </div>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Your account is currently registered as <strong className="text-gray-900 font-semibold">{roleDisplay}</strong>.
          {requiredRole ? ` You do not have permission to access ${requiredRole} pages.` : ' You do not have permission to access this resource.'}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate(dashboardPath)}
            className="w-full py-3 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Go to your {roleDisplay} Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
            <span>Switch Account / Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
