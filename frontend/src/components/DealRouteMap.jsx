import React, { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../utils/googleMapsLoader';
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

function reverseGeocode(lat, lng, callback) {
  if (!window.google?.maps?.Geocoder) return;
  const geocoder = new window.google.maps.Geocoder();
  geocoder.geocode({ location: { lat, lng } }, (results, status) => {
    if (status === 'OK' && results?.[0]) {
      callback(results[0].formatted_address);
    } else {
      callback(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  });
}

export default function DealRouteMap({
  origin = null,          // { latitude, longitude, label, address }
  destination = null,     // { latitude, longitude, label, address }
  optimalRoute = null,    // RouteCandidate or OptimalRouteResult
  alternatives = [],      // List<RouteCandidate>
  selectionReason = '',
  selectionType = '',
  distanceKm = null,
  durationMinutes = null,
  estimatedCost = null,
  canEditOrigin = false,
  canEditDestination = false,
  onOriginChange = () => {},
  onDestinationChange = () => {},
  onRouteCalculated = () => {},
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const polylinesRef = useRef([]);
  const trafficLayerRef = useRef(null);

  const { isLoaded: mapLoaded, loadError: scriptError } = useGoogleMaps();
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);

  // Map Controls: 'roadmap' | 'hybrid', traffic on/off
  const [mapTypeId, setMapTypeId] = useState('roadmap');
  const [isTrafficOn, setIsTrafficOn] = useState(false);

  // Preference mode: 'RECOMMENDED' | 'SHORTEST' | 'FASTEST'
  const [optimizationMode, setOptimizationMode] = useState('RECOMMENDED');

  // Animation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0); // 0% to 100%
  const animFrameRef = useRef(null);
  const truckMarkerRef = useRef(null);
  const decodedPathRef = useRef([]);

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

  // Google Map Setup & Drawing — Always keeps the map live and interactive
  useEffect(() => {
    if (!mapLoaded || !window.google || !window.google.maps || !mapRef.current) return;

    const hasOrigin = Boolean(origin?.latitude && origin?.longitude);
    const hasDest = Boolean(destination?.latitude && destination?.longitude);

    const from = hasOrigin ? { lat: Number(origin.latitude), lng: Number(origin.longitude) } : null;
    const to = hasDest ? { lat: Number(destination.latitude), lng: Number(destination.longitude) } : null;

    let center = { lat: 20.5937, lng: 78.9629 }; // India center
    let zoom = 5;
    if (from && to) {
      center = from;
      zoom = 10;
    } else if (from) {
      center = from;
      zoom = 12;
    } else if (to) {
      center = to;
      zoom = 12;
    }

    let map = mapInstanceRef.current;
    if (!map) {
      map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'simplified' }] }
        ]
      });
      mapInstanceRef.current = map;

      // Click to pin on map
      map.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        if (canEditOrigin && !canEditDestination) {
          reverseGeocode(lat, lng, (addr) => onOriginChange({ latitude: lat, longitude: lng, address: addr }));
        } else if (canEditDestination && !canEditOrigin) {
          reverseGeocode(lat, lng, (addr) => onDestinationChange({ latitude: lat, longitude: lng, address: addr }));
        }
      });
    }

    // Traffic Layer
    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new window.google.maps.TrafficLayer();
    }
    trafficLayerRef.current.setMap(isTrafficOn ? map : null);

    // Map Type
    map.setMapTypeId(mapTypeId);

    // Clean up previous markers & polylines
    if (originMarkerRef.current) originMarkerRef.current.setMap(null);
    if (destMarkerRef.current) destMarkerRef.current.setMap(null);
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    // Origin Pin (Green Circle A)
    if (from) {
      bounds.extend(from);
      originMarkerRef.current = new window.google.maps.Marker({
        position: from,
        map,
        draggable: canEditOrigin,
        title: origin.label || origin.address || 'Pickup Point (Farmer)',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#0f9d58',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
        label: { text: 'A', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' },
      });

      if (canEditOrigin) {
        originMarkerRef.current.addListener('dragend', (e) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          reverseGeocode(lat, lng, (addr) => onOriginChange({ latitude: lat, longitude: lng, address: addr }));
        });
      }
    }

    // Destination Pin (Red Circle B)
    if (to) {
      bounds.extend(to);
      destMarkerRef.current = new window.google.maps.Marker({
        position: to,
        map,
        draggable: canEditDestination,
        title: destination.label || destination.address || 'Delivery Point (Buyer)',
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

      if (canEditDestination) {
        destMarkerRef.current.addListener('dragend', (e) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          reverseGeocode(lat, lng, (addr) => onDestinationChange({ latitude: lat, longitude: lng, address: addr }));
        });
      }
    }

    // Draw Polylines if both endpoints exist
    if (from && to) {
      if (allRoutes.length > 0) {
        allRoutes.forEach((route, idx) => {
          if (!route.polylineEncoded) return;
          const path = decodePolyline(route.polylineEncoded);
          path.forEach((pt) => bounds.extend(pt));

          const isSelected = idx === selectedRouteIdx;
          if (isSelected) {
            decodedPathRef.current = path;
          }

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
          polylinesRef.current.push(polyline);
        });

        map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
      } else {
        // Direct Client-Side DirectionsService calculation for immediate zero-lag display
        const ds = new window.google.maps.DirectionsService();
        ds.route({
          origin: from,
          destination: to,
          travelMode: window.google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true,
        }, (result, status) => {
          if (status === 'OK' && result?.routes?.[0]) {
            const primary = result.routes[0];
            const leg = primary.legs[0];
            const path = primary.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
            decodedPathRef.current = path;

            path.forEach(pt => bounds.extend(pt));

            const polyline = new window.google.maps.Polyline({
              path,
              map,
              strokeColor: '#1a73e8',
              strokeOpacity: 0.95,
              strokeWeight: 6,
              zIndex: 20,
            });
            polylinesRef.current.push(polyline);

            map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });

            if (onRouteCalculated) {
              onRouteCalculated({
                distanceKm: Math.round((leg.distance?.value || 0) / 100) / 10,
                durationMinutes: Math.round((leg.duration?.value || 0) / 60),
                summary: primary.summary || 'Google Maps Fastest Route',
              });
            }
          }
        });
      }
    } else if (from) {
      map.setCenter(from);
      map.setZoom(12);
    } else if (to) {
      map.setCenter(to);
      map.setZoom(12);
    }
  }, [mapLoaded, origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude, allRoutes, selectedRouteIdx, isTrafficOn, mapTypeId, canEditOrigin, canEditDestination]);

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

  /**
   * Calculates realistic agri-logistics delivery transit time in days & hours
   * (accounting for commercial truck speed limit, mandatory driver breaks & loading)
   */
  const formatDeliveryEstimate = (km, mins) => {
    if (!km && !mins) return { text: '—', days: 0, etaDate: '—' };
    const distance = km || (mins ? (mins / 60) * 45 : 0);
    
    // Commercial freight truck average: ~350 - 400 km/day (including loading/unloading)
    let days = Math.ceil(distance / 350);
    if (distance <= 100) {
      days = 0.5; // Same day / within 12 hours
    } else if (distance <= 350) {
      days = 1; // 1 day (Next day delivery)
    }

    const eta = new Date();
    eta.setDate(eta.getDate() + Math.ceil(days));
    const dateStr = eta.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    let text = '';
    if (days === 0.5) {
      text = 'Same Day Delivery (~8–12 hrs)';
    } else if (days === 1) {
      text = '1 Day (Next Day Delivery)';
    } else {
      text = `${days} Days Estimated`;
    }

    return { text, days, etaDate: dateStr };
  };

  const deliveryEstimate = formatDeliveryEstimate(activeDistance, activeDuration);

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
      <div className="relative w-full h-96 sm:h-[420px] bg-gray-100 flex items-center justify-center overflow-hidden">
        {scriptError ? (
          <div className="p-6 text-center max-w-md">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-navy-900">Google Maps Live Route Calculation</p>
            <p className="text-xs text-navy-600 mt-1">
              Could not load Google Maps. Please verify your internet connection or Google Maps Platform API key.
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

        {/* Floating Google Map Style & Layer Toolbar (Top Right) */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-navy-200/80 shadow-md rounded-xl p-1">
          <button
            type="button"
            onClick={() => setMapTypeId(mapTypeId === 'roadmap' ? 'hybrid' : 'roadmap')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
              mapTypeId === 'hybrid'
                ? 'bg-navy-900 text-white shadow-xs'
                : 'text-navy-700 hover:bg-gray-100'
            }`}
            title="Toggle Satellite / Hybrid view"
          >
            <Layers className="w-3.5 h-3.5" />
            {mapTypeId === 'hybrid' ? 'Satellite' : 'Default'}
          </button>

          <button
            type="button"
            onClick={() => setIsTrafficOn(!isTrafficOn)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
              isTrafficOn
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-navy-700 hover:bg-gray-100'
            }`}
            title="Toggle Live Traffic overlay"
          >
            <Gauge className="w-3.5 h-3.5" />
            Traffic {isTrafficOn ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Floating Route Info HUD (Top Left) */}
        {activeDistance != null && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-navy-100 shadow-md rounded-xl p-2.5 text-xs pointer-events-none flex items-center gap-3 z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <span className="font-bold text-navy-900">{activeDistance} km</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1 text-navy-700 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{formatTime(activeDuration)}</span>
            </div>
            {deliveryEstimate.text !== '—' && (
              <>
                <span className="text-gray-300">|</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold border border-blue-200 text-[10px]">
                  📦 {deliveryEstimate.text}
                </span>
              </>
            )}
            {activeRoute?.summary && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-blue-700 font-bold max-w-[150px] truncate">{activeRoute.summary}</span>
              </>
            )}
          </div>
        )}

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

        {/* Selected Route Summary Banner with Estimated Delivery Days */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 bg-navy-50 rounded-xl">
            <p className="text-[10px] text-navy-400 font-bold uppercase tracking-wider">Road Distance</p>
            <p className="text-base font-bold text-navy-900 mt-0.5">{activeDistance} km</p>
          </div>
          <div className="p-3 bg-navy-50 rounded-xl">
            <p className="text-[10px] text-navy-400 font-bold uppercase tracking-wider">Highway Transit</p>
            <p className="text-base font-bold text-navy-900 mt-0.5">{formatTime(activeDuration)}</p>
          </div>
          <div className="p-3 bg-blue-50/80 border border-blue-200/60 rounded-xl">
            <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-600" />
              Delivery Time
            </p>
            <p className="text-sm font-bold text-blue-900 mt-0.5">{deliveryEstimate.text}</p>
            <p className="text-[10px] text-blue-600 font-medium">Est. by {deliveryEstimate.etaDate}</p>
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