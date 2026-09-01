import Sidebar from '../components/Sidebar';
import PriceChart from '../components/PriceChart';
import StatCard from '../components/StatCard';
import { priceChartData, businessOrders } from '../data/mockData';
import { BarChart3, ShoppingCart, Wallet, TrendingUp, Package, Clock, ArrowUpRight } from 'lucide-react';

export default function BusinessAnalytics() {
  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500 mt-1">Your purchasing performance and insights</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<ShoppingCart className="w-5 h-5" />} label="Total Orders" value="48" change="+12" changeType="up" color="primary" />
            <StatCard icon={<Wallet className="w-5 h-5" />} label="Total Spent" value="₹18,45,000" change="+15%" changeType="up" color="emerald" />
            <StatCard icon={<Package className="w-5 h-5" />} label="Total Quantity" value="24,500 kg" change="+8%" changeType="up" color="blue" />
            <StatCard icon={<Clock className="w-5 h-5" />} label="Avg. Delivery" value="2.3 days" change="-0.5 days" changeType="down" color="purple" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <PriceChart
              data={priceChartData}
              dataKeys={[
                { name: 'month', xKey: 'month' },
                { name: 'tomato', label: 'Tomato' },
                { name: 'onion', label: 'Onion' },
              ]}
              title="Your Purchase Price Trends (₹/kg)"
              colors={['#16a34a', '#f97316']}
              height={280}
            />

            {/* Spending Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Spending by Category</h3>
              <div className="space-y-3">
                {[
                  { name: 'Tomato', emoji: '🍅', amount: 56000, pct: 30 },
                  { name: 'Onion', emoji: '🧅', amount: 72000, pct: 39 },
                  { name: 'Potato', emoji: '🥔', amount: 33000, pct: 18 },
                  { name: 'Others', emoji: '📦', amount: 23500, pct: 13 },
                ].map((cat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xl">{cat.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                        <span className="text-sm font-bold text-gray-900">₹{cat.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${cat.pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">{cat.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Top Suppliers by Volume</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { name: 'Suresh Patil', location: 'Nashik', orders: 12, total: 36000, spent: '₹4,80,000' },
                { name: 'Rajesh Kumar', location: 'Nashik', orders: 10, total: 28000, spent: '₹3,20,000' },
                { name: 'Mahesh Verma', location: 'Indore', orders: 8, total: 22000, spent: '₹2,40,000' },
                { name: 'Anil Jadhav', location: 'Kolhapur', orders: 6, total: 18000, spent: '₹1,80,000' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between p-5 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center text-sm font-bold text-primary-700">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.location} • {s.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{s.spent}</p>
                    <p className="text-xs text-gray-500">{s.total.toLocaleString()} kg</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
