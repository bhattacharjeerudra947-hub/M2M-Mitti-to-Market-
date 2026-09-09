/**
 * Low Data Mode — REMOVED.
 * These exports are kept as stubs so existing imports don't break.
 */

export function isLowDataMode() { return false; }
export function setLowDataMode() {}
export function toggleLowDataMode() { return false; }
export function onLowDataModeChange() { return () => {}; }
export function pollInterval(normalMs) { return normalMs; }
export function optimizeImage(url) { return url; }
export function shouldDeferHeavyFeature() { return false; }
