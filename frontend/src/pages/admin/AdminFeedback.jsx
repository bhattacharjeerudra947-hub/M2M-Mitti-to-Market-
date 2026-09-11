import { useState, useEffect, useCallback } from 'react';
import { getFeedback, getFeedbackInsights, updateFeedback } from '../../services/adminApi';

export default function AdminFeedback() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [statusInput, setStatusInput] = useState('RESOLVED');
  const [responseInput, setResponseInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    const [listRes, insightsRes] = await Promise.all([
      getFeedback(
        categoryFilter === 'ALL' ? undefined : categoryFilter,
        statusFilter === 'ALL' ? undefined : statusFilter,
        roleFilter === 'ALL' ? undefined : roleFilter,
        searchKeyword.trim() ? searchKeyword.trim() : undefined
      ),
      getFeedbackInsights()
    ]);

    if (listRes.ok) setFeedbackList(listRes.data || []);
    if (insightsRes.ok) setInsights(insightsRes.data);
    setLoading(false);
  }, [categoryFilter, statusFilter, roleFilter, searchKeyword]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleSaveResponse = async (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    setSubmitting(true);

    const res = await updateFeedback(selectedFeedback.id, statusInput, responseInput, noteInput);
    setSubmitting(false);

    if (res.ok) {
      setSelectedFeedback(null);
      setResponseInput('');
      setNoteInput('');
      fetchFeedback();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Platform Feedback & Suggestions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Categorized user feedback, bug reports, feature suggestions, and logistics reviews.</p>
        </div>

        <button
          onClick={fetchFeedback}
          className="self-start md:self-auto text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition font-medium"
        >
          ↻ Refresh Feedback
        </button>
      </div>

      {/* Insights Overview Cards */}
      {insights && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 block">Total Submissions</span>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{insights.totalFeedback || 0}</p>
            <span className="text-[11px] text-gray-400 mt-1 block">From registered & guests</span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 block">Avg Platform Rating</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-amber-500">{insights.averagePlatformRating || '0.0'}</span>
              <span className="text-xs text-gray-400">/ 5.0</span>
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">{insights.ratedFeedbackCount || 0} reviews rated</span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 block">Response Rate</span>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {insights.responseRatePercentage || 0}%
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">{insights.respondedCount || 0} responded</span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 block">Open Pending</span>
            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              {(insights.statusBreakdown?.NEW || 0) + (insights.statusBreakdown?.REVIEWING || 0)}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">
              {insights.statusBreakdown?.NEW || 0} new, {insights.statusBreakdown?.REVIEWING || 0} reviewing
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="Search by keywords or user..."
          className="text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white flex-1 min-w-[180px]"
        />

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

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 text-gray-900 dark:text-white"
        >
          <option value="ALL">All Submitter Roles</option>
          <option value="FARMER">Farmers</option>
          <option value="BUSINESS">Buyers / Business</option>
          <option value="GUEST">Guest / Visitors</option>
        </select>
      </div>

      {/* Main Content: List + Response Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Submissions ({feedbackList.length})</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No feedback submissions found matching filters.</div>
          ) : (
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {feedbackList.map((item) => {
                const isSelected = selectedFeedback?.id === item.id;
                const roleBadgeColor =
                  item.userRole === 'FARMER'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : item.userRole === 'BUSINESS'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

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
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded truncate max-w-[140px]">
                        {item.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {item.userRole && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${roleBadgeColor}`}>
                            {item.userRole}
                          </span>
                        )}
                        {item.rating && (
                          <span className="text-xs font-bold text-amber-500 whitespace-nowrap">
                            {'★'.repeat(item.rating)}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs font-medium text-gray-900 dark:text-white mt-2 line-clamp-2">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-600/50">
                      <span className="truncate max-w-[120px]">By: {item.userName || 'Anonymous'}</span>
                      <div className="flex items-center gap-1">
                        {item.adminResponse && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1 rounded">
                            Replied
                          </span>
                        )}
                        <span className="font-bold text-gray-600 dark:text-gray-300">{item.status}</span>
                      </div>
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
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-semibold block">Submitter Information</span>
                  {selectedFeedback.userRole && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Role: {selectedFeedback.userRole}
                    </span>
                  )}
                </div>
                <p className="font-bold text-gray-900 dark:text-white">{selectedFeedback.userName || 'Guest User'}</p>
                {selectedFeedback.userEmail && <p className="text-gray-500">{selectedFeedback.userEmail}</p>}
                <p className="text-gray-400 text-[10px]">Submitted: {new Date(selectedFeedback.createdAt).toLocaleString()}</p>
              </div>

              {/* Message */}
              <div>
                <h4 className="font-bold text-xs text-gray-900 dark:text-white mb-1">Feedback Message</h4>
                <p className="text-xs text-gray-800 dark:text-gray-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 whitespace-pre-wrap">
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
                    Admin Reply / Response (Sent as in-app notification to registered user)
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
                    Internal Admin Note (Private to administration team)
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
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md transition disabled:opacity-50"
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
