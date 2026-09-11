import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../api';

/**
 * Live platform statistics shown on public landing pages
 * (Landing.jsx, AboutUs.jsx). Values are fetched from GET /api/stats,
 * which counts real rows in MySQL at request time — never hardcoded.
 *
 * Returns:
 *   stats:  { farmers, buyers, produceSoldValue, totalDeals } | null
 *   loading, error
 *   refresh()
 */
export function useSiteStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
    apiGet('/api/stats')
      .then((data) => setStats(data || null))
      .catch((err) => setError(err.message || 'Could not load stats'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, error, refresh };
}

/**
 * Animated counter hook that smoothly counts up to target value.
 */
export function useCountUp(target, duration = 1000) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const end = Number(target) || 0;
    if (end === 0) {
      setCurrent(0);
      return;
    }
    let startTimestamp = null;
    let frameId;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrent(Math.round(ease * end));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return current;
}

/**
 * Compact a number for display using Indian abbreviations.
 *   6        → "6"
 *   12875    → "12.9K"
 *   2400000  → "24L"
 *   15000000 → "1.5Cr"
 */
function trimOne(x) {
  return (Math.round(x * 10) / 10).toString();
}

export function formatCompact(value) {
  const v = Number(value) || 0;
  if (v >= 1e7) return `${trimOne(v / 1e7)}Cr`;
  if (v >= 1e5) return `${trimOne(v / 1e5)}L`;
  if (v >= 1e3) return `${trimOne(v / 1e3)}K`;
  return String(Math.round(v));
}
