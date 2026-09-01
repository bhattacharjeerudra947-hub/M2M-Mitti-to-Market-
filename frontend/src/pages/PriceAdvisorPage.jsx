import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import PriceChart from '../components/PriceChart';
import { tomatoPriceHistory } from '../data/mockData';
import { Brain, TrendingUp, TrendingDown, Search, Lightbulb, BarChart3, Zap, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const crops = [
  { name: 'Tomato', emoji: '🍅', price: 27, aiRange: [28, 30], demand: 'HIGH', supply: 'MEDIUM', trend: 'Increasing' },
  { name: 'Onion', emoji: '🧅', price: 24, aiRange: [23, 25], demand: 'MEDIUM', supply: 'HIGH', trend: 'Stable' },
  { name: 'Potato', emoji: '🥔', price: 22, aiRange: [22, 24], demand: 'MEDIUM', supply: 'MEDIUM', trend: 'Increasing' },
  { name: 'Grapes', emoji: '🍇', price: 65, aiRange: [62, 68], demand: 'LOW', supply: 'LOW', trend: 'Decreasing' },
  { name: 'Rice', emoji: '🌾', price: 35, aiRange: [34, 37], demand: 'HIGH', supply: 'HIGH', trend: 'Stable' },
];

export default function PriceAdvisorPage() {
  const [selected, setSelected] = useState(crops[0]);

  const reasons = [
    { icon: TrendingUp, text: 'High regional demand from Mumbai wholesale markets', color: 'text-emerald-500' },
    { icon: BarChart3, text: 'Moderate supply due to off-season production dip', color: 'text-blue-500' },
    { icon: Zap, text: 'Recent upward price trend over the last 3 weeks', color: 'text-amber-500' },
    { icon: ShieldCheck, text: 'Transportation cost to Mumbai factored in at ₹2.5/kg', color: 'text-purple-500' },
  ];

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy-900">AI Price Advisor</h1>
              <p className="text-navy-500 text-sm">Data-driven pricing recommendations for your produce</p>
            </div>
          </div>

          {/* Crop Selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {crops.map((crop) => (
              <button
                key={crop.name}
                onClick={() => setSelected(crop)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                  selected.name === crop.name
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'bg-white text-navy-600 border border-navy-200 hover:border-mustard-300'
                }`}
              >
                <span className="text-lg">{crop.emoji}</span>
                {crop.name}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Price Details */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-4xl">{selected.emoji}</span>
                  <div>
                    <h2 className="text-xl font-bold text-navy-900">{selected.name}</h2>
                    <p className="text-sm text-navy-500">Market Analysis</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Current Market Price</p>
                    <p className="text-2xl font-bold text-gray-900">₹{selected.price}/kg</p>
                  </div>

                  <div className="p-4 bg-mustard-50 rounded-xl border border-mustard-200">
                    <p className="text-xs text-navy-600 mb-1 font-medium">AI Recommended Range</p>
                    <p className="text-2xl font-bold text-navy-900">₹{selected.aiRange[0]}–{selected.aiRange[1]}/kg</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Demand</p>
                      <p className={`text-sm font-bold ${
                        selected.demand === 'HIGH' ? 'text-emerald-600' :
                        selected.demand === 'MEDIUM' ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {selected.demand} {selected.demand === 'HIGH' ? '↑' : selected.demand === 'LOW' ? '↓' : '→'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Supply</p>
                      <p className={`text-sm font-bold ${
                        selected.supply === 'HIGH' ? 'text-rose-600' :
                        selected.supply === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {selected.supply}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Expected Trend</p>
                    <p className={`text-sm font-bold flex items-center gap-1 ${
                      selected.trend === 'Increasing' ? 'text-emerald-600' :
                      selected.trend === 'Decreasing' ? 'text-rose-600' : 'text-gray-700'
                    }`}>
                      {selected.trend === 'Increasing' ? <ArrowUpRight className="w-4 h-4" /> :
                       selected.trend === 'Decreasing' ? <ArrowDownRight className="w-4 h-4" /> : '→'}
                      {selected.trend}
                    </p>
                  </div>
                </div>
              </div>

              {/* Why Recommendation */}
              <div className="bg-gradient-to-br from-mustard-50 to-white rounded-2xl border border-mustard-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-navy-700" />
                  <h3 className="text-sm font-bold text-navy-800">Why this recommendation?</h3>
                </div>
                <div className="space-y-3">
                  {reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <r.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${r.color}`} />
                      <p className="text-xs text-gray-700 leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full py-3 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm">
                Find Best Buyer
              </button>
            </div>

            {/* Right: Chart */}
            <div className="lg:col-span-2">
              <PriceChart
                data={tomatoPriceHistory}
                dataKeys={[
                  { name: 'week', xKey: 'week' },
                  { name: 'actual', label: 'Historical Price' },
                  { name: 'predicted', label: 'Predicted Price', dashed: true },
                ]}
                title={`${selected.emoji} ${selected.name} — Historical vs Predicted Price (₹/kg)`}
                colors={['#0f2a4a', '#d4a017']}
                height={400}
              />

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                  <h4 className="text-sm font-semibold text-navy-700 mb-3">Regional Price Comparison</h4>
                  <div className="space-y-2">
                    {[
                      { city: 'Nashik', price: 27 },
                      { city: 'Pune', price: 28 },
                      { city: 'Mumbai', price: 31 },
                      { city: 'Nagpur', price: 25 },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">{r.city}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(r.price / 35) * 100}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">₹{r.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                  <h4 className="text-sm font-semibold text-navy-700 mb-3">AI Insight</h4>
                  <div className="p-4 bg-mustard-50 rounded-xl border border-mustard-200">
                    <p className="text-sm text-navy-800 leading-relaxed">
                      "Demand for {selected.name.toLowerCase()} is currently <strong>{selected.demand.toLowerCase()}</strong> in your selected region with an <strong>{selected.trend.toLowerCase()}</strong> trend. Consider listing at <strong>₹{selected.aiRange[0]}–{selected.aiRange[1]}/kg</strong> for maximum returns."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
