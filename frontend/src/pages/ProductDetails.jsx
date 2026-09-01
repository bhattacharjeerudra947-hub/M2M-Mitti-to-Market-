import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { marketProduce } from '../data/mockData';
import { MapPin, Star, ShieldCheck, Calendar, Truck, Package, ArrowLeft, Clock, ShoppingBag } from 'lucide-react';

export default function ProductDetails() {
  const { id } = useParams();
  const product = marketProduce.find((p) => p.id === parseInt(id)) || marketProduce[0];

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-4xl mx-auto">
          <Link to="/business/browse" className="inline-flex items-center gap-2 text-sm text-navy-500 hover:text-navy-700 mb-6 transition">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Product Image / Visual */}
            <div className="bg-white rounded-3xl border border-navy-100 shadow-sm overflow-hidden">
              <div className="h-72 bg-gradient-to-br from-mustard-50 to-white flex items-center justify-center">
                <span className="text-9xl">{product.emoji}</span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  {product.verified && (                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-200">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Farmer
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    product.grade === 'A' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    Grade {product.grade}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-navy-900 mb-1">{product.name}</h1>
                <p className="text-navy-500 text-sm">{product.description}</p>
              </div>
            </div>

            {/* Right: Details */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-extrabold text-navy-900">₹{product.price}</span>
                  <span className="text-base text-gray-500">/ {product.unit}</span>
                  <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    product.priceChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {product.priceChange >= 0 ? '↑' : '↓'} {Math.abs(product.priceChange)}%
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Package className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Available Quantity</p>
                      <p className="text-sm font-semibold text-gray-900">{product.quantity.toLocaleString()} {product.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-semibold text-gray-900">{product.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Harvest Date</p>
                      <p className="text-sm font-semibold text-gray-900">{product.harvestDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Truck className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Estimated Delivery</p>
                      <p className="text-sm font-semibold text-gray-900">2-3 business days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Distance</p>
                      <p className="text-sm font-semibold text-gray-900">{product.distance} km from your location</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Farmer Info */}
              <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-navy-700 mb-3">Farmer Information</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center text-lg font-bold text-navy-700">
                    {product.farmer.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-navy-900">{product.farmer}</p>
                      {product.verified && <ShieldCheck className="w-4 h-4 text-primary-500" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {product.farmerRating}
                      </span>
                      <span>{product.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Buy Now
                </button>
                <Link
                  to="/business/bulk-order"
                  className="flex-1 py-3.5 bg-white border-2 border-navy-200 text-navy-700 font-semibold rounded-xl hover:bg-mustard-50 transition flex items-center justify-center gap-2"
                >
                  Request Bulk Order
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
