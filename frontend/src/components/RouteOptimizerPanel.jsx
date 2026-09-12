import React, { useState, useEffect } from 'react';
import { Truck, Calculator, Check, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
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

      {/* Interactive Google Map & Metrics */}
      {routeInfo && (
        <div className="pt-2">
          <DealRouteMap
            origin={{
              latitude: pickupLocation.latitude,
              longitude: pickupLocation.longitude,
              label: 'Pickup',
            }}
            destination={{
              latitude: deliveryLocation.latitude,
              longitude: deliveryLocation.longitude,
              label: 'Destination',
            }}
            optimalRoute={routeInfo}
            alternatives={routeInfo.alternativeRoutes || []}
            selectionReason={routeInfo.selectionReason}
            selectionType={routeInfo.selectionType}
            distanceKm={routeInfo.distanceKm}
            durationMinutes={routeInfo.durationMinutes}
            estimatedCost={routeInfo.estimatedCost}
          />
        </div>
      )}

      {/* ═══ TWO LOGISTICS OPTIONS ═══ */}
      {!readOnly && (
        <div className="border-t border-navy-100 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-navy-900 text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              Choose Transport Arrangement
            </h4>
          </div>

          {/* Option Mode Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-navy-50/70 p-1.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLogisticsMode('MITTI2MARKET')}
              className={`py-2 px-3 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
                logisticsMode === 'MITTI2MARKET'
                  ? 'bg-white text-navy-900 shadow-xs border border-navy-200'
                  : 'text-navy-600 hover:text-navy-900'
              }`}
            >
              <span>🚚</span> Mitti2Market Logistics (Assisted)
            </button>
            <button
              type="button"
              onClick={() => setLogisticsMode('OWN')}
              className={`py-2 px-3 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
                logisticsMode === 'OWN'
                  ? 'bg-white text-navy-900 shadow-xs border border-navy-200'
                  : 'text-navy-600 hover:text-navy-900'
              }`}
            >
              <span>🚗</span> Self-Arranged Logistics
            </button>
          </div>

          {assignmentSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{assignmentSuccess}</span>
            </div>
          )}

          {/* Option 2: Mitti2Market Platform Vehicles */}
          {logisticsMode === 'MITTI2MARKET' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-navy-600">
                <span className="font-semibold text-navy-800">
                  Available Platform Vehicles for {deal?.quantity || 0} kg cargo:
                </span>
                <span className="text-[11px] text-navy-400">
                  {vehiclesData?.eligible?.length || 0} eligible
                </span>
              </div>

              {loadingVehicles ? (
                <div className="p-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-navy-900" />
                  <span>Loading platform vehicles...</span>
                </div>
              ) : vehiclesData?.eligible?.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {vehiclesData.eligible.map((v) => (
                    <VehicleCard
                      key={v.id}
                      vehicle={v}
                      isSelected={selectedVehicle?.id === v.id}
                      onSelect={setSelectedVehicle}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
                  <p className="font-bold">No single available vehicle has sufficient capacity.</p>
                  <p className="text-[11px]">
                    You can arrange your own transport using the "Self-Arranged Logistics" tab above.
                  </p>
                </div>
              )}

              {/* Ineligible Vehicles (Capacity Insufficient) */}
              {vehiclesData?.ineligible?.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-navy-400 uppercase tracking-wide mb-2">
                    Vehicles with Insufficient Capacity:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 opacity-75">
                    {vehiclesData.ineligible.map((v) => (
                      <VehicleCard
                        key={v.id}
                        vehicle={v}
                        disabled={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Assign Button */}
              {selectedVehicle && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAssignVehicle}
                    disabled={assigningVehicle}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 shadow-xs"
                  >
                    {assigningVehicle ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Assigning Vehicle...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Assign {selectedVehicle.vehicleLabel || selectedVehicle.vehicleNumber}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Option 1: Self-Arranged Form Info */}
          {logisticsMode === 'OWN' && (
            <div className="p-4 bg-navy-50/50 border border-navy-100 rounded-2xl text-xs space-y-2 text-navy-700">
              <p className="font-bold text-navy-900">Self-Arranged Logistics Selected</p>
              <p className="text-[11px] text-navy-600 leading-relaxed">
                You or your buyer are arranging your own vehicle. You can use the route distance and estimated travel time above to coordinate pickup, expected delivery date, and driver contact details.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}