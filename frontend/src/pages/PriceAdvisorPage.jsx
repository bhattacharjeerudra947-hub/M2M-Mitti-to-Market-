import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import GuestSignInGate from '../components/GuestSignInGate';
import { useAuth } from '../context/AuthContext';
import { Brain, TrendingUp, TrendingDown, Minus, Info, Loader2, RefreshCw, Database, ShieldCheck, Truck } from 'lucide-react';
import { apiGet } from '../api';

const SOURCE_LABELS = {
  DATASET_MODEL: { text: 'Based on historical crop-price dataset', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Database },
  LIVE_MANDI: { text: 'Live government mandi prices (data.gov.in)', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: ShieldCheck },
};

/** Dataset/mandi-backed estimate card — always discloses its source. */
function DatasetEstimateCard({ cropName }) {
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cropName) return;
    setLoading(true);
    const params = new URLSearchParams({ crop: cropName });
    apiGet(`/api/price-advisor/estimate?${params}`)
      .then(setEstimate)
      .catch(() => setEstimate(null))
      .finally(() => setLoading(false));
  }, [cropName]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-navy-100 p-5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-navy-900" />
        <span className="text-xs text-navy-500">Checking dataset / live mandi sources...</span>
      </div>
    );
  }
  if (!estimate) return null;

  const meta = SOURCE_LABELS[estimate.source] || {
    text: estimate.source || 'Estimate',
    cls: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: Database,
  };
  const Icon = meta.icon;

  return (
    <div className={`rounded-2xl border p-4 mb-4 flex items-center justify-between gap-3 ${meta.cls}`}>
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 shrink-0" />
        <div>
          <p className="text-xs font-semibold">{meta.text}</p>
          <p className="text-[11px] opacity-80">{estimate.disclaimer}</p>
        </div>
      </div>
      {estimate.estimatedPrice && (
        <div className="text-right shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-wide opacity-75">Estimated</span>
          <p className="text-base font-bold">₹{estimate.estimatedPrice} <span className="text-xs font-normal">/{estimate.unit || 'kg'}</span></p>
        </div>
      )}
    </div>
  );
}

export default function PriceAdvisorPage() {
  const { isGuestModeActive } = useAuth();
  const [crops, setCrops] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [distanceKm, setDistanceKm] = useState(80);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Load all crop prices
  useEffect(() => {
    if (isGuestModeActive) return;
    apiGet('/api/price-advisor/all')
      .then(data => {
        setCrops(data || []);
        if (data?.length > 0) setSelected(data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load detailed analysis when crop is selected or distance changes
  useEffect(() => {
    if (isGuestModeActive || !selected) return;
    setAnalyzing(true);
    apiGet(`/api/price-advisor/${encodeURIComponent(selected.name)}?distanceKm=${distanceKm}`)
      .then(data => setAnalysis(data))
      .catch(() => {})
      .finally(() => setAnalyzing(false));
  }, [selected, distanceKm]);

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

  if (isGuestModeActive) {
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
            <GuestSignInGate
              title="AI Price Advisor"
              description="Sign in to view personalized pricing advice, market trends and AI recommendations for your crops."
              className="min-h-[300px]"
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy-900">AI Price Advisor</h1>
                <p className="text-navy-500 text-sm">Real-time market demand analysis and pricing recommendations</p>
              </div>
            </div>
            <button
              onClick={() => setSelected(selected ? { ...selected } : null)}
              className="px-4 py-2 bg-white text-navy-700 text-sm font-semibold rounded-xl border border-navy-200 hover:bg-navy-50 transition flex items-center gap-2 shadow-sm"
            >
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
                <DatasetEstimateCard cropName={selected?.name} />
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

                    {/* ═══ LOGISTICS & DELIVERED PRICE IMPACT CARD ═══ */}
                    <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 rounded-2xl p-5 text-white shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-white">Logistics & Delivered Price Impact</h3>
                            <p className="text-[11px] text-gray-300">Transportation distance directly increases final delivered produce price</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          +₹{analysis.estimatedLogisticsPerKg || (Math.round((distanceKm * 0.035 + 0.30) * 100) / 100)}/kg Logistics Surcharge
                        </span>
                      </div>

                      {/* Distance Tiers Selector */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-gray-300 font-medium">Select Transit Distance:</span>
                          <span className="text-emerald-400 font-bold">{distanceKm} km haul</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '🛵 Local Haul', dist: 25, sub: '0–50 km (~₹1.50/kg)' },
                            { label: '🚚 Regional Mandi', dist: 80, sub: '50–150 km (~₹3.10/kg)' },
                            { label: '🚛 Inter-State', dist: 250, sub: '150+ km (~₹9.05/kg)' },
                          ].map((t) => (
                            <button
                              key={t.dist}
                              type="button"
                              onClick={() => setDistanceKm(t.dist)}
                              className={`p-2.5 rounded-xl text-left border transition ${
                                distanceKm === t.dist
                                  ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-400/40'
                                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                              }`}
                            >
                              <span className="text-xs font-bold block">{t.label}</span>
                              <span className="text-[10px] text-gray-400 block mt-0.5">{t.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3-Part Price Formula Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                          <span className="text-[10px] text-gray-300 uppercase font-semibold block">1. Farmgate (Ex-Farm)</span>
                          <p className="text-lg font-bold text-white mt-1">₹{analysis.farmgateOptimalPrice || analysis.aiOptimalPrice} <span className="text-xs font-normal text-gray-300">/kg</span></p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Net amount at farm gate</p>
                        </div>

                        <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/30">
                          <span className="text-[10px] text-emerald-300 uppercase font-semibold block">2. + Logistics & Freight</span>
                          <p className="text-lg font-bold text-emerald-400 mt-1">+₹{analysis.estimatedLogisticsPerKg || (Math.round((distanceKm * 0.035 + 0.30) * 100) / 100)} <span className="text-xs font-normal text-emerald-300">/kg</span></p>
                          <p className="text-[10px] text-emerald-300/80 mt-0.5">Fuel, driver & handling ({distanceKm} km)</p>
                        </div>

                        <div className="bg-amber-400/20 rounded-xl p-3 border border-amber-400/40">
                          <span className="text-[10px] text-mustard-300 uppercase font-bold block">3. = Landed Delivered Price</span>
                          <p className="text-lg font-extrabold text-white mt-1">₹{analysis.landedOptimalPrice || (Math.round(((analysis.aiOptimalPrice || 0) + (distanceKm * 0.035 + 0.30)) * 100) / 100)} <span className="text-xs font-normal text-gray-300">/kg</span></p>
                          <p className="text-[10px] text-mustard-300 mt-0.5">Recommended delivered price</p>
                        </div>
                      </div>

                      {/* Guidance note */}
                      <p className="text-[11px] text-gray-300 bg-white/5 p-2.5 rounded-xl border border-white/10 leading-relaxed">
                        💡 <strong>Why does logistics increase the price?</strong> Transporting produce involves fuel, vehicle wear, driver wages, and loading fees. When negotiating with distant buyers or offering doorstep delivery, quote the <strong>Landed Delivered Price (₹{analysis.landedOptimalPrice || (Math.round(((analysis.aiOptimalPrice || 0) + (distanceKm * 0.035 + 0.30)) * 100) / 100)}/kg)</strong> so transportation expenses do not reduce your farm profits.
                      </p>
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
