import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { MapPin, ShieldCheck, Package, ArrowLeft, Clock, ShoppingBag, MessageCircle, Loader2, Heart, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api';

const categoryEmoji = {
  Fruits: '🍎', Vegetables: '🥬', Spices: '🌶️', Grains: '🌾', Dairy: '🥛',
};

export default function ProductDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQuantity, setOfferQuantity] = useState('');
  const [offerMessage, setOfferMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    apiGet(`/api/produce/${id}`)
      .then((data) => setProduct(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-mustard-50/30">
        <Sidebar role="business" />
        <main className="flex-1 p-8 lg:pl-0 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-4" />
            <p className="text-sm text-gray-500">Loading product details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen bg-mustard-50/30">
        <Sidebar role="business" />
        <main className="flex-1 p-8 lg:pl-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-500 mb-4">{error || 'Product not found'}</p>
            <Link to="/business/browse" className="text-navy-700 font-semibold hover:underline">← Back to Marketplace</Link>
          </div>
        </main>
      </div>
    );
  }

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
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-9xl">{categoryEmoji[product.category] || '📦'}</span>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    product.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' :
                    product.status === 'LOW_STOCK' ? 'bg-amber-50 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {product.status === 'LOW_STOCK' ? 'Low Stock' : product.status?.charAt(0) + product.status?.slice(1).toLowerCase()}
                  </span>
                  {product.category && (
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-navy-50 text-navy-700">
                      {product.category}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-navy-900 mb-1">{product.name}</h1>
                <p className="text-navy-500 text-sm">{product.description || 'Fresh produce from verified farmer'}</p>
              </div>
            </div>

            {/* Right: Details */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-extrabold text-navy-900">₹{product.pricePerUnit}</span>
                  <span className="text-base text-gray-500">/ {product.unit}</span>
                  {product.aiSuggestedMinPrice && (
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                      AI: ₹{product.aiSuggestedMinPrice}–₹{product.aiSuggestedMaxPrice}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Package className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Available Quantity</p>
                      <p className="text-sm font-semibold text-gray-900">{product.quantity?.toLocaleString()} {product.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-semibold text-gray-900">{product.location || 'India'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Listed</p>
                      <p className="text-sm font-semibold text-gray-900">{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'Recently'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Farmer Info */}
              <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-navy-700 mb-3">Farmer Information</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center text-lg font-bold text-navy-700">
                    {(product.farmerName || 'F').charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-navy-900">{product.farmerName || 'Farmer'}</p>
                      <ShieldCheck className="w-4 h-4 text-primary-500" />
                    </div>
                    <p className="text-xs text-gray-500">{product.location || 'India'}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {user && product.farmerId && product.farmerId !== user.id ? (
                <>
                  {!showInterestForm && !interestSent ? (
                    <button
                      onClick={() => setShowInterestForm(true)}
                      className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <Heart className="w-5 h-5" />
                      Show Interest / Contact Farmer
                    </button>
                  ) : interestSent ? (
                    <div className="w-full py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold rounded-xl flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" /> Interest Sent! Farmer will respond soon.
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-navy-100 p-4 space-y-3">
                      <h3 className="text-sm font-bold text-navy-900">Make an Offer</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Your Price (₹/{product.unit})</label>
                          <input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)}
                            placeholder={product.pricePerUnit?.toString()}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Quantity ({product.unit})</label>
                          <input type="number" value={offerQuantity} onChange={(e) => setOfferQuantity(e.target.value)}
                            placeholder={product.quantity?.toString()}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Message (optional)</label>
                        <textarea value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)}
                          placeholder="Hi, I'm interested in purchasing your produce..."
                          rows={2}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1 resize-none" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowInterestForm(false)}
                          className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            setInterestLoading(true);
                            try {
                              await apiPost('/api/interests', {
                                produceId: product.id,
                                offeredPrice: offerPrice ? Number(offerPrice) : null,
                                offeredQuantity: offerQuantity ? Number(offerQuantity) : null,
                                message: offerMessage || null,
                              });
                              setInterestSent(true);
                              setShowInterestForm(false);
                            } catch (err) {
                              setError(err.message);
                            } finally {
                              setInterestLoading(false);
                            }
                          }}
                          disabled={interestLoading}
                          className="flex-1 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                          {interestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                          Send Interest
                        </button>
                      </div>
                    </div>
                  )}
                  <Link
                    to={`/business/chat/new/${product.farmerId}?produceId=${product.id}`}
                    className="w-full py-3.5 bg-white border-2 border-navy-200 text-navy-700 font-semibold rounded-xl hover:bg-mustard-50 transition flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Message Farmer
                  </Link>
                </>
              ) : (
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
              )}

              {/* Message Farmer */}
              {user && product.farmerId && product.farmerId !== user.id && (
                <Link
                  to={`/business/chat/new/${product.farmerId}?produceId=${product.id}`}
                  className="w-full py-3.5 bg-white border-2 border-navy-200 text-navy-700 font-semibold rounded-xl hover:bg-mustard-50 transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Message Farmer
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
