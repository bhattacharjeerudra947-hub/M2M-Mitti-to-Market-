import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import NotificationPanel from '../components/NotificationPanel';
import PriceChart from '../components/PriceChart';
import OrderTracker from '../components/OrderTracker';
import { ShoppingCart, Truck, Wallet, Heart } from 'lucide-react';
import MarketPricesLive from '../components/MarketPricesLive';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api';

export default function BusinessDashboard() {
  const { user, isGuestModeActive } = useAuth();
  const displayName = user?.name?.split(' ')[0] || 'Business';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceChartData, setPriceChartData] = useState([]); // NEW: fixes ReferenceError

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiGet(`/api/orders/buyer/${user.id}`)
      .then((data) => setOrders(data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user]);

  // Real spend trend: delivered order value per month (last 6 months)
  useEffect(() => {
    const byMonth = new Map();
    for (const o of orders) {
      if (o.status !== 'DELIVERED' || !o.orderDate) continue;
      const d = new Date(o.orderDate);
      if (isNaN(d)) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) || 0) + (o.totalPrice || 0));
    }
    setPriceChartData([...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, total]) => {
        const [y, m] = key.split('-');
        return { month: new Date(Number(y), Number(m) - 1).toLocaleString('en-IN', { month: 'short' }), spend: Math.round(total) };
      }));
  }, [orders]);

  const activeOrders = orders.filter(o => !['DELIVERED','CANCELLED'].includes(o.status));
  const pendingDeliveries = orders.filter(o => ['CONFIRMED','PACKED','IN_TRANSIT'].includes(o.status));
  const totalSpent = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  // Real count: distinct farmers this buyer has actually ordered from (no hardcoded numbers)
  const distinctSuppliers = new Set(
    orders.map(o => o.farmer?.id ?? o.farmerId ?? o.farmer?.name ?? o.farmerName).filter(Boolean)
  ).size;

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">Good morning, {displayName} 👋</h1>
            <p className="text-navy-500 mt-1">
              {isGuestModeActive
                ? 'You are exploring as a guest. Sign in to unlock all features.'
                : "Here's your purchasing and sourcing overview."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<ShoppingCart className="w-5 h-5" />} label="Active Orders" value={String(activeOrders.length)} color="primary" />
            <StatCard icon={<Truck className="w-5 h-5" />} label="Pending Deliveries" value={String(pendingDeliveries.length)} color="blue" />
            <StatCard icon={<Wallet className="w-5 h-5" />} label="Total Purchases" value={`₹${totalSpent.toLocaleString()}`} color="emerald" />
            <StatCard icon={<Heart className="w-5 h-5" />} label="Suppliers Ordered From" value={String(distinctSuppliers)} color="accent" />
          </div>

          {/* Current Market Insights */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-navy-700 mb-4">Current Market Prices</h3>
              <MarketPricesLive limit={6} />
            </div>
            <NotificationPanel />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <PriceChart
              data={priceChartData}
              dataKeys={[
                { name: 'month', xKey: 'month' },
                { name: 'spend', label: 'Spend (₹)' },
              ]}
              title="Monthly Spend (₹)"
              unit="₹"
              colors={['#0f2a4a']}
              height={280}
            />
            <div>
              <h3 className="text-sm font-semibold text-navy-700 mb-3">Recent Orders</h3>
              {loading ? (
                <div className="text-center py-8"><div className="animate-spin w-6 h-6 border-4 border-navy-900 border-t-transparent rounded-full mx-auto" /></div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-gray-500 py-8">
                  {isGuestModeActive
                    ? 'Sign in to view your orders and purchasing history.'
                    : 'No orders yet. Browse the marketplace to place your first order.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order) => (
                    <OrderTracker key={order.id} order={order} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}