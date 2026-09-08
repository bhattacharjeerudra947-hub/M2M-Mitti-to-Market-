import { useState, useEffect, useCallback } from 'react';
import { getFeedback, updateFeedback } from '../../services/adminApi';

export default function AdminFeedback() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [statusInput, setStatusInput] = useState('RESOLVED');
  const [responseInput, setResponseInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    const res = await getFeedback(categoryFilter, statusFilter);
    if (res.ok) setFeedbackList(res.data);
    setLoading(false);
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleSaveResponse = async (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    setSubmitting(true);

    await updateFeedback(selectedFeedback.id, statusInput, responseInput, noteInput);

    setSubmitting(false);
    setSelectedFeedback(null);
    setResponseInput('');
    setNoteInput('');
    fetchFeedback();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Platform Feedback & Suggestions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Categorized user ideas, bug reports, design feedback, and logistics reviews.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 text-gray-900 dark:text-white"
          >
            <option value="ALL">All Categories</option>
            <option value="GENERAL_FEEDBACK">General Feedback</option>
            <option value="FEATURE_SUGGESTION">Feature Suggestion</option>
            <option value="BUG_REPORT">Bug Report</option>
            <option value="EXPERIENCE_FEEDBACK">Experience</option>
            <option value="MARKETPLACE_FEEDBACK">Marketplace</option>
            <option value="LOGISTICS_FEEDBACK">Logistics</option>
            <option value="AI_RECOMMENDATION_FEEDBACK">AI Recommendation</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 text-gray-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="REVIEWING">Reviewing</option>
            <option value="PLANNED">Planned</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">Submissions</h3>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No feedback submissions found.</div>
          ) : (
            <div className="space-y-2">
              {feedbackList.map((item) => {
                const isSelected = selectedFeedback?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedFeedback(item);
                      setStatusInput(item.status || 'RESOLVED');
                      setResponseInput(item.adminResponse || '');
                      setNoteInput(item.adminNote || '');
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-700/40 border-gray-100 dark:border-gray-700 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      {item.rating && (
                        <span className="text-xs font-bold text-amber-500">
                          {'★'.repeat(item.rating)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-gray-900 dark:text-white mt-2 line-clamp-2">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-600/50">
                      <span>By: {item.userName}</span>
                      <span className="font-bold text-gray-600 dark:text-gray-300">{item.status}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Feedback Response & Management */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          {!selectedFeedback ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-xs">
              <span className="text-3xl mb-2">💬</span>
              <p>Select a feedback submission to read full content and send an admin response.</p>
            </div>
          ) : (
            <form onSubmit={handleSaveResponse} className="space-y-6">
              <div className="pb-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded">
                    {selectedFeedback.category}
                  </span>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white mt-2">
                    Feedback #{selectedFeedback.id}
                  </h3>
                </div>
                {selectedFeedback.rating && (
                  <span className="text-sm font-bold text-amber-500">
                    {'★'.repeat(selectedFeedback.rating)} ({selectedFeedback.rating}/5)
                  </span>
                )}
              </div>

              {/* User details */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-xs space-y-1">
                <span className="text-gray-500 font-semibold block">User Information</span>
                <p className="font-bold text-gray-900 dark:text-white">{selectedFeedback.userName}</p>
                {selectedFeedback.userEmail && <p className="text-gray-500">{selectedFeedback.userEmail}</p>}
                <p className="text-gray-400 text-[10px]">Submitted: {new Date(selectedFeedback.createdAt).toLocaleString()}</p>
              </div>

              {/* Message */}
              <div>
                <h4 className="font-bold text-xs text-gray-900 dark:text-white mb-1">Feedback Message</h4>
                <p className="text-xs text-gray-800 dark:text-gray-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  {selectedFeedback.message}
                </p>
              </div>

              {/* Status and Response inputs */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Feedback Status
                  </label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5"
                  >
                    <option value="NEW">NEW</option>
                    <option value="REVIEWING">REVIEWING</option>
                    <option value="PLANNED">PLANNED (Added to roadmap)</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admin Reply / Response (Notifies User)
                  </label>
                  <textarea
                    value={responseInput}
                    onChange={(e) => setResponseInput(e.target.value)}
                    placeholder="Write a response to be sent to the user..."
                    rows={3}
                    className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Internal Admin Note (Private)
                  </label>
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Internal team note..."
                    rows={2}
                    className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md"
                  >
                    {submitting ? 'Saving...' : 'Save & Send Response'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
