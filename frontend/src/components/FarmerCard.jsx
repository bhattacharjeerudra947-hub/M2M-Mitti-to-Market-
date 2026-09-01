import { MapPin, Star, ShieldCheck } from 'lucide-react';

export default function FarmerCard({ farmer }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center text-lg font-bold text-navy-700 shrink-0">
          {farmer.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-navy-900 truncate">{farmer.name}</h3>
            {farmer.verified && <ShieldCheck className="w-4 h-4 text-primary-500 shrink-0" />}
          </div>
          <p className="text-xs text-navy-500 mb-2">{farmer.location} · {farmer.distance} km away</p>
          <div className="flex items-center gap-3 text-xs text-navy-500">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {farmer.rating}
            </span>
            <span>{farmer.produce}</span>
            <span>{farmer.experience}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-navy-50">
        <button className="w-full py-2 bg-mustard-50 text-navy-800 text-sm font-semibold rounded-xl hover:bg-mustard-100 border border-mustard-200 transition">
          Contact Farmer
        </button>
      </div>
    </div>
  );
}
