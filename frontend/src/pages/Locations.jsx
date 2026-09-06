import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { getUserLocations } from '../api/userApi';
import { isLowDataMode, onLowDataModeChange } from '../utils/lowDataMode';
import { Loader2, MapPin, Radio, Users, Store, Navigation, RefreshCw } from 'lucide-react';

const formatTime = (iso) => {
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
  return formatTime(iso);
};

/** Colored pin with a pulsing ring when live. */
function makeIcon(color, live) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:22px;height:22px">
      ${live ? '<span class="m2m-live-ring" style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ' + color + ';opacity:.6;animation:m2mPulse 1.6s ease-out infinite"></span>' : ''}
      <div style="width:22px;height:22px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1">${live ? '🟢' : ''}</div>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

const FARMER_COLOR = '#15803d'; // green
const BUSINESS_COLOR = '#1d4ed8'; // blue

export default function Locations() {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(!isLowDataMode());
  const lowDataRef = useRef(isLowDataMode());

  const load = useCallback(async () => {
    try {
      const data = await getUserLocations();
      setLocations(data || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Light polling for live positions (longer in low data mode)
  useEffect(() => {
    const iv = setInterval(() => {
      if (isLowDataMode()) return;
      load();
    }, 20000);
    const off = onLowDataModeChange((enabled) => { lowDataRef.current = enabled; });
    return () => { clearInterval(iv); off(); };
  }, [load]);

  const isFarmer = user?.role === 'FARMER';
  const sidebarRole = isFarmer ? 'farmer' : 'business';

  const filtered = locations.filter((l) => filter === 'ALL' || l.role === filter);
  const farmers = filtered.filter((l) => l.role === 'FARMER');
  const businesses = filtered.filter((l) => l.role === 'BUSINESS');
  const liveCount = filtered.filter((l) => l.live).length;

  // Centre on India if nothing else; fitBounds handled by a child component
  const center = [20.5937, 78.9629];

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role={sidebarRole} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-6xl mx-auto">
          {/* ── Header ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-mustard-600" /> Live Locations
              </h1>
              <p className="text-sm text-navy-500 mt-1">
                Farmers &amp; businesses on the Mitti2Market network
                {liveCount > 0 && <span className="ml-2 text-emerald-600 font-semibold">🟢 {liveCount} live now</span>}
              </p>
            </div>
            <button onClick={load} className="px-3 py-2 bg-white border border-navy-100 rounded-xl text-xs font-semibold text-navy-700 hover:bg-gray-50 transition inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* ── Filters ── */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {[['ALL', 'All', Users], ['FARMER', `Farmers (${locations.filter(l => l.role === 'FARMER').length})`, Users], ['BUSINESS', `Businesses (${locations.filter(l => l.role === 'BUSINESS').length})`, Store]].map(([key, label, Icon]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 ${filter === key ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 border border-navy-100 hover:bg-gray-50'}`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
            {!showMap && (
              <button onClick={() => setShowMap(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-mustard-50 text-mustard-800 border border-mustard-200 hover:bg-mustard-100 transition inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Load Map
              </button>
            )}
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading locations...</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-5 gap-5">
              {/* ── Map (loaded on demand — Low Data Mode friendly) ── */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
                  {showMap ? (
                    <MapContainer center={center} zoom={5} scrollWheelZoom={false} style={{ height: '520px', width: '100%' }}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {filtered.filter(l => l.latitude != null && l.longitude != null).map((l) => (
                        <Marker key={l.id} position={[l.latitude, l.longitude]}
                          icon={makeIcon(l.role === 'FARMER' ? FARMER_COLOR : BUSINESS_COLOR, l.live)}>
                          <Popup>
                            <div className="min-w-[180px]">
                              <p className="font-bold text-sm">{l.name}{l.role === 'BUSINESS' && l.organizationName ? ` · ${l.organizationName}` : ''}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{l.role === 'FARMER' ? '👨🌾 Farmer' : '🏪 Business'} · {l.location || 'Location not set'}</p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {l.locationAccuracy === 'EXACT' ? '📍 Exact shared location' : '📍 Approximate (city-level)'}
                              </p>
                              {l.live ? (
                                <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                                  🟢 Live · {ago(l.liveLastUpdate)}
                                  {l.liveTrackingId && <span className="text-gray-400 font-normal"> · {l.liveTrackingId}</span>}
                                </p>
                              ) : (
                                <p className="text-[11px] text-gray-400 mt-1">Not in an active trip</p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  ) : (
                    <div className="h-72 flex flex-col items-center justify-center text-center p-6">
                      <MapPin className="w-10 h-10 text-mustard-400 mb-3" />
                      <p className="text-sm font-semibold text-navy-900 mb-1">Map not loaded</p>
                      <p className="text-xs text-gray-500 mb-4">Low Data Mode is on — the map loads only when you ask for it.</p>
                      <button onClick={() => setShowMap(true)}
                        className="px-4 py-2 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition">
                        Load Map
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-700" /> Farmer</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-700" /> Business</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 0 4px rgba(16,185,129,.25)' }} /> Live tracking</span>
                    <span className="ml-auto text-[10px] text-gray-400">OpenStreetMap · tiles load on demand</span>
                  </div>
                </div>
              </div>

              {/* ── List ── */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-4">
                  <p className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-3 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-500" /> Farmers ({farmers.length})
                  </p>
                  {farmers.length === 0 ? <p className="text-sm text-gray-500">No farmers found.</p> : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {farmers.map((l) => <LocationRow key={l.id} l={l} />)}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-4">
                  <p className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-3 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-500" /> Businesses ({businesses.length})
                  </p>
                  {businesses.length === 0 ? <p className="text-sm text-gray-500">No businesses found.</p> : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {businesses.map((l) => <LocationRow key={l.id} l={l} />)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Pulse animation for live markers */}
      <style>{`
        @keyframes m2mPulse {
          0% { transform: scale(.6); opacity: .8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function LocationRow({ l }) {
  return (
    <div className={`p-2.5 rounded-xl border text-sm ${l.live ? 'bg-emerald-50/60 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-navy-900 truncate">
          {l.role === 'FARMER' ? '👨🌾' : '🏪'} {l.name}
        </p>
        {l.live ? (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <Radio className="w-3 h-3" /> LIVE
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">offline</span>
        )}
      </div>
      <p className="text-[11px] text-gray-500 mt-0.5">{l.location || 'Location not set'}</p>
      <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
        <span>{l.locationAccuracy === 'EXACT' ? 'exact location' : 'approx. city'}</span>
        {l.live && l.liveLastUpdate && <span>🟢 {ago(l.liveLastUpdate)}</span>}
      </div>
    </div>
  );
}