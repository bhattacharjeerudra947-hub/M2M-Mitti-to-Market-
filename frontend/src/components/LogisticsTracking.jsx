import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Truck, Clock, IndianRupee, Route as RouteIcon, Loader2,
  RefreshCw, Package, CheckCircle2
} from 'lucide-react';
import { getRouteEstimate, getTimeline } from '../api/dealApi';

const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const formatDateTime = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch { return '—'; }
};

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

/**
 * Logistics panel — route estimate, status progression and event timeline.
 * (Live GPS/driver tracking was removed; status is updated by the parties
 * via the logistics status actions on the logistics pages.)
 */
export default function LogisticsTracking({ logistics, deal, onUpdate }) {
  const [route, setRoute] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const logisticsId = logistics?.id;

  const load = useCallback(async () => {
    if (!logisticsId) return;
    setLoading(true);
    setError('');
    try {
      const [r, t] = await Promise.all([
        getRouteEstimate(logisticsId).catch(() => null),
        getTimeline(logisticsId).catch(() => []),
      ]);
      setRoute(r || null);
      setTimeline(Array.isArray(t) ? t : []);
    } catch (e) {
      setError(e?.message || 'Failed to load logistics details');
    } finally {
      setLoading(false);
    }
  }, [logisticsId]);

  useEffect(() => { load(); }, [load]);

  if (!logistics) return null;

  const status = logistics.status || 'REQUESTED';
  const statusIdx = STATUS_FLOW.indexOf(status);

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary-600" />
            Logistics
            {logistics.trackingId && (
              <span className="text-xs font-mono text-navy-400">#{logistics.trackingId}</span>
            )}
          </h3>
          <p className="text-xs text-navy-500 mt-0.5">
            {logistics.type === 'OWN' ? 'Self-arranged transport' : 'Mitti2Market assisted transport'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
            status === 'DELIVERED'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-mustard-50 text-mustard-700 border-mustard-200'
          }`}>
            {STATUS_LABELS[status] || status}
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-500 disabled:opacity-50"
            title="Refresh"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Status progression */}
      <div>
        <div className="flex items-center gap-1">
          {STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full h-1.5 rounded-full ${i <= statusIdx ? 'bg-primary-500' : 'bg-navy-100'}`} />
              <span className={`text-[9px] leading-tight text-center ${i <= statusIdx ? 'text-primary-700 font-semibold' : 'text-navy-400'}`}>
                {STATUS_LABELS[s]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Route / locations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-2 bg-navy-50 rounded-xl p-3">
          <Package className="w-4 h-4 text-navy-500 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-navy-400 font-semibold">Pickup</p>
            <p className="text-xs text-navy-800">{logistics.pickupLocation || '—'}</p>
            <p className="text-[11px] text-navy-500">{formatDateTime(logistics.scheduledPickup)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 bg-primary-50 rounded-xl p-3">
          <MapPin className="w-4 h-4 text-primary-600 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-primary-500 font-semibold">Delivery</p>
            <p className="text-xs text-navy-800">{logistics.deliveryLocation || '—'}</p>
            <p className="text-[11px] text-navy-500">Expected {formatDateTime(logistics.expectedDelivery)}</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Route estimate */}
      {route && (
        <div className="border border-navy-100 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
            <RouteIcon className="w-3.5 h-3.5 text-navy-500" /> Route Estimate
            <span className="ml-auto text-[10px] font-medium text-navy-400">{route.provider || ''}</span>
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-navy-50 rounded-lg py-2">
              <p className="text-sm font-bold text-navy-900">{route.distanceKm != null ? `${route.distanceKm} km` : '—'}</p>
              <p className="text-[10px] text-navy-500">Distance</p>
            </div>
            <div className="bg-navy-50 rounded-lg py-2">
              <p className="text-sm font-bold text-navy-900">{route.durationMinutes != null ? `${Math.round(route.durationMinutes)} min` : '—'}</p>
              <p className="text-[10px] text-navy-500">Est. time</p>
            </div>
            <div className="bg-navy-50 rounded-lg py-2">
              <p className="text-sm font-bold text-navy-900 flex items-center justify-center gap-0.5">
                {route.estimatedCost != null ? formatINR(route.estimatedCost) : '—'}
              </p>
              <p className="text-[10px] text-navy-500">Est. cost{route.costPerKg != null ? ` (${formatINR(route.costPerKg)}/kg)` : ''}</p>
            </div>
          </div>
          {route.summary && <p className="text-[11px] text-navy-500">{route.summary}</p>}
          {route.caveat && (
            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
              ⚠ {route.caveat}
            </p>
          )}
        </div>
      )}

      {/* Event timeline */}
      {timeline.length > 0 && (
        <div>
          <p className="text-xs font-bold text-navy-900 mb-2">Event Timeline</p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {timeline.map((ev) => (
              <div key={ev.id || ev.timestamp} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-navy-800">{ev.description || ev.status}</p>
                  <p className="text-[10px] text-navy-400">{formatDateTime(ev.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
