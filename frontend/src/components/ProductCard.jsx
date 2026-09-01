import { MapPin, Star, ShieldCheck } from 'lucide-react';

export default function ProductCard({ product, onAction, actionLabel = 'View Details' }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition overflow-hidden group">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-4xl">{product.emoji}</span>
          <div className="flex items-center gap-1.5">
            {product.verified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-200">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            )}
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
              product.grade === 'A' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              Grade {product.grade}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>

        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-2xl font-bold text-navy-900">₹{product.price}</span>
          <span className="text-sm text-gray-500">/ {product.unit}</span>
          {product.priceChange !== undefined && (
            <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded ${
              product.priceChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {product.priceChange >= 0 ? '↑' : '↓'} {Math.abs(product.priceChange)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span className="font-medium text-gray-700">{product.quantity.toLocaleString()} {product.unit} available</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {product.location}
          </span>
          {product.distance && <span>{product.distance} km away</span>}
          {product.farmerRating && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {product.farmerRating}
            </span>
          )}
          {product.farmer && <span>by {product.farmer}</span>}
        </div>
      </div>

      <div className="border-t border-gray-50 px-5 py-3 bg-gray-50/50">
        <button
          onClick={onAction}
          className="w-full py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
