import { useState, useEffect, useCallback } from 'react';
import { getUsers, getUserDetails, verifyUser, rejectVerification, requestResubmission, suspendUser, unsuspendUser, deactivateUser, restoreUser } from '../../services/adminApi';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [verFilter, setVerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected User Modal
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Action Modals
  const [actionModal, setActionModal] = useState({ type: null, userId: null, userName: '' });
  const [actionReason, setActionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await getUsers(roleFilter, verFilter, statusFilter, searchQuery);
    if (res.ok) setUsers(res.data);
    setLoading(false);
  }, [roleFilter, verFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDetails = async (userId) => {
    setSelectedUserId(userId);
    setDetailsLoading(true);
    const res = await getUserDetails(userId);
    if (res.ok) setUserDetails(res.data);
    setDetailsLoading(false);
  };

  const [actionError, setActionError] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');

  const handleExecuteAction = async () => {
    if (!actionModal.type || !actionModal.userId) return;
    setSubmittingAction(true);
    setActionError('');

    let res;
    if (actionModal.type === 'VERIFY') {
      res = await verifyUser(actionModal.userId, actionReason);
    } else if (actionModal.type === 'REJECT') {
      res = await rejectVerification(actionModal.userId, actionReason);
    } else if (actionModal.type === 'RESUBMIT') {
      res = await requestResubmission(actionModal.userId, actionReason);
    } else if (actionModal.type === 'SUSPEND') {
      res = await suspendUser(actionModal.userId, actionReason);
    } else if (actionModal.type === 'UNSUSPEND') {
      res = await unsuspendUser(actionModal.userId, actionReason);
    } else if (actionModal.type === 'DEACTIVATE') {
      res = await deactivateUser(actionModal.userId, actionReason);
    } else if (actionModal.type === 'RESTORE') {
      res = await restoreUser(actionModal.userId, actionReason);
    }

    setSubmittingAction(false);

    if (res && res.ok) {
      setActionModal({ type: null, userId: null, userName: '' });
      setActionReason('');
      setActionError('');
      setActionFeedback(`User action ${actionModal.type} succeeded.`);
      setTimeout(() => setActionFeedback(''), 4000);
      fetchUsers();
    } else {
      setActionError(res?.error || 'Action failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {actionFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback('')} className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400">
            ✕
          </button>
        </div>
      )}

      {/* Title + Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">User Management</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">{users.length} Users Found</span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search name, email, phone, org..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-gray-900 dark:text-white"
          >
            <option value="">All Roles</option>
<option value="FARMER">Farmer</option>
            <option value="BUSINESS">Business / Buyer</option>
            <option value="ADMIN">Admin</option>
          </select>

          <select
            value={verFilter}
            onChange={(e) => setVerFilter(e.target.value)}
            className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-gray-900 dark:text-white"
          >
            <option value="">All Verification Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="PENDING">Pending Verification</option>
            <option value="REJECTED">Rejected</option>
            <option value="RE_SUBMISSION_REQUESTED">Re-submission Requested</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-gray-900 dark:text-white"
          >
            <option value="">All Account Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No users match the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Verification</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Joined</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{u.name}</p>
                        <p className="text-[11px] text-gray-500">{u.email}</p>
                        {u.phone && <p className="text-[10px] text-gray-400">{u.phone}</p>}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {u.role}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        u.verified
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : u.verificationStatus === 'PENDING'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : u.verificationStatus === 'REJECTED'
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {u.verified ? 'Verified ✅' : u.verificationStatus}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        u.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                          : u.status === 'SUSPENDED'
                          ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300">
                      ⭐ {u.rating ? u.rating.toFixed(1) : '0.0'}
                    </td>

                    <td className="p-4 text-gray-500 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(u.id)}
                          className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-lg text-[11px] font-medium"
                        >
                          View
                        </button>

                        {u.role === 'ADMIN' ? (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 dark:bg-purple-950 dark:text-purple-300 px-2 py-1 rounded-lg">
                            Admin
                          </span>
                        ) : (
                          <>
                            {!u.verified && (
                              <button
                                onClick={() => setActionModal({ type: 'VERIFY', userId: u.id, userName: u.name })}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold"
                              >
                                Verify
                              </button>
                            )}

                            {u.status === 'ACTIVE' ? (
                              <button
                                onClick={() => setActionModal({ type: 'SUSPEND', userId: u.id, userName: u.name })}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold"
                              >
                                Suspend
                              </button>
                            ) : u.status === 'SUSPENDED' ? (
                              <button
                                onClick={() => setActionModal({ type: 'UNSUSPEND', userId: u.id, userName: u.name })}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold"
                              >
                                Unsuspend
                              </button>
                            ) : null}

                            {u.status !== 'DEACTIVATED' ? (
                              <button
                                onClick={() => setActionModal({ type: 'DEACTIVATE', userId: u.id, userName: u.name })}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => setActionModal({ type: 'RESTORE', userId: u.id, userName: u.name })}
                                className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-semibold"
                              >
                                Restore
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">User Overview & Documents</h3>
              <button onClick={() => setSelectedUserId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                ✕
              </button>
            </div>

            {detailsLoading || !userDetails ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-gray-500 block">Full Name</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{userDetails.user.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Email Address</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{userDetails.user.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Phone</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{userDetails.user.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Organization</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{userDetails.user.organizationName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Location</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{userDetails.user.location || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Verification Notes</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{userDetails.user.verificationNotes || 'None'}</span>
                  </div>
                </div>

                {/* Profile Details */}
                {userDetails.farmerProfile && (
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-2">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300">🌾 Farmer Profile</h4>
                    <p><span className="font-medium">Category:</span> {userDetails.farmerProfile.farmerCategory}</p>
                    <p><span className="font-medium">Crops Grown:</span> {userDetails.farmerProfile.crops}</p>
                    <p><span className="font-medium">Land Area:</span> {userDetails.farmerProfile.landAreaAcres} Acres ({userDetails.farmerProfile.landOwnership})</p>
                    <p><span className="font-medium">Aadhaar (Last 4):</span> {userDetails.farmerProfile.aadhaarLast4}</p>
                  </div>
                )}

                {userDetails.businessProfile && (
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs space-y-2">
                    <h4 className="font-bold text-blue-800 dark:text-blue-300">🏢 Business Profile</h4>
                    <p><span className="font-medium">Official Name:</span> {userDetails.businessProfile.officialName}</p>
                    <p><span className="font-medium">GSTIN:</span> {userDetails.businessProfile.gstin || 'N/A'}</p>
                    <p><span className="font-medium">Registration No:</span> {userDetails.businessProfile.registrationNumber || 'N/A'}</p>
                    <p><span className="font-medium">Monthly Req:</span> {userDetails.businessProfile.monthlyRequirementKg} kg</p>
                  </div>
                )}

                {/* Uploaded Documents */}
                <div>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-white mb-2">Submitted Verification Documents</h4>
                  {(!userDetails.documents || userDetails.documents.length === 0) ? (
                    <p className="text-xs text-gray-500">No documents submitted yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-xs">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{doc.documentType}</p>
                            <p className="text-gray-500 text-[11px]">{doc.originalFilename}</p>
                          </div>
                          {doc.cloudinaryUrl && (
                            <a
                              href={doc.cloudinaryUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 text-[11px]"
                            >
                              View Document
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Action Modal */}
      {actionModal.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
              Confirm Action: {actionModal.type}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to perform <span className="font-bold">{actionModal.type}</span> on user <span className="font-semibold text-emerald-600">{actionModal.userName}</span>?
            </p>

            {actionError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                ✕ {actionError}
              </div>
            )}

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Reason / Internal Notes
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Provide a mandatory reason for this moderation action..."
                rows={3}
                className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setActionModal({ type: null, userId: null, userName: '' })}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={submittingAction}
                className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-sm ${
                  actionModal.type === 'DEACTIVATE' || actionModal.type === 'SUSPEND'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {submittingAction ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
