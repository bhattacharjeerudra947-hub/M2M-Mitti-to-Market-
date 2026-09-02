import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api';

const statusStages = {
  PENDING: [false, false, false, false],
  CONFIRMED: [true, false, false, false],
  PACKED: [true, true, false, false],
  IN_TRANSIT: [true, true, true, false],
  DELIVERED: [true, true, true, true],
  CANCELLED: [false, false, false, false],
};

function OrderCard({ order }) {
  const stages = statusStages[order.status] || [false, false, false, false];
  const labels = ['Confirmed', 'Picked Up', 'In Transit', 'Delivered'];
  const currentIdx = stages.findIndex((s) => !s);
  const progress = currentIdx === -1 ? 100 : (currentIdx / 3) * 100;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500">Order #{order.id}</p>
          <h3 className="text-sm font-bold text-gray-900 mt-0.5">{order.produceName} · {order.quantity} units</h3>
        </div>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
          order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          order.status === 'IN_TRANSIT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          order.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-navy-50 text-navy-700 border border-navy-200'
        }`}>
          {order.status.replace('_', ' ')}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-4">From {order.farmerName}</p>

      <div className="relative mb-6">
        <div className="h-1.5 bg-gray-100 rounded-full">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {labels.map((label, i) => (
          <div key={i} className="text-center">
            <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-1 text-xs font-bold ${
              stages[i] ? 'bg-emerald-500 text-white' :
              i === currentIdx ? 'bg-amber-100 text-amber-700 ring-4 ring-amber-50' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i + 1}
            </div>
            <p className={`text-[10px] font-medium ${
              stages[i] ? 'text-emerald-700' : i === currentIdx ? 'text-gray-800' : 'text-gray-400'
            }`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
        </span>
        <span className="font-bold text-gray-900">₹{order.totalPrice?.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function BusinessOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiGet(`/api/orders/buyer/${user.id}`);
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-500 mt-1">Track your purchase orders</p>
            </div>
            <button
              onClick={fetchOrders}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders yet. Browse the marketplace to place your first order!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
