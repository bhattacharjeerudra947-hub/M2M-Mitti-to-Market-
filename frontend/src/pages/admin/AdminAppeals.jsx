import { useState, useEffect, useCallback } from 'react';
import { getAppeals, reviewAppeal, decideAppeal } from '../../services/adminApi';
import {
  Table, Td, TableSkeleton, EmptyState, ErrorState, StatusDot,
  ConfirmDialog, MetricStrip, Avatar, selectCls,
} from '../../components/admin/ui/adminUi';
import { CheckCircle, XCircle, Eye, Loader2, ExternalLink } from 'lucide-react';
import { onNotification } from '../../utils/messageStream';

export default function AdminAppeals() {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [targetAction, setTargetAction] = useState(null); // 'REVIEW' | 'APPROVE' | 'REJECT'
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [toast, setToast] = useState(null);

  const fetchAppeals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    const res = await getAppeals(statusFilter === 'ALL' ? undefined : statusFilter);
    if (res.ok) {
      setAppeals(Array.isArray(res.data) ? res.data : []);
    } else if (!silent) {
      setError(res.error || 'Unable to load appeals');
    }
    if (!silent) setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  // Real-time auto sync
  useEffect(() => {
    const interval = setInterval(() => fetchAppeals(true), 6000);
    const unsubscribe = onNotification(() => {
      fetchAppeals(true);
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [fetchAppeals]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const openActionDialog = (appeal, action) => {
    setSelectedAppeal(appeal);
    setTargetAction(action);
    setAdminNotes(appeal.adminNotes || '');
    setDialogError('');
  };

  const handleAction = async () => {
    if (!selectedAppeal || !targetAction) return;
    setProcessing(true);
    setDialogError('');

    let res;
    if (targetAction === 'REVIEW') {
      res = await reviewAppeal(selectedAppeal.id, adminNotes);
    } else if (targetAction === 'APPROVE' || targetAction === 'REJECT') {
      res = await decideAppeal(selectedAppeal.id, targetAction, adminNotes);
    }

    setProcessing(false);
    if (res && res.ok) {
      setSelectedAppeal(null);
      setTargetAction(null);
      setAdminNotes('');
      showToast(
        targetAction === 'APPROVE'
          ? 'Appeal approved. User account reinstated to ACTIVE.'
          : targetAction === 'REJECT'
          ? 'Appeal rejected.'
          : 'Appeal marked as under review.'
      );
      fetchAppeals();
    } else {
      setDialogError(res?.error || 'Action failed. Please try again.');
    }
  };

  const pendingCount = appeals.filter((a) => a.status === 'PENDING').length;
  const reviewCount = appeals.filter((a) => a.status === 'UNDER_REVIEW').length;
  const approvedCount = appeals.filter((a) => a.status === 'APPROVED').length;
  const rejectedCount = appeals.filter((a) => a.status === 'REJECTED').length;

  const metrics = [
    { label: 'Total Appeals', value: appeals.length },
    { label: 'Pending Review', value: pendingCount, context: pendingCount > 0 ? 'Action required' : 'Clear' },
    { label: 'Under Review', value: reviewCount },
    { label: 'Approved', value: approvedCount },
    { label: 'Rejected', value: rejectedCount },
  ];

  const appealStatusInfo = (status) => {
    switch (status) {
      case 'PENDING': return { tone: 'amber', label: 'Pending' };
      case 'UNDER_REVIEW': return { tone: 'blue', label: 'Under Review' };
      case 'APPROVED': return { tone: 'green', label: 'Approved' };
      case 'REJECTED': return { tone: 'red', label: 'Rejected' };
      default: return { tone: 'gray', label: status || '—' };
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Appeals Management</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Review suspension and deactivation appeals submitted by farmers and business buyers.
        </p>
      </div>

      <MetricStrip metrics={metrics} />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectCls}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl">
          {toast}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAppeals} />
      ) : appeals.length === 0 ? (
        <EmptyState
          title="No appeals found"
          hint="There are currently no suspension appeals matching your filter."
        />
      ) : (
        <Table
          columns={[
            { key: 'user', label: 'User' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status' },
            { key: 'date', label: 'Date Submitted' },
            { key: 'reason', label: 'Reason / Context' },
            { key: 'actions', label: '', align: 'right' },
          ]}
        >
          {appeals.map((a) => {
            const sInfo = appealStatusInfo(a.status);
            return (
              <tr key={a.id} className="hover:bg-gray-50/60 transition">
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={a.userName} size={36} />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{a.userName}</div>
                      <div className="text-xs text-gray-500">
                        {a.contactPhone || a.userPhone || a.contactEmail || a.userEmail || `User #${a.userId}`}
                      </div>
                    </div>
                  </div>
                </Td>

                <Td>
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 uppercase">
                    {a.userRole}
                  </span>
                </Td>

                <Td>
                  <StatusDot tone={sInfo.tone} label={sInfo.label} />
                </Td>

                <Td>
                  <span className="text-xs text-gray-500">
                    {new Date(a.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </Td>

                <Td>
                  <div className="max-w-xs">
                    <p className="text-xs text-gray-800 line-clamp-2">{a.reason}</p>
                    {a.message && (
                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{a.message}</p>
                    )}
                    {a.documentUrl && (
                      <a
                        href={a.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View Attachment
                      </a>
                    )}
                  </div>
                </Td>

                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    {a.status === 'PENDING' && (
                      <button
                        onClick={() => openActionDialog(a, 'REVIEW')}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        Start Review
                      </button>
                    )}
                    {(a.status === 'PENDING' || a.status === 'UNDER_REVIEW') && (
                      <>
                        <button
                          onClick={() => openActionDialog(a, 'APPROVE')}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => openActionDialog(a, 'REJECT')}
                          className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                    {a.status !== 'PENDING' && a.status !== 'UNDER_REVIEW' && (
                      <span className="text-xs text-gray-400 italic">Decided</span>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Confirmation & Review Dialog */}
      <ConfirmDialog
        open={Boolean(selectedAppeal && targetAction)}
        title={
          targetAction === 'APPROVE'
            ? `Approve Appeal for ${selectedAppeal?.userName || 'User'}`
            : targetAction === 'REJECT'
            ? `Reject Appeal for ${selectedAppeal?.userName || 'User'}`
            : 'Mark Appeal as Under Review'
        }
        body={
          targetAction === 'APPROVE'
            ? 'Approving will immediately restore the user account to ACTIVE status, allowing them to transact on the platform.'
            : targetAction === 'REJECT'
            ? 'Rejecting will uphold the suspension/deactivation.'
            : 'The appeal status will change to UNDER REVIEW, notifying the user that an administrator is looking into it.'
        }
        confirmLabel={
          targetAction === 'APPROVE'
            ? 'Approve & Reinstate'
            : targetAction === 'REJECT'
            ? 'Reject Appeal'
            : 'Save & Mark Under Review'
        }
        destructive={targetAction === 'REJECT'}
        requireReason={targetAction === 'REJECT'}
        reason={adminNotes}
        onReasonChange={setAdminNotes}
        reasonPlaceholder="Admin notes / decision reasoning to the user..."
        busy={processing}
        error={dialogError}
        onConfirm={handleAction}
        onCancel={() => {
          setSelectedAppeal(null);
          setTargetAction(null);
          setAdminNotes('');
        }}
      />
    </div>
  );
}
