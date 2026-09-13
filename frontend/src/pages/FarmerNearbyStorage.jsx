import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api';
import { useGoogleMaps } from '../utils/googleMapsLoader';
import {
  Warehouse,
  MapPin,
  Search,
  Navigation,
  Phone,
  ShieldCheck,
  Snowflake,
  ExternalLink,
  Loader2,
  RefreshCw,
  Info,
  CheckCircle2
} from 'lucide-react';

export default function FarmerNearbyStorage() {
  const { user } = useAuth();
  const { isLoaded: mapsLoaded } = useGoogleMaps();

  // Location search priority:
  // 1. Farmer saved district/location from profile
  // 2. Manual search input
  // 3. Current GPS location (only when farmer clicks button)
  const defaultDistrict = user?.district || user?.location || 'Pune';
  const [districtQuery, setDistrictQuery] = useState(defaultDistrict);
  const [activeLocationName, setActiveLocationName] = useState(defaultDistrict);
  const [coordinates, setCoordinates] = useState({
    latitude: user?.latitude || 18.5204,
    longitude: user?.longitude || 73.8567,
  });

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PARTNER' | 'COLD_STORAGE'

  const mapRef = useRef(null);
  const googleMapInstance = useRef(null);
  const markersRef = useRef([]);

  // Fetch facilities from backend
  const fetchFacilities = async (lat, lng, query, district) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (lat && lng) {
        params.append('latitude', lat);
        params.append('longitude', lng);
      }
      if (query) params.append('query', query);
      if (district) params.append('district', district);

      const res = await apiGet(`/api/storage/nearby?${params.toString()}`);
      setFacilities(Array.isArray(res) ? res : []);
      if (res && res.length > 0) {
        setSelectedFacility(res[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load storage facilities');
    } finally {
      setLoading(false);
    }
  };

  // Initial load based on farmer profile
  useEffect(() => {
    const lat = user?.latitude || 18.5204;
    const lng = user?.longitude || 73.8567;
    const dist = user?.district || user?.location || 'Pune';
    setDistrictQuery(dist);
    setActiveLocationName(dist);
    setCoordinates({ latitude: lat, longitude: lng });
    fetchFacilities(lat, lng, null, dist);
  }, [user]);

  // Handle manual search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!districtQuery.trim()) return;
    setActiveLocationName(districtQuery.trim());
    fetchFacilities(null, null, districtQuery.trim(), districtQuery.trim());
  };

  // Handle explicit one-time GPS location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoordinates({ latitude: lat, longitude: lng });
        setActiveLocationName('Your Current GPS Location');
        setDistrictQuery('');
        setGpsLoading(false);
        fetchFacilities(lat, lng, null, null);
      },
      (err) => {
        setGpsLoading(false);
        alert('Could not obtain your GPS location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Render Google Map
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || !window.google?.maps) return;

    const center = coordinates.latitude && coordinates.longitude
      ? { lat: coordinates.latitude, lng: coordinates.longitude }
      : { lat: 18.5204, lng: 73.8567 };

    if (!googleMapInstance.current) {
      googleMapInstance.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
        ]
      });
    } else {
      googleMapInstance.current.setCenter(center);
    }

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Add user marker
    if (coordinates.latitude && coordinates.longitude) {
      const userMarker = new window.google.maps.Marker({
        position: center,
        map: googleMapInstance.current,
        title: activeLocationName,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#059669',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(userMarker);
    }

    // Add facility markers
    facilities.forEach((fac) => {
      if (!fac.latitude || !fac.longitude) return;

      const isPartner = fac.isPartnerHub;
      const marker = new window.google.maps.Marker({
        position: { lat: fac.latitude, lng: fac.longitude },
        map: googleMapInstance.current,
        title: fac.name,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: isPartner ? 6 : 5,
          fillColor: isPartner ? '#047857' : '#2563EB',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family: inherit; padding: 4px; max-width: 220px;">
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
              ${fac.name}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
              ${fac.address || ''}
            </div>
            ${fac.distanceKm ? `<div style="font-size: 11px; font-weight: 600; color: #059669;">📍 ${fac.distanceKm} km away</div>` : ''}
            ${fac.contactPhone ? `<div style="font-size: 11px; color: #2563eb; margin-top: 2px;">📞 ${fac.contactPhone}</div>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        setSelectedFacility(fac);
        infoWindow.open(googleMapInstance.current, marker);
      });

      markersRef.current.push(marker);
    });

  }, [mapsLoaded, facilities, coordinates, activeLocationName]);

  // Filter facilities
  const filteredFacilities = facilities.filter((f) => {
    if (activeTab === 'PARTNER') return f.isPartnerHub;
    if (activeTab === 'COLD_STORAGE') return (f.storageType || f.type)?.includes('COLD');
    return true;
  });

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Warehouse className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-bold text-navy-900">Nearby Cold Storage & Warehouses</h1>
              </div>
              <p className="text-xs text-navy-500">
                Discover verified agricultural cold storages, partner collection hubs, and grain warehouses near you.
              </p>
            </div>

            {/* Current Active Location Pill */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-navy-100 shadow-xs text-xs">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Search Focus</span>
                <span className="font-bold text-navy-900 truncate block">{activeLocationName || 'Pune'}</span>
              </div>
            </div>
          </div>

          {/* Search & Location Bar */}
          <div className="bg-white rounded-2xl border border-navy-100 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search by location/mandi/district */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={districtQuery}
                  onChange={(e) => setDistrictQuery(e.target.value)}
                  placeholder="Search city, district, or agricultural hub (e.g. Pune, Nashik, Khanna)..."
                  className="w-full pl-10 pr-24 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800 transition"
                >
                  Search
                </button>
              </form>

              {/* GPS Location Button */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={gpsLoading}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 text-emerald-600" />}
                Use My Current Location
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-gray-400 font-medium mr-1">Filter:</span>
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  activeTab === 'ALL'
                    ? 'bg-navy-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Facilities ({facilities.length})
              </button>
              <button
                onClick={() => setActiveTab('PARTNER')}
                className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                  activeTab === 'PARTNER'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Partner Hubs ({facilities.filter(f => f.isPartnerHub).length})
              </button>
              <button
                onClick={() => setActiveTab('COLD_STORAGE')}
                className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                  activeTab === 'COLD_STORAGE'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <Snowflake className="w-3.5 h-3.5" />
                Cold Storage ({facilities.filter(f => (f.storageType || f.type)?.includes('COLD')).length})
              </button>
            </div>
          </div>

          {/* Interactive Layout: Left Map, Right Facility Cards */}
          <div className="grid lg:grid-cols-12 gap-6">

            {/* Map Preview Column (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-4 sticky top-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-navy-900 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Interactive Facility Map
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {facilities.length} locations plotted
                  </span>
                </div>

                <div
                  ref={mapRef}
                  className="w-full h-80 sm:h-96 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden relative"
                >
                  {!mapsLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400 text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading Google Maps...
                    </div>
                  )}
                </div>

                {/* Map Legend */}
                <div className="flex items-center justify-between pt-3 text-[11px] text-gray-500 border-t border-gray-100 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                    <span>M2M Verified Hub</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                    <span>External Cold Storage</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-800 inline-block ring-2 ring-emerald-200" />
                    <span>Your Location</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Facilities List Column (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {loading ? (
                <div className="bg-white rounded-2xl border border-navy-100 p-12 text-center shadow-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-navy-900">Locating nearby storage facilities...</p>
                  <p className="text-xs text-gray-400 mt-1">Checking partner hub availability & Google Places</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                  <p className="text-sm text-red-800 font-semibold">{error}</p>
                  <button
                    onClick={() => fetchFacilities(coordinates.latitude, coordinates.longitude, null, districtQuery)}
                    className="mt-3 px-4 py-2 bg-red-100 text-red-900 rounded-xl text-xs font-bold hover:bg-red-200"
                  >
                    Retry Search
                  </button>
                </div>
              ) : filteredFacilities.length === 0 ? (
                <div className="bg-white rounded-2xl border border-navy-100 p-12 text-center shadow-sm space-y-3">
                  <Warehouse className="w-12 h-12 text-gray-300 mx-auto" />
                  <h3 className="text-base font-bold text-navy-900">No facilities found near {activeLocationName}</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Try expanding your search query to a neighboring major district, or click "Use My Current Location" for GPS-based discovery.
                  </p>
                  <button
                    onClick={() => { setDistrictQuery('Pune'); fetchFacilities(null, null, null, 'Pune'); }}
                    className="px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-800"
                  >
                    View Major Maharashtra Hubs
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFacilities.map((fac) => {
                    const isSelected = selectedFacility?.id === fac.id;
                    const isPartner = fac.isPartnerHub;

                    return (
                      <div
                        key={fac.id}
                        onClick={() => setSelectedFacility(fac)}
                        className={`bg-white rounded-2xl border transition-all p-5 cursor-pointer shadow-xs hover:shadow-md ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                            : 'border-navy-100 hover:border-emerald-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-navy-900 text-base">{fac.name}</h3>
                              {isPartner && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-200">
                                  <ShieldCheck className="w-3 h-3" /> M2M Partner Hub
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
                                {fac.storageType || fac.type || 'COLD_STORAGE'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{fac.address || 'Address available upon booking'}</span>
                            </p>
                          </div>

                          {fac.distanceKm != null && (
                            <div className="text-right shrink-0">
                              <span className="text-sm font-black text-emerald-700 block">
                                {fac.distanceKm} km
                              </span>
                              <span className="text-[10px] text-gray-400">away</span>
                            </div>
                          )}
                        </div>

                        {/* Partner Capacity Gauge if available */}
                        {fac.totalCapacityKg != null && (
                          <div className="bg-gray-50 rounded-xl p-3 my-3 text-xs space-y-1.5">
                            <div className="flex justify-between font-semibold">
                              <span className="text-navy-600">Available Storage Capacity</span>
                              <span className="text-navy-900 font-bold">
                                {fac.availableCapacityKg ? fac.availableCapacityKg.toLocaleString() : fac.totalCapacityKg.toLocaleString()} kg
                                <span className="text-gray-400 font-normal ml-1">/ {fac.totalCapacityKg.toLocaleString()} kg</span>
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.max(0, ((fac.availableCapacityKg || fac.totalCapacityKg) / fac.totalCapacityKg) * 100))}%`
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Contact & Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
                          <div className="flex items-center gap-3">
                            {fac.contactPhone ? (
                              <a
                                href={`tel:${fac.contactPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                              >
                                <Phone className="w-3.5 h-3.5" /> {fac.contactPhone}
                              </a>
                            ) : (
                              <span className="text-gray-400 text-[11px]">Phone on verification</span>
                            )}
                            {fac.contactPerson && (
                              <span className="text-gray-500 text-[11px]">({fac.contactPerson})</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {fac.latitude && fac.longitude && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${fac.latitude},${fac.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-navy-800 rounded-lg text-xs font-semibold transition"
                              >
                                <Navigation className="w-3 h-3 text-gray-500" />
                                Directions
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
