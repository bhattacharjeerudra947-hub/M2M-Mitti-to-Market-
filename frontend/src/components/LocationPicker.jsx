import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin, Navigation, AlertCircle, Check, Loader2, Info,
  Search, Crosshair, CheckCircle2, Globe, Map as MapIcon
} from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { geocodeAddress } from '../api/locationApi';
import { useGoogleMaps } from '../utils/googleMapsLoader';

/**
 * LocationPicker Component
 *
 * Designed to strictly follow the Mitti2Market exact flow:
 *
 * 1. [ Use Saved Location ] (Registered Profile Location default)
 * 2. [ Use Current Location ] (Browser GPS + Reverse Geocoding)
 * 3. [ Search Location ] (Google Maps Autocomplete / Places search)
 * 4. [ Choose on Map ] (Interactive Map Click & Drag + Reverse Geocode)
 */
export default function LocationPicker({
  label = 'Location',
  type = 'pickup', // 'pickup' | 'delivery'
  role = 'Farmer', // 'Farmer' | 'Buyer'
  registeredAddress = '',
  registeredCoords = null, // { latitude, longitude }
  value = null,            // { source, latitude, longitude, address }
  onChange = () => {},
  disabled = false,
}) {
  const [source, setSource] = useState(value?.source || 'REGISTERED');
  const { coords: geoCoords, requestLocation, isRequesting, isError, error: geoError } = useGeolocation();

  // Google Maps Platform loader hook
  const { isLoaded: isGoogleLoaded, loadError: googleLoadError } = useGoogleMaps();

  // Search & Places autocomplete
  const [searchQuery, setSearchQuery] = useState(value?.address || '');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Map Click Picker State
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapEngine, setMapEngine] = useState('GOOGLE'); // 'GOOGLE' | 'OPENSTREETMAP'
  const [mapPoint, setMapPoint] = useState(
    value?.latitude ? { lat: value.latitude, lng: value.longitude } : null
  );
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const pickerMapRef = useRef(null);
  const pickerMapInstanceRef = useRef(null);
  const leafletMapInstanceRef = useRef(null);
  const pickerMarkerRef = useRef(null);

  // 1. Attach Google Maps Places Autocomplete to the search input once Google Maps loads
  useEffect(() => {
    if (!isGoogleLoaded || !window.google?.maps?.places || !searchInputRef.current) return;
    if (autocompleteRef.current) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address', 'geometry', 'name', 'address_components'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const addr = place.formatted_address || place.name || searchQuery;

          setSource('SEARCHED');
          setSearchQuery(addr);
          setMapPoint({ lat, lng });

          onChange({
            source: 'SEARCHED',
            latitude: lat,
            longitude: lng,
            address: addr,
          });
        }
      });

      autocompleteRef.current = autocomplete;
    } catch {
      // Fallback to manual text search if places autocomplete fails
    }
  }, [window.google?.maps?.places, source]);

  // 3. Sync initial or registered coords when available
  useEffect(() => {
    if (source === 'REGISTERED') {
      onChange({
        source: 'REGISTERED',
        latitude: registeredCoords?.latitude || null,
        longitude: registeredCoords?.longitude || null,
        address: registeredAddress || '',
      });
      if (registeredCoords?.latitude) {
        setMapPoint({ lat: registeredCoords.latitude, lng: registeredCoords.longitude });
      }
    }
  }, [registeredAddress, registeredCoords?.latitude, registeredCoords?.longitude, source]);

  // 4. Reverse geocode helper (Google Maps Geocoder + Nominatim OpenStreetMap fallback)
  const reverseGeocode = (lat, lng, callback) => {
    let handled = false;
    if (window.google?.maps?.Geocoder) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            handled = true;
            callback(results[0].formatted_address);
          } else {
            fallbackReverseGeocode(lat, lng, callback);
          }
        });
      } catch {
        fallbackReverseGeocode(lat, lng, callback);
      }
    } else {
      fallbackReverseGeocode(lat, lng, callback);
    }
  };

  const fallbackReverseGeocode = async (lat, lng, callback) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.address?.suburb;
        const state = data.address?.state;
        const formatted = [city, state].filter(Boolean).join(', ') || data.display_name;
        if (formatted) {
          callback(formatted);
          return;
        }
      }
    } catch {}
    callback(`Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  };

  // 5. Handle "Use Saved Profile Location"
  const handleSelectSaved = () => {
    if (disabled) return;
    setSource('REGISTERED');
    onChange({
      source: 'REGISTERED',
      latitude: registeredCoords?.latitude || null,
      longitude: registeredCoords?.longitude || null,
      address: registeredAddress || '',
    });
    if (registeredCoords?.latitude) {
      setMapPoint({ lat: registeredCoords.latitude, lng: registeredCoords.longitude });
    }
  };

  // 6. Handle "Use Current Location" (Browser GPS + Reverse Geocode)
  const handleSelectCurrent = () => {
    if (disabled) return;
    setSource('LIVE');
    if (!geoCoords) {
      requestLocation();
    } else {
      reverseGeocode(geoCoords.latitude, geoCoords.longitude, (addr) => {
        setMapPoint({ lat: geoCoords.latitude, lng: geoCoords.longitude });
        onChange({
          source: 'LIVE',
          latitude: geoCoords.latitude,
          longitude: geoCoords.longitude,
          address: addr,
        });
      });
    }
  };

  // When GPS coords resolve
  useEffect(() => {
    if (source === 'LIVE' && geoCoords) {
      reverseGeocode(geoCoords.latitude, geoCoords.longitude, (addr) => {
        setMapPoint({ lat: geoCoords.latitude, lng: geoCoords.longitude });
        onChange({
          source: 'LIVE',
          latitude: geoCoords.latitude,
          longitude: geoCoords.longitude,
          address: addr,
        });
      });
    }
  }, [geoCoords, source]);

  // 7. Manual Text Search Fallback with Geocoder + Nominatim
  const handleSearchSubmit = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim() || disabled) return;
    setSearching(true);
    setSearchError('');

    try {
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: searchQuery.trim(), componentRestrictions: { country: 'IN' } }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            const loc = results[0].geometry.location;
            const lat = loc.lat();
            const lng = loc.lng();
            const addr = results[0].formatted_address || searchQuery.trim();

            setSource('SEARCHED');
            setMapPoint({ lat, lng });
            panActiveMap(lat, lng);
            onChange({
              source: 'SEARCHED',
              latitude: lat,
              longitude: lng,
              address: addr,
            });
            setSearching(false);
          } else {
            fallbackServerGeocode();
          }
        });
        return;
      }
      fallbackServerGeocode();
    } catch {
      fallbackServerGeocode();
    }
  };

  const panActiveMap = (lat, lng) => {
    if (pickerMapInstanceRef.current && typeof pickerMapInstanceRef.current.panTo === 'function') {
      try {
        pickerMapInstanceRef.current.panTo({ lat, lng });
        pickerMapInstanceRef.current.setZoom(15);
      } catch {}
    }
    if (leafletMapInstanceRef.current) {
      try {
        leafletMapInstanceRef.current.setView([lat, lng], 15);
      } catch {}
    }
  };

  const fallbackServerGeocode = async () => {
    try {
      const res = await geocodeAddress(searchQuery.trim());
      if (res?.latitude && res?.longitude) {
        setSource('SEARCHED');
        setMapPoint({ lat: res.latitude, lng: res.longitude });
        panActiveMap(res.latitude, res.longitude);
        onChange({
          source: 'SEARCHED',
          latitude: res.latitude,
          longitude: res.longitude,
          address: searchQuery.trim(),
        });
        setSearching(false);
        return;
      }
    } catch {}

    // Fallback: OpenStreetMap Nominatim Search
    try {
      const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(searchQuery.trim())}`);
      if (nomRes.ok) {
        const places = await nomRes.json();
        if (places && places.length > 0) {
          const lat = parseFloat(places[0].lat);
          const lng = parseFloat(places[0].lon);
          const addr = places[0].display_name;
          setSource('SEARCHED');
          setMapPoint({ lat, lng });
          setSearchQuery(addr);
          panActiveMap(lat, lng);
          onChange({
            source: 'SEARCHED',
            latitude: lat,
            longitude: lng,
            address: addr,
          });
          setSearching(false);
          return;
        }
      }
      setSearchError('Address not found. Please try another place, mandi, or city name.');
    } catch (err) {
      setSearchError(err?.message || 'Geocoding failed. Please check connection.');
    } finally {
      setSearching(false);
    }
  };

  // 8. Handle "Choose on Map" Modal Initialization (Dual Engine: Google Maps or OpenStreetMap via Leaflet)
  useEffect(() => {
    if (!showMapModal || !pickerMapRef.current) return;

    const initialCenter = mapPoint || (registeredCoords?.latitude
      ? { lat: registeredCoords.latitude, lng: registeredCoords.longitude }
      : { lat: 20.59, lng: 78.96 }); // India center

    // Clean up previous instances before mounting
    if (leafletMapInstanceRef.current) {
      try { leafletMapInstanceRef.current.remove(); } catch {}
      leafletMapInstanceRef.current = null;
    }
    pickerMapInstanceRef.current = null;
    pickerMapRef.current.innerHTML = '';

    if (mapEngine === 'OPENSTREETMAP' || !isGoogleLoaded || !window.google?.maps) {
      // ── OpenStreetMap Engine (Leaflet) ──
      const map = L.map(pickerMapRef.current, {
        center: [initialCenter.lat, initialCenter.lng],
        zoom: mapPoint || registeredCoords?.latitude ? 15 : 12,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      leafletMapInstanceRef.current = map;

      map.on('moveend', () => {
        const center = map.getCenter();
        setMapPoint({ lat: center.lat, lng: center.lng });
        setReverseGeocoding(true);
        reverseGeocode(center.lat, center.lng, (addr) => {
          setReverseGeocoding(false);
          setSearchQuery(addr);
        });
      });

      // Invalidate size after modal render
      setTimeout(() => {
        try { map.invalidateSize(); } catch {}
      }, 200);

      return () => {
        if (leafletMapInstanceRef.current) {
          try { leafletMapInstanceRef.current.remove(); } catch {}
          leafletMapInstanceRef.current = null;
        }
      };
    } else {
      // ── Google Maps Engine ──
      const map = new window.google.maps.Map(pickerMapRef.current, {
        center: initialCenter,
        zoom: mapPoint || registeredCoords?.latitude ? 15 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
      });
      pickerMapInstanceRef.current = map;

      // Auto dismiss Google error overlays if injected
      const dismissGoogleModal = () => {
        try {
          document.querySelectorAll('.gm-err-container, .dismissButton, button[jsaction*="dismiss"]').forEach(btn => {
            if (typeof btn.click === 'function') btn.click();
            btn.style.display = 'none';
          });
          document.querySelectorAll('.gm-style-pbc').forEach(p => { p.style.display = 'none'; });
        } catch {}
      };
      dismissGoogleModal();
      setTimeout(dismissGoogleModal, 150);
      setTimeout(dismissGoogleModal, 500);

      // Attach autocomplete inside modal if input exists
      if (window.google?.maps?.places && searchInputRef.current) {
        try {
          const modalAutocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
            componentRestrictions: { country: 'in' },
            fields: ['formatted_address', 'geometry', 'name', 'address_components'],
          });
          modalAutocomplete.addListener('place_changed', () => {
            const place = modalAutocomplete.getPlace();
            if (place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const addr = place.formatted_address || place.name || searchQuery;
              map.setCenter({ lat, lng });
              map.setZoom(16);
              setMapPoint({ lat, lng });
              setSearchQuery(addr);
            }
          });
        } catch {}
      }

      // Rapido style: as map moves (drag/pan), center coordinates update
      map.addListener('idle', () => {
        const center = map.getCenter();
        if (!center) return;
        const lat = center.lat();
        const lng = center.lng();
        setMapPoint({ lat, lng });
        setReverseGeocoding(true);
        reverseGeocode(lat, lng, (addr) => {
          setReverseGeocoding(false);
          setSearchQuery(addr);
        });
        dismissGoogleModal();
      });
    }
  }, [showMapModal, isGoogleLoaded, mapEngine]);

  // Center on current GPS inside modal
  const handleModalCurrentLocation = () => {
    if (navigator.geolocation) {
      setReverseGeocoding(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (pickerMapInstanceRef.current) {
            try {
              pickerMapInstanceRef.current.setCenter({ lat, lng });
              pickerMapInstanceRef.current.setZoom(16);
            } catch {}
          }
          if (leafletMapInstanceRef.current) {
            try {
              leafletMapInstanceRef.current.setView([lat, lng], 16);
            } catch {}
          }
          setMapPoint({ lat, lng });
          reverseGeocode(lat, lng, (addr) => {
            setReverseGeocoding(false);
            setSearchQuery(addr);
          });
        },
        () => {
          setReverseGeocoding(false);
          setSearchError('Location permission denied. Please search or move the map.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const handleConfirmModalLocation = () => {
    if (mapPoint) {
      setSource('MAP_CHOSEN');
      onChange({
        source: 'MAP_CHOSEN',
        latitude: mapPoint.lat,
        longitude: mapPoint.lng,
        address: searchQuery || `${mapPoint.lat.toFixed(4)}, ${mapPoint.lng.toFixed(4)}`,
      });
    }
    setShowMapModal(false);
  };

  const isPickup = type === 'pickup';

  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm transition ${
      disabled ? 'border-gray-200 bg-gray-50/70' : 'border-navy-100 hover:border-blue-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-navy-50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
            isPickup ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}>
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-navy-900">
              {isPickup ? 'Farmer Pickup Location' : 'Business Delivery Location'}
            </h4>
            <p className="text-xs text-navy-500 font-medium">
              {role} {disabled ? '· Confirmed Location' : '· Select your pickup/delivery address'}
            </p>
          </div>
        </div>

        <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
          source === 'LIVE'
            ? 'bg-purple-100 text-purple-800 border border-purple-200'
            : source === 'SEARCHED' || source === 'MAP_CHOSEN'
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
        }`}>
          {source === 'LIVE' ? '📡 LIVE GPS' : source === 'MAP_CHOSEN' ? '📍 PINNED ON MAP' : '🏠 REGISTERED'}
        </span>
      </div>

      {!disabled ? (
        <div className="space-y-3.5">
          {/* Main Current Address Card (Rapido / Uber / Swiggy Style) */}
          <div
            onClick={() => setShowMapModal(true)}
            className="group cursor-pointer p-3.5 rounded-xl border border-navy-200 hover:border-blue-500 bg-navy-50/50 hover:bg-blue-50/40 transition shadow-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 text-sm shadow-xs ${
                isPickup ? 'bg-emerald-600' : 'bg-rose-600'
              }`}>
                {isPickup ? 'A' : 'B'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block">
                  {isPickup ? 'Farm / Mandi / Pickup Point' : 'Store / Warehouse / Delivery Point'}
                </span>
                <p className="text-sm font-bold text-navy-900 truncate mt-0.5">
                  {value?.address || searchQuery || 'Click to search or pick on map...'}
                </p>
                {value?.latitude && (
                  <span className="text-[10px] font-mono text-navy-500">
                    Coords: {Number(value.latitude).toFixed(4)}, {Number(value.longitude).toFixed(4)}
                  </span>
                )}
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-blue-600 group-hover:bg-blue-500 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm transition">
              <Search className="w-3.5 h-3.5" />
              <span>Change</span>
            </div>
          </div>

          {/* User-Friendly 1-Click Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Live GPS button */}
            <button
              type="button"
              onClick={handleSelectCurrent}
              disabled={isRequesting}
              className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 text-xs font-semibold ${
                source === 'LIVE'
                  ? 'bg-purple-50 border-purple-300 text-purple-900 ring-2 ring-purple-400/30'
                  : 'bg-white border-navy-200 hover:border-purple-300 hover:bg-purple-50/40 text-navy-800'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <Navigation className={`w-4 h-4 text-purple-700 ${isRequesting ? 'animate-spin' : ''}`} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-bold text-navy-900">Current GPS</span>
                <span className="text-[10px] text-navy-500 truncate block">Detect my location</span>
              </div>
            </button>

            {/* 2. Choose on Map Modal Button */}
            <button
              type="button"
              onClick={() => setShowMapModal(true)}
              className="p-3 rounded-xl border border-navy-200 hover:border-blue-400 bg-white hover:bg-blue-50/40 text-navy-800 text-xs font-semibold flex items-center gap-2.5 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Crosshair className="w-4 h-4 text-blue-700" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-bold text-navy-900">Search on Map</span>
                <span className="text-[10px] text-navy-500 truncate block">Search mandi, town</span>
              </div>
            </button>
          </div>

          {/* Saved Profile Location shortcut */}
          {registeredAddress && (
            <button
              type="button"
              onClick={handleSelectSaved}
              className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between text-xs ${
                source === 'REGISTERED'
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 ring-1 ring-emerald-400/30'
                  : 'bg-gray-50/60 border-navy-100 hover:bg-gray-100 text-navy-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Check className={`w-4 h-4 shrink-0 ${source === 'REGISTERED' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="font-semibold truncate">Use Saved Profile Address: {registeredAddress}</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                Profile
              </span>
            </button>
          )}

          {/* Error notification if GPS failed */}
          {geoError && source === 'LIVE' && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>GPS permission not enabled. Click "Search on Map" to select your address instead.</span>
            </div>
          )}
        </div>
      ) : (
        /* Read-Only State for counterpart */
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
          <div className="flex items-center gap-2 text-navy-900 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{value?.address || registeredAddress || 'Awaiting location from counterpart'}</span>
          </div>
          {value?.latitude && (
            <p className="text-[10px] font-mono text-navy-500 pl-6">
              Coordinates: [{Number(value.latitude).toFixed(4)}, {Number(value.longitude).toFixed(4)}]
            </p>
          )}
        </div>
      )}

      {/* Selected Location Confirmation Pill */}
      {value?.latitude && (
        <div className="mt-3 p-2.5 bg-navy-50/70 border border-navy-100 rounded-xl flex items-center justify-between text-xs">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] uppercase font-bold text-navy-400 block">Confirmed {role} Point:</span>
            <span className="font-semibold text-navy-900 truncate block text-xs">
              {value?.address || searchQuery || 'Pinned Location'}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ready
          </span>
        </div>
      )}

      {/* ════════ RAPIDO-STYLE INTERACTIVE LOCATION MODAL ════════ */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl border border-navy-100 shadow-2xl max-w-2xl w-full flex flex-col h-[90vh] max-h-[680px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Top Search Header (Rapido Style) */}
            <div className="p-4 bg-navy-900 text-white border-b border-navy-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isPickup ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {isPickup ? 'A' : 'B'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      {isPickup ? 'Select Pickup Location' : 'Select Delivery Location'}
                    </h3>
                    <p className="text-[11px] text-gray-300">
                      Search place, city, mandi or drag the map pin like Rapido
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-navy-800 p-0.5 rounded-lg text-[10px] font-semibold border border-navy-700">
                    <button
                      type="button"
                      onClick={() => setMapEngine('GOOGLE')}
                      className={`px-2 py-1 rounded-md transition ${
                        mapEngine === 'GOOGLE'
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Google Maps
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapEngine('OPENSTREETMAP')}
                      className={`px-2 py-1 rounded-md transition ${
                        mapEngine === 'OPENSTREETMAP'
                          ? 'bg-emerald-600 text-white font-bold shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      OpenStreetMap
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMapModal(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Rapido Live Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-navy-400">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search locality, mandi, landmark or pin code..."
                  className="w-full pl-9 pr-24 py-2.5 bg-white text-navy-900 rounded-xl text-xs font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  disabled={searching || !searchQuery.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                >
                  {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Search</span>}
                </button>
              </div>
            </div>

            {/* Map Canvas with Center Pin (Rapido Style) */}
            <div className="relative flex-1 bg-gray-100 overflow-hidden">
              <div ref={pickerMapRef} className="w-full h-full" />

              {mapEngine === 'GOOGLE' && !isGoogleLoaded && (
                <div className="absolute inset-0 bg-gray-100/90 flex flex-col items-center justify-center text-xs text-navy-600 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="font-semibold">Loading Map...</span>
                </div>
              )}

              {/* Center Pin Overlay (Fixed center pin like Rapido / Uber / Ola) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 -mt-8">
                <div className="flex flex-col items-center">
                  <div className="animate-bounce flex flex-col items-center drop-shadow-lg">
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-md ${
                      isPickup ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}>
                      {isPickup ? 'Pickup Here' : 'Deliver Here'}
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg text-white font-bold text-xs mt-1 ${
                      isPickup ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}>
                      <MapPin className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                  <div className="w-2.5 h-1 bg-black/40 rounded-full blur-[1px] mt-1" />
                </div>
              </div>

              {/* Floating "Locate Me" Button (Rapido Style) */}
              <button
                type="button"
                onClick={handleModalCurrentLocation}
                className="absolute bottom-4 right-4 z-20 p-3 bg-white text-navy-800 rounded-full shadow-lg border border-navy-100 hover:bg-gray-50 active:scale-95 transition flex items-center justify-center group"
                title="Locate Me (Current GPS)"
              >
                <Navigation className={`w-5 h-5 text-blue-600 group-hover:scale-110 transition ${reverseGeocoding ? 'animate-spin' : ''}`} />
              </button>

              {/* Geocoding indicator */}
              {reverseGeocoding && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-navy-200 text-xs font-semibold text-navy-800 shadow-md flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Fetching address...</span>
                </div>
              )}
            </div>

            {/* Bottom Sheet Action (Rapido Style) */}
            <div className="p-4 bg-white border-t border-navy-100 shadow-lg space-y-3 z-20">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 font-bold ${
                  isPickup ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-navy-400 block">
                    {isPickup ? 'Confirmed Pickup Point' : 'Confirmed Delivery Point'}
                  </span>
                  <p className="text-xs font-bold text-navy-900 truncate">
                    {searchQuery || 'Moving pin on map...'}
                  </p>
                  {mapPoint && (
                    <p className="text-[10px] font-mono text-navy-500 mt-0.5">
                      GPS: [{mapPoint.lat.toFixed(4)}, {mapPoint.lng.toFixed(4)}]
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="flex-1 py-2.5 border border-navy-200 hover:bg-gray-50 text-navy-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModalLocation}
                  className={`flex-2 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 ${
                    isPickup ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Location</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}