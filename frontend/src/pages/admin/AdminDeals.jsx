import { useState, useEffect, useCallback } from 'react';
import { getDeals } from '../../services/adminApi';

const DEAL_STATUSES = [
  'ALL', 'NEGOTIATING', 'LOCK_PENDING', 'LOCKED', 'LOGISTICS_PENDING', 'LOGISTICS_ASSIGNED',
  'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
  'COMPLETED', 'CANCELLED', 'DISPUTED',
];

const STATUS_COLORS = {
  COMPLETED: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
  DISPUTED: 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300',
  LOCKED: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
  IN_TRANSIT: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
  DELIVERED: 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300',
};

export default function AdminDeals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ALL');

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getDeals(status);
    if (res.ok) setDeals(res.data || []);
    else setError(res.error);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Deals &amp; Order Monitoring</h2>
            <p className="text-xs text-gray-500 mt-1">Every farmer↔buyer transaction on the platform.</p>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full md:w-56 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-gray-900 dark:text-white"
          >
            {DEAL_STATUSES.map((s) => (
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
        ) : deals.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No deals match the selected status.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="p-4">Deal</th>
                  <th className="p-4">Farmer</th>
                  <th className="p-4">Buyer</th>
                  <th className="p-4">Produce</th>
                  <th className="p-4">Quantity</th>
                  <th className="p-4">Agreed Price</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {deals.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 font-mono font-semibold text-gray-700 dark:text-gray-200">{d.dealId}</td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{d.farmer?.name}</p>
                      <p className="text-[11px] text-gray-400">{d.farmer?.email}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{d.buyer?.name}</p>
                      <p className="text-[11px] text-gray-400">{d.buyer?.email}</p>
                    </td>
                    <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{d.cropName || d.produce?.name || '—'}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{d.quantity}{d.unit ? ` ${d.unit}` : ''}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">₹{d.agreedPrice?.toLocaleString?.() ?? '—'}/kg</td>
                    <td className="p-4 font-semibold text-gray-900 dark:text-white">₹{d.totalAmount?.toLocaleString?.() ?? '—'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_COLORS[d.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                        {d.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-[11px]">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}