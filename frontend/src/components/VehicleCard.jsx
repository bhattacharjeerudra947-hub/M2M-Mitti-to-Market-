import { Truck, Check, AlertTriangle, ShieldCheck, IndianRupee, MapPin } from 'lucide-react';

const TYPE_ICONS = {
  MINI_TRUCK: '🛻',
  TRUCK: '🚚',
  LARGE_TRUCK: '🚛',
};

const fmtINR = (n) => (n != null ? '₹' + Number(n).toLocaleString('en-IN') : '—');

export default function VehicleCard({
  vehicle,
  isSelected,
  onSelect,
  disabled = false,
}) {
  const isEligible = vehicle.eligible !== false;
  const isAvailable = vehicle.availabilityStatus === 'AVAILABLE';

  return (
    <div
      onClick={() => {
        if (isEligible && isAvailable && !disabled && onSelect) {
          onSelect(vehicle);
        }
      }}
      className={`relative p-4 rounded-2xl border transition-all ${
        isSelected
          ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/20 shadow-sm cursor-pointer'
          : isEligible && isAvailable && !disabled
          ? 'bg-white border-navy-100 hover:border-blue-300 hover:shadow-xs cursor-pointer'
          : 'bg-gray-50/70 border-gray-200 opacity-75 cursor-not-allowed'
      }`}
    >
      {/* Header: Type icon, label, availability status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center text-lg shrink-0">
            {TYPE_ICONS[vehicle.vehicleType] || '🚚'}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-navy-900 text-sm truncate">
              {vehicle.vehicleLabel || vehicle.vehicleNumber}
            </h4>
            <div className="flex items-center gap-2 text-xs text-navy-500 mt-0.5">
              <span className="font-mono font-medium">{vehicle.vehicleNumber}</span>
              <span>•</span>
              <span>{vehicle.vehicleTypeLabel || vehicle.vehicleType}</span>
            </div>
          </div>
        </div>

        {/* Selected or Availability Badge */}
        {isSelected ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-xs shrink-0">
            <Check className="w-3 h-3" /> Selected
          </span>
        ) : isAvailable ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider shrink-0">
            Available
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider shrink-0">
            {vehicle.availabilityStatus}
          </span>
        )}
      </div>

      {/* Capacity & Location */}
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div className="bg-navy-50/60 rounded-xl p-2">
          <p className="text-[10px] text-navy-400 font-semibold uppercase">Capacity</p>
          <p className="font-bold text-navy-900 mt-0.5">
            {Number(vehicle.capacityKg || 0).toLocaleString('en-IN')} kg
          </p>
        </div>
        <div className="bg-navy-50/60 rounded-xl p-2">
          <p className="text-[10px] text-navy-400 font-semibold uppercase">Base Area</p>
          <p className="font-medium text-navy-800 mt-0.5 truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 text-navy-400 shrink-0" />
            {vehicle.currentArea || 'Regional Hub'}
          </p>
        </div>
      </div>

      {/* Pricing Estimate */}
      {vehicle.estimatedCostRupees != null && (
        <div className="mt-3 pt-2.5 border-t border-navy-50 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-navy-400 uppercase font-semibold block">Est. Transport Cost</span>
            <span className="font-bold text-navy-900 text-sm flex items-center gap-0.5">
              <IndianRupee className="w-3.5 h-3.5" />
              {fmtINR(vehicle.estimatedCostRupees)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-navy-400 block">Rate</span>
            <span className="text-navy-600 font-mono text-[11px]">
              ₹{vehicle.costPerKm}/km
            </span>
          </div>
        </div>
      )}

      {/* Rejection / Ineligible reason alert */}
      {!isEligible && vehicle.rejectionReason && (
        <div className="mt-2.5 p-2 bg-amber-50/90 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>{vehicle.rejectionReason}</span>
        </div>
      )}
    </div>
  );
}
