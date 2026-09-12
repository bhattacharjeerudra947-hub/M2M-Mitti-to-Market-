import { useState, useEffect, useCallback } from 'react';
import { getDisputes } from '../../services/adminApi';
import {
  getDisputeDetails, assignObserver, requestDisputeEvidence,
  resolveDispute, getAvailableObservers
} from '../../api/dealApi';
import {
  Table, Td, TableSkeleton, EmptyState, ErrorState, StatusDot, genericStatusInfo, selectCls,
} from '../../components/admin/ui/adminUi';
import {
  ShieldCheck, AlertTriangle, UserCheck, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Scale, Camera, FileText, Loader2, ArrowRight
} from 'lucide-react';

const DISPUTE_STATUSES = [
  'ALL', 'OPEN', 'UNDER_REVIEW', 'WAITING_FOR_FARMER', 'WAITING_FOR_BUYER',
  'WAITING_FOR_OBSERVER', 'ADDITIONAL_EVIDENCE_REQUIRED', 'RESOLVED',
  'PARTIALLY_RESOLVED', 'REJECTED', 'ESCALATED'
];

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ALL');
  const [expanded, setExpanded] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [observers, setObservers] = useState([]);

  // Modals / sub-actions
  const [actionDisputeId, setActionDisputeId] = useState(null);
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialData, setPartialData] = useState({
    acceptedQuantity: '',
    disputedQuantity: '',
    adjustmentAmount: '',
    returnDisputedToStock: true,
    resolutionNotes: ''
  });
  const [selectedObserverId, setSelectedObserverId] = useState('');
  const [observerNotes, setObserverNotes] = useState('');
  const [evidenceTargetRole, setEvidenceTargetRole] = useState('FARMER');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getDisputes(status);
    if (res.ok) setDisputes(Array.isArray(res.data) ? res.data : []);
    else setError(res.error);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    fetchDisputes();
    getAvailableObservers().then((res) => {
      setObservers(Array.isArray(res) ? res : []);
    }).catch(() => {});
  }, [fetchDisputes]);

  const toggleExpand = async (disputeId) => {
    if (expanded === disputeId) {
      setExpanded(null);
      return;
    }
    setExpanded(disputeId);
    if (!expandedDetails[disputeId]) {
      setLoadingDetails((prev) => ({ ...prev, [disputeId]: true }));
      try {
        const details = await getDisputeDetails(disputeId);
        setExpandedDetails((prev) => ({ ...prev, [disputeId]: details }));
      } catch (err) {
        console.error('Failed to load dispute details:', err);
      } finally {
        setLoadingDetails((prev) => ({ ...prev, [disputeId]: false }));
      }
    }
  };

  const handleAssignObserver = async (disputeId) => {
    if (!selectedObserverId) return alert('Please select an authorized observer');
    try {
      setBusyAction(true);
      await assignObserver(disputeId, {
        observerId: selectedObserverId,
        notes: observerNotes || 'Assigned to inspect evidence on-site'
      });
      alert('Observer assigned successfully');
      setSelectedObserverId('');
      setObserverNotes('');
      // Refresh
      const details = await getDisputeDetails(disputeId);
      setExpandedDetails((prev) => ({ ...prev, [disputeId]: details }));
      fetchDisputes();
    } catch (e) {
      alert(e.message || 'Failed to assign observer');
    } finally {
      setBusyAction(false);
    }
  };

  const handleRequestEvidence = async (disputeId) => {
    if (!evidenceNotes.trim()) return alert('Please enter instructions for the evidence requested');
    try {
      setBusyAction(true);
      await requestDisputeEvidence(disputeId, {
        targetRole: evidenceTargetRole,
        notes: evidenceNotes
      });
      alert('Evidence request dispatched');
      setEvidenceNotes('');
      const details = await getDisputeDetails(disputeId);
      setExpandedDetails((prev) => ({ ...prev, [disputeId]: details }));
      fetchDisputes();
    } catch (e) {
      alert(e.message || 'Failed to request evidence');
    } finally {
      setBusyAction(false);
    }
  };

  const handleQuickResolve = async (disputeId, type) => {
    const label = type.replace(/_/g, ' ');
    const notes = window.prompt(`Enter resolution notes for decision [${label}]:`, `Resolved by platform administrator as ${label}`);
    if (notes === null) return;

    try {
      setBusyAction(true);
      await resolveDispute(disputeId, {
        resolutionType: type,
        resolutionNotes: notes
      });
      alert(`Dispute resolved as ${label}`);
      const details = await getDisputeDetails(disputeId);
      setExpandedDetails((prev) => ({ ...prev, [disputeId]: details }));
      fetchDisputes();
    } catch (e) {
      alert(e.message || 'Failed to resolve dispute');
    } finally {
      setBusyAction(false);
    }
  };

  const handlePartialSubmit = async (e) => {
    e.preventDefault();
    if (!actionDisputeId) return;
    try {
      setBusyAction(true);
      await resolveDispute(actionDisputeId, {
        resolutionType: 'PARTIAL_SETTLEMENT',
        resolutionNotes: partialData.resolutionNotes || 'Partial quantity settlement mediated by platform administrator.',
        acceptedQuantity: parseInt(partialData.acceptedQuantity, 10),
        disputedQuantity: parseInt(partialData.disputedQuantity, 10),
        adjustmentAmount: partialData.adjustmentAmount ? parseFloat(partialData.adjustmentAmount) : null,
        returnDisputedToStock: partialData.returnDisputedToStock
      });
      setShowPartialModal(false);
      alert('Partial settlement recorded and order updated');
      const details = await getDisputeDetails(actionDisputeId);
      setExpandedDetails((prev) => ({ ...prev, [actionDisputeId]: details }));
      fetchDisputes();
    } catch (e) {
      alert(e.message || 'Failed to record partial settlement');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            Dispute Resolution & Evidence Auditing
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Audit origin photos, delivery receipts, observer inspections & enforce settlements.
          </p>
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
            { key: 'id', label: 'Dispute', width: 90 },
            { key: 'deal', label: 'Deal & Crop' },
            { key: 'parties', label: 'Parties (Farmer / Buyer)' },
            { key: 'reason', label: 'Reason' },
            { key: 'created', label: 'Created', width: 110 },
            { key: 'status', label: 'Status', width: 140 },
            { key: 'actions', label: '', align: 'right', width: 110 },
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
              const detail = expandedDetails[d.id];
              const isLoadingThis = loadingDetails[d.id];

              return (
                <tbody key={d.id} className="border-b border-gray-100">
                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <Td><span className="font-mono text-xs font-bold text-navy-900">#{d.id}</span></Td>
                    <Td>
                      <span className="block text-xs font-bold text-navy-900">Deal #{d.dealId}</span>
                      <span className="block text-[11px] text-gray-500">{d.produceName || 'Produce'} · {d.quantity || '—'} {d.unit || 'kg'}</span>
                    </Td>
                    <Td>
                      <div className="text-xs">
                        <span className="font-semibold text-gray-800">🌾 {d.farmerName || 'Farmer'}</span>
                        <span className="text-gray-400 mx-1">↔</span>
                        <span className="font-semibold text-gray-800">🏪 {d.buyerName || 'Buyer'}</span>
                      </div>
                    </Td>
                    <Td><span className="text-[12px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">{(d.reason || '').replace(/_/g, ' ')}</span></Td>
                    <Td><span className="text-xs text-gray-500 whitespace-nowrap">{d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span></Td>
                    <Td><StatusDot tone={st.tone} label={(d.status || '').replace(/_/g, ' ').toLowerCase()} /></Td>
                    <Td align="right">
                      <button
                        onClick={() => toggleExpand(d.id)}
                        className="px-3 py-1.5 text-[12px] font-bold text-navy-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-1 shadow-2xs"
                      >
                        {isOpen ? 'Close' : 'Review'} {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </Td>
                  </tr>

                  {/* EXPANDED COMPLETE AUDIT WORKSPACE */}
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className="p-4 bg-gray-50/80 border-t border-gray-100">
                        {isLoadingThis ? (
                          <div className="flex items-center justify-center py-8 text-xs text-gray-500 gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-navy-900" /> Loading full evidence chain and dispute thread...
                          </div>
                        ) : detail ? (
                          <div className="space-y-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">

                            {/* 1. DISPUTE SUMMARY & QUANTITIES */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                              <div>
                                <span className="text-gray-400 block font-medium">Original Deal Qty:</span>
                                <span className="text-sm font-bold text-navy-900">{detail.originalQuantity || detail.deal?.quantity || '—'} kg</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-medium">Disputed Quantity:</span>
                                <span className="text-sm font-bold text-red-700">{detail.disputedQuantity || '—'} kg</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-medium">Assigned Observer:</span>
                                <span className="text-sm font-bold text-blue-800">{detail.assignedObserverName ? `👮 ${detail.assignedObserverName}` : 'Unassigned'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-medium">Resolution Decision:</span>
                                <span className="text-sm font-bold text-emerald-800">{detail.resolutionType || detail.status}</span>
                              </div>
                            </div>

                            {/* 2. SIDE-BY-SIDE EVIDENCE GALLERIES */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* ORIGIN PHOTOS */}
                              <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100">
                                <h4 className="font-bold text-emerald-950 text-xs uppercase tracking-wide mb-2 flex items-center justify-between">
                                  <span>📸 Stage 1: Origin Evidence</span>
                                  <span className="text-[10px] font-normal text-emerald-800">Before Dispatch</span>
                                </h4>
                                {detail.evidence?.filter(e => e.stage === 'ORIGIN').length === 0 ? (
                                  <p className="text-xs text-gray-500 italic py-4 text-center">No origin photos uploaded.</p>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {detail.evidence.filter(e => e.stage === 'ORIGIN').map(ev => (
                                      <div key={ev.id} className="relative rounded-lg overflow-hidden border border-gray-200 bg-white group">
                                        <img src={ev.imageUrl} alt="Origin" className="w-full h-24 object-cover cursor-pointer hover:scale-105 transition" onClick={() => window.open(ev.imageUrl, '_blank')} />
                                        <div className="p-1.5 text-[10px]">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-emerald-800">{ev.verificationStatus}</span>
                                            {ev.lotQuantity && <span>{ev.lotQuantity} kg</span>}
                                          </div>
                                          {ev.verifiedByName && <p className="text-[9px] text-gray-400">✓ {ev.verifiedByName}</p>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* DELIVERY PHOTOS */}
                              <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100">
                                <h4 className="font-bold text-blue-950 text-xs uppercase tracking-wide mb-2 flex items-center justify-between">
                                  <span>📸 Stage 2: Delivery Evidence</span>
                                  <span className="text-[10px] font-normal text-blue-800">Upon Arrival</span>
                                </h4>
                                {detail.evidence?.filter(e => e.stage === 'DELIVERY' || e.stage === 'DISPUTE').length === 0 ? (
                                  <p className="text-xs text-gray-500 italic py-4 text-center">No delivery photos uploaded.</p>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {detail.evidence.filter(e => e.stage === 'DELIVERY' || e.stage === 'DISPUTE').map(ev => (
                                      <div key={ev.id} className="relative rounded-lg overflow-hidden border border-gray-200 bg-white group">
                                        <img src={ev.imageUrl} alt="Delivery" className="w-full h-24 object-cover cursor-pointer hover:scale-105 transition" onClick={() => window.open(ev.imageUrl, '_blank')} />
                                        <div className="p-1.5 text-[10px]">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-blue-800">{ev.stage}: {ev.verificationStatus}</span>
                                          </div>
                                          <p className="text-[9px] text-gray-500 line-clamp-1">{ev.description}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 3. CLAIMS & TIMELINE THREAD */}
                            <div className="space-y-2">
                              <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wide">
                                💬 Claims & Investigation Timeline
                              </h4>
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {detail.responses?.map((r) => (
                                  <div key={r.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-navy-900">
                                        {r.userRole === 'ADMIN' ? '👑 Admin' : r.userRole === 'OBSERVER' ? '👮 Observer' : r.userRole === 'FARMER' ? '🌾 Farmer' : '🏪 Buyer'}: {r.userName}
                                      </span>
                                      <span className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleString('en-IN')}</span>
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-wrap">{r.message}</p>
                                    {r.evidenceUrl && (
                                      <img src={r.evidenceUrl} alt="Attachment" className="w-24 h-18 object-cover rounded-lg mt-2 cursor-pointer border border-gray-200" onClick={() => window.open(r.evidenceUrl, '_blank')} />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 4. ADMIN ACTION CONTROLS */}
                            <div className="pt-4 border-t border-gray-100 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* ASSIGN OBSERVER */}
                                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                  <p className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                                    <UserCheck className="w-4 h-4 text-blue-600" /> Assign Authorized Observer
                                  </p>
                                  <select
                                    value={selectedObserverId}
                                    onChange={(e) => setSelectedObserverId(e.target.value)}
                                    className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg font-medium"
                                  >
                                    <option value="">Select an Observer...</option>
                                    {observers.map((obs) => (
                                      <option key={obs.id} value={obs.id}>{obs.name} ({obs.location || 'HQ'})</option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    value={observerNotes}
                                    onChange={(e) => setObserverNotes(e.target.value)}
                                    placeholder="Instructions for physical verification..."
                                    className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg"
                                  />
                                  <button
                                    onClick={() => handleAssignObserver(detail.id)}
                                    disabled={busyAction || !selectedObserverId}
                                    className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                                  >
                                    Assign Observer
                                  </button>
                                </div>

                                {/* REQUEST MORE EVIDENCE */}
                                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                  <p className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                                    <Camera className="w-4 h-4 text-amber-600" /> Request Additional Evidence
                                  </p>
                                  <select
                                    value={evidenceTargetRole}
                                    onChange={(e) => setEvidenceTargetRole(e.target.value)}
                                    className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg font-medium"
                                  >
                                    <option value="FARMER">Request from Farmer (🌾 {detail.deal?.farmer?.name || 'Farmer'})</option>
                                    <option value="BUYER">Request from Buyer (🏪 {detail.deal?.buyer?.name || 'Buyer'})</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={evidenceNotes}
                                    onChange={(e) => setEvidenceNotes(e.target.value)}
                                    placeholder="Specify missing photos, weight slips, or bills..."
                                    className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg"
                                  />
                                  <button
                                    onClick={() => handleRequestEvidence(detail.id)}
                                    disabled={busyAction || !evidenceNotes.trim()}
                                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                                  >
                                    Request Evidence
                                  </button>
                                </div>
                              </div>

                              {/* RESOLUTION BUTTONS */}
                              <div className="p-3.5 bg-gray-100 rounded-xl space-y-2">
                                <p className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                                  <Scale className="w-4 h-4 text-purple-700" /> Final Administrative Decision
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleQuickResolve(detail.id, 'ACCEPT_BUYER')}
                                    disabled={busyAction}
                                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
                                  >
                                    Accept Buyer Claim (Full Refund / Cancellation)
                                  </button>

                                  <button
                                    onClick={() => handleQuickResolve(detail.id, 'ACCEPT_FARMER')}
                                    disabled={busyAction}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                                  >
                                    Accept Farmer Claim (Full Order Completion)
                                  </button>

                                  <button
                                    onClick={() => {
                                      setActionDisputeId(detail.id);
                                      setPartialData({
                                        acceptedQuantity: detail.acceptedQuantity || Math.round((detail.originalQuantity || detail.deal?.quantity || 100) * 0.9),
                                        disputedQuantity: detail.disputedQuantity || Math.round((detail.originalQuantity || detail.deal?.quantity || 100) * 0.1),
                                        adjustmentAmount: '',
                                        returnDisputedToStock: true,
                                        resolutionNotes: `Partial settlement: Accepted ${Math.round((detail.originalQuantity || 100) * 0.9)} kg, disputed remainder.`
                                      });
                                      setShowPartialModal(true);
                                    }}
                                    disabled={busyAction}
                                    className="px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg transition inline-flex items-center gap-1.5"
                                  >
                                    <Scale className="w-3.5 h-3.5" /> Partial Settlement
                                  </button>

                                  <button
                                    onClick={() => handleQuickResolve(detail.id, 'REJECTED')}
                                    disabled={busyAction}
                                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold rounded-lg transition"
                                  >
                                    Reject Dispute (Dismiss)
                                  </button>

                                  <button
                                    onClick={() => handleQuickResolve(detail.id, 'ESCALATED')}
                                    disabled={busyAction}
                                    className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition"
                                  >
                                    Escalate Case
                                  </button>
                                </div>
                              </div>

                            </div>

                          </div>
                        ) : (
                          <p className="text-xs text-red-600">Failed to load dispute details.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })
          )}
        </Table>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PARTIAL SETTLEMENT MODAL
          ───────────────────────────────────────────────────────────── */}
      {showPartialModal && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-navy-100">
            <h3 className="font-bold text-navy-900 text-base mb-1 flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-700" />
              Mediated Partial Resolution
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Determine accepted vs disputed quantities to finalize inventory and financial terms.
            </p>

            <form onSubmit={handlePartialSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Accepted Quantity (kg)</label>
                  <input
                    type="number"
                    required
                    value={partialData.acceptedQuantity}
                    onChange={(e) => setPartialData({ ...partialData, acceptedQuantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Disputed / Damaged (kg)</label>
                  <input
                    type="number"
                    required
                    value={partialData.disputedQuantity}
                    onChange={(e) => setPartialData({ ...partialData, disputedQuantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-red-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Financial Adjustment (₹, Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={partialData.adjustmentAmount}
                  onChange={(e) => setPartialData({ ...partialData, adjustmentAmount: e.target.value })}
                  placeholder="e.g. 1500 (credit or settlement adjustment)"
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="returnStock"
                  checked={partialData.returnDisputedToStock}
                  onChange={(e) => setPartialData({ ...partialData, returnDisputedToStock: e.target.checked })}
                  className="rounded text-purple-600"
                />
                <label htmlFor="returnStock" className="text-xs text-gray-700">
                  Return undamaged remainder back to farmer's available stock
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Resolution Rationale</label>
                <textarea
                  rows="3"
                  required
                  value={partialData.resolutionNotes}
                  onChange={(e) => setPartialData({ ...partialData, resolutionNotes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl resize-none"
                  placeholder="Explain why this partial settlement was agreed upon..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={busyAction}
                  className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                >
                  {busyAction ? 'Finalizing...' : 'Enforce Settlement'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPartialModal(false)}
                  className="px-4 py-2.5 text-xs text-gray-600 font-semibold rounded-xl hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
