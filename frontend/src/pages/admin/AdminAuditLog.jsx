import { useState, useEffect, useCallback } from 'react';
import { getAuditLog } from '../../services/adminApi';
import { Table, Td, TableSkeleton, EmptyState, ErrorState } from '../../components/admin/ui/adminUi';

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getAuditLog();
    if (res.ok) setLogs(Array.isArray(res.data) ? res.data : []);
    else setError(res.error);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Audit log</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">Immutable record of all important admin actions. Not editable by regular users.</p>
      </div>

      {error && !loading ? (
        <div className="bg-white border border-gray-200 rounded-xl"><ErrorState message={error} onRetry={fetchLogs} /></div>
      ) : (
        <Table
          columns={[
            { key: 'time', label: 'Timestamp', width: 170 },
            { key: 'actor', label: 'Actor', width: 150 },
            { key: 'action', label: 'Action', width: 190 },
            { key: 'details', label: 'Details' },
            { key: 'reason', label: 'Reason' },
          ]}
        >
          {loading ? (
            <TableSkeleton rows={10} cols={5} />
          ) : logs.length === 0 ? (
            <tr><td colSpan={5}><EmptyState title="No admin actions logged yet" hint="Actions like verifications, suspensions and removals will appear here." /></td></tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                <Td>
                  <span className="block text-[13px] text-gray-900 whitespace-nowrap">
                    {log.createdAt ? new Date(log.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                  <span className="block text-xs text-gray-500 whitespace-nowrap">
                    {log.createdAt ? new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </Td>
                <Td><span className="text-[13px] font-medium text-gray-900">{log.actorName || 'System'}</span></Td>
                <Td><span className="font-mono text-[11px] font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 whitespace-nowrap">{log.action}</span></Td>
                <Td><span className="text-[13px] text-gray-600">{log.details || '—'}</span></Td>
                <Td><span className="text-[13px] text-gray-500">{log.reason || '—'}</span></Td>
              </tr>
            ))
          )}
        </Table>
      )}
    </div>
  );
}
