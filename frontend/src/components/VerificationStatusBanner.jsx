import { useState, useEffect } from 'react';
import { AlertCircle, Clock, CheckCircle2, Upload, FileText, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyDocuments, uploadDocument, resubmitVerification, getProfile } from '../services/api';
import DocumentModalPreview from './DocumentModalPreview';

export default function VerificationStatusBanner() {
  const { user, refreshUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewDoc, setPreviewDoc] = useState({ isOpen: false, title: '', url: '', mimeType: '' });

  const rawStatus = user?.verificationStatus || (user?.verified ? 'VERIFIED' : 'UNVERIFIED');
  const normalizeStatus = (s) => {
    if (!s) return 'UNVERIFIED';
    const upper = s.toUpperCase();
    if (upper === 'NOT_VERIFIED') return 'UNVERIFIED';
    if (upper === 'PENDING') return 'UNDER_REVIEW';
    if (upper === 'APPROVED') return 'VERIFIED';
    if (upper === 'RE_SUBMISSION_REQUESTED') return 'RESUBMISSION_REQUIRED';
    return upper;
  };
  const status = normalizeStatus(rawStatus);

  const fetchDocs = async () => {
    if (!user) return;
    setLoadingDocs(true);
    const res = await getMyDocuments();
    if (res.ok) {
      setDocuments(res.data || []);
    }
    setLoadingDocs(false);
  };

  useEffect(() => {
    if (status === 'RESUBMISSION_REQUIRED' || status === 'UNDER_REVIEW' || status === 'DOCUMENTS_SUBMITTED' || status === 'REJECTED' || status === 'UNVERIFIED') {
      fetchDocs();
    }
  }, [status, user?.id]);

  const isAccountRestricted = user?.status === 'DEACTIVATED' || user?.status === 'SUSPENDED';
  if (!user || (!isAccountRestricted && status === 'VERIFIED')) return null;

  // Find documents that need re-upload
  const flaggedDocs = documents.filter((d) => d.verificationStatus === 'RE_UPLOAD_REQUESTED' || d.verificationStatus === 'REJECTED');

  const handleReplacementUpload = async (file, docType) => {
    if (!file) return;
    setUploadingDocId(docType);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await uploadDocument(file, docType);
    setUploadingDocId(null);

    if (res.ok) {
      setSuccessMsg('Document uploaded successfully. Application status submitted for verification.');
      await fetchDocs();
      // Refresh user profile from backend so updated verificationStatus is shown
      const profRes = await getProfile();
      if (profRes.ok && profRes.data) {
        refreshUser(profRes.data);
      }
    } else {
      setErrorMsg(res.error || 'Failed to upload document.');
    }
  };

  const handleResubmit = async () => {
    setResubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await resubmitVerification();
    setResubmitting(false);

    if (res.ok) {
      setSuccessMsg('Your application has been re-submitted for admin verification.');
      // Refresh user profile from backend
      const profRes = await getProfile();
      if (profRes.ok && profRes.data) {
        refreshUser(profRes.data);
      }
      fetchDocs();
    } else {
      setErrorMsg(res.error || 'Failed to resubmit application.');
    }
  };

  return (
    <div className="mb-6 space-y-4 animate-in fade-in">
      {/* 0A. DEACTIVATED ACCOUNT BANNER */}
      {user?.status === 'DEACTIVATED' && (
        <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-950/60 border-2 border-red-500 shadow-md space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white uppercase tracking-wider">
                  Account Deactivated
                </span>
                {user.statusUpdatedBy && (
                  <span className="text-[11px] text-red-700 dark:text-red-300 font-medium">
                    By: {user.statusUpdatedBy}
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-red-950 dark:text-red-100 mt-1">
                Your Account Has Been Deactivated by Administrator
              </h3>
              <p className="text-xs text-red-900 dark:text-red-200 mt-1 leading-relaxed">
                Administrative moderation action was executed on this account. While deactivated, you cannot create produce listings, negotiate or complete deals, or perform marketplace transactions.
              </p>

              <div className="mt-3 p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-red-300 dark:border-red-700 text-xs text-red-950 dark:text-red-200 space-y-1">
                <div>
                  <strong>Deactivation Reason:</strong>{' '}
                  <span className="text-red-800 dark:text-red-300 font-medium">
                    {user.statusReason || 'Administrative decision / terms enforcement.'}
                  </span>
                </div>
                {user.statusUpdatedAt && (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    <strong>Action Timestamp:</strong> {new Date(user.statusUpdatedAt).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <a
                  href="mailto:support@mitti2market.com?subject=Account Deactivation Appeal"
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-xs transition inline-block"
                >
                  Contact Administration Support
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 0B. SUSPENDED ACCOUNT BANNER */}
      {user?.status === 'SUSPENDED' && (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500 shadow-md space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-600 text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-600 text-white uppercase tracking-wider">
                  Account Suspended
                </span>
                {user.statusUpdatedBy && (
                  <span className="text-[11px] text-amber-800 dark:text-amber-200 font-medium">
                    By: {user.statusUpdatedBy}
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-100 mt-1">
                Your Account Has Been Suspended by Administrator
              </h3>
              <p className="text-xs text-amber-900 dark:text-amber-200 mt-1 leading-relaxed">
                Your account is currently under administrative suspension. Active deals and marketplace actions are paused pending investigation.
              </p>

              <div className="mt-3 p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-amber-300 dark:border-amber-700 text-xs text-amber-950 dark:text-amber-200 space-y-1">
                <div>
                  <strong>Suspension Reason:</strong>{' '}
                  <span className="text-amber-800 dark:text-amber-300 font-medium">
                    {user.statusReason || 'Policy review or reported incident.'}
                  </span>
                </div>
                {user.statusUpdatedAt && (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    <strong>Action Timestamp:</strong> {new Date(user.statusUpdatedAt).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <a
                  href="mailto:support@mitti2market.com?subject=Account Suspension Inquiry"
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-xs transition inline-block"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 0. UNVERIFIED BANNER */}
      {status === 'UNVERIFIED' && !isAccountRestricted && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-emerald-950">
                Complete Verification to Earn the Green Verified Badge
              </p>
              <p className="text-emerald-800 leading-relaxed">
                Verified farmers and businesses receive higher visibility, verified trust badges, and direct deal matchmaking.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. DOCUMENTS SUBMITTED BANNER */}
      {status === 'DOCUMENTS_SUBMITTED' && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3 shadow-xs">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-blue-900">
              📋 Verification Documents Submitted
            </p>
            <p className="text-blue-800 leading-relaxed">
              Your registration documents have been uploaded and are queued in the admin verification queue.
              An admin will verify your account shortly.
            </p>
          </div>
        </div>
      )}

      {/* 2. UNDER REVIEW BANNER */}
      {status === 'UNDER_REVIEW' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-xs">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-amber-900">
              ⏳ Application Under Admin Verification
            </p>
            <p className="text-amber-800 leading-relaxed">
              Your registration documents and profile are currently being reviewed by the administration team.
              You will receive full verified access once review is complete.
            </p>
          </div>
        </div>
      )}

      {/* 3. DOCUMENT RE-UPLOAD / RESUBMISSION REQUIRED BANNER */}
      {status === 'RESUBMISSION_REQUIRED' && (
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-200 text-amber-900 rounded-xl shrink-0 mt-0.5">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div className="flex-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 uppercase tracking-wider">
                Action Required
              </span>
              <h3 className="text-base font-bold text-amber-950 mt-1">
                Additional Information or Document Re-upload Requested
              </h3>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                The verification officer requested replacement documents or clarifications for your registration application.
                Please review the reason below and upload a clear, valid replacement document.
              </p>
              {(user.verificationNotes || user.statusReason) && (
                <div className="mt-2.5 p-3 bg-white rounded-xl border border-amber-200 text-xs text-amber-900">
                  <strong>Admin Note:</strong> {user.verificationNotes || user.statusReason}
                </div>
              )}
            </div>
          </div>

          {/* Flagged Document Uploaders */}
          {loadingDocs ? (
            <div className="p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-amber-700 mx-auto" />
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {flaggedDocs.length > 0 ? (
                flaggedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 bg-white rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{doc.documentType}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                          Re-upload Required
                        </span>
                      </div>
                      {doc.rejectionReason && (
                        <p className="text-[11px] text-amber-800 mt-1 italic">
                          Reason: {doc.rejectionReason}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-xs">
                        Current file: {doc.originalFilename}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {doc.cloudinaryUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            isOpen: true,
                            title: doc.documentType,
                            url: doc.cloudinaryUrl,
                            mimeType: doc.mimeType,
                          })}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition"
                        >
                          View Current
                        </button>
                      )}

                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          disabled={uploadingDocId === doc.documentType}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleReplacementUpload(e.target.files[0], doc.documentType);
                            }
                          }}
                          className="hidden"
                        />
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition shadow-xs">
                          {uploadingDocId === doc.documentType ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" /> Upload Replacement
                            </>
                          )}
                        </span>
                      </label>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                  ✅ All requested replacement documents have been uploaded. Click the button below to resubmit for verification.
                </div>
              )}
            </div>
          )}

          {/* Feedback messages */}
          {successMsg && <p className="text-xs text-emerald-700 font-semibold">{successMsg}</p>}
          {errorMsg && <p className="text-xs text-red-600 font-semibold">{errorMsg}</p>}

          {/* Resubmit Action */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={resubmitting}
              onClick={handleResubmit}
              className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              {resubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Resubmitting...
                </>
              ) : (
                <>
                  Submit Replacement for Admin Verification <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 4. REJECTED BANNER */}
      {status === 'REJECTED' && (
        <div className="p-5 rounded-2xl bg-red-50 border-2 border-red-300 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-200 text-red-900 rounded-xl shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-200 text-red-900 uppercase tracking-wider">
                ⚠ Verification Lost
              </span>
              <h3 className="text-base font-bold text-red-950 mt-1">
                Verification Lost — Documents Rejected
              </h3>
              <p className="text-xs text-red-900 mt-1 leading-relaxed">
                Your verified status has been lost because one or more submitted documents were rejected during administrative review.
                Review the reason below and upload replacement documents to restore your verified standing.
              </p>
              {(user.verificationNotes || user.statusReason) && (
                <div className="mt-2.5 p-3 bg-white rounded-xl border border-red-200 text-xs text-red-900 space-y-1">
                  <div><strong>Rejection Reason:</strong> {user.verificationNotes || user.statusReason}</div>
                  {user.statusUpdatedAt && (
                    <div className="text-[11px] text-red-700 font-medium">
                      <strong>Date:</strong> {new Date(user.statusUpdatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* List documents and allow re-upload */}
          {loadingDocs ? (
            <div className="p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-red-700 mx-auto" />
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold text-red-950">Update and Re-upload Your Verification Documents:</h4>
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 bg-white rounded-xl border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{doc.documentType}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          doc.verificationStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : doc.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {doc.verificationStatus}
                        </span>
                      </div>
                      {doc.rejectionReason && (
                        <p className="text-[11px] text-red-800 mt-1 italic">
                          Issue: {doc.rejectionReason}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-xs">
                        Current file: {doc.originalFilename}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {doc.cloudinaryUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            isOpen: true,
                            title: doc.documentType,
                            url: doc.cloudinaryUrl,
                            mimeType: doc.mimeType,
                          })}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition"
                        >
                          View Current
                        </button>
                      )}

                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          disabled={uploadingDocId === doc.documentType}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleReplacementUpload(e.target.files[0], doc.documentType);
                            }
                          }}
                          className="hidden"
                        />
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs transition shadow-xs">
                          {uploadingDocId === doc.documentType ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" /> Re-upload Document
                            </>
                          )}
                        </span>
                      </label>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-white border border-red-200 rounded-xl text-xs text-gray-600">
                  Please upload your verification documents to restore verified status.
                </div>
              )}
            </div>
          )}

          {/* Feedback messages */}
          {successMsg && <p className="text-xs text-emerald-700 font-semibold">{successMsg}</p>}
          {errorMsg && <p className="text-xs text-red-600 font-semibold">{errorMsg}</p>}

          {/* Resubmit Action */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={resubmitting}
              onClick={handleResubmit}
              className="px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              {resubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Resubmitting...
                </>
              ) : (
                <>
                  Resubmit Application for Admin Verification <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </>
              )}
            </button>
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
