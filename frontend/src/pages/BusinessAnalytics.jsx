import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import PriceChart from '../components/PriceChart';
import StatCard from '../components/StatCard';
import { ProgressFunnel, CategoryDistribution } from '../components/AnalyticsCharts';
import AnalyticsVoiceAssistant from '../components/AnalyticsVoiceAssistant';
import { apiGet } from '../api';
import { useAuth } from '../context/AuthContext';
import { BarChart3, ShoppingCart, Wallet, Package, Loader2, Inbox, ClipboardCheck, ArrowUpRight } from 'lucide-react';

const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function BusinessAnalytics() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('area');
  const [metric, setMetric] = useState('SPEND'); // 'SPEND' | 'VOLUME' | 'MARKET'
  const [marketPrices, setMarketPrices] = useState([]);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [orderData, analyticsData, advisor] = await Promise.all([
        apiGet(`/api/orders/buyer/${user.id}`).catch(() => []),
        apiGet(`/api/analytics/buyer/${user.id}`).catch(() => null),
        apiGet('/api/price-advisor/all').catch(() => []),
      ]);
      setOrders(Array.isArray(orderData) ? orderData : []);
      setAnalytics(analyticsData);
      setMarketPrices(Array.isArray(advisor) ? advisor.slice(0, 8) : []);
    } catch {
      setOrders([]);
      setAnalytics(null);
      setMarketPrices([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const delivered = orders.filter(o => o.status === 'DELIVERED');
  const totalSpent = analytics?.totalSpend != null && analytics.totalSpend > 0
    ? analytics.totalSpend
    : delivered.reduce((s, o) => s + (o.totalPrice || 0), 0);

  const totalQty = analytics?.totalKgProcured != null && analytics.totalKgProcured > 0
    ? analytics.totalKgProcured
    : delivered.reduce((s, o) => s + (o.quantity || 0), 0);

  const spendTrend = analytics?.spendTrend && analytics.spendTrend.length > 0
    ? analytics.spendTrend
    : (() => {
        const byMonth = new Map();
        for (const o of delivered) {
          if (!o.orderDate) continue;
          const d = new Date(o.orderDate);
          if (isNaN(d)) continue;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          byMonth.set(key, (byMonth.get(key) || 0) + (o.totalPrice || 0));
        }
        return [...byMonth.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([key, total]) => {
            const [y, m] = key.split('-');
            return { month: new Date(Number(y), Number(m) - 1).toLocaleString('en-IN', { month: 'short' }), spend: Math.round(total) };
          });
      })();

  const pipelineStages = analytics?.pipelineStages || [];
  const spendByCategory = analytics?.spendByCategory || {};
  const reqProgress = analytics?.requirementsProgress || { total: 0, fulfilled: 0, fulfillmentRatePct: 0, totalKgRequested: 0, totalKgFulfilled: 0 };

  // Top suppliers by spend
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

  // Active chart configuration based on metric selector
  const chartConfig = metric === 'VOLUME' ? {
    data: spendTrend,
    dataKeys: [
      { name: 'month', xKey: 'month' },
      { name: 'volumeKg', label: 'Volume Procured (kg)' },
    ],
    title: 'Monthly Sourcing Volume (kg)',
    subtitle: 'Track physical commodity volume procured across settled deals',
    unit: 'kg',
    colors: ['#2563eb'],
  } : metric === 'MARKET' ? {
    data: marketPrices,
    dataKeys: [
      { name: 'name', xKey: 'name' },
      { name: 'marketAvgPrice', label: 'Mandi Wholesale Price (₹/kg)' },
      { name: 'aiOptimalPrice', label: 'Recommended Farmgate (₹/kg)' },
    ],
    title: 'Mandi Wholesale Commodity Benchmarks',
    subtitle: 'Current market rates across key agricultural produce',
    unit: '₹',
    colors: ['#0f2a4a', '#10b981'],
  } : {
    data: spendTrend,
    dataKeys: [
      { name: 'month', xKey: 'month' },
      { name: 'spend', label: 'Spend (₹)' },
    ],
    title: 'Monthly Procurement Spend (₹)',
    subtitle: 'Includes settled deals and delivered orders',
    unit: '₹',
    colors: ['#0f2a4a'],
  };

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-navy-900 text-white text-lg">📊</span>
              <h1 className="text-2xl font-bold text-gray-900">Procurement & Sourcing Analytics</h1>
            </div>
            <p className="text-gray-500 mt-1">Track purchasing progress, order lifecycles, and crop procurement volume.</p>
          </div>

          <AnalyticsVoiceAssistant userRole="BUSINESS" />

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading procurement analytics...</p>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<ShoppingCart className="w-5 h-5" />}
                  label="Completed Purchases"
                  value={String(analytics?.completedOrders || delivered.length)}
                  color="primary"
                />
                <StatCard
                  icon={<Wallet className="w-5 h-5" />}
                  label="Total Spend (Realized)"
                  value={fmtINR(totalSpent)}
                  color="emerald"
                />
                <StatCard
                  icon={<Package className="w-5 h-5" />}
                  label="Total Volume Sourced"
                  value={`${totalQty.toLocaleString('en-IN')} kg`}
                  color="blue"
                />
                <StatCard
                  icon={<BarChart3 className="w-5 h-5" />}
                  label="Distinct Suppliers"
                  value={String(analytics?.distinctSuppliers || topSuppliers.length || bySupplier.size)}
                  color="purple"
                />
              </div>

              {/* Spend Progression Chart & Pipeline Funnel */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Metric Selectors */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 text-xs font-semibold shadow-xs">
                      <button
                        onClick={() => setMetric('SPEND')}
                        className={`px-3 py-1.5 rounded-lg transition ${metric === 'SPEND' ? 'bg-navy-900 text-white shadow-xs' : 'text-gray-600 hover:text-navy-900'}`}
                      >
                        💳 Spend (₹)
                      </button>
                      <button
                        onClick={() => setMetric('VOLUME')}
                        className={`px-3 py-1.5 rounded-lg transition ${metric === 'VOLUME' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-navy-900'}`}
                      >
                        📦 Volume (kg)
                      </button>
                      <button
                        onClick={() => setMetric('MARKET')}
                        className={`px-3 py-1.5 rounded-lg transition ${metric === 'MARKET' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-navy-900'}`}
                      >
                        📈 Mandi Rates (₹)
                      </button>
                    </div>

                    {/* Chart Shape */}
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 text-xs self-end">
                      <button
                        onClick={() => setChartType('area')}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${chartType === 'area' ? 'bg-navy-900 text-white' : 'text-gray-600 hover:text-navy-900'}`}
                      >
                        Area
                      </button>
                      <button
                        onClick={() => setChartType('bar')}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${chartType === 'bar' ? 'bg-navy-900 text-white' : 'text-gray-600 hover:text-navy-900'}`}
                      >
                        Bar
                      </button>
                      <button
                        onClick={() => setChartType('line')}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${chartType === 'line' ? 'bg-navy-900 text-white' : 'text-gray-600 hover:text-navy-900'}`}
                      >
                        Line
                      </button>
                    </div>
                  </div>

                  <PriceChart
                    data={chartConfig.data}
                    dataKeys={chartConfig.dataKeys}
                    title={chartConfig.title}
                    subtitle={chartConfig.subtitle}
                    unit={chartConfig.unit}
                    colors={chartConfig.colors}
                    height={280}
                    chartType={chartType}
                  />
                </div>

                <div className="space-y-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sourcing Status Flow</span>
                  <ProgressFunnel
                    title="Procurement Pipeline Progress"
                    subtitle="Progression from active offers to delivered goods"
                    stages={pipelineStages.length > 0 ? pipelineStages : [
                      { stage: 'Placed / Negotiating', count: 0, color: '#f59e0b' },
                      { stage: 'Confirmed / Packed', count: 0, color: '#3b82f6' },
                      { stage: 'In Transit', count: 0, color: '#8b5cf6' },
                      { stage: 'Delivered / Completed', count: 0, color: '#10b981' },
                    ]}
                  />
                </div>
              </div>

              {/* Requirement Fulfillment & Spending Breakdown */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Requirements Fulfillment Progress */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-sm font-bold text-gray-900">Bulk Demand Fulfillment Progress</h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      {reqProgress.fulfillmentRatePct || 0}% Fulfilled
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-y border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Demands Posted</p>
                      <p className="text-xl font-bold text-gray-900">{reqProgress.total || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Completed Contracts</p>
                      <p className="text-xl font-bold text-emerald-700">{reqProgress.fulfilled || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Volume Requested: {reqProgress.totalKgRequested?.toLocaleString('en-IN') || 0} kg</span>
                      <span className="font-bold text-gray-900">Supplied: {reqProgress.totalKgFulfilled?.toLocaleString('en-IN') || 0} kg</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, reqProgress.fulfillmentRatePct || 0)}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    Bulk requirements are matched against certified farmer inventory with automated price suggestions.
                  </p>
                </div>

                {/* Spending by Produce Category */}
                <CategoryDistribution
                  title="Spending Breakdown by Crop Category"
                  data={spendByCategory}
                  unit="₹"
                />
              </div>

              {/* Top Suppliers */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Top Farmer Partners by Sourcing Spend</h3>
                  <span className="text-xs text-gray-400">Verified Suppliers</span>
                </div>
                {topSuppliers.length === 0 ? (
                  <div className="p-10 text-center">
                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Complete purchases to see your top farmer suppliers ranked here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {topSuppliers.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-navy-100 rounded-full flex items-center justify-center text-xs font-bold text-navy-800">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{s.name}</p>
                            <p className="text-[11px] text-gray-500">{s.location ? `${s.location} • ` : ''}{s.orders} order{s.orders === 1 ? '' : 's'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-navy-900">{fmtINR(s.spent)}</p>
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
