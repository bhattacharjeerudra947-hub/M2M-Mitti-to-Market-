import { useState, useEffect, useCallback } from 'react';
import { getDisputes } from '../../services/adminApi';
import {
  Table, Td, TableSkeleton, EmptyState, ErrorState, StatusDot, genericStatusInfo, selectCls,
} from '../../components/admin/ui/adminUi';

const DISPUTE_STATUSES = ['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];

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
    if (res.ok) setDisputes(Array.isArray(res.data) ? res.data : []);
    else setError(res.error);
    setLoading(false);
  }, [status]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Disputes</h2>
          <p className="mt-0.5 text-[13px] text-gray-500">Deal disputes raised by platform users.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Filter by status">
          {DISPUTE_STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'Status: All' : `Status: ${s.replace(/_/g, ' ').toLowerCase()}`}</option>
          ))}
        </select>
      </div>

      {error && !loading ? (
        <div className="bg-white border border-gray-200 rounded-xl"><ErrorState message={error} onRetry={fetchDisputes} /></div>
      ) : (
        <Table
          columns={[
            { key: 'id', label: 'Dispute', width: 100 },
            { key: 'deal', label: 'Deal' },
            { key: 'raisedBy', label: 'Raised by' },
            { key: 'reason', label: 'Reason' },
            { key: 'created', label: 'Created', width: 110 },
            { key: 'status', label: 'Status', width: 140 },
            { key: 'actions', label: '', align: 'right' },
          ]}
        >
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : disputes.length === 0 ? (
            <tr><td colSpan={7}><EmptyState title="No disputes found" hint="Disputes raised on deals will appear here." /></td></tr>
          ) : (
            disputes.map((d) => {
              const st = genericStatusInfo(d.status);
              const isOpen = expanded === d.id;
              return (
                <>
                  <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                    <Td><span className="font-mono text-xs font-medium text-gray-900">#{d.id}</span></Td>
                    <Td><span className="font-mono text-xs text-gray-700">{d.dealId || '—'}</span></Td>
                    <Td>
                      <span className="block text-[13px] font-medium text-gray-900">{d.raisedByName || 'Unknown'}</span>
                      <span className="block text-xs text-gray-500">{d.raisedByEmail}</span>
                    </Td>
                    <Td><span className="text-[13px] text-gray-700">{(d.reason || '').replace(/_/g, ' ').toLowerCase()}</span></Td>
                    <Td><span className="text-xs text-gray-500 whitespace-nowrap">{d.createdAt ? new Date(d.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</span></Td>
                    <Td><StatusDot tone={st.tone} label={st.label.replace(/_/g, ' ').toLowerCase()} /></Td>
                    <Td>
                      <button
                        onClick={() => setExpanded(isOpen ? null : d.id)}
                        className="px-2.5 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {isOpen ? 'Hide' : 'View'}
                      </button>
                    </Td>
                  </tr>
                  {isOpen && (
                    <tr key={`${d.id}-detail`}>
                      <td colSpan={7} className="px-4 pb-4">
                        <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Dispute description</p>
                          <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{d.description || 'No description provided.'}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })
          )}
        </Table>
      )}
    </div>
  );
}
