import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import {
  getDriverTrips, startTracking, pauseTracking, resumeTracking,
  completeTracking, updateLiveLocation, getRouteEstimate,
} from '../api/dealApi';
import { isLowDataMode, onLowDataModeChange } from '../utils/lowDataMode';
import { queueGpsPoint, flushGpsQueue, countQueuedGpsPoints } from '../utils/gpsQueue';
import {
  Truck, MapPin, Play, Pause, CheckCircle, Navigation, Loader2,
  WifiOff, Clock, AlertTriangle, RefreshCw,
} from 'lucide-react';

const STATUS_COLORS = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PAUSED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-navy-100 text-navy-700',
};

const TRACKING_LABELS = {
  NOT_STARTED: 'Not started',
  ACTIVE: '🟢 Live tracking active',
  PAUSED: '⏸ Paused',
  COMPLETED: '✅ Trip completed',
};

function timeAgo(iso) {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 10) return 'just now';
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState({});
  const [queued, setQueued] = useState(0);
  const [routes, setRoutes] = useState({});
  const [lowData, setLowData] = useState(isLowDataMode());
  const mounted = useRef(true);

  const refreshQueued = useCallback(async () => {
    setQueued(await countQueuedGpsPoints());
  }, []);

  const loadTrips = useCallback(async () => {
    if (!mounted.current) return;
    try {
      const trips = await getDriverTrips();
      if (mounted.current) { setTrips(Array.isArray(trips) ? trips : []); setError(''); }
    } catch (e) {
      // Offline → keep the last known trips visible; show real errors only
      if (mounted.current && e.status && e.status !== 0) setError(e.message || 'Could not load your trips');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  // Initial load + poll (slower in low-data mode)
  useEffect(() => {
    mounted.current = true;
    loadTrips();
    refreshQueued();
    const interval = setInterval(() => {
      if (!isLowDataMode()) loadTrips();
    }, 15000);
    return () => { mounted.current = false; clearInterval(interval); };
  }, [loadTrips, refreshQueued]);

  // Low-data live switching
  useEffect(() => {
    const off = onLowDataModeChange((enabled) => setLowData(enabled));
    return off;
  }, []);

  // Flush queued GPS points when connectivity returns
  useEffect(() => {
    const onOnline = async () => {
      const n = await flushGpsQueue(async (p) => {
        await updateLiveLocation(p.logisticsId, {
          latitude: p.latitude, longitude: p.longitude,
          accuracy: p.accuracy, speed: p.speed, heading: p.heading,
        });
      });
      if (n > 0) { refreshQueued(); loadTrips(); }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [refreshQueued, loadTrips]);

  const run = async (trip, action, fn) => {
    setBusy((b) => ({ ...b, [action]: true })); setError('');
    try {
      await fn(trip.id);
      await loadTrips();
    } catch (e) {
      setError(e.message || 'Action failed');
    } finally {
      setBusy((b) => ({ ...b, [action]: false }));
    }
  };

  const refreshRoute = async (trip) => {
    setBusy((b) => ({ ...b, route: true }));
    try {
      const route = await getRouteEstimate(trip.id);
      if (mounted.current) setRoutes((r) => ({ ...r, [trip.id]: route || {} }));
    } catch { /* route estimate unavailable — stored summary shown instead */ }
    finally { if (mounted.current) setBusy((b) => ({ ...b, route: false })); }
  };

  /** Post a location — queues it offline when the network is down. */
  const shareLocation = async (trip) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available on this device');
      return;
    }
    setBusy((b) => ({ ...b, gps: true })); setError('');
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 15000 });
      });
      const { latitude, longitude, accuracy } = pos.coords;
      const payload = {
        latitude, longitude,
        accuracy: Math.round(accuracy || 0),
        speed: pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : 0,
        heading: pos.coords.heading != null ? Math.round(pos.coords.heading) : 0,
      };
      try {
        await updateLiveLocation(trip.id, payload);
      } catch (e) {
        if (e.status === 0) {
          // Offline → queue locally, show clear staleness, never pretend it's live
          const ok = await queueGpsPoint({
            logisticsId: trip.id,
            latitude, longitude,
            accuracy: payload.accuracy, speed: payload.speed, heading: payload.heading,
            recordedAt: new Date().toISOString(),
          });
          if (ok) {
            refreshQueued();
            setError('📡 Offline — location saved on this device and will sync automatically');
          } else {
            setError('Location could not be saved on this device');
          }
          return;
        }
        throw e;
      }
      await loadTrips();
    } catch (e) {
      setError(e.message || 'Could not get your location');
    } finally {
      setBusy((b) => ({ ...b, gps: false }));
    }
  };

  const activeCount = trips.filter((t) => t.trackingStatus === 'ACTIVE').length;
  const firstName = user?.name?.split(' ')[0] || 'Driver';

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="driver" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">🚚 My Trips, {firstName}</h1>
              <p className="text-navy-500 mt-1">Deliveries assigned to you — start tracking to share your live location with the farmer and buyer.</p>
            </div>
            {queued > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700">
                <WifiOff className="w-3.5 h-3.5" /> {queued} location{queued > 1 ? 's' : ''} queued offline
              </span>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-4">
              <p className="text-xs text-navy-500 font-semibold uppercase tracking-wide">Assigned Trips</p>
              <p className="text-2xl font-bold text-navy-900 mt-1">{trips.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-4">
              <p className="text-xs text-navy-500 font-semibold uppercase tracking-wide">🟢 Live Now</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
            </div>
            <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-4">
              <p className="text-xs text-navy-500 font-semibold uppercase tracking-wide">Mode</p>
              <p className="text-2xl font-bold text-navy-900 mt-1">{lowData ? '📶 Low Data' : 'Standard'}</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
            </div>
          ) : trips.length === 0 ? (
            <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-10 text-center">
              <div className="text-5xl mb-3">🚛</div>
              <h3 className="text-lg font-bold text-navy-900 mb-1">No trips assigned yet</h3>
              <p className="text-sm text-navy-500 max-w-md mx-auto">
                When a farmer or buyer selects logistics for a locked deal and assigns a driver, the
                trip will appear here with full tracking controls.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {trips.map((trip) => {
                const route = routes[trip.id];
                const active = trip.trackingStatus === 'ACTIVE';
                const completed = trip.trackingStatus === 'COMPLETED';
                return (
                  <div key={trip.id} className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-navy-100 bg-navy-50/40">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center text-white">
                          <Truck className="w-5 h-5" />
                        </span>
                        <div>
                          <p className="font-bold text-navy-900">{trip.cropName || 'Produce'}{trip.quantity ? ` · ${trip.quantity.toLocaleString('en-IN')} ${trip.unit || 'kg'}` : ''}</p>
                          <p className="text-xs text-navy-500">{trip.trackingId} · Deal {trip.dealNumber} · {trip.type === 'MITTI2MARKET' ? 'Mitti2Market Logistics' : 'Own Logistics'}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[trip.trackingStatus] || STATUS_COLORS.NOT_STARTED}`}>
                        {TRACKING_LABELS[trip.trackingStatus] || trip.trackingStatus}
                      </span>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Route */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">📍 Pickup</p>
                          <p className="text-sm font-semibold text-navy-900">{trip.pickupLocation || 'Farmer location'}</p>
                          <p className="text-xs text-navy-500 mt-0.5">{trip.farmerName}</p>
                          {trip.scheduledPickup && <p className="text-xs text-navy-400 mt-1">🕐 {fmtDate(trip.scheduledPickup)}</p>}
                        </div>
                        <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">🏪 Delivery</p>
                          <p className="text-sm font-semibold text-navy-900">{trip.deliveryLocation || 'Buyer location'}</p>
                          <p className="text-xs text-navy-500 mt-0.5">{trip.buyerName}</p>
                          {trip.expectedDelivery && <p className="text-xs text-navy-400 mt-1">🕐 {fmtDate(trip.expectedDelivery)}</p>}
                        </div>
                      </div>

                      {/* Vehicle + last location */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-navy-600">
                        {trip.vehicleNumber && <span>🚛 {trip.vehicleNumber}{trip.vehicleType ? ` (${trip.vehicleType})` : ''}</span>}
                        {trip.latitude != null && trip.longitude != null && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            {trip.latitude.toFixed(4)}, {trip.longitude.toFixed(4)}
                            <span className={timeAgo(trip.lastLocationUpdate) === 'just now' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                              · {timeAgo(trip.lastLocationUpdate) || 'no fix yet'}
                            </span>
                            {trip.lastAccuracy > 100 && <span className="text-amber-600">(±{Math.round(trip.lastAccuracy)}m)</span>}
                          </span>
                        )}
                        {active && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <Clock className="w-3.5 h-3.5" /> tracking
                          </span>
                        )}
                        {!navigator.geolocation && (
                          <span className="text-amber-600">⚠️ Geolocation unavailable on this device</span>
                        )}
                      </div>

                      {/* Route estimate */}
                      {(route || trip.routeDistanceKm) && (
                        <div className="p-3 bg-gray-50 rounded-xl text-xs">
                          <p className="font-semibold text-navy-800 mb-1">Estimated remaining route</p>
                          {route?.distanceKm != null && (
                            <p className="text-navy-600">
                              {route.distanceKm.toFixed(1)} km · {Math.round(route.durationMinutes || 0)} min
                              {route.eta ? ` · ETA ${fmtDate(route.eta)}` : ''}
                              {route.estimatedCost != null ? ` · est. ₹${Number(route.estimatedCost).toLocaleString('en-IN')}` : ''}
                            </p>
                          )}
                          {!route && trip.routeDistanceKm != null && (
                            <p className="text-navy-600">
                              {trip.routeDistanceKm.toFixed(1)} km · {Math.round(trip.routeDurationMinutes || 0)} min
                              {trip.routeEstimatedCost != null ? ` · est. ₹${Number(trip.routeEstimatedCost).toLocaleString('en-IN')}` : ''}
                            </p>
                          )}
                          {route?.caveat && <p className="text-navy-400 mt-0.5 italic">{route.caveat}</p>}
                        </div>
                      )}

                      {/* Controls */}
                      <div className="flex flex-wrap gap-2">
                        {!active && !completed && (
                          <button
                            onClick={() => run(trip, 'start', trip.trackingStatus === 'PAUSED' ? resumeTracking : startTracking)}
                            disabled={busy.start}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-60"
                          >
                            {busy.start ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            {trip.trackingStatus === 'PAUSED' ? 'Resume Trip' : 'Start Delivery'}
                          </button>
                        )}
                        {active && (
                          <>
                            <button
                              onClick={() => shareLocation(trip)}
                              disabled={busy.gps}
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition disabled:opacity-60"
                            >
                              {busy.gps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                              Share My Location
                            </button>
                            <button
                              onClick={() => run(trip, 'pause', pauseTracking)}
                              disabled={busy.pause}
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition disabled:opacity-60"
                            >
                              <Pause className="w-4 h-4" /> Pause
                            </button>
                            <button
                              onClick={() => run(trip, 'complete', completeTracking)}
                              disabled={busy.complete}
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy-700 text-white text-sm font-semibold rounded-xl hover:bg-navy-600 transition disabled:opacity-60"
                            >
                              <CheckCircle className="w-4 h-4" /> Complete Trip
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => refreshRoute(trip)}
                          disabled={busy.route}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-navy-200 text-navy-700 text-sm font-semibold rounded-xl hover:bg-navy-50 transition disabled:opacity-60"
                        >
                          <RefreshCw className={`w-4 h-4 ${busy.route ? 'animate-spin' : ''}`} /> Refresh Route
                        </button>
                        <Link
                          to={`/deal/${trip.dealId}`}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-navy-200 text-navy-700 text-sm font-semibold rounded-xl hover:bg-navy-50 transition"
                        >
                          View Deal
                        </Link>
                      </div>

                      {lowData && (
                        <p className="text-[11px] text-navy-400">
                          📶 Low Data Mode — updates are slower and maps never auto-load. Share location manually when needed.
                        </p>
                      )}
                    </div>
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