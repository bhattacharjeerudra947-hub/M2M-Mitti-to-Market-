import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { Package, Truck, Clock, Check, ChevronRight, Filter } from 'lucide-react';
import { getFarmerDeals, getBuyerDeals } from '../api/dealApi';

const STATUS_LABELS = {
  NEGOTIATING: '💬 Bargaining', LOCK_PENDING: '⏳ Confirming', LOCKED: '🔒 Deal Locked',
  LOGISTICS_PENDING: '🚚 Logistics Pending', LOGISTICS_ASSIGNED: '👨‍✈️ Assigned',
  PICKUP_SCHEDULED: '📅 Pickup Scheduled', PICKED_UP: '📦 Picked Up',
  IN_TRANSIT: '🚚 In Transit', OUT_FOR_DELIVERY: '🏪 Out for Delivery',
  DELIVERED: '📦 Delivered', COMPLETED: '✅ Completed', CANCELLED: '❌ Cancelled', DISPUTED: '⚠️ Disputed'
};

const STATUS_COLORS = {
  NEGOTIATING: 'bg-gray-100 text-gray-700', LOCK_PENDING: 'bg-amber-50 text-amber-700',
  LOCKED: 'bg-blue-50 text-blue-700', LOGISTICS_PENDING: 'bg-purple-50 text-purple-700',
  LOGISTICS_ASSIGNED: 'bg-indigo-50 text-indigo-700', PICKUP_SCHEDULED: 'bg-cyan-50 text-cyan-700',
  PICKED_UP: 'bg-orange-50 text-orange-700', IN_TRANSIT: 'bg-blue-50 text-blue-700',
  OUT_FOR_DELIVERY: 'bg-violet-50 text-violet-700', DELIVERED: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-red-50 text-red-600',
  DISPUTED: 'bg-red-50 text-red-700'
};

const STATUS_FLOW = ['LOCK_PENDING','LOCKED','LOGISTICS_PENDING','LOGISTICS_ASSIGNED',
  'PICKUP_SCHEDULED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','COMPLETED'];

export default function MyDeals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    const isFarmer = user.role === 'FARMER';
    const fetchDeals = isFarmer ? getFarmerDeals : getBuyerDeals;
    fetchDeals(user.id)
      .then(data => setDeals(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const isFarmer = user?.role === 'FARMER';
  const sidebarRole = isFarmer ? 'farmer' : 'business';

  const activeDeals = deals.filter(d => !['COMPLETED', 'CANCELLED'].includes(d.status));
  const completedDeals = deals.filter(d => d.status === 'COMPLETED');
  const filtered = filter === 'all' ? deals :
    filter === 'active' ? activeDeals :
    filter === 'completed' ? completedDeals :
    deals.filter(d => d.status === filter.toUpperCase());

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role={sidebarRole} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy-900">{isFarmer ? 'My Deals' : 'My Purchases'}</h1>
            <p className="text-sm text-navy-500 mt-1">{activeDeals.length} active · {completedDeals.length} completed · {deals.length} total</p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { key: 'all', label: `All (${deals.length})` },
              { key: 'active', label: `Active (${activeDeals.length})` },
              { key: 'completed', label: `Completed (${completedDeals.length})` },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition ${
                  filter === f.key ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 border border-navy-200 hover:border-mustard-300'
                }`}>{f.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading deals...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-navy-100">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">No deals yet</p>
              <p className="text-sm text-gray-500">Deals will appear here once you lock a transaction through chat.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(deal => (
                <div key={deal.id} className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-navy-900">{deal.cropName}</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${STATUS_COLORS[deal.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[deal.status] || deal.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{deal.dealId}</p>
                    </div>
                    <p className="text-sm font-bold text-navy-900">₹{Number(deal.totalAmount).toLocaleString()}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                    <div>
                      <p className="text-gray-400">{isFarmer ? 'Buyer' : 'Farmer'}</p>
                      <p className="font-semibold text-navy-900">{isFarmer ? deal.buyerName : deal.farmerName}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Quantity</p>
                      <p className="font-semibold">{deal.quantity} {deal.unit}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Price</p>
                      <p className="font-semibold">₹{deal.agreedPrice}/{deal.unit}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Logistics</p>
                      <p className="font-semibold">{deal.logisticsType || 'Not selected'}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {deal.status !== 'CANCELLED' && (
                    <div className="mb-2">
                      <div className="flex gap-0.5">
                        {STATUS_FLOW.map((s, i) => {
                          const currentIdx = STATUS_FLOW.indexOf(deal.status);
                          return <div key={s} className={`h-1.5 rounded-full flex-1 ${i <= currentIdx ? 'bg-emerald-500' : 'bg-gray-200'}`} />;
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>Created {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : ''}</span>
                    {deal.lockedAt && <span>Locked {new Date(deal.lockedAt).toLocaleDateString()}</span>}
                    {deal.expectedDelivery && <span>ETA {new Date(deal.expectedDelivery).toLocaleDateString()}</span>}
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
