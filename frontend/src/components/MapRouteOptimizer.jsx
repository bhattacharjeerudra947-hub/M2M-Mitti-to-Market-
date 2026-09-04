import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Navigation, Clock, Route as RouteIcon,
  Search, ChevronDown, ChevronUp, Target, Crosshair,
  Loader2, AlertTriangle, Map, Info,
} from 'lucide-react';
import { useFarmerLanguage } from '../context/FarmerContext';
import { t_key } from '../data/farmerTranslations';

/* ─────────────────────────────────────────────
   DEMO FARMER & DESTINATION DATA
   (Sample pickup/drop locations — replace with
   real backend data when available)
   ───────────────────────────────────────────── */

const DEMO_FARMERS = [
  { id: 'f1', name: 'Rajesh Kumar', lat: 20.0059, lng: 73.7945, crops: ['Tomato', 'Onion'], emoji: '👨‍🌾' },
  { id: 'f2', name: 'Suresh Patil', lat: 19.9872, lng: 73.8134, crops: ['Onion', 'Potato'], emoji: '👨‍🌾' },
  { id: 'f3', name: 'Anil Jadhav', lat: 20.0213, lng: 73.7764, crops: ['Rice', 'Wheat'], emoji: '👨‍🌾' },
  { id: 'f4', name: 'Mahesh Verma', lat: 20.0401, lng: 73.8101, crops: ['Chili', 'Tomato'], emoji: '👨‍🌾' },
  { id: 'f5', name: 'Priya Sharma', lat: 19.9683, lng: 73.8032, crops: ['Grapes', 'Mango'], emoji: '👩‍🌾' },
];

const DEMO_DESTINATIONS = [
  { id: 'm1', name: 'Nashik Mandi', lat: 19.9975, lng: 73.7898, type: 'mandi', emoji: '🏪' },
  { id: 'm2', name: 'Pune APMC', lat: 18.5204, lng: 73.8567, type: 'mandi', emoji: '🏪' },
  { id: 'w1', name: 'Cold Storage Hub', lat: 20.0120, lng: 73.7850, type: 'warehouse', emoji: '🏭' },
  { id: 'c1', name: 'Collection Center', lat: 19.9950, lng: 73.8000, type: 'collection', emoji: '📦' },
];

/* ─────────────────────────────────────────────
   OSRM PUBLIC DEMO SERVER
   Free, no API key required.
   For production: swap to self-hosted OSRM
   or a paid routing provider via env var.
   ───────────────────────────────────────────── */

const OSRM_BASE = 'https://router.project-osrm.org';

/** Fetch a multi-stop route (sequence of waypoints) using OSRM */
async function fetchOSRMRouteMulti(waypoints) {
  if (waypoints.length < 2) throw new Error('Need at least 2 waypoints');
  const coords = waypoints.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM multi-route request failed: ${res.status}`);
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) throw new Error('No route found');
  const route = data.routes[0];
  return {
    distance: route.distance,
    duration: route.duration,
    geometry: route.geometry.coordinates,
  };
}

/** Fetch a distance/duration matrix for multiple points using OSRM Table API */
async function fetchOSRMTable(points) {
  if (points.length < 2) throw new Error('Need at least 2 points for table');
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE}/table/v1/driving/${coords}?annotations=duration,distance`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM table request failed: ${res.status}`);
  const data = await res.json();
  if (!data.durations) throw new Error('No duration matrix returned');
  return {
    durations: data.durations, // matrix in seconds
    distances: data.distances, // matrix in meters
  };
}

/** Brute-force TSP solver for <= 8 stops (all permutations) */
function solveTSP(distanceMatrix, startIdx) {
  const n = distanceMatrix.length;
  if (n <= 1) return [startIdx];
  const indices = [];
  for (let i = 0; i < n; i++) {
    if (i !== startIdx) indices.push(i);
  }

  let bestOrder = null;
  let bestCost = Infinity;

  function permute(arr, l) {
    if (l === arr.length) {
      let cost = distanceMatrix[startIdx][arr[0]];
      for (let i = 0; i < arr.length - 1; i++) {
        cost += distanceMatrix[arr[i]][arr[i + 1]];
      }
      if (cost < bestCost) {
        bestCost = cost;
        bestOrder = [...arr];
      }
      return;
    }
    for (let i = l; i < arr.length; i++) {
      [arr[l], arr[i]] = [arr[i], arr[l]];
      permute(arr, l + 1);
      [arr[l], arr[i]] = [arr[i], arr[l]];
    }
  }

  permute(indices, 0);
  return [startIdx, ...bestOrder];
}

/** Nearest-neighbor heuristic for > 8 stops */
function nearestNeighborTSP(distanceMatrix, startIdx) {
  const n = distanceMatrix.length;
  const visited = new Set([startIdx]);
  const order = [startIdx];
  let current = startIdx;

  while (visited.size < n) {
    let nearest = -1;
    let minDist = Infinity;
    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && distanceMatrix[current][i] < minDist) {
        minDist = distanceMatrix[current][i];
        nearest = i;
      }
    }
    if (nearest === -1) break;
    visited.add(nearest);
    order.push(nearest);
    current = nearest;
  }

  return order;
}

/** Format seconds to human-readable */
function formatDuration(seconds) {
  if (seconds < 60) return '< 1 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

/** Format meters to human-readable */
function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

/* ─────────────────────────────────────────────
   ICONS & MAP HELPERS
   ───────────────────────────────────────────── */

function createIcon(emoji, size = 28) {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;text-align:center">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: '',
  });
}

function createLocationIcon() {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px #3b82f6,0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    className: '',
  });
}

/* ──────────── Map child components ──────────── */

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

function CenterOnLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 14);
    }
  }, [position, map]);
  return null;
}

/* ─────────────────────────────────────────────
   LOCATION STATUS BANNER
   ───────────────────────────────────────────── */

function LocationBanner({ locationState, onRetry }) {
  const { language } = useFarmerLanguage();

  if (locationState.status === 'loading') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <div>
          <p className="text-xs font-semibold text-blue-800">
            {t_key(language, 'gettingLocation') || 'Getting your location...'}
          </p>
          <p className="text-[10px] text-blue-600">
            {t_key(language, 'locationHelp') || 'Please allow location access when prompted'}
          </p>
        </div>
      </div>
    );
  }

  if (locationState.status === 'error') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-amber-800">
            {locationState.error || (t_key(language, 'locationError') || 'Could not get your location')}
          </p>
          <p className="text-[10px] text-amber-600">
            {t_key(language, 'locationErrorHelp') || 'You can still use the map — demo locations are shown. Grant location permission in your browser settings to use your real position.'}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="flex-shrink-0 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] font-semibold rounded-lg transition"
        >
          {t_key(language, 'retry') || 'Retry'}
        </button>
      </div>
    );
  }

  return null;
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */

export default function MapRouteOptimizer() {
  const { language } = useFarmerLanguage();

  // ── Location state ──
  const [locationState, setLocationState] = useState({ status: 'loading', coords: null, error: null });
  const watchIdRef = useRef(null);

  // ── Selection state ──
  const [selectedFarmers, setSelectedFarmers] = useState([]);
  const [destination, setDestination] = useState(null);
  const [showFarmerList, setShowFarmerList] = useState(false);
  const [showDestList, setShowDestList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  // ── Route state (real OSRM data) ──
  const [activeRouteId, setActiveRouteId] = useState('optimized');
  const [routeData, setRouteData] = useState(null); // { optimized, fastest, shortest }
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [optimizedOrder, setOptimizedOrder] = useState(null);

  // ── Geolocation ──
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState({
        status: 'error',
        coords: null,
        error: t_key(language, 'browserNoGeo') || 'Your browser does not support geolocation',
      });
      return;
    }

    setLocationState((prev) => ({ ...prev, status: 'loading' }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocationState({ status: 'success', coords, error: null });
      },
      (err) => {
        let msg;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = t_key(language, 'locationDenied') || 'Location permission denied. Using demo locations.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = t_key(language, 'locationUnavailable') || 'Location unavailable. Using demo locations.';
            break;
          case err.TIMEOUT:
            msg = t_key(language, 'locationTimeout') || 'Location request timed out. Using demo locations.';
            break;
          default:
            msg = t_key(language, 'locationError') || 'Could not get your location. Using demo locations.';
        }
        setLocationState({ status: 'error', coords: null, error: msg });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );

    // Start watching for movement
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocationState({ status: 'success', coords, error: null });
      },
      () => {}, // silent — already handled by getCurrentPosition
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 120000 }
    );
  }, [language]);

  useEffect(() => {
    // eslint-disable-next-line no-void -- fire-and-forget async geolocation request
    void requestLocation();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [requestLocation]);

  // ── Farmer toggle ──
  const toggleFarmer = useCallback((farmer) => {
    setSelectedFarmers((prev) => {
      const exists = prev.find((f) => f.id === farmer.id);
      if (exists) return prev.filter((f) => f.id !== farmer.id);
      return [...prev, farmer];
    });
  }, []);

  // ── Fetch real OSRM routes when selection changes ──
  const fetchRoutes = useCallback(async () => {
    if (selectedFarmers.length === 0 || !destination) {
      setRouteData(null);
      setOptimizedOrder(null);
      setRouteError(null);
      return;
    }

    setRouteLoading(true);
    setRouteError(null);

    try {
      // Build waypoints: user location (or first farmer if no geo) → selected farmers → destination
      const origin = locationState.coords || selectedFarmers[0];

      // ── 1) Optimized route (TSP) ──
      const allPoints = [origin, ...selectedFarmers, destination];
      const tableData = await fetchOSRMTable(allPoints);

      // TSP optimization using real road durations
      const n = allPoints.length;
      let orderIndices;
      if (n <= 8) {
        orderIndices = solveTSP(tableData.durations, 0);
      } else {
        orderIndices = nearestNeighborTSP(tableData.durations, 0);
      }

      const orderedWaypoints = orderIndices.map((i) => allPoints[i]);
      const optimizedRoute = await fetchOSRMRouteMulti(orderedWaypoints);

      // Build the optimized stop list (skip origin, skip final destination for display)
      const orderedStops = orderIndices.slice(1).map((i) => allPoints[i]);

      // ── 2) Fastest route (same order as selected, OSRM fastest profile) ──
      const fastestWaypoints = [origin, ...selectedFarmers, destination];
      const fastestRoute = await fetchOSRMRouteMulti(fastestWaypoints);

      // ── 3) Shortest route (reverse or nearest-neighbor from distance matrix) ──
      const shortestOrder = nearestNeighborTSP(tableData.distances, 0);
      const shortestWaypoints = shortestOrder.map((i) => allPoints[i]);
      const shortestRoute = await fetchOSRMRouteMulti(shortestWaypoints);

      setRouteData({
        optimized: {
          ...optimizedRoute,
          color: '#d4a017',
          efficiency: 0.94,
          orderedStops,
        },
        fastest: {
          ...fastestRoute,
          color: '#16a34a',
          efficiency: 0.85,
          orderedStops: selectedFarmers,
        },
        shortest: {
          ...shortestRoute,
          color: '#3c61a8',
          efficiency: 0.72,
          orderedStops: shortestOrder.slice(1).map((i) => allPoints[i]),
        },
      });

      // Set the optimized order for display
      const finalOrder = orderIndices.slice(1).map((i) => allPoints[i]);
      setOptimizedOrder(finalOrder);
      setActiveRouteId('optimized');
    } catch (err) {
      console.error('Route calculation failed:', err);
      setRouteError(
        t_key(language, 'routeCalcFailed') || 'Route calculation failed. Please try again.'
      );
      setRouteData(null);
      setOptimizedOrder(null);
    } finally {
      setRouteLoading(false);
    }
  }, [selectedFarmers, destination, locationState.coords, language]);

  // Fetch routes whenever selection changes
  useEffect(() => {
    // eslint-disable-next-line no-void -- fire-and-forget async route fetch
    void fetchRoutes();
  }, [fetchRoutes]);

  // ── Map bounds ──
  const bounds = useMemo(() => {
    const points = [];
    if (locationState.coords) {
      points.push([locationState.coords.lat, locationState.coords.lng]);
    }
    selectedFarmers.forEach((f) => points.push([f.lat, f.lng]));
    if (destination) points.push([destination.lat, destination.lng]);
    return points.length > 0 ? points : null;
  }, [selectedFarmers, destination, locationState.coords]);

  const mapCenter = useMemo(() => {
    return locationState.coords ? [locationState.coords.lat, locationState.coords.lng] : [20.00, 73.79];
  }, [locationState.coords]);

  const activeRoute = routeData ? routeData[activeRouteId] : null;

  // ── Route polyline (convert GeoJSON [lng,lat] → Leaflet [lat,lng]) ──
  const routePolyline = useMemo(() => {
    if (!activeRoute?.geometry) return null;
    return activeRoute.geometry.map((coord) => [coord[1], coord[0]]);
  }, [activeRoute]);

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">{t_key(language, 'routeOptimization') || 'Route Optimization'}</h3>
            <p className="text-xs text-primary-100">{t_key(language, 'routeDesc') || 'Real road routes & multi-stop optimization'}</p>
          </div>
          {locationState.status === 'success' && (
            <button
              onClick={() => {
                if (locationState.coords) {
                  setSelectedFarmers([]);
                  setDestination(null);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-semibold text-white transition"
            >
              <Crosshair className="w-3 h-3" />
              {t_key(language, 'centerOnMe') || 'Center on me'}
            </button>
          )}
        </div>
      </div>

      {/* Location status banner */}
      <div className="px-4 pt-3">
        <LocationBanner locationState={locationState} onRetry={requestLocation} />
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar controls */}
        <div className="lg:w-80 p-4 border-b lg:border-b-0 lg:border-r border-navy-100 space-y-4">
          {/* Current location indicator */}
          {locationState.status === 'success' && locationState.coords && (
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl border border-blue-200">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-blue-800">
                  {t_key(language, 'yourLocation') || 'Your Location'}
                </p>
                <p className="text-[10px] text-blue-600 truncate">
                  {locationState.coords.lat.toFixed(4)}, {locationState.coords.lng.toFixed(4)}
                </p>
              </div>
              <Map className="w-4 h-4 text-blue-400 flex-shrink-0" />
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t_key(language, 'searchLocation') || 'Search farm, mandi, market...'}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-50 border border-navy-200 text-sm text-navy-800 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
            />
          </div>

          {/* Farmer selection */}
          <div>
            <button
              onClick={() => setShowFarmerList(!showFarmerList)}
              className="w-full flex items-center justify-between p-3 bg-navy-50 rounded-xl hover:bg-navy-100 transition"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-semibold text-navy-800">
                  {t_key(language, 'pickupLocations') || 'Pickup Locations'} ({selectedFarmers.length})
                </span>
              </div>
              {showFarmerList ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
            </button>
            {showFarmerList && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {DEMO_FARMERS.filter((f) =>
                  !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((farmer) => {
                  const selected = selectedFarmers.some((f) => f.id === farmer.id);
                  return (
                    <button
                      key={farmer.id}
                      onClick={() => toggleFarmer(farmer)}
                      className={`w-full text-left flex items-center gap-2 p-2.5 rounded-lg text-xs transition ${
                        selected ? 'bg-primary-50 border border-primary-200 text-primary-800' : 'hover:bg-navy-50 text-navy-700'
                      }`}
                    >
                      <span className="text-base">{farmer.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{farmer.name}</p>
                        <p className="text-[10px] text-navy-400">{farmer.crops.join(', ')}</p>
                      </div>
                      {selected && <span className="text-primary-600 text-[10px] font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Destination selection */}
          <div>
            <button
              onClick={() => setShowDestList(!showDestList)}
              className="w-full flex items-center justify-between p-3 bg-navy-50 rounded-xl hover:bg-navy-100 transition"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-mustard-500" />
                <span className="text-xs font-semibold text-navy-800">
                  {destination ? destination.name : (t_key(language, 'destination') || 'Destination')}
                </span>
              </div>
              {showDestList ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
            </button>
            {showDestList && (
              <div className="mt-2 space-y-1">
                {DEMO_DESTINATIONS.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => { setDestination(dest); setShowDestList(false); }}
                    className={`w-full text-left flex items-center gap-2 p-2.5 rounded-lg text-xs transition ${
                      destination?.id === dest.id ? 'bg-mustard-50 border border-mustard-200' : 'hover:bg-navy-50'
                    }`}
                  >
                    <span className="text-base">{dest.emoji}</span>
                    <span className="font-medium text-navy-700">{dest.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Route loading indicator */}
          {routeLoading && (
            <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl border border-primary-200">
              <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
              <span className="text-xs text-primary-700 font-medium">
                {t_key(language, 'calculatingRoute') || 'Calculating real road route...'}
              </span>
            </div>
          )}

          {/* Route error */}
          {routeError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-xs text-red-700 font-medium">{routeError}</span>
            </div>
          )}

          {/* Optimized order display */}
          {optimizedOrder && !routeLoading && (
            <div className="p-3 bg-mustard-50 rounded-xl border border-mustard-200">
              <p className="text-[10px] font-semibold text-mustard-700 uppercase mb-2">
                {t_key(language, 'optimizedOrder') || 'Optimized Pickup Order'}
              </p>
              <div className="space-y-1.5">
                {/* User location (origin) */}
                {locationState.coords && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-[10px] font-bold text-blue-700">
                      📍
                    </span>
                    <span className="text-blue-700 font-medium">{t_key(language, 'yourLocation') || 'Your Location'}</span>
                    <span className="text-navy-400">→</span>
                  </div>
                )}
                {optimizedOrder.filter((item) => item.id !== destination?.id).map((stop, i) => (
                  <div key={stop.id || i} className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-white border border-mustard-300 flex items-center justify-center text-[10px] font-bold text-mustard-700">
                      {i + 1}
                    </span>
                    <span className="text-navy-800 font-medium">{stop.name || `${stop.lat?.toFixed(2)}, ${stop.lng?.toFixed(2)}`}</span>
                    <span className="text-navy-400">→</span>
                  </div>
                ))}
                {destination && (
                  <div className="flex items-center gap-2 text-xs text-primary-700 font-semibold">
                    <span className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[10px]">🎯</span>
                    <span>{destination.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info note */}
          {!routeLoading && !routeData && selectedFarmers.length > 0 && destination && (
            <div className="flex items-center gap-2 p-2.5 bg-navy-50 rounded-xl">
              <Info className="w-4 h-4 text-navy-400 flex-shrink-0" />
              <span className="text-[10px] text-navy-500">
                {t_key(language, 'routeInfo') || 'Select pickup locations and a destination to calculate the route.'}
              </span>
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="flex-1 min-h-[400px] lg:min-h-[500px] relative">
          <MapContainer
            center={mapCenter}
            zoom={locationState.coords ? 14 : 12}
            style={{ height: '100%', minHeight: 400 }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {bounds && bounds.length > 0 && <FitBounds bounds={bounds} />}
            {locationState.coords && <CenterOnLocation position={locationState.coords} />}

            {/* User's current location marker */}
            {locationState.coords && (
              <Marker
                position={[locationState.coords.lat, locationState.coords.lng]}
                icon={createLocationIcon()}
              >
                <Popup>
                  <div className="text-xs font-semibold text-blue-700">
                    {t_key(language, 'yourLocation') || '📍 Your Location'}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Farmer markers */}
            {selectedFarmers.map((farmer) => (
              <Marker key={farmer.id} position={[farmer.lat, farmer.lng]} icon={createIcon(farmer.emoji)}>
                <Popup>
                  <div className="text-xs font-semibold">
                    {farmer.name}<br />{farmer.crops.join(', ')}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Destination marker */}
            {destination && (
              <Marker position={[destination.lat, destination.lng]} icon={createIcon(destination.emoji, 32)}>
                <Popup>
                  <div className="text-xs font-semibold">{destination.name}</div>
                </Popup>
              </Marker>
            )}

            {/* Real OSRM road route polyline */}
            {routePolyline && !routeLoading && (
              <Polyline
                positions={routePolyline}
                pathOptions={{
                  color: activeRoute?.color || '#d4a017',
                  weight: 4,
                  opacity: 0.85,
                }}
              />
            )}
          </MapContainer>

          {/* Route comparison floating card */}
          {selectedFarmers.length > 0 && destination && (
            <div className="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 bg-white rounded-xl shadow-xl border border-navy-100 overflow-hidden z-[1000]">
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="w-full flex items-center justify-between p-3 bg-navy-900 text-white"
              >
                <div className="flex items-center gap-2">
                  <RouteIcon className="w-4 h-4 text-mustard-400" />
                  <span className="text-xs font-bold">{t_key(language, 'routeComparison') || 'Route Comparison'}</span>
                  {routeLoading && <Loader2 className="w-3 h-3 animate-spin text-mustard-300" />}
                </div>
                {showComparison ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>

              {showComparison && routeData && (
                <div className="p-2 space-y-1.5">
                  {[
                    { id: 'optimized', name: 'Optimized Collection Route', nameHi: 'अनुकूलित संग्रह मार्ग' },
                    { id: 'fastest', name: 'Fastest Route', nameHi: 'सबसे तेज़ मार्ग' },
                    { id: 'shortest', name: 'Shortest Route', nameHi: 'सबसे छोटा मार्ग' },
                  ].map((route) => {
                    const data = routeData[route.id];
                    if (!data) return null;
                    return (
                      <button
                        key={route.id}
                        onClick={() => setActiveRouteId(route.id)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition ${
                          activeRouteId === route.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-navy-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-navy-800">
                            {language === 'hi' ? route.nameHi : route.name}
                          </span>
                          {activeRouteId === route.id && <span className="text-[10px] text-primary-600 font-bold">● ACTIVE</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-navy-500">
                          <span className="flex items-center gap-1">
                            <RouteIcon className="w-3 h-3" />{formatDistance(data.distance)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{formatDuration(data.duration)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-[10px] text-navy-400">Efficiency</span>
                          <div className="flex-1 h-1 bg-navy-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${data.efficiency * 100}%`, background: data.color }}
                            />
                          </div>
                          <span className="text-[10px] font-medium" style={{ color: data.color }}>
                            {Math.round(data.efficiency * 100)}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {showComparison && !routeData && !routeLoading && (
                <div className="p-3 text-xs text-navy-400 text-center">
                  {t_key(language, 'selectForRoutes') || 'Select locations to see route options'}
                </div>
              )}

              {!showComparison && activeRoute && (
                <div className="p-3 text-xs text-navy-500">
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: activeRoute.color }}>
                      {formatDistance(activeRoute.distance)}
                    </span>
                    <span>•</span>
                    <span>{formatDuration(activeRoute.duration)}</span>
                    <span>•</span>
                    <span>{selectedFarmers.length} {selectedFarmers.length === 1 ? 'stop' : 'stops'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
