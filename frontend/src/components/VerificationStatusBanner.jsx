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

  const status = user?.verificationStatus || (user?.verified ? 'VERIFIED' : 'NOT_VERIFIED');

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
    if (status === 'RE_SUBMISSION_REQUESTED' || status === 'PENDING' || status === 'REJECTED') {
      fetchDocs();
    }
  }, [status, user?.id]);

  if (!user || status === 'VERIFIED') return null;

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
    <div className="mb-6 animate-in fade-in">
      {/* 1. DOCUMENT RE-UPLOAD REQUIRED BANNER */}
      {status === 'RE_SUBMISSION_REQUESTED' && (
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
                Document Re-upload Requested by Admin
              </h3>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                The verification officer requested replacement documents for your registration application.
                Please review the reason below and upload a clear, valid replacement document.
              </p>
              {user.verificationNotes && (
                <div className="mt-2.5 p-3 bg-white rounded-xl border border-amber-200 text-xs text-amber-900">
                  <strong>Admin Note:</strong> {user.verificationNotes}
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

      {/* 2. PENDING ADMIN VERIFICATION BANNER */}
      {status === 'PENDING' && (
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

      {/* 3. VERIFICATION LOST (REJECTED) BANNER */}
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
                <div className="mt-2.5 p-3 bg-white rounded-xl border border-red-200 text-xs text-red-900">
                  <strong>Rejection Reason:</strong> {user.verificationNotes || user.statusReason}
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
