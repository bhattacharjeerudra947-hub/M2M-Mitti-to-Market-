import { useState, useEffect, useCallback } from 'react';
import { getProduce, removeProduce } from '../../services/adminApi';

const PRODUCE_STATUSES = [
  'ALL', 'AVAILABLE', 'LOW_STOCK', 'PARTIALLY_SOLD', 'SOLD_OUT', 'PAUSED', 'EXPIRED', 'REMOVED', 'ADMIN_REMOVED',
];

const STATUS_COLORS = {
  AVAILABLE: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
  LOW_STOCK: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
  PARTIALLY_SOLD: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
  SOLD_OUT: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  ADMIN_REMOVED: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
};

export default function AdminProduce() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ALL');
  const [removeModal, setRemoveModal] = useState(null); // { id, name }
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const fetchProduce = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getProduce(status);
    if (res.ok) setItems(res.data || []);
    else setError(res.error);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    fetchProduce();
  }, [fetchProduce]);

  const handleRemove = async () => {
    if (!removeModal) return;
    setSubmitting(true);
    const res = await removeProduce(removeModal.id, reason);
    setSubmitting(false);
    setRemoveModal(null);
    setReason('');
    if (res.ok) {
      setToast('Listing removed. Farmer notified.');
      setTimeout(() => setToast(''), 3000);
      fetchProduce();
    } else {
      setToast(res.error);
      setTimeout(() => setToast(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Produce Moderation</h2>
            <p className="text-xs text-gray-500 mt-1">Review and remove problematic produce listings.</p>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full md:w-56 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-gray-900 dark:text-white"
          >
            {PRODUCE_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : error ? (
          <div className="p-12 text-center text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No produce listings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="p-4">Produce</th>
                  <th className="p-4">Farmer</th>
                  <th className="p-4">Available</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                      <p className="text-[11px] text-gray-500">{p.category}</p>
                    </td>
                    <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{p.farmerName}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {p.availableQuantity ?? p.quantity}{p.unit ? ` ${p.unit}` : ''}
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">₹{p.pricePerUnit}/kg</td>
                    <td className="p-4 text-gray-500">{p.location || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_COLORS[p.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                        {p.status?.replace(/_/g, ' ')}
                      </span>
                      {p.adminRemovalReason && <p className="text-[10px] text-red-500 mt-1">{p.adminRemovalReason}</p>}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setRemoveModal({ id: p.id, name: p.name })}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {removeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Remove Produce Listing</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
              Remove <span className="font-bold text-emerald-600">{removeModal.name}</span> from the marketplace? It will move to history and the farmer will be notified.
            </p>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Listing contains misleading information."
              rows={3}
              className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5"
            />
            <div className="flex items-center justify-end gap-3 mt-5">
              <button onClick={() => setRemoveModal(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl">Cancel</button>
              <button
                onClick={handleRemove}
                disabled={submitting || !reason.trim()}
                className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-sm ${reason.trim() ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                {submitting ? 'Removing...' : 'Remove Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}