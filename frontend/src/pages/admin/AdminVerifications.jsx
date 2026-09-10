import { useState, useEffect, useCallback } from 'react';
import { getVerifications, getUserDetails, verifyUser, rejectVerification, requestResubmission, requestDocReupload } from '../../services/adminApi';

export default function AdminVerifications() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Document-level re-upload state
  const [activeDocForReupload, setActiveDocForReupload] = useState(null);
  const [docReuploadReason, setDocReuploadReason] = useState('');
  const [docProcessing, setDocProcessing] = useState(false);

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    const res = await getVerifications('PENDING');
    if (res.ok) setPendingUsers(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setDetailsLoading(true);
    const res = await getUserDetails(user.id);
    if (res.ok) setSelectedDetails(res.data);
    setDetailsLoading(false);
  };

  const handleAction = async (actionType) => {
    if (!selectedUser) return;
    setProcessing(true);

    if (actionType === 'VERIFY') {
      await verifyUser(selectedUser.id, actionReason || 'Account verified by admin.');
    } else if (actionType === 'REJECT') {
      await rejectVerification(selectedUser.id, actionReason || 'Verification rejected.');
    } else if (actionType === 'RESUBMIT') {
      await requestResubmission(selectedUser.id, actionReason || 'Please upload valid replacement documents.');
    }

    setProcessing(false);
    setSelectedUser(null);
    setSelectedDetails(null);
    setActionReason('');
    fetchVerifications();
  };

  const handleDocReuploadRequest = async (docId) => {
    if (!docReuploadReason.trim()) return;
    setDocProcessing(true);
    await requestDocReupload(docId, docReuploadReason.trim());
    setDocProcessing(false);
    setActiveDocForReupload(null);
    setDocReuploadReason('');
    // Refresh user details
    if (selectedUser) {
      const res = await getUserDetails(selectedUser.id);
      if (res.ok) setSelectedDetails(res.data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">User Verification Queue</h2>
          <p className="text-xs text-gray-500 mt-0.5">Review submitted identity documents, farmer credentials & GSTIN business profiles.</p>
        </div>
        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold rounded-full text-xs">
          {pendingUsers.length} Pending
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Queue List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">Pending Applications</h3>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No pending verification requests at this time. 🎉</div>
          ) : (
            <div className="space-y-2">
              {pendingUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-700/40 border-gray-100 dark:border-gray-700 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 dark:text-white">{u.name}</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {u.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{u.email}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{u.location || 'Location Not Specified'}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Inspection & Decision Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          {!selectedUser ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-xs">
              <span className="text-3xl mb-2">📋</span>
              <p>Select a verification request from the list to review documents and credentials.</p>
            </div>
          ) : detailsLoading || !selectedDetails ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{selectedDetails.user.name}</h3>
                  <p className="text-xs text-gray-500">{selectedDetails.user.email} • {selectedDetails.user.role}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  PENDING REVIEW
                </span>
              </div>

              {/* Location details */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">📍 Registered Location Details (India)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600 dark:text-slate-300 pt-1">
                  <p><span className="font-semibold text-slate-900 dark:text-white">State:</span> {selectedDetails.user.state || 'N/A'}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-white">District:</span> {selectedDetails.user.district || 'N/A'}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-white">Tehsil:</span> {selectedDetails.user.tehsil || 'N/A'}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-white">Village:</span> {selectedDetails.user.village || 'N/A'}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-white">PIN Code:</span> {selectedDetails.user.pincode || 'N/A'}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-white">Mobile:</span> +91 {selectedDetails.user.phone || 'N/A'}</p>
                </div>
              </div>

              {/* Profile specific information */}
              {selectedDetails.farmerProfile && (
                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-2">
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300">🌾 Farmer Verification Info</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-900 dark:text-emerald-200">
                    <p><span className="font-semibold">Aadhaar Number:</span> {selectedDetails.farmerProfile.aadhaarNumber || `XXXX-XXXX-${selectedDetails.farmerProfile.aadhaarLast4}` || 'N/A'}</p>
                    <p><span className="font-semibold">Bank Account:</span> {selectedDetails.farmerProfile.bankAccountNumber || 'N/A'}</p>
                    <p><span className="font-semibold">IFSC Code:</span> {selectedDetails.farmerProfile.bankIfscCode || 'N/A'}</p>
                    <p><span className="font-semibold">Bank / Branch:</span> {selectedDetails.farmerProfile.bankName || 'N/A'} ({selectedDetails.farmerProfile.bankBranchName || 'N/A'})</p>
                  </div>
                </div>
              )}

              {selectedDetails.businessProfile && (
                <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs space-y-2">
                  <h4 className="font-bold text-blue-800 dark:text-blue-300">🏢 Business Verification Info</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-blue-900 dark:text-blue-200">
                    <p><span className="font-semibold">Business Name:</span> {selectedDetails.businessProfile.officialName || 'N/A'}</p>
                    <p><span className="font-semibold">Contact Person:</span> {selectedDetails.businessProfile.authorizedPerson || 'N/A'}</p>
                    <p><span className="font-semibold">GSTIN:</span> <span className="font-mono font-bold bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded">{selectedDetails.businessProfile.gstin || 'N/A'}</span></p>
                    <p><span className="font-semibold">PAN Number:</span> <span className="font-mono font-bold bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded">{selectedDetails.businessProfile.panNumber || 'N/A'}</span></p>
                  </div>
                </div>
              )}

              {/* Documents with Per-Document Re-upload Action */}
              <div>
                <h4 className="font-bold text-xs text-gray-900 dark:text-white mb-3">Submitted Verification Documents</h4>
                {(!selectedDetails.documents || selectedDetails.documents.length === 0) ? (
                  <p className="text-xs text-gray-500 italic">No supporting documents attached to this application.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDetails.documents.map((doc) => {
                      const isFlagged = doc.verificationStatus === 'RE_UPLOAD_REQUESTED';
                      const isEditing = activeDocForReupload === doc.id;

                      return (
                        <div key={doc.id} className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                          isFlagged
                            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-800 dark:text-gray-200">{doc.documentType}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              doc.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : isFlagged
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                            }`}>
                              {doc.verificationStatus}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-500 truncate">{doc.originalFilename}</p>

                          {doc.rejectionReason && (
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded text-[11px]">
                              <strong>Note:</strong> {doc.rejectionReason}
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            {doc.cloudinaryUrl && (
                              <a
                                href={doc.cloudinaryUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 text-center py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition-colors"
                              >
                                🔍 View Doc
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setActiveDocForReupload(isEditing ? null : doc.id);
                                setDocReuploadReason('');
                              }}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-[11px] transition-colors whitespace-nowrap"
                            >
                              {isEditing ? 'Cancel' : 'Request Re-upload'}
                            </button>
                          </div>

                          {/* Inline Re-upload Reason Input */}
                          {isEditing && (
                            <div className="pt-2 border-t border-amber-200 dark:border-amber-800 space-y-2">
                              <input
                                type="text"
                                value={docReuploadReason}
                                onChange={(e) => setDocReuploadReason(e.target.value)}
                                placeholder="Why should this doc be re-uploaded? (e.g. Unclear, blurry, expired)"
                                className="w-full text-xs p-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                              <button
                                type="button"
                                disabled={docProcessing || !docReuploadReason.trim()}
                                onClick={() => handleDocReuploadRequest(doc.id)}
                                className="w-full py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition"
                              >
                                {docProcessing ? 'Submitting...' : 'Confirm Request for this Document'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Decision Section */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    General Verification Note / Rejection Reason
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter approval notes or explanation if rejecting / requesting overall re-submission..."
                    rows={2}
                    className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => handleAction('REJECT')}
                    disabled={processing}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => handleAction('RESUBMIT')}
                    disabled={processing}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl"
                  >
                    Request Re-submission
                  </button>

                  <button
                    onClick={() => handleAction('VERIFY')}
                    disabled={processing}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md"
                  >
                    {processing ? 'Processing...' : 'Verify User ✅'}
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
