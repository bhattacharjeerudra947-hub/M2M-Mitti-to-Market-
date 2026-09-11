import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, SlidersHorizontal, Star } from 'lucide-react';
import {
  getUsers, getUserDetails, verifyUser, rejectVerification, requestResubmission,
  suspendUser, unsuspendUser, deactivateUser, restoreUser, deleteUser, getStats,
} from '../../services/adminApi';
import {
  Table, Td, TableSkeleton, EmptyState, ErrorState, MetricStrip, Avatar,
  StatusDot, verificationStatusInfo, accountStatusInfo, ConfirmDialog, Drawer,
  DrawerSection, KV, RowActions, inputCls, selectCls,
} from '../../components/admin/ui/adminUi';
import { onNotification } from '../../utils/messageStream';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [verFilter, setVerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef(null);

  // Drawer state
  const [drawerUserId, setDrawerUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Confirm dialog state
  const [dialog, setDialog] = useState({ open: false, action: null, user: null });
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput), 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const res = await getUsers(roleFilter, verFilter, statusFilter, searchQuery);
    if (res.ok) setUsers(Array.isArray(res.data) ? res.data : []);
    else if (!silent) setError(res.error || 'Unable to load users');
    if (!silent) setLoading(false);
  }, [roleFilter, verFilter, statusFilter, searchQuery]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Real-time auto sync
  useEffect(() => {
    const interval = setInterval(() => fetchUsers(true), 8000);
    const unsubscribe = onNotification(() => {
      fetchUsers(true);
      getStats().then((res) => { if (res.ok) setStats(res.data); });
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [fetchUsers]);

  useEffect(() => {
    getStats().then((res) => { if (res.ok) setStats(res.data); });
  }, [users.length]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const openDetails = async (userId) => {
    setDrawerUserId(userId);
    setUserDetails(null);
    setDetailsLoading(true);
    const res = await getUserDetails(userId);
    if (res.ok) setUserDetails(res.data);
    setDetailsLoading(false);
  };

  const openDialog = (action, user) => {
    setDialog({ open: true, action, user });
    setActionReason('');
    setDialogError('');
  };

  const executeAction = async () => {
    const { action, user } = dialog;
    setSubmitting(true);
    setDialogError('');
    const reason = actionReason.trim();

    const calls = {
      VERIFY: () => verifyUser(user.id, reason),
      REJECT: () => rejectVerification(user.id, reason),
      RESUBMIT: () => requestResubmission(user.id, reason),
      SUSPEND: () => suspendUser(user.id, reason),
      UNSUSPEND: () => unsuspendUser(user.id, reason),
      DEACTIVATE: () => deactivateUser(user.id, reason),
      RESTORE: () => restoreUser(user.id, reason),
      DELETE: () => deleteUser(user.id, reason),
    };
    const res = await calls[action]();
    setSubmitting(false);

    if (res.ok) {
      setDialog({ open: false, action: null, user: null });
      showToast(actionMessages(action, user));
      fetchUsers();
    } else {
      setDialogError(res.error || 'Action failed. Please try again.');
    }
  };

  function actionMessages(action, user) {
    switch (action) {
      case 'VERIFY': return `✓ ${user.name} verified successfully`;
      case 'REJECT': return `Verification rejected for ${user.name}`;
      case 'RESUBMIT': return `Resubmission requested from ${user.name}`;
      case 'SUSPEND': return `${user.name} suspended`;
      case 'UNSUSPEND': return `${user.name} reactivated`;
      case 'DEACTIVATE': return `${user.name} deactivated`;
      case 'RESTORE': return `${user.name} restored`;
      case 'DELETE': return `${user.name} permanently deleted`;
      default: return 'Action completed';
    }
  }

  const total = stats?.totalUsers ?? users.length;

  const metrics = [
    { label: 'Total users', value: total, context: stats ? `${stats.farmers ?? 0} farmers · ${stats.businesses ?? 0} businesses` : null },
    { label: 'Active', value: stats?.activeUsers ?? '—', context: stats && total > 0 ? `${Math.round((stats.activeUsers / total) * 100)}% of accounts` : null },
    { label: 'Pending review', value: stats?.pendingVerification ?? '—', context: (stats?.pendingVerification ?? 0) > 0 ? 'Requires attention' : 'All caught up' },
    { label: 'Suspended', value: stats?.suspendedUsers ?? 0, context: (stats?.suspendedUsers ?? 0) > 0 ? 'Currently restricted' : 'None' },
  ];

  return (
    <div className="space-y-4">
      {/* Page heading */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Users</h2>
          <p className="mt-0.5 text-[13px] text-gray-500">Manage farmers, buyers and business accounts registered on Mitti2Market.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const header = ['Name', 'Email', 'Phone', 'Role', 'Verification', 'Status', 'Rating', 'Joined'];
              const rows = users.map((u) => [u.name, u.email ?? '', u.phone ?? '', u.role, u.verificationStatus, u.status, u.rating ?? 0, u.createdAt]);
              const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `mitti2market-users-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Summary metrics — real data from /admin/stats */}
      <MetricStrip metrics={metrics} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search users by name, email or phone"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={`${inputCls} w-full sm:w-80`}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectCls} aria-label="Filter by role">
          <option value="">Role: All</option>
          <option value="FARMER">Farmer</option>
          <option value="BUSINESS">Business</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select value={verFilter} onChange={(e) => setVerFilter(e.target.value)} className={selectCls} aria-label="Filter by verification">
          <option value="">Verification: All</option>
          <option value="VERIFIED">Verified</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="RE_SUBMISSION_REQUESTED">Resubmission requested</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls} aria-label="Filter by account status">
          <option value="">Status: All</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
        <span className="ml-auto text-xs text-gray-400 tabular-nums whitespace-nowrap">{loading ? 'Loading…' : `${users.length} user${users.length === 1 ? '' : 's'}`}</span>
      </div>

      {/* Table */}
      {error && !loading ? (
        <div className="bg-white border border-gray-200 rounded-xl">
          <ErrorState message={error} onRetry={fetchUsers} />
        </div>
      ) : (
        <Table
          columns={[
            { key: 'user', label: 'User' },
            { key: 'role', label: 'Role' },
            { key: 'verification', label: 'Verification' },
            { key: 'status', label: 'Account status' },
            { key: 'rating', label: 'Rating' },
            { key: 'joined', label: 'Joined' },
            { key: 'actions', label: '', align: 'right' },
          ]}
          footer={
            <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
              Showing {users.length} of {total} registered accounts
            </div>
          }
        >
          {loading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={7}><EmptyState title="No users found" hint="Try changing your search or filters." /></td>
            </tr>
          ) : (
            users.map((u) => {
              const ver = verificationStatusInfo(u);
              const acct = accountStatusInfo(u.status);
              return (
                <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td>
                    <button onClick={() => openDetails(u.id)} className="flex items-center gap-3 text-left group">
                      <Avatar src={u.profilePhotoUrl} name={u.name} size={36} />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-gray-900 group-hover:text-emerald-700 truncate">{u.name}</span>
                        <span className="block text-xs text-gray-500 truncate">{u.email || u.phone}</span>
                      </span>
                    </button>
                  </Td>
                  <Td>
                    <span className="text-[13px] text-gray-700 capitalize">{(u.role || '').toLowerCase()}</span>
                  </Td>
                  <Td><StatusDot tone={ver.tone} label={ver.label} /></Td>
                  <Td><StatusDot tone={acct.tone} label={acct.label} /></Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 text-[13px] text-gray-700 tabular-nums">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      {u.rating ? Number(u.rating).toFixed(1) : '—'}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </Td>
                  <Td>
                    {u.role === 'ADMIN' ? (
                      <RowActions items={[{ label: 'View', onClick: () => openDetails(u.id) }]} />
                    ) : (
                      <RowActions
                        items={[
                          { label: 'View', onClick: () => openDetails(u.id) },
                          !u.verified && u.verificationStatus !== 'VERIFIED' && { label: 'Verify', onClick: () => openDialog('VERIFY', u) },
                          u.verificationStatus !== 'REJECTED' && !u.verified && { label: 'Reject verification', onClick: () => openDialog('REJECT', u), destructive: true },
                          u.status === 'ACTIVE' && { label: 'Suspend', onClick: () => openDialog('SUSPEND', u), destructive: true },
                          u.status === 'SUSPENDED' && { label: 'Reinstate', onClick: () => openDialog('UNSUSPEND', u) },
                          u.status !== 'DEACTIVATED' && { label: 'Deactivate', onClick: () => openDialog('DEACTIVATE', u), destructive: true },
                          u.status === 'DEACTIVATED' && { label: 'Restore', onClick: () => openDialog('RESTORE', u) },
                          u.verificationStatus === 'RE_SUBMISSION_REQUESTED' && { label: 'Request resubmission', onClick: () => openDialog('RESUBMIT', u) },
                          u.status !== 'DELETED' && { label: 'Delete User', onClick: () => openDialog('DELETE', u), destructive: true },
                        ].filter(Boolean)}
                      />
                    )}
                  </Td>
                </tr>
              );
            })
          )}
        </Table>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] px-4 py-2.5 bg-gray-900 text-white text-[13px] font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* User details drawer */}
      <Drawer
        open={drawerUserId !== null}
        onClose={() => setDrawerUserId(null)}
        title="User details"
        footer={
          userDetails && userDetails.user.role !== 'ADMIN' ? (
            <div className="flex items-center justify-end gap-2">
              {!userDetails.user.verified && (
                <button onClick={() => { const u = userDetails.user; setDrawerUserId(null); openDialog('VERIFY', u); }} className="px-3 py-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                  Verify
                </button>
              )}
              <button onClick={() => { const u = userDetails.user; setDrawerUserId(null); openDialog('REJECT', u); }} className="px-3 py-1.5 text-[13px] font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">
                Reject verification
              </button>
              <button onClick={() => { const u = userDetails.user; setDrawerUserId(null); openDialog('SUSPEND', u); }} className="px-3 py-1.5 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Suspend
              </button>
              <button onClick={() => { const u = userDetails.user; setDrawerUserId(null); openDialog('DEACTIVATE', u); }} className="px-3 py-1.5 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Deactivate
              </button>
            </div>
          ) : null
        }
      >
        {detailsLoading || !userDetails ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-gray-100" />
              <div className="space-y-2">
                <div className="h-3.5 w-32 rounded bg-gray-100" />
                <div className="h-3 w-44 rounded bg-gray-100" />
              </div>
            </div>
            <div className="h-24 rounded-lg bg-gray-100" />
            <div className="h-24 rounded-lg bg-gray-100" />
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div className="flex items-start gap-4 pb-5 border-b border-gray-100">
              <Avatar src={userDetails.user.profilePhotoUrl} name={userDetails.user.name} size={56} />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-gray-900">{userDetails.user.name}</p>
                <p className="text-[13px] text-gray-500">{userDetails.user.email || userDetails.user.phone}</p>
                <div className="mt-2 flex items-center gap-4">
                  <StatusDot {...verificationStatusInfo(userDetails.user)} />
                  <StatusDot {...accountStatusInfo(userDetails.user.status)} />
                  <span className="text-xs text-gray-500 capitalize">{(userDetails.user.role || '').toLowerCase()}</span>
                </div>
              </div>
            </div>

            <div className="pt-5">
              <DrawerSection title="User profile">
                <KV k="Full name" v={userDetails.user.name} />
                <KV k="Email" v={userDetails.user.email || '—'} />
                <KV k="Phone" v={userDetails.user.phone || '—'} />
                {userDetails.user.organizationName && <KV k="Organization" v={userDetails.user.organizationName} />}
                <KV k="Rating" v={userDetails.user.rating ? `${Number(userDetails.user.rating).toFixed(1)} / 5` : 'No ratings yet'} />
              </DrawerSection>

              <DrawerSection title="Location">
                <KV k="Registered location" v={userDetails.user.location || 'Not provided'} />
                {userDetails.user.state && <KV k="State" v={userDetails.user.state} />}
                {userDetails.user.district && <KV k="District" v={userDetails.user.district} />}
              </DrawerSection>

              {userDetails.farmerProfile && (
                <DrawerSection title="Farmer profile">
                  <KV k="Category" v={userDetails.farmerProfile.farmerCategory || '—'} />
                  <KV k="Crops grown" v={userDetails.farmerProfile.crops || '—'} />
                  <KV k="Land area" v={userDetails.farmerProfile.landAreaAcres ? `${userDetails.farmerProfile.landAreaAcres} acres (${userDetails.farmerProfile.landOwnership ?? '—'})` : '—'} />
                  <KV k="Aadhaar (last 4)" v={userDetails.farmerProfile.aadhaarLast4 || '—'} />
                </DrawerSection>
              )}

              {userDetails.businessProfile && (
                <DrawerSection title="Business profile">
                  <KV k="Official name" v={userDetails.businessProfile.officialName || '—'} />
                  <KV k="GSTIN" v={userDetails.businessProfile.gstin || 'Not provided'} />
                  <KV k="Registration no." v={userDetails.businessProfile.registrationNumber || 'Not provided'} />
                  {userDetails.businessProfile.monthlyRequirementKg && <KV k="Monthly requirement" v={`${userDetails.businessProfile.monthlyRequirementKg} kg`} />}
                </DrawerSection>
              )}

              <DrawerSection title="Verification">
                <KV k="Status" v={verificationStatusInfo(userDetails.user).label} />
                {userDetails.user.verificationNotes && (
                  <div className="mt-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">Admin notes / rejection reason</p>
                    <p className="text-[13px] text-gray-700">{userDetails.user.verificationNotes}</p>
                  </div>
                )}
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500">Submitted documents</p>
                  {!userDetails.documents || userDetails.documents.length === 0 ? (
                    <p className="text-[13px] text-gray-400">No documents submitted yet.</p>
                  ) : (
                    userDetails.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-gray-800 truncate">{doc.documentType}</p>
                          <p className="text-xs text-gray-500 truncate">{doc.originalFilename}</p>
                        </div>
                        {doc.cloudinaryUrl && (
                          <a href={doc.cloudinaryUrl} target="_blank" rel="noreferrer" className="ml-3 shrink-0 text-[12px] font-medium text-emerald-700 hover:text-emerald-800">
                            View
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </DrawerSection>

              <DrawerSection title="Security">
                <KV k="Account created" v={userDetails.user.createdAt ? new Date(userDetails.user.createdAt).toLocaleString() : '—'} />
                <KV k="Account status" v={accountStatusInfo(userDetails.user.status).label} />
                {userDetails.user.verifiedAt && <KV k="Verified at" v={new Date(userDetails.user.verifiedAt).toLocaleString()} />}
                {userDetails.user.verifiedBy && <KV k="Verified by" v={`Admin #${userDetails.user.verifiedBy}`} />}
              </DrawerSection>
            </div>
          </>
        )}
      </Drawer>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={dialog.open}
        title={dialogTitles(dialog.action, dialog.user)}
        body={dialogBodies(dialog.action, dialog.user)}
        confirmLabel={dialogLabels[dialog.action] || 'Confirm'}
        destructive={['SUSPEND', 'DEACTIVATE', 'REJECT', 'DELETE'].includes(dialog.action)}
        requireReason
        reasonPlaceholder={reasonPlaceholders[dialog.action]}
        busy={submitting}
        error={dialogError}
        reason={actionReason}
        onReasonChange={setActionReason}
        onCancel={() => setDialog({ open: false, action: null, user: null })}
        onConfirm={executeAction}
      />
    </div>
  );
}

const dialogLabels = {
  VERIFY: 'Verify account', REJECT: 'Reject verification', RESUBMIT: 'Request resubmission',
  SUSPEND: 'Suspend account', UNSUSPEND: 'Reinstate account', DEACTIVATE: 'Deactivate account', RESTORE: 'Restore account',
  DELETE: 'Permanently Delete User',
};

function dialogTitles(action, user) {
  if (!user) return '';
  switch (action) {
    case 'VERIFY': return `Verify ${user.name}?`;
    case 'REJECT': return `Reject verification for ${user.name}?`;
    case 'RESUBMIT': return `Request resubmission from ${user.name}?`;
    case 'SUSPEND': return 'Suspend account?';
    case 'DEACTIVATE': return 'Deactivate account?';
    case 'UNSUSPEND': return `Reinstate ${user.name}?`;
    case 'RESTORE': return `Restore ${user.name}?`;
    case 'DELETE': return `Permanently Delete ${user.name}?`;
    default: return 'Confirm action';
  }
}

function dialogBodies(action, user) {
  if (!user) return '';
  switch (action) {
    case 'SUSPEND': return `${user.name} will temporarily lose access to marketplace actions. Their listings and history are preserved.`;
    case 'DEACTIVATE': return `${user.name} will be permanently prevented from signing in. Historical records are preserved. This is the most severe account restriction.`;
    case 'REJECT': return 'The user will be notified that their verification was rejected and will see the reason you provide.';
    case 'RESUBMIT': return 'The user will be asked to submit corrected verification documents.';
    case 'VERIFY': return 'The user will receive a verified badge across the marketplace.';
    case 'UNSUSPEND': return 'The account will regain full marketplace access.';
    case 'RESTORE': return 'The account will be reactivated and can sign in again.';
    case 'DELETE': return `WARNING: This action is permanent. ${user.name}'s active produce listings and bulk requirements will be cancelled and their account soft-deleted. Historical completed transactions are preserved for audits.`;
    default: return '';
  }
}

const reasonPlaceholders = {
  SUSPEND: 'e.g. Repeated fraudulent produce listings',
  DEACTIVATE: 'e.g. Confirmed serious abuse of platform rules',
  REJECT: 'e.g. Submitted verification information is incomplete',
  RESUBMIT: 'e.g. Document unreadable — please upload a clearer scan',
  DELETE: 'e.g. Account owner requested deletion or severe platform violation',
};
