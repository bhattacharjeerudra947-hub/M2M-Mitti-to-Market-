import { useEffect, useRef, useCallback } from 'react';

/**
 * useAutoSync
 * 
 * Automatically keeps open screens synchronized with the central database:
 * 1. Performs initial fetch on mount.
 * 2. Immediately refetches when the user switches to this tab or window regains focus.
 * 3. Periodically polls the server while the tab is active/visible.
 * 4. Pauses polling when the tab is hidden or in background to conserve bandwidth and CPU.
 * 5. Prevents overlapping requests if a network request takes longer than the interval.
 *
 * @param {Function} fetchFn Callback to fetch latest data (receives { isBackground: boolean })
 * @param {Object} options
 * @param {number} [options.intervalMs=10000] Polling interval in milliseconds
 * @param {boolean} [options.enabled=true] Set to false if user is logged out or tab is inactive
 * @param {boolean} [options.syncOnFocus=true] Whether to trigger a refresh on window focus
 */
export function useAutoSync(fetchFn, { intervalMs = 10000, enabled = true, syncOnFocus = true } = {}) {
  const isFetchingRef = useRef(false);
  const timerRef = useRef(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const triggerFetch = useCallback(async (isBackground = false) => {
    if (!enabled || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      await fetchFnRef.current({ isBackground });
    } catch {
      // Handled inside fetchFn
    } finally {
      isFetchingRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch on mount
    triggerFetch(false);

    // Periodic polling when document is visible
    timerRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        triggerFetch(true);
      }
    }, intervalMs);

    // Focus & visibility change handler
    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && syncOnFocus) {
        triggerFetch(true);
      }
    };

    if (syncOnFocus && typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleFocus);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleFocus);
      }
    };
  }, [enabled, intervalMs, syncOnFocus, triggerFetch]);

  return { refresh: () => triggerFetch(false) };
}

export default useAutoSync;
