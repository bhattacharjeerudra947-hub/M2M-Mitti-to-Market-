import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, Trophy, MapPin, Wallet, AlertTriangle, ChevronRight, Package, Loader2 } from 'lucide-react';
import { apiGet } from '../api';

export default function DealAdvisorSummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [produce, setProduce] = useState([]);
  const [bestDeals, setBestDeals] = useState([]);
  const [demand, setDemand] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [produceData, dealsData, demandData] = await Promise.all([
          apiGet(`/api/produce/farmer/${user.id}`),
          apiGet(`/api/deal-intelligence/farmer/${user.id}`),
          apiGet('/api/requirements/open'),
        ]);
        setProduce((produceData || []).filter(p => p.status === 'AVAILABLE' || p.status === 'LOW_STOCK'));
        setBestDeals(dealsData || []);
        setDemand(demandData || []);
      } catch {
        // Backend unavailable or not authenticated — show nothing
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Match open demand to farmer's crops
  const cropNames = produce.map(p => p.name.toLowerCase());
  const relevantDemand = demand.filter(d => cropNames.some(c => d.crop.toLowerCase().includes(c) || c.includes(d.crop.toLowerCase())));

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-navy-100 p-6 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your best deals...
        </div>
      </div>
    );
  }

  if (produce.length === 0 && relevantDemand.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wide flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5" /> AI Deal Advisor
        </h3>
        {produce.length > 0 && (
          <button onClick={() => navigate('/farmer/deal-advisor')}
            className="flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-navy-900">
            Compare all deals <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Best deal per produce */}
        {bestDeals.length > 0 && (
          <div className="lg:col-span-2 space-y-3">
            {bestDeals.slice(0, 3).map(deal => (
              <button key={deal.interestId} onClick={() => navigate('/farmer/deal-advisor')}
                className="w-full bg-white rounded-2xl border border-emerald-200 p-4 text-left hover:shadow-md transition group">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm font-bold text-navy-900">
                    <Package className="w-4 h-4 text-navy-400" /> {deal.cropName || 'Produce'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                    ⭐ BEST DEAL
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Buyer</p>
                    <p className="text-sm font-semibold text-navy-900">{deal.buyerName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Quoted</p>
                    <p className="text-sm font-semibold">₹{deal.quotedPrice}/{deal.unit}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> Distance</p>
                    <p className="text-sm font-semibold">~{deal.distanceKm} km</p>
                  </div>
                  <div className="ml-auto">
                    <p className="text-[10px] text-emerald-600 font-semibold uppercase flex items-center gap-0.5"><Wallet className="w-2.5 h-2.5" /> Est. Net</p>
                    <p className="text-lg font-bold text-emerald-700">₹{deal.netPerUnit}<span className="text-xs font-normal text-gray-400">/{deal.unit}</span></p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-gray-500 group-hover:text-navy-700 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-mustard-500" /> Best estimated net realization — click to compare all offers
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Open buyer demand */}
        {relevantDemand.length > 0 && (
          <div className="bg-gradient-to-br from-navy-900 to-navy-800 rounded-2xl p-4 text-white">
            <p className="text-xs font-bold text-mustard-300 mb-3 flex items-center gap-1.5">
              📢 Buyers looking for your crops
            </p>
            <div className="space-y-2.5">
              {relevantDemand.slice(0, 4).map(d => (
                <div key={d.id} className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{d.crop}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 rounded-full uppercase">{d.status}</span>
                  </div>
                  <p className="text-xs text-white/80 mt-0.5">{d.quantity} {d.unit} {d.maxPrice ? `· up to ₹${d.maxPrice}/${d.unit}` : ''}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">
                    {d.buyerName}{d.deliveryLocation ? ` · ${d.deliveryLocation}` : ''}{d.requiredBy ? ` · by ${d.requiredBy}` : ''}
                  </p>
                </div>
              ))}
            </div>
            {relevantDemand.some(d => d.maxPrice) && (
              <p className="mt-3 text-[10px] text-white/50 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Prices are buyer targets — verify before committing.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}