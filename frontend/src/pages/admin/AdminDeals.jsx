import { useState, useEffect, useCallback } from 'react';
import { getDeals } from '../../services/adminApi';
import { Table, Td, TableSkeleton, EmptyState, ErrorState, StatusDot, genericStatusInfo, selectCls } from '../../components/admin/ui/adminUi';

const DEAL_STATUSES = [
  'ALL', 'NEGOTIATING', 'LOCK_PENDING', 'LOCKED', 'LOGISTICS_PENDING', 'LOGISTICS_ASSIGNED',
  'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
  'COMPLETED', 'CANCELLED', 'DISPUTED',
];

export default function AdminDeals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ALL');

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getDeals(status);
    if (res.ok) setDeals(Array.isArray(res.data) ? res.data : []);
    else setError(res.error);
    setLoading(false);
  }, [status]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const st = (d) => genericStatusInfo(d.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Deals</h2>
          <p className="mt-0.5 text-[13px] text-gray-500">Every farmer and buyer transaction on the platform.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Filter by status">
          {DEAL_STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'Status: All' : `Status: ${s.replace(/_/g, ' ').toLowerCase()}`}</option>
          ))}
        </select>
      </div>

      {error && !loading ? (
        <div className="bg-white border border-gray-200 rounded-xl"><ErrorState message={error} onRetry={fetchDeals} /></div>
      ) : (
        <Table
          columns={[
            { key: 'deal', label: 'Deal ID' },
            { key: 'farmer', label: 'Farmer' },
            { key: 'buyer', label: 'Buyer' },
            { key: 'produce', label: 'Produce' },
            { key: 'qty', label: 'Quantity' },
            { key: 'price', label: 'Agreed price' },
            { key: 'total', label: 'Total' },
            { key: 'status', label: 'Status' },
            { key: 'created', label: 'Created' },
          ]}
        >
          {loading ? (
            <TableSkeleton rows={8} cols={9} />
          ) : deals.length === 0 ? (
            <tr><td colSpan={9}><EmptyState title="No deals found" hint="No marketplace transactions match this status yet." /></td></tr>
          ) : (
            deals.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                <Td><span className="font-mono text-xs font-medium text-gray-900">{d.dealId}</span></Td>
                <Td>
                  <span className="block text-[13px] font-medium text-gray-900">{d.farmer?.name ?? '—'}</span>
                  <span className="block text-xs text-gray-500">{d.farmer?.email}</span>
                </Td>
                <Td>
                  <span className="block text-[13px] font-medium text-gray-900">{d.buyer?.name ?? '—'}</span>
                  <span className="block text-xs text-gray-500">{d.buyer?.email}</span>
                </Td>
                <Td>{d.cropName || d.produce?.name || '—'}</Td>
                <Td><span className="tabular-nums whitespace-nowrap">{d.quantity ? `${d.quantity}${d.unit ? ` ${d.unit}` : ''}` : '—'}</span></Td>
                <Td><span className="tabular-nums whitespace-nowrap">{d.agreedPrice != null ? `₹${Number(d.agreedPrice).toLocaleString()}` : '—'}</span></Td>
                <Td><span className="tabular-nums font-medium text-gray-900 whitespace-nowrap">{d.totalAmount != null ? `₹${Number(d.totalAmount).toLocaleString()}` : '—'}</span></Td>
                <Td><StatusDot tone={st(d).tone} label={(d.status || '').replace(/_/g, ' ').toLowerCase()} /></Td>
                <Td><span className="text-xs text-gray-500 whitespace-nowrap">{d.createdAt ? new Date(d.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></Td>
              </tr>
            ))
          )}
        </Table>
      )}
    </div>
  );
}
