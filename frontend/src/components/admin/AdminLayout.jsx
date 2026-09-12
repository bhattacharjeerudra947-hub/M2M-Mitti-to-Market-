import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate, Navigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileCheck, Package, Handshake, Scale,
  Flag, MessageSquare, ScrollText, Settings, ExternalLink, Bell, ShieldAlert,
  CheckCheck, CheckCircle2, Inbox, Truck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AccessDenied from '../AccessDenied';
import { Avatar } from './ui/adminUi';
import { getStats } from '../../services/adminApi';
import { apiGet, apiPut } from '../../api';
import { onNotification } from '../../utils/messageStream';

const SECTIONS = [
  {
    heading: 'Operations',
    items: [
      { label: 'Overview', path: '/admin', icon: LayoutDashboard },
      { label: 'Users', path: '/admin/users', icon: Users },
      { label: 'Verifications', path: '/admin/verifications', icon: FileCheck },
      { label: 'Produce', path: '/admin/produce', icon: Package },
      { label: 'Deals', path: '/admin/deals', icon: Handshake },
      { label: 'Logistics', path: '/admin/logistics', icon: Truck },
      { label: 'Fleet (Vehicles)', path: '/admin/vehicles', icon: Truck },
      { label: 'Disputes', path: '/admin/disputes', icon: Scale },
    ],
  },
  {
    heading: 'Monitoring',
    items: [
      { label: 'Appeals', path: '/admin/appeals', icon: ShieldAlert },
      { label: 'Reports', path: '/admin/reports', icon: Flag },
      { label: 'Feedback', path: '/admin/feedback', icon: MessageSquare },
      { label: 'Audit Log', path: '/admin/audit-log', icon: ScrollText },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
  },
];

const ALL_ITEMS = SECTIONS.flatMap((s) => s.items);

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminLayout() {
  const { user, isAdmin, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const notifRef = useRef(null);
  const menuRef = useRef(null);

  // Live notifications
  const [liveNotifs, setLiveNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifTab, setNotifTab] = useState('alerts'); // 'alerts' | 'queues'

  const fetchLiveNotifs = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [notifs, countData] = await Promise.all([
        apiGet('/api/notifications'),
        apiGet('/api/notifications/unread-count'),
      ]);
      setLiveNotifs(Array.isArray(notifs) ? notifs : []);
      setUnreadCount(countData?.unreadCount || 0);
    } catch {
      // Ignore network errors during navigation
    }
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    getStats().then((res) => { if (!cancelled && res.ok) setStats(res.data); });
    fetchLiveNotifs();
    return () => { cancelled = true; };
  }, [location.pathname, fetchLiveNotifs]);

  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(fetchLiveNotifs, 10000);
    const unsubscribe = onNotification(() => {
      fetchLiveNotifs();
      getStats().then((res) => { if (res.ok) setStats(res.data); });
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [isAdmin, fetchLiveNotifs]);

  useEffect(() => setSidebarOpen(false), [location.pathname]);

  useEffect(() => {
    const onDoc = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiPut('/api/notifications/mark-read');
      setLiveNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleNotifClick = async (n) => {
    setNotifOpen(false);
    if (!n.read && n.id) {
      try {
        await apiPut(`/api/notifications/${n.id}/read`);
        setLiveNotifs((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }

    let targetUrl = '/admin';
    if (n.type?.includes('APPEAL')) targetUrl = '/admin/appeals';
    else if (n.type?.includes('VERIFICATION') || n.type === 'RESUBMISSION_REQUESTED') targetUrl = '/admin/verifications';
    else if (n.type?.includes('REPORT')) targetUrl = '/admin/reports';
    else if (n.type?.includes('DISPUTE')) targetUrl = '/admin/disputes';
    else if (n.type?.includes('FEEDBACK')) targetUrl = '/admin/feedback';
    else if (n.referenceType === 'USER') targetUrl = '/admin/users';
    else if (n.referenceType === 'PRODUCE') targetUrl = '/admin/produce';
    else if (n.referenceType === 'DEAL') targetUrl = '/admin/deals';

    navigate(targetUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <AccessDenied requiredRole="ADMINISTRATOR" />;
  }

  const current = ALL_ITEMS.find((n) => location.pathname === n.path || (n.path !== '/admin' && location.pathname.startsWith(n.path)));

  const queueItems = stats ? [
    stats.pendingAppeals > 0 && { label: `${stats.pendingAppeals} appeal${stats.pendingAppeals > 1 ? 's' : ''} awaiting review`, to: '/admin/appeals', count: stats.pendingAppeals, tone: 'amber' },
    stats.pendingVerification > 0 && { label: `${stats.pendingVerification} verification request${stats.pendingVerification > 1 ? 's' : ''} awaiting review`, to: '/admin/verifications', count: stats.pendingVerification, tone: 'blue' },
    stats.openReports > 0 && { label: `${stats.openReports} open report${stats.openReports > 1 ? 's' : ''} to investigate`, to: '/admin/reports', count: stats.openReports, tone: 'red' },
    stats.pendingFeedback > 0 && { label: `${stats.pendingFeedback} new feedback submission${stats.pendingFeedback > 1 ? 's' : ''}`, to: '/admin/feedback', count: stats.pendingFeedback, tone: 'indigo' },
    stats.openDisputes > 0 && { label: `${stats.openDisputes} open dispute${stats.openDisputes > 1 ? 's' : ''}`, to: '/admin/disputes', count: stats.openDisputes, tone: 'purple' },
  ].filter(Boolean) : [];

  const totalBadgeCount = unreadCount + queueItems.reduce((acc, q) => acc + (q.count || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-60 shrink-0 bg-white border-r border-gray-200 flex-col transition-transform duration-200 ${
          sidebarOpen ? 'flex translate-x-0' : 'hidden lg:flex -translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-gray-100 shrink-0">
          <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-gray-900 text-white shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <div className="leading-tight min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 truncate">Mitti2Market</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Admin Console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{section.heading}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors ${
                        isActive ? 'bg-emerald-50 text-emerald-800' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r bg-emerald-600" />}
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Admin account */}
        <div className="border-t border-gray-100 p-3 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar src={user.profilePhotoUrl} name={user.name} size={32} />
            <div className="min-w-0 leading-tight">
              <p className="text-[13px] font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-[11px] text-gray-400">Administrator</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-1 w-full px-2.5 py-1.5 text-[12px] font-medium text-gray-600 rounded-md hover:bg-red-50 hover:text-red-700 transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-gray-950/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              aria-label="Open menu"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span>Admin</span>
                <span>/</span>
                <span className="text-gray-600 font-medium">{current?.label || 'Console'}</span>
              </div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight truncate">{current?.label || 'Administration'}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              to="/marketplace"
              className="hidden md:inline-flex items-center gap-1.5 mr-2 text-[12px] font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View Marketplace
            </Link>

            {/* Notifications Popover */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
                {totalBadgeCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full tabular-nums shadow-sm">
                    {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Popover Header */}
                  <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex border-b border-gray-100 bg-white">
                    <button
                      onClick={() => setNotifTab('alerts')}
                      className={`flex-1 py-2 text-xs font-semibold text-center transition-colors border-b-2 ${
                        notifTab === 'alerts'
                          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Live Alerts {liveNotifs.length > 0 && `(${liveNotifs.length})`}
                    </button>
                    <button
                      onClick={() => setNotifTab('queues')}
                      className={`flex-1 py-2 text-xs font-semibold text-center transition-colors border-b-2 ${
                        notifTab === 'queues'
                          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Action Queues {queueItems.length > 0 && `(${queueItems.length})`}
                    </button>
                  </div>

                  {/* Popover Content */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
                    {notifTab === 'alerts' ? (
                      liveNotifs.length === 0 ? (
                        <div className="py-10 px-4 text-center">
                          <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                          <p className="text-xs font-medium text-gray-700">No alert messages yet</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Real-time submissions will appear here instantly.</p>
                        </div>
                      ) : (
                        liveNotifs.map((n) => {
                          const isAppeal = n.type?.includes('APPEAL');
                          const isVerif = n.type?.includes('VERIFICATION') || n.type === 'RESUBMISSION_REQUESTED';
                          const isAlert = n.type === 'SYSTEM_ALERT' || n.type?.includes('REPORT') || n.type?.includes('DISPUTE');
                          return (
                            <button
                              key={n.id}
                              onClick={() => handleNotifClick(n)}
                              className={`w-full text-left p-3.5 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                                !n.read ? 'bg-emerald-50/20' : ''
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                                  isAppeal
                                    ? 'bg-amber-100 text-amber-800'
                                    : isVerif
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isAlert
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {isAppeal ? (
                                  <ShieldAlert className="w-4 h-4" />
                                ) : isVerif ? (
                                  <FileCheck className="w-4 h-4" />
                                ) : (
                                  <Bell className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className={`text-xs font-semibold truncate ${!n.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                    {n.title}
                                  </p>
                                  <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(n.createdAt)}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                              </div>
                              {!n.read && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )
                    ) : (
                      queueItems.length === 0 ? (
                        <div className="py-10 px-4 text-center">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" strokeWidth={1.5} />
                          <p className="text-xs font-medium text-gray-700">All queues clear!</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">No pending appeals, verifications, or reports.</p>
                        </div>
                      ) : (
                        queueItems.map((q) => (
                          <Link
                            key={q.to + q.label}
                            to={q.to}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  q.tone === 'amber'
                                    ? 'bg-amber-500'
                                    : q.tone === 'blue'
                                    ? 'bg-blue-500'
                                    : q.tone === 'red'
                                    ? 'bg-red-500'
                                    : 'bg-indigo-500'
                                }`}
                              />
                              <span className="text-xs font-medium text-gray-800">{q.label}</span>
                            </div>
                            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-gray-100 text-gray-700 tabular-nums">
                              {q.count}
                            </span>
                          </Link>
                        ))
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Account menu"
              >
                <Avatar src={user.profilePhotoUrl} name={user.name} size={28} />
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-gray-400"><path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-30">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-[13px] font-medium text-gray-900">{user.name}</p>
                    <p className="text-[12px] text-gray-500 truncate">{user.email}</p>
                  </div>
                  <Link to="/admin/settings" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50">Settings</Link>
                  <Link to="/admin/audit-log" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50">Audit log</Link>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50">Sign out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
