import React, { useState, useEffect } from 'react';
import { Truck, Calculator, Check, AlertTriangle, Loader2, ArrowRight, Info, MapPin } from 'lucide-react';
import LocationPicker from './LocationPicker';
import DealRouteMap from './DealRouteMap';
import VehicleCard from './VehicleCard';
import { calculateRoute, setDealLocations, getDealRouteInfo } from '../api/locationApi';
import { getAvailableVehicles, assignVehicle } from '../api/dealApi';
import { useAuth } from '../context/AuthContext';

/**
 * RouteOptimizerPanel Component
 *
 * Placed in DealWorkspace and DealLock stages:
 *  1. Dual-source Location selection for Farmer (pickup) and Buyer (destination)
 *  2. "Calculate Optimal Route" button with sensible debouncing
 *  3. Interactive DealRouteMap preview with polyline & comparison alternatives
 *  4. "Confirm Logistics Locations" to lock coordinates into the deal
 */
export default function RouteOptimizerPanel({
  dealId,
  deal,
  onConfirmed = () => {},
  readOnly = false,
}) {
  const { user } = useAuth();
  const isFarmer = user?.role === 'FARMER' || user?.id === deal?.farmer?.id || user?.id === deal?.farmerId;
  const isBuyer = user?.role === 'BUSINESS' || user?.id === deal?.buyer?.id || user?.id === deal?.buyerId;
  const isAdmin = user?.role === 'ADMIN';

  // Farmer can edit pickup location. Buyer can edit delivery location. Admin can edit both.
  const canEditPickup = !readOnly && (isFarmer || isAdmin);
  const canEditDelivery = !readOnly && (isBuyer || isAdmin);

  const [pickupLocation, setPickupLocation] = useState({
    source: 'REGISTERED',
    latitude: deal?.pickupLatitude || deal?.farmer?.latitude || null,
    longitude: deal?.pickupLongitude || deal?.farmer?.longitude || null,
    address: deal?.pickupLocation || deal?.farmer?.location || '',
  });

  const [deliveryLocation, setDeliveryLocation] = useState({
    source: 'REGISTERED',
    latitude: deal?.deliveryLatitude || deal?.buyer?.latitude || null,
    longitude: deal?.deliveryLongitude || deal?.buyer?.longitude || null,
    address: deal?.deliveryLocation || deal?.buyer?.location || '',
  });

  const [routeInfo, setRouteInfo] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  // Logistics & Vehicle selection state
  const [logisticsMode, setLogisticsMode] = useState('MITTI2MARKET'); // 'MITTI2MARKET' | 'OWN'
  const [vehiclesData, setVehiclesData] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [assigningVehicle, setAssigningVehicle] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState('');

  // Load vehicles for deal
  const loadVehicles = () => {
    if (!dealId) return;
    setLoadingVehicles(true);
    getAvailableVehicles(dealId)
      .then((data) => {
        setVehiclesData(data);
        if (data?.eligible?.length > 0) {
          setSelectedVehicle(data.eligible[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingVehicles(false));
  };

  // Load existing route and vehicles
  useEffect(() => {
    if (dealId) {
      getDealRouteInfo(dealId)
        .then((info) => {
          if (info) {
            if (info.distanceKm) {
              setRouteInfo(info);
            }
            if (info.pickupLatitude && info.pickupLongitude) {
              setPickupLocation(prev => ({
                ...prev,
                latitude: info.pickupLatitude,
                longitude: info.pickupLongitude,
                address: info.pickupLocation || prev.address,
                source: info.pickupLocationSource || prev.source,
              }));
            }
            if (info.deliveryLatitude && info.deliveryLongitude) {
              setDeliveryLocation(prev => ({
                ...prev,
                latitude: info.deliveryLatitude,
                longitude: info.deliveryLongitude,
                address: info.deliveryLocation || prev.address,
                source: info.deliveryLocationSource || prev.source,
              }));
            }
          }
        })
        .catch(() => {});

      loadVehicles();
    }
  }, [dealId]);

  // Auto-calculate shortest distance & optimal route automatically whenever locations are fetched or updated
  useEffect(() => {
    if (pickupLocation?.latitude && deliveryLocation?.latitude) {
      const timer = setTimeout(() => {
        handleCalculate();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pickupLocation?.latitude, pickupLocation?.longitude, deliveryLocation?.latitude, deliveryLocation?.longitude]);

  const handleAssignVehicle = async () => {
    if (!dealId || !selectedVehicle) return;
    setAssigningVehicle(true);
    setError('');
    setAssignmentSuccess('');

    try {
      await assignVehicle(dealId, selectedVehicle.id);
      setAssignmentSuccess(`Vehicle ${selectedVehicle.vehicleNumber} assigned successfully!`);
      onConfirmed();
      loadVehicles();
    } catch (err) {
      setError(err?.message || 'Failed to assign vehicle');
    } finally {
      setAssigningVehicle(false);
    }
  };

  const handleCalculate = async () => {
    if (!pickupLocation.latitude || !deliveryLocation.latitude) {
      setError('Please ensure both Pickup and Delivery coordinates are available.');
      return;
    }
    setCalculating(true);
    setError('');

    try {
      const res = await calculateRoute({
        origin: { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
        destination: { latitude: deliveryLocation.latitude, longitude: deliveryLocation.longitude },
        originSource: pickupLocation.source,
        destinationSource: deliveryLocation.source,
        originAddress: pickupLocation.address,
        destinationAddress: deliveryLocation.address,
        dealId: dealId || null,
        quantityKg: deal?.quantity || 0,
      });

      setRouteInfo({
        distanceKm: res.selectedRoute?.distanceKm,
        durationMinutes: res.selectedRoute?.durationMinutes,
        estimatedCost: res.estimatedCostRupees,
        selectionReason: res.whySelected,
        selectionType: res.selectionType,
        polylineEncoded: res.selectedRoute?.polylineEncoded,
        alternativeRoutes: res.allRoutes || [],
      });
      setDirty(true);
    } catch (err) {
      setError(err?.message || 'Route calculation failed. Please verify coordinates.');
    } finally {
      setCalculating(false);
    }
  };

  const handleConfirmLocations = async () => {
    if (!dealId) return;
    setSaving(true);
    setError('');

    try {
      const updated = await setDealLocations(dealId, {
        origin: { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
        destination: { latitude: deliveryLocation.latitude, longitude: deliveryLocation.longitude },
        originSource: pickupLocation.source,
        destinationSource: deliveryLocation.source,
        originAddress: pickupLocation.address,
        destinationAddress: deliveryLocation.address,
      });

      setRouteInfo(updated);
      setDirty(false);
      onConfirmed(updated);
    } catch (err) {
      setError(err?.message || 'Failed to save confirmed logistics route.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-navy-50 pb-4">
        <div>
          <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            Logistics & Route Optimization
          </h3>
          <p className="text-xs text-navy-500 mt-0.5">
            Select Pickup (Farmer) and Destination (Buyer) location sources to optimize route.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Role-Specific Instruction Banner */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">
            {isFarmer && !isBuyer && '🚜 Farmer Location Setup: Please provide your pickup point (farm, village, or warehouse).'}
            {isBuyer && !isFarmer && '🏢 Business Location Setup: Please provide your delivery destination (store, mandi, or processing hub).'}
            {(!isFarmer && !isBuyer) && '📍 Logistics Location Setup: Origin (Pickup) and Destination (Delivery) endpoints.'}
          </p>
          <p className="text-[11px] text-blue-700">
            {isFarmer && !isBuyer && 'The buyer will specify their delivery destination in their own dashboard.'}
            {isBuyer && !isFarmer && 'The farmer specifies their pickup location in their own dashboard.'}
          </p>
        </div>
      </div>

      {/* Location Selectors Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-navy-700 px-1">
            <span>Origin (Pickup)</span>
            {!canEditPickup && <span className="text-gray-400 text-[10px]">Set by Farmer</span>}
          </div>
          <LocationPicker
            label="Pickup Location"
            type="pickup"
            role="Farmer"
            registeredAddress={deal?.pickupLocation || deal?.farmer?.location || 'Farmer Registered Village/District'}
            registeredCoords={{
              latitude: deal?.pickupLatitude || deal?.farmer?.latitude,
              longitude: deal?.pickupLongitude || deal?.farmer?.longitude,
            }}
            value={pickupLocation}
            onChange={(val) => {
              setPickupLocation(val);
              setDirty(true);
            }}
            disabled={!canEditPickup}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-navy-700 px-1">
            <span>Destination (Delivery)</span>
            {!canEditDelivery && <span className="text-gray-400 text-[10px]">Set by Business/Buyer</span>}
          </div>
          <LocationPicker
            label="Destination Location"
            type="delivery"
            role="Buyer"
            registeredAddress={deal?.deliveryLocation || deal?.buyer?.location || 'Buyer Registered Hub/Address'}
            registeredCoords={{
              latitude: deal?.deliveryLatitude || deal?.buyer?.latitude,
              longitude: deal?.deliveryLongitude || deal?.buyer?.longitude,
            }}
            value={deliveryLocation}
            onChange={(val) => {
              setDeliveryLocation(val);
              setDirty(true);
            }}
            disabled={!canEditDelivery}
          />
        </div>
      </div>

      {/* Action Bar to compute route */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs text-navy-500">
            {dirty && (
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Location options updated. Click calculate to recompute optimal route.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={calculating}
              className="px-4 py-2 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              {calculating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Calculating Routes...
                </>
              ) : (
                <>
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  Calculate Optimal Route
                </>
              )}
            </button>

            {dealId && (
              <button
                type="button"
                onClick={handleConfirmLocations}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {isFarmer && !isBuyer && 'Confirm Pickup Location'}
                    {isBuyer && !isFarmer && 'Confirm Delivery Location'}
                    {(!isFarmer && !isBuyer || isFarmer && isBuyer) && 'Confirm Route For Deal'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Google Map & Metrics — Always rendered for full Google Maps experience */}
      <div className="pt-2">
        <DealRouteMap
          origin={{
            latitude: pickupLocation.latitude,
            longitude: pickupLocation.longitude,
            label: 'Farmer Pickup Point',
            address: pickupLocation.address,
          }}
          destination={{
            latitude: deliveryLocation.latitude,
            longitude: deliveryLocation.longitude,
            label: 'Business Delivery Point',
            address: deliveryLocation.address,
          }}
          optimalRoute={routeInfo}
          alternatives={routeInfo?.alternativeRoutes || []}
          selectionReason={routeInfo?.selectionReason}
          selectionType={routeInfo?.selectionType}
          distanceKm={routeInfo?.distanceKm}
          durationMinutes={routeInfo?.durationMinutes}
          estimatedCost={routeInfo?.estimatedCost}
          canEditOrigin={canEditPickup}
          canEditDestination={canEditDelivery}
          onOriginChange={(newOrigin) => {
            setPickupLocation(prev => ({
              ...prev,
              source: 'PINNED',
              latitude: newOrigin.latitude,
              longitude: newOrigin.longitude,
              address: newOrigin.address || prev.address,
            }));
            setDirty(true);
          }}
          onDestinationChange={(newDest) => {
            setDeliveryLocation(prev => ({
              ...prev,
              source: 'PINNED',
              latitude: newDest.latitude,
              longitude: newDest.longitude,
              address: newDest.address || prev.address,
            }));
            setDirty(true);
          }}
          onRouteCalculated={(calcResult) => {
            if (!routeInfo && calcResult) {
              setRouteInfo({
                distanceKm: calcResult.distanceKm,
                durationMinutes: calcResult.durationMinutes,
                summary: calcResult.summary,
              });
            }
          }}
        />
      </div>

      {/* ═══ LOCATION CONFIRMATION STATUS ═══ */}
      <div className="border-t border-navy-100 pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-navy-900 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Location Confirmation Status
          </h4>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className={`p-3.5 rounded-xl border ${
            pickupLocation?.latitude
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span>🌾 Farmer Pickup Point</span>
              <span>{pickupLocation?.latitude ? '✓ Set' : '⏳ Awaiting Farmer'}</span>
            </div>
            <p className="mt-1 text-[11px] truncate">
              {pickupLocation?.address || 'Pickup location not specified yet'}
            </p>
            {pickupLocation?.latitude && (
              <p className="mt-0.5 text-[10px] font-mono opacity-75">
                Coords: [{pickupLocation.latitude.toFixed(4)}, {pickupLocation.longitude.toFixed(4)}]
              </p>
            )}
          </div>

          <div className={`p-3.5 rounded-xl border ${
            deliveryLocation?.latitude
              ? 'bg-blue-50/70 border-blue-200 text-blue-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span>🏢 Business Delivery Point</span>
              <span>{deliveryLocation?.latitude ? '✓ Set' : '⏳ Awaiting Business'}</span>
            </div>
            <p className="mt-1 text-[11px] truncate">
              {deliveryLocation?.address || 'Delivery destination not specified yet'}
            </p>
            {deliveryLocation?.latitude && (
              <p className="mt-0.5 text-[10px] font-mono opacity-75">
                Coords: [{deliveryLocation.latitude.toFixed(4)}, {deliveryLocation.longitude.toFixed(4)}]
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TRANSPORT & VEHICLE SELECTION ═══ */}
      <div className="border-t border-navy-100 pt-5 space-y-4">
        <div>
          <h4 className="font-bold text-navy-900 text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            Transport & Delivery Options
          </h4>
          <p className="text-xs text-navy-500 mt-0.5">
            Choose whether to use Mitti2Market's verified logistics network or self-arrange transport.
          </p>
        </div>

        {/* Transport Option Tabs */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setLogisticsMode('MITTI2MARKET')}
            className={`p-3.5 rounded-xl border text-left transition ${
              logisticsMode === 'MITTI2MARKET'
                ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                : 'border-navy-100 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-navy-900 flex items-center gap-1.5">
                🚚 Mitti2Market Fleet
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                Recommended
              </span>
            </div>
            <p className="text-[11px] text-navy-500 mt-1">
              Automated vehicle matching based on weight ({deal?.quantity || 0} kg) with verified drivers.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setLogisticsMode('OWN')}
            className={`p-3.5 rounded-xl border text-left transition ${
              logisticsMode === 'OWN'
                ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                : 'border-navy-100 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-navy-900 flex items-center gap-1.5">
                🚛 Self-Arranged Transport
              </span>
            </div>
            <p className="text-[11px] text-navy-500 mt-1">
              Arrange your own transport. Platform provides optimal route guidance and distance calculation only.
            </p>
          </button>
        </div>

        {/* Platform Vehicles List when Mitti2Market is selected */}
        {logisticsMode === 'MITTI2MARKET' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-navy-700">
                Matched Transport Vehicles (Weight: {deal?.quantity || 0} kg)
              </span>
              {loadingVehicles && (
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Fetching available fleet...
                </span>
              )}
            </div>

            {assignmentSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{assignmentSuccess}</span>
              </div>
            )}

            {vehiclesData?.eligible && vehiclesData.eligible.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-3">
                {vehiclesData.eligible.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    isSelected={selectedVehicle?.id === v.id}
                    onSelect={(veh) => setSelectedVehicle(veh)}
                    disabled={readOnly}
                  />
                ))}
              </div>
            ) : (
              !loadingVehicles && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-navy-500 text-center">
                  No dedicated vehicles currently available in this immediate region. You may select Self-Arranged Transport or contact support.
                </div>
              )
            )}

            {/* Ineligible Vehicles (Too small for cargo) */}
            {vehiclesData?.ineligible && vehiclesData.ineligible.length > 0 && (
              <details className="text-xs text-gray-500 pt-1">
                <summary className="cursor-pointer font-medium hover:text-navy-700">
                  View {vehiclesData.ineligible.length} other vehicles (insufficient capacity)
                </summary>
                <div className="grid md:grid-cols-2 gap-3 mt-2">
                  {vehiclesData.ineligible.map((v) => (
                    <VehicleCard
                      key={v.id}
                      vehicle={v}
                      isSelected={false}
                      disabled={true}
                    />
                  ))}
                </div>
              </details>
            )}

            {/* Vehicle Assignment Action */}
            {!readOnly && selectedVehicle && (
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-navy-600">
                  Selected: <strong className="text-navy-900">{selectedVehicle.vehicleLabel || selectedVehicle.vehicleNumber}</strong> ({selectedVehicle.vehicleTypeLabel || selectedVehicle.vehicleType})
                </div>
                <button
                  type="button"
                  onClick={handleAssignVehicle}
                  disabled={assigningVehicle}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  {assigningVehicle ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Confirm & Assign Vehicle
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {logisticsMode === 'OWN' && (
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-2">
            <p className="font-semibold">Self-Arranged Transport Selected</p>
            <p className="text-[11px] text-blue-700">
              The buyer or farmer will manage their own transit vehicle. Mitti2Market will provide accurate route navigation, calculated distance ({routeInfo?.distanceKm ? `${routeInfo.distanceKm} km` : 'pending'}), and delivery confirmation tracking once the shipment arrives.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}