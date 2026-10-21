import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import PriceChart from '../components/PriceChart';
import StatCard from '../components/StatCard';
import { ProgressFunnel, CategoryDistribution } from '../components/AnalyticsCharts';
import AnalyticsVoiceAssistant from '../components/AnalyticsVoiceAssistant';
import { apiGet } from '../api';
import { useAuth } from '../context/AuthContext';
import { useFarmerLanguage } from '../context/FarmerContext';
import { t_key } from '../data/farmerTranslations';
import {
  Wallet, Package, TrendingUp, CheckCircle2, BarChart3, Loader2,
  ArrowUpRight, Inbox, Warehouse, Truck, ShieldAlert, Sparkles, Users, Award
} from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';
import VerificationStatusBanner from '../components/VerificationStatusBanner';

const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function FarmerAnalytics() {
  const { user } = useAuth();
  const { language } = useFarmerLanguage();
  const [analytics, setAnalytics] = useState(null);
  const [fpoAnalytics, setFpoAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('REVENUE'); // 'REVENUE' | 'VOLUME' | 'MARKET' | 'PROFITABILITY'
  const [chartType, setChartType] = useState('area');
  const [marketPrices, setMarketPrices] = useState([]);
  const [activeTab, setActiveTab] = useState('INDIVIDUAL'); // 'INDIVIDUAL' | 'FPO_COLLECTIVE'
  const [focusedMetric, setFocusedMetric] = useState(null);

  const isFpoUser = user?.farmerType === 'FPO' || user?.role === 'FPO';

  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [data, advisor, fpoData] = await Promise.all([
        apiGet(`/api/analytics/farmer/${user.id}`).catch(() => null),
        apiGet('/api/price-advisor/all').catch(() => []),
        isFpoUser ? apiGet(`/api/analytics/fpo/${user.id}`).catch(() => null) : Promise.resolve(null),
      ]);
      setAnalytics(data);
      setMarketPrices(Array.isArray(advisor) ? advisor.slice(0, 8) : []);
      setFpoAnalytics(fpoData);
    } catch {
      setAnalytics(null);
      setMarketPrices([]);
    } finally {
      setLoading(false);
    }
  }, [user, isFpoUser]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleVoiceFocus = (metricKey, chartFocus) => {
    setFocusedMetric(metricKey);
    if (metricKey === 'STORAGE_EXPENSES' || metricKey === 'CROP_PROFITABILITY') {
      setMetric('PROFITABILITY');
    } else if (metricKey === 'UNSOLD_INVENTORY') {
      setMetric('VOLUME');
    } else {
      setMetric('REVENUE');
    }
    // Auto-clear highlight pulse after 6 seconds
    setTimeout(() => setFocusedMetric(null), 6000);
  };

  const earningsTrend = analytics?.earningsTrend || [];
  const pipelineStages = analytics?.pipelineStages || [];
  const produceByCategory = analytics?.produceByCategory || {};
  const cropProfitability = analytics?.cropProfitability || [];
  const storedVsDirect = analytics?.storedVsDirect || {};
  const actionableTrends = analytics?.trends || [];
  const payments = analytics?.payments || { received: 0, inEscrow: 0, unpaid: 0 };

  // Chart configuration based on active metric
  const chartConfig = metric === 'VOLUME' ? {
    data: earningsTrend,
    dataKeys: [
      { name: 'month', xKey: 'month' },
      { name: 'volumeKg', label: 'Volume Sold (kg)' },
    ],
    title: 'Monthly Produce Volume Sold (kg)',
    subtitle: 'Track physical weight delivered and settled over time',
    unit: 'kg',
    colors: ['#0284c7'],
  } : metric === 'MARKET' ? {
    data: marketPrices,
    dataKeys: [
      { name: 'name', xKey: 'name' },
      { name: 'aiOptimalPrice', label: 'Recommended Farmgate Price (₹/kg)' },
      { name: 'marketAvgPrice', label: 'Mandi Market Average (₹/kg)' },
    ],
    title: 'State Mandi Crop Benchmark Intelligence',
    subtitle: 'Current live agricultural market rates for top traded commodities',
    unit: '₹',
    colors: ['#16a34a', '#d97706'],
  } : metric === 'PROFITABILITY' ? {
    data: cropProfitability.slice(0, 6),
    dataKeys: [
      { name: 'cropName', xKey: 'cropName' },
      { name: 'netRealizationPerKg', label: 'Net Realization (₹/kg)' },
      { name: 'avgSellingPricePerKg', label: 'Gross Selling Price (₹/kg)' },
    ],
    title: 'Crop-wise Net Realization vs Gross Selling Price',
    subtitle: 'Transparent deduction of storage, handling, freight, and platform fees per kg',
    unit: '₹',
    colors: ['#10b981', '#3b82f6'],
  } : {
    data: earningsTrend,
    dataKeys: [
      { name: 'month', xKey: 'month' },
      { name: 'earnings', label: 'Sales Revenue (₹)' },
    ],
    title: 'Monthly Sales & Earnings Trajectory',
    subtitle: 'Realized income across completed deals and fulfilled orders',
    unit: '₹',
    colors: ['#16a34a'],
  };

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-600 text-white text-lg">📊</span>
                <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">
                  {t_key(language, 'analytics') || 'Farm, Storage & Business Analytics'}
                </h1>
              </div>
              <p className="text-navy-500 mt-1 text-sm">
                Track true net realizations, cold storage expenses, inventory turnover, and multilingual insights.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isFpoUser && (
                <div className="flex bg-white rounded-xl border border-navy-200 p-1 text-xs font-semibold shadow-xs">
                  <button
                    onClick={() => setActiveTab('INDIVIDUAL')}
                    className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'INDIVIDUAL' ? 'bg-navy-900 text-white' : 'text-gray-600 hover:text-navy-900'}`}
                  >
                    My Farm
                  </button>
                  <button
                    onClick={() => setActiveTab('FPO_COLLECTIVE')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTab === 'FPO_COLLECTIVE' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-navy-900'}`}
                  >
                    <Users className="w-3.5 h-3.5" /> FPO Collective
                  </button>
                </div>
              )}
              <LanguageSelector />
            </div>
          </div>

          <VerificationStatusBanner />

          {/* Multilingual Voice-Based Analytics Assistant */}
          <AnalyticsVoiceAssistant
            userRole="FARMER"
            onFocusMetric={handleVoiceFocus}
          />

          {loading ? (
            <div className="text-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Calculating farm and storage analytics...</p>
            </div>
          ) : activeTab === 'FPO_COLLECTIVE' && fpoAnalytics ? (
            /* ══════════════════════════════════════════════════════════
               FPO COLLECTIVE VIEW
               ══════════════════════════════════════════════════════════ */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<Users className="w-5 h-5" />}
                  label="Member Farmers"
                  value={String(fpoAnalytics.memberFarmersCount || 0)}
                  color="emerald"
                />
                <StatCard
                  icon={<Package className="w-5 h-5" />}
                  label="Total Aggregated Volume"
                  value={`${Number(fpoAnalytics.totalAggregatedKg || 0).toLocaleString('en-IN')} kg`}
                  color="blue"
                />
                <StatCard
                  icon={<Wallet className="w-5 h-5" />}
                  label="Collective Revenue"
                  value={fmtINR(fpoAnalytics.collectiveRevenue || 0)}
                  color="primary"
                />
                <StatCard
                  icon={<Truck className="w-5 h-5" />}
                  label="Shared Logistics Savings"
                  value={fmtINR(fpoAnalytics.collectiveLogisticsSavings || 0)}
                  color="purple"
                />
              </div>

              <div className="bg-white rounded-2xl border border-navy-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                    <Warehouse className="w-5 h-5 text-emerald-600" />
                    <span>Regional Storage & Collective Warehousing</span>
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Utilization: {fpoAnalytics.storageUtilizationPct || 0}%
                  </span>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-500 mb-1">Occupied Cold Storage Stock</p>
                    <p className="text-lg font-bold text-navy-900">{Number(fpoAnalytics.occupiedStorageKg || 0).toLocaleString('en-IN')} kg</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-500 mb-1">Active Stored Lots</p>
                    <p className="text-lg font-bold text-navy-900">{fpoAnalytics.activeLotsCount || 0} batches</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-emerald-700 font-semibold mb-1">Estimated Consolidation Savings</p>
                    <p className="text-lg font-bold text-emerald-800">~₹2.50 / kg freight</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════
               INDIVIDUAL FARMER VIEW
               ══════════════════════════════════════════════════════════ */
            <>
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={focusedMetric === 'REVENUE_AND_PROFIT' ? 'ring-2 ring-emerald-500 rounded-2xl animate-pulse' : ''}>
                  <StatCard
                    icon={<Wallet className="w-5 h-5" />}
                    label="Completed Sales Revenue"
                    value={fmtINR(analytics?.totalRevenue || 0)}
                    color="emerald"
                  />
                </div>

                <div className={focusedMetric === 'STORAGE_EXPENSES' ? 'ring-2 ring-blue-500 rounded-2xl animate-pulse' : ''}>
                  <StatCard
                    icon={<Warehouse className="w-5 h-5" />}
                    label="Storage Expenses"
                    value={fmtINR(analytics?.totalStorageExpenses || 0)}
                    color="blue"
                  />
                </div>

                <div className={focusedMetric === 'REVENUE_AND_PROFIT' ? 'ring-2 ring-emerald-500 rounded-2xl animate-pulse' : ''}>
                  <StatCard
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="Net Realization"
                    value={`₹${analytics?.netRealizationPerKg || 0} / kg`}
                    color="purple"
                  />
                </div>

                <div className={focusedMetric === 'UNSOLD_INVENTORY' ? 'ring-2 ring-amber-500 rounded-2xl animate-pulse' : ''}>
                  <StatCard
                    icon={<Package className="w-5 h-5" />}
                    label="Unsold Inventory"
                    value={`${Number(analytics?.availableKg || 0).toLocaleString('en-IN')} kg`}
                    color="primary"
                  />
                </div>
              </div>

              {/* Recorded Cost & Transparency Notice */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Transparent Financial Realization:</strong> Net realization reflects completed revenue minus recorded storage (₹{analytics?.totalStorageExpenses || 0}), freight (₹{analytics?.totalLogisticsExpenses || 0}), and commission (₹{analytics?.totalPlatformFees || 0}). Farmgate production cost is recorded as unrecorded.
                  </span>
                </div>
                <span className="font-semibold px-2 py-0.5 bg-amber-100 rounded-full shrink-0">
                  Recorded-Cost Margin
                </span>
              </div>

              {/* Main Progress Chart & Pipeline Funnel */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Metric Selectors */}
                    <div className="flex flex-wrap items-center bg-white border border-gray-200 rounded-xl p-1 text-xs font-semibold shadow-xs">
                      <button
                        onClick={() => setMetric('REVENUE')}
                        className={`px-3 py-1.5 rounded-lg transition ${metric === 'REVENUE' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-navy-900'}`}
                      >
                        💰 Sales Revenue (₹)
                      </button>
                      <button
                        onClick={() => setMetric('PROFITABILITY')}
                        className={`px-3 py-1.5 rounded-lg transition ${metric === 'PROFITABILITY' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-600 hover:text-navy-900'}`}
                      >
                        📊 Crop Realization (₹/kg)
                      </button>
                      <button
                        onClick={() => setMetric('VOLUME')}
                        className={`px-3 py-1.5 rounded-lg transition ${metric === 'VOLUME' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-navy-900'}`}
                      >
                        ⚖️ Sold Volume (kg)
                      </button>
                      <button
                        onClick={() => setMetric('MARKET')}
                        className={`px-3 py-1.5 rounded-lg transition ${metric === 'MARKET' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-600 hover:text-navy-900'}`}
                      >
                        📈 Mandi Rates (₹)
                      </button>
                    </div>

                    {/* Chart Shape: Area / Bar / Line */}
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
                    height={290}
                    chartType={chartType}
                  />
                </div>

                <div className="space-y-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lifecycle Progression</span>
                  <ProgressFunnel
                    title="Deal & Order Fulfillment Pipeline"
                    subtitle="Progression across all active and completed negotiations"
                    stages={pipelineStages.length > 0 ? pipelineStages : [
                      { stage: 'Pending / Negotiating', count: 0, color: '#f59e0b' },
                      { stage: 'Confirmed / Locked', count: 0, color: '#3b82f6' },
                      { stage: 'In Transit', count: 0, color: '#8b5cf6' },
                      { stage: 'Delivered / Completed', count: 0, color: '#10b981' },
                    ]}
                  />
                </div>
              </div>

              {/* Actionable Trends & Stored vs Direct Sale Performance */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Stored vs Direct Sale Performance */}
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-navy-900 flex items-center gap-1.5">
                        <Warehouse className="w-4 h-4 text-emerald-600" />
                        <span>Cold Storage vs Direct Sale Profitability</span>
                      </h3>
                      <p className="text-xs text-navy-500 mt-0.5">Realized performance difference across your recorded batches</p>
                    </div>
                    {storedVsDirect?.storageAdvantagePerKg > 0 && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        +₹{storedVsDirect.storageAdvantagePerKg}/kg Storage Gain
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <span className="text-[11px] font-semibold text-emerald-700 block mb-1">Cold Storage Produce</span>
                      <p className="text-lg font-bold text-emerald-900">₹{storedVsDirect.storedNetRealizationPerKg || 0} <span className="text-xs font-normal text-emerald-600">/ kg net</span></p>
                      <p className="text-[11px] text-emerald-700/80 mt-1">Sold: {storedVsDirect.storedSoldKg || 0} kg</p>
                    </div>

                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[11px] font-semibold text-gray-600 block mb-1">Immediate Direct Sale</span>
                      <p className="text-lg font-bold text-gray-900">₹{storedVsDirect.directNetRealizationPerKg || 0} <span className="text-xs font-normal text-gray-500">/ kg net</span></p>
                      <p className="text-[11px] text-gray-500 mt-1">Sold: {storedVsDirect.directSoldKg || 0} kg</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 p-3 bg-gray-50/80 rounded-xl flex items-center justify-between">
                    <span>Payments Received: <strong className="text-gray-800">{fmtINR(payments.received)}</strong></span>
                    <span>Secured Escrow: <strong className="text-emerald-700">{fmtINR(payments.inEscrow)}</strong></span>
                  </div>
                </div>

                {/* Actionable Trends */}
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-navy-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Actionable Activity & Market Trends</span>
                    </h3>
                    <span className="text-[11px] text-navy-500 font-medium">Verified History</span>
                  </div>

                  {actionableTrends.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      Activity trends update dynamically as orders and storage entries are recorded.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {actionableTrends.map((t, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 hover:bg-gray-100/80 rounded-xl transition border border-gray-100">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-navy-900">{t.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.type === 'POSITIVE' ? 'bg-emerald-100 text-emerald-800' :
                              t.type === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {t.change}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 leading-snug">{t.actionableAdvice}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Produce Inventory & Category Breakdown */}
              <div className="grid lg:grid-cols-2 gap-6">
                <CategoryDistribution
                  title="Produce Supply by Category"
                  data={produceByCategory}
                  unit="kg"
                />

                {/* Crop-wise Profitability Breakdown */}
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-navy-900 mb-4">Crop-wise Profitability & Net Realization</h3>
                  {cropProfitability.length === 0 ? (
                    <div className="py-10 text-center">
                      <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No crop transaction records available yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto pr-1">
                      {cropProfitability.map((cp, idx) => (
                        <div key={idx} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-navy-900">{cp.cropName}</span>
                            <span className="font-mono font-bold text-emerald-700">₹{cp.netRealizationPerKg}/kg net</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>Revenue: {fmtINR(cp.revenue)} ({cp.volumeKg.toLocaleString('en-IN')} kg)</span>
                            <span>Avg Price: ₹{cp.avgSellingPricePerKg}/kg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
