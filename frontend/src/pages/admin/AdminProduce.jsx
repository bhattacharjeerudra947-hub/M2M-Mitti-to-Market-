import { useState, useEffect, useCallback } from 'react';
import { getProduce, removeProduce } from '../../services/adminApi';
import {
  Table, Td, TableSkeleton, EmptyState, ErrorState, StatusDot, genericStatusInfo,
  ConfirmDialog, selectCls,
} from '../../components/admin/ui/adminUi';

const PRODUCE_STATUSES = [
  'ALL', 'AVAILABLE', 'LOW_STOCK', 'PARTIALLY_SOLD', 'SOLD_OUT', 'PAUSED', 'EXPIRED', 'REMOVED', 'ADMIN_REMOVED',
];

export default function AdminProduce() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ALL');
  const [removeModal, setRemoveModal] = useState(null); // { id, name }
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [toast, setToast] = useState(null);

  const fetchProduce = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getProduce(status);
    if (res.ok) setItems(Array.isArray(res.data) ? res.data : []);
    else setError(res.error);
    setLoading(false);
  }, [status]);

  useEffect(() => { fetchProduce(); }, [fetchProduce]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const handleRemove = async () => {
    if (!removeModal) return;
    setSubmitting(true);
    setDialogError('');
    const res = await removeProduce(removeModal.id, reason.trim());
    setSubmitting(false);
    if (res.ok) {
      setRemoveModal(null);
      setReason('');
      showToast('Listing removed. Farmer notified.');
      fetchProduce();
    } else {
      setDialogError(res.error || 'Failed to remove listing.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Produce</h2>
          <p className="mt-0.5 text-[13px] text-gray-500">All produce listings on the marketplace, including completed lifecycle items.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Filter by status">
          {PRODUCE_STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'Status: All' : `Status: ${s.replace(/_/g, ' ').toLowerCase()}`}</option>
          ))}
        </select>
      </div>

      {error && !loading ? (
        <div className="bg-white border border-gray-200 rounded-xl"><ErrorState message={error} onRetry={fetchProduce} /></div>
      ) : (
        <Table
          columns={[
            { key: 'produce', label: 'Produce' },
            { key: 'farmer', label: 'Farmer' },
            { key: 'qty', label: 'Quantity' },
            { key: 'price', label: 'Price' },
            { key: 'location', label: 'Location' },
            { key: 'status', label: 'Status', width: 150 },
            { key: 'listed', label: 'Listed', width: 110 },
            { key: 'actions', label: '', align: 'right' },
          ]}
        >
          {loading ? (
            <TableSkeleton rows={8} cols={8} />
          ) : items.length === 0 ? (
            <tr><td colSpan={8}><EmptyState title="No produce found" hint="No listings match this status." /></td></tr>
          ) : (
            items.map((p) => {
              const st = genericStatusInfo(p.status);
              const removable = !['SOLD_OUT', 'REMOVED', 'ADMIN_REMOVED'].includes(p.status);
              return (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td>
                    <span className="block text-[13px] font-medium text-gray-900">{p.name || '—'}</span>
                    <span className="block text-xs text-gray-500">{p.category || p.cropName || ''}</span>
                  </Td>
                  <Td>
                    <span className="block text-[13px] text-gray-700">{p.farmerName || p.farmer?.name || '—'}</span>
                    <span className="block text-xs text-gray-500">{p.farmerEmail || p.farmer?.email}</span>
                  </Td>
                  <Td><span className="tabular-nums whitespace-nowrap">{p.quantity != null ? `${p.availableQuantity ?? p.quantity}${p.unit ? ` ${p.unit}` : ''}` : '—'}</span></Td>
                  <Td><span className="tabular-nums whitespace-nowrap">{p.pricePerUnit != null ? `₹${Number(p.pricePerUnit).toLocaleString()}/${p.unit || 'kg'}` : '—'}</span></Td>
                  <Td><span className="block max-w-[160px] truncate text-[13px] text-gray-600" title={p.location}>{p.location || '—'}</span></Td>
                  <Td><StatusDot tone={st.tone} label={st.label.replace(/_/g, ' ').toLowerCase()} /></Td>
                  <Td><span className="text-xs text-gray-500 whitespace-nowrap">{p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</span></Td>
                  <Td>
                    {removable ? (
                      <button
                        onClick={() => { setRemoveModal({ id: p.id, name: p.name }); setReason(''); setDialogError(''); }}
                        className="px-2.5 py-1.5 text-[12px] font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </Td>
                </tr>
              );
            })
          )}
        </Table>
      )}

      <ConfirmDialog
        open={removeModal !== null}
        title={removeModal ? `Remove "${removeModal.name}"?` : ''}
        body="The listing will be removed from the marketplace and the farmer will be notified with your reason. Historical deal records are preserved."
        confirmLabel="Remove listing"
        destructive
        requireReason
        reasonPlaceholder="e.g. Listing contains misleading information"
        busy={submitting}
        error={dialogError}
        reason={reason}
        onReasonChange={setReason}
        onCancel={() => setRemoveModal(null)}
        onConfirm={handleRemove}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] px-4 py-2.5 bg-gray-900 text-white text-[13px] font-medium rounded-lg shadow-lg">{toast}</div>
      )}
    </div>
  );
}
