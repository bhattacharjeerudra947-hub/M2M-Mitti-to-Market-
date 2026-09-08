import { useState } from 'react';
import { submitReport } from '../services/reportApi';

export default function ReportModal({ isOpen, onClose, targetType, targetId, targetName }) {
  const [reportType, setReportType] = useState('FRAUD');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const payload = {
      reportType,
      description: description.trim(),
    };

    if (targetType === 'USER') payload.reportedUserId = targetId;
    else if (targetType === 'PRODUCE') payload.reportedProduceId = targetId;
    else if (targetType === 'BUSINESS') payload.reportedBusinessId = targetId;
    else if (targetType === 'DEAL') payload.reportedDealId = targetId;
    else if (targetType === 'REQUIREMENT') payload.reportedRequirementId = targetId;

    const res = await submitReport(payload);
    setLoading(false);

    if (res.ok) {
      setMessage('Report submitted successfully. Our admin moderation team will review this shortly.');
      setTimeout(() => {
        onClose();
        setMessage(null);
        setDescription('');
      }, 1800);
    } else {
      setError(res.error || 'Failed to submit report. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              Report {targetType ? targetType.toLowerCase() : 'Item'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ✕
          </button>
        </div>

        {targetName && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-lg border border-gray-200/50 dark:border-gray-600/50">
            Reporting: <span className="font-medium text-gray-800 dark:text-gray-200">{targetName}</span>
          </p>
        )}

        {message ? (
          <div className="my-6 p-4 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 rounded-xl text-sm font-medium border border-green-200 dark:border-green-800 text-center">
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-lg text-xs font-medium border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason for report
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="FRAUD">Fraud / Scam Attempt</option>
                <option value="SCAM">Suspicious / Phishing Activity</option>
                <option value="FALSE_INFORMATION">False or Misleading Information</option>
                <option value="FAKE_PROFILE">Fake Profile / Impersonation</option>
                <option value="WRONG_PRICE">Inaccurate or Unrealistic Pricing</option>
                <option value="WRONG_PRODUCT">Wrong Product / Counterfeit</option>
                <option value="INAPPROPRIATE_CONTENT">Inappropriate / Offensive Content</option>
                <option value="HARASSMENT">Harassment / Abusive Behavior</option>
                <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
                <option value="QUALITY_ISSUE">Quality / Delivery Issue</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details to help admin moderators investigate..."
                rows={3}
                className="w-full text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
