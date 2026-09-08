import { useMarketPrices } from '../hooks/useMarketPrices';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

/**
 * Live market price grid — powered by /api/price-advisor/all (real backend data).
 * Shows min–max range and demand level instead of invented trend percentages.
 * Explicit "unavailable" state instead of fake numbers when the API fails.
 */
export default function MarketPricesLive({ limit = 8, dark = false }) {
  const { crops, error, lastUpdated, reload } = useMarketPrices();

  if (error && !crops) {
    return (
      <div className={`rounded-xl p-4 text-center ${dark ? 'bg-white/10' : 'bg-navy-50'}`}>
        <p className={`text-xs font-medium ${dark ? 'text-white/70' : 'text-navy-500'}`}>
          📡 Market prices unavailable right now.
        </p>
        <button
          onClick={reload}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-mustard-600 hover:text-mustard-700"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  if (!crops) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
          <div key={i} className={`rounded-xl p-4 animate-pulse ${dark ? 'bg-white/10' : 'bg-mustard-50'}`} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {crops.slice(0, limit).map((item) => {
          const up = item.direction === 'up';
          const down = item.direction === 'down';
          return (
            <div
              key={item.name}
              className={`p-4 rounded-xl border transition ${
                dark ? 'bg-white/10 border-white/10 hover:bg-white/15' : 'bg-mustard-50 hover:bg-mustard-100 border-mustard-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-navy-800'}`}>{item.name}</span>
              </div>
              <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-navy-900'}`}>
                ₹{item.price}<span className="text-xs font-normal opacity-60">/kg</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {up && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />}
                {down && <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />}
                <span className={`text-xs font-semibold ${up ? 'text-emerald-600' : down ? 'text-rose-600' : dark ? 'text-white/60' : 'text-navy-500'}`}>
                  {item.trendLabel}
                </span>
                {item.demandLevel && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    item.demandLevel === 'HIGH' ? 'bg-emerald-100 text-emerald-700' :
                    item.demandLevel === 'LOW' ? 'bg-gray-100 text-gray-500' :
                    'bg-navy-100 text-navy-600'
                  }`}>
                    {item.demandLevel} demand
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {lastUpdated && (
        <p className={`mt-2 text-[10px] ${dark ? 'text-white/40' : 'text-gray-400'}`}>
          Market data · updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}
