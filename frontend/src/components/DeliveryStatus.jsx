import { MapPin, Truck, Clock } from 'lucide-react';

export default function DeliveryStatus({ delivery }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-navy-900">{delivery.title}</h3>
          <p className="text-xs text-navy-500 mt-0.5">{delivery.orderId}</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
          delivery.status === 'Delivered' ? 'bg-primary-50 text-primary-700 border border-primary-200' :
          delivery.status === 'In Transit' ? 'bg-mustard-50 text-mustard-700 border border-mustard-200' :
          'bg-navy-50 text-navy-700 border border-navy-200'
        }`}>
          {delivery.status}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-navy-500 mb-1.5">
          <span>Progress</span>
          <span>{delivery.progress}%</span>
        </div>
        <div className="h-2 bg-navy-100 rounded-full">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${delivery.progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-xs text-navy-600">
          <MapPin className="w-3.5 h-3.5 text-navy-400" />
          <span>{delivery.from}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-navy-600">
          <MapPin className="w-3.5 h-3.5 text-primary-500" />
          <span>{delivery.to}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-navy-600">
          <Truck className="w-3.5 h-3.5 text-navy-400" />
          <span>{delivery.vehicle}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-navy-600">
          <Clock className="w-3.5 h-3.5 text-navy-400" />
          <span>ETA: {delivery.eta}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-navy-50 flex items-center justify-between">
        <span className="text-xs text-navy-500">Driver: {delivery.driver}</span>
        <span className="text-sm font-bold text-navy-900">₹{delivery.cost.toLocaleString()}</span>
      </div>
    </div>
  );
}
