import React, { useState, useEffect } from 'react';
import { Truck, Calculator, Check, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import LocationPicker from './LocationPicker';
import DealRouteMap from './DealRouteMap';
import { calculateRoute, setDealLocations, getDealRouteInfo } from '../api/locationApi';

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

  // Load existing route if deal already has coordinates
  useEffect(() => {
    if (dealId) {
      getDealRouteInfo(dealId)
        .then((info) => {
          if (info && info.distanceKm) {
            setRouteInfo(info);
          }
        })
        .catch(() => {});
    }
  }, [dealId]);

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

      {/* Location Selectors Grid */}
      <div className="grid md:grid-cols-2 gap-4">
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
          disabled={readOnly}
        />

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
          disabled={readOnly}
        />
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

            {dealId && routeInfo && (
              <button
                type="button"
                onClick={handleConfirmLocations}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Confirm Route For Deal
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
    </div>
  );
}