import React, { useState, useEffect } from 'react';
import { Warehouse, Truck, Check, AlertCircle, ShieldCheck, ArrowRight, Clock, Info } from 'lucide-react';
import { findSuitableHubs, getHubs } from '../api/hubApi';

/**
 * HubStagingSelector Component
 * 
 * Digital Logistics Orchestration Layer:
 * Mitti2Market coordinates logistics routes. Forward logistics defaults to Direct Delivery (Farmer → Buyer).
 * Optionally, users can select a Partner Aggregation/Cold Storage Hub for temporary staging or consolidation.
 */
export default function HubStagingSelector({
  cropName = '',
  quantityKg = 0,
  pickupLat = null,
  pickupLng = null,
  deliveryLat = null,
  deliveryLng = null,
  selectedHub = null,
  onHubChange = () => {},
  readOnly = false,
}) {
  const [stagingMode, setStagingMode] = useState(selectedHub ? 'HUB_STAGED' : 'DIRECT');
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadHubs() {
      if (stagingMode !== 'HUB_STAGED') return;
      setLoading(true);
      setError('');
      try {
        let result = [];
        if (deliveryLat && deliveryLng) {
          result = await findSuitableHubs(deliveryLat, deliveryLng, cropName, quantityKg);
        } else {
          result = await getHubs({ activeOnly: true });
        }
        if (isMounted) {
          setHubs(Array.isArray(result) ? result : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load partner hubs');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHubs();
    return () => { isMounted = false; };
  }, [stagingMode, cropName, quantityKg, deliveryLat, deliveryLng]);

  const handleModeChange = (mode) => {
    if (readOnly) return;
    setStagingMode(mode);
    if (mode === 'DIRECT') {
      onHubChange(null);
    }
  };

  const handleSelectHub = (hub) => {
    if (readOnly) return;
    onHubChange(hub);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Delivery Staging & Routing Mode</h3>
        </div>
        <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-200 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> M2M Orchestration Layer
        </span>
      </div>

      <p className="text-xs text-gray-500">
        M2M orchestrates direct user-arranged logistics by default. For bulk aggregation, quality testing, or cold chain preservation, select an authorized partner warehouse hub.
      </p>

      {/* Mode Selection Toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          onClick={() => handleModeChange('DIRECT')}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            stagingMode === 'DIRECT'
              ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
              : 'border-gray-200 hover:border-gray-300'
          } ${readOnly ? 'pointer-events-none' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-sm text-gray-900">Direct Delivery (Default)</span>
            </div>
            {stagingMode === 'DIRECT' && (
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                ✓
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Farmer Farm <ArrowRight className="inline w-3 h-3 mx-1 text-gray-400" /> Buyer Destination
          </p>
          <p className="text-[11px] text-emerald-700 mt-2 font-medium">
            Direct transit, zero hub handling surcharge.
          </p>
        </div>

        <div
          onClick={() => handleModeChange('HUB_STAGED')}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            stagingMode === 'HUB_STAGED'
              ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
              : 'border-gray-200 hover:border-gray-300'
          } ${readOnly ? 'pointer-events-none' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-sm text-gray-900">Partner Hub Staging</span>
            </div>
            {stagingMode === 'HUB_STAGED' && (
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                ✓
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Farm <ArrowRight className="inline w-3 h-3 text-gray-400" /> Partner Hub <ArrowRight className="inline w-3 h-3 text-gray-400" /> Buyer
          </p>
          <p className="text-[11px] text-blue-700 mt-2 font-medium">
            Inbound lot grading, cold storage & dispatch buffer.
          </p>
        </div>
      </div>

      {/* Hub List when Staging is active */}
      {stagingMode === 'HUB_STAGED' && (
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
              Select Partner Aggregation / Storage Hub
            </h4>
            {loading && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3 animate-spin" /> Evaluating hubs...</span>}
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {!loading && hubs.length === 0 && !error && (
            <p className="text-xs text-gray-500 italic py-2">
              No active partner warehouses found matching crop compatibility and capacity requirements.
            </p>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {hubs.map((hub) => {
              const isSelected = selectedHub && (selectedHub.id === hub.id || selectedHub.hubCode === hub.hubCode);
              const availableCap = hub.availableCapacityKg ?? ((hub.totalCapacityKg || 0) - (hub.occupiedCapacityKg || 0) - (hub.reservedCapacityKg || 0));
              const hasCapacity = quantityKg <= availableCap;

              return (
                <div
                  key={hub.id}
                  onClick={() => hasCapacity && handleSelectHub(hub)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500'
                      : hasCapacity
                      ? 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50 cursor-pointer'
                      : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-gray-900">{hub.name}</span>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {hub.hubCode}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {hub.storageType ? hub.storageType.replace('_', ' ') : 'WAREHOUSE'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Partner: {hub.partnerName || 'Authorized Local Partner'} • {hub.location || hub.district}
                        {hub.distanceKm != null && ` • ${hub.distanceKm} km away`}
                      </p>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-600">
                    <div>
                      Available Capacity:{' '}
                      <span className={`font-semibold ${hasCapacity ? 'text-emerald-700' : 'text-red-600'}`}>
                        {availableCap?.toLocaleString()} kg
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Handling: ₹{hub.handlingFeePerKg || 0.4}/kg</span>
                      <span>Storage: ₹{hub.storageRatePerDayPerKg || 0.08}/kg/day</span>
                    </div>
                  </div>

                  {hub.reason && (
                    <p className="text-[10px] text-gray-500 mt-1 italic">
                      {hub.reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
