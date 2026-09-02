import { useState, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Navigation, Zap, Clock, Route as RouteIcon,
  Search, ChevronDown, ChevronUp, Target,
} from 'lucide-react';
import { useFarmerLanguage } from '../context/FarmerContext';
import { t_key } from '../data/farmerTranslations';

/* ─────────────────────────────────────────────
   DEMO DATA (Replace with real API data)
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

const DEMO_ROUTES = [
  {
    id: 'fastest',
    name: 'Fastest Route',
    nameHi: 'सबसे तेज़ मार्ग',
    distance: '12.4 km',
    distanceNum: 12.4,
    time: '32 min',
    stops: 3,
    efficiency: 0.85,
    color: '#16a34a',
    coordinates: [
      [20.0059, 73.7945], [20.0020, 73.7910], [19.9975, 73.7898],
    ],
  },
  {
    id: 'shortest',
    name: 'Shortest Route',
    nameHi: 'सबसे छोटा मार्ग',
    distance: '10.8 km',
    distanceNum: 10.8,
    time: '38 min',
    stops: 2,
    efficiency: 0.72,
    color: '#3c61a8',
    coordinates: [
      [20.0059, 73.7945], [19.9990, 73.7920], [19.9975, 73.7898],
    ],
  },
  {
    id: 'optimized',
    name: 'Optimized Collection Route',
    nameHi: 'अनुकूलित संग्रह मार्ग',
    distance: '15.2 km',
    distanceNum: 15.2,
    time: '35 min',
    stops: 4,
    efficiency: 0.94,
    color: '#d4a017',
    coordinates: [
      [20.0059, 73.7945], [19.9872, 73.8134], [20.0213, 73.7764],
      [20.0020, 73.7910], [19.9975, 73.7898],
    ],
  },
];

function createIcon(emoji, size = 28) {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;text-align:center">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: '',
  });
}

/* ──────────── Map event handler ──────────── */
function MapEventsHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick?.(e.latlng) });
  return null;
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */

export default function MapRouteOptimizer() {
  const { language } = useFarmerLanguage();
  const [selectedFarmers, setSelectedFarmers] = useState([]);
  const [destination, setDestination] = useState(null);
  const [activeRoute, setActiveRoute] = useState('optimized');
  const [showComparison, setShowComparison] = useState(false);
  const [showFarmerList, setShowFarmerList] = useState(false);
  const [showDestList, setShowDestList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [optimizedOrder, setOptimizedOrder] = useState(null);

  const mapCenter = useMemo(() => [20.00, 73.79], []);

  const toggleFarmer = useCallback((farmer) => {
    setSelectedFarmers((prev) => {
      const exists = prev.find((f) => f.id === farmer.id);
      if (exists) return prev.filter((f) => f.id !== farmer.id);
      return [...prev, farmer];
    });
  }, []);

  const optimizeRoute = useCallback(() => {
    if (selectedFarmers.length < 2) return;
    // Simple nearest-neighbor optimization
    const remaining = [...selectedFarmers];
    const ordered = [remaining.shift()];
    while (remaining.length > 0) {
      const last = ordered[ordered.length - 1];
      let nearest = remaining[0];
      let minDist = Infinity;
      for (const f of remaining) {
        const d = Math.hypot(f.lat - last.lat, f.lng - last.lng);
        if (d < minDist) { minDist = d; nearest = f; }
      }
      ordered.push(nearest);
      remaining.splice(remaining.indexOf(nearest), 1);
    }
    setOptimizedOrder(ordered);
  }, [selectedFarmers]);

  const bounds = useMemo(() => {
    const points = [
      ...selectedFarmers.map((f) => [f.lat, f.lng]),
      ...(destination ? [[destination.lat, destination.lng]] : []),
    ];
    return points.length > 0 ? points : [[20.00, 73.79]];
  }, [selectedFarmers, destination]);

  const activeRouteData = DEMO_ROUTES.find((r) => r.id === activeRoute);
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{t_key(language, 'routeOptimization') || 'Route Optimization'}</h3>
            <p className="text-xs text-primary-100">{t_key(language, 'routeDesc') || 'Find & optimize routes between farms, mandis & markets'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar controls */}
        <div className="lg:w-80 p-4 border-b lg:border-b-0 lg:border-r border-navy-100 space-y-4">
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
              <div className="mt-2 space-y-1">
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

          {/* Optimize button */}
          <button
            onClick={optimizeRoute}
            disabled={selectedFarmers.length < 2}
            className="w-full py-3 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Zap className="w-4 h-4" />
            {t_key(language, 'optimizeRoute') || 'Optimize Route'}
          </button>

          {/* Optimized order */}
          {optimizedOrder && (
            <div className="p-3 bg-mustard-50 rounded-xl border border-mustard-200">
              <p className="text-[10px] font-semibold text-mustard-700 uppercase mb-2">
                {t_key(language, 'optimizedOrder') || 'Optimized Pickup Order'}
              </p>
              <div className="space-y-1.5">
                {optimizedOrder.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-white border border-mustard-300 flex items-center justify-center text-[10px] font-bold text-mustard-700">
                      {i + 1}
                    </span>
                    <span className="text-navy-800 font-medium">{f.name}</span>
                    <span className="text-navy-400">→</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-xs text-primary-700 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[10px]">🎯</span>
                  <span>{destination?.name || 'Destination'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="flex-1 min-h-[400px] lg:min-h-[500px] relative">
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: '100%', minHeight: 400 }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds bounds={bounds} />

            {/* Farmer markers */}
            {selectedFarmers.map((farmer) => (
              <Marker key={farmer.id} position={[farmer.lat, farmer.lng]} icon={createIcon(farmer.emoji)}>
                <Popup><div className="text-xs font-semibold">{farmer.name}<br/>{farmer.crops.join(', ')}</div></Popup>
              </Marker>
            ))}

            {/* Destination marker */}
            {destination && (
              <Marker position={[destination.lat, destination.lng]} icon={createIcon(destination.emoji, 32)}>
                <Popup><div className="text-xs font-semibold">{destination.name}</div></Popup>
              </Marker>
            )}

            {/* Route polyline */}
            {activeRouteData && selectedFarmers.length > 0 && destination && (
              <Polyline
                positions={activeRouteData.coordinates.length > 2
                  ? activeRouteData.coordinates
                  : [...selectedFarmers.map((f) => [f.lat, f.lng]), [destination.lat, destination.lng]]
                }
                pathOptions={{ color: activeRouteData.color, weight: 3, opacity: 0.8, dashArray: activeRoute.id === 'optimized' ? '' : '8 6' }}
              />
            )}
          </MapContainer>

          {/* Route comparison floating card */}
          {selectedFarmers.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-72 bg-white rounded-xl shadow-xl border border-navy-100 overflow-hidden z-[1000]">
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="w-full flex items-center justify-between p-3 bg-navy-900 text-white"
              >
                <div className="flex items-center gap-2">
                  <RouteIcon className="w-4 h-4 text-mustard-400" />
                  <span className="text-xs font-bold">{t_key(language, 'routeComparison') || 'Route Comparison'}</span>
                </div>
                {showComparison ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              {showComparison && (
                <div className="p-2 space-y-1.5">
                  {DEMO_ROUTES.map((route) => (
                    <button
                      key={route.id}
                      onClick={() => setActiveRoute(route.id)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition ${
                        activeRoute === route.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-navy-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-navy-800">{route.name}</span>
                        {activeRoute === route.id && <span className="text-[10px] text-primary-600 font-bold">● ACTIVE</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-navy-500">
                        <span className="flex items-center gap-1"><RouteIcon className="w-3 h-3" />{route.distance}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{route.time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{route.stops}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[10px] text-navy-400">Efficiency</span>
                        <div className="flex-1 h-1 bg-navy-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${route.efficiency * 100}%`, background: route.color }} />
                        </div>
                        <span className="text-[10px] font-medium" style={{ color: route.color }}>{Math.round(route.efficiency * 100)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!showComparison && (
                <div className="p-3 text-xs text-navy-500">
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: activeRouteData?.color }}>{activeRouteData?.distance}</span>
                    <span>•</span>
                    <span>{activeRouteData?.time}</span>
                    <span>•</span>
                    <span>{activeRouteData?.stops} stops</span>
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
