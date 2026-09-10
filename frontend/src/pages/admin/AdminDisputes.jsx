import { useState, useEffect, useCallback } from 'react';
import { getDisputes } from '../../services/adminApi';

const DISPUTE_STATUSES = ['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];

const STATUS_COLORS = {
  OPEN: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
  UNDER_REVIEW: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
  RESOLVED: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
  REJECTED: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
};

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ALL');
  const [expanded, setExpanded] = useState(null);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getDisputes(status);
    if (res.ok) setDisputes(res.data || []);
    else setError(res.error);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Disputes &amp; Reports</h2>
            <p className="text-xs text-gray-500 mt-1">Deal disputes raised by platform users.</p>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full md:w-56 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-gray-900 dark:text-white"
          >
            {DISPUTE_STATUSES.map((s) => (
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
        ) : disputes.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No disputes found.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {disputes.map((d) => (
              <div key={d.id} className="p-5 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Dispute #{d.id} <span className="text-gray-400 font-normal">· Deal {d.dealId}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Raised by <span className="font-semibold text-gray-700 dark:text-gray-300">{d.raisedByName || 'Unknown'}</span>
                      {d.raisedByEmail ? ` (${d.raisedByEmail})` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_COLORS[d.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      {d.status?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-gray-400">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</span>
                    <button
                      onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      {expanded === d.id ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>
                <div className="mt-1.5">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-bold">
                    {d.reason?.replace(/_/g, ' ')}
                  </span>
                </div>
                {expanded === d.id && d.description && (
                  <p className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs text-gray-700 dark:text-gray-300">
                    {d.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}