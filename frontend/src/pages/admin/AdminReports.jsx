import { useState, useEffect, useCallback } from 'react';
import { getReports, resolveReport } from '../../services/adminApi';
import {
  Table, Td, TableSkeleton, EmptyState, ErrorState, StatusDot, genericStatusInfo,
  ConfirmDialog, MetricStrip, Avatar, inputCls, selectCls,
} from '../../components/admin/ui/adminUi';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedReport, setSelectedReport] = useState(null);
  const [targetStatus, setTargetStatus] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionType, setActionType] = useState('NONE');
  const [processing, setProcessing] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [toast, setToast] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getReports(
      statusFilter === 'ALL' ? undefined : statusFilter,
      typeFilter === 'ALL' ? undefined : typeFilter,
      searchQuery.trim() ? searchQuery.trim() : undefined
    );
    if (res.ok) setReports(Array.isArray(res.data) ? res.data : []);
    else setError(res.error || 'Unable to load reports');
    setLoading(false);
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const openResolveDialog = (report, status) => {
    setSelectedReport(report);
    setTargetStatus(status);
    setAdminNote(report.adminNote || '');
    setActionType('NONE');
    setDialogError('');
  };

  const handleResolve = async () => {
    if (!selectedReport || !targetStatus) return;
    setProcessing(true);
    setDialogError('');
    const res = await resolveReport(selectedReport.id, targetStatus, adminNote, actionType);
    setProcessing(false);
    if (res.ok) {
      setSelectedReport(null);
      setTargetStatus(null);
      setAdminNote('');
      setActionType('NONE');
      showToast(targetStatus === 'RESOLVED' ? 'Report resolved' : targetStatus === 'DISMISSED' ? 'Report dismissed' : 'Report escalated');
      fetchReports();
    } else {
      setDialogError(res.error || 'Action failed. Please try again.');
    }
  };

  const openCount = reports.filter((r) => r.status === 'OPEN').length;
  const reviewCount = reports.filter((r) => r.status === 'UNDER_REVIEW').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED' || r.status === 'DISMISSED').length;

  const metrics = [
    { label: 'Total (filtered)', value: reports.length },
    { label: 'Open', value: openCount, context: openCount > 0 ? 'Awaiting investigation' : 'None waiting' },
    { label: 'Under review', value: reviewCount },
    { label: 'Resolved / dismissed', value: resolvedCount },
  ];

  const targetOf = (r) => {
    if (r.reportedUser) return { type: 'User', label: r.reportedUser.name, id: r.reportedUser.id };
    if (r.reportedProduce) return { type: 'Listing', label: r.reportedProduce.name, id: r.reportedProduce.id };
    if (r.reportedBusiness) return { type: 'Business', label: r.reportedBusiness.name, id: r.reportedBusiness.id };
    if (r.reportedDeal) return { type: 'Deal', label: `#${r.reportedDeal.dealId}`, id: r.reportedDeal.dealId };
    if (r.reportedRequirement) return { type: 'Requirement', label: r.reportedRequirement.crop, id: r.reportedRequirement.id };
    return { type: 'General', label: '—', id: null };
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Reports</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">Investigate reported accounts, listings and transactions before taking moderation action.</p>
      </div>

      <MetricStrip metrics={metrics} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by keywords, user, or reason"
          className={`${inputCls} w-full sm:w-72`}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls} aria-label="Filter by status">
          <option value="ALL">Status: All</option>
          <option value="OPEN">Open</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ESCALATED">Escalated</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls} aria-label="Filter by type">
          <option value="ALL">Type: All</option>
          <option value="SPAM">Spam</option>
          <option value="HARASSMENT">Harassment</option>
          <option value="FRAUD_SCAM">Fraud / Scam</option>
          <option value="FAKE_PRODUCE">Fake produce</option>
          <option value="PRICE_GOUGING">Price gouging</option>
          <option value="QUALITY_ISSUE">Quality issue</option>
          <option value="PAYMENT_ISSUE">Payment issue</option>
          <option value="IMPERSONATION">Impersonation</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {error && !loading ? (
        <div className="bg-white border border-gray-200 rounded-xl"><ErrorState message={error} onRetry={fetchReports} /></div>
      ) : (
        <Table
          columns={[
            { key: 'id', label: 'Report ID', width: 90 },
            { key: 'type', label: 'Category' },
            { key: 'target', label: 'Reported entity' },
            { key: 'reporter', label: 'Reporter' },
            { key: 'description', label: 'Reason' },
            { key: 'created', label: 'Created', width: 110 },
            { key: 'status', label: 'Status', width: 140 },
            { key: 'actions', label: '', align: 'right' },
          ]}
        >
          {loading ? (
            <TableSkeleton rows={8} cols={8} />
          ) : reports.length === 0 ? (
            <tr><td colSpan={8}><EmptyState title="No reports found" hint="No incidents match the current filters." /></td></tr>
          ) : (
            reports.map((r) => {
              const st = genericStatusInfo(r.status);
              const target = targetOf(r);
              const canAct = !['RESOLVED', 'DISMISSED'].includes(r.status);
              return (
                <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td><span className="font-mono text-xs font-medium text-gray-900">#{r.id}</span></Td>
                  <Td><span className="text-[13px] text-gray-700">{(r.reportType || '').replace(/_/g, ' ').toLowerCase()}</span></Td>
                  <Td>
                    <span className="block text-[13px] font-medium text-gray-900">{target.label}</span>
                    <span className="block text-xs text-gray-500">{target.type}{target.id != null ? ` · #${target.id}` : ''}</span>
                  </Td>
                  <Td>
                    <span className="block text-[13px] text-gray-700">{r.reporterName || '—'}</span>
                    <span className="block text-xs text-gray-500">{(r.reporterRole || '').toLowerCase()}</span>
                  </Td>
                  <Td><span className="block max-w-[220px] truncate text-[13px] text-gray-600" title={r.description}>{r.description || '—'}</span></Td>
                  <Td><span className="text-xs text-gray-500 whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</span></Td>
                  <Td><StatusDot tone={st.tone} label={st.label.replace(/_/g, ' ').toLowerCase()} /></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openResolveDialog(r, 'RESOLVED')}
                        disabled={!canAct}
                        className="px-2.5 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Review
                      </button>
                      {canAct && (
                        <button
                          onClick={() => openResolveDialog(r, 'DISMISSED')}
                          className="px-2.5 py-1.5 text-[12px] font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </Table>
      )}

      {/* Resolution dialog */}
      <ConfirmDialog
        open={selectedReport !== null && targetStatus === 'DISMISSED'}
        title={selectedReport ? `Dismiss report #${selectedReport.id}?` : ''}
        body="The report will be marked as dismissed with your note recorded. The reported entity will not be modified."
        confirmLabel="Dismiss report"
        destructive
        requireReason
        reasonPlaceholder="e.g. Investigation found no violation of platform rules"
        busy={processing}
        error={dialogError}
        reason={adminNote}
        onReasonChange={setAdminNote}
        onCancel={() => { setSelectedReport(null); setTargetStatus(null); }}
        onConfirm={handleResolve}
      />

      {/* Resolve dialog (richer, includes action) */}
      {selectedReport && targetStatus === 'RESOLVED' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-950/40" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-lg rounded-xl border border-gray-200 shadow-xl">
            <div className="px-6 pt-5">
              <h3 className="text-[15px] font-semibold text-gray-900">Resolve report #{selectedReport.id}</h3>
              <p className="mt-1 text-[13px] text-gray-600">
                {selectedReport.reportType?.replace(/_/g, ' ')} · reported by {selectedReport.reporterName}
              </p>
            </div>

            <div className="px-6 mt-4 space-y-3.5 max-h-[50vh] overflow-y-auto">
              <div className="px-3.5 py-3 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Report description</p>
                <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{selectedReport.description || 'No additional details provided.'}</p>
              </div>

              {selectedReport.resolvedBy && (
                <p className="text-[13px] text-emerald-700">
                  Previously actioned by {selectedReport.resolvedBy} on {selectedReport.resolvedAt && new Date(selectedReport.resolvedAt).toLocaleString()}
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Connected moderation action (optional)</label>
                <select value={actionType} onChange={(e) => setActionType(e.target.value)} className={`${selectCls} w-full`}>
                  <option value="NONE">No entity action — resolve report only</option>
                  {selectedReport.reportedUser && <option value="SUSPEND_USER">Suspend reported user</option>}
                  {selectedReport.reportedProduce && <option value="REMOVE_PRODUCE">Remove reported produce listing</option>}
                  {selectedReport.reportedRequirement && <option value="REMOVE_REQUIREMENT">Remove reported buyer requirement</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Resolution note <span className="text-red-500">*</span></label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Investigation confirmed the reported issue"
                  className="w-full text-[13px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none"
                />
              </div>

              {dialogError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-[13px] text-red-700">{dialogError}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4">
              <button
                onClick={() => { setSelectedReport(null); setTargetStatus(null); }}
                disabled={processing}
                className="px-3.5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={processing || !adminNote.trim()}
                className="px-3.5 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {processing ? 'Working…' : 'Mark resolved'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate is available via the same Review dialog — add small path: reuse resolve with ESCALATED */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] px-4 py-2.5 bg-gray-900 text-white text-[13px] font-medium rounded-lg shadow-lg">{toast}</div>
      )}
    </div>
  );
}
