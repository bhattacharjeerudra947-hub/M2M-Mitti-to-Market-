import { Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { user, isAdmin, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Strict Spring Security & Frontend Auth Protection
  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { label: 'Overview', path: '/admin', icon: '📊' },
    { label: 'Users', path: '/admin/users', icon: '👥' },
    { label: 'Verifications', path: '/admin/verifications', icon: '✅' },
    { label: 'Reports', path: '/admin/reports', icon: '⚠️' },
    { label: 'Feedback', path: '/admin/feedback', icon: '💬' },
    { label: 'Deals', path: '/admin/deals', icon: '🤝' },
    { label: 'Produce', path: '/admin/produce', icon: '🌾' },
    { label: 'Disputes', path: '/admin/disputes', icon: '⚖️' },
    { label: 'Audit Log', path: '/admin/audit-log', icon: '📜' },
    { label: 'Settings', path: '/admin/settings', icon: '⚙️' },
  ];

  const current = navItems.find((n) => n.path === location.pathname);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800 shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2 font-bold text-lg text-emerald-400">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">🛡️</span>
            <span>Admin Center</span>
          </Link>
          <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
            M2M Admin
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
            <div>
              <p className="font-semibold text-slate-200">{user.name}</p>
              <p className="text-[11px] text-emerald-400 font-medium">Administrator</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-center px-3 py-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {current?.label || 'Administration'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/marketplace"
              className="text-xs font-semibold px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 dark:border-emerald-800"
            >
              🌐 View Public Marketplace
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
