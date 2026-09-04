import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Brain, TrendingUp, TrendingDown, Minus, Info, Loader2, RefreshCw } from 'lucide-react';
import { apiGet } from '../api';

export default function PriceAdvisorPage() {
  const [crops, setCrops] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [location, setLocation] = useState('');

  // Load all crop prices
  useEffect(() => {
    apiGet('/api/price-advisor/all')
      .then(data => {
        setCrops(data || []);
        if (data?.length > 0) setSelected(data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load detailed analysis when crop is selected
  useEffect(() => {
    if (!selected) return;
    setAnalyzing(true);
    const params = location ? `?location=${encodeURIComponent(location)}` : '';
    apiGet(`/api/price-advisor/${encodeURIComponent(selected.name)}${params}`)
      .then(data => setAnalysis(data))
      .catch(() => {})
      .finally(() => setAnalyzing(false));
  }, [selected, location]);

  const trendIcon = (trend) => {
    if (trend === 'Increasing') return <TrendingUp className="w-4 h-4" />;
    if (trend === 'Decreasing') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const trendColor = (trend) => {
    if (trend === 'Increasing') return 'text-emerald-600';
    if (trend === 'Decreasing') return 'text-rose-600';
    return 'text-gray-700';
  };

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
              <p className="text-navy-500 text-sm">Real-time market demand analysis and pricing recommendations</p>
            </div>
          </div>

          {/* Location filter */}
          <div className="mb-6 flex gap-3">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter your location for regional pricing (e.g., Nashik, Pune)"
              className="flex-1 px-4 py-2.5 bg-white border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
            />
            <button onClick={() => setSelected({...selected})} className="px-4 py-2.5 bg-white text-navy-700 text-sm font-semibold rounded-xl border border-navy-200 hover:bg-navy-50 transition flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading market data...</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: Crop List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-4">
                  <h3 className="text-sm font-bold text-navy-700 mb-3">Crops ({crops.length})</h3>
                  <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                    {crops.map((crop) => (
                      <button
                        key={crop.name}
                        onClick={() => setSelected(crop)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${
                          selected?.name === crop.name
                            ? 'bg-navy-900 text-white'
                            : 'hover:bg-gray-50 text-navy-700'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold">{crop.name}</p>
                          <p className={`text-[10px] ${selected?.name === crop.name ? 'text-gray-300' : 'text-gray-500'}`}>{crop.category}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${selected?.name === crop.name ? 'text-white' : 'text-navy-900'}`}>₹{crop.aiOptimalPrice}</p>
                          <p className={`text-[10px] flex items-center gap-0.5 justify-end ${selected?.name === crop.name ? 'text-gray-300' : trendColor(crop.trend)}`}>
                            {trendIcon(crop.trend)} {crop.trend}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Analysis */}
              <div className="lg:col-span-2 space-y-4">
                {analyzing ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-navy-100">
                    <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Analyzing market data for {selected?.name}...</p>
                  </div>
                ) : analysis ? (
                  <>
                    {/* Main Analysis Card */}
                    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h2 className="text-xl font-bold text-navy-900">{analysis.cropName}</h2>
                          <p className="text-sm text-navy-500">{analysis.category} • Market Analysis</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${
                          analysis.trend === 'Increasing' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          analysis.trend === 'Decreasing' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {trendIcon(analysis.trend)} {analysis.trend}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-[10px] text-gray-500 mb-1">Market Range</p>
                          <p className="text-lg font-bold text-gray-900">₹{analysis.marketMinPrice}–{analysis.marketMaxPrice}</p>
                        </div>
                        <div className="p-3 bg-navy-900 rounded-xl">
                          <p className="text-[10px] text-gray-300 mb-1">AI Optimal</p>
                          <p className="text-lg font-bold text-white">₹{analysis.aiOptimalPrice}</p>
                        </div>
                        <div className="p-3 bg-mustard-50 rounded-xl border border-mustard-200">
                          <p className="text-[10px] text-navy-600 mb-1">AI Range</p>
                          <p className="text-lg font-bold text-navy-900">₹{analysis.aiSuggestedMinPrice}–{analysis.aiSuggestedMaxPrice}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl text-center">
                          <p className="text-[10px] text-gray-500 mb-1">Demand</p>
                          <p className={`text-sm font-bold ${analysis.demandLevel === 'HIGH' ? 'text-emerald-600' : analysis.demandLevel === 'LOW' ? 'text-rose-600' : 'text-amber-600'}`}>
                            {analysis.demandLevel} {analysis.demandLevel === 'HIGH' ? '↑' : analysis.demandLevel === 'LOW' ? '↓' : '→'}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl text-center">
                          <p className="text-[10px] text-gray-500 mb-1">Supply</p>
                          <p className={`text-sm font-bold ${analysis.supplyLevel === 'LOW' ? 'text-emerald-600' : analysis.supplyLevel === 'HIGH' ? 'text-rose-600' : 'text-amber-600'}`}>
                            {analysis.supplyLevel}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl text-center">
                          <p className="text-[10px] text-gray-500 mb-1">Regional</p>
                          <p className="text-sm font-bold text-navy-700">₹{analysis.regionalPrice}</p>
                          <p className="text-[9px] text-gray-400">{analysis.matchedRegion}</p>
                        </div>
                      </div>
                    </div>

                    {/* AI Reasons */}
                    <div className="bg-gradient-to-br from-mustard-50 to-white rounded-2xl border border-mustard-200 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Info className="w-5 h-5 text-navy-700" />
                        <h3 className="text-sm font-bold text-navy-800">Market Intelligence</h3>
                      </div>
                      <div className="space-y-3">
                        {analysis.reasons?.map((r, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              r.impact === 'positive' ? 'bg-emerald-500' :
                              r.impact === 'negative' ? 'bg-rose-500' : 'bg-gray-400'
                            }`} />
                            <p className="text-sm text-gray-700 leading-relaxed">{r.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Regional Prices */}
                    {analysis.regionalPrices && Object.keys(analysis.regionalPrices).length > 0 && (
                      <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                        <h4 className="text-sm font-semibold text-navy-700 mb-3">Regional Price Comparison</h4>
                        <div className="space-y-2">
                          {Object.entries(analysis.regionalPrices).map(([city, price]) => (
                            <div key={city} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">{city}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(price / analysis.marketMaxPrice) * 100}%` }} />
                                </div>
                                <span className="text-sm font-semibold text-gray-700 w-12 text-right">₹{price}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Insight */}
                    <div className="bg-navy-900 rounded-2xl p-5 text-white">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-mustard-300" />
                        <h4 className="text-sm font-semibold">AI Recommendation</h4>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Demand for <strong className="text-white">{analysis.cropName.toLowerCase()}</strong> is currently <strong className="text-white">{analysis.demandLevel.toLowerCase()}</strong> with an <strong className="text-white">{analysis.trend.toLowerCase()}</strong> trend.
                        {analysis.matchedRegion !== 'National Average' && (
                          <> In <strong className="text-white">{analysis.matchedRegion}</strong>, the regional price is <strong className="text-white">₹{analysis.regionalPrice}/kg</strong>.</>
                        )}
                        {' '}List at <strong className="text-mustard-300">₹{analysis.aiSuggestedMinPrice}–₹{analysis.aiSuggestedMaxPrice}/kg</strong> for maximum returns.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 bg-white rounded-2xl border border-navy-100">
                    <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Select a crop to see market analysis</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
