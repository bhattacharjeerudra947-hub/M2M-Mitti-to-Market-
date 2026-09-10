import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import PriceChart from '../components/PriceChart';
import StatCard from '../components/StatCard';
import { apiGet } from '../api';
import { useAuth } from '../context/AuthContext';
import { Wallet, TrendingUp, ArrowUpRight, Banknote, Loader2, Inbox } from 'lucide-react';

const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function FarmerEarnings() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const data = await apiGet(`/api/orders/farmer/${user.id}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Real aggregates — computed from delivered orders, never hardcoded
  const delivered = orders.filter(o => o.status === 'DELIVERED');
  const now = new Date();
  const thisMonth = delivered
    .filter(o => o.orderDate && new Date(o.orderDate).getMonth() === now.getMonth()
      && new Date(o.orderDate).getFullYear() === now.getFullYear())
    .reduce((s, o) => s + (o.totalPrice || 0), 0);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = delivered
    .filter(o => o.orderDate && new Date(o.orderDate).getMonth() === lastMonthDate.getMonth()
      && new Date(o.orderDate).getFullYear() === lastMonthDate.getFullYear())
    .reduce((s, o) => s + (o.totalPrice || 0), 0);
  const total = delivered.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const changePct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10 : null;

  // Monthly earnings trend (last 6 months)
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
      return { month: new Date(Number(y), Number(m) - 1).toLocaleString('en-IN', { month: 'short' }), earnings: Math.round(total) };
    });

  const recentPayouts = delivered.slice(0, 6);

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900">Earnings</h1>
            <p className="text-navy-500 mt-1">Your real earnings from delivered orders</p>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading earnings...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard icon={<Wallet className="w-5 h-5" />} label="This Month" value={fmtINR(thisMonth)} change={changePct != null ? `${changePct >= 0 ? '+' : ''}${changePct}%` : '—'} changeType={changePct != null && changePct >= 0 ? 'up' : 'down'} color="primary" />
                <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Last Month" value={fmtINR(lastMonth)} color="blue" />
                <StatCard icon={<Banknote className="w-5 h-5" />} label="Total Earnings" value={fmtINR(total)} color="emerald" />
              </div>

              <PriceChart
                data={trend}
                dataKeys={[
                  { name: 'month', xKey: 'month' },
                  { name: 'earnings', label: 'Earnings (₹)' },
                ]}
                title="Monthly Earnings"
                unit="₹"
                colors={['#16a34a']}
                height={300}
              />

              {/* Recent Payouts — real delivered orders */}
              <div className="mt-6 bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-navy-700">Recent Completed Orders</h3>
                </div>
                {recentPayouts.length === 0 ? (
                  <div className="p-10 text-center">
                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No completed orders yet — earnings appear after delivery is confirmed.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {recentPayouts.map((o) => (
                      <div key={o.id} className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center border border-primary-200">
                            <ArrowUpRight className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-navy-900">Order #{o.id}</p>
                            <p className="text-xs text-navy-500">
                              {o.produceName || o.cropName || 'Produce'}
                              {o.orderDate && ` • ${new Date(o.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-primary-600">+{fmtINR(o.totalPrice)}</p>
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
