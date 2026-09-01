import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import PriceChart from '../components/PriceChart';
import { priceChartData } from '../data/mockData';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Brain, BarChart3, Globe, Zap } from 'lucide-react';

const cropInsights = [
  { name: 'Tomato', emoji: '🍅', price: 28, demand: 'HIGH', supply: 'MEDIUM', expected: '₹29–31/kg', change: 4.2, trend: 'up' },
  { name: 'Onion', emoji: '🧅', price: 24, demand: 'MEDIUM', supply: 'HIGH', expected: '₹23–25/kg', change: -1.8, trend: 'down' },
  { name: 'Potato', emoji: '🥔', price: 22, demand: 'MEDIUM', supply: 'MEDIUM', expected: '₹22–24/kg', change: 2.1, trend: 'up' },
  { name: 'Grapes', emoji: '🍇', price: 65, demand: 'LOW', supply: 'LOW', expected: '₹62–68/kg', change: -0.5, trend: 'down' },
  { name: 'Rice', emoji: '🌾', price: 35, demand: 'HIGH', supply: 'HIGH', expected: '₹34–37/kg', change: 1.2, trend: 'up' },
  { name: 'Chili', emoji: '🌶️', price: 120, demand: 'HIGH', supply: 'LOW', expected: '₹125–135/kg', change: 8.5, trend: 'up' },
];

const regionalDemand = [
  { region: 'Maharashtra', demand: 85, topCrops: 'Tomato, Onion, Grapes' },
  { region: 'Punjab', demand: 78, topCrops: 'Wheat, Rice' },
  { region: 'Tamil Nadu', demand: 72, topCrops: 'Rice, Chili, Mango' },
  { region: 'Uttar Pradesh', demand: 68, topCrops: 'Potato, Wheat' },
  { region: 'Karnataka', demand: 65, topCrops: 'Rice, Coffee' },
];

export default function MarketInsights() {
  const [selectedCrop, setSelectedCrop] = useState(cropInsights[0]);

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy-900">Market Insights</h1>
              <p className="text-navy-500 text-sm">AI-powered market analysis and price trends</p>
            </div>
          </div>

          {/* Current Prices Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {cropInsights.map((crop) => (
              <button
                key={crop.name}
                onClick={() => setSelectedCrop(crop)}
                className={`p-4 rounded-2xl border text-left transition ${
                  selectedCrop.name === crop.name
                    ? 'bg-mustard-50 border-mustard-300 shadow-sm'
                    : 'bg-white border-navy-100 hover:border-mustard-200'
                }`}
              >
                <span className="text-2xl">{crop.emoji}</span>
                <p className="text-sm font-semibold text-gray-900 mt-2">{crop.name}</p>
                <p className="text-lg font-bold text-navy-900 mt-1">₹{crop.price}/kg</p>
                <div className="flex items-center gap-1 mt-1">
                  {crop.trend === 'up' ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-rose-500" />
                  )}
                  <span className={`text-xs font-semibold ${crop.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {crop.change >= 0 ? '+' : ''}{crop.change}%
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Selected Crop Detail */}              <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-4xl">{selectedCrop.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedCrop.name}</h2>
                  <p className="text-sm text-gray-500">Detailed Analysis</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Current Price</p>
                  <p className="text-lg font-bold text-gray-900">₹{selectedCrop.price}/kg</p>
                </div>
                <div className="p-3 bg-mustard-50 rounded-xl border border-mustard-200">
                  <p className="text-xs text-navy-600 font-medium">Expected Price</p>
                  <p className="text-lg font-bold text-navy-900">{selectedCrop.expected}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500">Demand</p>
                    <p className={`text-sm font-bold ${
                      selectedCrop.demand === 'HIGH' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {selectedCrop.demand} ↑
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500">Supply</p>
                    <p className={`text-sm font-bold ${
                      selectedCrop.supply === 'HIGH' ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      {selectedCrop.supply}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Insight */}
              <div className="mt-4 p-4 bg-gradient-to-br from-mustard-50 to-white rounded-xl border border-mustard-200">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-navy-700" />
                  <span className="text-xs font-bold text-navy-800">AI Insight</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Demand is currently {selectedCrop.demand.toLowerCase()} in your selected region with an {selectedCrop.trend} price trend. {selectedCrop.supply === 'LOW' ? 'Limited supply suggests potential for premium pricing.' : selectedCrop.supply === 'HIGH' ? 'High supply may pressure prices down slightly.' : 'Balanced supply-demand dynamics expected.'}
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="lg:col-span-2">
              <PriceChart
                data={priceChartData}
                dataKeys={[
                  { name: 'month', xKey: 'month' },
                  { name: 'tomato', label: 'Tomato' },
                  { name: 'onion', label: 'Onion' },
                  { name: 'potato', label: 'Potato' },
                ]}
                title="Historical Price Trends (₹/kg)"
                colors={['#16a34a', '#f97316', '#3b82f6']}
                height={350}
              />
            </div>
          </div>

          {/* Regional Demand */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe className="w-5 h-5 text-navy-700" />
              <h3 className="text-base font-bold text-navy-900">Regional Demand</h3>
            </div>
            <div className="space-y-4">
              {regionalDemand.map((r, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-sm font-semibold text-navy-800">{r.region}</p>
                    <p className="text-xs text-gray-500">{r.topCrops}</p>
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-3 bg-navy-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-mustard-400 to-navy-700 rounded-full transition-all"
                        style={{ width: `${r.demand}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-navy-800 w-12 text-right">{r.demand}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
