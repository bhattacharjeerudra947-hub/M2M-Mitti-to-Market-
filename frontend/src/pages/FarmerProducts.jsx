import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Plus, MapPin, Package, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api';

const categoryEmoji = {
  Fruits: '🍎',
  Vegetables: '🥬',
  Spices: '🌶️',
  Grains: '🌾',
  Dairy: '🥛',
};

export default function FarmerProducts() {
  const { user } = useAuth();
  const [produce, setProduce] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProduce = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiGet(`/api/produce/farmer/${user.id}`);
      setProduce(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduce();
  }, [user]);

  const statusColor = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-50 text-emerald-700';
      case 'LOW_STOCK': return 'bg-amber-50 text-amber-700';
      case 'SOLD_OUT': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'Available';
      case 'LOW_STOCK': return 'Low Stock';
      case 'SOLD_OUT': return 'Sold Out';
      case 'INACTIVE': return 'Inactive';
      default: return status;
    }
  };

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-navy-900">My Produce</h1>
              <p className="text-navy-500 mt-1">Manage your listed produce</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchProduce}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-navy-700 text-sm font-semibold rounded-xl border border-navy-200 hover:bg-navy-50 transition"
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
          ) : produce.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-navy-100">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">No produce listed yet</p>
              <p className="text-sm text-gray-500 mb-4">Start selling by adding your first produce listing.</p>
              <Link
                to="/farmer/add-produce"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition"
              >
                <Plus className="w-4 h-4" />
                Add Produce
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {produce.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{categoryEmoji[item.category] || '📦'}</span>
                      <div>
                        <h3 className="text-base font-semibold text-navy-900">{item.name}</h3>
                        <p className="text-xs text-gray-500">{item.quantity} {item.unit}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColor(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  {item.category && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-navy-50 text-navy-700">
                        {item.category}
                      </span>
                      {item.aiSuggestedMinPrice && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700">
                          AI: ₹{item.aiSuggestedMinPrice}–₹{item.aiSuggestedMaxPrice}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-xl font-bold text-navy-900">₹{item.pricePerUnit}</span>
                    <span className="text-sm text-gray-500">/ {item.unit}</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {item.location || 'No location set'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
