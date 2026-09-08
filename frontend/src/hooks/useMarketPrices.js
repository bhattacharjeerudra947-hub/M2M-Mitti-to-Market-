import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../api';

/**
 * Real market data hook — replaces hardcoded mock prices.
 *
 * Source: /api/price-advisor/all (backend MarketDataService) which returns per crop:
 *   name, category, marketAvgPrice, marketMinPrice, marketMaxPrice,
 *   demandLevel, supplyLevel, trend ("Increasing" | "Decreasing" | "Stable"),
 *   aiSuggestedMinPrice, aiSuggestedMaxPrice, aiOptimalPrice
 *
 * Never fabricates numbers: if the backend is unreachable, crops is null and the
 * UI must show an explicit "unavailable" state instead of fake prices.
 */
export function useMarketPrices() {
  const [crops, setCrops] = useState(null);      // null = unavailable / not loaded yet
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const json = await apiGet('/api/price-advisor/all');
      const list = Array.isArray(json) ? json : (json?.data || []);
      if (!Array.isArray(list) || list.length === 0) throw new Error('No market data returned');

      const mapped = list
        .map((c) => {
          const price = Number(c.marketAvgPrice ?? c.aiOptimalPrice ?? NaN);
          const trend = String(c.trend || 'Stable').toLowerCase();
          return {
            name: c.name || c.cropName,
            category: c.category || '',
            price: Number.isFinite(price) ? Math.round(price * 10) / 10 : null,
            min: c.marketMinPrice ?? null,
            max: c.marketMaxPrice ?? null,
            demandLevel: c.demandLevel || null,
            supplyLevel: c.supplyLevel || null,
            // direction derived from the backend's trend word — no invented percentages
            direction: trend.includes('increas') || trend.includes('up') ? 'up'
              : trend.includes('decreas') || trend.includes('down') ? 'down' : 'stable',
            trendLabel: String(c.trend || 'Stable'),
          };
        })
        .filter((c) => c.name && c.price !== null);

      if (mapped.length === 0) throw new Error('No usable market data');
      setCrops(mapped);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e?.message || 'Market data unavailable');
      setCrops(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { crops, error, lastUpdated, reload: load };
}
