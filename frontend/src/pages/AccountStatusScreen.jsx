import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitAppeal, getMyAppeals } from '../services/api';
import {
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Upload,
  LogOut,
  Send,
  Loader2,
  HelpCircle,
  Phone,
  Mail,
  ShieldAlert
} from 'lucide-react';

export default function AccountStatusScreen() {
  const { user, logout } = useAuth();
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const status = user?.status || 'SUSPENDED';

  const isSuspended = status === 'SUSPENDED';
  const isDeactivated = status === 'DEACTIVATED';
  const isRejected = status === 'REJECTED';

  useEffect(() => {
    loadAppeals();
  }, []);

  const loadAppeals = async () => {
    try {
      setLoading(true);
      const res = await getMyAppeals();
      if (res.ok && Array.isArray(res.data)) {
        setAppeals(res.data);
      }
    } catch (err) {
      console.error('Failed to load appeals:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasPendingAppeal = appeals.some(
    (a) => a.status === 'PENDING' || a.status === 'UNDER_REVIEW'
  );

  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!reason.trim()) {
      setError('Please provide a detailed explanation for your appeal.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitAppeal({
        reason: reason.trim(),
        message: reason.trim(),
        contactPhone: contactPhone.trim() || undefined,
        phone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        email: contactEmail.trim() || undefined,
        attachmentUrl: attachmentUrl.trim() || undefined,
        documentUrl: attachmentUrl.trim() || undefined,
      });

      if (res.ok) {
        setSuccess('Your appeal has been submitted successfully. An administrator will review your case.');
        setReason('');
        loadAppeals();
      } else {
        setError(res.error || 'Failed to submit appeal. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting appeal.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (appealStatus) => {
    switch (appealStatus) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Under Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {appealStatus}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-amber-50/40 flex flex-col justify-between p-4 sm:p-6 lg:p-12">
      {/* Top Header */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mitti to Market</h1>
            <p className="text-xs text-gray-500">Account Compliance & Security Portal</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
        >
          <LogOut className="w-4 h-4 text-gray-500" />
          Sign Out
        </button>
      </div>

      {/* Main Status Container */}
      <div className="max-w-4xl w-full mx-auto my-8 space-y-8">
        {/* Status Banner */}
        <div className={`p-6 sm:p-8 rounded-2xl shadow-sm border ${
          isSuspended
            ? 'bg-red-50/70 border-red-200'
            : isDeactivated
            ? 'bg-amber-50/70 border-amber-200'
            : 'bg-orange-50/70 border-orange-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className={`p-3 rounded-xl ${
              isSuspended
                ? 'bg-red-100 text-red-700'
                : isDeactivated
                ? 'bg-amber-100 text-amber-700'
                : 'bg-orange-100 text-orange-700'
            }`}>
              <Ban className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isSuspended && 'Account Suspended'}
                  {isDeactivated && 'Account Deactivated'}
                  {isRejected && 'Verification Rejected'}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isSuspended
                    ? 'bg-red-200 text-red-900'
                    : isDeactivated
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-orange-200 text-orange-900'
                }`}>
                  {status}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                {isSuspended &&
                  'Your account has been temporarily suspended due to security compliance checks, unfulfilled deal disputes, or policy violations. You are prevented from creating listings, placing orders, or chatting.'}
                {isDeactivated &&
                  'Your account is currently deactivated. Marketplace transactions, produce listings, and notifications are held.'}
                {isRejected &&
                  'Your submitted identification or business documents were rejected during administrative verification.'}
              </p>

              {user?.suspendedAt && (
                <p className="mt-2 text-xs text-gray-500">
                  Action taken on: {new Date(user.suspendedAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Appeal History Section */}
        {appeals.length > 0 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-700" />
              Your Appeal History
            </h3>
            <div className="space-y-4">
              {appeals.map((appeal) => (
                <div
                  key={appeal.id}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <span>Appeal #{appeal.id}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 font-normal">
                        {new Date(appeal.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {getStatusBadge(appeal.status)}
                  </div>

                  <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-100">
                    <span className="font-medium text-gray-900">Your statement: </span>
                    {appeal.reason}
                  </p>

                  {appeal.adminNotes && (
                    <div className="text-sm text-gray-700 bg-blue-50/80 p-3 rounded-lg border border-blue-100">
                      <span className="font-semibold text-blue-900">Admin Response: </span>
                      {appeal.adminNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appeal Form Section */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            Submit an Appeal
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            If you believe this action was made in error, or if you have resolved outstanding issues,
            please submit an appeal with detailed context and supporting documents.
          </p>

          {hasPendingAppeal ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3">
              <Clock className="w-5 h-5 flex-shrink-0 text-amber-600" />
              <p className="text-sm">
                You already have an appeal under review. Our administrative team typically reviews appeals
                within 24 to 48 hours. Please check back later.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitAppeal} className="space-y-5">
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Explanation / Reason for Appeal <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why your account should be reinstated, clarifying any misunderstandings or actions you have taken..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-y"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supporting Document URL / Reference Link (Optional)
                </label>
                <div className="relative">
                  <Upload className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="https://example.com/proof.pdf"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Provide a link to receipts, business license, or verification documents.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !reason.trim()}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-sm text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting Appeal...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Appeal for Review
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl w-full mx-auto pt-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Mitti to Market. Trust & Safety Operations.
      </div>
    </div>
  );
}
