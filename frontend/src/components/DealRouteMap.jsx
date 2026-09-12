import React, { useEffect, useRef, useState } from 'react';
import {
  Navigation, CheckCircle2, Clock, Route as RouteIcon,
  ShieldCheck, AlertTriangle, ExternalLink, Sparkles,
  Zap, Gauge, MapPin, Layers, Play, Pause, RotateCcw,
  Truck, AlertCircle
} from 'lucide-react';

/**
 * Decode Google Maps polyline string to array of [lat, lng]
 */
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

export default function DealRouteMap({
  origin = null,          // { latitude, longitude, label }
  destination = null,     // { latitude, longitude, label }
  optimalRoute = null,    // RouteCandidate or OptimalRouteResult
  alternatives = [],      // List<RouteCandidate>
  selectionReason = '',
  selectionType = '',
  distanceKm = null,
  durationMinutes = null,
  estimatedCost = null,
}) {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);

  // Preference mode: 'RECOMMENDED' | 'SHORTEST' | 'FASTEST'
  const [optimizationMode, setOptimizationMode] = useState('RECOMMENDED');

  // Animation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0); // 0% to 100%
  const animFrameRef = useRef(null);
  const truckMarkerRef = useRef(null);
  const decodedPathRef = useRef([]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Load Google Maps JavaScript API
  useEffect(() => {
    if (!apiKey) {
      setScriptError(true);
      return;
    }
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
      script.onerror = () => setScriptError(true);
      document.head.appendChild(script);
    }
  }, [apiKey]);

  const allRoutes = alternatives && alternatives.length > 0 ? alternatives : (optimalRoute ? [optimalRoute] : []);

  // Identify Shortest and Fastest Routes
  const shortestRouteIdx = React.useMemo(() => {
    if (!allRoutes || allRoutes.length === 0) return 0;
    let minIdx = 0;
    let minKm = Infinity;
    allRoutes.forEach((r, i) => {
      if (r.distanceKm < minKm) {
        minKm = r.distanceKm;
        minIdx = i;
      }
    });
    return minIdx;
  }, [allRoutes]);

  const fastestRouteIdx = React.useMemo(() => {
    if (!allRoutes || allRoutes.length === 0) return 0;
    let minIdx = 0;
    let minMin = Infinity;
    allRoutes.forEach((r, i) => {
      if (r.durationMinutes < minMin) {
        minMin = r.durationMinutes;
        minIdx = i;
      }
    });
    return minIdx;
  }, [allRoutes]);

  const handleModeChange = (mode) => {
    setOptimizationMode(mode);
    setIsSimulating(false);
    setSimProgress(0);
    if (mode === 'SHORTEST') {
      setSelectedRouteIdx(shortestRouteIdx);
    } else if (mode === 'FASTEST') {
      setSelectedRouteIdx(fastestRouteIdx);
    } else {
      const recIdx = allRoutes.findIndex(r => r.recommended);
      setSelectedRouteIdx(recIdx >= 0 ? recIdx : 0);
    }
  };

  const activeRoute = allRoutes[selectedRouteIdx] || optimalRoute;
  const activeDistance = activeRoute?.distanceKm || distanceKm;
  const activeDuration = activeRoute?.durationMinutes || durationMinutes;
  const reasonText = selectionReason || optimalRoute?.whySelected;

  const isCurrentShortest = selectedRouteIdx === shortestRouteIdx;
  const isCurrentFastest = selectedRouteIdx === fastestRouteIdx;

  // Google Map Setup & Drawing
  useEffect(() => {
    if (!mapLoaded || !window.google || !window.google.maps || !mapRef.current) return;
    if (!origin?.latitude || !destination?.latitude) return;

    const from = { lat: Number(origin.latitude), lng: Number(origin.longitude) };
    const to = { lat: Number(destination.latitude), lng: Number(destination.longitude) };

    const map = new window.google.maps.Map(mapRef.current, {
      center: from,
      zoom: 10,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'simplified' }] }
      ]
    });

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(from);
    bounds.extend(to);

    // Origin Pin
    new window.google.maps.Marker({
      position: from,
      map,
      title: origin.label || 'Pickup / Farmer',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#0f9d58',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2.5,
      },
      label: { text: 'A', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' },
    });

    // Destination Pin
    new window.google.maps.Marker({
      position: to,
      map,
      title: destination.label || 'Delivery / Buyer',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#ea4335',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2.5,
      },
      label: { text: 'B', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' },
    });

    // Animated Delivery Vehicle Marker
    truckMarkerRef.current = new window.google.maps.Marker({
      position: from,
      map,
      title: 'Logistics Transport in Transit',
      zIndex: 999,
      icon: {
        path: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
        scale: 1.2,
        fillColor: '#2563eb',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 1.5,
        anchor: new window.google.maps.Point(12, 12),
      },
    });

    // Draw Google Maps Polylines
    allRoutes.forEach((route, idx) => {
      if (!route.polylineEncoded) return;
      const path = decodePolyline(route.polylineEncoded);
      path.forEach((pt) => bounds.extend(pt));

      const isSelected = idx === selectedRouteIdx;
      if (isSelected) {
        decodedPathRef.current = path;
      }

      // Animated dashes or steady polyline
      const polyline = new window.google.maps.Polyline({
        path,
        map,
        strokeColor: isSelected ? '#1a73e8' : '#80868b',
        strokeOpacity: isSelected ? 0.95 : 0.55,
        strokeWeight: isSelected ? 6 : 4,
        zIndex: isSelected ? 20 : 5,
        clickable: true,
      });

      polyline.addListener('click', () => {
        setSelectedRouteIdx(idx);
        setIsSimulating(false);
        setSimProgress(0);
      });
    });

    map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
  }, [mapLoaded, origin, destination, allRoutes, selectedRouteIdx]);

  // Handle Route Transit Animation
  useEffect(() => {
    if (!isSimulating) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const path = decodedPathRef.current;
    if (!path || path.length < 2) return;

    let step = simProgress;
    const totalSteps = path.length - 1;

    const animate = () => {
      step += 0.25; // Speed factor
      if (step >= totalSteps) {
        step = totalSteps;
        setIsSimulating(false);
        setSimProgress(100);
      } else {
        setSimProgress(Math.round((step / totalSteps) * 100));
        animFrameRef.current = requestAnimationFrame(animate);
      }

      const idx = Math.floor(step);
      const nextIdx = Math.min(idx + 1, totalSteps);
      const ratio = step - idx;

      const p1 = path[idx];
      const p2 = path[nextIdx];
      const currentLat = p1.lat + (p2.lat - p1.lat) * ratio;
      const currentLng = p1.lng + (p2.lng - p1.lng) * ratio;

      if (truckMarkerRef.current) {
        truckMarkerRef.current.setPosition({ lat: currentLat, lng: currentLng });
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSimulating]);

  const toggleSimulation = () => {
    if (simProgress >= 100) {
      setSimProgress(0);
      if (truckMarkerRef.current && decodedPathRef.current.length > 0) {
        truckMarkerRef.current.setPosition(decodedPathRef.current[0]);
      }
    }
    setIsSimulating(!isSimulating);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setSimProgress(0);
    if (truckMarkerRef.current && decodedPathRef.current.length > 0) {
      truckMarkerRef.current.setPosition(decodedPathRef.current[0]);
    }
  };

  const formatTime = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  const googleMapsUrl = origin?.latitude && destination?.latitude
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`
    : null;

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 bg-navy-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <RouteIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Google Maps Route & Highway Simulation</h3>
              {isCurrentShortest && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white">
                  Shortest Route
                </span>
              )}
              {isCurrentFastest && !isCurrentShortest && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500 text-white">
                  Fastest Route
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-300">
              Live highway corridors, toll information & vehicle transit animation
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-white/10 p-1 rounded-xl gap-1 text-xs">
          <button
            type="button"
            onClick={() => handleModeChange('SHORTEST')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              isCurrentShortest ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Shortest Distance
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('FASTEST')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              isCurrentFastest && !isCurrentShortest ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Fastest Route
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('RECOMMENDED')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
              optimizationMode === 'RECOMMENDED' && !isCurrentShortest ? 'bg-navy-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            Recommended
          </button>
        </div>

        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
          >
            Open in Google Maps <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Map Display Canvas */}
      <div className="relative w-full h-80 sm:h-96 bg-gray-100 flex items-center justify-center overflow-hidden">
        {scriptError || !apiKey ? (
          <div className="p-6 text-center max-w-md">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-navy-900">Google Maps Live Route Calculation</p>
            <p className="text-xs text-navy-600 mt-1">
              Shortest distance and road transit duration are calculated. Add your <code>VITE_GOOGLE_MAPS_API_KEY</code> to enable vector map rendering and live highway animation.
            </p>
            {origin?.latitude && destination?.latitude && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-navy-100 text-xs text-left space-y-1 font-mono">
                <div className="text-emerald-700 font-semibold">Origin (A): {origin.latitude.toFixed(4)}, {origin.longitude.toFixed(4)}</div>
                <div className="text-red-700 font-semibold">Destination (B): {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}</div>
              </div>
            )}
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}

        {/* Floating Route Info HUD */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-navy-100 shadow-md rounded-xl p-2.5 text-xs pointer-events-none flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="font-bold text-navy-900">{activeDistance} km</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1 text-navy-700 font-medium">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{formatTime(activeDuration)}</span>
          </div>
          {activeRoute?.summary && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-blue-700 font-bold">{activeRoute.summary}</span>
            </>
          )}
        </div>

        {/* Animation Floating Control Bar */}
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 bg-white/95 backdrop-blur-sm border border-navy-100 shadow-lg rounded-2xl p-2.5 flex items-center gap-3 z-10">
          <button
            type="button"
            onClick={toggleSimulation}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              isSimulating
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause Transit
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Animate Route
              </>
            )}
          </button>

          <button
            type="button"
            onClick={resetSimulation}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-navy-600 transition"
            title="Reset simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 min-w-24 sm:w-36">
            <div className="flex justify-between text-[10px] text-navy-600 font-bold mb-1">
              <span>Highway Transit</span>
              <span>{simProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-150 rounded-full"
                style={{ width: `${simProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Highway & Road Highlights Bar */}
      <div className="px-5 py-3 bg-navy-50/80 border-t border-navy-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-navy-800 font-semibold">
            <RouteIcon className="w-4 h-4 text-blue-600" />
            <span>Highway Corridor:</span>
            <span className="font-bold text-navy-900 bg-white px-2 py-0.5 rounded-md border border-navy-200">
              {activeRoute?.summary || 'National / State Highway'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
              activeRoute?.hasTolls
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {activeRoute?.hasTolls ? 'Toll Highway' : 'Toll-Free Route'}
            </span>

            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              {activeRoute?.hasHighways ? 'Multi-Lane Expressway' : 'State Arterial'}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-navy-500 font-medium">
          Drivable heavy cargo corridor verified for produce transportation
        </div>
      </div>

      {/* Route Cards & Metrics */}
      <div className="p-4 sm:p-5 border-t border-navy-100 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Available Google Maps Highway Routes
            </p>
            <span className="text-[11px] text-navy-500">
              Click to preview on map
            </span>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allRoutes.map((route, i) => {
              const isSelected = selectedRouteIdx === i;
              const isShortest = i === shortestRouteIdx;
              const isFastest = i === fastestRouteIdx;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedRouteIdx(i);
                    setIsSimulating(false);
                    setSimProgress(0);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition relative ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/30'
                      : 'border-navy-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-900 truncate pr-2">
                      {route.summary ? `via ${route.summary}` : `Route ${String.fromCharCode(65 + i)}`}
                    </span>
                    {isShortest && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                        Shortest
                      </span>
                    )}
                    {!isShortest && isFastest && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 shrink-0">
                        Fastest
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-sm font-bold text-navy-900">
                      {route.distanceKm} km
                    </span>
                    <span className="text-xs font-semibold text-navy-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-navy-400" />
                      {formatTime(route.durationMinutes)}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-blue-700 font-semibold">
                      <span>✓ Active on map</span>
                      <span>₹{estimatedCost ? Math.round((route.distanceKm / (activeDistance || 1)) * estimatedCost).toLocaleString('en-IN') : '—'}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Route Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-navy-50 rounded-xl">
            <p className="text-[10px] text-navy-400 font-bold uppercase tracking-wider">Road Distance</p>
            <p className="text-base font-bold text-navy-900 mt-0.5">{activeDistance} km</p>
          </div>
          <div className="p-3 bg-navy-50 rounded-xl">
            <p className="text-[10px] text-navy-400 font-bold uppercase tracking-wider">Highway Transit</p>
            <p className="text-base font-bold text-navy-900 mt-0.5">{formatTime(activeDuration)}</p>
          </div>
          <div className="p-3 bg-navy-50 rounded-xl">
            <p className="text-[10px] text-navy-400 font-bold uppercase tracking-wider">Estimated Transport Cost</p>
            <p className="text-base font-bold text-emerald-700 mt-0.5">
              {estimatedCost != null ? `₹${Math.round(estimatedCost).toLocaleString('en-IN')}` : '—'}
            </p>
          </div>
          <div className="p-3 bg-navy-50 rounded-xl">
            <p className="text-[10px] text-navy-400 font-bold uppercase tracking-wider">Classification</p>
            <p className="text-sm font-bold text-navy-800 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {isCurrentShortest ? 'Shortest Distance' : isCurrentFastest ? 'Fastest Highway' : 'Optimal'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}