import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Plus, MapPin, Package, RefreshCw, Calendar, Clock, AlertTriangle, CheckCircle2, Archive } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api';

const categoryEmoji = {
  Fruits: '🍎',
  Vegetables: '🥬',
  Spices: '🌶️',
  Grains: '🌾',
  Dairy: '🥛',
  Pulses: '🫘',
  Oilseeds: '🌻',
};

export default function FarmerProducts() {
  const { user } = useAuth();
  const [produce, setProduce] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'HISTORY'

  const fetchProduce = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiGet(`/api/produce/farmer/${user.id}`);
      setProduce(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduce();
  }, [user]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isProduceActive = (item) => {
    const isSoldOut = item.status === 'SOLD_OUT' || (item.quantity != null && item.quantity <= 0);
    const isExpiredStatus = item.status === 'EXPIRED';
    const isRemoved = item.status === 'REMOVED' || item.status === 'ADMIN_REMOVED';
    const isPastExpiryDate = item.expiryDate && new Date(item.expiryDate) < today;
    return !isSoldOut && !isExpiredStatus && !isRemoved && !isPastExpiryDate;
  };

  const activeProduce = produce.filter(isProduceActive);
  const historyProduce = produce.filter(item => !isProduceActive(item));

  const displayList = activeTab === 'ACTIVE' ? activeProduce : historyProduce;

  const statusColor = (item) => {
    if (item.status === 'SOLD_OUT' || (item.quantity != null && item.quantity <= 0)) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (item.status === 'EXPIRED' || (item.expiryDate && new Date(item.expiryDate) < today)) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    switch (item.status) {
      case 'AVAILABLE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LOW_STOCK': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PARTIALLY_SOLD': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const statusLabel = (item) => {
    if (item.status === 'SOLD_OUT' || (item.quantity != null && item.quantity <= 0)) {
      return 'Sold Out';
    }
    if (item.status === 'EXPIRED' || (item.expiryDate && new Date(item.expiryDate) < today)) {
      return 'Expired';
    }
    switch (item.status) {
      case 'AVAILABLE': return 'Available';
      case 'LOW_STOCK': return 'Low Stock';
      case 'PARTIALLY_SOLD': return 'Partially Sold';
      default: return item.status?.replace('_', ' ') || 'Active';
    }
  };

  const getExpiryBadge = (item) => {
    if (!item.expiryDate) return null;
    const exp = new Date(item.expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || item.status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
          <AlertTriangle className="w-3 h-3" /> Expired
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
          <Clock className="w-3 h-3" /> Expires Today
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          <Clock className="w-3 h-3" /> {diffDays} {diffDays === 1 ? 'day' : 'days'} left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Fresh • {diffDays} days left
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-navy-900">My Produce</h1>
              <p className="text-navy-500 mt-1">Manage active listings and review historical sales</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchProduce}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-navy-700 text-sm font-semibold rounded-xl border border-navy-200 hover:bg-navy-50 transition shadow-xs"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                to="/farmer/add-produce"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Produce
              </Link>
            </div>
          </div>

          {/* Active vs Sold/History Tabs */}
          <div className="flex items-center gap-3 border-b border-navy-100 pb-3 mb-6">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'ACTIVE'
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-white text-navy-600 hover:bg-navy-50 border border-navy-100'
              }`}
            >
              <span>🌾 Active Listings</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'ACTIVE' ? 'bg-white/20 text-white' : 'bg-navy-100 text-navy-800'
              }`}>
                {activeProduce.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'HISTORY'
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-white text-navy-600 hover:bg-navy-50 border border-navy-100'
              }`}
            >
              <span>📦 Sold & Past Produce</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'HISTORY' ? 'bg-white/20 text-white' : 'bg-navy-100 text-navy-800'
              }`}>
                {historyProduce.length}
              </span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Loading your produce...</p>
            </div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-navy-100">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {activeTab === 'ACTIVE' ? 'No active produce listings' : 'No past or sold produce'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {activeTab === 'ACTIVE'
                  ? 'Start selling by adding your fresh harvest.'
                  : 'Produce that is completely sold out or past shelf life appears here.'}
              </p>
              {activeTab === 'ACTIVE' && (
                <Link
                  to="/farmer/add-produce"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Produce
                </Link>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayList.map((item) => {
                const totalQty = item.listedQuantity || item.quantity || 0;
                const remainingQty = item.quantity || 0;
                const soldQty = item.soldQuantity || Math.max(0, totalQty - remainingQty);

                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 hover:shadow-md transition flex flex-col justify-between">
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover border border-navy-100 shrink-0"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center text-2xl shrink-0">
                              {categoryEmoji[item.category] || '📦'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-navy-900 truncate">{item.name}</h3>
                            <p className="text-xs text-navy-500">{item.category || 'General'}</p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border shrink-0 ${statusColor(item)}`}>
                          {statusLabel(item)}
                        </span>
                      </div>

                      {/* Pricing & AI Advisor */}
                      <div className="flex items-baseline justify-between mb-3 pt-2 border-t border-navy-50">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-navy-900">₹{item.pricePerUnit}</span>
                          <span className="text-xs text-navy-500">/ {item.unit}</span>
                        </div>
                        {item.aiSuggestedMinPrice && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            AI: ₹{item.aiSuggestedMinPrice}–₹{item.aiSuggestedMaxPrice}
                          </span>
                        )}
                      </div>

                      {/* Stock Breakdown Progress */}
                      <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs space-y-1.5">
                        <div className="flex justify-between font-semibold">
                          <span className="text-navy-600">Available Stock</span>
                          <span className={remainingQty === 0 ? 'text-red-600 font-bold' : 'text-navy-900'}>
                            {remainingQty} {item.unit}
                          </span>
                        </div>

                        {totalQty > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, (remainingQty / totalQty) * 100))}%` }}
                            />
                          </div>
                        )}

                        <div className="flex justify-between text-[11px] text-gray-500 pt-0.5">
                          <span>Listed: {totalQty} {item.unit}</span>
                          {soldQty > 0 && <span className="text-emerald-700 font-medium">Sold: {soldQty} {item.unit}</span>}
                        </div>
                      </div>

                      {/* Shelf Life & Expiry Information */}
                      <div className="space-y-1.5 text-xs text-navy-600 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-[11px] flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Harvest Date:
                          </span>
                          <span className="font-medium text-navy-800 text-[11px]">
                            {item.harvestDate
                              ? new Date(item.harvestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'Not specified'}
                          </span>
                        </div>

                        {item.expiryDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Shelf Life:
                            </span>
                            <div>{getExpiryBadge(item)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Location */}
                    <div className="pt-2.5 border-t border-navy-50 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-navy-400" />
                        <span className="truncate">{item.location || 'Location not set'}</span>
                      </div>
                      <Link
                        to={`/marketplace/${item.id}`}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 ml-2 shrink-0"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

