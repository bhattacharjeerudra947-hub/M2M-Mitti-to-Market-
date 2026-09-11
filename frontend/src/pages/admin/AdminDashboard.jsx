import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Clock, CheckCircle2, XCircle, RefreshCw,
  TrendingUp, Search, Filter, MapPin, ArrowRight, ShieldCheck
} from 'lucide-react';
import { getStats, getAuditLog, getUsers } from '../../services/adminApi';
import { INDIAN_STATES, getDistricts } from '../../data/indiaLocations';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State on Dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [userType, setUserType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [quickResults, setQuickResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [statsRes, logsRes] = await Promise.all([getStats(), getAuditLog()]);
      if (statsRes.ok) setStats(statsRes.data);
      if (logsRes.ok) setAuditLogs(logsRes.data.slice(0, 6));
      setLoading(false);
    }
    loadData();
    const interval = setInterval(loadData, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchUsers = async (e) => {
    e?.preventDefault();
    setSearching(true);
    const res = await getUsers(userType, statusFilter, '', searchQuery, stateFilter, districtFilter);
    if (res.ok) {
      setQuickResults(res.data || []);
    }
    setSearching(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setUserType('');
    setStatusFilter('');
    setStateFilter('');
    setDistrictFilter('');
    setQuickResults([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Exact 7 Required Summary Metrics
  const primaryCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: <Users className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50 text-blue-900 border-blue-100',
      link: '/admin/users',
      badge: 'All Registered',
    },
    {
      title: 'Pending Applications',
      value: stats?.pendingApplications ?? stats?.pendingVerification ?? 0,
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50 text-amber-900 border-amber-200',
      link: '/admin/verifications?status=PENDING',
      badge: 'Action Required',
      highlight: true,
    },
    {
      title: 'Approved Users',
      value: stats?.approvedUsers ?? stats?.verifiedUsers ?? 0,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50 text-emerald-900 border-emerald-100',
      link: '/admin/verifications?status=VERIFIED',
      badge: 'Verified',
    },
    {
      title: 'Rejected Applications',
      value: stats?.rejectedApplications ?? 0,
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      bg: 'bg-red-50 text-red-900 border-red-100',
      link: '/admin/verifications?status=REJECTED',
      badge: 'Declined',
    },
    {
      title: 'Re-upload Requests',
      value: stats?.reuploadRequests ?? 0,
      icon: <RefreshCw className="w-5 h-5 text-orange-600" />,
      bg: 'bg-orange-50 text-orange-900 border-orange-200',
      link: '/admin/verifications?status=RE_SUBMISSION_REQUESTED',
      badge: 'Awaiting User',
    },
    {
      title: 'Farmers',
      value: stats?.farmers ?? stats?.activeFarmers ?? 0,
      icon: <span className="text-xl">👨‍🌾</span>,
      bg: 'bg-green-50 text-green-900 border-green-100',
      link: '/admin/users?role=FARMER',
      badge: 'Producers',
    },
    {
      title: 'Businesses / Buyers',
      value: stats?.businesses ?? stats?.activeBusinesses ?? 0,
      icon: <span className="text-xl">🏪</span>,
      bg: 'bg-purple-50 text-purple-900 border-purple-100',
      link: '/admin/users?role=BUSINESS',
      badge: 'Wholesalers',
    },
  ];

  const marketplaceCards = [
    {
      title: 'Active Produce Listings',
      value: stats?.activeProduce ?? 0,
      subtitle: `${(stats?.totalProduceQuantity ?? 0).toLocaleString()} total units listed`,
      icon: <span className="text-xl">🌾</span>,
      link: '/admin/marketplace',
      badge: 'Live Stock',
    },
    {
      title: 'Completed Deals',
      value: stats?.completedDeals ?? 0,
      subtitle: `${stats?.totalDeals ?? 0} total deals (${stats?.activeDeals ?? 0} in progress)`,
      icon: <span className="text-xl">🤝</span>,
      link: '/admin/deals',
      badge: 'Completed',
    },
    {
      title: 'Gross Merchandise Value',
      value: `₹${Number(stats?.totalGmv ?? 0).toLocaleString('en-IN')}`,
      subtitle: 'From completed transactions',
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      link: '/admin/deals',
      badge: 'Settled GMV',
    },
    {
      title: 'Open Reports',
      value: stats?.openReports ?? 0,
      subtitle: `${stats?.resolvedReports ?? 0} resolved`,
      icon: <span className="text-xl">🚩</span>,
      link: '/admin/reports',
      badge: (stats?.openReports ?? 0) > 0 ? 'Requires Action' : 'All Clear',
      highlight: (stats?.openReports ?? 0) > 0,
    },
    {
      title: 'Platform Feedback',
      value: stats?.totalFeedback ?? 0,
      subtitle: `${stats?.unresolvedFeedback ?? 0} unresolved`,
      icon: <span className="text-xl">💬</span>,
      link: '/admin/feedback',
      badge: 'User Voice',
    },
    {
      title: 'Suspended Users',
      value: stats?.suspendedUsers ?? 0,
      subtitle: 'Account restrictions active',
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      link: '/admin/users?status=SUSPENDED',
      badge: 'Restricted',
      highlight: (stats?.suspendedUsers ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold rounded-full text-xs uppercase tracking-wider">
              Control Center
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold mt-2">Mitti2Market Admin Dashboard</h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Farmer and business verification oversight, compliance moderation queue, and user registry across India.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/verifications"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Verification Queue ({stats?.pendingApplications ?? 0})
            </Link>
          </div>
        </div>
      </div>

      {/* 7 Required Summary Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Platform Verification & User Summary
          </h2>
          <span className="text-xs text-gray-500 font-medium">Real-time statistics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {primaryCards.map((card, idx) => (
            <Link
              key={idx}
              to={card.link}
              className={`p-5 rounded-3xl border transition-all hover:shadow-md group flex flex-col justify-between ${
                card.highlight
                  ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400'
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-600">
                  {card.icon}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {card.badge}
                </span>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight group-hover:text-emerald-600 transition-colors">
                  {card.value.toLocaleString()}
                </span>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                  {card.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Marketplace, Deals & Moderation Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Marketplace, Deals & Moderation Health
          </h2>
          <span className="text-xs text-gray-500 font-medium">Auto-refreshed live metrics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketplaceCards.map((card, idx) => (
            <Link
              key={idx}
              to={card.link}
              className={`p-5 rounded-3xl border transition-all hover:shadow-md group flex flex-col justify-between ${
                card.highlight
                  ? 'bg-red-50/50 border-red-200 hover:border-red-300'
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-600">
                  {card.icon}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {card.badge}
                </span>
              </div>

              <div className="mt-4">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight group-hover:text-emerald-600 transition-colors">
                  {card.value}
                </span>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">
                  {card.title}
                </p>
                {card.subtitle && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {card.subtitle}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* User Search & Filter Bar (Requirement 10) */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600" /> Search & Filter Users
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Find farmers and businesses across India by name, mobile number, location, and verification status.
            </p>
          </div>
          {(searchQuery || userType || statusFilter || stateFilter || districtFilter) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-gray-500 hover:text-red-600 font-semibold underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        <form onSubmit={handleSearchUsers} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* 1. Name or Phone search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Name or Mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-mustard-400"
            />
          </div>

          {/* 2. User Type */}
          <div>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
            >
              <option value="">All User Types</option>
              <option value="FARMER">Farmer</option>
              <option value="BUSINESS">Business / Buyer</option>
            </select>
          </div>

          {/* 3. Verification Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Verification</option>
              <option value="VERIFIED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="RE_SUBMISSION_REQUESTED">Re-upload Required</option>
            </select>
          </div>

          {/* 4. State */}
          <div>
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setDistrictFilter('');
              }}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
            >
              <option value="">All States</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* 5. District (Dependent) */}
          <div>
            <select
              value={districtFilter}
              disabled={!stateFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white disabled:opacity-40"
            >
              <option value="">{stateFilter ? 'All Districts' : 'Select state'}</option>
              {getDistricts(stateFilter).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Search button */}
          <div className="lg:col-span-6 flex justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition"
            >
              {searching ? 'Filtering...' : 'Search Users'}
            </button>
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams();
                if (userType) params.append('role', userType);
                if (statusFilter) params.append('status', statusFilter);
                if (stateFilter) params.append('state', stateFilter);
                if (districtFilter) params.append('district', districtFilter);
                if (searchQuery) params.append('search', searchQuery);
                navigate(`/admin/verifications?${params.toString()}`);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              Open in Verification Center <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Live Filter Results Table if searched */}
        {quickResults.length > 0 && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
              <span>Matching Users ({quickResults.length})</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-semibold">
                  <tr>
                    <th className="p-3">User / Business</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Mobile</th>
                    <th className="p-3">State / District</th>
                    <th className="p-3">Verification Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {quickResults.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                      <td className="p-3 font-semibold text-gray-900 dark:text-white">
                        {u.organizationName || u.name}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-300">+91 {u.phone}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-300">
                        {u.district ? `${u.district}, ${u.state}` : u.state || 'N/A'}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : u.verificationStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : u.verificationStatus === 'RE_SUBMISSION_REQUESTED'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {u.verificationStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          to={`/admin/verifications`}
                          className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg hover:bg-emerald-100 transition inline-block"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick Audit Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Compliance & Audit Actions</h3>
          <Link to="/admin/audit-log" className="text-xs font-bold text-emerald-600 hover:underline">
            Full Audit Log →
          </Link>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No recent admin logs recorded.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[10px]">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-gray-800 dark:text-gray-200 font-medium">{log.details}</p>
                {log.reason && <p className="text-gray-500 italic text-[11px]">Note: {log.reason}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
