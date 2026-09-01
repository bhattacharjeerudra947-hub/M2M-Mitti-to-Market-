import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import NotificationPanel from '../components/NotificationPanel';
import PriceChart from '../components/PriceChart';
import OrderTracker from '../components/OrderTracker';
import { ShoppingCart, Truck, Wallet, Heart, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { priceChartData, businessOrders } from '../data/mockData';

const marketInsights = [
  { name: 'Tomato', emoji: '🍅', price: 28, change: 4.2, trend: 'up' },
  { name: 'Onion', emoji: '🧅', price: 24, change: -1.8, trend: 'down' },
  { name: 'Potato', emoji: '🥔', price: 22, change: 2.1, trend: 'up' },
  { name: 'Grapes', emoji: '🍇', price: 65, change: -0.5, trend: 'down' },
  { name: 'Rice', emoji: '🌾', price: 35, change: 1.2, trend: 'up' },
  { name: 'Chili', emoji: '🌶️', price: 120, change: 8.5, trend: 'up' },
];

export default function BusinessDashboard() {
  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">Good morning, FreshMart 👋</h1>
            <p className="text-navy-500 mt-1">Here's your purchasing and sourcing overview.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<ShoppingCart className="w-5 h-5" />} label="Active Orders" value="12" change="+3" changeType="up" color="primary" />
            <StatCard icon={<Truck className="w-5 h-5" />} label="Pending Deliveries" value="4" change="-2" changeType="down" color="blue" />
            <StatCard icon={<Wallet className="w-5 h-5" />} label="Total Purchases" value="₹1,84,500" change="+15%" changeType="up" color="emerald" />
            <StatCard icon={<Heart className="w-5 h-5" />} label="Saved Suppliers" value="18" change="+2" changeType="up" color="accent" />
          </div>

          {/* Current Market Insights */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-navy-700 mb-4">Current Market Prices</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {marketInsights.map((item) => (
                  <div key={item.name} className="p-4 bg-mustard-50 rounded-xl hover:bg-mustard-100 border border-mustard-100 transition cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{item.emoji}</span>
                      <span className="text-sm font-semibold text-navy-800">{item.name}</span>
                    </div>
                    <p className="text-lg font-bold text-navy-900">₹{item.price}/kg</p>
                    <div className="flex items-center gap-1 mt-1">
                      {item.trend === 'up' ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                      )}
                      <span className={`text-xs font-semibold ${item.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.change >= 0 ? '+' : ''}{item.change}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <NotificationPanel />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <PriceChart
              data={priceChartData}
              dataKeys={[
                { name: 'month', xKey: 'month' },
                { name: 'tomato', label: 'Tomato' },
                { name: 'onion', label: 'Onion' },
                { name: 'potato', label: 'Potato' },
              ]}
              title="Market Price Trends (₹/kg)"
              colors={['#0f2a4a', '#d4a017', '#16a34a']}
              height={280}
            />
            <div>
              <h3 className="text-sm font-semibold text-navy-700 mb-3">Recent Orders</h3>
              <div className="space-y-4">
                {businessOrders.map((order) => (
                  <OrderTracker key={order.id} order={order} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
