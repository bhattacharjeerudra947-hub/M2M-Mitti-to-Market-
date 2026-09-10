import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import GuestSignInGate from '../components/GuestSignInGate';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Brain, Globe, Loader2, Inbox, Database } from 'lucide-react';
import { apiGet } from '../api';

/**
 * Market Insights — powered entirely by /api/price-advisor/all (real
 * MarketDataService analysis). No hardcoded crop prices: when the API
 * fails or returns nothing, the page shows an explicit empty state.
 */
export default function MarketInsights() {
  const { isGuestModeActive } = useAuth();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(null);

  useEffect(() => {
    if (isGuestModeActive) return;
    apiGet('/api/price-advisor/all')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCrops(list);
        if (list.length > 0) setSelectedCrop(list[0]);
      })
      .catch((e) => setError(e?.message || 'Failed to load market data'))
      .finally(() => setLoading(false));
  }, []);

  const trendIcon = (trend) => trend === 'Increasing'
    ? <TrendingUp className="w-3 h-3" />
    : trend === 'Decreasing' ? <TrendingDown className="w-3 h-3" /> : null;

  if (isGuestModeActive) {
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
                <p className="text-navy-500 text-sm">Live market analysis from Mitti2Market's price intelligence</p>
              </div>
            </div>
            <GuestSignInGate
              title="Market Insights"
              description="Sign in to view market analysis, regional prices and AI intelligence for your business."
              className="min-h-[300px]"
            />
          </div>
        </main>
      </div>
    );
  }

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
              <p className="text-navy-500 text-sm">Live market analysis from Mitti2Market's price intelligence</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading market data...</p>
            </div>
          ) : error && crops.length === 0 ? (
            <div className="bg-white rounded-2xl border border-red-100 p-12 text-center">
              <Inbox className="w-10 h-10 text-red-300 mx-auto mb-3" />
              <p className="font-semibold text-navy-900">Market data unavailable</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
            </div>
          ) : crops.length === 0 ? (
            <div className="bg-white rounded-2xl border border-navy-100 p-12 text-center">
              <Inbox className="w-10 h-10 text-navy-300 mx-auto mb-3" />
              <p className="font-semibold text-navy-900">No market data yet</p>
              <p className="text-sm text-gray-500 mt-1">Insights appear once the price intelligence service has data. We don't show sample numbers.</p>
            </div>
          ) : (
            <>
              {/* Current Prices Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                {crops.map((crop) => (
                  <button
                    key={crop.name}
                    onClick={() => setSelectedCrop(crop)}
                    className={`p-4 rounded-2xl border text-left transition ${
                      selectedCrop?.name === crop.name
                        ? 'bg-mustard-50 border-mustard-300 shadow-sm'
                        : 'bg-white border-navy-100 hover:border-mustard-200'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{crop.name}</p>
                    <p className="text-lg font-bold text-navy-900 mt-1">₹{crop.aiOptimalPrice}/kg</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-xs font-semibold inline-flex items-center gap-0.5 ${
                        crop.trend === 'Increasing' ? 'text-emerald-600' : crop.trend === 'Decreasing' ? 'text-rose-600' : 'text-gray-500'
                      }`}>
                        {crop.trend === 'Increasing' ? <ArrowUpRight className="w-3 h-3" />
                          : crop.trend === 'Decreasing' ? <ArrowDownRight className="w-3 h-3" /> : null}
                        {crop.trend || 'Stable'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Selected Crop Detail */}
                {selectedCrop && (
                  <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6">
                    <div className="mb-5">
                      <h2 className="text-xl font-bold text-gray-900">{selectedCrop.name}</h2>
                      <p className="text-sm text-gray-500">{selectedCrop.category} • Market Analysis</p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500">AI Optimal Price</p>
                        <p className="text-lg font-bold text-gray-900">₹{selectedCrop.aiOptimalPrice}/kg</p>
                      </div>
                      <div className="p-3 bg-mustard-50 rounded-xl border border-mustard-200">
                        <p className="text-xs text-navy-600 font-medium">AI Suggested Range</p>
                        <p className="text-lg font-bold text-navy-900">₹{selectedCrop.aiSuggestedMinPrice}–₹{selectedCrop.aiSuggestedMaxPrice}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500">Market Range</p>
                          <p className="text-sm font-bold text-navy-900">₹{selectedCrop.marketMinPrice}–₹{selectedCrop.marketMaxPrice}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500">Trend</p>
                          <p className={`text-sm font-bold inline-flex items-center gap-1 ${
                            selectedCrop.trend === 'Increasing' ? 'text-emerald-600' : selectedCrop.trend === 'Decreasing' ? 'text-rose-600' : 'text-gray-600'
                          }`}>
                            {trendIcon(selectedCrop.trend)} {selectedCrop.trend || 'Stable'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-gradient-to-br from-mustard-50 to-white rounded-xl border border-mustard-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-navy-700" />
                        <span className="text-xs font-bold text-navy-800">AI Insight</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        Demand is <strong>{selectedCrop.demandLevel?.toLowerCase() || 'moderate'}</strong> and supply is
                        <strong> {selectedCrop.supplyLevel?.toLowerCase() || 'medium'}</strong> with a {(selectedCrop.trend || 'stable').toLowerCase()} price trend.
                        {selectedCrop.supplyLevel === 'LOW' ? ' Limited supply suggests potential for premium pricing.' :
                          selectedCrop.supplyLevel === 'HIGH' ? ' High supply may pressure prices down slightly.' : ''}
                        {' '}Estimates are AI-generated from market data — not guaranteed prices.
                      </p>
                    </div>
                  </div>
                )}

                {/* Regional Prices for the selected crop */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6 h-full">
                    <div className="flex items-center gap-2 mb-5">
                      <Globe className="w-5 h-5 text-navy-700" />
                      <h3 className="text-base font-bold text-navy-900">
                        Regional Prices — {selectedCrop?.name || ''}
                      </h3>
                      <span className="ml-auto text-[10px] text-gray-400 inline-flex items-center gap-1">
                        <Database className="w-3 h-3" /> live market intelligence
                      </span>
                    </div>
                    {selectedCrop?.regionalPrices && Object.keys(selectedCrop.regionalPrices).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(selectedCrop.regionalPrices).map(([city, price]) => {
                          const maxP = Math.max(...Object.values(selectedCrop.regionalPrices));
                          return (
                            <div key={city} className="flex items-center gap-4">
                              <div className="w-28 flex-shrink-0">
                                <p className="text-sm font-semibold text-navy-800">{city}</p>
                              </div>
                              <div className="flex-1">
                                <div className="w-full h-3 bg-navy-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-mustard-400 to-navy-700 rounded-full transition-all"
                                    style={{ width: `${Math.round((price / maxP) * 100)}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-sm font-bold text-navy-800 w-16 text-right">₹{price}/kg</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No regional price data for this crop yet.</p>
                      </div>
                    )}

                    {/* Top markets */}
                    {selectedCrop?.topMarkets?.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-gray-100">
                        <p className="text-xs font-semibold text-navy-700 mb-2">Top markets</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedCrop.topMarkets.map((m) => (
                            <span key={m} className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs text-navy-700">{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
