import { useState, useEffect, useCallback } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import {
  getVerifications, getUserDetails, verifyUser,
  rejectVerification, requestResubmission, requestDocReupload, getStats,
} from '../../services/adminApi';
import DocumentModalPreview from '../../components/DocumentModalPreview';
import {
  Table, Td, TableSkeleton, EmptyState, ErrorState, StatusDot, verificationStatusInfo,
  ConfirmDialog, Drawer, DrawerSection, KV, MetricStrip, Avatar, inputCls, selectCls,
} from '../../components/admin/ui/adminUi';
import { onNotification } from '../../utils/messageStream';

export default function AdminVerifications() {
  const [activeTab, setActiveTab] = useState('PENDING');
  const [roleFilter, setRoleFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [applications, setApplications] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [stats, setStats] = useState(null);

  // Actions
  const [dialog, setDialog] = useState({ open: false, type: null }); // VERIFY | REJECT | RESUBMIT
  const [actionReason, setActionReason] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionError, setActionError] = useState('');

  // Per-document resubmission request
  const [docDialog, setDocDialog] = useState(null); // { id, docType }
  const [docReuploadReason, setDocReuploadReason] = useState('');
  const [docProcessing, setDocProcessing] = useState(false);

  // Document preview
  const [previewDoc, setPreviewDoc] = useState({ isOpen: false, title: '', url: '', mimeType: '' });

  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const fetchQueue = useCallback(async (silent = false) => {
    if (!silent) setLoadingQueue(true);
    setQueueError('');
    const verParam = activeTab === 'ALL' ? undefined : activeTab;
    const res = await getVerifications(verParam, roleFilter, stateFilter, districtFilter, searchQuery.trim() || undefined);
    if (res.ok) setApplications(Array.isArray(res.data) ? res.data : []);
    else if (!silent) setQueueError(res.error || 'Unable to load verification queue');
    if (!silent) setLoadingQueue(false);
  }, [activeTab, roleFilter, stateFilter, districtFilter, searchQuery]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Real-time auto sync
  useEffect(() => {
    const interval = setInterval(() => fetchQueue(true), 6000);
    const unsubscribe = onNotification(() => {
      fetchQueue(true);
      getStats().then((res) => { if (res.ok) setStats(res.data); });
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [fetchQueue]);

  useEffect(() => {
    getStats().then((res) => { if (res.ok) setStats(res.data); });
  }, [applications.length]);

  const openDetails = async (u) => {
    setSelectedUser(u);
    setSelectedDetails(null);
    setLoadingDetails(true);
    const res = await getUserDetails(u.id);
    if (res.ok) {
      setSelectedDetails(res.data);
      if (res.data?.user) setSelectedUser(res.data.user);
    }
    setLoadingDetails(false);
  };

  const openDialog = (type) => {
    setDialog({ open: true, type });
    setActionReason('');
    setActionError('');
  };

  const executeAction = async () => {
    if (!selectedUser) return;
    setActionProcessing(true);
    setActionError('');
    let res;
    if (dialog.type === 'VERIFY') {
      res = await verifyUser(selectedUser.id, actionReason.trim() || 'Application verified and approved by admin.');
    } else if (dialog.type === 'REJECT') {
      res = await rejectVerification(selectedUser.id, actionReason.trim());
    } else if (dialog.type === 'RESUBMIT') {
      res = await requestResubmission(selectedUser.id, actionReason.trim());
    }
    setActionProcessing(false);
    if (res && res.ok) {
      const actedName = selectedUser.name || 'User';
      const actedType = dialog.type;
      setDialog({ open: false, type: null });
      setSelectedUser(null);
      setSelectedDetails(null);
      showToast(actedType === 'VERIFY' ? `✓ ${actedName} verified successfully` : actedType === 'REJECT' ? 'Verification rejected' : 'Resubmission requested');
      fetchQueue();
      getStats().then((s) => { if (s.ok) setStats(s.data); });
    } else {
      setActionError(res?.error || 'Action failed. Please try again.');
    }
  };

  const requestDocReuploadFor = async () => {
    if (!docDialog) return;
    setDocProcessing(true);
    const res = await requestDocReupload(docDialog.id, docReuploadReason.trim());
    setDocProcessing(false);
    if (res.ok) {
      setDocDialog(null);
      setDocReuploadReason('');
      showToast('Document resubmission requested');
      if (selectedUser) openDetails(selectedUser);
    } else {
      showToast(res.error || 'Failed to request resubmission');
    }
  };

  const metrics = [
    { label: 'Pending review', value: stats?.pendingVerification ?? '—', context: (stats?.pendingVerification ?? 0) > 0 ? 'Requires attention' : 'Queue clear' },
    { label: 'Verified', value: stats?.verifiedUsers ?? '—' },
    { label: 'Rejected', value: stats?.rejectedVerification ?? '—' },
    { label: 'Resubmission requested', value: stats?.resubmissionRequired ?? '—' },
  ];

  const TABS = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'VERIFIED', label: 'Verified' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'RE_SUBMISSION_REQUESTED', label: 'Resubmission requested' },
    { key: 'ALL', label: 'All' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Verifications</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">Review identity and business documents before granting the verified badge.</p>
      </div>

      <MetricStrip metrics={metrics} />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
              activeTab === t.key ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {activeTab === t.key && <span className="absolute left-3 right-3 -bottom-px h-0.5 bg-gray-900" />}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email or phone"
          className={`${inputCls} w-full sm:w-72`}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectCls} aria-label="Filter by role">
          <option value="">Role: All</option>
          <option value="FARMER">Farmer</option>
          <option value="BUSINESS">Business</option>
        </select>
        <input
          type="text"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          placeholder="State"
          className={`${inputCls} w-32`}
        />
        <input
          type="text"
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          placeholder="District"
          className={`${inputCls} w-36`}
        />
        <span className="ml-auto text-xs text-gray-400 tabular-nums">{loadingQueue ? 'Loading…' : `${applications.length} application${applications.length === 1 ? '' : 's'}`}</span>
      </div>

      {queueError && !loadingQueue ? (
        <div className="bg-white border border-gray-200 rounded-xl"><ErrorState message={queueError} onRetry={fetchQueue} /></div>
      ) : (
        <Table
          columns={[
            { key: 'user', label: 'Applicant' },
            { key: 'role', label: 'Role' },
            { key: 'location', label: 'Location' },
            { key: 'status', label: 'Verification status', width: 180 },
            { key: 'joined', label: 'Joined', width: 110 },
            { key: 'actions', label: '', align: 'right' },
          ]}
        >
          {loadingQueue ? (
            <TableSkeleton rows={8} cols={6} />
          ) : applications.length === 0 ? (
            <tr><td colSpan={6}><EmptyState title="No applications found" hint={activeTab === 'PENDING' ? 'The verification queue is clear.' : 'No records match the current filters.'} /></td></tr>
          ) : (
            applications.map((u) => {
              const ver = verificationStatusInfo(u);
              return (
                <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td>
                    <button onClick={() => openDetails(u)} className="flex items-center gap-3 text-left group">
                      <Avatar src={u.profilePhotoUrl} name={u.name} size={36} />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-gray-900 group-hover:text-emerald-700 truncate">{u.name}</span>
                        <span className="block text-xs text-gray-500 truncate">{u.email || u.phone}</span>
                      </span>
                    </button>
                  </Td>
                  <Td><span className="text-[13px] text-gray-700 capitalize">{(u.role || '').toLowerCase()}</span></Td>
                  <Td><span className="block max-w-[180px] truncate text-[13px] text-gray-600" title={u.location}>{u.location || '—'}</span></Td>
                  <Td><StatusDot tone={ver.tone} label={ver.label} /></Td>
                  <Td><span className="text-xs text-gray-500 whitespace-nowrap">{u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</span></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openDetails(u)}
                        className="px-2.5 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Review
                      </button>
                      {u.verificationStatus !== 'VERIFIED' && (
                        <button
                          onClick={() => { setSelectedUser(u); openDialog('VERIFY'); }}
                          className="px-2.5 py-1.5 text-[12px] font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          Approve
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

      {/* Review drawer */}
      <Drawer
        open={selectedUser !== null}
        onClose={() => { setSelectedUser(null); setSelectedDetails(null); }}
        title="Verification review"
        footer={
          selectedUser && selectedUser.verificationStatus !== 'VERIFIED' ? (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => openDialog('RESUBMIT')}
                className="px-3 py-1.5 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Request resubmission
              </button>
              <button
                onClick={() => openDialog('REJECT')}
                className="px-3 py-1.5 text-[13px] font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
              >
                Reject
              </button>
              <button
                onClick={() => openDialog('VERIFY')}
                className="px-3.5 py-2 text-[13px] font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                Approve verification
              </button>
            </div>
          ) : null
        }
      >
        {loadingDetails || !selectedDetails ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-gray-100" />
              <div className="space-y-2">
                <div className="h-3.5 w-32 rounded bg-gray-100" />
                <div className="h-3 w-44 rounded bg-gray-100" />
              </div>
            </div>
            <div className="h-32 rounded-lg bg-gray-100" />
            <div className="h-24 rounded-lg bg-gray-100" />
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4 pb-5 border-b border-gray-100">
              <Avatar src={selectedDetails.user.profilePhotoUrl} name={selectedDetails.user.name} size={56} />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-gray-900">{selectedDetails.user.name}</p>
                <p className="text-[13px] text-gray-500">{selectedDetails.user.email || selectedDetails.user.phone}</p>
                <div className="mt-2">
                  <StatusDot {...verificationStatusInfo(selectedDetails.user)} />
                </div>
              </div>
            </div>

            <div className="pt-5">
              <DrawerSection title="Applicant profile">
                <KV k="Full name" v={selectedDetails.user.name} />
                <KV k="Email" v={selectedDetails.user.email || '—'} />
                <KV k="Phone" v={selectedDetails.user.phone || '—'} />
                {selectedDetails.user.organizationName && <KV k="Organization" v={selectedDetails.user.organizationName} />}
                <KV k="Location" v={selectedDetails.user.location || '—'} />
              </DrawerSection>

              {selectedDetails.farmerProfile && (
                <DrawerSection title="Farmer details">
                  <KV k="Category" v={selectedDetails.farmerProfile.farmerCategory || '—'} />
                  <KV k="Crops grown" v={selectedDetails.farmerProfile.crops || '—'} />
                  <KV k="Land area" v={selectedDetails.farmerProfile.landAreaAcres ? `${selectedDetails.farmerProfile.landAreaAcres} acres (${selectedDetails.farmerProfile.landOwnership ?? '—'})` : '—'} />
                  <KV k="Aadhaar (last 4)" v={selectedDetails.farmerProfile.aadhaarLast4 || '—'} />
                </DrawerSection>
              )}

              {selectedDetails.businessProfile && (
                <DrawerSection title="Business details">
                  <KV k="Official name" v={selectedDetails.businessProfile.officialName || '—'} />
                  <KV k="GSTIN" v={selectedDetails.businessProfile.gstin || 'Not provided'} />
                  <KV k="Registration no." v={selectedDetails.businessProfile.registrationNumber || 'Not provided'} />
                  {selectedDetails.businessProfile.monthlyRequirementKg && <KV k="Monthly requirement" v={`${selectedDetails.businessProfile.monthlyRequirementKg} kg`} />}
                </DrawerSection>
              )}

              <DrawerSection title="Submitted documents">
                {!selectedDetails.documents || selectedDetails.documents.length === 0 ? (
                  <p className="text-[13px] text-gray-400">No documents submitted yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDetails.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={1.8} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-gray-800 truncate">{doc.documentType}</p>
                            <p className="text-xs text-gray-500 truncate">{doc.originalFilename}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {doc.verificationStatus && (
                            <StatusDot
                              tone={doc.verificationStatus === 'VERIFIED' ? 'green' : doc.verificationStatus === 'REJECTED' ? 'red' : 'amber'}
                              label={<span className="hidden md:inline">{doc.verificationStatus.toLowerCase()}</span>}
                            />
                          )}
                          {doc.cloudinaryUrl && (
                            <button
                              onClick={() => setPreviewDoc({ isOpen: true, title: doc.documentType, url: doc.cloudinaryUrl, mimeType: doc.mimeType })}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                              aria-label="Preview document"
                            >
                              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                            </button>
                          )}
                          {doc.verificationStatus !== 'VERIFIED' && (
                            <button
                              onClick={() => { setDocDialog({ id: doc.id, docType: doc.documentType }); setDocReuploadReason(''); }}
                              className="text-[12px] font-medium text-amber-700 hover:text-amber-800 whitespace-nowrap"
                            >
                              Request re-upload
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedDetails.user.verificationNotes && (
                  <div className="mt-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">Previous admin decision</p>
                    <p className="text-[13px] text-gray-700">{selectedDetails.user.verificationNotes}</p>
                  </div>
                )}
              </DrawerSection>
            </div>
          </>
        )}
      </Drawer>

      {/* Approve / Reject / Resubmit dialog */}
      <ConfirmDialog
        open={dialog.open}
        title={
          dialog.type === 'VERIFY' ? `Approve verification for ${selectedUser?.name}?`
          : dialog.type === 'REJECT' ? `Reject verification for ${selectedUser?.name}?`
          : `Request resubmission from ${selectedUser?.name}?`
        }
        body={
          dialog.type === 'VERIFY' ? 'The user will receive the verified badge across the marketplace immediately.'
          : dialog.type === 'REJECT' ? 'The user will see that their verification was rejected, along with the reason you provide.'
          : 'The user will be asked to submit corrected verification information.'
        }
        confirmLabel={dialog.type === 'VERIFY' ? 'Approve' : dialog.type === 'REJECT' ? 'Reject verification' : 'Request resubmission'}
        destructive={dialog.type === 'REJECT'}
        requireReason={dialog.type !== 'VERIFY'}
        reasonPlaceholder={
          dialog.type === 'REJECT' ? 'e.g. Submitted verification information is incomplete'
          : dialog.type === 'RESUBMIT' ? 'e.g. Document unreadable — please upload a clearer scan'
          : undefined
        }
        busy={actionProcessing}
        error={actionError}
        reason={actionReason}
        onReasonChange={setActionReason}
        onCancel={() => setDialog({ open: false, type: null })}
        onConfirm={executeAction}
      />

      {/* Per-document re-upload dialog */}
      <ConfirmDialog
        open={docDialog !== null}
        title={docDialog ? `Request re-upload: ${docDialog.docType}` : ''}
        body="The user will be asked to upload a replacement for this specific document."
        confirmLabel="Request re-upload"
        requireReason
        reasonPlaceholder="e.g. Document unreadable or expired"
        busy={docProcessing}
        reason={docReuploadReason}
        onReasonChange={setDocReuploadReason}
        onCancel={() => setDocDialog(null)}
        onConfirm={requestDocReuploadFor}
      />

      {/* Full document preview modal */}
      <DocumentModalPreview
        isOpen={previewDoc.isOpen}
        onClose={() => setPreviewDoc({ isOpen: false, title: '', url: '', mimeType: '' })}
        title={previewDoc.title}
        url={previewDoc.url}
        mimeType={previewDoc.mimeType}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] px-4 py-2.5 bg-gray-900 text-white text-[13px] font-medium rounded-lg shadow-lg">{toast}</div>
      )}
    </div>
  );
}
