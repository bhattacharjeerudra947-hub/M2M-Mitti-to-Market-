import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getStats, getAuditLog } from '../../services/adminApi';
import { MetricStrip, TableSkeleton } from '../../components/admin/ui/adminUi';

function AttentionRow({ to, label, count, urgent = false }) {
  if (!count || count <= 0) return null;
  return (
    <Link
      to={to}
      className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors group"
    >
      <span className="flex items-center gap-2.5">
        <span className={`h-1.5 w-1.5 rounded-full ${urgent ? 'bg-amber-500' : 'bg-gray-300'}`} />
        <span className="text-[13px] text-gray-700 group-hover:text-gray-900">{label}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-gray-900 tabular-nums">{count}</span>
        <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </span>
    </Link>
  );
}

function ActivityItem({ log }) {
  const d = log.createdAt ? new Date(log.createdAt) : null;
  return (
    <div className="flex gap-3 px-4 py-2.5">
      <div className="flex flex-col items-center pt-1">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
        <span className="flex-1 w-px bg-gray-100 mt-1" />
      </div>
      <div className="pb-1 min-w-0">
        <p className="text-[13px] text-gray-800 leading-snug">
          <span className="font-medium">{log.actorName || 'System'}</span> · {log.details || log.action?.replace(/_/g, ' ').toLowerCase()}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
        </p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const [statsRes, logsRes] = await Promise.all([getStats(), getAuditLog()]);
      if (!cancelled) {
        if (statsRes.ok) setStats(statsRes.data);
        if (logsRes.ok) setAuditLogs(Array.isArray(logsRes.data) ? logsRes.data.slice(0, 7) : []);
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 rounded bg-gray-100 animate-pulse" />
        <div className="bg-white border border-gray-200 rounded-xl h-[88px] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl h-72 animate-pulse" />
          <div className="bg-white border border-gray-200 rounded-xl h-72 animate-pulse lg:col-span-2" />
        </div>
      </div>
    );
  }

  const userMetrics = [
    { label: 'Total users', value: stats?.totalUsers ?? '—', context: stats ? `${stats.farmers ?? 0} farmers · ${stats.businesses ?? 0} businesses` : null },
    { label: 'Verified', value: stats?.verifiedUsers ?? '—' },
    { label: 'Active', value: stats?.activeUsers ?? '—', context: stats?.suspendedUsers ? `${stats.suspendedUsers} suspended` : null },
    { label: 'Pending verification', value: stats?.pendingVerification ?? '—' },
  ];

  const marketplaceMetrics = [
    { label: 'Active produce', value: stats?.activeProduce ?? '—', context: stats?.activeRequirements ? `${stats.activeRequirements} open buyer requirements` : null },
    { label: 'Active deals', value: stats?.activeDeals ?? '—' },
    { label: 'Completed deals', value: stats?.completedDeals ?? '—', context: stats?.cancelledDeals ? `${stats.cancelledDeals} cancelled` : null },
    { label: 'Open reports', value: stats?.openReports ?? '—' },
  ];

  const attentionItems = [
    { to: '/admin/verifications?status=PENDING', label: 'Verifications awaiting review', count: stats?.pendingVerification, urgent: true },
    { to: '/admin/reports', label: 'Open reports to investigate', count: stats?.openReports, urgent: true },
    { to: '/admin/feedback', label: 'New feedback submissions', count: stats?.pendingFeedback },
    { to: '/admin/disputes', label: 'Open disputes', count: stats?.openDisputes, urgent: true },
    { to: '/admin/verifications?status=RE_SUBMISSION_REQUESTED', label: 'Resubmissions requested from users', count: stats?.resubmissionRequired },
  ];
  const visibleAttention = attentionItems.filter((i) => i.count > 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">Platform health at a glance. Data refreshes every 30 seconds.</p>
      </div>

      <MetricStrip metrics={userMetrics} />
      <MetricStrip metrics={marketplaceMetrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Requires attention */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-[13px] font-semibold text-gray-900">Requires attention</h3>
          </div>
          {visibleAttention.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-gray-400">All clear. Nothing requires action.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {visibleAttention.map((item) => (
                <AttentionRow key={item.to} {...item} />
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-gray-900">Recent admin activity</h3>
            <Link to="/admin/audit-log" className="text-xs font-medium text-emerald-700 hover:text-emerald-800">View full log</Link>
          </div>
          {auditLogs.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-gray-400">No activity recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {auditLogs.map((log, i) => (
                <ActivityItem key={log.id ?? i} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
