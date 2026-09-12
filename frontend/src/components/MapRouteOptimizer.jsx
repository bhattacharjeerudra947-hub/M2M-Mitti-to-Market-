import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  MapPin, Navigation, Clock, Route as RouteIcon,
  Search, Target, Crosshair,
  Loader2, AlertTriangle, Map, Info, ExternalLink,
  Shield, Check, Sparkles, Gauge, Zap, Store, UserCheck, Lock
} from 'lucide-react';
import { useFarmerLanguage } from '../context/FarmerContext';
import { useAuth } from '../context/AuthContext';
import { calculateRoute, geocodeAddress } from '../api/locationApi';
import { getFarmerDeals, getBuyerDeals } from '../api/dealApi';

/* ─────────────────────────────────────────────
   REFERENCE MANDIS & HUBS (Fallback destinations)
   ───────────────────────────────────────────── */
const REFERENCE_DESTINATIONS = [
  { id: 'm1', name: 'Nashik Mandi', lat: 19.9975, lng: 73.7898, type: 'mandi', emoji: '🏪' },
  { id: 'm2', name: 'Pune APMC', lat: 18.5204, lng: 73.8567, type: 'mandi', emoji: '🏪' },
  { id: 'm3', name: 'Azadpur Mandi, Delhi', lat: 28.7164, lng: 77.1738, type: 'mandi', emoji: '🏪' },
  { id: 'm4', name: 'Vashi APMC, Mumbai', lat: 19.0760, lng: 73.0039, type: 'mandi', emoji: '🏪' },
  { id: 'w1', name: 'Central Cold Storage Hub', lat: 20.0120, lng: 73.7850, type: 'warehouse', emoji: '🏭' },
];

/* ─────────────────────────────────────────────
   POLYLINE DECODER (Google encoded format)
   ───────────────────────────────────────────── */
function decodePolyline(encoded) {
  if (!encoded) return [];
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
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

/* ─────────────────────────────────────────────
   LEAFLET MAP FALLBACK (No API Key)
   Renders India map via react-leaflet + OSM tiles
   and draws route via OSRM public router
   ───────────────────────────────────────────── */
function LeafletMapFallback({ originPoint, destination, allRoutes, selectedRouteIdx, onRouteClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  // India default center
  const DEFAULT_CENTER = [20.59, 78.96];
  const DEFAULT_ZOOM = 5;

  useEffect(() => {
    // Dynamically load leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    let L;
    const initMap = async () => {
      try {
        // Dynamic import of leaflet
        L = (await import('leaflet')).default;

        // Fix default icon paths
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        if (!mapRef.current) return;
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = L.map(mapRef.current, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            zoomControl: true,
          });
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
          }).addTo(mapInstanceRef.current);
        }

        const map = mapInstanceRef.current;
        // Clear previous layers
        layersRef.current.forEach(l => { try { map.removeLayer(l); } catch {} });
        layersRef.current = [];

        const bounds = [];

        // Origin marker (green)
        if (originPoint) {
          const greenIcon = L.divIcon({
            html: `<div style="width:28px;height:28px;background:#0f9d58;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">A</div>`,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const m = L.marker([originPoint.lat, originPoint.lng], { icon: greenIcon })
            .bindPopup(`<b>📍 Pickup:</b><br>${originPoint.label}`)
            .addTo(map);
          layersRef.current.push(m);
          bounds.push([originPoint.lat, originPoint.lng]);
        }

        // Destination marker (red)
        if (destination) {
          const redIcon = L.divIcon({
            html: `<div style="width:30px;height:30px;background:#ea4335;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">B</div>`,
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });
          const m = L.marker([destination.lat, destination.lng], { icon: redIcon })
            .bindPopup(`<b>🏪 Destination:</b><br>${destination.name}`)
            .addTo(map);
          layersRef.current.push(m);
          bounds.push([destination.lat, destination.lng]);
        }

        // Draw routes if we have polyline data
        if (allRoutes && allRoutes.length > 0) {
          allRoutes.forEach((route, idx) => {
            if (!route.polylineEncoded) return;
            const path = decodePolyline(route.polylineEncoded);
            if (path.length === 0) return;
            const latlngs = path.map(p => [p.lat, p.lng]);
            const isSelected = idx === selectedRouteIdx;
            const poly = L.polyline(latlngs, {
              color: isSelected ? '#1a73e8' : '#80868b',
              weight: isSelected ? 6 : 4,
              opacity: isSelected ? 0.9 : 0.5,
            }).addTo(map);
            poly.on('click', () => onRouteClick && onRouteClick(idx));
            layersRef.current.push(poly);
            latlngs.forEach(ll => bounds.push(ll));
          });
        } else if (originPoint && destination) {
          // Fetch route from OSRM public router as fallback
          try {
            const url = `https://router.project-osrm.org/route/v1/driving/${originPoint.lng},${originPoint.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              const coords = data?.routes?.[0]?.geometry?.coordinates;
              if (coords && coords.length > 0) {
                const latlngs = coords.map(c => [c[1], c[0]]);
                const poly = L.polyline(latlngs, { color: '#1a73e8', weight: 5, opacity: 0.85 }).addTo(map);
                layersRef.current.push(poly);
                latlngs.forEach(ll => bounds.push(ll));
              }
            }
          } catch {}
        }

        // Fit map to bounds
        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [40, 40] });
        } else if (bounds.length === 1) {
          map.setView(bounds[0], 12);
        }
      } catch (err) {
        console.warn('Leaflet init failed:', err);
      }
    };

    initMap();
  }, [originPoint, destination, allRoutes, selectedRouteIdx]);

  return (
    <div className="relative w-full h-full min-h-[440px]">
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '440px' }} />
      {/* Small bottom banner indicating OSM */}
      <div className="absolute bottom-2 left-2 right-2 bg-amber-50/90 backdrop-blur-sm border border-amber-200 rounded-lg px-3 py-1.5 text-[10px] text-amber-800 flex items-center gap-1.5 z-[1000]">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        <span>Using OpenStreetMap (free tiles). Add <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> for Google Maps with live traffic &amp; animated routes.</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GOOGLE MAPS COMPONENT
   ───────────────────────────────────────────── */
function GoogleMapDisplay({ originPoint, destination, allRoutes, selectedRouteIdx, onRouteClick, apiKey }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Load Google Maps JS API
  useEffect(() => {
    if (!apiKey) return;
    if (window.google && window.google.maps) { setMapLoaded(true); return; }
    const scriptId = 'google-maps-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      script.onerror = () => console.error('Google Maps failed to load');
      document.head.appendChild(script);
    } else {
      // Script already added, poll until loaded
      const interval = setInterval(() => {
        if (window.google && window.google.maps) { setMapLoaded(true); clearInterval(interval); }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [apiKey]);

  // Initialize map ALWAYS once script loaded (no data dependency)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google?.maps) return;
    if (!mapInstanceRef.current) {
      const center = originPoint
        ? { lat: originPoint.lat, lng: originPoint.lng }
        : { lat: 20.59, lng: 78.96 }; // India default
      const zoom = originPoint ? 10 : 5;
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
    }
  }, [mapLoaded]);

  // Update map markers & polylines when data changes
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google?.maps) return;
    const map = mapInstanceRef.current;
    const bounds = new window.google.maps.LatLngBounds();

    // Clear previous
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    // Origin marker
    if (originPoint) {
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
    }

    // Destination marker
    if (destination) {
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
    }

    // Draw route polylines
    if (allRoutes && allRoutes.length > 0) {
      allRoutes.forEach((candidate, idx) => {
        if (!candidate.polylineEncoded) return;
        const path = decodePolyline(candidate.polylineEncoded);
        path.forEach(pt => bounds.extend(pt));
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
        poly.addListener('click', () => onRouteClick && onRouteClick(idx));
        polylinesRef.current.push(poly);
      });
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, [mapLoaded, originPoint, destination, allRoutes, selectedRouteIdx]);

  return <div ref={mapRef} className="w-full h-full min-h-[440px]" />;
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
export default function MapRouteOptimizer() {
  const { language } = useFarmerLanguage();
  const { user } = useAuth();

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Origin (Farmer / Pickup)
  const [originMode, setOriginMode] = useState('REGISTERED');
  const [originPoint, setOriginPoint] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [originSearchText, setOriginSearchText] = useState('');
  const [originSearching, setOriginSearching] = useState(false);

  // Deals / Active Dealers
  const [activeDeals, setActiveDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Destination
  const [destination, setDestination] = useState(null);
  const [destSearchText, setDestSearchText] = useState('');
  const [destSearching, setDestSearching] = useState(false);

  // Routing
  const [routingMode, setRoutingMode] = useState('RECOMMENDED');
  const [routeData, setRouteData] = useState(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

  // 1. Initialize Origin with registered location
  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      setOriginPoint({
        lat: Number(user.latitude),
        lng: Number(user.longitude),
        label: user.location || user.name || 'Your Registered Location',
      });
    } else {
      setOriginPoint({ lat: 19.9975, lng: 73.7898, label: 'Nashik Region (Default)' });
    }
  }, [user]);

  // 2. Fetch Active Deals (Privacy-filtered)
  useEffect(() => {
    if (!user?.id) return;
    const fetchDeals = user.role === 'FARMER' ? getFarmerDeals(user.id) : getBuyerDeals(user.id);
    fetchDeals
      .then((deals) => {
        if (!Array.isArray(deals)) return;
        const verified = deals.filter(d =>
          ['LOCKED', 'LOGISTICS_PENDING', 'IN_TRANSIT', 'CONFIRMED', 'DELIVERED'].includes(d.status) ||
          d.buyerName || d.farmerName
        );
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
      })
      .catch(() => {});
  }, [user]);

  // GPS trigger
  const requestGps = useCallback(() => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported'); return; }
    setGpsLoading(true); setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOriginPoint({ ...coords, label: 'Your Current Device Location' });
        setOriginMode('LIVE');
        setGpsLoading(false);
      },
      (err) => { setGpsError(err.message || 'Unable to get location'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  // Origin search
  const handleOriginSearch = async (e) => {
    e.preventDefault();
    if (!originSearchText.trim()) return;
    setOriginSearching(true);
    try {
      const res = await geocodeAddress(originSearchText.trim());
      if (res?.latitude && res?.longitude) {
        setOriginPoint({ lat: res.latitude, lng: res.longitude, label: originSearchText.trim() });
        setOriginMode('SEARCHED');
      }
    } catch {}
    finally { setOriginSearching(false); }
  };

  // Destination search
  const handleDestSearch = async (e) => {
    e.preventDefault();
    if (!destSearchText.trim()) return;
    setDestSearching(true);
    try {
      const res = await geocodeAddress(destSearchText.trim());
      if (res?.latitude && res?.longitude) {
        setDestination({ lat: res.latitude, lng: res.longitude, name: destSearchText.trim(), isDealer: false });
        setSelectedDeal(null);
      }
    } catch {}
    finally { setDestSearching(false); }
  };

  // Select dealer deal
  const selectDealDestination = (deal) => {
    setSelectedDeal(deal);
    if (deal.deliveryLatitude && deal.deliveryLongitude) {
      setDestination({
        lat: Number(deal.deliveryLatitude),
        lng: Number(deal.deliveryLongitude),
        name: `${deal.buyerName || 'Verified Dealer'} (${deal.deliveryLocation || 'Delivery Hub'})`,
        isDealer: true, dealerName: deal.buyerName, cropName: deal.cropName,
        dealNumber: deal.dealNumber || deal.dealId,
      });
    } else if (deal.deliveryLocation) {
      geocodeAddress(deal.deliveryLocation).then(res => {
        if (res?.latitude) {
          setDestination({
            lat: res.latitude, lng: res.longitude,
            name: `${deal.buyerName || 'Verified Dealer'} (${deal.deliveryLocation})`,
            isDealer: true, dealerName: deal.buyerName, cropName: deal.cropName,
            dealNumber: deal.dealNumber || deal.dealId,
          });
        }
      }).catch(() => {});
    }
  };

  // Calculate route via backend
  const fetchRoutes = useCallback(async () => {
    if (!originPoint || !destination) { setRouteData(null); setRouteError(null); return; }
    setRouteLoading(true); setRouteError(null);
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
      setRouteError('Could not calculate route. Map still shows your locations.');
    } finally {
      setRouteLoading(false);
    }
  }, [originPoint, destination, originMode, selectedDeal]);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const allRoutes = routeData?.allRoutes || [];

  const shortestIdx = useMemo(() => {
    if (!allRoutes.length) return 0;
    let minIdx = 0, minKm = Infinity;
    allRoutes.forEach((r, i) => { if (r.distanceKm < minKm) { minKm = r.distanceKm; minIdx = i; } });
    return minIdx;
  }, [allRoutes]);

  const fastestIdx = useMemo(() => {
    if (!allRoutes.length) return 0;
    let minIdx = 0, minMin = Infinity;
    allRoutes.forEach((r, i) => { if (r.durationMinutes < minMin) { minMin = r.durationMinutes; minIdx = i; } });
    return minIdx;
  }, [allRoutes]);

  const handleModeSwitch = (mode) => {
    setRoutingMode(mode);
    if (mode === 'SHORTEST') setSelectedRouteIdx(shortestIdx);
    else if (mode === 'FASTEST') setSelectedRouteIdx(fastestIdx);
    else { const ri = allRoutes.findIndex(r => r.recommended); setSelectedRouteIdx(ri >= 0 ? ri : 0); }
  };

  const activeRoute = allRoutes[selectedRouteIdx] || routeData?.selectedRoute;
  const isShortestSelected = selectedRouteIdx === shortestIdx && allRoutes.length > 0;
  const isFastestSelected = selectedRouteIdx === fastestIdx && allRoutes.length > 0 && !isShortestSelected;

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
              <h3 className="text-sm font-bold">{apiKey ? 'Google Maps' : 'OpenStreetMap'} Route Optimizer</h3>
              {isShortestSelected && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white">Shortest</span>
              )}
              {isFastestSelected && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500 text-white">Fastest</span>
              )}
            </div>
            <p className="text-xs text-gray-300">
              Verified Dealer Deals • Search Locations • Shortest Distance &amp; Travel Time
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-white/10 p-1 rounded-xl gap-1 text-xs">
          <button
            type="button"
            onClick={() => handleModeSwitch('SHORTEST')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              isShortestSelected ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Shortest
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('FASTEST')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              isFastestSelected ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Fastest
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('RECOMMENDED')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
              routingMode === 'RECOMMENDED' && !isShortestSelected && !isFastestSelected
                ? 'bg-navy-700 text-white'
                : 'text-gray-400 hover:text-white'
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

          {/* Origin Section */}
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

            {gpsError && (
              <p className="text-[11px] text-red-600 bg-red-50 rounded p-1.5">{gpsError}</p>
            )}

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

          {/* Destination: Verified Dealers (Privacy Protected) */}
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
                <p className="text-[11px] text-navy-600">Select a dealer with an active deal to optimize delivery:</p>
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
                  Dealer details are private and shared only when you lock an active transaction. Search any mandi below.
                </p>
              </div>
            )}

            {/* Search Any Destination */}
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

            {/* Quick Mandi Shortcuts */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {REFERENCE_DESTINATIONS.slice(0, 3).map(dest => (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => { setDestination({ lat: dest.lat, lng: dest.lng, name: dest.name, isDealer: false }); setSelectedDeal(null); }}
                  className={`text-[10px] px-2 py-1 rounded-full border transition font-medium ${
                    destination?.name === dest.name
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {dest.emoji} {dest.name}
                </button>
              ))}
            </div>
          </div>

          {/* Route Loading */}
          {routeLoading && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating optimal route via road network...</span>
            </div>
          )}

          {routeError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{routeError}</span>
            </div>
          )}

          {/* Active Route Summary */}
          {activeRoute && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <RouteIcon className="w-4 h-4 text-emerald-600" />
                  <span>{isShortestSelected ? 'Shortest Distance' : isFastestSelected ? 'Fastest Highway' : 'Optimal Route'}</span>
                </span>
                <span className="font-mono text-emerald-800 font-bold">{formatDistance(activeRoute.distanceKm)}</span>
              </div>
              {activeRoute.summary && (
                <p className="text-emerald-800 leading-relaxed text-[11px]">
                  Via {activeRoute.summary} · Est. {formatDuration(activeRoute.durationMinutes)}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200 font-mono text-[11px]">
                <div>📏 {formatDistance(activeRoute.distanceKm)}</div>
                <div>⏱ {formatDuration(activeRoute.durationMinutes)}</div>
              </div>
              {/* All routes comparison */}
              {allRoutes.length > 1 && (
                <div className="pt-1 border-t border-emerald-200 space-y-1">
                  <p className="text-[10px] font-semibold text-emerald-900 uppercase tracking-wide">All Routes</p>
                  {allRoutes.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedRouteIdx(i)}
                      className={`w-full text-left flex items-center justify-between rounded-lg p-1.5 text-[10px] transition ${
                        i === selectedRouteIdx
                          ? 'bg-emerald-200 text-emerald-900 font-bold'
                          : 'bg-white/60 text-navy-600 hover:bg-white'
                      }`}
                    >
                      <span>Route {i + 1}{r.summary ? ` · ${r.summary}` : ''}</span>
                      <span className="font-mono">{formatDistance(r.distanceKm)} · {formatDuration(r.durationMinutes)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map Display */}
        <div className="flex-1 min-h-[440px] relative bg-gray-100">
          {apiKey ? (
            <GoogleMapDisplay
              originPoint={originPoint}
              destination={destination}
              allRoutes={allRoutes}
              selectedRouteIdx={selectedRouteIdx}
              onRouteClick={setSelectedRouteIdx}
              apiKey={apiKey}
            />
          ) : (
            <LeafletMapFallback
              originPoint={originPoint}
              destination={destination}
              allRoutes={allRoutes}
              selectedRouteIdx={selectedRouteIdx}
              onRouteClick={setSelectedRouteIdx}
            />
          )}

          {/* Floating Route Pill (over map) */}
          {activeRoute && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-navy-100 shadow-md rounded-xl p-2.5 text-xs pointer-events-none flex items-center gap-3 z-[999]">
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