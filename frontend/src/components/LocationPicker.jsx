import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertCircle, Check, Loader2, Info, Search } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { geocodeAddress } from '../api/locationApi';

/**
 * LocationPicker Component
 *
 * 3 Location Options:
 *   Option A: Registered Location (from profile)
 *   Option B: Live Location (via device GPS)
 *   Option C: Search Location (interactive address/city/village search & geocoding)
 */
export default function LocationPicker({
  label = 'Location',
  type = 'pickup', // 'pickup' | 'delivery'
  role = 'Farmer', // 'Farmer' | 'Buyer'
  registeredAddress = '',
  registeredCoords = null, // { latitude, longitude }
  value = null,            // { source: 'REGISTERED'|'LIVE'|'SEARCHED', latitude, longitude, address }
  onChange = () => {},
  disabled = false,
}) {
  const [source, setSource] = useState(value?.source || 'REGISTERED');
  const { status, coords, error, requestLocation, isRequesting, isError } = useGeolocation();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchedLocation, setSearchedLocation] = useState(null);

  // Sync initial or registered coords when available
  useEffect(() => {
    if (source === 'REGISTERED') {
      onChange({
        source: 'REGISTERED',
        latitude: registeredCoords?.latitude || null,
        longitude: registeredCoords?.longitude || null,
        address: registeredAddress || '',
      });
    }
  }, [registeredAddress, registeredCoords?.latitude, registeredCoords?.longitude, source]);

  // When live geolocation succeeds, propagate coordinates
  useEffect(() => {
    if (source === 'LIVE' && coords) {
      onChange({
        source: 'LIVE',
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: `Live Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
      });
    }
  }, [coords, source]);

  const handleSelectRegistered = () => {
    if (disabled) return;
    setSource('REGISTERED');
    onChange({
      source: 'REGISTERED',
      latitude: registeredCoords?.latitude || null,
      longitude: registeredCoords?.longitude || null,
      address: registeredAddress || '',
    });
  };

  const handleSelectLive = () => {
    if (disabled) return;
    setSource('LIVE');
    if (!coords) {
      requestLocation();
    } else {
      onChange({
        source: 'LIVE',
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: `Live Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
      });
    }
  };

  const handleSelectSearch = () => {
    if (disabled) return;
    setSource('SEARCHED');
    if (searchedLocation) {
      onChange({
        source: 'SEARCHED',
        latitude: searchedLocation.latitude,
        longitude: searchedLocation.longitude,
        address: searchedLocation.address,
      });
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');

    try {
      const res = await geocodeAddress(searchQuery.trim());
      if (res && res.latitude && res.longitude) {
        const found = {
          latitude: res.latitude,
          longitude: res.longitude,
          address: searchQuery.trim(),
        };
        setSearchedLocation(found);
        setSource('SEARCHED');
        onChange({
          source: 'SEARCHED',
          latitude: found.latitude,
          longitude: found.longitude,
          address: found.address,
        });
      } else {
        setSearchError('Address not found. Please try another mandi, city or district name.');
      }
    } catch (err) {
      setSearchError(err?.message || 'Geocoding failed. Check connection.');
    } finally {
      setSearching(false);
    }
  };

  const isPickup = type === 'pickup';

  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4 sm:p-5 shadow-xs transition hover:border-navy-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isPickup ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
          }`}>
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-navy-900">{label}</h4>
            <p className="text-[11px] text-navy-500 font-medium">
              {role} Location Source
            </p>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
          source === 'LIVE'
            ? 'bg-purple-50 text-purple-700 border border-purple-200'
            : source === 'SEARCHED'
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {source}
        </span>
      </div>

      <div className="space-y-2.5">
        {/* Option A: Registered Location */}
        <label
          onClick={handleSelectRegistered}
          className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition ${
            source === 'REGISTERED'
              ? 'bg-navy-50/70 border-navy-900/40 ring-1 ring-navy-900/20'
              : 'border-navy-100 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name={`loc-${type}`}
            checked={source === 'REGISTERED'}
            onChange={handleSelectRegistered}
            disabled={disabled}
            className="mt-1 text-navy-900 focus:ring-navy-900"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy-900">Registered Location</span>
              {registeredCoords?.latitude && (
                <span className="text-[10px] text-navy-400 font-mono">
                  {registeredCoords.latitude.toFixed(2)}, {registeredCoords.longitude.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-xs text-navy-600 mt-0.5 line-clamp-2">
              {registeredAddress || 'Registered profile address'}
            </p>
          </div>
        </label>

        {/* Option B: Live Location */}
        <div
          className={`p-3 rounded-xl border text-left transition ${
            source === 'LIVE'
              ? 'bg-purple-50/50 border-purple-300 ring-1 ring-purple-400/30'
              : 'border-navy-100 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name={`loc-${type}`}
              checked={source === 'LIVE'}
              onChange={handleSelectLive}
              disabled={disabled}
              className="mt-1 text-purple-600 focus:ring-purple-600 cursor-pointer"
            />
            <div className="flex-1 min-w-0 cursor-pointer" onClick={handleSelectLive}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-purple-600" />
                  Use My Current Location
                </span>
                {coords && source === 'LIVE' && (
                  <span className="text-[10px] text-purple-700 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" /> Acquired
                  </span>
                )}
              </div>
              <p className="text-[11px] text-navy-500 mt-0.5">
                Calculate transportation distance using current device GPS.
              </p>
            </div>
          </div>

          {source === 'LIVE' && (
            <div className="mt-3 pt-2.5 border-t border-purple-100 text-xs space-y-2">
              <div className="flex items-start gap-1.5 text-[11px] text-purple-800 bg-purple-100/50 p-2 rounded-lg">
                <Info className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  Your location will be used only to calculate transportation distance and optimize the delivery route for this deal.
                </span>
              </div>

              {isRequesting && (
                <div className="flex items-center gap-2 text-xs text-purple-700 py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span>Requesting device GPS permission...</span>
                </div>
              )}

              {coords && (
                <div className="text-[11px] text-navy-700 font-mono bg-white p-2 rounded-lg border border-purple-200 flex justify-between">
                  <span>GPS Lat: {coords.latitude.toFixed(5)}</span>
                  <span>Lng: {coords.longitude.toFixed(5)}</span>
                </div>
              )}

              {isError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={requestLocation}
                    className="text-[10px] font-bold text-red-800 underline shrink-0 hover:text-red-950"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Option C: Search Location (Mandi, Village, City, Landmark) */}
        <div
          className={`p-3 rounded-xl border text-left transition ${
            source === 'SEARCHED'
              ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-400/30'
              : 'border-navy-100 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name={`loc-${type}`}
              checked={source === 'SEARCHED'}
              onChange={handleSelectSearch}
              disabled={disabled}
              className="mt-1 text-amber-600 focus:ring-amber-600 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between cursor-pointer" onClick={handleSelectSearch}>
                <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-amber-600" />
                  Search Location (Village / Mandi / City)
                </span>
                {searchedLocation && source === 'SEARCHED' && (
                  <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" /> Found
                  </span>
                )}
              </div>
              <p className="text-[11px] text-navy-500 mt-0.5">
                Search any address or APMC Mandi to geocode exact coordinates.
              </p>

              {/* Search Box */}
              <form onSubmit={handleSearchSubmit} className="mt-2.5 flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Burdwan, APMC Vashi, Azadpur Mandi..."
                  disabled={disabled}
                  className="flex-1 px-3 py-1.5 bg-white border border-navy-200 rounded-lg text-xs text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim() || disabled}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shrink-0 flex items-center gap-1"
                >
                  {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search
                </button>
              </form>

              {searchedLocation && (
                <div className="mt-2 text-[11px] text-navy-800 font-mono bg-white p-2 rounded-lg border border-amber-200 flex justify-between">
                  <span className="truncate pr-2 font-sans font-medium text-navy-900">{searchedLocation.address}</span>
                  <span className="shrink-0 text-navy-500">[{searchedLocation.latitude.toFixed(2)}, {searchedLocation.longitude.toFixed(2)}]</span>
                </div>
              )}

              {searchError && (
                <p className="mt-2 text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                  {searchError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}