import { MapPin, Star, ShieldCheck, Calendar } from 'lucide-react';

export default function BuyerCard({ request, onAccept, onView }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-navy-100 rounded-xl flex items-center justify-center text-xl shrink-0">
            🏪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-navy-900">{request.buyer}</h3>
              {request.verified && <ShieldCheck className="w-4 h-4 text-primary-500" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs text-navy-500">{request.rating}</span>
              <span className="text-xs text-navy-400">·</span>
              <span className="text-xs text-navy-500">{request.distance}</span>
            </div>
          </div>
        </div>
        <p className="text-lg font-bold text-navy-900">₹{request.price}/{request.unit}</p>
      </div>

      <div className="flex items-center gap-4 text-xs text-navy-500 mb-4">
        <span className="font-medium text-navy-700">{request.quantity} {request.unit} required</span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          Pickup: {request.pickupDate}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 py-2 bg-mustard-50 text-navy-800 text-sm font-semibold rounded-xl hover:bg-mustard-100 border border-mustard-200 transition"
        >
          View Offer
        </button>
        <button
          onClick={onAccept}
          className="flex-1 py-2 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
