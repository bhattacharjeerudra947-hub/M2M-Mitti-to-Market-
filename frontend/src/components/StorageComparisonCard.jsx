import { useState, useEffect } from 'react';
import { Warehouse, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight, Info, Loader2 } from 'lucide-react';
import { apiPost } from '../api';

const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function StorageComparisonCard({ cropName = 'Tomato', defaultPrice = 28 }) {
  const [quantityKg, setQuantityKg] = useState(1000);
  const [storageDays, setStorageDays] = useState(30);
  const [dailyRate, setDailyRate] = useState(0.50);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchComparison = async () => {
    setLoading(true);
    try {
      const res = await apiPost('/api/storage/compare', {
        cropName,
        quantityKg,
        currentPricePerKg: defaultPrice,
        storageDays,
        dailyStorageRate: dailyRate,
        billingModel: 'PER_KG_PER_DAY',
        qualityLossPct: 2.0,
      });
      setComparison(res);
    } catch {
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [cropName, defaultPrice, storageDays, dailyRate, quantityKg]);

  if (!comparison && !loading) return null;

  const imm = comparison?.immediateScenario;
  const store = comparison?.storageScenario;
  const recCode = comparison?.recommendationCode;

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Warehouse className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-navy-900">
              Immediate Sale vs Cold Storage Profitability
            </h3>
          </div>
          <p className="text-xs text-navy-500 mt-0.5">
            Compare selling now against holding in cold storage with verified billing rules
          </p>
        </div>

        {comparison?.recommendationCode && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 self-start sm:self-auto ${
            recCode === 'STORAGE_RECOMMENDED'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : recCode === 'IMMEDIATE_SALE_RECOMMENDED'
              ? 'bg-rose-100 text-rose-800 border border-rose-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            {recCode === 'STORAGE_RECOMMENDED' ? '⭐ Storage Recommended' : recCode === 'IMMEDIATE_SALE_RECOMMENDED' ? '⚡ Sell Immediately' : '⚖️ Marginal Difference'}
          </span>
        )}
      </div>

      {/* Interactive Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
        <div>
          <label className="text-gray-500 block mb-1">Batch Weight (kg)</label>
          <input
            type="number"
            value={quantityKg}
            onChange={(e) => setQuantityKg(Math.max(10, Number(e.target.value)))}
            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-semibold text-navy-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="text-gray-500 block mb-1">Storage Duration</label>
          <select
            value={storageDays}
            onChange={(e) => setStorageDays(Number(e.target.value))}
            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-semibold text-navy-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value={15}>15 Days (~2 weeks)</option>
            <option value={30}>30 Days (1 Month)</option>
            <option value={45}>45 Days (1.5 Months)</option>
            <option value={60}>60 Days (2 Months)</option>
            <option value={90}>90 Days (3 Months)</option>
          </select>
        </div>

        <div>
          <label className="text-gray-500 block mb-1">Storage Rate (₹/kg/day)</label>
          <input
            type="number"
            step="0.05"
            value={dailyRate}
            onChange={(e) => setDailyRate(Math.max(0.01, Number(e.target.value)))}
            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-semibold text-navy-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Computing scenario net realization...
        </div>
      ) : comparison && imm && store ? (
        <div className="space-y-4">
          {/* Side by side cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Scenario A: Sell Immediately */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-900 uppercase tracking-wide">Option A: Sell Immediately</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 font-semibold text-gray-700">2-Day Window</span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Gross Selling Price:</span>
                  <span className="font-semibold text-navy-900">₹{imm.pricePerKg} / kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Gross Revenue:</span>
                  <span className="font-semibold text-navy-900">{fmtINR(imm.grossRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Logistics & Handling Costs:</span>
                  <span className="text-rose-600">- {fmtINR(imm.totalCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage Expenses:</span>
                  <span className="text-gray-400">₹0 (Direct)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Net Realization</span>
                  <span className="text-base font-extrabold text-navy-900">₹{imm.netRealizationPerKg} / kg</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Expected Lot Margin</span>
                  <span className="text-sm font-bold text-navy-900">{fmtINR(imm.netProfit)}</span>
                </div>
              </div>
            </div>

            {/* Scenario B: Store and Sell Later */}
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Option B: Cold Storage ({storageDays} Days)</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 font-semibold text-emerald-800">Off-Season Sale</span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Projected Selling Price:</span>
                  <span className="font-semibold text-emerald-900">₹{store.pricePerKg} / kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Saleable Weight (2% loss):</span>
                  <span className="font-semibold text-emerald-900">{store.saleableQuantityKg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage Fee ({storageDays}d @ ₹{dailyRate}):</span>
                  <span className="text-rose-600">- {fmtINR(store.storageCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Freight & Handling:</span>
                  <span className="text-rose-600">- {fmtINR(store.transportationCost + store.handlingPackagingCost)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Net Realization</span>
                  <span className="text-base font-extrabold text-emerald-800">₹{store.netRealizationPerKg} / kg</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Expected Lot Margin</span>
                  <span className="text-sm font-bold text-emerald-900">{fmtINR(store.netProfit)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation & Transparent Explanation */}
          <div className="p-4 rounded-xl bg-navy-900 text-white space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-mustard-300">
              <Info className="w-4 h-4" /> {comparison.recommendationHeadline}
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {comparison.recommendationExplanation}
            </p>
            <div className="pt-2 border-t border-navy-800 text-[11px] text-gray-400">
              <strong>Assumptions:</strong> {comparison.assumptions?.join(' • ')}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
