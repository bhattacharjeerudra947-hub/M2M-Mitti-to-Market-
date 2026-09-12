import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { getMyLogistics, updateLogisticsStatus } from '../api/dealApi';
import {
  Truck, MapPin, Package, IndianRupee, Loader2, RefreshCw,
  AlertTriangle, Inbox, ChevronDown, ExternalLink, Route as RouteIcon
} from 'lucide-react';

const STATUS_FLOW = ['REQUESTED', 'ASSIGNED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const STATUS_LABELS = {
  REQUESTED: 'Requested',
  ASSIGNED: 'Assigned',
  PICKUP_SCHEDULED: 'Pickup Scheduled',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
};
const fmtINR = (n) => (n != null ? '₹' + Number(n).toLocaleString('en-IN') : '—');
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return '—'; }
};

export default function FarmerLogistics() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getMyLogistics();
      setShipments(Array.isArray(data) ? data : []);
      setError('');
    } catch (e) {
      setError(e?.message || 'Failed to load logistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const advance = async (shipment) => {
    const idx = STATUS_FLOW.indexOf(shipment.status);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;
    setBusy(shipment.id);
    try {
      await updateLogisticsStatus(shipment.id, next);
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to update status');
    } finally {
      setBusy(null);
    }
  };

  const isFarmer = user?.role === 'FARMER';
  const sidebarRole = isFarmer ? 'farmer' : 'business';

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role={sidebarRole} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-navy-900">Logistics</h1>
              <p className="text-navy-500 mt-1">Track your deal shipments — pickup to delivery</p>
            </div>
            <button onClick={load} className="px-3 py-2 bg-white border border-navy-100 rounded-xl text-xs font-semibold text-navy-700 hover:bg-gray-50 transition inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading shipments...</p>
            </div>
          ) : shipments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-navy-100 p-12 text-center">
              <Inbox className="w-10 h-10 text-navy-300 mx-auto mb-3" />
              <p className="font-semibold text-navy-900">No shipments yet</p>
              <p className="text-sm text-gray-500 mt-1">
                When a deal is locked and logistics is arranged, shipments appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {shipments.map((s) => {
                const idx = STATUS_FLOW.indexOf(s.status);
                const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
                const isOpen = expanded === s.id;
                return (
                  <div key={s.id} className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition"
                      onClick={() => setExpanded(isOpen ? null : s.id)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-mustard-50 border border-mustard-100 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-mustard-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-navy-900 text-sm truncate">
                          {s.produceName || 'Shipment'} · {s.quantityKg != null ? `${Number(s.quantityKg).toLocaleString('en-IN')} kg` : ''}
                        </p>
                        <p className="text-xs text-navy-500 truncate">
                          {s.pickupLocation || '—'} → {s.deliveryLocation || '—'}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border shrink-0 ${
                        s.status === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-mustard-50 text-mustard-700 border-mustard-200'
                      }`}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-navy-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4 border-t border-navy-50 pt-4">
                        {/* Progress bar */}
                        <div className="flex items-center gap-1">
                          {STATUS_FLOW.map((st, i) => (
                            <div key={st} className="flex-1">
                              <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-primary-500' : 'bg-navy-100'}`} title={STATUS_LABELS[st]} />
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-navy-50 rounded-xl p-3">
                            <p className="text-[10px] uppercase tracking-wide text-navy-400 font-semibold mb-0.5">Deal</p>
                            <p className="font-semibold text-navy-900">{s.dealNumber || s.dealId}</p>
                          </div>
                          <div className="bg-navy-50 rounded-xl p-3">
                            <p className="text-[10px] uppercase tracking-wide text-navy-400 font-semibold mb-0.5">Pickup date</p>
                            <p className="font-semibold text-navy-900">{fmtDate(s.scheduledPickup)}</p>
                          </div>
                          <div className="bg-navy-50 rounded-xl p-3">
                            <p className="text-[10px] uppercase tracking-wide text-navy-400 font-semibold mb-0.5">Expected delivery</p>
                            <p className="font-semibold text-navy-900">{fmtDate(s.expectedDelivery)}</p>
                          </div>
                          <div className="bg-navy-50 rounded-xl p-3">
                            <p className="text-[10px] uppercase tracking-wide text-navy-400 font-semibold mb-0.5">Distance / Cost est.</p>
                            <p className="font-semibold text-navy-900 flex items-center gap-1">
                              <IndianRupee className="w-3 h-3" />
                              {s.routeDistanceKm != null ? `${s.routeDistanceKm} km · ` : ''}{fmtINR(s.routeEstimatedCost)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-navy-500">
                          <span className="inline-flex items-center gap-1 font-mono font-medium"><Package className="w-3 h-3 text-emerald-600" /> Tracking #{s.trackingId}</span>
                          {(s.assignedVehicleNumber || s.vehicleNumber) && (
                            <span className="inline-flex items-center gap-1 font-medium text-navy-800">
                              <Truck className="w-3 h-3 text-blue-600" />
                              Vehicle: {s.assignedVehicleLabel || s.assignedVehicleNumber || s.vehicleNumber}
                            </span>
                          )}
                          {s.transporterName && <span>Transporter: {s.transporterName}</span>}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-navy-50">
                          <Link
                            to={`/deals/${s.dealId}`}
                            className="px-3 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-800 text-xs font-semibold rounded-xl transition inline-flex items-center gap-1.5"
                          >
                            <RouteIcon className="w-3.5 h-3.5 text-emerald-600" />
                            View Interactive Route & Map
                            <ExternalLink className="w-3 h-3 text-navy-400" />
                          </Link>

                          {next && (
                            <button
                              onClick={() => advance(s)}
                              disabled={busy === s.id}
                              className="px-4 py-2 bg-navy-900 text-white text-xs font-semibold rounded-xl hover:bg-navy-800 disabled:opacity-50 transition inline-flex items-center gap-2"
                            >
                              {busy === s.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              Mark as {STATUS_LABELS[next]}
                            </button>
                          )}
                        </div>
                        {s.status === 'DELIVERED' && (
                          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
                            ✓ Delivered on {fmtDate(s.actualDelivery)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
