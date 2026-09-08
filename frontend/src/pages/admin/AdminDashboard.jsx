import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getAuditLog } from '../../services/adminApi';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [statsRes, logsRes] = await Promise.all([getStats(), getAuditLog()]);
      if (statsRes.ok) setStats(statsRes.data);
      if (logsRes.ok) setAuditLogs(logsRes.data.slice(0, 8));
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Users', value: stats?.totalUsers || 0, icon: '👥', color: 'from-blue-500 to-indigo-600', link: '/admin/users' },
    { title: 'Verified Users', value: stats?.verifiedUsers || 0, icon: '✅', color: 'from-emerald-500 to-teal-600', link: '/admin/users?verification=VERIFIED' },
    { title: 'Pending Verification', value: stats?.pendingVerification || 0, icon: '⏳', color: 'from-amber-500 to-orange-600', link: '/admin/verifications' },
    { title: 'Active Produce', value: stats?.activeProduce || 0, icon: '🌾', color: 'from-green-500 to-emerald-600', link: '/admin/produce' },
    { title: 'Active Deals', value: stats?.activeDeals || 0, icon: '🤝', color: 'from-purple-500 to-violet-600', link: '/admin/deals' },
    { title: 'Open Reports', value: stats?.openReports || 0, icon: '⚠️', color: 'from-red-500 to-rose-600', link: '/admin/reports' },
    { title: 'Open Disputes', value: stats?.openDisputes || 0, icon: '⚖️', color: 'from-yellow-500 to-amber-600', link: '/admin/disputes' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Mitti2Market Control Center</h2>
            <p className="text-slate-300 text-sm mt-1">
              Platform status, moderation queue, user verifications & transactional oversight.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/admin/verifications"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              Review Pending Verifications ({stats?.pendingVerification || 0})
            </Link>
            <Link
              to="/admin/reports"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              Open Reports ({stats?.openReports || 0})
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Key Statistics */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Platform Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => (
            <Link
              key={idx}
              to={card.link}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{card.icon}</span>
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
                  {card.value.toLocaleString()}
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Action Queue & Recent Audit Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <h3 className="font-semibold text-base text-gray-900 dark:text-white">Quick Moderation Shortcuts</h3>
          <div className="space-y-2.5">
            <Link
              to="/admin/users?verification=PENDING"
              className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl border border-gray-200 dark:border-gray-600 transition-colors"
            >
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">🔍 User Verification Queue</span>
              <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                {stats?.pendingVerification || 0}
              </span>
            </Link>

            <Link
              to="/admin/reports?status=OPEN"
              className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-gray-200 dark:border-gray-600 transition-colors"
            >
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">🚩 Review Open Reports</span>
              <span className="text-xs bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full">
                {stats?.openReports || 0}
              </span>
            </Link>

            <Link
              to="/admin/feedback?status=NEW"
              className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl border border-gray-200 dark:border-gray-600 transition-colors"
            >
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">💬 Read Platform Feedback</span>
              <span className="text-xs text-purple-600 font-bold">Manage</span>
            </Link>

            <Link
              to="/admin/audit-log"
              className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl border border-gray-200 dark:border-gray-600 transition-colors"
            >
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">📜 System Audit Log</span>
              <span className="text-xs text-blue-600 font-bold">View</span>
            </Link>
          </div>
        </div>

        {/* Audit Timeline */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base text-gray-900 dark:text-white">Recent Admin Audit Activity</h3>
            <Link to="/admin/audit-log" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
              View Full Log →
            </Link>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No recent admin actions logged.</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl flex items-start justify-between gap-4 border border-gray-100 dark:border-gray-700">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <p className="text-xs text-gray-800 dark:text-gray-200 mt-1 font-medium">{log.details}</p>
                    {log.reason && <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">Reason: {log.reason}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-gray-400 font-medium">{new Date(log.createdAt).toLocaleString()}</span>
                    <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400">By: {log.actorName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
