import { useState, useEffect, useCallback } from 'react';
import { Star } from 'lucide-react';
import { getFeedback, getFeedbackInsights, updateFeedback } from '../../services/adminApi';
import {
  Table, Td, TableSkeleton, EmptyState, ErrorState, StatusDot, genericStatusInfo,
  Drawer, DrawerSection, KV, MetricStrip, Avatar, inputCls, selectCls,
} from '../../components/admin/ui/adminUi';

export default function AdminFeedback() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Review drawer
  const [selected, setSelected] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState('REVIEWING');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getFeedback(
      categoryFilter === 'ALL' ? undefined : categoryFilter,
      statusFilter === 'ALL' ? undefined : statusFilter,
      roleFilter === 'ALL' ? undefined : roleFilter,
      searchQuery.trim() ? searchQuery.trim() : undefined
    );
    if (res.ok) setFeedbackList(Array.isArray(res.data) ? res.data : []);
    else setError(res.error || 'Unable to load feedback');
    setLoading(false);
  }, [categoryFilter, statusFilter, roleFilter, searchQuery]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  useEffect(() => {
    getFeedbackInsights().then((res) => { if (res.ok) setInsights(res.data); });
  }, [feedbackList.length]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const openFeedback = (f) => {
    setSelected(f);
    setResponseText(f.adminResponse || '');
    setNewStatus(f.status === 'NEW' ? 'REVIEWING' : f.status);
    setSaveError('');
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError('');
    const res = await updateFeedback(selected.id, newStatus, responseText.trim() || null, null);
    setSaving(false);
    if (res.ok) {
      setSelected(null);
      showToast(newStatus === 'RESOLVED' ? 'Feedback resolved' : newStatus === 'CLOSED' ? 'Feedback closed' : 'Feedback updated');
      fetchFeedback();
    } else {
      setSaveError(res.error || 'Failed to update feedback.');
    }
  };

  const newCount = feedbackList.filter((f) => f.status === 'NEW').length;

  const metrics = [
    { label: 'Total (filtered)', value: feedbackList.length },
    { label: 'New / unreviewed', value: newCount, context: newCount > 0 ? 'Requires attention' : 'All reviewed' },
    { label: 'Avg platform rating', value: insights?.averagePlatformRating ? Number(insights.averagePlatformRating).toFixed(1) : '—', context: insights?.ratedFeedbackCount ? `${insights.ratedFeedbackCount} rated submissions` : null },
    { label: 'Response rate', value: insights?.responseRatePercentage != null ? `${Math.round(insights.responseRatePercentage)}%` : '—', context: insights?.respondedCount ? `${insights.respondedCount} responded` : null },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Feedback</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">Platform feedback submitted by farmers and buyers to improve Mitti2Market.</p>
      </div>

      <MetricStrip metrics={metrics} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search feedback messages"
          className={`${inputCls} w-full sm:w-72`}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectCls} aria-label="Filter by category">
          <option value="ALL">Category: All</option>
          <option value="GENERAL">General</option>
          <option value="BUG">Bug</option>
          <option value="FEATURE_REQUEST">Feature request</option>
          <option value="MARKETPLACE">Marketplace</option>
          <option value="DEAL_EXPERIENCE">Deal experience</option>
          <option value="LOGISTICS">Logistics</option>
          <option value="AI_PRICE_ADVISOR">AI price advisor</option>
          <option value="OTHER">Other</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls} aria-label="Filter by status">
          <option value="ALL">Status: All</option>
          <option value="NEW">New</option>
          <option value="REVIEWING">Under review</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectCls} aria-label="Filter by role">
          <option value="ALL">Role: All</option>
          <option value="FARMER">Farmer</option>
          <option value="BUSINESS">Business</option>
        </select>
      </div>

      {error && !loading ? (
        <div className="bg-white border border-gray-200 rounded-xl"><ErrorState message={error} onRetry={fetchFeedback} /></div>
      ) : (
        <Table
          columns={[
            { key: 'user', label: 'User' },
            { key: 'category', label: 'Category' },
            { key: 'rating', label: 'Rating', width: 90 },
            { key: 'message', label: 'Feedback' },
            { key: 'created', label: 'Date', width: 110 },
            { key: 'status', label: 'Status', width: 140 },
            { key: 'actions', label: '', align: 'right' },
          ]}
        >
          {loading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : feedbackList.length === 0 ? (
            <tr><td colSpan={7}><EmptyState title="No feedback found" hint="No submissions match the current filters." /></td></tr>
          ) : (
            feedbackList.map((f) => {
              const st = genericStatusInfo(f.status);
              return (
                <tr key={f.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={f.userName} size={30} />
                      <span>
                        <span className="block text-[13px] font-medium text-gray-900">{f.userName || '—'}</span>
                        <span className="block text-xs text-gray-500 capitalize">{(f.userRole || '').toLowerCase()}</span>
                      </span>
                    </div>
                  </Td>
                  <Td><span className="text-[13px] text-gray-700">{(f.category || '').replace(/_/g, ' ').toLowerCase()}</span></Td>
                  <Td>
                    {f.rating ? (
                      <span className="inline-flex items-center gap-1 text-[13px] tabular-nums">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {f.rating}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </Td>
                  <Td><span className="block max-w-[260px] truncate text-[13px] text-gray-600" title={f.message}>{f.message}</span></Td>
                  <Td><span className="text-xs text-gray-500 whitespace-nowrap">{f.createdAt ? new Date(f.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</span></Td>
                  <Td><StatusDot tone={st.tone} label={st.label.replace(/_/g, ' ').toLowerCase()} /></Td>
                  <Td>
                    <button
                      onClick={() => openFeedback(f)}
                      className="px-2.5 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Review
                    </button>
                  </Td>
                </tr>
              );
            })
          )}
        </Table>
      )}

      {/* Review drawer */}
      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Feedback review"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setNewStatus('CLOSED')}
              className="mr-auto px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-800"
            >
              Mark closed
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3.5 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        {selected && (
          <>
            <div className="flex items-start gap-3 pb-5 border-b border-gray-100">
              <Avatar name={selected.userName} size={44} />
              <div>
                <p className="text-[15px] font-semibold text-gray-900">{selected.userName || 'Anonymous'}</p>
                <p className="text-[13px] text-gray-500 capitalize">{(selected.userRole || '').toLowerCase()}</p>
                {selected.rating && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[13px]">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> {selected.rating} / 5
                  </span>
                )}
              </div>
            </div>

            <div className="pt-5">
              <DrawerSection title="Submission">
                <KV k="Category" v={(selected.category || '').replace(/_/g, ' ').toLowerCase()} />
                <KV k="Status" v={(selected.status || '').replace(/_/g, ' ').toLowerCase()} />
                <KV k="Submitted" v={selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'} />
                {selected.relatedDeal && <KV k="Related deal" v={`#${selected.relatedDeal.dealId || selected.relatedDeal}`} />}
              </DrawerSection>

              <DrawerSection title="Feedback message">
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                  <p className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.message}</p>
                </div>
              </DrawerSection>

              <DrawerSection title="Admin response">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={4}
                  placeholder="Write a response visible in the feedback record…"
                  className="w-full text-[13px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none"
                />
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={`${selectCls} w-full`}>
                    <option value="NEW">New</option>
                    <option value="REVIEWING">Under review</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                {saveError && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-[13px] text-red-700">{saveError}</div>
                )}
              </DrawerSection>
            </div>
          </>
        )}
      </Drawer>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] px-4 py-2.5 bg-gray-900 text-white text-[13px] font-medium rounded-lg shadow-lg">{toast}</div>
      )}
    </div>
  );
}
