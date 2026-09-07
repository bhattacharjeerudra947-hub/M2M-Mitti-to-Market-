import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, Navigation, Truck, Clock, IndianRupee, Radio, Loader2,
  Play, Pause, Square, WifiOff, RefreshCw, Map as MapIcon, ShieldAlert
} from 'lucide-react';
import {
  startTracking, pauseTracking, resumeTracking, completeTracking,
  updateLiveLocation, getRouteEstimate, getLocationHistory
} from '../api/dealApi';
import { isLowDataMode, onLowDataModeChange } from '../utils/lowDataMode';
import { queueGpsPoint, flushGpsQueue, countQueuedGpsPoints } from '../utils/gpsQueue';

const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const formatTime = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); } catch { return '—'; }
};
const formatDateTime = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch { return '—'; }
};
const ago = (iso) => {
  if (!iso) return null;
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  return formatDateTime(iso);
};

const TRACKING_LABELS = {
  NOT_STARTED: { text: 'Not Started', cls: 'bg-gray-100 text-gray-600' },
  ACTIVE: { text: '🟢 Live Tracking Active', cls: 'bg-emerald-50 text-emerald-700' },
  PAUSED: { text: '⏸ Tracking Paused', cls: 'bg-amber-50 text-amber-700' },
  COMPLETED: { text: '✅ Trip Completed', cls: 'bg-blue-50 text-blue-700' },
};

export default function LogisticsTracking({ logistics, deal, onUpdate }) {
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [queued, setQueued] = useState(0);
  const [gpsBusy, setGpsBusy] = useState(false);
  const lowDataRef = useRef(isLowDataMode());
  const mounted = useRef(true);

  const logisticsId = logistics?.id;

  const refreshQueued = useCallback(async () => {
    setQueued(await countQueuedGpsPoints());
  }, []);

  const refreshRoute = useCallback(async () => {
    if (!logisticsId) return;
    try {
      const r = await getRouteEstimate(logisticsId);
      if (mounted.current) setRoute(r);
    } catch (e) {
      if (mounted.current) setError(e.message || 'Failed to load route estimate');
    }
  }, [logisticsId]);

  const toggleHistory = async () => {
    if (!logisticsId) return;
    if (history.length > 0) { setShowHistory(!showHistory); return; }
    try {
      const h = await getLocationHistory(logisticsId);
      setHistory(h || []);
      setShowHistory(true);
    } catch (e) { setError(e.message || 'Failed to load location history'); }
  };

  // Poll route/ETA while tracking is active (lightweight — no map tiles)
  useEffect(() => {
    if (!logisticsId) return;
    refreshRoute();
    const interval = setInterval(() => {
      if (isLowDataMode()) return; // low-data: only refresh on demand / slower
      if (logistics?.trackingStatus === 'ACTIVE') refreshRoute();
    }, 15000);
    return () => clearInterval(interval);
  }, [logisticsId, logistics?.trackingStatus, refreshRoute]);

  // Low-data mode live switching
  useEffect(() => {
    mounted.current = true;
    const off = onLowDataModeChange((enabled) => { lowDataRef.current = enabled; });
    refreshQueued();
    return () => { mounted.current = false; off(); };
  }, [refreshQueued]);

  // Flush queued points when the browser comes back online
  useEffect(() => {
    const onOnline = async () => {
      const n = await flushGpsQueue(async (p) => {
        await updateLiveLocation(p.logisticsId, {
          latitude: p.latitude, longitude: p.longitude,
          accuracy: p.accuracy, speed: p.speed, heading: p.heading,
        });
      });
      if (n > 0) { refreshQueued(); refreshRoute(); onUpdate?.(); }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [refreshQueued, refreshRoute, onUpdate]);

  const handleTrackingAction = async (action, fn) => {
    if (!logisticsId) return;
    setBusy(action); setError('');
    try {
      await fn(logisticsId);
      await onUpdate?.();
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  /** Post a location — queues it offline when the network is down. */
  const postLocation = async (lat, lng, extras = {}) => {
    const payload = { latitude: lat, longitude: lng, ...extras, recordedAt: new Date().toISOString() };
    try {
      await updateLiveLocation(logisticsId, payload);
      await onUpdate?.();
      refreshRoute();
    } catch (e) {
      if (e.status === 0) {
        // Offline / network error → queue locally, show clear staleness
        const ok = await queueGpsPoint({
          logisticsId, latitude: lat, longitude: lng,
          accuracy: extras.accuracy, speed: extras.speed, heading: extras.heading,
          recordedAt: payload.recordedAt,
        });
        if (ok) {
          refreshQueued();
          throw new Error('Offline — location saved on this device and will sync automatically');
        }
      }
      throw e;
    }
  };

  const useCurrentLocation = async () => {
    if (!logisticsId) return;
    setGpsBusy(true); setError(''); setShowManual(false);
    try {
      if (!navigator.geolocation) throw new Error('Geolocation is not available on this device');
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 15000 });
      });
      const { latitude, longitude, accuracy } = pos.coords;
      await postLocation(latitude, longitude, {
        accuracy: Math.round(accuracy || 0),
        speed: pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : 0, // m/s → km/h
        heading: pos.coords.heading != null ? Math.round(pos.coords.heading) : 0,
      });
    } catch (e) {
      setError(e.message || 'Could not get your location — try manual entry.');
      setShowManual(true);
    } finally {
      setGpsBusy(false);
    }
  };

  const submitManual = async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      setError('Enter valid coordinates (lat −90..90, lng −180..180)');
      return;
    }
    setError('');
    try {
      await postLocation(lat, lng);
      setShowManual(false); setManualLat(''); setManualLng('');
    } catch (e) { setError(e.message); }
  };

  const tracking = TRACKING_LABELS[logistics?.trackingStatus] || TRACKING_LABELS.NOT_STARTED;
  const trackingActive = logistics?.trackingStatus === 'ACTIVE';
  const canTrack = ['LOCKED', 'LOGISTICS_PENDING', 'LOGISTICS_ASSIGNED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(deal?.status);
  const showMapBtn = !isLowDataMode() || showMap; // low-data: map only when explicitly requested

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Pickup → Delivery ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="text-[10px] text-gray-500 uppercase font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3 text-mustard-600" /> Pickup
          </p>
          <p className="text-sm font-semibold text-navy-900 mt-1">{logistics?.pickupLocation || deal?.pickupLocation || '—'}</p>
          {logistics?.pickupLatitude != null && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {Number(logistics.pickupLatitude).toFixed(4)}, {Number(logistics.pickupLongitude).toFixed(4)}
            </p>
          )}
        </div>
        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="text-[10px] text-gray-500 uppercase font-medium flex items-center gap-1">
            <Navigation className="w-3 h-3 text-blue-600" /> Delivery
          </p>
          <p className="text-sm font-semibold text-navy-900 mt-1">{logistics?.deliveryLocation || deal?.deliveryLocation || '—'}</p>
          {logistics?.deliveryLatitude != null && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {Number(logistics.deliveryLatitude).toFixed(4)}, {Number(logistics.deliveryLongitude).toFixed(4)}
            </p>
          )}
        </div>
      </div>

      {/* ── Route estimate ── */}
      <div className="rounded-xl border border-navy-100 p-3">
        <p className="text-[10px] text-gray-500 uppercase font-medium mb-2 flex items-center gap-1">
          <Truck className="w-3 h-3 text-navy-700" /> Route Estimate
        </p>
        {routeLoading && !route ? (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating route…
          </div>
        ) : route ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-gray-500">Distance</p>
              <p className="text-sm font-bold text-navy-900">{route.distanceKm != null ? `${route.distanceKm} km` : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">Travel time</p>
              <p className="text-sm font-bold text-navy-900">
                {route.durationMinutes != null
                  ? `${Math.floor(route.durationMinutes / 60)}h ${Math.round(route.durationMinutes % 60)}m`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">Est. cost</p>
              <p className="text-sm font-bold text-emerald-700">{formatINR(route.estimatedCost)}</p>
            </div>
            {route.eta && (
              <div className="col-span-3 pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-gray-600">ETA</span>
                <span className="font-bold text-navy-900">{formatTime(route.eta)}</span>
                {logistics?.lastLocationUpdate && (
                  <span className="text-gray-400">· updated {ago(logistics.lastLocationUpdate)}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No route estimate available (coordinates not set).</p>
        )}
        {(route?.caveat || logistics?.routeCaveat) && (
          <p className="mt-2 text-[10px] text-gray-400 italic">* {(route?.caveat || logistics?.routeCaveat)}</p>
        )}

        {route?.alternative && (
          <div className="mt-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] text-gray-500 font-semibold uppercase mb-1">Route Optimization</p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-[9px] text-gray-400 uppercase">Recommended</p>
                <p className="font-bold text-navy-900">{route.distanceKm} km</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase">Alternative</p>
                <p className="font-bold text-navy-900">{route.alternative.distanceKm} km</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase">Est. saving</p>
                <p className="font-bold text-emerald-600">{formatINR(route.alternative.savings)}</p>
              </div>
            </div>
            <p className="mt-1.5 text-[9px] text-gray-400 italic">{route.alternative.label} — shorter, flatter routing could cost less.</p>
          </div>
        )}

        {showMapBtn && (
          <button
            onClick={() => setShowMap(!showMap)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy-900 transition"
          >
            <MapIcon className="w-3.5 h-3.5" /> {showMap ? 'Hide Map' : 'View Route Map'}
          </button>
        )}
        {showMap && logistics?.deliveryLatitude != null && (
          <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
            <iframe
              title="Route map"
              loading="lazy"
              className="w-full h-48"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${logistics.deliveryLongitude - 0.5}%2C${logistics.deliveryLatitude - 0.5}%2C${logistics.deliveryLongitude + 0.5}%2C${logistics.deliveryLatitude + 0.5}&layer=mapnik&marker=${logistics.deliveryLatitude}%2C${logistics.deliveryLongitude}`}
            />
            <p className="text-[10px] text-gray-400 px-2 py-1 bg-gray-50">OpenStreetMap · loaded on demand (never auto-loads)</p>
          </div>
        )}
      </div>

      {/* ── Live tracking session ── */}
      <div className="rounded-xl border border-navy-100 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-gray-500 uppercase font-medium flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-600" /> Live Tracking
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tracking.cls}`}>{tracking.text}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-gray-400" />
            {logistics?.lastLocationUpdate
              ? <>Last location: <span className="font-semibold text-navy-900">{formatDateTime(logistics.lastLocationUpdate)}</span> ({ago(logistics.lastLocationUpdate)})</>
              : 'No location shared yet'}
          </span>
          {queued > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
              <WifiOff className="w-3.5 h-3.5" /> {queued} queued offline
            </span>
          )}
        </div>

        {logistics?.lastAccuracy != null && logistics.lastAccuracy > 100 && (
          <p className="mt-1.5 text-[10px] text-amber-600 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Location accuracy is low (±{Math.round(logistics.lastAccuracy)} m) — the position may not be exact.
          </p>
        )}

        {logistics?.lastLocationUpdate && (
          <button onClick={toggleHistory} className="mt-2 text-[10px] font-semibold text-navy-600 hover:text-navy-900 transition inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {showHistory ? 'Hide' : 'View'} trip location history ({history.length || '…'})
          </button>
        )}
        {showHistory && (
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1 pl-3 border-l-2 border-gray-200">
            {history.length === 0 && <p className="text-[10px] text-gray-400">No GPS points recorded yet.</p>}
            {history.map((p, i) => (
              <div key={i} className="text-[10px] text-gray-500 flex justify-between gap-2">
                <span>{Number(p.latitude).toFixed(5)}, {Number(p.longitude).toFixed(5)}</span>
                <span className="text-gray-400">{formatTime(p.timestamp)}</span>
              </div>
            ))}
          </div>
        )}

        {canTrack && (
          <div className="mt-3 flex flex-wrap gap-2">
            {!trackingActive && logistics?.trackingStatus !== 'COMPLETED' && (
              <button
                onClick={() => handleTrackingAction('start', startTracking)}
                disabled={busy === 'start'}
                className="px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" /> {busy === 'start' ? 'Starting…' : 'Start Delivery'}
              </button>
            )}
            {trackingActive && (
              <>
                <button
                  onClick={useCurrentLocation}
                  disabled={gpsBusy}
                  className="px-3 py-2 bg-navy-900 text-white text-xs font-semibold rounded-lg hover:bg-navy-800 transition inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {gpsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                  Share My Location
                </button>
                <button
                  onClick={() => setShowManual(!showManual)}
                  className="px-3 py-2 bg-gray-100 text-navy-800 text-xs font-semibold rounded-lg hover:bg-gray-200 transition"
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => handleTrackingAction('pause', pauseTracking)}
                  disabled={busy === 'pause'}
                  className="px-3 py-2 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100 transition inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              </>
            )}
            {logistics?.trackingStatus === 'PAUSED' && (
              <button
                onClick={() => handleTrackingAction('resume', resumeTracking)}
                disabled={busy === 'resume'}
                className="px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" /> Resume
              </button>
            )}
            {trackingActive && (
              <button
                onClick={() => handleTrackingAction('complete', completeTracking)}
                disabled={busy === 'complete'}
                className="px-3 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5" /> Complete Trip
              </button>
            )}
          </div>
        )}

        {showManual && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2">
            <p className="text-[10px] text-gray-500">Manual location (e.g. from another GPS app)</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="Latitude e.g. 22.5726"
                className="px-3 py-2 bg-white border border-navy-100 rounded-lg text-sm" />
              <input value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="Longitude e.g. 88.3639"
                className="px-3 py-2 bg-white border border-navy-100 rounded-lg text-sm" />
            </div>
            <button onClick={submitManual} className="px-3 py-2 bg-navy-900 text-white text-xs font-semibold rounded-lg hover:bg-navy-800 transition">
              Submit Location
            </button>
          </div>
        )}

        {isLowDataMode() && trackingActive && (
          <p className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Low Data Mode — tracking refreshes less often and maps only load when requested.
          </p>
        )}
        {!navigator.geolocation && (
          <p className="mt-2 text-[10px] text-amber-600">Geolocation unavailable — manual entry is always supported.</p>
        )}
      </div>
    </div>
  );
}