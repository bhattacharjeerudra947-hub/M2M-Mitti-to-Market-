import { useState, useEffect, useCallback } from 'react';
import { getReports, resolveReport } from '../../services/adminApi';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const [adminNote, setAdminNote] = useState('');
  const [actionType, setActionType] = useState('NONE');
  const [processing, setProcessing] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const res = await getReports(
      statusFilter === 'ALL' ? undefined : statusFilter,
      typeFilter === 'ALL' ? undefined : typeFilter,
      searchQuery.trim() ? searchQuery.trim() : undefined
    );
    if (res.ok) setReports(res.data || []);
    setLoading(false);
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (targetStatus) => {
    if (!selectedReport) return;
    setProcessing(true);
    const res = await resolveReport(selectedReport.id, targetStatus, adminNote, actionType);
    setProcessing(false);
    if (res.ok) {
      setSelectedReport(null);
      setAdminNote('');
      setActionType('NONE');
      fetchReports();
    }
  };

  // Quick stats derived from loaded list
  const openCount = reports.filter((r) => r.status === 'OPEN').length;
  const reviewCount = reports.filter((r) => r.status === 'UNDER_REVIEW').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Report & Moderation Center</h2>
          <p className="text-xs text-gray-500 mt-0.5">Investigate reported accounts, produce listings, scam alerts, and disputes.</p>
        </div>

        <button
          onClick={fetchReports}
          className="self-start md:self-auto text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition font-medium"
        >
          ↻ Refresh Reports
        </button>
      </div>

      {/* Mini Stat Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 block">Total Filtered</span>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{reports.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 shadow-sm">
          <span className="text-xs font-semibold text-rose-500 block">Open Incidents</span>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{openCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-sm">
          <span className="text-xs font-semibold text-amber-500 block">Under Review</span>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{reviewCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
          <span className="text-xs font-semibold text-emerald-500 block">Resolved / Closed</span>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by keywords, user, or reason..."
          className="text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white flex-1 min-w-[180px]"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 text-gray-900 dark:text-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ESCALATED">Escalated</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 text-gray-900 dark:text-white"
        >
          <option value="ALL">All Violation Types</option>
          <option value="SPAM">Spam</option>
          <option value="HARASSMENT">Harassment</option>
          <option value="FRAUD_SCAM">Fraud / Scam</option>
          <option value="FAKE_PRODUCE">Fake Produce</option>
          <option value="PRICE_GOUGING">Price Gouging</option>
          <option value="QUALITY_ISSUE">Quality Issue</option>
          <option value="PAYMENT_ISSUE">Payment Issue</option>
          <option value="IMPERSONATION">Impersonation</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">Reported Incidents ({reports.length})</h3>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No reports found for the selected filter.</div>
          ) : (
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {reports.map((r) => {
                const isSelected = selectedReport?.id === r.id;
                const statusBadgeColor =
                  r.status === 'OPEN'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : r.status === 'UNDER_REVIEW'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : r.status === 'RESOLVED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedReport(r);
                      setAdminNote(r.adminNote || '');
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-700/40 border-gray-100 dark:border-gray-700 hover:border-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded">
                        {r.reportType}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${statusBadgeColor}`}>
                        {r.status}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-900 dark:text-white mt-2 line-clamp-1">
                      {r.description || 'No description provided.'}
                    </p>

                    {/* Target chip preview */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.reportedUser && (
                        <span className="text-[9px] bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 font-medium">
                          User: {r.reportedUser.name}
                        </span>
                      )}
                      {r.reportedProduce && (
                        <span className="text-[9px] bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-medium">
                          Listing: {r.reportedProduce.name}
                        </span>
                      )}
                      {r.reportedDeal && (
                        <span className="text-[9px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-medium">
                          Deal #{r.reportedDeal.dealId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-600/50">
                      <span>By: {r.reporterName} ({r.reporterRole})</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Report Inspection & Resolution Details */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          {!selectedReport ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-xs">
              <span className="text-3xl mb-2">🚩</span>
              <p>Select a report from the list to review incident details and take moderation action.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded-md">
                    {selectedReport.reportType}
                  </span>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white mt-2">
                    Report #{selectedReport.id}
                  </h3>
                </div>
                <span className="text-xs font-extrabold px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg">
                  {selectedReport.status}
                </span>
              </div>

              {/* Reporter Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-xs space-y-1">
                <span className="text-gray-500 font-semibold block">Reporter Information</span>
                <p className="font-bold text-gray-900 dark:text-white">{selectedReport.reporterName} ({selectedReport.reporterRole})</p>
                <p className="text-gray-400">Reported At: {new Date(selectedReport.createdAt).toLocaleString()}</p>
                {selectedReport.resolvedBy && (
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                    Resolved by: {selectedReport.resolvedBy} on {new Date(selectedReport.resolvedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="font-bold text-xs text-gray-900 dark:text-white mb-1">Report Description</h4>
                <p className="text-xs text-gray-700 dark:text-gray-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40 whitespace-pre-wrap">
                  {selectedReport.description || 'No additional details provided by reporter.'}
                </p>
              </div>

              {/* Target Details */}
              <div>
                <h4 className="font-bold text-xs text-gray-900 dark:text-white mb-2">Reported Entity Evidence</h4>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 text-xs space-y-2">
                  {selectedReport.reportedUser && (
                    <p><span className="font-semibold text-gray-700 dark:text-gray-300">Reported User:</span> {selectedReport.reportedUser.name} ({selectedReport.reportedUser.role}) [ID: {selectedReport.reportedUser.id}]</p>
                  )}
                  {selectedReport.reportedProduce && (
                    <p><span className="font-semibold text-gray-700 dark:text-gray-300">Reported Produce:</span> {selectedReport.reportedProduce.name} (ID: {selectedReport.reportedProduce.id})</p>
                  )}
                  {selectedReport.reportedBusiness && (
                    <p><span className="font-semibold text-gray-700 dark:text-gray-300">Reported Business:</span> {selectedReport.reportedBusiness.name}</p>
                  )}
                  {selectedReport.reportedDeal && (
                    <p><span className="font-semibold text-gray-700 dark:text-gray-300">Reported Deal Reference:</span> Deal #{selectedReport.reportedDeal.dealId}</p>
                  )}
                  {selectedReport.reportedRequirement && (
                    <p><span className="font-semibold text-gray-700 dark:text-gray-300">Reported Requirement Crop:</span> {selectedReport.reportedRequirement.crop}</p>
                  )}
                  {!selectedReport.reportedUser && !selectedReport.reportedProduce && !selectedReport.reportedBusiness && !selectedReport.reportedDeal && !selectedReport.reportedRequirement && (
                    <p className="text-gray-400 italic">No specific entity linked (General incident report)</p>
                  )}
                </div>
              </div>

              {/* Resolution & Action Panel */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Execute Connected Moderation Action (Optional)
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5"
                  >
                    <option value="NONE">No Action On Entity (Resolve Report Only)</option>
                    {selectedReport.reportedUser && <option value="SUSPEND_USER">Suspend Reported User Account</option>}
                    {selectedReport.reportedProduce && <option value="REMOVE_PRODUCE">Remove Reported Produce Listing</option>}
                    {selectedReport.reportedRequirement && <option value="REMOVE_REQUIREMENT">Remove Reported Buyer Requirement</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Internal Admin Moderation Note
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Enter investigation notes or resolution summary..."
                    rows={3}
                    className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => handleResolve('DISMISSED')}
                    disabled={processing}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50"
                  >
                    Dismiss Report
                  </button>

                  <button
                    onClick={() => handleResolve('ESCALATED')}
                    disabled={processing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50"
                  >
                    Escalate
                  </button>

                  <button
                    onClick={() => handleResolve('RESOLVED')}
                    disabled={processing}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : 'Mark Resolved ✅'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
