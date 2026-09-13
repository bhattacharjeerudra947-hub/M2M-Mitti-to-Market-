import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Search, Navigation, Check, X, Loader2, AlertCircle, Home, CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { geocodeAddress, setDealLocations } from '../api/locationApi';

export default function InlineLocationPicker({
  deal,
  type = 'delivery', // 'delivery' | 'pickup'
  onSaved = () => {},
  onCancel = () => {},
}) {
  const { user } = useAuth();
  const isPickup = type === 'pickup';

  // Determine initial coordinates and address from deal or registered profile
  const initialLat = isPickup 
    ? (deal?.pickupLatitude || user?.latitude || 20.5937)
    : (deal?.deliveryLatitude || user?.latitude || 20.5937);
  const initialLng = isPickup 
    ? (deal?.pickupLongitude || user?.longitude || 78.9629)
    : (deal?.deliveryLongitude || user?.longitude || 78.9629);
  const initialAddress = isPickup 
    ? (deal?.pickupLocation || user?.location || user?.address || '')
    : (deal?.deliveryLocation || user?.location || user?.address || '');

  const [coords, setCoords] = useState({ lat: Number(initialLat), lng: Number(initialLng) });
  const [address, setAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [searching, setSearching] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Reverse geocode lat, lng to human readable address
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.address?.suburb;
        const state = data.address?.state;
        const formatted = [city, state].filter(Boolean).join(', ') || data.display_name;
        if (formatted) {
          setAddress(formatted);
          setSearchQuery(formatted);
          return formatted;
        }
      }
    } catch {
      // ignore
    }
    const fallback = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    setAddress(fallback);
    setSearchQuery(fallback);
    return fallback;
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const hasSpecificCoords = (isPickup ? deal?.pickupLatitude : deal?.deliveryLatitude) || user?.latitude;
    const zoomLevel = hasSpecificCoords ? 14 : 5;

    const map = L.map(mapContainerRef.current, {
      center: [coords.lat, coords.lng],
      zoom: zoomLevel,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false, // Don't trap mouse wheel scrolling inside map
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const markerColor = isPickup ? '#059669' : '#e11d48';
    const markerLetter = isPickup ? 'P' : 'D';
    const pinIcon = L.divIcon({
      html: `<div style="width:32px;height:32px;background:${markerColor};border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;box-shadow:0 3px 8px rgba(0,0,0,0.35);">${markerLetter}</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([coords.lat, coords.lng], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);

    marker.on('dragend', async () => {
      const position = marker.getLatLng();
      setCoords({ lat: position.lat, lng: position.lng });
      await reverseGeocode(position.lat, position.lng);
    });

    map.on('click', async (e) => {
      marker.setLatLng(e.latlng);
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      await reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 250);

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [type]);

  const updateMapPosition = (lat, lng, newAddr) => {
    setCoords({ lat, lng });
    if (newAddr) {
      setAddress(newAddr);
      setSearchQuery(newAddr);
    }
    if (mapInstanceRef.current && markerRef.current) {
      try {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.setView([lat, lng], 15);
      } catch {}
    }
  };

  // Search address handler
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError('');

    try {
      // 1. Try server geocode
      const serverRes = await geocodeAddress(searchQuery.trim());
      if (serverRes?.latitude && serverRes?.longitude) {
        updateMapPosition(Number(serverRes.latitude), Number(serverRes.longitude), serverRes.formattedAddress || searchQuery.trim());
        setSearching(false);
        return;
      }
    } catch {}

    // 2. Fallback to OpenStreetMap Nominatim
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(searchQuery.trim())}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (nomRes.ok) {
        const places = await nomRes.json();
        if (places && places.length > 0) {
          const lat = parseFloat(places[0].lat);
          const lng = parseFloat(places[0].lon);
          updateMapPosition(lat, lng, places[0].display_name);
          setSearching(false);
          return;
        }
      }
      setError('Location not found. Please try another mandi, city, or landmark name.');
    } catch {
      setError('Geocoding service unavailable. You can click directly on the map to pin your location.');
    } finally {
      setSearching(false);
    }
  };

  // GPS Current Location Handler
  const handleGpsLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingGps(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocatingGps(false);
        const detectedAddr = await reverseGeocode(lat, lng);
        updateMapPosition(lat, lng, detectedAddr);
      },
      () => {
        setLocatingGps(false);
        setError('Location access denied. Please search or tap on the map.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Use registered profile location
  const handleUseProfileAddress = () => {
    const profileAddr = user?.location || user?.address;
    if (!profileAddr && !user?.latitude) {
      setError('No saved profile location found on your account.');
      return;
    }
    if (user?.latitude && user?.longitude) {
      updateMapPosition(Number(user.latitude), Number(user.longitude), profileAddr || address);
    } else if (profileAddr) {
      setSearchQuery(profileAddr);
      handleSearch();
    }
  };

  // Save confirmed location to backend
  const handleSaveLocation = async () => {
    if (!coords.lat || !coords.lng) {
      setError('Please choose a valid location on the map.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        origin: isPickup 
          ? { latitude: coords.lat, longitude: coords.lng } 
          : (deal?.pickupLatitude ? { latitude: deal.pickupLatitude, longitude: deal.pickupLongitude } : undefined),
        originAddress: isPickup ? (address || searchQuery) : deal?.pickupLocation,
        originSource: isPickup ? 'LIVE' : 'REGISTERED',
        destination: !isPickup 
          ? { latitude: coords.lat, longitude: coords.lng } 
          : (deal?.deliveryLatitude ? { latitude: deal.deliveryLatitude, longitude: deal.deliveryLongitude } : undefined),
        destinationAddress: !isPickup ? (address || searchQuery) : deal?.deliveryLocation,
        destinationSource: !isPickup ? 'LIVE' : 'REGISTERED',
      };

      const res = await setDealLocations(deal.id, payload);
      setSuccess(`${isPickup ? 'Pickup' : 'Delivery'} location confirmed successfully!`);
      setTimeout(() => {
        onSaved(res);
      }, 900);
    } catch (err) {
      setError(err?.message || 'Failed to save location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-emerald-300 rounded-2xl p-3.5 shadow-sm space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs ${
            isPickup ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-navy-900">
              {isPickup ? 'Set Produce Pickup Location' : 'Set Produce Delivery Location'}
            </h4>
            <p className="text-[10px] text-gray-500">
              Search or tap on the map to pin the exact {isPickup ? 'collection' : 'unloading'} point
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          title="Close Map"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Address Search & Quick Buttons */}
      <form onSubmit={handleSearch} className="flex gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isPickup ? 'Search farm, mandi, village, town...' : 'Search warehouse, store, landmark, city...'}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-navy-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-3 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shrink-0"
        >
          {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          <span>Search</span>
        </button>
      </form>

      {/* Quick Location Shortcuts */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGpsLocation}
          disabled={locatingGps}
          className="flex-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition"
        >
          {locatingGps ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
          <span>My GPS Location</span>
        </button>

        {(user?.location || user?.address) && (
          <button
            type="button"
            onClick={handleUseProfileAddress}
            className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition"
          >
            <Home className="w-3 h-3 text-emerald-600" />
            <span className="truncate">Saved Profile Address</span>
          </button>
        )}
      </div>

      {/* Inline Leaflet Map Container */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 h-56 sm:h-64 w-full shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute top-2 left-2 z-[400] bg-white/90 backdrop-blur-xs px-2 py-1 rounded-md shadow-xs text-[10px] text-gray-600 font-medium pointer-events-none">
          📍 Drag marker or click map to adjust
        </div>
      </div>

      {/* Selected Address Display Card */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 flex items-start justify-between gap-2 text-xs">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
            Selected {isPickup ? 'Pickup' : 'Delivery'} Point:
          </span>
          <p className="font-semibold text-navy-900 truncate mt-0.5" title={address || searchQuery}>
            {address || searchQuery || 'Pin placed on map'}
          </p>
          <span className="text-[10px] font-mono text-gray-500">
            Coordinates: [{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}]
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
          Ready
        </span>
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveLocation}
          disabled={saving}
          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving Location...
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              Confirm & Save {isPickup ? 'Pickup' : 'Delivery'} Location
            </>
          )}
        </button>
      </div>
    </div>
  );
}
