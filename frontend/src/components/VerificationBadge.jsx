import { CheckCircle2, Clock, AlertCircle, XCircle, Shield } from 'lucide-react';

export default function VerificationBadge({ status, verified, verifiedAt, className = '', showDate = false }) {
  const normalize = (s) => {
    if (!s) return verified ? 'VERIFIED' : 'UNVERIFIED';
    const upper = s.toUpperCase();
    if (upper === 'APPROVED') return 'VERIFIED';
    if (upper === 'PENDING') return 'UNDER_REVIEW';
    if (upper === 'NOT_VERIFIED') return 'UNVERIFIED';
    if (upper === 'RE_SUBMISSION_REQUESTED') return 'RESUBMISSION_REQUIRED';
    return upper;
  };

  const st = normalize(status);

  if (st === 'VERIFIED') {
    const formattedDate = verifiedAt ? new Date(verifiedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : null;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Verified {showDate && formattedDate ? `· ${formattedDate}` : ''}</span>
      </span>
    );
  }

  if (st === 'DOCUMENTS_SUBMITTED') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 ${className}`}>
        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>Docs Submitted</span>
      </span>
    );
  }

  if (st === 'UNDER_REVIEW') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 ${className}`}>
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Under Review</span>
      </span>
    );
  }

  if (st === 'RESUBMISSION_REQUIRED') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300 ${className}`}>
        <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
        <span>Action Required</span>
      </span>
    );
  }

  if (st === 'REJECTED') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 ${className}`}>
        <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
        <span>Rejected</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300 ${className}`}>
      <Shield className="w-3.5 h-3.5 text-gray-500 shrink-0" />
      <span>Unverified</span>
    </span>
  );
}
