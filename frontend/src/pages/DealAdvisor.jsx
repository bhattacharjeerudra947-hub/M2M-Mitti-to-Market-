import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Brain, MapPin, Truck, Package, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp, Trophy, TrendingUp, Wallet, Info } from 'lucide-react';
import { apiGet } from '../api';
import { useNavigate } from 'react-router-dom';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function DealAdvisor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [produce, setProduce] = useState([]);
  const [selectedProduce, setSelectedProduce] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [error, setError] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [sortBy, setSortBy] = useState('net');

  const role = 'farmer';
  const sidebarRole = 'farmer';

  // Load farmer's produce listings
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiGet(`/api/produce/farmer/${user.id}`);
        const available = (data || []).filter(p => p.status === 'AVAILABLE' || p.status === 'LOW_STOCK');
        setProduce(available);
        if (available.length > 0) {
          setSelectedProduce(available[0]);
        }
      } catch (err) {
        if (err.message?.includes('Session expired')) {
          navigate('/login');
        } else {
          setError(err.message || 'Failed to load produce');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Load deal analysis when produce selected
  useEffect(() => {
    if (!selectedProduce) { setDeals([]); return; }
    const load = async () => {
      setLoadingDeals(true);
      setError('');
      try {
        const data = await apiGet(`/api/deal-intelligence/produce/${selectedProduce.id}`);
        setDeals(data || []);
      } catch (err) {
        if (err.message?.includes('Session expired')) {
          navigate('/login');
        } else {
          setError(err.message || 'Failed to analyze deals');
        }
      } finally {
        setLoadingDeals(false);
      }
    };
    load();
  }, [selectedProduce]);

  const sortedDeals = [...deals].sort((a, b) => {
    switch (sortBy) {
      case 'price': return b.quotedPrice - a.quotedPrice;
      case 'distance': return a.distanceKm - b.distanceKm;
      case 'rating': return (b.buyerRating || 0) - (a.buyerRating || 0);
      case 'net':
      default: return b.netPerUnit - a.netPerUnit;
    }
  });

  const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role={sidebarRole} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy-900 mb-1 flex items-center gap-2">
              <Brain className="w-6 h-6 text-mustard-500" /> AI Deal Advisor
            </h1>
            <p className="text-sm text-navy-500">
              Compare buyer offers by <span className="font-semibold text-navy-700">estimated net realization</span> — not just quoted price.
            </p>
          </div>

          {/* Core principle banner */}
          <div className="bg-navy-900 rounded-2xl p-4 mb-6 text-white">
            <p className="text-sm font-bold mb-1">💡 Highest offer ≠ Highest earning</p>
            <p className="text-xs text-navy-200">
              A buyer offering more per kg may be farther away — after estimated logistics costs, a closer buyer can earn you more.
            </p>
          </div>

          {/* Produce selector */}
          <div className="bg-white rounded-2xl border border-navy-100 p-4 mb-6">
            <label className="block text-xs font-semibold text-navy-700 mb-2">Select your produce listing</label>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-4 border-navy-900 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : produce.length === 0 ? (
              <p className="text-sm text-gray-500">No active produce listings. <button onClick={() => navigate('/farmer/add-produce')} className="text-navy-700 font-semibold underline">Add produce</button> first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {produce.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduce(p)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                      selectedProduce?.id === p.id
                        ? 'bg-mustard-50 border-mustard-400 text-navy-900 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-mustard-300'
                    }`}
                  >
                    {p.name} · {p.quantity} {p.unit} · {formatINR(p.pricePerUnit)}/{p.unit}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* Sort controls */}
          {deals.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs font-semibold text-navy-700">Sort by:</span>
              {[
                { key: 'net', label: 'Best Net Realization' },
                { key: 'price', label: 'Highest Price' },
                { key: 'distance', label: 'Nearest' },
                { key: 'rating', label: 'Buyer Rating' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    sortBy === opt.key
                      ? 'bg-navy-900 text-white border-navy-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Deal cards */}
          {loadingDeals ? (
            <div className="text-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm text-gray-500">Analyzing buyer offers...</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-navy-100">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">No buyer offers yet</p>
              <p className="text-sm text-gray-500">When buyers express interest in this produce, their offers will be ranked here by estimated net realization.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDeals.map((deal, idx) => (
                <div
                  key={deal.interestId}
                  className={`bg-white rounded-2xl border p-5 transition ${
                    deal.recommendationRank === 1
                      ? 'border-emerald-300 ring-2 ring-emerald-100 shadow-md'
                      : 'border-navy-100'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                        deal.recommendationRank === 1 ? 'bg-emerald-50' : 'bg-gray-50'
                      }`}>
                        {MEDALS[idx] || '🏅'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-navy-900">{deal.buyerName}</p>
                          {deal.buyerVerified && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> VERIFIED
                            </span>
                          )}
                          {!deal.buyerVerified && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">
                              <XCircle className="w-3 h-3" /> UNVERIFIED
                            </span>
                          )}
                        </div>
                        {deal.buyerOrganization && <p className="text-xs text-gray-500">{deal.buyerOrganization}</p>}
                        {deal.buyerRating > 0 && <p className="text-xs text-amber-600">★ {deal.buyerRating.toFixed(1)} / 5</p>}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      deal.recommendationRank === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-600'
                    }`}>
                      {deal.recommendationRank === 1 ? '⭐ RECOMMENDED' : `Rank #${deal.recommendationRank}`}
                    </span>
                  </div>

                  {/* Key numbers */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase">Quoted Price</p>
                      <p className="text-lg font-bold text-navy-900">{formatINR(deal.quotedPrice)}<span className="text-xs font-normal text-gray-500">/{deal.unit}</span></p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Distance</p>
                      <p className="text-lg font-bold text-navy-900">~{deal.distanceKm}<span className="text-xs font-normal text-gray-500"> km</span></p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase flex items-center gap-1"><Truck className="w-3 h-3" /> Est. Logistics</p>
                      <p className="text-lg font-bold text-navy-900">{formatINR(deal.logisticsCostPerUnit)}<span className="text-xs font-normal text-gray-500">/{deal.unit}</span></p>
                    </div>
                    <div className={`rounded-xl p-3 ${deal.recommendationRank === 1 ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-navy-50'}`}>
                      <p className="text-[10px] font-semibold uppercase flex items-center gap-1 text-gray-500"><Wallet className="w-3 h-3" /> Est. Net / {deal.unit}</p>
                      <p className={`text-lg font-bold ${deal.recommendationRank === 1 ? 'text-emerald-700' : 'text-navy-900'}`}>{formatINR(deal.netPerUnit)}</p>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-gray-600">
                    <span>Gross value: <b>{formatINR(deal.grossValue)}</b></span>
                    <span>Logistics: <b>{formatINR(deal.logisticsCost)}</b></span>
                    <span>Other costs: <b>{formatINR(deal.otherCosts)}</b></span>
                    <span>Est. net: <b className="text-emerald-700">{formatINR(deal.netValue)}</b></span>
                  </div>

                  {/* Score + expand */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${deal.dealScore >= 80 ? 'bg-emerald-500' : deal.dealScore >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
                          style={{ width: `${deal.dealScore}%` }} />
                      </div>
                      <span className="text-xs font-bold text-navy-900">{deal.dealScore}/100</span>
                      <span className="text-[10px] text-gray-400">confidence {deal.confidence}%</span>
                    </div>
                    <button onClick={() => setExpandedCard(expandedCard === deal.interestId ? null : deal.interestId)}
                      className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-900 font-semibold">
                      {expandedCard === deal.interestId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {expandedCard === deal.interestId ? 'Hide analysis' : 'Why this ranking?'}
                    </button>
                  </div>

                  {/* Expanded explanation */}
                  {expandedCard === deal.interestId && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-navy-900 mb-2 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Why ranked #{deal.recommendationRank}</p>
                        <ul className="space-y-1.5">
                          {deal.reasons?.map((r, i) => (
                            <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                              <span className="text-emerald-500 mt-0.5">✓</span>{r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-navy-900 mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Warnings</p>
                        {deal.warnings?.length > 0 ? (
                          <ul className="space-y-1.5">
                            {deal.warnings.map((w, i) => (
                              <li key={i} className="text-xs text-amber-700 flex gap-1.5">
                                <span className="mt-0.5">⚠️</span>{w}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-400">No warnings — this offer looks reliable.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Why #1 beats higher price */}
                  {deal.recommendationRank === 1 && deals.length > 1 && (
                    <div className="mt-4 bg-emerald-50 rounded-xl p-3 border border-emerald-200 flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-800">
                        <b>Why recommended:</b> Although another buyer may quote a higher price, this offer gives the best <b>estimated net realization</b> after logistics and other costs.
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Disclaimer */}
              <div className="text-[10px] text-gray-400 text-center py-2">
                All figures are <b>estimates</b> based on distance and typical costs. Verify logistics costs before committing. AI recommends — you decide.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}