import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  MapPin, Navigation, Clock, Route as RouteIcon,
  Search, ChevronDown, ChevronUp, Target, Crosshair,
  Loader2, AlertTriangle, Map, Info, ExternalLink,
  Shield, Check, Sparkles, Gauge, Zap, Store, UserCheck, Lock
} from 'lucide-react';
import { useFarmerLanguage } from '../context/FarmerContext';
import { useAuth } from '../context/AuthContext';
import { t_key } from '../data/farmerTranslations';
import { calculateRoute, geocodeAddress } from '../api/locationApi';
import { getFarmerDeals, getBuyerDeals } from '../api/dealApi';

/* ─────────────────────────────────────────────
   FALLBACK / REFERENCE MANDIS & HUBS
   ───────────────────────────────────────────── */
const REFERENCE_DESTINATIONS = [
  { id: 'm1', name: 'Nashik Mandi', lat: 19.9975, lng: 73.7898, type: 'mandi', emoji: '🏪' },
  { id: 'm2', name: 'Pune APMC', lat: 18.5204, lng: 73.8567, type: 'mandi', emoji: '🏪' },
  { id: 'm3', name: 'Azadpur Mandi, Delhi', lat: 28.7164, lng: 77.1738, type: 'mandi', emoji: '🏪' },
  { id: 'm4', name: 'Vashi APMC, Mumbai', lat: 19.0760, lng: 73.0039, type: 'mandi', emoji: '🏪' },
  { id: 'w1', name: 'Central Cold Storage Hub', lat: 20.0120, lng: 73.7850, type: 'warehouse', emoji: '🏭' },
];

function decodePolyline(encoded) {
  if (!encoded) return [];
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return poly;
}

function formatDuration(minutes) {
  if (!minutes) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const remMins = Math.round(minutes % 60);
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

function formatDistance(km) {
  if (!km) return '0 km';
  return `${Number(km).toFixed(1)} km`;
}

export default function MapRouteOptimizer() {
  const { language } = useFarmerLanguage();
  const { user } = useAuth();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);

  // Geolocation & Origin (Farmer/Pickup)
  const [originMode, setOriginMode] = useState('REGISTERED'); // 'REGISTERED' | 'LIVE' | 'SEARCHED'
  const [originPoint, setOriginPoint] = useState(null);       // { lat, lng, label }
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Search Origin
  const [originSearchText, setOriginSearchText] = useState('');
  const [originSearching, setOriginSearching] = useState(false);

  // Deals / Active Dealers (Authenticated Privacy Filtered)
  const [activeDeals, setActiveDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDealsDropdown, setShowDealsDropdown] = useState(false);

  // Destination (Mandi or Dealer Destination)
  const [destination, setDestination] = useState(null);
  const [destSearchText, setDestSearchText] = useState('');
  const [destSearching, setDestSearching] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Routing Mode: 'SHORTEST' | 'FASTEST' | 'RECOMMENDED'
  const [routingMode, setRoutingMode] = useState('RECOMMENDED');
  const [routeData, setRouteData] = useState(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // 1. Initialize Origin with User Registered Location
  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      setOriginPoint({
        lat: Number(user.latitude),
        lng: Number(user.longitude),
        label: user.location || user.name || 'Your Registered Location',
      });
    } else {
      // Default fallback
      setOriginPoint({
        lat: 19.9975,
        lng: 73.7898,
        label: 'Nashik Region',
      });
    }
  }, [user]);

  // 2. Fetch User's Real Active Deals (Dealers / Buyers with Privacy Verification)
  useEffect(() => {
    if (!user?.id) return;
    const fetchDeals = user.role === 'FARMER' ? getFarmerDeals(user.id) : getBuyerDeals(user.id);
    fetchDeals
      .then((deals) => {
        if (Array.isArray(deals)) {
          // Filter to active locked or confirmed deals with valid counterparties
          const verified = deals.filter(d => ['LOCKED', 'LOGISTICS_PENDING', 'IN_TRANSIT', 'CONFIRMED', 'DELIVERED'].includes(d.status) || d.buyerName || d.farmerName);
          setActiveDeals(verified);

          if (verified.length > 0) {
            const first = verified[0];
            setSelectedDeal(first);
            if (first.deliveryLatitude && first.deliveryLongitude) {
              setDestination({
                lat: Number(first.deliveryLatitude),
                lng: Number(first.deliveryLongitude),
                name: `${first.buyerName || 'Verified Dealer'} (${first.deliveryLocation || 'Delivery Hub'})`,
                isDealer: true,
                dealerName: first.buyerName,
                cropName: first.cropName,
                dealNumber: first.dealNumber || first.dealId,
              });
            }
          }
        }
      })
      .catch(() => {});
  }, [user]);

  // Load Google Maps JavaScript API
  useEffect(() => {
    if (!apiKey) return;
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    }
  }, [apiKey]);

  // Geolocation trigger
  const requestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);
        setOriginPoint({ ...coords, label: 'Your Current Device Location' });
        setOriginMode('LIVE');
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(err.message || 'Unable to retrieve location');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  // Origin Search
  const handleOriginSearch = async (e) => {
    e.preventDefault();
    if (!originSearchText.trim()) return;
    setOriginSearching(true);
    try {
      const res = await geocodeAddress(originSearchText.trim());
      if (res && res.latitude && res.longitude) {
        setOriginPoint({
          lat: res.latitude,
          lng: res.longitude,
          label: originSearchText.trim(),
        });
        setOriginMode('SEARCHED');
      }
    } catch {}
    finally { setOriginSearching(false); }
  };

  // Destination Search
  const handleDestSearch = async (e) => {
    e.preventDefault();
    if (!destSearchText.trim()) return;
    setDestSearching(true);
    try {
      const res = await geocodeAddress(destSearchText.trim());
      if (res && res.latitude && res.longitude) {
        setDestination({
          lat: res.latitude,
          lng: res.longitude,
          name: destSearchText.trim(),
          isDealer: false,
        });
        setSelectedDeal(null);
      }
    } catch {}
    finally { setDestSearching(false); }
  };

  // Select verified dealer deal
  const selectDealDestination = (deal) => {
    setSelectedDeal(deal);
    setShowDealsDropdown(false);
    if (deal.deliveryLatitude && deal.deliveryLongitude) {
      setDestination({
        lat: Number(deal.deliveryLatitude),
        lng: Number(deal.deliveryLongitude),
        name: `${deal.buyerName || 'Verified Dealer'} (${deal.deliveryLocation || 'Delivery Hub'})`,
        isDealer: true,
        dealerName: deal.buyerName,
        cropName: deal.cropName,
        dealNumber: deal.dealNumber || deal.dealId,
      });
    } else if (deal.deliveryLocation) {
      // Geocode delivery location text if lat/lng not populated
      geocodeAddress(deal.deliveryLocation).then(res => {
        if (res && res.latitude) {
          setDestination({
            lat: res.latitude,
            lng: res.longitude,
            name: `${deal.buyerName || 'Verified Dealer'} (${deal.deliveryLocation})`,
            isDealer: true,
            dealerName: deal.buyerName,
            cropName: deal.cropName,
            dealNumber: deal.dealNumber || deal.dealId,
          });
        }
      }).catch(() => {});
    }
  };

  // Calculate Route via Backend (Google Maps Directions)
  const fetchRoutes = useCallback(async () => {
    if (!originPoint || !destination) {
      setRouteData(null);
      setRouteError(null);
      return;
    }

    setRouteLoading(true);
    setRouteError(null);

    try {
      const res = await calculateRoute({
        origin: { latitude: originPoint.lat, longitude: originPoint.lng },
        destination: { latitude: destination.lat, longitude: destination.lng },
        originSource: originMode,
        destinationSource: destination.isDealer ? 'DEALER_DEAL' : 'MANDI_SEARCH',
        quantityKg: selectedDeal?.quantity || 1000,
      });

      setRouteData(res);
      setSelectedRouteIdx(0);
    } catch (err) {
      console.error('Route calculation failed:', err);
      setRouteError('Could not calculate optimal route.');
    } finally {
      setRouteLoading(false);
    }
  }, [originPoint, destination, originMode, selectedDeal]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const allRoutes = routeData?.allRoutes || [];

  // Identify Shortest & Fastest
  const shortestIdx = useMemo(() => {
    if (!allRoutes || allRoutes.length === 0) return 0;
    let minIdx = 0, minKm = Infinity;
    allRoutes.forEach((r, i) => {
      if (r.distanceKm < minKm) { minKm = r.distanceKm; minIdx = i; }
    });
    return minIdx;
  }, [allRoutes]);

  const fastestIdx = useMemo(() => {
    if (!allRoutes || allRoutes.length === 0) return 0;
    let minIdx = 0, minMin = Infinity;
    allRoutes.forEach((r, i) => {
      if (r.durationMinutes < minMin) { minMin = r.durationMinutes; minIdx = i; }
    });
    return minIdx;
  }, [allRoutes]);

  // Handle Mode Switch (Shortest vs Fastest vs Recommended)
  const handleModeSwitch = (mode) => {
    setRoutingMode(mode);
    if (mode === 'SHORTEST') {
      setSelectedRouteIdx(shortestIdx);
    } else if (mode === 'FASTEST') {
      setSelectedRouteIdx(fastestIdx);
    } else {
      const recIdx = allRoutes.findIndex(r => r.recommended);
      setSelectedRouteIdx(recIdx >= 0 ? recIdx : 0);
    }
  };

  // Google Map Drawing
  useEffect(() => {
    if (!mapLoaded || !window.google || !window.google.maps || !mapRef.current) return;
    if (!originPoint || !destination) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: originPoint,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
    }

    const map = mapInstanceRef.current;
    const bounds = new window.google.maps.LatLngBounds();

    // Clear previous elements
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // Origin Pin (Farmer / Pickup)
    const oMarker = new window.google.maps.Marker({
      position: { lat: originPoint.lat, lng: originPoint.lng },
      map,
      title: `Pickup: ${originPoint.label}`,
      label: { text: 'A', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#0f9d58',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2.5,
      },
    });
    markersRef.current.push(oMarker);
    bounds.extend({ lat: originPoint.lat, lng: originPoint.lng });

    // Destination Pin (Dealer / Delivery)
    const dMarker = new window.google.maps.Marker({
      position: { lat: destination.lat, lng: destination.lng },
      map,
      title: `Destination: ${destination.name}`,
      label: { text: 'B', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#ea4335',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2.5,
      },
    });
    markersRef.current.push(dMarker);
    bounds.extend({ lat: destination.lat, lng: destination.lng });

    // Draw Routes
    if (allRoutes && allRoutes.length > 0) {
      allRoutes.forEach((candidate, idx) => {
        if (!candidate.polylineEncoded) return;
        const path = decodePolyline(candidate.polylineEncoded);
        path.forEach((pt) => bounds.extend(pt));

        const isSelected = idx === selectedRouteIdx;
        const poly = new window.google.maps.Polyline({
          path,
          map,
          strokeColor: isSelected ? '#1a73e8' : '#80868b',
          strokeOpacity: isSelected ? 0.95 : 0.55,
          strokeWeight: isSelected ? 6 : 4,
          zIndex: isSelected ? 20 : 5,
          clickable: true,
        });

        poly.addListener('click', () => {
          setSelectedRouteIdx(idx);
        });
        polylinesRef.current.push(poly);
      });
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, [mapLoaded, originPoint, destination, allRoutes, selectedRouteIdx]);

  const activeRoute = allRoutes[selectedRouteIdx] || routeData?.selectedRoute;
  const isShortestSelected = selectedRouteIdx === shortestIdx;
  const isFastestSelected = selectedRouteIdx === fastestIdx;

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-navy-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
            <RouteIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">Google Maps Route Optimizer</h3>
              {isShortestSelected && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white">
                  Shortest Route
                </span>
              )}
              {isFastestSelected && !isShortestSelected && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500 text-white">
                  Fastest Route
                </span>
              )}
            </div>
            <p className="text-xs text-gray-300">
              Verified Dealer Deals • Search Locations • Shortest Distance & Travel Time
            </p>
          </div>
        </div>

        {/* Shortest / Fastest Toggle */}
        <div className="flex items-center bg-white/10 p-1 rounded-xl gap-1 text-xs">
          <button
            type="button"
            onClick={() => handleModeSwitch('SHORTEST')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              isShortestSelected ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Shortest Distance
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('FASTEST')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              isFastestSelected && !isShortestSelected ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Fastest Route
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('RECOMMENDED')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
              routingMode === 'RECOMMENDED' && !isShortestSelected ? 'bg-navy-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            Recommended
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Controls Sidebar */}
        <div className="lg:w-88 p-4 border-b lg:border-b-0 lg:border-r border-navy-100 space-y-4">
          {/* 1. Pickup Origin Section (Registered / Live / Search) */}
          <div className="bg-navy-50/70 p-3.5 rounded-xl border border-navy-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-navy-900">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Pickup Location (Origin)
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {originMode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setOriginMode('REGISTERED');
                  if (user?.latitude) {
                    setOriginPoint({ lat: Number(user.latitude), lng: Number(user.longitude), label: user.location || 'Registered Profile' });
                  }
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold border transition text-center ${
                  originMode === 'REGISTERED' ? 'bg-white border-navy-900 text-navy-900 shadow-xs' : 'border-navy-200 text-navy-600 hover:bg-white'
                }`}
              >
                Profile Location
              </button>
              <button
                type="button"
                onClick={requestGps}
                disabled={gpsLoading}
                className={`py-1.5 px-2 rounded-lg font-semibold border transition text-center flex items-center justify-center gap-1 ${
                  originMode === 'LIVE' ? 'bg-white border-purple-600 text-purple-700 shadow-xs' : 'border-navy-200 text-navy-600 hover:bg-white'
                }`}
              >
                {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3 text-purple-600" />}
                Use Device GPS
              </button>
            </div>

            {/* Search Location Box for Origin */}
            <form onSubmit={handleOriginSearch} className="flex gap-1.5">
              <input
                type="text"
                value={originSearchText}
                onChange={e => setOriginSearchText(e.target.value)}
                placeholder="Search pickup village / mandi..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-navy-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
              />
              <button
                type="submit"
                disabled={originSearching || !originSearchText.trim()}
                className="px-2.5 py-1.5 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                {originSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              </button>
            </form>

            <div className="text-[11px] text-navy-700 bg-white p-2 rounded-lg border border-navy-100 flex items-center justify-between">
              <span className="truncate pr-2 font-medium">{originPoint?.label || 'Selected Pickup Point'}</span>
              <span className="font-mono text-navy-500 shrink-0">
                {originPoint ? `${originPoint.lat.toFixed(2)}, ${originPoint.lng.toFixed(2)}` : '—'}
              </span>
            </div>
          </div>

          {/* 2. Destination: Verified Dealers with Deals (Privacy Preserved) */}
          <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-navy-900">
              <span className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-blue-600" />
                Active Dealers with Deals
              </span>
              <span className="text-[10px] text-blue-800 font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-600" /> Privacy Protected
              </span>
            </div>

            {activeDeals.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] text-navy-600">
                  Select a dealer with an active deal to optimize delivery distance:
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {activeDeals.map((deal) => {
                    const isSelected = selectedDeal?.id === deal.id;
                    return (
                      <button
                        key={deal.id}
                        type="button"
                        onClick={() => selectDealDestination(deal)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition ${
                          isSelected
                            ? 'bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white/80 border-blue-100 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-navy-900">
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                            {deal.buyerName || 'Verified Dealer'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {deal.cropName}
                          </span>
                        </div>
                        <div className="text-[11px] text-navy-600 mt-1 flex justify-between">
                          <span className="truncate pr-2">📍 {deal.deliveryLocation || 'Delivery Hub'}</span>
                          <span className="text-navy-400 shrink-0 font-mono">#{deal.dealNumber || deal.dealId}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-white rounded-xl border border-blue-100 text-[11px] text-navy-600 space-y-1">
                <div className="flex items-center gap-1 text-blue-900 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>No Active Deals with Dealers</span>
                </div>
                <p className="text-navy-500">
                  Dealer details are private and shared only when you lock an active transaction. You can search any mandi or destination below.
                </p>
              </div>
            )}

            {/* Search Any Destination or Mandi */}
            <form onSubmit={handleDestSearch} className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={destSearchText}
                onChange={e => setDestSearchText(e.target.value)}
                placeholder="Or search destination mandi / city..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={destSearching || !destSearchText.trim()}
                className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                {destSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              </button>
            </form>
          </div>

          {/* Calculation Loading & Summary */}
          {routeLoading && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating shortest road corridor...</span>
            </div>
          )}

          {routeError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {routeError}
            </div>
          )}

          {/* Active Route Summary */}
          {activeRoute && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <RouteIcon className="w-4 h-4 text-emerald-600" />
                  <span>{isShortestSelected ? 'Shortest Route' : isFastestSelected ? 'Fastest Highway' : 'Optimal Route'}</span>
                </span>
                <span className="font-mono text-emerald-800 font-bold">{formatDistance(activeRoute.distanceKm)}</span>
              </div>
              <p className="text-emerald-800 leading-relaxed text-[11px]">
                {activeRoute.summary ? `Direct route via ${activeRoute.summary}.` : 'Direct road routing.'} Estimated transit is {formatDuration(activeRoute.durationMinutes)}.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200 font-mono text-[11px]">
                <div>Distance: {formatDistance(activeRoute.distanceKm)}</div>
                <div>Duration: {formatDuration(activeRoute.durationMinutes)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Google Map Display */}
        <div className="flex-1 min-h-[440px] relative bg-gray-100 flex items-center justify-center">
          <div ref={mapRef} className="w-full h-full min-h-[440px]" />
          {!apiKey && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
              <p className="text-sm font-bold text-navy-900">Google Maps Active</p>
              <p className="text-xs text-navy-600 max-w-sm mt-1">
                Shortest distance calculation & Dealer destinations are active. Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to display vector map tiles.
              </p>
            </div>
          )}

          {/* Floating Route Pill */}
          {activeRoute && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-navy-100 shadow-md rounded-xl p-2.5 text-xs pointer-events-none flex items-center gap-3 z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="font-bold text-navy-900">{formatDistance(activeRoute.distanceKm)}</span>
              </div>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1 text-navy-700 font-medium">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{formatDuration(activeRoute.durationMinutes)}</span>
              </div>
              {destination && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-navy-900 font-bold truncate max-w-40">{destination.name}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}