import { useState, useEffect } from 'react';
import { apiGet } from '../../api';
import PriceChart from '../../components/PriceChart';
import { ProgressFunnel, CategoryDistribution, GroupProgressComparison, GroupComparisonBarChart } from '../../components/AnalyticsCharts';
import { MetricStrip, TableSkeleton } from '../../components/admin/ui/adminUi';
import { TrendingUp, Users, Package, ShoppingCart, ShieldCheck, BarChart3, RefreshCw } from 'lucide-react';

const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'FARMERS' | 'BUSINESSES'
  const [chartType, setChartType] = useState('area');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/api/analytics/admin');
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-gray-100 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl h-72 animate-pulse" />
      </div>
    );
  }

  const farmerGroup = data?.farmerGroup || {};
  const businessGroup = data?.businessGroup || {};
  const gmvTrend = data?.gmvTrend || [];
  const pipelineConversion = data?.pipelineConversion || [];
  const groupComparison = data?.groupComparison || [];

  const platformMetrics = [
    { label: 'Platform GMV (Processed)', value: fmtINR(data?.platformGMV || 0), context: 'Deals + Orders completed' },
    { label: 'Completed Transactions', value: String(data?.completedTransactions || 0), context: 'Settled to date' },
    { label: 'Total Farmers', value: String(farmerGroup.totalFarmers || 0), context: `${farmerGroup.verifiedFarmers || 0} verified` },
    { label: 'Total Businesses', value: String(businessGroup.totalBusinesses || 0), context: `${businessGroup.verifiedBusinesses || 0} verified` },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Platform Analytics & Group Progress</h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Live multi-group progression metrics for Farmers, Business Buyers, and Marketplace deals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Group Tab Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'ALL' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              All Groups
            </button>
            <button
              onClick={() => setActiveTab('FARMERS')}
              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'FARMERS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              🌾 Farmers Group
            </button>
            <button
              onClick={() => setActiveTab('BUSINESSES')}
              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'BUSINESSES' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              🏢 Businessman Group
            </button>
          </div>

          <button
            onClick={fetchAnalytics}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <MetricStrip metrics={platformMetrics} />

      {/* Group Comparison Overview Cards */}
      <GroupProgressComparison farmerGroup={farmerGroup} businessGroup={businessGroup} />

      {/* Side-by-Side Group Progress Comparison Bar Chart */}
      {activeTab === 'ALL' && (
        <GroupComparisonBarChart
          data={groupComparison}
          title="Farmers vs Businessman Group Progress"
          subtitle="Comparative analysis across active network size, KYC verification rate, and agricultural volume"
        />
      )}

      {/* Main GMV & Platform Trend */}
      {(activeTab === 'ALL' || activeTab === 'BUSINESSES') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Gross Merchandise Value (GMV) Trajectory</h3>
              <p className="text-xs text-gray-500">Monthly transaction progression across all marketplace deals & orders</p>
            </div>
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 text-xs">
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
            data={gmvTrend}
            dataKeys={[
              { name: 'month', xKey: 'month' },
              { name: 'amount', label: 'Platform GMV (₹)' },
            ]}
            title="Monthly Platform GMV (₹)"
            subtitle="Combined order and deal value completed each month"
            unit="₹"
            colors={['#10b981']}
            height={280}
            chartType={chartType}
          />
        </div>
      )}

      {/* Conversion Funnel & Produce Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgressFunnel
          title="Marketplace Deal Pipeline Conversion"
          subtitle="Conversion stages from buyer negotiation to verified fulfillment"
          stages={pipelineConversion}
        />

        <CategoryDistribution
          title="Produce Supply Catalog by Category"
          data={farmerGroup.supplyByCategory || {}}
          unit="kg"
        />
      </div>

      {/* Detailed Group Breakdowns */}
      {(activeTab === 'ALL' || activeTab === 'FARMERS') && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌾</span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Farmer Group Regional & Supply Progress</h3>
                <p className="text-xs text-gray-500">Producer coverage and produce volume status</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              {farmerGroup.availableProduceKg ? `${Math.round(farmerGroup.availableProduceKg / 1000)}t active stock` : '0 kg'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Total Produce Listed</p>
              <p className="text-lg font-bold text-gray-900">{((farmerGroup.totalProduceListedKg || 0) / 1000).toFixed(1)} metric tons</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Available for Sale</p>
              <p className="text-lg font-bold text-emerald-700">{((farmerGroup.availableProduceKg || 0) / 1000).toFixed(1)} metric tons</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Produce Sold</p>
              <p className="text-lg font-bold text-blue-700">{((farmerGroup.soldProduceKg || 0) / 1000).toFixed(1)} metric tons</p>
            </div>
          </div>

          {/* Regional distribution */}
          {farmerGroup.farmersByState && Object.keys(farmerGroup.farmersByState).length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Farmer State Distribution</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(farmerGroup.farmersByState).map(([state, count]) => (
                  <span key={state} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-800">
                    <span>📍 {state}:</span>
                    <span className="font-bold text-navy-900">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(activeTab === 'ALL' || activeTab === 'BUSINESSES') && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏢</span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Businessman Group Procurement Progress</h3>
                <p className="text-xs text-gray-500">Corporate sourcing, demand posting, and contract fulfillment</p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              {businessGroup.requirementsCount || 0} Open Requirements
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Demands Volume</p>
              <p className="text-lg font-bold text-gray-900">{((businessGroup.totalKgRequested || 0) / 1000).toFixed(1)} metric tons</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Contract Fulfilled</p>
              <p className="text-lg font-bold text-emerald-700">{((businessGroup.fulfilledKg || 0) / 1000).toFixed(1)} metric tons</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Fulfillment Rate</p>
              <p className="text-lg font-bold text-blue-700">{businessGroup.fulfillmentRatePct || 0}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
