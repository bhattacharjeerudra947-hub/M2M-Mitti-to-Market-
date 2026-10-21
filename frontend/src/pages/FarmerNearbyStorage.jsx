import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPatch } from '../api';
import StorageComparisonCard from '../components/StorageComparisonCard';
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
  CheckCircle2,
  Plus,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle
} from 'lucide-react';

const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function FarmerNearbyStorage() {
  const { user } = useAuth();
  const { isLoaded: mapsLoaded } = useGoogleMaps();

  const [topTab, setTopTab] = useState('FIND'); // 'FIND' | 'MY_LOTS' | 'CALCULATOR'

  // Location search priority:
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

  // Stored lots state
  const [storedLotsData, setStoredLotsData] = useState(null);
  const [storedLotsLoading, setStoredLotsLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(null);

  // Deposit Form State
  const [depositForm, setDepositForm] = useState({
    cropName: 'Tomato',
    variety: 'Hybrid Grade A',
    quantityKg: 1000,
    facilityName: 'Pune Sahyadri Cold Storage',
    facilityLocation: 'Pune Hub',
    facilityType: 'COLD_STORAGE',
    storageLocationBay: 'Cold Room B - Bay 3',
    dailyRate: 0.50,
    storageDays: 30,
    notes: 'Stored after morning harvest',
  });
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  // Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    actualStorageCost: '',
    invoiceStatus: 'FINALIZED',
  });
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);

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

  // Fetch stored produce lots
  const fetchStoredLots = useCallback(async () => {
    if (!user) return;
    setStoredLotsLoading(true);
    try {
      const res = await apiGet(`/api/storage/lots/farmer/${user.id}`);
      setStoredLotsData(res);
    } catch {
      setStoredLotsData(null);
    } finally {
      setStoredLotsLoading(false);
    }
  }, [user]);

  // Initial load based on farmer profile
  useEffect(() => {
    const lat = user?.latitude || 18.5204;
    const lng = user?.longitude || 73.8567;
    const dist = user?.district || user?.location || 'Pune';
    setDistrictQuery(dist);
    setActiveLocationName(dist);
    setCoordinates({ latitude: lat, longitude: lng });
    fetchFacilities(lat, lng, null, dist);
    fetchStoredLots();
  }, [user, fetchStoredLots]);

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

  // Handle Recording New Storage Lot
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setDepositSubmitting(true);
    try {
      await apiPost('/api/storage/lots', {
        farmerId: user.id,
        cropName: depositForm.cropName,
        variety: depositForm.variety,
        quantityKg: Number(depositForm.quantityKg),
        facilityName: depositForm.facilityName,
        facilityLocation: depositForm.facilityLocation,
        facilityType: depositForm.facilityType,
        storageLocationBay: depositForm.storageLocationBay,
        dailyRate: Number(depositForm.dailyRate),
        storageDays: Number(depositForm.storageDays),
        notes: depositForm.notes,
      });
      setShowDepositModal(false);
      fetchStoredLots();
    } catch (err) {
      alert('Failed to record storage deposit: ' + err.message);
    } finally {
      setDepositSubmitting(false);
    }
  };

  // Handle Invoice Finalization
  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!showInvoiceModal) return;
    setInvoiceSubmitting(true);
    try {
      await apiPatch(`/api/storage/lots/${showInvoiceModal.id}/invoice`, {
        invoiceNumber: invoiceForm.invoiceNumber,
        actualStorageCost: Number(invoiceForm.actualStorageCost),
        invoiceStatus: invoiceForm.invoiceStatus,
      });
      setShowInvoiceModal(null);
      fetchStoredLots();
    } catch (err) {
      alert('Failed to reconcile invoice: ' + err.message);
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  // Render Google Map
  useEffect(() => {
    if (topTab !== 'FIND' || !mapsLoaded || !mapRef.current || !window.google?.maps) return;

    if (!googleMapInstance.current) {
      googleMapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: coordinates,
        zoom: 10,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      });
    } else {
      googleMapInstance.current.setCenter(coordinates);
    }

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Farmer location marker
    new window.google.maps.Marker({
      position: coordinates,
      map: googleMapInstance.current,
      title: 'Your Location: ' + activeLocationName,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#059669',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    facilities.forEach((fac) => {
      if (!fac.latitude || !fac.longitude) return;

      const marker = new window.google.maps.Marker({
        position: { lat: fac.latitude, lng: fac.longitude },
        map: googleMapInstance.current,
        title: fac.name,
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family: inherit; padding: 4px; max-width: 200px;">
            <div style="font-weight: 700; color: #0f2a4a; font-size: 13px;">${fac.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${fac.type || 'COLD_STORAGE'}</div>
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

  }, [mapsLoaded, facilities, coordinates, activeLocationName, topTab]);

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
                <h1 className="text-2xl font-bold text-navy-900">Cold Storage & Warehouse Hubs</h1>
              </div>
              <p className="text-xs text-navy-500">
                Discover facilities, track stored produce lots, calculate storage-adjusted selling prices, and reconcile invoices.
              </p>
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex items-center bg-white p-1 rounded-2xl border border-navy-200 shadow-xs text-xs font-semibold">
              <button
                onClick={() => setTopTab('FIND')}
                className={`px-3.5 py-2 rounded-xl transition ${topTab === 'FIND' ? 'bg-navy-900 text-white shadow-xs' : 'text-gray-600 hover:text-navy-900'}`}
              >
                🗺️ Find Facilities
              </button>
              <button
                onClick={() => setTopTab('MY_LOTS')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${topTab === 'MY_LOTS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-navy-900'}`}
              >
                📦 My Stored Lots ({storedLotsData?.activeLotsCount || 0})
              </button>
              <button
                onClick={() => setTopTab('CALCULATOR')}
                className={`px-3.5 py-2 rounded-xl transition ${topTab === 'CALCULATOR' ? 'bg-navy-900 text-white shadow-xs' : 'text-gray-600 hover:text-navy-900'}`}
              >
                ⚖️ Storage Calculator
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              TAB 1: MY STORED PRODUCE LOTS & INVOICES
              ══════════════════════════════════════════════════════════════ */}
          {topTab === 'MY_LOTS' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-navy-100 shadow-xs">
                  <span className="text-xs text-gray-500 font-medium">Currently Stored Produce</span>
                  <p className="text-2xl font-extrabold text-navy-900 mt-1">
                    {Number(storedLotsData?.totalStoredKg || 0).toLocaleString('en-IN')} <span className="text-xs font-normal">kg</span>
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-navy-100 shadow-xs">
                  <span className="text-xs text-gray-500 font-medium">Available for Sale</span>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                    {Number(storedLotsData?.totalAvailableKg || 0).toLocaleString('en-IN')} <span className="text-xs font-normal">kg</span>
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-navy-100 shadow-xs">
                  <span className="text-xs text-gray-500 font-medium">Accumulated Storage Bills</span>
                  <p className="text-2xl font-extrabold text-rose-600 mt-1">
                    {fmtINR(storedLotsData?.totalAccumulatedCost || 0)}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-navy-100 shadow-xs">
                  <span className="text-xs text-gray-500 font-medium">Projected Total Bills</span>
                  <p className="text-2xl font-extrabold text-navy-900 mt-1">
                    {fmtINR(storedLotsData?.totalEstimatedBill || 0)}
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-navy-900">Stored Produce Inventory Batches</h2>
                  <p className="text-xs text-navy-500">Real storage condition, billable days, and finalized invoice accounting</p>
                </div>
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Deposit Produce into Storage
                </button>
              </div>

              {/* Stored Lots List */}
              {storedLotsLoading ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Loading stored batches...</p>
                </div>
              ) : (!storedLotsData?.lots || storedLotsData.lots.length === 0) ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-navy-100">
                  <Warehouse className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-navy-900">No produce currently in cold storage</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    Record your cold storage and warehouse deposits here to monitor daily billing rules, quality preservation, and compare immediate sales vs holding.
                  </p>
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="mt-4 px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-800 transition"
                  >
                    Deposit Produce Batch
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {storedLotsData.lots.map((lot) => (
                    <div key={lot.id} className="bg-white rounded-2xl border border-navy-100 p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-gray-400 block">{lot.lotId}</span>
                          <h4 className="text-base font-bold text-navy-900">{lot.cropName} ({lot.variety || 'Standard'})</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          lot.status === 'IN_STORAGE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {lot.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Facility & Location</span>
                          <span className="font-semibold text-navy-900 truncate block">{lot.facilityName}</span>
                          <span className="text-[10px] text-gray-500">{lot.bayLocation || 'Bay A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Stored / Available</span>
                          <span className="font-semibold text-navy-900">{lot.initialQuantityKg} kg total</span>
                          <span className="text-[10px] text-emerald-700 block font-bold">{lot.availableQuantityKg} kg available</span>
                        </div>
                        <div className="pt-1.5 border-t border-gray-200">
                          <span className="text-gray-400 block text-[10px]">Accumulated Fee</span>
                          <span className="font-bold text-rose-600">{fmtINR(lot.accumulatedStorageCost)}</span>
                          <span className="text-[10px] text-gray-400 block">({lot.accumulatedDays} days @ ₹{lot.dailyRate}/kg)</span>
                        </div>
                        <div className="pt-1.5 border-t border-gray-200">
                          <span className="text-gray-400 block text-[10px]">Invoice Status</span>
                          <span className={`text-[11px] font-bold block ${lot.invoiceStatus === 'FINALIZED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {lot.invoiceStatus}
                          </span>
                          {lot.actualStorageCost != null && (
                            <span className="text-[10px] text-gray-600 font-mono">Actual: {fmtINR(lot.actualStorageCost)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 text-xs">
                        <span className="text-gray-400 text-[11px]">
                          Condition: <strong>{lot.condition}</strong>
                        </span>
                        <button
                          onClick={() => {
                            setShowInvoiceModal(lot);
                            setInvoiceForm({
                              invoiceNumber: lot.invoiceNumber || '',
                              actualStorageCost: lot.actualStorageCost || lot.accumulatedStorageCost,
                              invoiceStatus: lot.invoiceStatus || 'FINALIZED',
                            });
                          }}
                          className="px-3 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-800 rounded-lg font-semibold transition"
                        >
                          Reconcile Invoice
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 2: STORAGE COMPARISON CALCULATOR
              ══════════════════════════════════════════════════════════════ */}
          {topTab === 'CALCULATOR' && (
            <StorageComparisonCard cropName="Tomato" defaultPrice={28} />
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 3: FIND FACILITIES (EXISTING GOOGLE MAP & PARTNER HUBS)
              ══════════════════════════════════════════════════════════════ */}
          {topTab === 'FIND' && (
            <>
              {/* Search & Location Bar */}
              <div className="bg-white rounded-2xl border border-navy-100 p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={districtQuery}
                      onChange={(e) => setDistrictQuery(e.target.value)}
                      placeholder="Search by city, district, or facility name (e.g. Pune, Nashik, Agra)..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </form>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={gpsLoading}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs disabled:opacity-50"
                    >
                      {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      Use GPS
                    </button>

                    <button
                      type="button"
                      onClick={() => fetchFacilities(coordinates.latitude, coordinates.longitude, null, activeLocationName)}
                      className="p-2.5 bg-gray-100 hover:bg-gray-200 text-navy-700 rounded-xl text-xs transition"
                      title="Refresh"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Filter Sub-Tabs */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100 text-xs">
                  <span className="text-gray-400 text-[11px] font-semibold mr-1">Filter Facilities:</span>
                  {[
                    { id: 'ALL', label: `All Facilities (${facilities.length})` },
                    { id: 'PARTNER', label: `M2M Partner Hubs (${facilities.filter(f => f.isPartnerHub).length})` },
                    { id: 'COLD_STORAGE', label: `Cold Storage Only (${facilities.filter(f => (f.storageType || f.type)?.includes('COLD')).length})` },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        activeTab === t.id
                          ? 'bg-navy-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map & Facility List Grid */}
              <div className="grid lg:grid-cols-5 gap-6">
                {/* Left: Google Map View */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden h-[500px] flex flex-col">
                  <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-navy-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      Live Facility Map
                    </span>
                    <span className="text-gray-400 text-[11px]">Click markers for directions</span>
                  </div>
                  <div ref={mapRef} className="flex-1 w-full bg-gray-100 relative">
                    {!mapsLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-xs text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading map...
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Facility Cards List */}
                <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {loading ? (
                    <div className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Finding facilities near {activeLocationName}...</p>
                    </div>
                  ) : filteredFacilities.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-navy-100">
                      <Snowflake className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No facilities found matching your search.</p>
                    </div>
                  ) : (
                    filteredFacilities.map((fac) => (
                      <div
                        key={fac.id}
                        onClick={() => setSelectedFacility(fac)}
                        className={`p-4 rounded-2xl border transition cursor-pointer text-left ${
                          selectedFacility?.id === fac.id
                            ? 'bg-emerald-50/40 border-emerald-500 shadow-sm'
                            : 'bg-white border-navy-100 hover:border-gray-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-navy-900">{fac.name}</h4>
                              {fac.isPartnerHub && (
                                <span className="text-[10px] font-bold px-2 py-0.2 bg-emerald-100 text-emerald-800 rounded-full">
                                  Verified Partner
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{fac.address || 'Address available upon booking'}</span>
                            </p>
                          </div>
                          {fac.distanceKm != null && (
                            <span className="text-xs font-bold text-emerald-700 shrink-0">
                              {fac.distanceKm} km
                            </span>
                          )}
                        </div>

                        {fac.contactPhone && (
                          <div className="mt-2 text-xs flex items-center gap-2 text-navy-700">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <a href={`tel:${fac.contactPhone}`} className="font-semibold hover:underline">
                              {fac.contactPhone}
                            </a>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: DEPOSIT PRODUCE BATCH INTO STORAGE
          ══════════════════════════════════════════════════════════════ */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-emerald-600" />
                <span>Deposit Produce into Storage</span>
              </h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">Crop Name</label>
                  <input
                    type="text"
                    required
                    value={depositForm.cropName}
                    onChange={(e) => setDepositForm({ ...depositForm, cropName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-medium text-navy-900"
                  />
                </div>
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">Variety / Grade</label>
                  <input
                    type="text"
                    value={depositForm.variety}
                    onChange={(e) => setDepositForm({ ...depositForm, variety: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-medium text-navy-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={depositForm.quantityKg}
                    onChange={(e) => setDepositForm({ ...depositForm, quantityKg: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-medium text-navy-900"
                  />
                </div>
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">Storage Rate (₹/kg/day)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={depositForm.dailyRate}
                    onChange={(e) => setDepositForm({ ...depositForm, dailyRate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-medium text-navy-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">Storage Facility Name</label>
                  <input
                    type="text"
                    required
                    value={depositForm.facilityName}
                    onChange={(e) => setDepositForm({ ...depositForm, facilityName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-medium text-navy-900"
                  />
                </div>
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">Facility Type</label>
                  <select
                    value={depositForm.facilityType}
                    onChange={(e) => setDepositForm({ ...depositForm, facilityType: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-medium text-navy-900"
                  >
                    <option value="COLD_STORAGE">Cold Storage</option>
                    <option value="DRY_STORAGE">Dry Storage / Warehouse</option>
                    <option value="GRAIN_SILO">Grain Silo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">Planned Days</label>
                  <input
                    type="number"
                    value={depositForm.storageDays}
                    onChange={(e) => setDepositForm({ ...depositForm, storageDays: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-medium text-navy-900"
                  />
                </div>
                <div>
                  <label className="text-gray-600 font-semibold block mb-1">Bay / Room Code</label>
                  <input
                    type="text"
                    value={depositForm.storageLocationBay}
                    onChange={(e) => setDepositForm({ ...depositForm, storageLocationBay: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 font-medium text-navy-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={depositSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5"
                >
                  {depositSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: RECONCILE ACTUAL STORAGE INVOICE
          ══════════════════════════════════════════════════════════════ */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy-900">
                Reconcile Storage Invoice: {showInvoiceModal.lotId}
              </h3>
              <button
                onClick={() => setShowInvoiceModal(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvoiceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-600 font-semibold block mb-1">Storage Invoice Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-COLD-2026-0891"
                  value={invoiceForm.invoiceNumber}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 font-medium text-navy-900"
                />
              </div>

              <div>
                <label className="text-gray-600 font-semibold block mb-1">Actual Final Invoice Amount (₹)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={invoiceForm.actualStorageCost}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, actualStorageCost: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 font-medium text-navy-900"
                />
              </div>

              <div>
                <label className="text-gray-600 font-semibold block mb-1">Status</label>
                <select
                  value={invoiceForm.invoiceStatus}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceStatus: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 font-medium text-navy-900"
                >
                  <option value="FINALIZED">FINALIZED (Verified Bill)</option>
                  <option value="PAID">PAID</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invoiceSubmitting}
                  className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl font-bold transition flex items-center gap-1.5"
                >
                  {invoiceSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Final Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
