import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import PriceChart from '../components/PriceChart';
import StatCard from '../components/StatCard';
import { apiGet } from '../api';
import { useAuth } from '../context/AuthContext';
import { BarChart3, ShoppingCart, Wallet, Package, Loader2, Inbox } from 'lucide-react';

const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function BusinessAnalytics() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const data = await apiGet(`/api/orders/buyer/${user.id}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const delivered = orders.filter(o => o.status === 'DELIVERED');
  const totalSpent = delivered.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const totalQty = delivered.reduce((s, o) => s + (o.quantity || 0), 0);

  // Monthly spend trend (last 6 months)
  const byMonth = new Map();
  for (const o of delivered) {
    if (!o.orderDate) continue;
    const d = new Date(o.orderDate);
    if (isNaN(d)) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, (byMonth.get(key) || 0) + (o.totalPrice || 0));
  }
  const trend = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, total]) => {
      const [y, m] = key.split('-');
      return { month: new Date(Number(y), Number(m) - 1).toLocaleString('en-IN', { month: 'short' }), spend: Math.round(total) };
    });

  // Spending by produce category (from real orders)
  const byProduce = new Map();
  for (const o of delivered) {
    const name = o.produceName || o.cropName || 'Other';
    byProduce.set(name, (byProduce.get(name) || 0) + (o.totalPrice || 0));
  }
  const categories = [...byProduce.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, amount]) => ({ name, amount, pct: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0 }));

  // Top suppliers by real order count/spend
  const bySupplier = new Map();
  for (const o of delivered) {
    const key = o.farmerName || o.farmer?.name;
    if (!key) continue;
    const cur = bySupplier.get(key) || { name: key, location: o.farmer?.location || o.farmerLocation || '', orders: 0, spent: 0 };
    cur.orders += 1;
    cur.spent += o.totalPrice || 0;
    bySupplier.set(key, cur);
  }
  const topSuppliers = [...bySupplier.values()].sort((a, b) => b.spent - a.spent).slice(0, 5);

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500 mt-1">Your purchasing performance and insights</p>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading analytics...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={<ShoppingCart className="w-5 h-5" />} label="Total Orders" value={String(delivered.length)} color="primary" />
                <StatCard icon={<Wallet className="w-5 h-5" />} label="Total Spent" value={fmtINR(totalSpent)} color="emerald" />
                <StatCard icon={<Package className="w-5 h-5" />} label="Total Quantity" value={`${totalQty.toLocaleString('en-IN')} kg`} color="blue" />
                <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Suppliers" value={String(topSuppliers.length || bySupplier.size)} color="purple" />
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <PriceChart
                  data={trend}
                  dataKeys={[
                    { name: 'month', xKey: 'month' },
                    { name: 'spend', label: 'Spend (₹)' },
                  ]}
                  title="Your Monthly Spend (₹)"
                  unit="₹"
                  colors={['#16a34a']}
                  height={280}
                />

                {/* Spending Breakdown */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Spending by Produce</h3>
                  {categories.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No completed orders yet — your spending breakdown appears here after deliveries.</p>
                  ) : (
                    <div className="space-y-3">
                      {categories.map((cat, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xl">📦</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                              <span className="text-sm font-bold text-gray-900">{fmtINR(cat.amount)}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${cat.pct}%` }} />
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">{cat.pct}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Suppliers */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">Top Suppliers by Spend</h3>
                </div>
                {topSuppliers.length === 0 ? (
                  <div className="p-10 text-center">
                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No supplier history yet — complete orders to see your top farmers here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {topSuppliers.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-5 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center text-sm font-bold text-primary-700">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-500">{s.location ? `${s.location} • ` : ''}{s.orders} order{s.orders === 1 ? '' : 's'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{fmtINR(s.spent)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
