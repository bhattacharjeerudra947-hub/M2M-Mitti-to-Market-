import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, CheckCircle2, XCircle, RefreshCw, Search,
  MapPin, Phone, Mail, Building, User, FileText, Download,
  ExternalLink, Eye, AlertCircle, Loader2, Filter, Compass, CreditCard
} from 'lucide-react';
import {
  getVerifications, getUserDetails, verifyUser,
  rejectVerification, requestResubmission, requestDocReupload, getStats
} from '../../services/adminApi';
import { INDIAN_STATES, getDistricts } from '../../data/indiaLocations';
import DocumentModalPreview from '../../components/DocumentModalPreview';

export default function AdminVerifications() {
  // Filter States
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | VERIFIED | REJECTED | RE_SUBMISSION_REQUESTED | ALL
  const [roleFilter, setRoleFilter] = useState(''); // '' | FARMER | BUSINESS
  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Queue & Selection
  const [applications, setApplications] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Platform stats for live counts
  const [stats, setStats] = useState(null);

  // Action Modals / Forms
  const [actionProcessing, setActionProcessing] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Per-Document Re-upload State
  const [reuploadDocTarget, setReuploadDocTarget] = useState(null); // { id, docType }
  const [docReuploadReason, setDocReuploadReason] = useState('');
  const [docProcessing, setDocProcessing] = useState(false);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState({ isOpen: false, title: '', url: '', mimeType: '' });

  // Load summary counts
  const fetchStats = async () => {
    const res = await getStats();
    if (res.ok) setStats(res.data);
  };

  // Load applications matching filters
  const fetchApplications = useCallback(async () => {
    setLoadingQueue(true);
    const verParam = activeTab === 'ALL' ? '' : activeTab;
    const res = await getVerifications(verParam, roleFilter, stateFilter, districtFilter, searchQuery);
    if (res.ok) {
      setApplications(res.data || []);
      // Auto-select first item if current selection is invalid
      if (res.data && res.data.length > 0) {
        if (!selectedUser || !res.data.some((u) => u.id === selectedUser.id)) {
          handleSelectUser(res.data[0]);
        }
      } else {
        setSelectedUser(null);
        setSelectedDetails(null);
      }
    }
    setLoadingQueue(false);
  }, [activeTab, roleFilter, stateFilter, districtFilter, searchQuery, selectedUser]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleSelectUser = async (u) => {
    setSelectedUser(u);
    setLoadingDetails(true);
    const res = await getUserDetails(u.id);
    if (res.ok) {
      setSelectedDetails(res.data);
    }
    setLoadingDetails(false);
  };

  // ─────────────────────────────────────────────────────────────
  // Action: Accept (Approve)
  // ─────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selectedUser) return;
    setActionProcessing(true);
    const res = await verifyUser(selectedUser.id, approvalNotes || 'Application verified and approved by admin.');
    setActionProcessing(false);
    if (res.ok) {
      setApprovalNotes('');
      fetchStats();
      fetchApplications();
      // Reload current user details
      handleSelectUser(selectedUser);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Action: Reject (Mandatory Reason)
  // ─────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!selectedUser || !rejectionReason.trim()) return;
    setActionProcessing(true);
    const res = await rejectVerification(selectedUser.id, rejectionReason.trim());
    setActionProcessing(false);
    setRejectionModalOpen(false);
    setRejectionReason('');
    if (res.ok) {
      fetchStats();
      fetchApplications();
      handleSelectUser(selectedUser);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Action: Request Document Re-upload
  // ─────────────────────────────────────────────────────────────
  const handleRequestDocReupload = async () => {
    if (!reuploadDocTarget || !docReuploadReason.trim()) return;
    setDocProcessing(true);
    const res = await requestDocReupload(reuploadDocTarget.id, docReuploadReason.trim());
    setDocProcessing(false);
    setReuploadDocTarget(null);
    setDocReuploadReason('');
    if (res.ok) {
      fetchStats();
      fetchApplications();
      if (selectedUser) {
        handleSelectUser(selectedUser);
      }
    }
  };

  const getStatusBadge = (statusVal) => {
    switch (statusVal) {
      case 'VERIFIED':
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'RE_SUBMISSION_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
            <RefreshCw className="w-3 h-3" /> Re-upload Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            ⏳ Pending Verification
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            KYC & Application Verification Center
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Review submitted Farmer and Business credentials, examine proof documents, and manage approval decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchStats();
              fetchApplications();
            }}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap gap-1.5">
        {[
          { key: 'PENDING', label: 'Pending Verification', count: stats?.pendingApplications ?? 0, color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40' },
          { key: 'VERIFIED', label: 'Approved Users', count: stats?.approvedUsers ?? 0, color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40' },
          { key: 'REJECTED', label: 'Rejected Applications', count: stats?.rejectedApplications ?? 0, color: 'text-red-700 bg-red-50 dark:bg-red-950/40' },
          { key: 'RE_SUBMISSION_REQUESTED', label: 'Waiting for Re-upload', count: stats?.reuploadRequests ?? 0, color: 'text-orange-700 bg-orange-50 dark:bg-orange-950/40' },
          { key: 'ALL', label: 'All Applications', count: stats?.totalUsers ?? 0, color: 'text-gray-700 bg-gray-50 dark:bg-gray-700/50' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isActive
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                isActive ? 'bg-white/20 text-white' : tab.color
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Name, Mobile, Business, Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-mustard-400"
          />
        </div>

        {/* Role / User Type */}
        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white"
          >
            <option value="">All Account Types</option>
            <option value="FARMER">Farmer</option>
            <option value="BUSINESS">Business / Buyer</option>
          </select>
        </div>

        {/* State Filter */}
        <div>
          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setDistrictFilter('');
            }}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white"
          >
            <option value="">All Indian States</option>
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter (Dependent) */}
        <div>
          <select
            value={districtFilter}
            disabled={!stateFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white disabled:opacity-40"
          >
            <option value="">{stateFilter ? 'All Districts' : 'Select state first'}</option>
            {getDistricts(stateFilter).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Applications Queue List (4 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-800 rounded-3xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between px-2 pb-1 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Applications Queue ({applications.length})
            </h3>
          </div>

          {loadingQueue ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
            </div>
          ) : applications.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400 space-y-1">
              <span className="text-3xl block mb-2">🎉</span>
              <p className="font-semibold text-gray-700 dark:text-gray-300">No applications found</p>
              <p>No user verification requests match your current filters.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
              {applications.map((app) => {
                const isSelected = selectedUser?.id === app.id;
                const isFarmer = app.role === 'FARMER';

                return (
                  <button
                    key={app.id}
                    onClick={() => handleSelectUser(app)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all text-xs space-y-2 ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 shadow-sm'
                        : 'bg-gray-50/60 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{isFarmer ? '👨‍🌾' : '🏪'}</span>
                          <span className="font-bold text-gray-900 dark:text-white truncate max-w-[180px]">
                            {app.organizationName || app.name}
                          </span>
                        </div>
                        {app.organizationName && (
                          <p className="text-[11px] text-gray-500 ml-6 truncate">{app.name}</p>
                        )}
                      </div>
                      {getStatusBadge(app.verificationStatus)}
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                      <p className="flex items-center gap-1 truncate">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        +91 {app.phone}
                      </p>
                      <p className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        {app.district || app.state ? `${app.district || ''}, ${app.state || ''}` : 'Location Unset'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Complete Inspection & Decision Panel (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          {!selectedUser ? (
            <div className="py-24 text-center text-gray-400 space-y-2">
              <span className="text-4xl block">📋</span>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No application selected</p>
              <p className="text-xs">Select a user application from the queue to inspect details and documents.</p>
            </div>
          ) : loadingDetails || !selectedDetails ? (
            <div className="py-24 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs text-gray-400 mt-2">Loading application details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header: User Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedDetails.user.role === 'FARMER' ? '👨‍🌾' : '🏪'}</span>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedDetails.user.organizationName || selectedDetails.user.name}
                    </h2>
                    <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-extrabold rounded-md uppercase">
                      {selectedDetails.user.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    User ID #{selectedDetails.user.id} • Registered {new Date(selectedDetails.user.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>

                <div>
                  {getStatusBadge(selectedDetails.user.verificationStatus)}
                </div>
              </div>

              {/* 1. Basic User Information */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs space-y-2">
                <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300" /> User & Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 dark:text-gray-300 pt-1">
                  <p><span className="font-semibold text-gray-900 dark:text-white">Full Name:</span> {selectedDetails.user.name}</p>
                  {selectedDetails.user.organizationName && (
                    <p><span className="font-semibold text-gray-900 dark:text-white">Business Name:</span> {selectedDetails.user.organizationName}</p>
                  )}
                  <p><span className="font-semibold text-gray-900 dark:text-white">Mobile Number:</span> +91 {selectedDetails.user.phone || 'N/A'}</p>
                  <p><span className="font-semibold text-gray-900 dark:text-white">Email:</span> {selectedDetails.user.email || 'N/A'}</p>
                  <p><span className="font-semibold text-gray-900 dark:text-white">Account Type:</span> {selectedDetails.user.role}</p>
                  {selectedDetails.user.verifiedBy && (
                    <p><span className="font-semibold text-gray-900 dark:text-white">Verified By:</span> {selectedDetails.user.verifiedBy}</p>
                  )}
                </div>
              </div>

              {/* 2. Location Information (India Only) */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs space-y-2">
                <h4 className="font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" /> Location Details (India)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-blue-900 dark:text-blue-200 pt-1">
                  <p><span className="font-semibold text-blue-950 dark:text-white">Country:</span> India 🇮🇳</p>
                  <p><span className="font-semibold text-blue-950 dark:text-white">State:</span> {selectedDetails.user.state || 'N/A'}</p>
                  <p><span className="font-semibold text-blue-950 dark:text-white">District:</span> {selectedDetails.user.district || 'N/A'}</p>
                  <p><span className="font-semibold text-blue-950 dark:text-white">Tehsil:</span> {selectedDetails.user.tehsil || 'N/A'}</p>
                  <p><span className="font-semibold text-blue-950 dark:text-white">Village:</span> {selectedDetails.user.village || 'N/A'}</p>
                  <p><span className="font-semibold text-blue-950 dark:text-white">PIN Code:</span> {selectedDetails.user.pincode || 'N/A'}</p>
                </div>

                {/* GPS Coordinates Display */}
                {selectedDetails.user.latitude && selectedDetails.user.longitude && (
                  <div className="mt-2 pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-blue-900 dark:text-blue-200 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-emerald-600" />
                      GPS: {selectedDetails.user.latitude.toFixed(5)}° N, {selectedDetails.user.longitude.toFixed(5)}° E
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${selectedDetails.user.latitude},${selectedDetails.user.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline font-semibold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View on Map
                    </a>
                  </div>
                )}
              </div>

              {/* 3. Farmer Specific KYC Information */}
              {selectedDetails.farmerProfile && (
                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 text-xs space-y-2">
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    👨‍🌾 Farmer KYC & Banking Data
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-900 dark:text-emerald-200 pt-1">
                    <p>
                      <span className="font-semibold text-emerald-950 dark:text-white">Aadhaar Number:</span>{' '}
                      <span className="font-mono font-bold bg-white dark:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-200">
                        {selectedDetails.farmerProfile.aadhaarNumber || 'N/A'}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-emerald-950 dark:text-white">Bank Account:</span>{' '}
                      <span className="font-mono font-bold bg-white dark:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-200">
                        {selectedDetails.farmerProfile.bankAccountNumber || 'N/A'}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-emerald-950 dark:text-white">IFSC Code:</span>{' '}
                      <span className="font-mono font-bold bg-white dark:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-200">
                        {selectedDetails.farmerProfile.bankIfscCode || 'N/A'}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-emerald-950 dark:text-white">Bank Name:</span>{' '}
                      {selectedDetails.farmerProfile.bankName || 'N/A'}
                    </p>
                    <p className="sm:col-span-2">
                      <span className="font-semibold text-emerald-950 dark:text-white">Branch Name (Auto-retrieved):</span>{' '}
                      {selectedDetails.farmerProfile.bankBranchName || 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {/* 4. Business Specific KYC Information */}
              {selectedDetails.businessProfile && (
                <div className="bg-purple-50/60 dark:bg-purple-950/30 p-4 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 text-xs space-y-2">
                  <h4 className="font-bold text-purple-950 dark:text-purple-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    🏪 Business Credentials
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-purple-900 dark:text-purple-200 pt-1">
                    <p>
                      <span className="font-semibold text-purple-950 dark:text-white">Business Name:</span>{' '}
                      {selectedDetails.businessProfile.officialName || 'N/A'}
                    </p>
                    <p>
                      <span className="font-semibold text-purple-950 dark:text-white">Contact Person:</span>{' '}
                      {selectedDetails.businessProfile.authorizedPerson || 'N/A'}
                    </p>
                    <p>
                      <span className="font-semibold text-purple-950 dark:text-white">GSTIN:</span>{' '}
                      <span className="font-mono font-bold bg-white dark:bg-purple-900/60 px-2 py-0.5 rounded border border-purple-200">
                        {selectedDetails.businessProfile.gstin || 'N/A'}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-purple-950 dark:text-white">PAN Number:</span>{' '}
                      <span className="font-mono font-bold bg-white dark:bg-purple-900/60 px-2 py-0.5 rounded border border-purple-200">
                        {selectedDetails.businessProfile.panNumber || 'N/A'}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* 5. Submitted Verification Documents with Previews & Actions */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Submitted Documents ({selectedDetails.documents?.length || 0})</span>
                  <span className="text-[11px] font-normal text-gray-400">Click to preview or download</span>
                </h4>

                {(!selectedDetails.documents || selectedDetails.documents.length === 0) ? (
                  <p className="text-xs text-gray-400 italic p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl text-center">
                    No documents uploaded yet for this application.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDetails.documents.map((doc) => {
                      const isFlagged = doc.verificationStatus === 'RE_UPLOAD_REQUESTED';
                      const isTargetForReupload = reuploadDocTarget?.id === doc.id;

                      return (
                        <div
                          key={doc.id}
                          className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
                            isFlagged
                              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                              : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-gray-900 dark:text-white truncate">
                              {doc.documentType}
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                              doc.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : isFlagged
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                            }`}>
                              {doc.verificationStatus}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-500 truncate" title={doc.originalFilename}>
                            {doc.originalFilename}
                          </p>

                          {doc.rejectionReason && (
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-[11px] text-amber-900 dark:text-amber-200">
                              <strong>Note:</strong> {doc.rejectionReason}
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            {doc.cloudinaryUrl && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc({
                                    isOpen: true,
                                    title: doc.documentType,
                                    url: doc.cloudinaryUrl,
                                    mimeType: doc.mimeType,
                                  })}
                                  className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1 transition"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Preview
                                </button>
                                <a
                                  href={doc.cloudinaryUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={doc.originalFilename}
                                  className="py-1.5 px-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 rounded-xl font-semibold text-[11px] flex items-center justify-center transition"
                                  title="Download original file"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setReuploadDocTarget(isTargetForReupload ? null : { id: doc.id, docType: doc.documentType });
                                setDocReuploadReason('');
                              }}
                              className="py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-[11px] transition whitespace-nowrap"
                            >
                              {isTargetForReupload ? 'Cancel' : 'Request Re-upload'}
                            </button>
                          </div>

                          {/* Inline Re-upload Reason Input */}
                          {isTargetForReupload && (
                            <div className="pt-2 border-t border-amber-200 dark:border-amber-800 space-y-2 animate-in fade-in">
                              <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200">
                                Reason for re-uploading {doc.documentType}:
                              </label>
                              <input
                                type="text"
                                value={docReuploadReason}
                                onChange={(e) => setDocReuploadReason(e.target.value)}
                                placeholder="e.g. Unclear, blurry, or expired document"
                                className="w-full text-xs p-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                              <button
                                type="button"
                                disabled={docProcessing || !docReuploadReason.trim()}
                                onClick={handleRequestDocReupload}
                                className="w-full py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition"
                              >
                                {docProcessing ? 'Saving Request...' : 'Send Re-upload Request'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 6. Admin Decision Actions Panel */}
              <div className="pt-5 border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Approval Notes / Internal Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Enter any internal verification notes or audit reference..."
                    className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2.5 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  {/* Action 1: Reject Application (Mandatory Reason Modal) */}
                  <button
                    type="button"
                    disabled={actionProcessing}
                    onClick={() => {
                      setRejectionReason('');
                      setRejectionModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Reject Application
                  </button>

                  {/* Action 2: Approve / Accept Application */}
                  <button
                    type="button"
                    disabled={actionProcessing}
                    onClick={handleApprove}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5"
                  >
                    {actionProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Accept & Approve Application
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Rejection Reason Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Reject Application</h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              You are about to reject the registration of{' '}
              <strong>{selectedUser?.name || 'this user'}</strong>.
              Please provide a clear reason for the applicant.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain clearly why this application is being rejected..."
                className="w-full text-xs p-3 border border-red-200 dark:border-red-900 rounded-xl bg-red-50/40 dark:bg-red-950/30 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              {!rejectionReason.trim() && (
                <p className="text-[11px] text-red-500 mt-1">A rejection reason is strictly mandatory.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionProcessing || !rejectionReason.trim()}
                onClick={handleReject}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                {actionProcessing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Modal Preview */}
      <DocumentModalPreview
        isOpen={previewDoc.isOpen}
        onClose={() => setPreviewDoc((prev) => ({ ...prev, isOpen: false }))}
        docTitle={previewDoc.title}
        docUrl={previewDoc.url}
        mimeType={previewDoc.mimeType}
      />
    </div>
  );
}
